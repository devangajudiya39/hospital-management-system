const { createClient } = require('redis');

let client;
let isConnected = false;

const connectRedis = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
        client = createClient({ url: redisUrl });

        client.on('error', (err) => {
            console.error('❌ Redis Client Error:', err);
            isConnected = false;
        });

        client.on('connect', () => {
            console.log('✅ Connected to Redis');
            isConnected = true;
        });

        client.on('ready', () => {
            isConnected = true;
        });

        client.on('end', () => {
            isConnected = false;
        });

        await client.connect();
    } catch (err) {
        console.error('❌ Failed to connect to Redis:', err);
        isConnected = false;
    }
};

const getCache = async (key) => {
    if (!isConnected || !client) return null;
    try {
        const data = await client.get(key);
        if (data) {
            console.log(`[REDIS] HIT ${key}`);
            return JSON.parse(data);
        } else {
            console.log(`[REDIS] MISS ${key}`);
            return null;
        }
    } catch (err) {
        console.error(`[REDIS] GET Error for key ${key}:`, err);
        return null;
    }
};

const setCache = async (key, value, ttlSeconds) => {
    if (!isConnected || !client) return;
    try {
        await client.set(key, JSON.stringify(value), {
            EX: ttlSeconds
        });
        console.log(`[REDIS] SET ${key}`);
    } catch (err) {
        console.error(`[REDIS] SET Error for key ${key}:`, err);
    }
};

const delCache = async (key) => {
    if (!isConnected || !client) return;
    try {
        await client.del(key);
        console.log(`[REDIS] INVALIDATE ${key}`);
    } catch (err) {
        console.error(`[REDIS] DEL Error for key ${key}:`, err);
    }
};

module.exports = {
    connectRedis,
    getCache,
    setCache,
    delCache
};
