/**
 * Plants vs Zombies - Redis Edition
 * Game Client JavaScript
 */

class PlantsVsZombiesClient {
    constructor() {
        this.socket = null;
        this.gameState = null;
        this.playerId = null;
        this.gameId = null;
        this.selectedPlant = null;
        this.plantCooldowns = new Map();
        this.powerupCooldowns = new Map();
        this.isConnected = false;
        this.gameStarted = false;
        
        // DOM elements
        this.elements = {
            loginScreen: document.getElementById('loginScreen'),
            gameContainer: document.getElementById('gameContainer'),
            gameBoard: document.getElementById('gameBoard'),
            loadingScreen: document.getElementById('loadingScreen'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            leaderboardModal: document.getElementById('leaderboardModal'),
            notificationsContainer: document.getElementById('notifications'),
            chatContainer: document.querySelector('.chat-container'),
            chatMessages: document.getElementById('chatMessages'),
            chatInput: document.getElementById('chatInput')
        };
        
        // Game configuration
        this.config = {
            BOARD_ROWS: 5,
            BOARD_COLS: 9,
            CELL_SIZE: 80,
            ANIMATION_SPEED: 16 // ~60 FPS
        };
        
        this.init();
    }

    async init() {
        console.log('🌻 Initializing Plants vs Zombies client...');
        
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize socket connection
            await this.initializeSocket();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize game board
            this.initializeGameBoard();
            
            // Load initial stats
            await this.loadInitialStats();
            
            // Hide loading screen and show login
            this.hideLoadingScreen();
            this.showLoginScreen();
            
            console.log('✅ Client initialization complete');
            
        } catch (error) {
            console.error('❌ Client initialization failed:', error);
            this.showNotification('Failed to initialize game', 'error');
        }
    }

    // ==========================================
    // SOCKET CONNECTION
    // ==========================================

    async initializeSocket() {
        return new Promise((resolve, reject) => {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔌 Connected to server:', this.socket.id);
                this.isConnected = true;
                this.updateConnectionStatus(true);
                resolve();
            });
            
            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from server');
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.showNotification('Disconnected from server', 'error');
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('🔌 Connection error:', error);
                this.updateConnectionStatus(false);
                reject(error);
            });
            
            // Game event handlers
            this.setupSocketEventHandlers();
            
            // Timeout for connection
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    setupSocketEventHandlers() {
        // Game lifecycle events
        this.socket.on('game_joined', (data) => {
            console.log('🎮 Joined game:', data);
            this.handleGameJoined(data);
        });
        
        this.socket.on('game_started', (data) => {
            console.log('🚀 Game started:', data);
            this.handleGameStarted(data);
        });
        
        this.socket.on('game_update', (data) => {
            this.handleGameUpdate(data);
        });
        
        this.socket.on('game_ended', (data) => {
            console.log('🏁 Game ended:', data);
            this.handleGameEnded(data);
        });
        
        // Player events
        this.socket.on('player_joined', (data) => {
            console.log('👤 Player joined:', data);
            this.handlePlayerJoined(data);
        });
        
        // Plant events
        this.socket.on('plant_placed', (data) => {
            console.log('🌱 Plant placed:', data);
            this.handlePlantPlaced(data);
        });
        
        // Wave events
        this.socket.on('wave_started', (data) => {
            console.log('🌊 Wave started:', data);
            this.handleWaveStarted(data);
        });
        
        // Powerup events
        this.socket.on('powerup_used', (data) => {
            console.log('⚡ Powerup used:', data);
            this.handlePowerupUsed(data);
        });
        
        // Chat events
        this.socket.on('chat_message', (data) => {
            this.handleChatMessage(data);
        });
        
        // Error handling
        this.socket.on('error', (data) => {
            console.error('❌ Server error:', data);
            this.showNotification(data.message || 'Server error', 'error');
        });
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    setupEventListeners() {
        // Login form
        document.getElementById('joinGameBtn').addEventListener('click', () => {
            this.joinGame();
        });
        
        document.getElementById('playerNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinGame();
            }
        });
        
        // Game controls
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('pauseGameBtn').addEventListener('click', () => {
            this.pauseGame();
        });
        
        // Improved plant selection with drag support
        document.querySelectorAll('.plant-card').forEach(card => {
            // Click to select
            card.addEventListener('click', () => {
                this.selectPlant(card.dataset.plant, parseInt(card.dataset.cost));
            });
            
            // Drag start
            card.addEventListener('dragstart', (e) => {
                this.selectPlant(card.dataset.plant, parseInt(card.dataset.cost));
                e.dataTransfer.setData('text/plain', card.dataset.plant);
                card.classList.add('dragging');
            });
            
            // Drag end
            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
            });
            
            // Make cards draggable
            card.draggable = true;
        });
        
        // Powerup selection
        document.querySelectorAll('.powerup-card').forEach(card => {
            card.addEventListener('click', () => {
                this.usePowerup(card.dataset.powerup);
            });
        });
        
        // Chat system
        document.getElementById('sendChat').addEventListener('click', () => {
            this.sendChatMessage();
        });
        
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
        
        document.getElementById('toggleChat').addEventListener('click', () => {
            this.toggleChat();
        });
        
        // Game over actions
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.playAgain();
        });
        
        document.getElementById('viewLeaderboardBtn').addEventListener('click', () => {
            this.showLeaderboard();
        });
        
        // Leaderboard modal
        document.getElementById('closeLeaderboard').addEventListener('click', () => {
            this.hideLeaderboard();
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchLeaderboardTab(btn.dataset.category);
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Window events
        window.addEventListener('beforeunload', () => {
            if (this.socket && this.isConnected) {
                this.socket.disconnect();
            }
        });
    }

    // ==========================================
    // GAME BOARD INITIALIZATION
    // ==========================================

    initializeGameBoard() {
        const gameBoard = this.elements.gameBoard;
        gameBoard.innerHTML = '';
        
        // Create grid cells
        for (let row = 0; row < this.config.BOARD_ROWS; row++) {
            for (let col = 0; col < this.config.BOARD_COLS; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Add click handler for plant placement
                cell.addEventListener('click', () => {
                    this.handleCellClick(row, col);
                });
                
                // Add drag and drop support
                cell.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    this.handleCellHover(row, col, true);
                });
                
                cell.addEventListener('dragleave', (e) => {
                    this.handleCellHover(row, col, false);
                });
                
                cell.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const plantType = e.dataTransfer.getData('text/plain');
                    if (plantType && this.selectedPlant) {
                        this.placePlant(row, col);
                    }
                    this.handleCellHover(row, col, false);
                });
                
                // Add hover effects for plant placement preview
                cell.addEventListener('mouseenter', () => {
                    if (this.selectedPlant) {
                        this.handleCellHover(row, col, true);
                    }
                });
                
                cell.addEventListener('mouseleave', () => {
                    if (this.selectedPlant) {
                        this.handleCellHover(row, col, false);
                    }
                });
                
                gameBoard.appendChild(cell);
            }
        }
        
        console.log('🎯 Game board initialized');
    }

    // ==========================================
    // GAME ACTIONS
    // ==========================================

    async joinGame() {
        const playerName = document.getElementById('playerNameInput').value.trim();
        const gameId = document.getElementById('gameIdInput').value.trim();
        const gameMode = document.querySelector('input[name="gameMode"]:checked').value;
        
        if (!playerName) {
            this.showNotification('Please enter your name', 'warning');
            return;
        }
        
        if (playerName.length > 20) {
            this.showNotification('Name must be 20 characters or less', 'warning');
            return;
        }
        
        try {
            this.showLoadingScreen('Joining game...');
            
            this.socket.emit('join_game', {
                playerName: playerName,
                gameId: gameId || null,
                gameMode: gameMode
            });
            
        } catch (error) {
            console.error('Failed to join game:', error);
            this.showNotification('Failed to join game', 'error');
            this.hideLoadingScreen();
        }
    }

    startGame() {
        if (!this.gameId) {
            this.showNotification('No active game', 'error');
            return;
        }
        
        this.socket.emit('start_game');
        this.showNotification('Starting game...', 'info');
    }

    pauseGame() {
        // TODO: Implement pause functionality
        this.showNotification('Pause feature coming soon!', 'info');
    }

    selectPlant(plantType, cost) {
        // Check if plant is on cooldown
        if (this.plantCooldowns.has(plantType)) {
            this.showNotification('Plant is on cooldown', 'warning');
            return;
        }
        
        // Check if player has enough sun
        if (this.gameState && this.gameState.players[this.playerId]) {
            const playerSun = this.gameState.players[this.playerId].sun;
            if (playerSun < cost) {
                this.showNotification(`Need ${cost} sun (you have ${playerSun})`, 'warning');
                return;
            }
        }
        
        // Select plant
        this.selectedPlant = { type: plantType, cost: cost };
        
        // Update UI
        document.querySelectorAll('.plant-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.querySelector(`[data-plant="${plantType}"]`).classList.add('selected');
        
        this.showNotification(`Selected ${this.getPlantName(plantType)}`, 'info');
        
        // Update cursor or visual feedback
        this.updatePlantPlacementPreview();
    }

    placePlant(row, col) {
        if (!this.selectedPlant) {
            this.showNotification('Select a plant first', 'warning');
            return;
        }
        
        if (!this.gameStarted) {
            this.showNotification('Game not started yet', 'warning');
            return;
        }
        
        // Validate placement (can't place in first column - lawn mower area)
        if (col === 0) {
            this.showNotification('Cannot place plants in lawn mower area', 'warning');
            return;
        }
        
        this.socket.emit('place_plant', {
            plantType: this.selectedPlant.type,
            row: row,
            col: col
        });
        
        // Clear selection
        this.selectedPlant = null;
        document.querySelectorAll('.plant-card').forEach(card => {
            card.classList.remove('selected');
        });
    }

    usePowerup(powerupType) {
        // Check if powerup is on cooldown
        if (this.powerupCooldowns.has(powerupType)) {
            this.showNotification('Powerup is on cooldown', 'warning');
            return;
        }
        
        if (!this.gameStarted) {
            this.showNotification('Game not started yet', 'warning');
            return;
        }
        
        this.socket.emit('use_powerup', {
            powerupType: powerupType
        });
    }

    sendChatMessage() {
        const input = this.elements.chatInput;
        const message = input.value.trim();
        
        if (!message) return;
        
        if (message.length > 100) {
            this.showNotification('Message too long (max 100 characters)', 'warning');
            return;
        }
        
        this.socket.emit('chat_message', {
            message: message
        });
        
        input.value = '';
    }

    // ==========================================
    // EVENT HANDLERS
    // ==========================================

    handleGameJoined(data) {
        this.gameId = data.gameId;
        this.playerId = data.playerId;
        this.gameState = data.gameState;
        
        // Update UI
        document.getElementById('playerName').textContent = data.playerId;
        this.updateGameStats();
        this.updatePlayersList();
        
        // Hide login screen and show game
        this.hideLoginScreen();
        this.hideLoadingScreen();
        this.showGameContainer();
        
        this.showNotification(`Joined game: ${data.gameId}`, 'success');
    }

    handleGameStarted(data) {
        this.gameStarted = true;
        this.gameState = data.gameState;
        
        // Update UI
        document.getElementById('startGameBtn').style.display = 'none';
        document.getElementById('pauseGameBtn').style.display = 'block';
        
        this.updateGameStats();
        this.showNotification(data.message || 'Game started!', 'success');
        
        // Start game loop for animations
        this.startGameLoop();
    }

    handleGameUpdate(data) {
        if (!this.gameState) return;
        
        // Update game state
        Object.assign(this.gameState, data);
        
        // Update UI
        this.updateGameBoard();
        this.updateGameStats();
        this.updatePlayersList();
        this.updateWaveProgress();
    }

    handleGameEnded(data) {
        this.gameStarted = false;
        
        // Stop game loop
        this.stopGameLoop();
        
        // Show game over screen
        this.showGameOverScreen(data);
        
        this.showNotification(`Game ended: ${data.result}`, data.result === 'victory' ? 'success' : 'error');
    }

    handlePlayerJoined(data) {
        if (this.gameState) {
            this.gameState.players = data.players;
            this.updatePlayersList();
        }
        
        this.showNotification(`${data.playerId} joined the game`, 'info');
    }

    handlePlantPlaced(data) {
        // Start cooldown for this plant type
        this.startPlantCooldown(data.plant.type);
        
        // Update game state
        if (this.gameState) {
            this.gameState.players[this.playerId].sun = data.remainingSun;
            this.updateGameStats();
        }
        
        // Visual feedback
        this.showPlantPlacementEffect(data.plant.row, data.plant.col, data.plant.type);
        
        this.showNotification(`${this.getPlantName(data.plant.type)} planted!`, 'success');
    }

    handleWaveStarted(data) {
        this.updateWaveInfo(data);
        
        let message = `Wave ${data.waveNumber}: ${data.message}`;
        let type = 'info';
        
        if (data.isBossWave) {
            message = `🚨 BOSS WAVE ${data.waveNumber}! ${data.message}`;
            type = 'warning';
        }
        
        if (data.isFinalWave) {
            message = `🔥 FINAL WAVE! ${data.message}`;
            type = 'error';
        }
        
        this.showNotification(message, type);
    }

    handlePowerupUsed(data) {
        // Start cooldown for this powerup
        this.startPowerupCooldown(data.powerupType);
        
        // Visual effects
        this.showPowerupEffect(data.powerupType);
        
        this.showNotification(`${this.getPowerupName(data.powerupType)} activated!`, 'success');
    }

    handleChatMessage(data) {
        this.addChatMessage(data.playerId, data.message, data.timestamp);
    }

    // ==========================================
    // UI UPDATES
    // ==========================================

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        if (connected) {
            dot.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            dot.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }

    updateGameStats() {
        if (!this.gameState || !this.playerId) return;
        
        const player = this.gameState.players[this.playerId];
        if (!player) return;
        
        document.getElementById('sunAmount').textContent = player.sun || 0;
        document.getElementById('scoreAmount').textContent = player.score || 0;
        document.getElementById('waveNumber').textContent = this.gameState.currentWave || 1;
    }

    updatePlayersList() {
        if (!this.gameState) return;
        
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';
        
        Object.values(this.gameState.players).forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            if (player.isHost) playerItem.classList.add('host');
            
            playerItem.innerHTML = `
                <div class="player-avatar">${player.id.charAt(0).toUpperCase()}</div>
                <div class="player-name">${player.id}</div>
                <div class="player-stats">
                    ☀️${player.sun} 🏆${player.score}
                </div>
            `;
            
            playersList.appendChild(playerItem);
        });
    }

    updateGameBoard() {
        if (!this.gameState) return;
        
        // Clear existing entities
        document.querySelectorAll('.plant, .zombie, .projectile').forEach(el => el.remove());
        
        // Render plants
        if (this.gameState.plants) {
            this.gameState.plants.forEach(plant => {
                this.renderPlant(plant);
            });
        }
        
        // Render zombies
        if (this.gameState.zombies) {
            this.gameState.zombies.forEach(zombie => {
                this.renderZombie(zombie);
            });
        }
        
        // Render projectiles
        if (this.gameState.projectiles) {
            this.gameState.projectiles.forEach(projectile => {
                this.renderProjectile(projectile);
            });
        }
        
        // Update lawn mowers
        if (this.gameState.lawnMowers) {
            this.updateLawnMowers();
        }
    }

    updateWaveInfo(data) {
        document.getElementById('waveMessage').textContent = data.message;
        document.getElementById('waveNumber').textContent = data.waveNumber;
        
        // Add visual effects for special waves
        if (data.isBossWave || data.isFinalWave) {
            document.querySelector('.wave-progress').classList.add('boss-wave');
            setTimeout(() => {
                document.querySelector('.wave-progress').classList.remove('boss-wave');
            }, 3000);
        }
    }

    updateWaveProgress() {
        if (!this.gameState) return;
        
        const progressBar = document.getElementById('waveProgressBar');
        const waveMessage = document.getElementById('waveMessage');
        
        // Calculate progress based on remaining zombies
        let progress = 0;
        if (this.gameState.waveInProgress) {
            const totalZombies = this.gameState.stats?.totalZombiesSpawned || 1;
            const remainingZombies = this.gameState.zombies?.length || 0;
            progress = Math.max(0, ((totalZombies - remainingZombies) / totalZombies) * 100);
        }
        
        progressBar.style.width = `${progress}%`;
        
        // Update wave message
        if (this.gameState.waveInProgress) {
            waveMessage.textContent = `Wave ${this.gameState.currentWave} in progress...`;
        } else {
            const nextWave = this.gameState.currentWave + 1;
            waveMessage.textContent = `Preparing for wave ${nextWave}...`;
        }
    }

    // ==========================================
    // RENDERING METHODS
    // ==========================================

    renderPlant(plant) {
        const cell = document.querySelector(`[data-row="${plant.row}"][data-col="${plant.col}"]`);
        if (!cell) return;
        
        const plantElement = document.createElement('div');
        plantElement.className = 'plant';
        plantElement.textContent = plant.type;
        plantElement.dataset.plantId = plant.id;
        
        // Add plant-specific classes
        if (plant.type === '🌻') plantElement.classList.add('sunflower');
        
        // Add health bar if plant can take damage
        if (plant.health < plant.maxHealth) {
            const healthBar = this.createHealthBar(plant.health, plant.maxHealth);
            plantElement.appendChild(healthBar);
            plantElement.classList.add('damaged');
        }
        
        cell.appendChild(plantElement);
    }

    renderZombie(zombie) {
        const zombieElement = document.createElement('div');
        zombieElement.className = 'zombie';
        zombieElement.textContent = zombie.type;
        zombieElement.dataset.zombieId = zombie.id;
        
        // Position zombie
        const boardRect = this.elements.gameBoard.getBoundingClientRect();
        const cellWidth = boardRect.width / this.config.BOARD_COLS;
        const cellHeight = boardRect.height / this.config.BOARD_ROWS;
        
        zombieElement.style.position = 'absolute';
        zombieElement.style.left = `${zombie.x * cellWidth}px`;
        zombieElement.style.top = `${zombie.row * cellHeight}px`;
        zombieElement.style.width = `${cellWidth}px`;
        zombieElement.style.height = `${cellHeight}px`;
        
        // Add zombie-specific classes
        if (zombie.isBoss) zombieElement.classList.add('boss');
        if (zombie.effects && zombie.effects.some(e => e.type === 'slow')) {
            zombieElement.classList.add('slowed');
        }
        
        // Add health bar
        const healthBar = this.createHealthBar(zombie.health, zombie.maxHealth);
        zombieElement.appendChild(healthBar);
        
        this.elements.gameBoard.appendChild(zombieElement);
    }

    renderProjectile(projectile) {
        const projectileElement = document.createElement('div');
        projectileElement.className = 'projectile';
        projectileElement.dataset.projectileId = projectile.id;
        
        // Set projectile appearance based on type
        switch (projectile.type) {
            case '🌱': // Peashooter
                projectileElement.textContent = '●';
                projectileElement.classList.add('pea');
                break;
            case '❄️': // Snow Pea
                projectileElement.textContent = '❄';
                projectileElement.classList.add('snow-pea');
                break;
            case '🌵': // Cactus
                projectileElement.textContent = '🔸';
                break;
            default:
                projectileElement.textContent = '●';
        }
        
        // Position projectile
        const boardRect = this.elements.gameBoard.getBoundingClientRect();
        const cellWidth = boardRect.width / this.config.BOARD_COLS;
        const cellHeight = boardRect.height / this.config.BOARD_ROWS;
        
        projectileElement.style.position = 'absolute';
        projectileElement.style.left = `${projectile.x * cellWidth}px`;
        projectileElement.style.top = `${projectile.y * cellHeight}px`;
        
        document.getElementById('projectilesLayer').appendChild(projectileElement);
    }

    createHealthBar(currentHealth, maxHealth) {
        const healthBar = document.createElement('div');
        healthBar.className = 'health-bar';
        
        const healthFill = document.createElement('div');
        healthFill.className = 'health-fill';
        healthFill.style.width = `${(currentHealth / maxHealth) * 100}%`;
        
        healthBar.appendChild(healthFill);
        return healthBar;
    }

    updateLawnMowers() {
        if (!this.gameState.lawnMowers) return;
        
        this.gameState.lawnMowers.forEach((mower, index) => {
            const mowerElement = document.querySelector(`[data-row="${index}"]`);
            if (mowerElement && mower.triggered) {
                mowerElement.classList.add('used');
            }
        });
    }

    // ==========================================
    // VISUAL EFFECTS
    // ==========================================

    showPlantPlacementEffect(row, col, plantType) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;
        
        // Create placement effect
        const effect = document.createElement('div');
        effect.className = 'placement-effect';
        effect.textContent = '✨';
        effect.style.position = 'absolute';
        effect.style.fontSize = '2em';
        effect.style.animation = 'explode 1s ease-out forwards';
        
        cell.appendChild(effect);
        
        setTimeout(() => {
            effect.remove();
        }, 1000);
    }

    showPowerupEffect(powerupType) {
        const effect = document.createElement('div');
        effect.className = 'powerup-effect';
        effect.textContent = powerupType;
        effect.style.position = 'fixed';
        effect.style.top = '50%';
        effect.style.left = '50%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.fontSize = '4em';
        effect.style.zIndex = '2000';
        effect.style.animation = 'explode 2s ease-out forwards';
        
        document.body.appendChild(effect);
        
        setTimeout(() => {
            effect.remove();
        }, 2000);
    }

    showDamageNumber(x, y, damage) {
        const damageElement = document.createElement('div');
        damageElement.className = 'damage-number';
        damageElement.textContent = `-${damage}`;
        damageElement.style.left = `${x}px`;
        damageElement.style.top = `${y}px`;
        
        document.getElementById('effectsLayer').appendChild(damageElement);
        
        setTimeout(() => {
            damageElement.remove();
        }, 1000);
    }

    // ==========================================
    // INTERACTION HANDLERS
    // ==========================================

    handleCellClick(row, col) {
        if (this.selectedPlant) {
            this.placePlant(row, col);
        }
    }

    handleCellHover(row, col, isEntering) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;
        
        if (isEntering && this.selectedPlant) {
            // Show placement preview
            if (col === 0) {
                cell.classList.add('cannot-place');
            } else {
                cell.classList.add('can-place');
            }
        } else {
            // Remove preview
            cell.classList.remove('can-place', 'cannot-place');
        }
    }

    handleKeyboardShortcuts(e) {
        // Plant selection shortcuts (1-8)
        if (e.key >= '1' && e.key <= '8') {
            const plantIndex = parseInt(e.key) - 1;
            const plantCards = document.querySelectorAll('.plant-card');
            if (plantCards[plantIndex]) {
                plantCards[plantIndex].click();
            }
        }
        
        // Powerup shortcuts (Q, W, E, R)
        const powerupKeys = { 'q': 0, 'w': 1, 'e': 2, 'r': 3 };
        if (powerupKeys.hasOwnProperty(e.key.toLowerCase())) {
            const powerupIndex = powerupKeys[e.key.toLowerCase()];
            const powerupCards = document.querySelectorAll('.powerup-card');
            if (powerupCards[powerupIndex]) {
                powerupCards[powerupIndex].click();
            }
        }
        
        // Chat shortcut (Enter)
        if (e.key === 'Enter' && !e.target.matches('input')) {
            this.elements.chatInput.focus();
        }
        
        // Escape to deselect
        if (e.key === 'Escape') {
            this.selectedPlant = null;
            document.querySelectorAll('.plant-card').forEach(card => {
                card.classList.remove('selected');
            });
        }
    }

    // ==========================================
    // COOLDOWN MANAGEMENT
    // ==========================================

    startPlantCooldown(plantType) {
        const cooldownTime = this.getPlantCooldown(plantType);
        this.plantCooldowns.set(plantType, Date.now() + cooldownTime);
        
        const plantCard = document.querySelector(`[data-plant="${plantType}"]`);
        if (plantCard) {
            plantCard.classList.add('disabled');
            const overlay = plantCard.querySelector('.cooldown-overlay');
            overlay.classList.add('active');
            
            this.updateCooldownDisplay(plantCard, overlay, cooldownTime);
        }
    }

    startPowerupCooldown(powerupType) {
        const cooldownTime = this.getPowerupCooldown(powerupType);
        this.powerupCooldowns.set(powerupType, Date.now() + cooldownTime);
        
        const powerupCard = document.querySelector(`[data-powerup="${powerupType}"]`);
        if (powerupCard) {
            powerupCard.classList.add('disabled');
            const overlay = powerupCard.querySelector('.cooldown-overlay');
            overlay.classList.add('active');
            
            this.updateCooldownDisplay(powerupCard, overlay, cooldownTime);
        }
    }

    updateCooldownDisplay(card, overlay, totalTime) {
        const startTime = Date.now();
        
        const updateInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, totalTime - elapsed);
            
            if (remaining <= 0) {
                clearInterval(updateInterval);
                card.classList.remove('disabled');
                overlay.classList.remove('active');
                overlay.textContent = '';
            } else {
                const seconds = Math.ceil(remaining / 1000);
                overlay.textContent = `${seconds}s`;
            }
        }, 100);
    }

    updatePlantPlacementPreview() {
        // Update cursor or visual feedback for plant placement
        if (this.selectedPlant) {
            document.body.style.cursor = 'crosshair';
        } else {
            document.body.style.cursor = 'default';
        }
    }

    // ==========================================
    // CHAT SYSTEM
    // ==========================================

    addChatMessage(playerId, message, timestamp) {
        const chatMessages = this.elements.chatMessages;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        const time = new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.innerHTML = `
            <span class="sender">${playerId}:</span>
            ${this.escapeHtml(message)}
            <span class="timestamp">${time}</span>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Limit chat history
        while (chatMessages.children.length > 50) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
    }

    toggleChat() {
        const chatContainer = this.elements.chatContainer;
        const toggleBtn = document.getElementById('toggleChat');
        
        chatContainer.classList.toggle('minimized');
        toggleBtn.textContent = chatContainer.classList.contains('minimized') ? '+' : '−';
    }

    // ==========================================
    // GAME LOOP
    // ==========================================

    startGameLoop() {
        if (this.gameLoopInterval) return;
        
        this.gameLoopInterval = setInterval(() => {
            this.updateAnimations();
            this.updateCooldowns();
        }, this.config.ANIMATION_SPEED);
    }

    stopGameLoop() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
    }

    updateAnimations() {
        // Update projectile positions
        document.querySelectorAll('.projectile').forEach(projectile => {
            const currentLeft = parseFloat(projectile.style.left) || 0;
            projectile.style.left = `${currentLeft + 2}px`; // Move right
            
            // Remove if off screen
            if (currentLeft > window.innerWidth) {
                projectile.remove();
            }
        });
        
        // Update zombie positions
        document.querySelectorAll('.zombie').forEach(zombie => {
            const currentLeft = parseFloat(zombie.style.left) || 0;
            zombie.style.left = `${currentLeft - 0.5}px`; // Move left
        });
    }

    updateCooldowns() {
        const now = Date.now();
        
        // Update plant cooldowns
        for (const [plantType, endTime] of this.plantCooldowns.entries()) {
            if (now >= endTime) {
                this.plantCooldowns.delete(plantType);
            }
        }
        
        // Update powerup cooldowns
        for (const [powerupType, endTime] of this.powerupCooldowns.entries()) {
            if (now >= endTime) {
                this.powerupCooldowns.delete(powerupType);
            }
        }
    }

    // ==========================================
    // SCREEN MANAGEMENT
    // ==========================================

    showLoadingScreen(message = 'Loading...') {
        this.elements.loadingScreen.style.display = 'flex';
        if (message) {
            document.querySelector('.loading-text').textContent = message;
        }
    }

    hideLoadingScreen() {
        this.elements.loadingScreen.style.display = 'none';
    }

    showLoginScreen() {
        this.elements.loginScreen.style.display = 'flex';
    }

    hideLoginScreen() {
        this.elements.loginScreen.style.display = 'none';
    }

    showGameContainer() {
        this.elements.gameContainer.style.display = 'flex';
    }

    hideGameContainer() {
        this.elements.gameContainer.style.display = 'none';
    }

    showGameOverScreen(data) {
        const gameOverScreen = this.elements.gameOverScreen;
        const gameOverContent = document.getElementById('gameOverContent');
        
        const isVictory = data.result === 'victory';
        
        gameOverContent.className = `game-over-content ${isVictory ? 'victory' : 'defeat'}`;
        gameOverContent.innerHTML = `
            <h2>${isVictory ? '🎉 Victory!' : '💀 Defeat!'}</h2>
            <p>${isVictory ? 'You successfully defended your lawn!' : 'The zombies have overrun your defenses!'}</p>
            
            <div class="final-stats">
                ${data.finalScores.map(player => `
                    <div class="final-stat">
                        <div class="final-stat-value">${player.score}</div>
                        <div class="final-stat-label">${player.playerId} Score</div>
                    </div>
                    <div class="final-stat">
                        <div class="final-stat-value">${player.zombiesKilled}</div>
                        <div class="final-stat-label">Zombies Killed</div>
                    </div>
                    <div class="final-stat">
                        <div class="final-stat-value">${player.plantsPlaced}</div>
                        <div class="final-stat-label">Plants Placed</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        gameOverScreen.style.display = 'flex';
    }

    hideGameOverScreen() {
        this.elements.gameOverScreen.style.display = 'none';
    }

    // ==========================================
    // LEADERBOARD
    // ==========================================

    async showLeaderboard() {
        try {
            this.elements.leaderboardModal.style.display = 'flex';
            await this.loadLeaderboard('high_scores');
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.showNotification('Failed to load leaderboard', 'error');
        }
    }

    hideLeaderboard() {
        this.elements.leaderboardModal.style.display = 'none';
    }

    async switchLeaderboardTab(category) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Load leaderboard data
        await this.loadLeaderboard(category);
    }

    async loadLeaderboard(category) {
        try {
            const response = await fetch(`/api/leaderboard/${category}?limit=10`);
            const leaderboard = await response.json();
            
            const content = document.getElementById('leaderboardContent');
            content.innerHTML = leaderboard.map(entry => `
                <div class="leaderboard-item ${entry.rank <= 3 ? 'top-3' : ''}">
                    <div class="leaderboard-rank">#${entry.rank}</div>
                    <div class="leaderboard-name">${entry.playerName}</div>
                    <div class="leaderboard-score">${entry.score}</div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            document.getElementById('leaderboardContent').innerHTML = 
                '<div class="error-message">Failed to load leaderboard</div>';
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    async loadInitialStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            document.getElementById('totalGames').textContent = stats.totalGames || 0;
            document.getElementById('totalPlayers').textContent = stats.totalPlayers || 0;
            document.getElementById('activeGames').textContent = stats.activeGames || 0;
            
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    playAgain() {
        // Reset game state
        this.gameState = null;
        this.gameId = null;
        this.selectedPlant = null;
        this.gameStarted = false;
        this.plantCooldowns.clear();
        this.powerupCooldowns.clear();
        
        // Hide game over screen and show login
        this.hideGameOverScreen();
        this.hideGameContainer();
        this.showLoginScreen();
        
        // Reset UI
        document.getElementById('startGameBtn').style.display = 'block';
        document.getElementById('pauseGameBtn').style.display = 'none';
        
        this.stopGameLoop();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.elements.notificationsContainer.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getPlantName(plantType) {
        const names = {
            '🌻': 'Sunflower',
            '🌱': 'Peashooter',
            '❄️': 'Snow Pea',
            '🌰': 'Wall-nut',
            '🍒': 'Cherry Bomb',
            '🌶️': 'Jalapeno',
            '🌵': 'Cactus',
            '🍄': 'Puff-shroom'
        };
        return names[plantType] || 'Unknown Plant';
    }

    getPowerupName(powerupType) {
        const names = {
            '☀️': 'Sun Boost',
            '⚡': 'Speed Boost',
            '🛡️': 'Plant Shield',
            '💥': 'Damage Boost'
        };
        return names[powerupType] || 'Unknown Powerup';
    }

    getPlantCooldown(plantType) {
        const cooldowns = {
            '🌻': 7500,   // Sunflower
            '🌱': 7500,   // Peashooter
            '❄️': 7500,   // Snow Pea
            '🌰': 30000,  // Wall-nut
            '🍒': 50000,  // Cherry Bomb
            '🌶️': 50000,  // Jalapeno
            '🌵': 7500,   // Cactus
            '🍄': 7500    // Puff-shroom
        };
        return cooldowns[plantType] || 7500;
    }

    getPowerupCooldown(powerupType) {
        const cooldowns = {
            '☀️': 60000,  // Sun Boost
            '⚡': 90000,  // Speed Boost
            '🛡️': 120000, // Plant Shield
            '💥': 100000  // Damage Boost
        };
        return cooldowns[powerupType] || 60000;
    }
}

// Initialize the game client when the page loads
window.addEventListener('load', () => {
    window.gameClient = new PlantsVsZombiesClient();
});
