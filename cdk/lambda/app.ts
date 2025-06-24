import express from 'express';
import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { getCache, setCache } from './dynamodb';
import { callContractFunction } from './ethereum';
import { CACHE_TTL, CacheItem } from './types';
import { logger } from './logger';

const app = express();
app.use(express.json());

const CHAIN_ID = process.env.CHAIN_ID || '1';
const CONTRACT_ADDRESSES = (process.env.CONTRACT_ADDRESSES || '').split(',').map(addr => addr.trim().toLowerCase());

// Middleware to validate contract address
const validateContract = (req: Request, res: Response, next: Function) => {
  const { address } = req.params;
  
  if (!address || !ethers.isAddress(address)) {
    res.status(400).json({ error: 'Invalid contract address' });
    return;
  }

  const normalizedAddress = address.toLowerCase();
  
  if (CONTRACT_ADDRESSES.length > 0 && !CONTRACT_ADDRESSES.includes(normalizedAddress)) {
    res.status(403).json({ error: 'Contract not whitelisted' });
    return;
  }

  req.params.address = normalizedAddress;
  next();
};

// Parse function parameters from query string
const parseParams = (functionName: string, query: any): any[] => {
  switch (functionName) {
    case 'tokenURI':
    case 'ownerOf':
      return query.tokenId ? [query.tokenId] : [];
    case 'balanceOf':
      return query.address ? [query.address] : [];
    default:
      return [];
  }
};

// Generate cache key
const getCacheKey = (address: string, functionName: string, params: any[]): string => {
  const paramStr = params.length > 0 ? `:${params.join(':')}` : '';
  return `${CHAIN_ID}:${address}:${functionName}${paramStr}`;
};

// Main handler
app.get('/contract/:address/:function', validateContract, async (req: Request, res: Response) => {
  const { address, function: functionName } = req.params;
  
  if (!CACHE_TTL[functionName]) {
    return res.status(400).json({ error: 'Unsupported function' });
  }

  const params = parseParams(functionName, req.query);
  const cacheKey = getCacheKey(address, functionName, params);

  try {
    // Check cache
    const cached = await getCache(cacheKey);
    if (cached) {
      logger.info('Cache hit', { cacheKey });
      return res.json({
        result: cached.value,
        cached: true,
        cachedAt: new Date(cached.createdAt).toISOString()
      });
    }

    // Call contract
    logger.info('Cache miss, calling contract', { address, functionName, params });
    const result = await callContractFunction(address, functionName, params);

    // Store in cache
    const ttl = CACHE_TTL[functionName];
    const now = Date.now();
    const cacheItem: CacheItem = {
      cacheKey,
      value: result,
      expireAt: Math.floor(now / 1000) + ttl,
      createdAt: now,
      contractAddress: address,
      functionName,
      parameters: params.length > 0 ? params.join(',') : undefined
    };

    await setCache(cacheItem);

    return res.json({
      result,
      cached: false
    });

  } catch (error) {
    logger.error('Error processing request', { error, address, functionName });
    
    // Try to return stale cache on RPC error
    const staleCache = await getCache(cacheKey);
    if (staleCache) {
      logger.warn('Returning stale cache due to error', { cacheKey });
      return res.json({
        result: staleCache.value,
        cached: true,
        stale: true,
        cachedAt: new Date(staleCache.createdAt).toISOString(),
        error: 'RPC error, returning cached data'
      });
    }

    return res.status(500).json({ 
      error: 'Failed to fetch data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default app;