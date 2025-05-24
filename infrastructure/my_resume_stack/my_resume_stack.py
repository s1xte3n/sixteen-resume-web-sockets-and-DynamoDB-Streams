from aws_cdk import (
    Stack,
    RemovalPolicy,
    aws_s3 as s3,
    aws_dynamodb as ddb,
    aws_s3_deployment as s3deploy,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    CfnOutput
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

        # 2. CloudFront Distribution
        distribution = cloudfront.Distribution(
            self, "ResumeDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(website_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            )
        )

        # 3. Deploy website contents to S3 and invalidate CloudFront cache
        s3deploy.BucketDeployment(self, "DeployWebsite",
            sources=[s3deploy.Source.asset("../frontend")],
            destination_bucket=website_bucket,
            distribution=distribution,
            distribution_paths=["/*"]
        )

        # 4. DynamoDB Table
        table = ddb.Table(self, "VisitorCount",
            partition_key={"name": "id", "type": ddb.AttributeType.STRING},
            removal_policy=RemovalPolicy.DESTROY
        )

        # 5. Lambda Function
        visitor_fn = _lambda.Function(self, "VisitorCounterFunction",
            runtime=_lambda.Runtime.PYTHON_3_10,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("visitorCount"),
            environment={"TABLE_NAME": table.table_name}
        )

        table.grant_read_write_data(visitor_fn)

        # 6. API Gateway
        apigw.LambdaRestApi(self, "VisitorApi",
            handler=visitor_fn
        )

        # 7. Output CloudFront URL
        CfnOutput(self, "CloudFrontURL", value=f"https://{distribution.domain_name}")
