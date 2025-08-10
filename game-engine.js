const { v4: uuidv4 } = require('uuid');
const GAME_CONFIG = require('./config/game-config');

class WaveManager {
    constructor(gameEngine, gameState) {
        this.gameEngine = gameEngine;
        this.gameState = gameState;
        this.currentWaveIndex = 0;
        this.waveStartTime = 0;
        this.hordeActive = false;
        this.hordeEndTime = 0;
        this.lastHordeSpawn = 0;
        this.waveEvents = [];
        this.processedEvents = new Set();
    }

    startWave(waveIndex) {
        if (waveIndex >= GAME_CONFIG.WAVES.length) {
            return false; // No more waves
        }

        this.currentWaveIndex = waveIndex;
        this.waveStartTime = Date.now();
        this.processedEvents.clear();
        this.hordeActive = false;
        
        const wave = GAME_CONFIG.WAVES[waveIndex];
        this.waveEvents = [...wave.timeline];
        
        console.log(`🌊 Wave Manager: Starting wave ${waveIndex + 1}`);
        console.log(`📋 Timeline events: ${this.waveEvents.length}`);
        
        return true;
    }

    update() {
        if (this.waveEvents.length === 0) return;

        const now = Date.now();
        const waveElapsed = now - this.waveStartTime;

        // Process timeline events
        this.waveEvents.forEach((event, index) => {
            const eventId = `${this.currentWaveIndex}-${index}`;
            
            if (!this.processedEvents.has(eventId) && waveElapsed >= event.time) {
                this.processEvent(event);
                this.processedEvents.add(eventId);
            }
        });

        // Handle horde spawning
        if (this.hordeActive && now >= this.lastHordeSpawn + this.hordeSpawnRate) {
            this.spawnHordeZombie();
            this.lastHordeSpawn = now;
        }

        // Check if horde should end
        if (this.hordeActive && now >= this.hordeEndTime) {
            this.hordeActive = false;
            console.log('🌊 Horde event ended');
        }
    }

    processEvent(event) {
        console.log(`🎯 Processing wave event: ${event.event}`);
        console.log(`🎯 Event data:`, JSON.stringify(event, null, 2));
        
        switch (event.event) {
            case 'spawn':
                console.log(`🎯 Calling spawnZombies with:`, event.zombies);
                this.spawnZombies(event.zombies);
                break;
                
            case 'horde_start':
                this.startHorde(event.duration, event.spawnRate);
                break;
                
            case 'message':
                this.gameEngine.broadcastMessage(event.text);
                break;
        }
    }

    spawnZombies(zombieGroups) {
        console.log(`🧟 spawnZombies called with ${zombieGroups.length} groups`);
        zombieGroups.forEach((group, index) => {
            console.log(`  Group ${index}: ${group.count}x ${group.type} in lanes ${group.lanes}`);
            for (let i = 0; i < group.count; i++) {
                const lane = this.selectLane(group.lanes);
                console.log(`    Spawning ${group.type} in lane ${lane}`);
                this.gameEngine.spawnZombie(this.gameState, group.type, lane);
            }
        });
    }

    startHorde(duration, spawnRate) {
        this.hordeActive = true;
        this.hordeEndTime = Date.now() + duration;
        this.hordeSpawnRate = spawnRate;
        this.lastHordeSpawn = Date.now();
        
        console.log(`🔥 Horde started! Duration: ${duration}ms, Spawn rate: ${spawnRate}ms`);
    }

    spawnHordeZombie() {
        const wave = GAME_CONFIG.WAVES[this.currentWaveIndex];
        const zombieType = this.selectRandomZombieFromPool(wave.zombiePool);
        const lane = this.selectLane('random');
        
        this.gameEngine.spawnZombie(this.gameState, zombieType, lane);
    }

    selectLane(laneSpec) {
        const totalLanes = GAME_CONFIG.BOARD.ROWS;
        
        switch (laneSpec) {
            case 'random':
                return Math.floor(Math.random() * totalLanes);
            case 'center':
                return Math.floor(totalLanes / 2);
            case 'top':
                return 0;
            case 'bottom':
                return totalLanes - 1;
            case 'outer':
                // Return either top or bottom lane
                return Math.random() < 0.5 ? 0 : totalLanes - 1;
            case 'all':
                // Return a random lane (same as random, but semantically different)
                return Math.floor(Math.random() * totalLanes);
            default:
                if (Array.isArray(laneSpec)) {
                    return laneSpec[Math.floor(Math.random() * laneSpec.length)];
                }
                return Math.floor(Math.random() * totalLanes);
        }
    }

    selectRandomZombieFromPool(pool) {
        return pool[Math.floor(Math.random() * pool.length)];
    }

    isWaveComplete() {
        const wave = GAME_CONFIG.WAVES[this.currentWaveIndex];
        const waveElapsed = Date.now() - this.waveStartTime;
        
        // Wave is complete if duration has passed AND no zombies remain
        return waveElapsed >= wave.duration && this.gameState.zombies.length === 0;
    }

    getCurrentWave() {
        return GAME_CONFIG.WAVES[this.currentWaveIndex];
    }
}

class PlantsVsZombiesEngine {
    constructor(redisClient) {
        this.redis = redisClient;
        this.games = new Map(); // In-memory game instances for active processing
        this.gameLoops = new Map(); // Store game loop intervals
        this.waveManagers = new Map(); // Wave managers for each game
        
        // Game configuration
        this.PLANTS = GAME_CONFIG.PLANTS;
        this.ZOMBIES = GAME_CONFIG.ZOMBIES;
        this.WAVES = GAME_CONFIG.WAVES;
        this.BOARD = GAME_CONFIG.BOARD;
        this.GAMEPLAY = GAME_CONFIG.GAMEPLAY;
        this.POWERUPS = GAME_CONFIG.POWERUPS;
        this.SCORING = GAME_CONFIG.SCORING;
        this.WAVE_SYSTEM = GAME_CONFIG.WAVE_SYSTEM;
    }

    // ==========================================
    // GAME LIFECYCLE MANAGEMENT
    // ==========================================

    async reloadActiveGames() {
        console.log('🔄 Reloading active games from Redis...');
        
        try {
            const activeGameIds = await this.redis.client.sMembers('active_games');
            console.log(`Found ${activeGameIds.length} active games`);
            
            for (const gameId of activeGameIds) {
                const gameInfo = await this.redis.client.hGetAll(`game:${gameId}:info`);
                
                if (gameInfo.status === 'playing') {
                    const gameState = await this.redis.getGameState(gameId);
                    
                    if (gameState) {
                        console.log(`🔄 Reloading game ${gameId}`);
                        
                        // Add to in-memory games
                        this.games.set(gameId, gameState);
                        
                        // Create wave manager if wave is in progress
                        if (gameState.waveInProgress && gameState.currentWave > 0) {
                            const waveManager = new WaveManager(this, gameState);
                            waveManager.startWave(gameState.currentWave - 1);
                            this.waveManagers.set(gameId, waveManager);
                            console.log(`🌊 Restarted wave ${gameState.currentWave} for game ${gameId}`);
                        }
                        
                        // Start game loop
                        if (!this.gameLoops.has(gameId)) {
                            const interval = setInterval(async () => {
                                try {
                                    await this.updateGame(gameId);
                                } catch (error) {
                                    console.error(`Game loop error for ${gameId}:`, error);
                                }
                            }, 1000 / this.GAMEPLAY.GAME_SPEED);
                            
                            this.gameLoops.set(gameId, interval);
                            console.log(`🔄 Started game loop for ${gameId}`);
                        }
                        
                        console.log(`✅ Successfully reloaded game ${gameId} (${gameState.zombies.length} zombies, wave ${gameState.currentWave})`);
                    }
                }
            }
            
            console.log('🎉 Active games reloading complete!');
        } catch (error) {
            console.error('❌ Error reloading active games:', error);
        }
    }

    // ==========================================
    // GAME LIFECYCLE MANAGEMENT
    // ==========================================

    async createGame(hostPlayerId, gameMode = 'cooperative') {
        const gameId = uuidv4();
        
        const gameState = {
            id: gameId,
            mode: gameMode,
            status: 'waiting', // waiting, playing, paused, ended
            createdAt: Date.now(),
            lastUpdate: Date.now(),
            
            // Players
            players: {
                [hostPlayerId]: {
                    id: hostPlayerId,
                    isHost: true,
                    sun: this.GAMEPLAY.INITIAL_SUN,
                    score: 0,
                    plantsPlaced: 0,
                    zombiesKilled: 0,
                    powerups: {},
                    achievements: []
                }
            },
            
            // Game Board (5 rows x 9 columns)
            board: this.initializeBoard(),
            
            // Game Entities
            plants: [],
            zombies: [],
            projectiles: [],
            lawnMowers: this.initializeLawnMowers(),
            
            // Wave Management
            currentWave: 0,
            waveInProgress: false,
            waveStartTime: 0,
            nextWaveTime: 0,
            
            // Game Mechanics
            sunFallTimer: Date.now() + this.GAMEPLAY.SUN_FALL_INTERVAL,
            gameSpeed: 1.0,
            
            // Effects and Powerups
            activeEffects: [],
            
            // Statistics
            stats: {
                gameStartTime: Date.now(),
                totalZombiesSpawned: 0,
                totalPlantsPlaced: 0,
                totalSunCollected: 0
            }
        };

        // Store in memory and Redis
        this.games.set(gameId, gameState);
        await this.redis.saveGameState(gameId, gameState);
        await this.redis.addActiveGame(gameId, {
            mode: gameMode,
            host: hostPlayerId,
            players: 1,
            status: 'waiting',
            createdAt: Date.now()
        });
        await this.redis.addPlayerToGame(gameId, hostPlayerId);

        console.log(`🎮 Created Plants vs Zombies game: ${gameId}`);
        return gameState;
    }

    async joinGame(gameId, playerId) {
        let gameState = this.games.get(gameId);
        
        if (!gameState) {
            gameState = await this.redis.getGameState(gameId);
            if (!gameState) {
                throw new Error('Game not found');
            }
            this.games.set(gameId, gameState);
        }

        if (gameState.status !== 'waiting') {
            throw new Error('Game already in progress');
        }

        if (Object.keys(gameState.players).length >= GAME_CONFIG.MULTIPLAYER.MAX_PLAYERS_PER_GAME) {
            throw new Error('Game is full');
        }

        // Add player to game
        gameState.players[playerId] = {
            id: playerId,
            isHost: false,
            sun: this.GAMEPLAY.INITIAL_SUN,
            score: 0,
            plantsPlaced: 0,
            zombiesKilled: 0,
            powerups: {},
            achievements: []
        };

        await this.redis.saveGameState(gameId, gameState);
        await this.redis.addPlayerToGame(gameId, playerId);
        
        // Notify other players
        await this.redis.publishGameUpdate(gameId, 'player_joined', {
            playerId: playerId,
            players: gameState.players
        });

        console.log(`👤 ${playerId} joined game: ${gameId}`);
        return gameState;
    }

    async startGame(gameId, playerId) {
        const gameState = this.games.get(gameId);
        if (!gameState) {
            throw new Error('Game not found');
        }

        const player = gameState.players[playerId];
        if (!player || !player.isHost) {
            throw new Error('Only the host can start the game');
        }

        if (gameState.status !== 'waiting') {
            throw new Error('Game already started');
        }

        // Start the game
        gameState.status = 'playing';
        gameState.stats.gameStartTime = Date.now();
        gameState.nextWaveTime = Date.now() + this.WAVE_SYSTEM.FIRST_WAVE_DELAY;

        // Initialize Wave Manager for this game
        const waveManager = new WaveManager(this, gameState);
        this.waveManagers.set(gameId, waveManager);

        await this.redis.saveGameState(gameId, gameState);
        
        // Start game loop
        this.startGameLoop(gameId);
        
        // Notify players
        await this.redis.publishGameUpdate(gameId, 'game_started', {
            gameState: gameState,
            message: 'The zombies are coming! Prepare your defenses!'
        });

        console.log(`🚀 Game started: ${gameId}`);
        return gameState;
    }

    // ==========================================
    // BOARD INITIALIZATION
    // ==========================================

    initializeBoard() {
        const board = [];
        for (let row = 0; row < this.BOARD.ROWS; row++) {
            board[row] = [];
            for (let col = 0; col < this.BOARD.COLS; col++) {
                board[row][col] = {
                    row: row,
                    col: col,
                    plant: null,
                    zombie: null,
                    canPlant: col > 0 // Can't plant in lawn mower column
                };
            }
        }
        return board;
    }

    initializeLawnMowers() {
        const lawnMowers = [];
        for (let row = 0; row < this.BOARD.ROWS; row++) {
            lawnMowers.push({
                id: uuidv4(),
                row: row,
                col: 0,
                active: true,
                triggered: false
            });
        }
        return lawnMowers;
    }

    // ==========================================
    // PLANT MANAGEMENT
    // ==========================================

    async placePlant(gameId, playerId, plantType, row, col) {
        const gameState = this.games.get(gameId);
        if (!gameState || gameState.status !== 'playing') {
            throw new Error('Invalid game state');
        }

        const player = gameState.players[playerId];
        if (!player) {
            throw new Error('Player not found');
        }

        const plantData = this.PLANTS[plantType];
        if (!plantData) {
            throw new Error('Invalid plant type');
        }

        // Validate position
        if (row < 0 || row >= this.BOARD.ROWS || col < 1 || col >= this.BOARD.COLS) {
            throw new Error('Invalid position');
        }

        if (gameState.board[row][col].plant) {
            throw new Error('Position already occupied');
        }

        // Check if player has enough sun
        if (player.sun < plantData.cost) {
            throw new Error('Not enough sun');
        }

        // Create plant
        const plant = {
            id: uuidv4(),
            type: plantType,
            row: row,
            col: col,
            ownerId: playerId,
            health: plantData.health,
            maxHealth: plantData.health,
            lastShot: 0,
            lastSunProduction: Date.now(),
            plantedAt: Date.now(),
            ...plantData
        };

        // Place plant
        gameState.board[row][col].plant = plant;
        gameState.plants.push(plant);
        player.sun -= plantData.cost;
        player.plantsPlaced++;
        gameState.stats.totalPlantsPlaced++;

        await this.redis.saveGameState(gameId, gameState);
        
        // Immediately broadcast game update with the new plant
        await this.redis.publishGameUpdate(gameId, 'game_update', {
            plants: gameState.plants,
            zombies: gameState.zombies,
            projectiles: gameState.projectiles,
            players: gameState.players,
            currentWave: gameState.currentWave,
            waveInProgress: gameState.waveInProgress,
            board: gameState.board,
            lawnMowers: gameState.lawnMowers,
            activeEffects: gameState.activeEffects
        });
        
        // Publish plant placement event
        await this.redis.publishGameUpdate(gameId, 'plant_placed', {
            plant: plant,
            playerId: playerId,
            remainingSun: player.sun,
            board: gameState.board
        });

        return {
            plant: plant,
            cost: plantData.cost,
            remainingSun: player.sun
        };
    }

    // ==========================================
    // GAME LOOP AND UPDATES
    // ==========================================

    startGameLoop(gameId) {
        if (this.gameLoops.has(gameId)) {
            return; // Already running
        }

        const interval = setInterval(async () => {
            try {
                await this.updateGame(gameId);
            } catch (error) {
                console.error(`Game loop error for ${gameId}:`, error);
                this.stopGameLoop(gameId);
            }
        }, 1000 / this.GAMEPLAY.GAME_SPEED); // 60 FPS

        this.gameLoops.set(gameId, interval);
        console.log(`🔄 Started game loop for ${gameId}`);
    }

    stopGameLoop(gameId) {
        const interval = this.gameLoops.get(gameId);
        if (interval) {
            clearInterval(interval);
            this.gameLoops.delete(gameId);
            console.log(`⏹️ Stopped game loop for ${gameId}`);
        }
    }

    async updateGame(gameId) {
        let gameState = this.games.get(gameId);
        
        // If game is not in memory, try to reload it from Redis
        if (!gameState) {
            gameState = await this.redis.getGameState(gameId);
            if (gameState && gameState.status === 'playing') {
                console.log(`🔄 Reloading game ${gameId} into memory`);
                this.games.set(gameId, gameState);
                
                // Recreate wave manager if wave is in progress
                if (gameState.waveInProgress && gameState.currentWave > 0) {
                    const waveManager = new WaveManager(this, gameState);
                    waveManager.startWave(gameState.currentWave - 1);
                    this.waveManagers.set(gameId, waveManager);
                }
            }
        }
        
        if (!gameState || gameState.status !== 'playing') {
            return;
        }

        const now = Date.now();
        let hasUpdates = false;

        // Sun falling mechanic
        if (now >= gameState.sunFallTimer) {
            this.spawnSun(gameState);
            gameState.sunFallTimer = now + this.GAMEPLAY.SUN_FALL_INTERVAL;
            hasUpdates = true;
        }

        // Wave management with Wave Manager
        const waveManager = this.waveManagers.get(gameId);
        if (waveManager) {
            if (!gameState.waveInProgress && now >= gameState.nextWaveTime) {
                if (gameState.currentWave < this.WAVES.length) {
                    const waveStarted = waveManager.startWave(gameState.currentWave);
                    if (waveStarted) {
                        gameState.waveInProgress = true;
                        await this.publishWaveStarted(gameId, gameState.currentWave);
                        hasUpdates = true;
                    }
                }
            }
            
            // Update wave manager
            if (gameState.waveInProgress) {
                waveManager.update();
                
                // Check if wave is complete
                if (waveManager.isWaveComplete()) {
                    gameState.waveInProgress = false;
                    gameState.currentWave++;
                    gameState.nextWaveTime = now + this.WAVE_SYSTEM.PREPARATION_TIME;
                    
                    await this.redis.publishGameUpdate(gameId, 'wave_completed', {
                        completedWave: gameState.currentWave - 1,
                        nextWaveIn: this.WAVE_SYSTEM.PREPARATION_TIME / 1000,
                        message: `Wave ${gameState.currentWave - 1} completed! Next wave in ${this.WAVE_SYSTEM.PREPARATION_TIME / 1000} seconds...`
                    });
                }
            }
        }

        // Update plants
        this.updatePlants(gameState, now);

        // Update zombies
        this.updateZombies(gameState, now);

        // Update projectiles
        this.updateProjectiles(gameState, now);

        // Check collisions
        this.checkCollisions(gameState);

        // Update effects
        this.updateEffects(gameState, now);

        // Clean up dead entities
        this.cleanupEntities(gameState);

        // Check win/lose conditions
        this.checkGameEnd(gameState);

        // Save and broadcast updates
        if (hasUpdates || gameState.plants.length > 0 || gameState.zombies.length > 0 || gameState.projectiles.length > 0) {
            gameState.lastUpdate = now;
            await this.redis.saveGameState(gameId, gameState);
            
            await this.redis.publishGameUpdate(gameId, 'game_update', {
                plants: gameState.plants,
                zombies: gameState.zombies,
                projectiles: gameState.projectiles,
                players: gameState.players,
                currentWave: gameState.currentWave,
                waveInProgress: gameState.waveInProgress,
                board: gameState.board,
                lawnMowers: gameState.lawnMowers,
                activeEffects: gameState.activeEffects
            });
        }
    }

    // ==========================================
    // WAVE MANAGER INTEGRATION
    // ==========================================

    spawnZombie(gameState, zombieType, row) {
        const zombieData = this.ZOMBIES[zombieType];
        if (!zombieData) return;

        const col = this.BOARD.COLS - 1; // Spawn at rightmost column

        const zombie = {
            id: uuidv4(),
            type: zombieType,
            row: row,
            col: col,
            x: col,
            y: row,
            health: zombieData.health,
            maxHealth: zombieData.health,
            speed: zombieData.speed,
            damage: zombieData.damage,
            lastAttack: 0,
            attackRate: zombieData.attackRate,
            points: zombieData.points,
            effects: [],
            spawnedAt: Date.now(),
            ...zombieData
        };

        gameState.zombies.push(zombie);
        gameState.stats.totalZombiesSpawned++;

        // Add to lane tracking
        this.redis.addZombieToLane(gameState.id, row, zombie);
        
        console.log(`🧟 Spawned ${zombieType} in lane ${row}`);
    }

    async publishWaveStarted(gameId, waveIndex) {
        const wave = this.WAVES[waveIndex];
        
        await this.redis.publishGameUpdate(gameId, 'wave_started', {
            waveNumber: waveIndex + 1,
            message: wave.message,
            isBossWave: wave.isBossWave || false,
            isFinalWave: wave.isFinalWave || false
        });
        
        console.log(`🌊 Published wave started: ${waveIndex + 1}`);
    }

    broadcastMessage(gameId, message) {
        this.redis.publishGameUpdate(gameId, 'game_message', {
            message: message,
            timestamp: Date.now()
        });
    }

    // ==========================================
    // WAVE MANAGEMENT
    // ==========================================

    async startWave(gameState) {
        if (gameState.currentWave >= this.WAVES.length) {
            return; // No more waves
        }

        const wave = this.WAVES[gameState.currentWave];
        gameState.waveInProgress = true;
        gameState.waveStartTime = Date.now();

        console.log(`🌊 Starting wave ${gameState.currentWave + 1}: ${wave.message}`);

        // Spawn zombies according to wave pattern
        for (const zombieGroup of wave.zombies) {
            setTimeout(() => {
                this.spawnZombieGroup(gameState, zombieGroup);
            }, zombieGroup.delay);
        }

        // Notify players
        await this.redis.publishGameUpdate(gameState.id, 'wave_started', {
            waveNumber: gameState.currentWave + 1,
            message: wave.message,
            isBossWave: wave.isBossWave || false,
            isFinalWave: wave.isFinalWave || false
        });

        gameState.currentWave++;
    }

    spawnZombieGroup(gameState, zombieGroup) {
        const zombieData = this.ZOMBIES[zombieGroup.type];
        if (!zombieData) return;

        for (let i = 0; i < zombieGroup.count; i++) {
            setTimeout(() => {
                const row = Math.floor(Math.random() * this.BOARD.ROWS);
                this.spawnZombie(gameState, zombieGroup.type, row);
            }, i * 1000); // 1 second between each zombie
        }
    }

    // ==========================================
    // ENTITY UPDATES
    // ==========================================

    updatePlants(gameState, now) {
        gameState.plants.forEach(plant => {
            // Sun production for sunflowers
            if (plant.type === '🌻' && plant.sunProduction) {
                if (now - plant.lastSunProduction >= plant.sunInterval) {
                    // Find plant owner and give them sun
                    const owner = gameState.players[plant.ownerId];
                    if (owner) {
                        owner.sun += plant.sunProduction;
                        gameState.stats.totalSunCollected += plant.sunProduction;
                    }
                    plant.lastSunProduction = now;
                }
            }

            // Plant shooting logic
            if (plant.damage && now - plant.lastShot >= plant.fireRate) {
                const target = this.findZombieTarget(gameState, plant);
                if (target) {
                    this.plantShoot(gameState, plant, target);
                    plant.lastShot = now;
                }
            }

            // Special plant abilities
            this.updatePlantSpecialAbilities(gameState, plant, now);
        });
    }

    updateZombies(gameState, now) {
        // Calculate delta time for smooth movement
        const deltaTime = gameState.lastUpdate ? (now - gameState.lastUpdate) / 1000 : 0.016;
        
        gameState.zombies.forEach(zombie => {
            if (zombie.health <= 0) return;

            // Move zombie
            const plant = gameState.board[zombie.row][Math.floor(zombie.x)].plant;
            
            if (plant && Math.abs(zombie.x - plant.col) < 0.5) {
                // Attack plant
                if (now - zombie.lastAttack >= zombie.attackRate) {
                    plant.health -= zombie.damage;
                    zombie.lastAttack = now;
                    
                    if (plant.health <= 0) {
                        this.removePlant(gameState, plant);
                    }
                }
            } else {
                // Move towards house using GLACIAL PACE speeds based on zombie type
                // Base speed: 0.1 pixels/second - ultra slow reference
                let zombieSpeed;
                
                switch (zombie.type) {
                    case '🧟': // Basic Zombie - baseline
                        zombieSpeed = 0.1; // Standard glacial pace
                        break;
                    case '🧟‍♂️': // Conehead - slower due to cone weight
                        zombieSpeed = 0.08; // 20% slower than basic
                        break;
                    case '🧟‍♀️': // Buckethead - very slow due to heavy bucket
                        zombieSpeed = 0.05; // 50% slower than basic
                        break;
                    case '🏃‍♂️': // Runner - "fast" but still glacial
                        zombieSpeed = 0.2; // 2x basic (still super slow!)
                        break;
                    case '🦘': // Pole Vaulter - slightly faster
                        zombieSpeed = 0.15; // 1.5x basic
                        break;
                    case '🎈': // Balloon - floats slowly
                        zombieSpeed = 0.12; // Slightly faster than basic
                        break;
                    case '👑': // Boss - intimidating but slow
                        zombieSpeed = 0.06; // Slower due to massive size
                        break;
                    default:
                        zombieSpeed = 0.1; // Default to basic zombie speed
                }
                
                const oldX = zombie.x;
                zombie.x -= zombieSpeed * deltaTime;
                
                // Debug: Log speed override (only occasionally to avoid spam)
                if (Math.random() < 0.001) { // 0.1% chance to log
                    console.log(`🧊 ${zombie.type} at glacial pace: ${oldX.toFixed(3)} → ${zombie.x.toFixed(3)} (speed: ${zombieSpeed} px/s, type: ${zombie.name || zombie.type})`);
                }
                zombie.col = Math.floor(zombie.x);
                
                // Check if zombie reached the house
                if (zombie.x <= 0) {
                    this.triggerLawnMower(gameState, zombie.row);
                    zombie.health = 0; // Remove zombie
                }
            }

            // Update zombie effects (slow, etc.)
            this.updateZombieEffects(zombie, now);
        });
    }

    updateProjectiles(gameState, now) {
        gameState.projectiles.forEach(projectile => {
            // Move projectile
            projectile.x += projectile.speed * 0.016;
            
            // Remove if off screen
            if (projectile.x > this.BOARD.COLS) {
                projectile.remove = true;
            }
        });
    }

    // ==========================================
    // COMBAT SYSTEM
    // ==========================================

    findZombieTarget(gameState, plant) {
        // Find zombies in the same row
        const zombiesInRow = gameState.zombies.filter(zombie => 
            zombie.row === plant.row && 
            zombie.health > 0 && 
            zombie.col >= plant.col &&
            zombie.col <= plant.col + (plant.range || 10)
        );

        // Return closest zombie
        return zombiesInRow.reduce((closest, zombie) => {
            if (!closest || zombie.col < closest.col) {
                return zombie;
            }
            return closest;
        }, null);
    }

    plantShoot(gameState, plant, target) {
        const projectile = {
            id: uuidv4(),
            type: plant.type,
            x: plant.col,
            y: plant.row,
            targetX: target.col,
            targetY: target.row,
            speed: plant.projectileSpeed || 5,
            damage: plant.damage,
            effects: [],
            createdAt: Date.now()
        };

        // Add special effects based on plant type
        if (plant.type === '❄️') {
            projectile.effects.push({
                type: 'slow',
                strength: plant.slowEffect,
                duration: plant.slowDuration
            });
        }

        gameState.projectiles.push(projectile);
    }

    checkCollisions(gameState) {
        gameState.projectiles.forEach(projectile => {
            if (projectile.remove) return;

            // Check collision with zombies
            const hitZombie = gameState.zombies.find(zombie => 
                zombie.health > 0 &&
                Math.abs(zombie.x - projectile.x) < 0.5 &&
                zombie.row === Math.floor(projectile.y)
            );

            if (hitZombie) {
                // Deal damage
                hitZombie.health -= projectile.damage;
                
                // Apply effects
                projectile.effects.forEach(effect => {
                    this.applyEffectToZombie(hitZombie, effect);
                });

                // Remove projectile
                projectile.remove = true;

                // Check if zombie died
                if (hitZombie.health <= 0) {
                    this.killZombie(gameState, hitZombie);
                }
            }
        });
    }

    killZombie(gameState, zombie) {
        // Award points to all players
        Object.values(gameState.players).forEach(player => {
            player.score += zombie.points;
            player.zombiesKilled++;
        });

        // Update global stats
        this.redis.incrementCounter('zombies_killed');
        
        // Remove from lane tracking
        this.redis.removeZombieFromLane(gameState.id, zombie.row, zombie.id);
        
        zombie.health = 0;
    }

    // ==========================================
    // POWER-UPS AND SPECIAL ABILITIES
    // ==========================================

    async usePowerup(gameId, playerId, powerupType) {
        const gameState = this.games.get(gameId);
        if (!gameState || gameState.status !== 'playing') {
            throw new Error('Invalid game state');
        }

        const player = gameState.players[playerId];
        if (!player) {
            throw new Error('Player not found');
        }

        const powerupData = this.POWERUPS[powerupType];
        if (!powerupData) {
            throw new Error('Invalid powerup type');
        }

        // Check cooldown
        const lastUsed = player.powerups[powerupType] || 0;
        if (Date.now() - lastUsed < powerupData.cooldown) {
            throw new Error('Powerup on cooldown');
        }

        // Apply powerup effect
        this.applyPowerupEffect(gameState, playerId, powerupData);
        
        // Update cooldown
        player.powerups[powerupType] = Date.now();

        await this.redis.saveGameState(gameId, gameState);
        
        return {
            powerupType: powerupType,
            effect: powerupData.effect,
            duration: powerupData.duration
        };
    }

    applyPowerupEffect(gameState, playerId, powerupData) {
        const player = gameState.players[playerId];
        
        switch (powerupData.effect) {
            case 'sun':
                player.sun += powerupData.amount;
                break;
                
            case 'speed':
                gameState.activeEffects.push({
                    type: 'speed_boost',
                    playerId: playerId,
                    multiplier: powerupData.multiplier,
                    endTime: Date.now() + powerupData.duration
                });
                break;
                
            case 'shield':
                gameState.activeEffects.push({
                    type: 'plant_shield',
                    playerId: playerId,
                    multiplier: powerupData.multiplier,
                    endTime: Date.now() + powerupData.duration
                });
                break;
                
            case 'damage':
                gameState.activeEffects.push({
                    type: 'damage_boost',
                    playerId: playerId,
                    multiplier: powerupData.multiplier,
                    endTime: Date.now() + powerupData.duration
                });
                break;
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    spawnSun(gameState) {
        // Add sun to all players
        Object.values(gameState.players).forEach(player => {
            player.sun += this.GAMEPLAY.SUN_FALL_AMOUNT;
            gameState.stats.totalSunCollected += this.GAMEPLAY.SUN_FALL_AMOUNT;
        });
    }

    removePlant(gameState, plant) {
        // Remove from board
        gameState.board[plant.row][plant.col].plant = null;
        
        // Remove from plants array
        const index = gameState.plants.findIndex(p => p.id === plant.id);
        if (index !== -1) {
            gameState.plants.splice(index, 1);
        }
    }

    triggerLawnMower(gameState, row) {
        const lawnMower = gameState.lawnMowers[row];
        if (lawnMower && lawnMower.active && !lawnMower.triggered) {
            lawnMower.triggered = true;
            
            // Kill all zombies in this row
            gameState.zombies.forEach(zombie => {
                if (zombie.row === row && zombie.health > 0) {
                    this.killZombie(gameState, zombie);
                }
            });
            
            console.log(`🚜 Lawn mower activated in row ${row}`);
        }
    }

    cleanupEntities(gameState) {
        // Remove dead zombies
        gameState.zombies = gameState.zombies.filter(zombie => zombie.health > 0);
        
        // Remove expired projectiles
        gameState.projectiles = gameState.projectiles.filter(projectile => !projectile.remove);
        
        // Remove expired effects
        const now = Date.now();
        gameState.activeEffects = gameState.activeEffects.filter(effect => effect.endTime > now);
    }

    updateEffects(gameState, now) {
        // Update active effects
        gameState.activeEffects.forEach(effect => {
            if (effect.endTime <= now) {
                effect.expired = true;
            }
        });
    }

    updatePlantSpecialAbilities(gameState, plant, now) {
        // Cherry bomb explosion
        if (plant.type === '🍒' && now - plant.plantedAt >= plant.fuseTime) {
            this.explodeCherryBomb(gameState, plant);
        }
        
        // Jalapeno lane clear
        if (plant.type === '🌶️' && now - plant.plantedAt >= plant.fuseTime) {
            this.explodeJalapeno(gameState, plant);
        }
    }

    explodeCherryBomb(gameState, plant) {
        // Damage all zombies in 3x3 area
        const explosionRadius = plant.explosionRadius;
        
        gameState.zombies.forEach(zombie => {
            const distance = Math.sqrt(
                Math.pow(zombie.col - plant.col, 2) + 
                Math.pow(zombie.row - plant.row, 2)
            );
            
            if (distance <= explosionRadius) {
                zombie.health -= plant.damage;
                if (zombie.health <= 0) {
                    this.killZombie(gameState, zombie);
                }
            }
        });
        
        // Remove cherry bomb
        this.removePlant(gameState, plant);
    }

    explodeJalapeno(gameState, plant) {
        // Damage all zombies in the same row
        gameState.zombies.forEach(zombie => {
            if (zombie.row === plant.row) {
                zombie.health -= plant.damage;
                if (zombie.health <= 0) {
                    this.killZombie(gameState, zombie);
                }
            }
        });
        
        // Remove jalapeno
        this.removePlant(gameState, plant);
    }

    updateZombieEffects(zombie, now) {
        zombie.effects = zombie.effects.filter(effect => {
            if (effect.endTime <= now) {
                // Remove expired effect
                return false;
            }
            
            // Apply ongoing effects
            if (effect.type === 'slow') {
                zombie.speed *= effect.strength;
            }
            
            return true;
        });
    }

    applyEffectToZombie(zombie, effect) {
        zombie.effects.push({
            type: effect.type,
            strength: effect.strength,
            endTime: Date.now() + effect.duration
        });
    }

    checkGameEnd(gameState) {
        // Check if all waves completed and no zombies left
        if (gameState.currentWave >= this.WAVES.length && 
            gameState.zombies.length === 0 && 
            !gameState.waveInProgress) {
            
            this.endGame(gameState, 'victory');
            return;
        }
        
        // Check if all lawn mowers used
        const activeLawnMowers = gameState.lawnMowers.filter(mower => mower.active && !mower.triggered);
        if (activeLawnMowers.length === 0) {
            this.endGame(gameState, 'defeat');
            return;
        }
    }

    async endGame(gameState, result) {
        gameState.status = 'ended';
        gameState.result = result;
        gameState.endTime = Date.now();
        
        // Calculate final scores and update leaderboards
        for (const [playerId, player] of Object.entries(gameState.players)) {
            const finalScore = this.calculateFinalScore(gameState, player);
            player.finalScore = finalScore;
            
            await this.redis.updateLeaderboard('high_scores', playerId, finalScore, playerId);
            await this.redis.updateLeaderboard('zombies_killed', playerId, player.zombiesKilled, playerId);
        }
        
        // Stop game loop
        this.stopGameLoop(gameState.id);
        
        // Remove from active games
        await this.redis.removeActiveGame(gameState.id);
        
        // Notify players
        await this.redis.publishGameUpdate(gameState.id, 'game_ended', {
            result: result,
            finalScores: Object.values(gameState.players).map(p => ({
                playerId: p.id,
                score: p.finalScore,
                zombiesKilled: p.zombiesKilled,
                plantsPlaced: p.plantsPlaced
            })),
            gameStats: gameState.stats
        });
        
        console.log(`🏁 Game ${gameState.id} ended with result: ${result}`);
    }

    calculateFinalScore(gameState, player) {
        let score = player.score;
        
        // Bonus for surviving
        const survivalTime = (gameState.endTime - gameState.stats.gameStartTime) / 1000;
        score += survivalTime * this.SCORING.SURVIVAL_BONUS_PER_SECOND;
        
        // Bonus for efficiency
        score += player.plantsPlaced * this.SCORING.PLANT_EFFICIENCY_BONUS;
        
        // Multiplayer bonus
        const playerCount = Object.keys(gameState.players).length;
        if (playerCount > 1) {
            score *= this.SCORING.MULTIPLAYER_BONUS;
        }
        
        return Math.floor(score);
    }

    async removePlayer(gameId, playerId) {
        const gameState = this.games.get(gameId);
        if (!gameState) return;
        
        delete gameState.players[playerId];
        
        // If no players left, end game
        if (Object.keys(gameState.players).length === 0) {
            this.stopGameLoop(gameId);
            this.games.delete(gameId);
            await this.redis.removeActiveGame(gameId);
        } else {
            await this.redis.saveGameState(gameId, gameState);
        }
    }
}

module.exports = PlantsVsZombiesEngine;
module.exports.WaveManager = WaveManager;
