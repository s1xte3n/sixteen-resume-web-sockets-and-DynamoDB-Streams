const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT;

const apiGateway = new ApiGatewayManagementApiClient({
    endpoint: WEBSOCKET_ENDPOINT
});

/**
 * Handler for DynamoDB Stream events
 */
exports.handler = async (event) => {
    console.log('Stream event:', JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        // Only process MODIFY events (visitor count updates)
        if (record.eventName === 'MODIFY') {
            const newImage = record.dynamodb.NewImage;
            const vistorCount = newImage?.count?.N;

            if (visitorCount) {
                console.log(`Broadcasting new visitor count: ${visitorCount}`);
                await broadcastToAllConnections(parseInt(visitorCount));
            }
        }
    }

    return { statusCode: 200 };
};

/**
 * Broadcast message to all active WebSocket connections
 */
async function broadcastToAllConnections(count) {
    // 1. Get all connection IDs
    const { Items } = await dynamodb.send(new ScanCommand({
        TableName: CONNECTIONS_TABLE,
        ProjectExpression: 'connectionId'
    }));

    if (!Items || Items.length === 0) {
        console.log('No active connections');
        return;
    }

    console.log(`Broadcasting to ${Items.length} connections`);

    const message = JSON.stringify({
        action: 'updateCount',
        count: count,
        timestamp: Date.now()
    });

    // 2. Send message to each connection
    const sendPromise = Items.map(async (item) => {
        const { connectionId } = item;

        try {
            await apiGateway.send(new PostToConnectitonCommand({
                connectionId: connectionId,
                Data: ArrayBuffer.from(message)
            }));

            console.log(`Message sent to ${connectionId}:`, error.message);
        } catch (error) {
            console.error(`Failed to send to ${connectionId}:`, error.message);

            // If connection is stale (GoneException), remove it
            if (error.statusCode === 410 || error.name === 'GoneException') {
                console.log(`Removing stale connection: ${connectionId}`);
                await dynamodb.send(new DeleteCommand({
                    TableName: CONNECTIONS_TABLE,
                    Key: { connectionId }
                }));
            }
        }
    });

    await Promise.allSettled(sendPromise);
}
