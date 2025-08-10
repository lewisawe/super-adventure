#!/usr/bin/env node

const redis = require('redis');

async function populateLeaderboard() {
    const client = redis.createClient({
        host: 'localhost',
        port: 6379
    });

    try {
        await client.connect();
        console.log('🔗 Connected to Redis');

        // Sample players and their stats
        const players = [
            { name: 'Lewis', highScore: 15420, zombiesKilled: 234, plantsPlanted: 89, wavesCompleted: 12, gamesWon: 8 },
            { name: 'GardenMaster', highScore: 18750, zombiesKilled: 312, plantsPlanted: 156, wavesCompleted: 15, gamesWon: 12 },
            { name: 'ZombieSlayer', highScore: 22100, zombiesKilled: 445, plantsPlanted: 98, wavesCompleted: 18, gamesWon: 15 },
            { name: 'PlantLover', highScore: 12300, zombiesKilled: 189, plantsPlanted: 234, wavesCompleted: 10, gamesWon: 6 },
            { name: 'DefenseKing', highScore: 19800, zombiesKilled: 378, plantsPlanted: 167, wavesCompleted: 16, gamesWon: 11 },
            { name: 'SunflowerFan', highScore: 14200, zombiesKilled: 201, plantsPlanted: 198, wavesCompleted: 11, gamesWon: 7 },
            { name: 'WaveRider', highScore: 25600, zombiesKilled: 523, plantsPlanted: 145, wavesCompleted: 22, gamesWon: 18 },
            { name: 'PeaShooter', highScore: 11800, zombiesKilled: 167, plantsPlanted: 123, wavesCompleted: 9, gamesWon: 5 },
            { name: 'CherryBomb', highScore: 17300, zombiesKilled: 289, plantsPlanted: 134, wavesCompleted: 14, gamesWon: 9 },
            { name: 'WallNutPro', highScore: 13900, zombiesKilled: 178, plantsPlanted: 201, wavesCompleted: 11, gamesWon: 6 }
        ];

        console.log('🏆 Populating leaderboards...');

        for (const player of players) {
            // High Scores
            await client.zAdd('leaderboard:high_scores', {
                score: player.highScore,
                value: player.name
            });

            // Zombies Killed
            await client.zAdd('leaderboard:zombies_killed', {
                score: player.zombiesKilled,
                value: player.name
            });

            // Plants Planted
            await client.zAdd('leaderboard:plants_planted', {
                score: player.plantsPlanted,
                value: player.name
            });

            // Waves Completed
            await client.zAdd('leaderboard:waves_completed', {
                score: player.wavesCompleted,
                value: player.name
            });

            // Games Won
            await client.zAdd('leaderboard:games_won', {
                score: player.gamesWon,
                value: player.name
            });

            // Add to unique players
            await client.pfAdd('hll:unique_players', player.name);

            console.log(`✅ Added ${player.name} to leaderboards`);
        }

        // Set global counters
        await client.set('counter:total_games', 156);
        await client.set('counter:plants_planted', 1847);
        await client.set('counter:zombies_killed', 3124);
        await client.set('counter:games_won', 98);

        console.log('📊 Set global counters');
        console.log('🎉 Leaderboard population complete!');

        // Display some stats
        const highScores = await client.zRevRangeWithScores('leaderboard:high_scores', 0, 4);
        console.log('\n🏆 Top 5 High Scores:');
        highScores.forEach((entry, index) => {
            console.log(`${index + 1}. ${entry.value}: ${entry.score}`);
        });

    } catch (error) {
        console.error('❌ Error populating leaderboard:', error);
    } finally {
        await client.disconnect();
        console.log('🔌 Disconnected from Redis');
    }
}

// Run the script
populateLeaderboard().catch(console.error);
