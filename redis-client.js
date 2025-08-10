const redis = require('redis');

class RedisMultiModelClient {
    constructor() {
        this.client = null;
        this.publisher = null;
        this.subscriber = null;
    }

    async connect() {
        try {
            // Main client for general operations
            this.client = redis.createClient({
                host: 'localhost',
                port: 6379,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        return new Error('Redis server connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            // Separate clients for pub/sub
            this.publisher = redis.createClient({ host: 'localhost', port: 6379 });
            this.subscriber = redis.createClient({ host: 'localhost', port: 6379 });

            await this.client.connect();
            await this.publisher.connect();
            await this.subscriber.connect();

            console.log('✅ Redis Multi-Model Client connected');
            return true;
        } catch (error) {
            console.error('❌ Redis connection failed:', error);
            return false;
        }
    }

    // Helper method to wrap Redis operations with error handling
    async safeRedisOperation(operation, operationName, ...args) {
        try {
            return await operation(...args);
        } catch (error) {
            console.error(`❌ Redis ${operationName} error:`, error.message);
            console.error(`   Operation: ${operationName}`);
            console.error(`   Args:`, args);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) await this.client.disconnect();
        if (this.publisher) await this.publisher.disconnect();
        if (this.subscriber) await this.subscriber.disconnect();
        console.log('🔌 Redis disconnected');
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
                console.error('Error parsing game update:', error);
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
            
            console.log(`🔍 Adding game event: ${eventType} to ${streamKey}`);
            
            // Use the correct xAdd syntax - pass fields as key-value pairs
            const result = await this.client.xAdd(streamKey, '*', {
                'type': eventType.toString(),
                'data': JSON.stringify(eventData),
                'timestamp': Date.now().toString()
            });
            
            console.log(`✅ Event added with ID: ${result}`);
            
            // Try to keep only last 1000 events per game (use correct xTrim syntax)
            try {
                await this.client.xTrim(streamKey, 'MAXLEN', 1000);
            } catch (trimError) {
                console.warn(`⚠️ Could not trim stream ${streamKey}:`, trimError.message);
            }
            
        } catch (error) {
            console.error(`❌ Redis addGameEvent error for game ${gameId}:`, error.message);
            console.error(`   Event type: ${eventType}`);
            console.error(`   Event data:`, eventData);
            
            // Don't throw the error - just log it so the game continues
            console.warn(`⚠️ Continuing without event logging for this operation`);
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
            
            console.log(`🔍 Incrementing counter: ${counterKey} by ${intAmount}`);
            
            return await this.client.incrBy(counterKey, intAmount);
        } catch (error) {
            console.error(`❌ Redis incrementCounter error for key ${key}:`, error.message);
            console.error(`   Amount: ${amount} (parsed: ${parseInt(amount) || 1})`);
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
