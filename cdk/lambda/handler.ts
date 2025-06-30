import serverlessExpress from '@codegenie/serverless-express';
import app from './app';

export const handler = serverlessExpress({ 
  app,
  stripBasePath: true,
  binaryMimeTypes: [
    'application/json',
    'application/octet-stream',
    'text/html',
    'text/plain'
  ]
});