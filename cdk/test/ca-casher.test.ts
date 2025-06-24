import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CaCasherStack } from '../lib/ca-casher-stack';

describe('CaCasherStack', () => {
  test('Stack creates DynamoDB table', () => {
    const app = new cdk.App();
    const stack = new CaCasherStack(app, 'TestStack', { environment: 'test' });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: {
        AttributeName: 'expireAt',
        Enabled: true
      }
    });
  });

  test('Stack creates API Gateway', () => {
    const app = new cdk.App();
    const stack = new CaCasherStack(app, 'TestStack', { environment: 'test' });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'ca-casher-api-test'
    });
  });

  test('Stack creates Lambda functions', () => {
    const app = new cdk.App();
    const stack = new CaCasherStack(app, 'TestStack', { environment: 'test' });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      MemorySize: 128
    });
  });
});