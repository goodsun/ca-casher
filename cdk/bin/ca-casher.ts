#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CaCasherStack } from '../lib/ca-casher-stack';

const app = new cdk.App();

// Get environment from context or environment variable
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'local';

// Environment-specific stack naming
const stackName = `CaCasherStack-${environment}`;

new CaCasherStack(app, stackName, {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
  },
  description: `Smart Contract View Function Cache Server Infrastructure (${environment})`,
  environment: environment
});