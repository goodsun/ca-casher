#!/bin/bash

# Check for environment argument
ENV=${1:-local}

echo "Cleaning up CA Casher resources for environment: $ENV"

# Load environment variables to get correct stack context
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

# Confirmation for production
if [ "$ENV" = "production" ]; then
    echo "⚠️  WARNING: You are about to delete PRODUCTION environment!"
    echo "This will destroy:"
    echo "  - DynamoDB table: $TABLE_NAME"
    echo "  - Lambda functions"
    echo "  - API Gateway"
    echo "  - All cached data"
    read -p "Are you sure? Type 'DELETE-PRODUCTION' to confirm: " confirmation
    if [ "$confirmation" != "DELETE-PRODUCTION" ]; then
        echo "Aborted."
        exit 1
    fi
fi

# Destroy CDK stack
echo "Destroying CDK stack for environment: $ENV"
cdk destroy --force --context environment=$ENV

# Clean local files
echo "Cleaning local build files..."
rm -rf cdk.out
rm -rf node_modules
rm -rf lambda/node_modules
rm -f lambda/*.js
rm -f lambda/*.js.map
rm -f lib/*.js
rm -f lib/*.d.ts
rm -f bin/*.js
rm -f bin/*.d.ts

echo "Cleanup complete!"