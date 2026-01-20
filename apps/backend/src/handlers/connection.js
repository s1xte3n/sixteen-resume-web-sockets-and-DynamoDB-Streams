const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, UpdateCommand } = require('aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const VISITORS_TABLE = process.env.VISITORS_TABLE;

/**
 * Handler for $connect and $disconnect routes
 */

exports.handler = async (event) => {
    const { connectionId, routeKey } = event.requestContext;

    console.log(`Route: ${routeKey}, ConnectionId: ${connectionId}`);

    try {
        if (routeKey === '$connect') {
            return await handleConnect(connectionId);
        } else if (routeKey === '$disconnect') {
            return await handleDisconnect(connectionId);
        }

        return { statusCode: 400, body: 'Unknown route' };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};

/**
 * Handle new WebSocket connection
 */
async function handleConnect(connectionId) {
    // 1. Store connection ID
    await dynamodb.send(new PutCommand({
        TableName: CONNECTIONS_TABLE,
        Item: {
            connectionId,
            timestamp: Date.now()
        }
    }));

    // 2. Increment visitor count
    await dynamodb.send(new UpdateCommand({
        TableName: VISITORS_TABLE,
        Key: { id: 'singleton' },
        UpdateExpression: 'ADD #count :increment',
        ExpressionAttributeNames: {
            '#count': 'count'
        },
        ExpressionAttributeValues: {
            ':increment': 1
        }
    }));

    console.log(`Connection ${connectionId} stored and visitor counter incremented`);

    return { statusCode: 200, body: 'Connected' };
}

/**
 * Handle WebSocket disconnection
 */
async function handleDisconnect(connectionId) {
    await dynamodb.send(new DeleteCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId }
    }));

    console.log(`Connection ${connectionId} removed`);

    return { statusCode: 200, body: 'Disconnected' };
}
