#!/usr/bin/env node

const redis = require('redis');

async function clearLeaderboard() {
    const client = redis.createClient({
        host: 'localhost',
        port: 6379
    });

    try {
        await client.connect();
        console.log('🔗 Connected to Redis');

        // Clear all leaderboard data
        const leaderboardKeys = [
            'leaderboard:high_scores',
            'leaderboard:zombies_killed',
            'leaderboard:plants_planted',
            'leaderboard:waves_completed',
            'leaderboard:games_won'
        ];

        for (const key of leaderboardKeys) {
            await client.del(key);
            console.log(`🗑️ Cleared ${key}`);
        }

        // Clear counters
        const counterKeys = [
            'counter:total_games',
            'counter:plants_planted',
            'counter:zombies_killed',
            'counter:games_won'
        ];

        for (const key of counterKeys) {
            await client.del(key);
            console.log(`🗑️ Cleared ${key}`);
        }

        // Clear unique players
        await client.del('hll:unique_players');
        console.log('🗑️ Cleared unique players tracking');

        console.log('✅ All leaderboard data cleared!');
        console.log('🎮 Leaderboard will now use real game data');

    } catch (error) {
        console.error('❌ Error clearing leaderboard:', error);
    } finally {
        await client.disconnect();
        console.log('🔌 Disconnected from Redis');
    }
}

// Run the script
clearLeaderboard().catch(console.error);
