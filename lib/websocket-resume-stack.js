const cdk = require('aws-cdk-lib');
const { Stack } = cdk;
const lambda = require('aws-cdk-lib/aws-lambda');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const apigatewayv2 = require('aws-cdk-lib/aws-apigatewayv2');
const integrations = require('aws-cdk-lib/aws-apigatewayv2-integrations');
const sources = require('aws-cdk-lib/aws-lambda-event-sources');

class WebsocketResumeStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // ConnectionIDs table
    const connectionsTable = new dynamodb.Table(this, 'ConnectionIDs', {
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    // VisitorCount table with stream enabled
    const visitorTable = new dynamodb.Table(this, 'VisitorCount', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });

    // DBUpdater Lambda
    const dbUpdater = new lambda.Function(this, 'DBUpdater', {
      runtime: lambda.Runtime.NODEJS_18_X,  // <-- fix here
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/dbUpdater'),
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
        VISITOR_TABLE: visitorTable.tableName
      }
    });    

    connectionsTable.grantReadWriteData(dbUpdater);
    visitorTable.grantReadWriteData(dbUpdater);

    // WebSocket API Gateway
    const webSocketApi = new apigatewayv2.CfnApi(this, 'WebSocketAPI', {
      name: 'VisitorCounterWS',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action'
    });

    const connectIntegration = new apigatewayv2.CfnIntegration(this, 'ConnectIntegration', {
      apiId: webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${dbUpdater.functionArn}/invocations`
    });

    const disconnectIntegration = new apigatewayv2.CfnIntegration(this, 'DisconnectIntegration', {
      apiId: webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${dbUpdater.functionArn}/invocations`
    });

    new apigatewayv2.CfnRoute(this, 'ConnectRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$connect',
      authorizationType: 'NONE',
      target: `integrations/${connectIntegration.ref}`
    });

    new apigatewayv2.CfnRoute(this, 'DisconnectRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$disconnect',
      authorizationType: 'NONE',
      target: `integrations/${disconnectIntegration.ref}`
    });

    const stage = new apigatewayv2.CfnStage(this, 'WebSocketStage', {
      apiId: webSocketApi.ref,
      autoDeploy: true,
      stageName: 'prod'
    });

    // Grant API Gateway permission to invoke Lambda
    dbUpdater.addPermission('InvokeByAPIGateway', {
      principal: new cdk.aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.ref}/*`
    });

    // DBStreamProcessor Lambda
    const dbStreamProcessor = new lambda.Function(this, 'DBStreamProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,  // <-- fix here
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/dbStreamProcessor'),
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
        WEBSOCKET_API_ENDPOINT: `https://${webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/prod`
      }
    });    

    connectionsTable.grantReadWriteData(dbStreamProcessor);

    dbStreamProcessor.addEventSource(new sources.DynamoEventSource(visitorTable, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 5,
      retryAttempts: 2
    }));
  }
}

module.exports = { WebsocketResumeStack };
