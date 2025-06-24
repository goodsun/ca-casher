import { ethers } from 'ethers';
import { logger } from './logger';
import { SUPPORTED_FUNCTIONS } from './types';

const RPC_ENDPOINT = process.env.RPC_ENDPOINT || '';
const RPC_TIMEOUT = parseInt(process.env.RPC_TIMEOUT || '5000');

// Common ERC721/ERC20 ABI fragments
const ABI_FRAGMENTS = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function owner() view returns (address)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
];

export async function callContractFunction(
  contractAddress: string,
  functionName: string,
  params: any[] = []
): Promise<any> {
  if (!SUPPORTED_FUNCTIONS.includes(functionName)) {
    throw new Error(`Unsupported function: ${functionName}`);
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINT);
    provider._getConnection().timeout = RPC_TIMEOUT;

    const contract = new ethers.Contract(contractAddress, ABI_FRAGMENTS, provider);

    logger.debug('Calling contract function', { contractAddress, functionName, params });

    const result = await contract[functionName](...params);
    
    // Convert BigInt to string for JSON serialization
    if (typeof result === 'bigint') {
      return result.toString();
    }
    
    return result;
  } catch (error) {
    logger.error('Error calling contract function', { 
      contractAddress, 
      functionName, 
      params,
      error: error instanceof Error ? error.message : error 
    });
    throw error;
  }
}

export async function getBlockNumber(): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINT);
    return await provider.getBlockNumber();
  } catch (error) {
    logger.error('Error getting block number', { error });
    throw error;
  }
}

export async function getContractEvents(
  contractAddress: string,
  eventNames: string[],
  fromBlock: number,
  toBlock: number
): Promise<ethers.Log[]> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINT);
    
    // Create event filters
    const filters = eventNames.map(eventName => ({
      address: contractAddress,
      topics: [ethers.id(eventName + '(address,address,uint256)')] // Adjust based on actual event signature
    }));

    const logs: ethers.Log[] = [];
    
    for (const filter of filters) {
      const eventLogs = await provider.getLogs({
        ...filter,
        fromBlock,
        toBlock
      });
      logs.push(...eventLogs);
    }

    return logs;
  } catch (error) {
    logger.error('Error getting contract events', { 
      contractAddress, 
      eventNames,
      fromBlock,
      toBlock,
      error 
    });
    throw error;
  }
}