const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const RedisClient = require('./redis-client');
const GameEngine = require('./game-engine');

class PlantsVsZombiesServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.redis = new RedisClient();
        this.gameEngine = new GameEngine(this.redis);
        this.connectedPlayers = new Map(); // socket.id -> player info
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // Serve main game page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // API Routes
        this.app.get('/api/leaderboard/:category', async (req, res) => {
            try {
                const { category } = req.params;
                const limit = parseInt(req.query.limit) || 10;
                const leaderboard = await this.redis.getLeaderboard(category, limit);
                res.json(leaderboard);
            } catch (error) {
                console.error('Leaderboard error:', error);
                res.status(500).json({ error: 'Failed to get leaderboard' });
            }
        });

        this.app.get('/api/player/:playerId', async (req, res) => {
            try {
                const { playerId } = req.params;
                const playerData = await this.redis.getPlayerData(playerId);
                if (playerData) {
                    res.json(playerData);
                } else {
                    res.status(404).json({ error: 'Player not found' });
                }
            } catch (error) {
                console.error('Player data error:', error);
                res.status(500).json({ error: 'Failed to get player data' });
            }
        });

        this.app.get('/api/games/active', async (req, res) => {
            try {
                const activeGames = await this.redis.getActiveGames();
                res.json(activeGames);
            } catch (error) {
                console.error('Active games error:', error);
                res.status(500).json({ error: 'Failed to get active games' });
            }
        });

        this.app.get('/api/stats', async (req, res) => {
            try {
                const stats = {
                    totalGames: await this.redis.getCounter('total_games'),
                    totalPlayers: await this.redis.getHyperLogLogCount('unique_players'),
                    activeGames: (await this.redis.getActiveGames()).length,
                    zombiesKilled: await this.redis.getCounter('zombies_killed'),
                    plantsPlanted: await this.redis.getCounter('plants_planted')
                };
                res.json(stats);
            } catch (error) {
                console.error('Stats error:', error);
                res.status(500).json({ error: 'Failed to get stats' });
            }
        });

        // Get player's active games
        this.app.get('/api/player/:playerId/games', async (req, res) => {
            try {
                const { playerId } = req.params;
                const activeGames = await this.redis.getActiveGames();
                const playerGames = [];

                for (const gameInfo of activeGames) {
                    const gameId = gameInfo.id;
                    
                    // Get the actual game state from Redis
                    const stateKey = `game:${gameId}:state`;
                    const stateData = await this.redis.client.hGetAll(stateKey);
                    
                    if (stateData && stateData.data) {
                        const gameState = JSON.parse(stateData.data);
                        
                        // Check if player is in this game
                        if (gameState.players && gameState.players[playerId]) {
                            const gameDetails = {
                                gameId: gameId,
                                mode: gameState.mode || 'cooperative',
                                status: gameState.status === 'paused' ? 'paused' : 
                                       (gameState.currentWave > 0 ? 'playing' : 'waiting'),
                                wave: gameState.currentWave || 1,
                                players: Object.keys(gameState.players).length,
                                lastActivity: parseInt(stateData.lastUpdate) || gameState.lastUpdate || Date.now(),
                                playerSun: gameState.players[playerId].sun || 0,
                                createdAt: gameState.createdAt || Date.now()
                            };
                            playerGames.push(gameDetails);
                        }
                    }
                }

                // Sort by last activity (most recent first)
                playerGames.sort((a, b) => b.lastActivity - a.lastActivity);

                res.json(playerGames);
            } catch (error) {
                console.error('Player games error:', error);
                res.status(500).json({ error: 'Failed to get player games' });
            }
        });

        // Debug endpoint to reload a game
        this.app.post('/api/debug/reload-game/:gameId', async (req, res) => {
            try {
                const { gameId } = req.params;
                console.log(`🔄 Manual reload requested for game ${gameId}`);
                
                // Load game state from Redis
                const gameState = await this.redis.getGameState(gameId);
                if (!gameState) {
                    return res.status(404).json({ error: 'Game not found' });
                }
                
                // Add to in-memory games
                this.gameEngine.games.set(gameId, gameState);
                
                // Create wave manager if wave is in progress
                if (gameState.waveInProgress && gameState.currentWave > 0) {
                    const WaveManager = require('./game-engine').WaveManager;
                    const waveManager = new WaveManager(this.gameEngine, gameState);
                    waveManager.startWave(gameState.currentWave - 1);
                    this.gameEngine.waveManagers.set(gameId, waveManager);
                    console.log(`🌊 Restarted wave ${gameState.currentWave} for game ${gameId}`);
                }
                
                // Start game loop if not already running
                if (!this.gameEngine.gameLoops.has(gameId)) {
                    const interval = setInterval(async () => {
                        try {
                            await this.gameEngine.updateGame(gameId);
                        } catch (error) {
                            console.error(`Game loop error for ${gameId}:`, error.message);
                        }
                    }, 1000 / 60); // 60 FPS
                    
                    this.gameEngine.gameLoops.set(gameId, interval);
                    console.log(`🔄 Started game loop for ${gameId}`);
                }
                
                res.json({ 
                    success: true, 
                    message: `Game ${gameId} reloaded successfully`,
                    gameState: {
                        currentWave: gameState.currentWave,
                        waveInProgress: gameState.waveInProgress,
                        zombieCount: gameState.zombies.length
                    }
                });
                
            } catch (error) {
                console.error('Error reloading game:', error);
                res.status(500).json({ error: 'Failed to reload game' });
            }
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Player connected: ${socket.id}`);

            // Player joins game
            socket.on('join_game', async (data) => {
                try {
                    const { playerName, gameId } = data;
                    
                    if (!playerName || playerName.trim().length === 0) {
                        socket.emit('error', { message: 'Player name is required' });
                        return;
                    }

                    // Get or create player data
                    let playerData = await this.redis.getPlayerData(playerName);
                    if (!playerData) {
                        playerData = {
                            name: playerName,
                            level: 1,
                            experience: 0,
                            coins: 100,
                            unlockedPlants: ['🌻', '🌱', '🌰'],
                            achievements: [],
                            stats: {}
                        };
                        await this.redis.savePlayerData(playerName, playerData);
                        await this.redis.addToHyperLogLog('unique_players', playerName);
                    }

                    // Join or create game
                    let result;
                    if (gameId && await this.redis.keyExists(`game:${gameId}:state`)) {
                        result = await this.gameEngine.joinGame(gameId, playerName);
                    } else {
                        const gameState = await this.gameEngine.createGame(playerName);
                        await this.redis.incrementCounter('total_games');
                        result = {
                            gameId: gameState.id,
                            playerId: playerName,
                            gameState: gameState,
                            isRejoining: false
                        };
                    }

                    // Store player connection info
                    this.connectedPlayers.set(socket.id, {
                        playerId: result.playerId,
                        gameId: result.gameId,
                        playerData: playerData
                    });

                    // Join socket room
                    socket.join(result.gameId);

                    // Subscribe to Redis updates for this game
                    await this.redis.subscribeToGame(result.gameId, (update) => {
                        console.log(`📡 Broadcasting ${update.type} to game ${result.gameId}`);
                        this.io.to(result.gameId).emit(update.type, update.data);
                    });

                    socket.emit('game_joined', {
                        gameId: result.gameId,
                        playerId: result.playerId,
                        gameState: result.gameState,
                        playerData: playerData,
                        isRejoining: result.isRejoining
                    });

                    if (result.isRejoining) {
                        console.log(`🔄 ${result.playerId} rejoined game: ${result.gameId}`);
                    } else {
                        console.log(`🎮 ${result.playerId} joined game: ${result.gameId}`);
                    }

                } catch (error) {
                    console.error('Join game error:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Start game
            socket.on('start_game', async () => {
                try {
                    const player = this.connectedPlayers.get(socket.id);
                    if (!player) {
                        socket.emit('error', { message: 'Player not found' });
                        return;
                    }

                    await this.gameEngine.startGame(player.gameId, player.playerId);
                    console.log(`🚀 Game started: ${player.gameId}`);

                } catch (error) {
                    console.error('Start game error:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Pause game
            socket.on('pause_game', async () => {
                try {
                    const player = this.connectedPlayers.get(socket.id);
                    if (!player) {
                        socket.emit('error', { message: 'Player not found' });
                        return;
                    }

                    const result = await this.gameEngine.pauseGame(player.gameId, player.playerId);
                    if (result.success) {
                        this.io.to(player.gameId).emit('game_paused', {
                            gameState: result.gameState,
                            pausedBy: player.playerId,
                            message: `Game paused by ${player.playerId}`
                        });
                        console.log(`⏸️ Game paused: ${player.gameId} by ${player.playerId}`);
                    } else {
                        socket.emit('error', { message: result.message });
                    }
                } catch (error) {
                    console.error('Pause game error:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Resume game
            socket.on('resume_game', async () => {
                try {
                    const player = this.connectedPlayers.get(socket.id);
                    if (!player) {
                        socket.emit('error', { message: 'Player not found' });
                        return;
                    }

                    const result = await this.gameEngine.resumeGame(player.gameId, player.playerId);
                    if (result.success) {
                        this.io.to(player.gameId).emit('game_resumed', {
                            gameState: result.gameState,
                            resumedBy: player.playerId,
                            message: `Game resumed by ${player.playerId}`
                        });
                        console.log(`▶️ Game resumed: ${player.gameId} by ${player.playerId}`);
                    } else {
                        socket.emit('error', { message: result.message });
                    }
                } catch (error) {
                    console.error('Resume game error:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Plant placement
            socket.on('place_plant', async (data) => {
                try {
                    const { plantType, row, col } = data;
                    const player = this.connectedPlayers.get(socket.id);
                    
                    if (!player) {
                        socket.emit('error', { message: 'Player not found' });
                        return;
                    }

                    const result = await this.gameEngine.placePlant(
                        player.gameId,
                        player.playerId,
                        plantType,
                        row,
                        col
                    );

                    await this.redis.incrementCounter('plants_planted');
                    await this.redis.addGameEvent(player.gameId, 'plant_placed', {
                        playerId: player.playerId,
                        plantType,
                        row,
                        col,
                        cost: result.cost
                    });

                    socket.emit('plant_placed', result);
                    console.log(`🌱 ${player.playerId} placed ${plantType} at (${row}, ${col})`);

                } catch (error) {
                    console.error('Place plant error:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Use power-up
            socket.on('use_powerup', async (data) => {
                try {
                    const { powerupType } = data;
                    const player = this.connectedPlayers.get(socket.id);
                    
                    if (!player) {
                        socket.emit('error', { message: 'Player not found' });
                        return;
                    }

                    const result = await this.gameEngine.usePowerup(
                        player.gameId,
                        player.playerId,
                        powerupType
                    );

                    await this.redis.addGameEvent(player.gameId, 'powerup_used', {
                        playerId: player.playerId,
                        powerupType
                    });

                    socket.emit('powerup_used', result);
                    console.log(`⚡ ${player.playerId} used powerup: ${powerupType}`);

                } catch (error) {
                    console.error('Use powerup error:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Player disconnect
            socket.on('disconnect', async () => {
                try {
                    const player = this.connectedPlayers.get(socket.id);
                    if (player) {
                        await this.gameEngine.removePlayer(player.gameId, player.playerId);
                        await this.redis.removePlayerFromGame(player.gameId, player.playerId);
                        
                        this.connectedPlayers.delete(socket.id);
                        console.log(`🔌 ${player.playerId} disconnected from game: ${player.gameId}`);
                    }
                } catch (error) {
                    console.error('Disconnect error:', error);
                }
            });
        });
    }

    async start(port = process.env.PORT || 3001) {
        try {
            // Connect to Redis
            const connected = await this.redis.connect();
            if (!connected) {
                throw new Error('Failed to connect to Redis');
            }

            // Start server
            this.server.listen(port, () => {
                console.log(`🌻 Plants vs Zombies server running on port ${port}`);
                console.log(`🎮 Game available at: http://localhost:${port}`);
                console.log(`📊 API available at: http://localhost:${port}/api`);
            });
            
            // Reload active games after server starts
            setTimeout(async () => {
                console.log('🔄 Starting game reloading...');
                try {
                    await this.gameEngine.reloadActiveGames();
                    console.log('✅ Game reloading completed');
                } catch (error) {
                    console.error('❌ Error during game reloading:', error);
                }
            }, 1000);

            // Graceful shutdown
            process.on('SIGINT', async () => {
                console.log('🛑 Shutting down server...');
                await this.redis.disconnect();
                process.exit(0);
            });

        } catch (error) {
            console.error('❌ Server startup failed:', error);
            process.exit(1);
        }
    }
}

// Start server if this file is run directly
if (require.main === module) {
    const server = new PlantsVsZombiesServer();
    server.start();
}

module.exports = PlantsVsZombiesServer;
