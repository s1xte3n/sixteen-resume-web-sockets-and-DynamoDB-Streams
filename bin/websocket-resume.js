#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { WebsocketResumeStack } = require('../lib/websocket-resume-stack');

const app = new cdk.App();
new WebsocketResumeStack(app, 'WebsocketResumeStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
