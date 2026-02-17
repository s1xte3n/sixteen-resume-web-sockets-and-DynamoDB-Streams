import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface WebSocketApiStackProps extends cdk.StackProps {
    connectionsTable: dynamodb.Table;
    visitorsTable: dynamodb.Table;
}

export class WebSocketApiStack extends cdk.Stack {
    public readonly webSocketApi: apigatewayv2.WebSocketApi;
    public readonly webSocketStage: apigatewayv2.WebSocketStage;

    constructor(scope: Construct, id: string, props: WebSocketApiStackProps) {
        super (scope, id, props);

        const { connectionsTable, visitorsTable } = props;

        // Lambda: Connection Handler
        const connectionHandler = new lambda.Function(this, 'ConnectionHandler', {
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'connection.handler',
            code: lambda.Code.fromAsset('../apps/backend/src/handlers'),
            environment: {
                CONNECTIONS_TABLE: connectionsTable.tableName,
                VISISTORS_TABLE: visitorsTable.tableName
            },
            timeout: cdk.Duration.seconds(10)
        });

        // Grant permissions
        connectionsTable.grantReadWriteData(connectionHandler);
        visitorsTable.grantReadWriteData(connectionHandler);

        // WebSocket API
        this.webSocketApi = new apigatewayv2.WebSocketApi(this, 'WebSocketApi', {
            apiName: 'VisitorCountWebSocket',
            description: 'WebSocket API for real-time visitor count',
            connectRouteOptions: {
                integration: new integrations.WebSocketLambdaIntegration('DisconnectIntegration', connectionHandler)
            }
        });

        // Deploy stage
        this.webSocketStage = new apigatewayv2.WebSocketStage(this, 'ProductionStage', {
            webSocketApi: this.webSocketApi,
            stageName: 'prod',
            autoDeploy: true
        });

        // Outputs
        new cdk.CfnOutput(this, 'WebSocketApiId', {
            value: this.webSocketApi.apiId
        });
    }
}
