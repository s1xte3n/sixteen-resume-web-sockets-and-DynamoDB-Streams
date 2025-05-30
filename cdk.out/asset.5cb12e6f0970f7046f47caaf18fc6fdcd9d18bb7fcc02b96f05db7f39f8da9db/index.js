const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const VISITOR_TABLE = process.env.VISITOR_TABLE;

exports.handler = async (event) => {
  const { connectionId, eventType } = event.requestContext;

  if (eventType === 'CONNECT') {
    await ddb.put({
      TableName: CONNECTIONS_TABLE,
      Item: { connectionId }
    }).promise();

    await ddb.update({
      TableName: VISITOR_TABLE,
      Key: { id: 'count' },
      UpdateExpression: 'ADD #v :inc',
      ExpressionAttributeNames: { '#v': 'visits' },
      ExpressionAttributeValues: { ':inc': 1 }
    }).promise();

  } else if (eventType === 'DISCONNECT') {
    await ddb.delete({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }).promise();
  }

  return { statusCode: 200 };
};
