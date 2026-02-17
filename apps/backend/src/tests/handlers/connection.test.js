const { handler } = require('../../handlers/connection');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');

const dynamoMock = mockClient(DynamoDBDocumentClient);

describe('Connection Handler', () => {
    beforeEach(() => {
        dynamoMock.reset();
        process.env.CONNECTIONS_TABLE = 'TestConnections';
        process.env.VISITORS_TABLE = 'TestVisitors';
    });

    test('$connect should store connection and increment count', async () => {
        dynamoMock.on(PutCommand).resolves({});
        dynamoMock.on(UpdateCommand).resolves({});

        const event = {
            requestContext: {
                connectionId: 'test123',
                routeKey: '$connect'
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(dynamoMock.calls()).toHaveLength(2);
    });

    test('$disconnect should remove connection', async () => {
        dynamoMock.on(DeleteCommand).resolves({});

        const event = {
            requestContext: {
                connectionId: 'test123',
                routeKey: '$disconnect'
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(dynamoMock.commandCalls(DeleteCommand)).toHaveLength(1);
    });
});
