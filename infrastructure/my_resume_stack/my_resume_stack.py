from aws_cdk import (
    Stack,
    RemovalPolicy,
    aws_s3 as s3,
    aws_dynamodb as ddb,
    aws_s3_deployment as s3deploy,
    aws_lambda as _lambda,  # ✅ Import AWS Lambda module
    aws_apigateway as apigw,  # ✅ Import API Gateway module
)
from constructs import Construct

import os

class ResumeStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # 1. S3 Bucket for website
        website_bucket = s3.Bucket(self, "ResumeWebsiteBucket",
            website_index_document="index.html",
            public_read_access=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ACLS
        )

        s3deploy.BucketDeployment(self, "DeployWebsite",
            sources=[s3deploy.Source.asset("../frontend")],
            destination_bucket=website_bucket
        )

        # 2. DynamoDB Table
        table = ddb.Table(self, "VisitorCountTable",
            partition_key={"name": "id", "type": ddb.AttributeType.STRING},
            removal_policy=RemovalPolicy.DESTROY  # ✅ Corrected RemovalPolicy usage
        )

        # 3. Lambda Function
        visitor_fn = _lambda.Function(self, "VisitorCounterFunction",
            runtime=_lambda.Runtime.PYTHON_3_10,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("visitor_counter"),
            environment={"TABLE_NAME": table.table_name}
        )

        table.grant_read_write_data(visitor_fn)

        # 4. API Gateway
        apigw.LambdaRestApi(self, "VisitorApi",
            handler=visitor_fn
        )
