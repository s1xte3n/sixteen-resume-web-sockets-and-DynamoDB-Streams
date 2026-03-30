#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Minimal stack to prove synth works.
 * Replace with your real stack imports once synth is green.
 */
class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }
}

const app = new cdk.App();

// Ensure at least one stack is synthesized
new InfraStack(app, "InfraStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Helpful signal when running `npx ts-node bin/app.ts`
console.log("CDK app loaded: InfraStack defined");
