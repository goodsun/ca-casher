export interface CacheItem {
  cacheKey: string;
  value: any;
  expireAt: number;
  createdAt: number;
  contractAddress: string;
  functionName: string;
  parameters?: string;
}

export interface ContractFunction {
  name: string;
  ttlSeconds: number;
}

export const CACHE_TTL: Record<string, number> = {
  'name': 86400,        // 24 hours
  'symbol': 86400,      // 24 hours
  'tokenURI': 3600,     // 1 hour
  'owner': 300,         // 5 minutes
  'ownerOf': 300,       // 5 minutes
  'totalSupply': 300,   // 5 minutes
  'balanceOf': 60,      // 1 minute
  'getCreatorCount': 300, // 5 minutes
};

export const SUPPORTED_FUNCTIONS = Object.keys(CACHE_TTL);