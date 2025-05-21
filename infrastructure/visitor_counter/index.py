import os
import boto3
from boto3.dynamodb.conditions import Key
import json

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def lambda_handler(event, context):
    try:
        response = table.update_item(
            Key={'id': 'visitor_count'},
            UpdateExpression='ADD visitor_count :incr',
            ExpressionAttributeValues={':incr': 1},
            ReturnValues='UPDATED_NEW'
        )
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'visitor_count': int(response['Attributes']['visitor_count'])})
        }

    except Exception as e:
        print("Error:", str(e))
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error'})
        }
