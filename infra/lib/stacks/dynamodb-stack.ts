import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DynamoDBStack extends cdk.Stack {
    public readonly connectionsTable: dynamodb.Table;
    public readonly visitorsTable: dynamodb.Table;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Table 1: ConnectionIDs - store active Websocket connections
        this.connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
            partitionKey: { name : 'connectionId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand pricing
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev only
            pointInTimeRecovery: true,
            tableName: 'ConnectionIDs'
        });

        // Table 2: VisitorCount - stores visitor count with DynamoDB Streams
        this.visitorsTable = new dynamodb.Table(this, 'VisitorsTable', {
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // Enable streams
            pointInTimeRecovery: true,
            tableName: 'VisitorCount'
        });

        // Outputs
        new cdk.CfnOutput(this, 'ConnectionsTableName', {
            value: this.connectionsTable.tableName
        });

        new cdk.CfnOutput(this, 'VisitorsTableName', {
            value: this.visitorsTable.tableName
        });

        new cdk.CfnOutput(this, 'VisitorsTableStreamArn', {
            value: this.visitorsTable.tableStreamArn!
        });
    }
}
