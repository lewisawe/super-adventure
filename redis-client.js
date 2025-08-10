const redis = require('redis');
const logger = require('./utils/logger');

class RedisMultiModelClient {
    constructor() {
        this.client = null;
        this.publisher = null;
        this.subscriber = null;
    }

    async connect() {
        try {
            // Get Redis configuration from environment variables
            const redisHost = process.env.REDIS_HOST || 'localhost';
            const redisPort = parseInt(process.env.REDIS_PORT) || 6379;
            const redisTLS = process.env.REDIS_TLS === 'true';
            const redisAuth = process.env.REDIS_AUTH_TOKEN;

            // Build Redis URL for v4+ client
            const protocol = redisTLS ? 'rediss' : 'redis';
            let redisUrl = `${protocol}://${redisHost}:${redisPort}`;
            
            const redisConfig = {
                url: redisUrl
            };

            // Add TLS configuration if enabled
            if (redisTLS) {
                redisConfig.socket = {
                    tls: true,
                    rejectUnauthorized: false,
                    checkServerIdentity: () => undefined
                };
            }

            // Add authentication if provided
            if (redisAuth) {
                redisConfig.password = redisAuth;
            }

            logger.info(`🔗 Connecting to Redis at ${redisHost}:${redisPort} (TLS: ${redisTLS})`);

            // Main client for general operations
            this.client = redis.createClient(redisConfig);

            // Separate clients for pub/sub
            this.publisher = redis.createClient(redisConfig);
            this.subscriber = redis.createClient(redisConfig);

            await this.client.connect();
            await this.publisher.connect();
            await this.subscriber.connect();

            logger.info('✅ Redis clients connected successfully');
            return true;
        } catch (error) {
            logger.error('❌ Redis connection failed:', error);
            return false;
        }
    }

    // Helper method to wrap Redis operations with error handling
    async safeRedisOperation(operation, operationName, ...args) {
        try {
            return await operation(...args);
        } catch (error) {
            logger.error(`❌ Redis ${operationName} error:`, error.message);
            logger.error(`   Operation: ${operationName}`);
            logger.error(`   Args:`, args);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) await this.client.disconnect();
        if (this.publisher) await this.publisher.disconnect();
        if (this.subscriber) await this.subscriber.disconnect();
    }

    // ==========================================
    // PRIMARY DATABASE OPERATIONS
    // ==========================================

    // Game State Management (Hashes)
    async saveGameState(gameId, gameState) {
        const key = `game:${gameId}:state`;
        await this.client.hSet(key, {
            data: JSON.stringify(gameState),
            lastUpdate: Date.now().toString(),
            status: gameState.status
        });
        await this.client.expire(key, 3600); // 1 hour TTL
    }

    async getGameState(gameId) {
        const key = `game:${gameId}:state`;
        const data = await this.client.hGetAll(key);
        if (data.data) {
            return JSON.parse(data.data);
        }
        return null;
    }

    // Player Data Management (Hashes)
    async savePlayerData(playerId, playerData) {
        const key = `player:${playerId}:data`;
        await this.client.hSet(key, {
            name: playerData.name,
            level: (playerData.level || 1).toString(),
            experience: (playerData.experience || 0).toString(),
            coins: (playerData.coins || 0).toString(),
            unlockedPlants: JSON.stringify(playerData.unlockedPlants || []),
            achievements: JSON.stringify(playerData.achievements || []),
            stats: JSON.stringify(playerData.stats || {}),
            lastPlayed: Date.now().toString()
        });
    }

    async getPlayerData(playerId) {
        const key = `player:${playerId}:data`;
        const data = await this.client.hGetAll(key);
        if (Object.keys(data).length === 0) return null;
        
        return {
            name: data.name,
            level: parseInt(data.level) || 1,
            experience: parseInt(data.experience) || 0,
            coins: parseInt(data.coins) || 0,
            unlockedPlants: JSON.parse(data.unlockedPlants || '[]'),
            achievements: JSON.parse(data.achievements || '[]'),
            stats: JSON.parse(data.stats || '{}'),
            lastPlayed: parseInt(data.lastPlayed)
        };
    }

    // ==========================================
    // REAL-TIME PUB/SUB
    // ==========================================

    async publishGameUpdate(gameId, updateType, data) {
        const channel = `game:${gameId}:updates`;
        const message = JSON.stringify({
            type: updateType,
            data: data,
            timestamp: Date.now()
        });
        await this.publisher.publish(channel, message);
    }

    async subscribeToGame(gameId, callback) {
        const channel = `game:${gameId}:updates`;
        await this.subscriber.subscribe(channel, (message) => {
            try {
                const parsedMessage = JSON.parse(message);
                callback(parsedMessage);
            } catch (error) {
                logger.error('Error parsing game update:', error);
            }
        });
    }

    async unsubscribeFromGame(gameId) {
        const channel = `game:${gameId}:updates`;
        await this.subscriber.unsubscribe(channel);
    }

    // ==========================================
    // STREAMS FOR EVENT SOURCING
    // ==========================================

    async addGameEvent(gameId, eventType, eventData) {
        try {
            const streamKey = `game:${gameId}:events`;
            
            
            // Use the correct xAdd syntax - pass fields as key-value pairs
            const result = await this.client.xAdd(streamKey, '*', {
                'type': eventType.toString(),
                'data': JSON.stringify(eventData),
                'timestamp': Date.now().toString()
            });
            
            
            // Try to keep only last 1000 events per game (use correct xTrim syntax)
            try {
                await this.client.xTrim(streamKey, 'MAXLEN', 1000);
            } catch (trimError) {
                logger.warn(`⚠️ Could not trim stream ${streamKey}:`, trimError.message);
            }
            
        } catch (error) {
            logger.error(`❌ Redis addGameEvent error for game ${gameId}:`, error.message);
            logger.error(`   Event type: ${eventType}`);
            logger.error(`   Event data:`, eventData);
            
            // Don't throw the error - just log it so the game continues
            logger.warn(`⚠️ Continuing without event logging for this operation`);
        }
    }

    async getGameEvents(gameId, count = 100) {
        const streamKey = `game:${gameId}:events`;
        const events = await this.client.xRevRange(streamKey, '+', '-', { COUNT: count });
        
        return events.map(event => ({
            id: event.id,
            type: event.message.type,
            data: JSON.parse(event.message.data),
            timestamp: parseInt(event.message.timestamp)
        }));
    }

    // ==========================================
    // SORTED SETS FOR LEADERBOARDS
    // ==========================================

    async updateLeaderboard(category, playerId, score, playerName) {
        const key = `leaderboard:${category}`;
        const numericScore = parseFloat(score) || 0;
        const member = `${playerId}:${playerName}`;
        
        await this.client.zAdd(key, [{ score: numericScore, value: member }]);
        
        // Keep only top 100 scores
        await this.client.zRemRangeByRank(key, 0, -101);
    }

    async getLeaderboard(category, limit = 10) {
        const key = `leaderboard:${category}`;
        const results = await this.client.zRevRange(key, 0, limit - 1, { WITHSCORES: true });
        
        return results.map((item, index) => {
            const [playerId, playerName] = item.value.split(':');
            return {
                rank: index + 1,
                playerId,
                playerName,
                score: item.score
            };
        });
    }

    // ==========================================
    // LISTS FOR LANE MANAGEMENT
    // ==========================================

    async addZombieToLane(gameId, laneIndex, zombieData) {
        const key = `game:${gameId}:lane:${laneIndex}:zombies`;
        await this.client.rPush(key, JSON.stringify(zombieData));
        await this.client.expire(key, 3600); // 1 hour TTL
    }

    async getZombiesInLane(gameId, laneIndex) {
        const key = `game:${gameId}:lane:${laneIndex}:zombies`;
        const zombies = await this.client.lRange(key, 0, -1);
        return zombies.map(zombie => JSON.parse(zombie));
    }

    async removeZombieFromLane(gameId, laneIndex, zombieId) {
        const key = `game:${gameId}:lane:${laneIndex}:zombies`;
        const zombies = await this.client.lRange(key, 0, -1);
        
        for (let i = 0; i < zombies.length; i++) {
            const zombie = JSON.parse(zombies[i]);
            if (zombie.id === zombieId) {
                await this.client.lSet(key, i, 'DELETED');
                await this.client.lRem(key, 1, 'DELETED');
                break;
            }
        }
    }

    // ==========================================
    // SETS FOR ACTIVE GAMES AND PLAYERS
    // ==========================================

    async addActiveGame(gameId, gameInfo) {
        await this.client.sAdd('active_games', gameId);
        
        // Convert all values to strings for Redis
        const stringifiedInfo = {};
        for (const [key, value] of Object.entries(gameInfo)) {
            stringifiedInfo[key] = typeof value === 'object' ? JSON.stringify(value) : value.toString();
        }
        
        await this.client.hSet(`game:${gameId}:info`, stringifiedInfo);
        await this.client.expire(`game:${gameId}:info`, 3600);
    }

    async removeActiveGame(gameId) {
        await this.client.sRem('active_games', gameId);
        await this.client.del(`game:${gameId}:info`);
    }

    // ==========================================
    // LEADERBOARD METHODS
    // ==========================================

    async getLeaderboard(category, limit = 50) {
        try {
            const key = `leaderboard:${category}`;
            
            // Get top scores with ZREVRANGE (highest to lowest)
            const results = await this.client.zRangeWithScores(key, 0, limit - 1, { REV: true });
            
            const leaderboard = results.map(result => ({
                player: result.value,
                score: result.score
            }));
            
            return leaderboard;
            
        } catch (error) {
            logger.error(`Error getting leaderboard ${category}:`, error);
            return [];
        }
    }

    async updateLeaderboard(category, playerId, score) {
        try {
            const key = `leaderboard:${category}`;
            
            // Add or update player score (ZADD automatically handles max score)
            await this.client.zAdd(key, { score: score, value: playerId });
            
            // Set expiration (optional - keep leaderboards for 30 days)
            await this.client.expire(key, 30 * 24 * 3600);
            
            
        } catch (error) {
            logger.error(`Error updating leaderboard ${category}:`, error);
        }
    }

    async getPlayerRank(category, playerId) {
        try {
            const key = `leaderboard:${category}`;
            
            // Get player's rank (0-based, so add 1)
            const rank = await this.client.zRevRank(key, playerId);
            
            return rank !== null ? rank + 1 : null;
            
        } catch (error) {
            logger.error(`Error getting player rank ${category}:`, error);
            return null;
        }
    }

    async getGlobalStats() {
        try {
            const stats = {};
            
            // Get counter values
            stats.totalGames = await this.client.get('counter:total_games') || 0;
            stats.plantsPlanted = await this.client.get('counter:plants_planted') || 0;
            stats.zombiesKilled = await this.client.get('counter:zombies_killed') || 0;
            stats.gamesWon = await this.client.get('counter:games_won') || 0;
            
            // Get unique players count using HyperLogLog
            stats.uniquePlayers = await this.client.pfCount('hll:unique_players') || 0;
            
            // Get leaderboard sizes
            stats.highScoreEntries = await this.client.zCard('leaderboard:high_scores') || 0;
            stats.zombieKillerEntries = await this.client.zCard('leaderboard:zombies_killed') || 0;
            
            // Convert strings to numbers
            Object.keys(stats).forEach(key => {
                stats[key] = parseInt(stats[key]) || 0;
            });
            
            return stats;
            
        } catch (error) {
            logger.error('Error getting global stats:', error);
            return {
                totalGames: 0,
                plantsPlanted: 0,
                zombiesKilled: 0,
                gamesWon: 0,
                uniquePlayers: 0,
                highScoreEntries: 0,
                zombieKillerEntries: 0
            };
        }
    }

    async incrementCounter(counterName, amount = 1) {
        try {
            const key = `counter:${counterName}`;
            const newValue = await this.client.incrBy(key, amount);
            
            // Set expiration for counters (optional - keep for 1 year)
            await this.client.expire(key, 365 * 24 * 3600);
            
            return newValue;
            
        } catch (error) {
            logger.error(`Error incrementing counter ${counterName}:`, error);
            return 0;
        }
    }

    async addUniquePlayer(playerId) {
        try {
            // Add player to HyperLogLog for unique count
            await this.client.pfAdd('hll:unique_players', playerId);
            
            // Set expiration (optional - keep for 1 year)
            await this.client.expire('hll:unique_players', 365 * 24 * 3600);
            
            
        } catch (error) {
            logger.error('Error adding unique player:', error);
        }
    }

    // ==========================================
    // EXISTING METHODS CONTINUE...
    // ==========================================

    async getActiveGames() {
        const gameIds = await this.client.sMembers('active_games');
        const games = [];
        
        for (const gameId of gameIds) {
            const info = await this.client.hGetAll(`game:${gameId}:info`);
            if (Object.keys(info).length > 0) {
                games.push({ id: gameId, ...info });
            }
        }
        
        return games;
    }

    async addPlayerToGame(gameId, playerId) {
        await this.client.sAdd(`game:${gameId}:players`, playerId);
        await this.client.expire(`game:${gameId}:players`, 3600);
    }

    async removePlayerFromGame(gameId, playerId) {
        await this.client.sRem(`game:${gameId}:players`, playerId);
    }

    async getPlayersInGame(gameId) {
        return await this.client.sMembers(`game:${gameId}:players`);
    }

    // ==========================================
    // ANALYTICS AND METRICS
    // ==========================================

    async incrementCounter(key, amount = 1) {
        try {
            // Ensure amount is always an integer
            const intAmount = parseInt(amount) || 1;
            const counterKey = `counter:${key}`;
            
            
            return await this.client.incrBy(counterKey, intAmount);
        } catch (error) {
            logger.error(`❌ Redis incrementCounter error for key ${key}:`, error.message);
            logger.error(`   Amount: ${amount} (parsed: ${parseInt(amount) || 1})`);
            throw error;
        }
    }

    async getCounter(key) {
        const value = await this.client.get(`counter:${key}`);
        return parseInt(value) || 0;
    }

    async addToHyperLogLog(key, ...elements) {
        return await this.client.pfAdd(`hll:${key}`, elements);
    }

    async getHyperLogLogCount(key) {
        return await this.client.pfCount(`hll:${key}`);
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    async setWithTTL(key, value, ttlSeconds) {
        await this.client.setEx(key, parseInt(ttlSeconds), JSON.stringify(value));
    }

    async getWithTTL(key) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }

    async deleteKey(key) {
        return await this.client.del(key);
    }

    async keyExists(key) {
        return await this.client.exists(key);
    }
}

module.exports = RedisMultiModelClient;
