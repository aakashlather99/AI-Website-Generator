import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, 
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    if (times > 3) return null; // Stop retrying after 3 attempts to prevent terminal spam
    return Math.min(times * 500, 2000);
  },
});

let connectionErrorLogged = false;
redis.on('error', (err) => {
  // Silent to prevent terminal spam when Redis is not running
});

// Cache helpers
export const cacheGet = async (key) => {
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
};

export const cacheSet = async (key, data, ttlSeconds = 300) => {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch { /* silent */ }
};

export const cacheDel = async (key) => {
  try { await redis.del(key); } catch { /* silent */ }
};

export const connectRedis = async () => {
  try {
    await redis.connect();
  } catch (err) {
    console.warn('⚠️  Redis connection failed:', err.message);
    console.warn('⚠️  App will work without Redis caching');
  }
};

export default redis;
