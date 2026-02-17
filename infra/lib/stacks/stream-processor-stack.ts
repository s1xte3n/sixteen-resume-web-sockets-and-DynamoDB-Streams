import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Lambda } from 'aws-cdk-lib/aws-ses-actions';

interface StreamProcessorStackProps extends cdk.StackProps {
    connectionsTable: dynamodb.Table;
    visitorsTable: dynamodb.Table;
    webSocketApiId: string;
    webSocketStage: string;
}

export class StreamProcessorStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StreamProcessorStackProps) {
        super(scope, id, props);

        const { connectionsTable, visitorsTable, webSocketApiId, webSocketStage } = props;

        // Lambda: Stream Processor
        const streamProcessor = new lambda.Function(this, 'StreamProcessor', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'stream.handler',
            code: lambda.Code.fromAsset('../apps/backend/src/handlers'),
            environment: {
                CONNECTIONS_TABLE: connectionsTable.tableName,
                WEBSOCKET_ENDPOINT: `https://${webSocketApiId}.execute-api.${this.region}.amazon.com/${webSocketStage}`
            },
            timeout: cdk.Duration.seconds(30)
        });

        // Grant DynamoDB permissions
        connectionsTable.grantReadWriteData(streamProcessor);

        // Grant WebSocket management API permissions
        streamProcessor.addToRolePolicy(new iam.PolicyStatement({
            actions: ['execute-api:ManageConnections'],
            resources: [
                `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApiId}/${webSocketStage}/POST/@connections/*`
            ]
        }));

        // Add DynamoDB Stream as event source
        streamProcessor.addEventSource(new lambdaEventSources.DynamoEventSource(visitorsTable, {
            startingPosition: lambda.StartingPosition.TRIM_HORIZON,
            batchSize: 10,
            retryAttempts: 3
        }));
    }
}
