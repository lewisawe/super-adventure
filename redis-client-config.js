// Redis Client Configuration for Plants vs Zombies
// Handles both development (no TLS) and production (with TLS + auth)

const redis = require('redis');

// Environment-aware Redis configuration
function createRedisClient() {
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  };

  // Production: Enable TLS and authentication
  if (process.env.REDIS_TLS === 'true') {
    config.tls = {
      // Skip hostname verification for ElastiCache
      checkServerIdentity: () => undefined,
      // Disable certificate verification for ElastiCache
      rejectUnauthorized: false,
    };
    
    console.log('🔐 Redis TLS enabled for production');
  }

  // Add authentication if token is provided
  if (process.env.REDIS_AUTH_TOKEN) {
    config.password = process.env.REDIS_AUTH_TOKEN;
    console.log('🔑 Redis authentication enabled');
  }

  // Create Redis client
  const client = redis.createClient(config);

  // Error handling
  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  client.on('ready', () => {
    console.log('🚀 Redis client ready for operations');
  });

  client.on('end', () => {
    console.log('🔌 Redis connection ended');
  });

  return client;
}

// Alternative using ioredis (recommended for production)
function createIORedisClient() {
  const Redis = require('ioredis');
  
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    // Connection pool settings
    family: 4,
    keepAlive: true,
    // Reconnection settings
    retryDelayOnClusterDown: 300,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  };

  // Production: Enable TLS
  if (process.env.REDIS_TLS === 'true') {
    config.tls = {
      checkServerIdentity: () => undefined,
      rejectUnauthorized: false,
    };
  }

  // Add authentication
  if (process.env.REDIS_AUTH_TOKEN) {
    config.password = process.env.REDIS_AUTH_TOKEN;
  }

  const redis = new Redis(config);

  // Event handlers
  redis.on('connect', () => {
    console.log('✅ IORedis connected successfully');
  });

  redis.on('ready', () => {
    console.log('🚀 IORedis client ready');
  });

  redis.on('error', (err) => {
    console.error('❌ IORedis Error:', err);
  });

  redis.on('close', () => {
    console.log('🔌 IORedis connection closed');
  });

  return redis;
}

// Export the client creation function
module.exports = {
  createRedisClient,
  createIORedisClient,
};

// Example usage in your main application:
/*
const { createIORedisClient } = require('./redis-client-config');

// Create Redis client
const redis = createIORedisClient();

// Connect to Redis
redis.connect().then(() => {
  console.log('Redis connected and ready for gaming!');
}).catch((err) => {
  console.error('Failed to connect to Redis:', err);
});

// Use Redis for gaming operations
async function setPlayerScore(playerId, score) {
  await redis.zadd('leaderboard:high_scores', score, playerId);
}

async function getTopPlayers(limit = 10) {
  return await redis.zrevrange('leaderboard:high_scores', 0, limit - 1, 'WITHSCORES');
}

// Pub/Sub for real-time game updates
const subscriber = createIORedisClient();
subscriber.subscribe('game:updates');
subscriber.on('message', (channel, message) => {
  console.log(`Game update on ${channel}:`, message);
  // Broadcast to connected players via Socket.IO
});
*/
