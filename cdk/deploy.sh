#!/bin/bash

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Build lambda
echo "Building Lambda functions..."
cd lambda
npm install
npm run build
cd ..

# Deploy CDK stack
echo "Deploying CDK stack..."
npm run build
cdk deploy --require-approval never

echo "Deployment complete!"