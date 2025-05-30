const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const api = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_API_ENDPOINT.replace('wss://', '').replace('https://', '')
});

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== 'MODIFY') continue;

    const newCount = record.dynamodb.NewImage.visits.N;

    const connections = await ddb.scan({ TableName: CONNECTIONS_TABLE }).promise();

    const postCalls = connections.Items.map(async ({ connectionId }) => {
      try {
        await api.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({ count: newCount })
        }).promise();
      } catch (err) {
        if (err.statusCode === 410) {
          await ddb.delete({ TableName: CONNECTIONS_TABLE, Key: { connectionId } }).promise();
        }
      }
    });

    await Promise.all(postCalls);
  }

  return { statusCode: 200 };
};
