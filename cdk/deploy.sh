#!/bin/bash

# Check for environment argument
ENV=${1:-local}

# Load environment variables
if [ -f .env.$ENV ]; then
    echo "Loading environment from .env.$ENV"
    export $(cat .env.$ENV | grep -v '^#' | xargs)
elif [ -f .env.local ]; then
    echo "Loading environment from .env.local (default)"
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "No environment file found!"
    exit 1
fi

# Build lambda
echo "Building Lambda functions..."
cd lambda
npm install
npm run build
cd ..

# Deploy CDK stack
echo "Deploying CDK stack for environment: $ENV"
echo "AWS Region: ${AWS_DEFAULT_REGION:-ap-northeast-1}"
echo "AWS Access Key: ${AWS_ACCESS_KEY_ID:0:10}***"
npm run build
cdk deploy --require-approval never --context environment=$ENV

echo "Deployment complete!"