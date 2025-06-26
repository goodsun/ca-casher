import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface CaCasherStackProps extends cdk.StackProps {
  environment: string;
}

export class CaCasherStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CaCasherStackProps) {
    super(scope, id, props);
    
    const environment = props.environment;

    // DynamoDB table for caching
    const cacheTable = new dynamodb.Table(this, 'CaCasherCacheTable', {
      tableName: process.env.TABLE_NAME || 'ca-casher-cache',
      partitionKey: {
        name: 'cacheKey',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expireAt',
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY // For development
    });

    // Lambda function for API
    const apiLambda = new lambda.Function(this, 'CaCasherApiFunction', {
      functionName: `ca-casher-api-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64, // Graviton2 for cost savings
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('lambda'),
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: cacheTable.tableName,
        CONTRACT_ADDRESSES: process.env.CONTRACT_ADDRESSES || '',
        CHAIN_ID: process.env.CHAIN_ID || '1',
        RPC_ENDPOINT: process.env.RPC_ENDPOINT || '',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
        NODE_OPTIONS: '--enable-source-maps'
      },
      // reservedConcurrentExecutions: 20 // Cost control - removed due to account limits
    });

    // Grant DynamoDB permissions to Lambda
    cacheTable.grantReadWriteData(apiLambda);

    // API Gateway
    const api = new apigateway.RestApi(this, 'CaCasherApi', {
      restApiName: `ca-casher-api-${environment}`,
      description: 'Smart Contract Cache API',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 20,
        throttlingRateLimit: 10,
        metricsEnabled: true
      },
      defaultCorsPreflightOptions: {
        allowOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'X-Api-Key']
      }
    });

    // Conditional API authentication based on environment variable
    const requireApiKey = process.env.REQUIRE_API_KEY === 'true';
    
    let apiKey: apigateway.ApiKey | undefined;
    let usagePlan: apigateway.UsagePlan | undefined;
    
    if (requireApiKey) {
      // API Key for authentication
      apiKey = new apigateway.ApiKey(this, 'CaCasherApiKey', {
        apiKeyName: `ca-casher-${environment}-key`,
        description: 'Default API key for CA Casher'
      });

      // Usage Plan
      usagePlan = new apigateway.UsagePlan(this, 'CaCasherUsagePlan', {
        name: `ca-casher-usage-plan-${environment}`,
        throttle: {
          rateLimit: 10,
          burstLimit: 20
        },
        quota: {
          limit: 1000000,
          period: apigateway.Period.MONTH
        }
      });

      usagePlan.addApiStage({
        stage: api.deploymentStage
      });

      usagePlan.addApiKey(apiKey);
    }

    // Lambda integration
    const integration = new apigateway.LambdaIntegration(apiLambda);

    // API routes
    const contractResource = api.root.addResource('contract');
    const addressResource = contractResource.addResource('{address}');
    const functionResource = addressResource.addResource('{function}');

    // Add methods with conditional API key requirement
    functionResource.addMethod('GET', integration, {
      apiKeyRequired: requireApiKey
    });
    functionResource.addMethod('POST', integration, {
      apiKeyRequired: requireApiKey
    });

    // Lambda function for event monitoring
    const eventMonitorLambda = new lambda.Function(this, 'CaCasherEventMonitor', {
      functionName: `ca-casher-event-monitor-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'event-monitor.handler',
      code: lambda.Code.fromAsset('lambda'),
      memorySize: 256,
      timeout: cdk.Duration.minutes(5),
      environment: {
        TABLE_NAME: cacheTable.tableName,
        CONTRACT_ADDRESSES: process.env.CONTRACT_ADDRESSES || '',
        CHAIN_ID: process.env.CHAIN_ID || '1',
        RPC_ENDPOINT: process.env.RPC_ENDPOINT || '',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info'
      }
    });

    // Grant DynamoDB permissions to event monitor
    cacheTable.grantReadWriteData(eventMonitorLambda);

    // EventBridge rule for periodic monitoring (every 5 minutes)
    const eventRule = new events.Rule(this, 'CaCasherEventRule', {
      ruleName: `ca-casher-event-monitor-rule-${environment}`,
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    });

    eventRule.addTarget(new targets.LambdaFunction(eventMonitorLambda));

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL'
    });

    if (requireApiKey && apiKey) {
      new cdk.CfnOutput(this, 'ApiKeyId', {
        value: apiKey.keyId,
        description: 'API Key ID'
      });
    }

    new cdk.CfnOutput(this, 'TableName', {
      value: cacheTable.tableName,
      description: 'DynamoDB table name'
    });
  }
}