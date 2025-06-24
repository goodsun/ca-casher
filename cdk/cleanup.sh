#!/bin/bash

echo "Cleaning up CA Casher resources..."

# Destroy CDK stack
echo "Destroying CDK stack..."
cdk destroy --force

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