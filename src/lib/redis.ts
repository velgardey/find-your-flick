import { Redis } from '@upstash/redis';

// Check if required environment variables are present
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn(
    'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required for Redis caching.'
  );
}

// Create Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Default TTL values (in seconds)
export const CACHE_TTL = {
  TMDB: 60 * 60 * 24, // 24 hours for TMDB data
  FEED: 60 * 5, // 5 minutes for feed data
  PROFILE: 60 * 15, // 15 minutes for profile data
  RECOMMENDATIONS: 60 * 60 * 3, // 3 hours for recommendations
  WATCHLIST: 60 * 10, // 10 minutes for watchlist data
};

// Helper function to generate cache keys
export function generateCacheKey(prefix: string, params: Record<string, string | number | boolean | object>): string {
  const sortedParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  
  const paramsString = sortedParams
    .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join('&');
  
  return `${prefix}:${paramsString}`;
}

// Cache middleware for API routes
export async function withCache<T>(
  cacheKey: string,
  ttl: number,
  fetchData: () => Promise<T>
): Promise<T> {
  try {
    // Try to get data from cache
    const cachedData = await redis.get<T>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for key: ${cacheKey}`);
      return cachedData;
    }
    
    // If not in cache, fetch data
    console.log(`Cache miss for key: ${cacheKey}`);
    const data = await fetchData();
    
    // Store in cache
    await redis.set(cacheKey, data, { ex: ttl });
    
    return data;
  } catch (error) {
    console.error(`Cache error for key ${cacheKey}:`, error);
    // Fallback to fetching data directly
    return fetchData();
  }
}

// Function to invalidate cache by key pattern
export async function invalidateCache(keyPattern: string): Promise<void> {
  try {
    const keys = await redis.keys(keyPattern);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redis.del(key)));
      console.log(`Invalidated ${keys.length} cache keys matching pattern: ${keyPattern}`);
    }
  } catch (error) {
    console.error(`Error invalidating cache for pattern ${keyPattern}:`, error);
  }
}
