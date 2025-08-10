#!/usr/bin/env node

/**
 * Plants vs Zombies - Redis Edition Demo
 * Demonstrates Redis multi-model capabilities
 */

const RedisClient = require('./redis-client');
const GameEngine = require('./game-engine');

class PlantsVsZombiesDemo {
    constructor() {
        this.redis = new RedisClient();
        this.gameEngine = new GameEngine(this.redis);
    }

    async run() {
        console.log('🌻 Plants vs Zombies - Redis Edition Demo');
        console.log('==========================================');
        
        try {
            // Connect to Redis
            console.log('📡 Connecting to Redis...');
            await this.redis.connect();
            console.log('✅ Connected to Redis');
            
            // Demonstrate Redis multi-model capabilities
            await this.demonstrateRedisCapabilities();
            
            // Create and simulate a game
            await this.simulateGame();
            
            // Show analytics
            await this.showAnalytics();
            
        } catch (error) {
            console.error('❌ Demo failed:', error);
        } finally {
            await this.redis.disconnect();
            console.log('👋 Demo completed');
        }
    }

    async demonstrateRedisCapabilities() {
        console.log('\n🔧 Demonstrating Redis Multi-Model Capabilities');
        console.log('================================================');
        
        // 1. Primary Database - Player Data
        console.log('\n1️⃣ PRIMARY DATABASE (Hashes)');
        const playerData = {
            name: 'DemoPlayer',
            level: 5,
            experience: 1250,
            coins: 500,
            unlockedPlants: ['🌻', '🌱', '❄️', '🌰', '🍒'],
            achievements: ['FIRST_PLANT', 'ZOMBIE_HUNTER', 'WAVE_SURVIVOR'],
            stats: {
                gamesPlayed: 15,
                gamesWon: 12,
                totalZombiesKilled: 234,
                totalPlantsPlaced: 156
            }
        };
        
        await this.redis.savePlayerData('DemoPlayer', playerData);
        const retrievedData = await this.redis.getPlayerData('DemoPlayer');
        console.log('   📝 Saved and retrieved player data:', retrievedData.name, 'Level', retrievedData.level);
        
        // 2. Sorted Sets - Leaderboards
        console.log('\n2️⃣ SORTED SETS (Leaderboards)');
        await this.redis.updateLeaderboard('high_scores', 'Player1', 15000, 'Player1');
        await this.redis.updateLeaderboard('high_scores', 'Player2', 12500, 'Player2');
        await this.redis.updateLeaderboard('high_scores', 'DemoPlayer', 18750, 'DemoPlayer');
        await this.redis.updateLeaderboard('high_scores', 'Player3', 9800, 'Player3');
        
        const leaderboard = await this.redis.getLeaderboard('high_scores', 3);
        console.log('   🏆 Top 3 High Scores:');
        leaderboard.forEach(entry => {
            console.log(`      ${entry.rank}. ${entry.playerName}: ${entry.score}`);
        });
        
        // 3. Lists - Lane Management
        console.log('\n3️⃣ LISTS (Lane Management)');
        const gameId = 'demo-game-123';
        
        // Add zombies to different lanes
        await this.redis.addZombieToLane(gameId, 0, { id: 'z1', type: '🧟', health: 200 });
        await this.redis.addZombieToLane(gameId, 0, { id: 'z2', type: '🧟‍♂️', health: 640 });
        await this.redis.addZombieToLane(gameId, 2, { id: 'z3', type: '🏃‍♂️', health: 200 });
        
        const lane0Zombies = await this.redis.getZombiesInLane(gameId, 0);
        const lane2Zombies = await this.redis.getZombiesInLane(gameId, 2);
        console.log(`   🧟 Lane 0 has ${lane0Zombies.length} zombies`);
        console.log(`   🧟 Lane 2 has ${lane2Zombies.length} zombies`);
        
        // 4. Sets - Active Games
        console.log('\n4️⃣ SETS (Active Games & Players)');
        await this.redis.addActiveGame(gameId, {
            mode: 'cooperative',
            host: 'DemoPlayer',
            players: 2,
            status: 'playing',
            createdAt: Date.now()
        });
        
        await this.redis.addPlayerToGame(gameId, 'DemoPlayer');
        await this.redis.addPlayerToGame(gameId, 'Player2');
        
        const activeGames = await this.redis.getActiveGames();
        const playersInGame = await this.redis.getPlayersInGame(gameId);
        console.log(`   🎮 Active games: ${activeGames.length}`);
        console.log(`   👥 Players in demo game: ${playersInGame.length}`);
        
        // 5. Streams - Event Sourcing
        console.log('\n5️⃣ STREAMS (Event Sourcing)');
        await this.redis.addGameEvent(gameId, 'plant_placed', {
            playerId: 'DemoPlayer',
            plantType: '🌻',
            row: 2,
            col: 3,
            cost: 50
        });
        
        await this.redis.addGameEvent(gameId, 'zombie_killed', {
            playerId: 'DemoPlayer',
            zombieType: '🧟',
            damage: 20,
            points: 10
        });
        
        const gameEvents = await this.redis.getGameEvents(gameId, 5);
        console.log(`   📜 Game events recorded: ${gameEvents.length}`);
        gameEvents.forEach(event => {
            console.log(`      ${event.type}: ${JSON.stringify(event.data)}`);
        });
        
        // 6. Analytics - Counters and HyperLogLog
        console.log('\n6️⃣ ANALYTICS (Counters & HyperLogLog)');
        await this.redis.incrementCounter('total_games', 1);
        await this.redis.incrementCounter('plants_planted', 25);
        await this.redis.incrementCounter('zombies_killed', 15);
        
        await this.redis.addToHyperLogLog('unique_players', 'DemoPlayer', 'Player1', 'Player2', 'Player3');
        
        const totalGames = await this.redis.getCounter('total_games');
        const plantsPlanted = await this.redis.getCounter('plants_planted');
        const zombiesKilled = await this.redis.getCounter('zombies_killed');
        const uniquePlayers = await this.redis.getHyperLogLogCount('unique_players');
        
        console.log(`   📊 Total games: ${totalGames}`);
        console.log(`   🌱 Plants planted: ${plantsPlanted}`);
        console.log(`   🧟 Zombies killed: ${zombiesKilled}`);
        console.log(`   👤 Unique players: ${uniquePlayers}`);
    }

    async simulateGame() {
        console.log('\n🎮 Simulating a Complete Game');
        console.log('==============================');
        
        // Create game
        console.log('📝 Creating game...');
        const gameState = await this.gameEngine.createGame('DemoPlayer', 'cooperative');
        console.log(`✅ Game created: ${gameState.id}`);
        
        // Add second player
        console.log('👤 Adding second player...');
        await this.gameEngine.joinGame(gameState.id, 'Player2');
        console.log('✅ Player2 joined');
        
        // Start game
        console.log('🚀 Starting game...');
        await this.gameEngine.startGame(gameState.id, 'DemoPlayer');
        console.log('✅ Game started');
        
        // Simulate plant placements
        console.log('🌱 Placing plants...');
        await this.gameEngine.placePlant(gameState.id, 'DemoPlayer', '🌻', 2, 1); // Sunflower
        await this.gameEngine.placePlant(gameState.id, 'DemoPlayer', '🌱', 2, 2); // Peashooter
        await this.gameEngine.placePlant(gameState.id, 'Player2', '🌰', 2, 3);    // Wall-nut
        await this.gameEngine.placePlant(gameState.id, 'Player2', '❄️', 1, 2);   // Snow Pea
        console.log('✅ Plants placed');
        
        // Simulate powerup usage
        console.log('⚡ Using powerups...');
        await this.gameEngine.usePowerup(gameState.id, 'DemoPlayer', '☀️'); // Sun boost
        console.log('✅ Powerup used');
        
        // Show final game state
        const finalState = this.gameEngine.games.get(gameState.id);
        console.log('\n📊 Final Game State:');
        console.log(`   🎮 Game ID: ${finalState.id}`);
        console.log(`   👥 Players: ${Object.keys(finalState.players).length}`);
        console.log(`   🌱 Plants: ${finalState.plants.length}`);
        console.log(`   🌊 Current Wave: ${finalState.currentWave}`);
        console.log(`   📈 Status: ${finalState.status}`);
        
        // Show player stats
        Object.values(finalState.players).forEach(player => {
            console.log(`   👤 ${player.id}: ☀️${player.sun} 🏆${player.score} 🌱${player.plantsPlaced}`);
        });
    }

    async showAnalytics() {
        console.log('\n📈 Redis Analytics Dashboard');
        console.log('=============================');
        
        // Game statistics
        const totalGames = await this.redis.getCounter('total_games');
        const plantsPlanted = await this.redis.getCounter('plants_planted');
        const zombiesKilled = await this.redis.getCounter('zombies_killed');
        const uniquePlayers = await this.redis.getHyperLogLogCount('unique_players');
        
        console.log('🎮 GAME STATISTICS:');
        console.log(`   Total Games Played: ${totalGames}`);
        console.log(`   Total Plants Planted: ${plantsPlanted}`);
        console.log(`   Total Zombies Killed: ${zombiesKilled}`);
        console.log(`   Unique Players: ${uniquePlayers}`);
        
        // Active games
        const activeGames = await this.redis.getActiveGames();
        console.log(`\n🔴 ACTIVE GAMES: ${activeGames.length}`);
        activeGames.forEach(game => {
            console.log(`   🎮 ${game.id}: ${game.mode} (${game.players} players)`);
        });
        
        // Top players
        const topPlayers = await this.redis.getLeaderboard('high_scores', 5);
        console.log('\n🏆 TOP PLAYERS:');
        topPlayers.forEach(player => {
            console.log(`   ${player.rank}. ${player.playerName}: ${player.score} points`);
        });
        
        // Redis memory usage simulation
        console.log('\n💾 REDIS STORAGE EFFICIENCY:');
        console.log('   ✅ Game states stored as compressed JSON in Hashes');
        console.log('   ✅ Real-time updates via Pub/Sub (no polling)');
        console.log('   ✅ Event sourcing with automatic cleanup (1000 events max)');
        console.log('   ✅ Leaderboards with automatic ranking');
        console.log('   ✅ Efficient lane management with Lists');
        console.log('   ✅ Memory-efficient unique player counting with HyperLogLog');
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up demo data...');
        
        // Clean up demo data
        await this.redis.deleteKey('player:DemoPlayer:data');
        await this.redis.deleteKey('game:demo-game-123:state');
        await this.redis.deleteKey('game:demo-game-123:events');
        await this.redis.deleteKey('leaderboard:high_scores');
        
        console.log('✅ Demo data cleaned up');
    }
}

// Run demo if this file is executed directly
if (require.main === module) {
    const demo = new PlantsVsZombiesDemo();
    demo.run().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Demo failed:', error);
        process.exit(1);
    });
}

module.exports = PlantsVsZombiesDemo;
