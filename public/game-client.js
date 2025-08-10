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
            notificationsContainer: document.getElementById('notifications')
        };
        
        // Game configuration
        this.config = {
            BOARD_ROWS: 5,
            BOARD_COLS: 9,
            CELL_SIZE: 80,
            ANIMATION_SPEED: 16 // ~60 FPS
        };
        
        // Track projectiles for shooting animations
        this.previousProjectiles = new Set();
        this.shootingAnimationTimeouts = new Map();
        
        this.init();
    }

    async init() {
        
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize audio manager
            await this.initializeAudio();
            
            // Initialize socket connection
            await this.initializeSocket();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize game board
            this.initializeGameBoard();
            
            // Load initial stats
            await this.loadInitialStats();
            
            // Check initial state of inputs and clear game ID
            const playerNameInput = document.getElementById('playerNameInput');
            const gameIdInput = document.getElementById('gameIdInput');
            
            // Always clear game ID on page load to prevent pre-filling issues
            if (gameIdInput.value) {
                gameIdInput.value = '';
            }
            
            // Hide loading screen and show main menu
            this.hideLoadingScreen();
            this.showMainMenu();
            
            
        } catch (error) {
            console.error('❌ Client initialization failed:', error);
            this.showNotification('Failed to initialize game', 'error');
        }
    }

    // ==========================================
    // AUDIO INITIALIZATION
    // ==========================================

    async initializeAudio() {
        try {
            
            // Initialize audio manager on first user interaction
            document.addEventListener('click', async () => {
                if (!window.audioManager.isInitialized) {
                    await window.audioManager.init();
                    await window.audioManager.resume();
                }
            }, { once: true });
            
            // Also try to initialize on any key press
            document.addEventListener('keydown', async () => {
                if (!window.audioManager.isInitialized) {
                    await window.audioManager.init();
                    await window.audioManager.resume();
                }
            }, { once: true });
            
        } catch (error) {
            logger.warn('🔇 Audio initialization failed:', error);
        }
    }

    // ==========================================
    // SOCKET CONNECTION
    // ==========================================

    async initializeSocket() {
        return new Promise((resolve, reject) => {
            this.socket = io();
            
            this.socket.on('connect', () => {
                this.isConnected = true;
                this.updateConnectionStatus(true);
                resolve();
            });
            
            this.socket.on('disconnect', () => {
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
            this.handleGameJoined(data);
        });
        
        this.socket.on('game_started', (data) => {
            this.handleGameStarted(data);
            // Start background music
            setTimeout(() => {
                window.audioManager.startBackgroundMusic();
            }, 1000);
        });
        
        this.socket.on('game_update', (data) => {
            this.handleGameUpdate(data);
        });
        
        this.socket.on('game_ended', (data) => {
            this.handleGameEnded(data);
        });
        
        // Player events
        this.socket.on('player_joined', (data) => {
            this.handlePlayerJoined(data);
        });
        
        // Plant events
        this.socket.on('plant_placed', (data) => {
            this.handlePlantPlaced(data);
            window.audioManager.playSound('plantPlace', 0.6);
        });
        
        // Wave events
        this.socket.on('wave_started', (data) => {
            this.handleWaveStarted(data);
        });
        
        // Powerup events
        this.socket.on('powerup_used', (data) => {
            this.handlePowerupUsed(data);
        });
        
        // Game pause/resume events
        this.socket.on('game_paused', (data) => {
            this.handleGamePaused(data);
        });

        this.socket.on('game_resumed', (data) => {
            this.handleGameResumed(data);
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
        // Main Menu buttons
        document.getElementById('startNewGameBtn').addEventListener('click', () => {
            this.showNewGameScreen();
        });
        
        document.getElementById('resumeGameMenuBtn').addEventListener('click', () => {
            this.showResumeGameScreen();
        });
        
        document.getElementById('leaderboardMenuBtn').addEventListener('click', () => {
            this.showLeaderboard();
        });
        
        // Leaderboard screen event listeners
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                
                // Update active tab
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // Load new category
                this.loadLeaderboard(category);
            });
        });
        
        document.getElementById('refreshLeaderboardBtn').addEventListener('click', () => {
            const activeTab = document.querySelector('.category-tab.active');
            const category = activeTab ? activeTab.dataset.category : 'high_scores';
            this.loadLeaderboard(category);
            this.loadGlobalStats();
        });
        
        document.getElementById('backToMainFromLeaderboardBtn').addEventListener('click', () => {
            this.showMainMenu();
        });
        
        // New Game Screen
        document.getElementById('createNewGameBtn').addEventListener('click', () => {
            this.createNewGame();
        });
        
        document.getElementById('backToMainMenuBtn').addEventListener('click', () => {
            this.showMainMenu();
        });
        
        document.getElementById('newPlayerNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createNewGame();
            }
        });
        
        // Resume Game Screen
        document.getElementById('backToMainFromResumeBtn').addEventListener('click', () => {
            this.showMainMenu();
        });
        
        document.getElementById('resumePlayerNameInput').addEventListener('input', (e) => {
            const playerName = e.target.value.trim();
            if (playerName.length >= 2) {
                this.loadSavedGames(playerName);
            } else {
                this.hideSavedGames();
            }
        });

        // Login form (legacy)
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
        
        // Audio controls
        document.getElementById('musicToggle').addEventListener('click', () => {
            this.toggleMusic();
        });
        
        document.getElementById('sfxToggle').addEventListener('click', () => {
            this.toggleSFX();
        });
        
        // Resume game functionality
        document.getElementById('resumeGameBtn').addEventListener('click', () => {
            this.showActiveGamesList();
        });
        
        // Player name input - load active games when name is entered
        let inputTimeout;
        document.getElementById('playerNameInput').addEventListener('input', (e) => {
            const playerName = e.target.value.trim();
            
            // Clear any previous game ID to ensure fresh start for new games
            const gameIdInput = document.getElementById('gameIdInput');
            const oldGameId = gameIdInput.value;
            gameIdInput.value = '';
            
            // Clear previous timeout
            if (inputTimeout) {
                clearTimeout(inputTimeout);
            }
            
            // Debounce the API call
            inputTimeout = setTimeout(() => {
                if (playerName.length >= 2) {
                    this.loadPlayerActiveGames(playerName);
                } else {
                    this.hideActiveGames();
                }
            }, 500); // Wait 500ms after user stops typing
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
        if (!this.gameStarted) {
            this.showNotification('Game not started yet', 'warning');
            return;
        }

        if (this.gameState && this.gameState.status === 'paused') {
            // Resume game
            this.socket.emit('resume_game');
        } else {
            // Pause game
            this.socket.emit('pause_game');
        }
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
        
        // Check if position is already occupied
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell && cell.querySelector('.plant')) {
            this.showNotification('Position already occupied', 'warning');
            return;
        }
        
        // Check if player has enough sun
        const plantData = this.getPlantData(this.selectedPlant.type);
        if (this.gameState && this.gameState.players[this.playerId].sun < plantData.cost) {
            this.showNotification('Not enough sun', 'warning');
            return;
        }
        
        // Provide immediate visual feedback (temporary plant preview)
        this.showPlantPreview(row, col, this.selectedPlant.type);
        
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
    
    showPlantPreview(row, col, plantType) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;
        
        // Create temporary preview element
        const preview = document.createElement('div');
        preview.className = 'plant plant-preview-temp';
        preview.textContent = plantType;
        preview.style.opacity = '0.7';
        preview.style.filter = 'brightness(1.2)';
        
        cell.appendChild(preview);
        
        // Remove preview after 2 seconds (in case server response is delayed)
        setTimeout(() => {
            if (preview.parentNode) {
                preview.remove();
            }
        }, 2000);
    }
    
    getPlantData(plantType) {
        // Plant data for client-side validation
        const plantData = {
            '🌻': { cost: 50 },
            '🌱': { cost: 100 },
            '❄️': { cost: 175 },
            '🌰': { cost: 50 },
            '🍒': { cost: 150 },
            '🌶️': { cost: 125 },
            '🌵': { cost: 125 },
            '🍄': { cost: 0 }
        };
        return plantData[plantType] || { cost: 100 };
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
        
        // Check if this is a rejoin of an already started game
        const isGameStarted = data.gameState.status === 'playing' || data.gameState.status === 'paused';
        const isRejoining = data.isRejoining;
        
        if (isRejoining && isGameStarted) {
            
            // Hide start button and show appropriate controls
            document.getElementById('startGameBtn').style.display = 'none';
            document.getElementById('pauseGameBtn').style.display = 'block';
            this.updatePauseButton();
            this.showAudioControls();
            
            // Set game as started
            this.gameStarted = true;
            
            // Force update the game board with restored state
            this.updateGameBoard();
            this.updateGameStats();
            this.updatePlayersList();
            
            // If game is paused, automatically resume it
            if (this.gameState.status === 'paused') {
                this.socket.emit('resume_game');
            }
            
            // Start game loop for animations
            this.startGameLoop();
            
            this.showNotification(`Resumed game: ${data.gameId}`, 'success');
        } else {
            // Make start button extra prominent for new games
            const startBtn = document.getElementById('startGameBtn');
            startBtn.classList.add('ready-to-start');
            startBtn.style.display = 'block';
            
            this.showNotification(`Joined game: ${data.gameId}`, 'success');
        }
    }

    handleGameStarted(data) {
        this.gameStarted = true;
        this.gameState = data.gameState;
        
        // Update UI
        const startBtn = document.getElementById('startGameBtn');
        startBtn.style.display = 'none';
        startBtn.classList.remove('ready-to-start'); // Remove special animation
        
        document.getElementById('pauseGameBtn').style.display = 'block';
        this.updatePauseButton();
        this.showAudioControls();
        
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
        // Remove any temporary preview for this position
        const cell = document.querySelector(`[data-row="${data.plant.row}"][data-col="${data.plant.col}"]`);
        if (cell) {
            const tempPreview = cell.querySelector('.plant-preview-temp');
            if (tempPreview) {
                tempPreview.remove();
            }
        }
        
        // Start cooldown for this plant type
        this.startPlantCooldown(data.plant.type);
        
        // Update game state
        if (this.gameState) {
            this.gameState.players[this.playerId].sun = data.remainingSun;
            
            // Immediately add the plant to the local game state for instant visual feedback
            if (!this.gameState.plants) {
                this.gameState.plants = [];
            }
            
            // Check if plant already exists in local state
            const existingPlantIndex = this.gameState.plants.findIndex(p => p.id === data.plant.id);
            if (existingPlantIndex === -1) {
                this.gameState.plants.push(data.plant);
                
                // Update board state
                if (!this.gameState.board) {
                    this.gameState.board = Array(5).fill().map(() => Array(9).fill().map(() => ({})));
                }
                this.gameState.board[data.plant.row][data.plant.col].plant = data.plant;
                
                // Immediately update the visual board
                this.updateGameBoard();
            }
            
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

    handleGamePaused(data) {
        this.gameState = data.gameState;
        this.updatePauseButton();
        this.showNotification(data.message, 'info');
        
        // Stop animations
        this.stopGameLoop();
        
        // Show pause overlay
        this.showPauseOverlay();
    }

    handleGameResumed(data) {
        this.gameState = data.gameState;
        this.updatePauseButton();
        this.showNotification(data.message, 'success');
        
        // Hide pause overlay
        this.hidePauseOverlay();
        
        // Resume animations
        this.startGameLoop();
    }

    updatePauseButton() {
        const pauseBtn = document.getElementById('pauseGameBtn');
        if (!pauseBtn) return;

        if (this.gameState && this.gameState.status === 'paused') {
            pauseBtn.innerHTML = '▶️ Resume';
            pauseBtn.classList.add('resume-btn');
            pauseBtn.classList.remove('pause-btn');
        } else {
            pauseBtn.innerHTML = '⏸️ Pause';
            pauseBtn.classList.add('pause-btn');
            pauseBtn.classList.remove('resume-btn');
        }
    }

    showPauseOverlay() {
        // Create pause overlay if it doesn't exist
        let overlay = document.getElementById('pauseOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pauseOverlay';
            overlay.className = 'pause-overlay';
            overlay.innerHTML = `
                <div class="pause-content">
                    <h2>⏸️ Game Paused</h2>
                    <p>Click Resume to continue playing</p>
                    <button id="resumeFromOverlay" class="nav-btn resume-btn">▶️ Resume Game</button>
                </div>
            `;
            document.body.appendChild(overlay);
            
            // Add event listener for resume button in overlay
            document.getElementById('resumeFromOverlay').addEventListener('click', () => {
                this.pauseGame(); // This will resume since game is paused
            });
        }
        
        overlay.style.display = 'flex';
    }

    hidePauseOverlay() {
        const overlay = document.getElementById('pauseOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
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
        
        // Update plants (don't clear and redraw)
        this.updatePlants();
        
        // Update zombies (clear and redraw for position updates)
        this.updateZombies();
        
        // Update projectiles (clear and redraw for position updates)
        this.updateProjectiles();
        
        // Update lawn mowers
        if (this.gameState.lawnMowers) {
            this.updateLawnMowers();
        }
    }

    updatePlants() {
        if (!this.gameState.plants) {
            return;
        }
        
        
        // Get existing plant elements
        const existingPlants = new Map();
        document.querySelectorAll('.plant[data-plant-id]').forEach(el => {
            existingPlants.set(el.dataset.plantId, el);
        });
        
        // Track which plants are still active
        const activePlantIds = new Set();
        
        // Update or create plants
        this.gameState.plants.forEach(plant => {
            activePlantIds.add(plant.id);
            const existingElement = existingPlants.get(plant.id);
            
            if (existingElement) {
                // Update existing plant (health bar, effects, etc.)
                this.updatePlantElement(existingElement, plant);
            } else {
                // Create new plant
                this.renderPlant(plant);
            }
        });
        
        // Remove plants that no longer exist
        existingPlants.forEach((element, plantId) => {
            if (!activePlantIds.has(plantId)) {
                element.remove();
            }
        });
    }

    updateZombies() {
        // Clear existing zombies (they move frequently, so redraw is acceptable)
        document.querySelectorAll('.zombie').forEach(el => el.remove());
        
        // Render zombies
        if (this.gameState.zombies) {
            this.gameState.zombies.forEach(zombie => {
                this.renderZombie(zombie);
            });
        }
    }

    updateProjectiles() {
        // Check for new projectiles to trigger shooting animations
        if (this.gameState.projectiles) {
            const currentProjectileIds = new Set(this.gameState.projectiles.map(p => p.id));
            
            // Find newly created projectiles
            this.gameState.projectiles.forEach(projectile => {
                if (!this.previousProjectiles.has(projectile.id)) {
                    // New projectile detected - trigger shooting animation
                    this.triggerPlantShootingAnimation(projectile);
                }
            });
            
            // Update previous projectiles set
            this.previousProjectiles = currentProjectileIds;
        }
        
        // Clear existing projectiles (they move frequently, so redraw is acceptable)
        document.querySelectorAll('.projectile').forEach(el => el.remove());
        
        // Render projectiles
        if (this.gameState.projectiles) {
            this.gameState.projectiles.forEach(projectile => {
                this.renderProjectile(projectile);
            });
        }
    }

    updatePlantElement(element, plant) {
        // Update health bar if needed
        const existingHealthBar = element.querySelector('.health-bar');
        const needsHealthBar = plant.health < plant.maxHealth;
        const wasDamaged = element.classList.contains('damaged');
        
        if (needsHealthBar && !existingHealthBar) {
            // Add health bar
            const healthBar = this.createHealthBar(plant.health, plant.maxHealth);
            element.appendChild(healthBar);
            element.classList.add('damaged');
            
            // Only trigger shake animation if plant wasn't already damaged
            if (!wasDamaged) {
                element.style.animation = 'plantShake 0.5s ease-in-out';
                setTimeout(() => {
                    // Reset animation to allow for sunflower sway if needed
                    if (plant.type === '🌻') {
                        element.style.animation = 'sunflowerSway 3s ease-in-out infinite';
                    } else {
                        element.style.animation = '';
                    }
                }, 500);
            }
        } else if (needsHealthBar && existingHealthBar) {
            // Update existing health bar
            const healthFill = existingHealthBar.querySelector('.health-fill');
            if (healthFill) {
                const healthPercent = (plant.health / plant.maxHealth) * 100;
                healthFill.style.width = `${healthPercent}%`;
                
                // Update health bar color based on health percentage
                if (healthPercent > 60) {
                    healthFill.style.backgroundColor = '#4CAF50'; // Green
                } else if (healthPercent > 30) {
                    healthFill.style.backgroundColor = '#FF9800'; // Orange
                } else {
                    healthFill.style.backgroundColor = '#F44336'; // Red
                }
            }
        } else if (!needsHealthBar && existingHealthBar) {
            // Remove health bar (plant healed to full)
            existingHealthBar.remove();
            element.classList.remove('damaged');
            
            // Reset animation for sunflowers
            if (plant.type === '🌻') {
                element.style.animation = 'sunflowerSway 3s ease-in-out infinite';
            } else {
                element.style.animation = '';
            }
        }
        
        // Ensure plant-specific classes are maintained
        if (plant.type === '🌻' && !element.classList.contains('sunflower')) {
            element.classList.add('sunflower');
        }
        
        // Update plant visual effects based on any status effects
        if (plant.effects) {
            plant.effects.forEach(effect => {
                if (effect.type === 'boost' && !element.classList.contains('boosted')) {
                    element.classList.add('boosted');
                } else if (effect.type === 'shield' && !element.classList.contains('shielded')) {
                    element.classList.add('shielded');
                }
            });
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
        plantElement.dataset.row = plant.row;
        plantElement.dataset.col = plant.col;
        
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

    triggerPlantShootingAnimation(projectile) {
        // Use integer coordinates - projectile starts at plant position but moves immediately
        const plantRow = Math.floor(projectile.y);
        const plantCol = Math.floor(projectile.x);
        
        // Find the plant that shot this projectile
        const plantElement = document.querySelector(
            `.plant[data-row="${plantRow}"][data-col="${plantCol}"]`
        );
        
        if (!plantElement) {
            return;
        }
        
        // Clear any existing shooting animation timeout
        const plantKey = `${plantRow}-${plantCol}`;
        if (this.shootingAnimationTimeouts.has(plantKey)) {
            clearTimeout(this.shootingAnimationTimeouts.get(plantKey));
        }
        
        // Remove any existing shooting classes
        plantElement.classList.remove('shooting', 'peashooter', 'snow-pea', 'cactus', 'mushroom', 'default');
        
        // Add shooting class and plant-specific class
        plantElement.classList.add('shooting');
        
        // Add plant-specific shooting animation class and sound
        switch (projectile.type) {
            case '🌱': // Peashooter
                plantElement.classList.add('peashooter');
                this.createMuzzleFlash(plantElement, 'pea', '💥');
                window.audioManager.playSound('peashooter', 0.7);
                break;
            case '❄️': // Snow Pea
                plantElement.classList.add('snow-pea');
                this.createMuzzleFlash(plantElement, 'snow', '❄️');
                window.audioManager.playSound('snowPea', 0.6);
                break;
            case '🌵': // Cactus
                plantElement.classList.add('cactus');
                this.createMuzzleFlash(plantElement, 'spike', '⚡');
                window.audioManager.playSound('cactus', 0.8);
                break;
            case '🍄': // Puff-shroom
                plantElement.classList.add('mushroom');
                this.createMuzzleFlash(plantElement, 'spore', '💨');
                window.audioManager.playSound('mushroom', 0.5);
                break;
            default:
                plantElement.classList.add('default');
                this.createMuzzleFlash(plantElement, 'pea', '✨');
                window.audioManager.playSound('peashooter', 0.6);
                break;
        }
        
        // Remove shooting animation after it completes
        const timeout = setTimeout(() => {
            plantElement.classList.remove('shooting', 'peashooter', 'snow-pea', 'cactus', 'mushroom', 'default');
            this.shootingAnimationTimeouts.delete(plantKey);
        }, 400); // Match CSS animation duration
        
        this.shootingAnimationTimeouts.set(plantKey, timeout);
    }

    createMuzzleFlash(plantElement, type, emoji) {
        // Create muzzle flash element
        const muzzleFlash = document.createElement('div');
        muzzleFlash.className = `muzzle-flash ${type}`;
        muzzleFlash.textContent = emoji;
        
        // Position relative to plant
        plantElement.style.position = 'relative';
        plantElement.appendChild(muzzleFlash);
        
        // Remove muzzle flash after animation
        setTimeout(() => {
            if (muzzleFlash.parentNode) {
                muzzleFlash.parentNode.removeChild(muzzleFlash);
            }
        }, 200); // Match muzzleFlash animation duration
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
        
        // Play explosion sound for powerups
        window.audioManager.playSound('explosion', 0.4);
        
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

    showMainMenu() {
        this.hideAllScreens();
        document.getElementById('mainMenuScreen').style.display = 'block';
    }

    showNewGameScreen() {
        this.hideAllScreens();
        document.getElementById('newGameScreen').style.display = 'block';
        
        // Setup username suggestions
        const nameInput = document.getElementById('newPlayerNameInput');
        nameInput.value = '';
        this.prefillSuggestedUsername('newPlayerNameInput');
        this.setupUsernameInputHandlers('newPlayerNameInput');
        
        // Focus on the input after a short delay
        setTimeout(() => nameInput.focus(), 100);
    }

    showResumeGameScreen() {
        this.hideAllScreens();
        document.getElementById('resumeGameScreen').style.display = 'block';
        
        // Setup username suggestions
        const nameInput = document.getElementById('resumePlayerNameInput');
        nameInput.value = '';
        this.prefillSuggestedUsername('resumePlayerNameInput');
        this.setupUsernameInputHandlers('resumePlayerNameInput');
        
        // Focus on the input after a short delay
        setTimeout(() => nameInput.focus(), 100);
        
        // Hide saved games initially
        document.getElementById('savedGamesList').style.display = 'none';
        document.getElementById('noSavedGamesMessage').style.display = 'none';
    }

    hideAllScreens() {
        const screens = ['mainMenuScreen', 'newGameScreen', 'resumeGameScreen', 'loginScreen', 'gameContainer', 'gameOverScreen'];
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) screen.style.display = 'none';
        });
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

    async loadPlayerActiveGames(playerName) {
        try {
            
            // Show loading state
            const resumeBtn = document.getElementById('resumeGameBtn');
            const originalText = resumeBtn.textContent;
            resumeBtn.textContent = '🔄 Loading games...';
            resumeBtn.disabled = true;
            
            const response = await fetch(`/api/player/${encodeURIComponent(playerName)}/games`);
            const games = await response.json();
            
            
            // Restore button state
            resumeBtn.textContent = originalText;
            resumeBtn.disabled = false;
            
            this.displayActiveGames(games);
            
        } catch (error) {
            console.error('❌ Failed to load player games:', error);
            
            // Restore button state
            const resumeBtn = document.getElementById('resumeGameBtn');
            resumeBtn.textContent = '🎮 Continue Playing';
            resumeBtn.disabled = false;
            
            this.hideActiveGames();
            this.showNotification('Failed to load saved games', 'error');
        }
    }

    displayActiveGames(games) {
        const resumeBtn = document.getElementById('resumeGameBtn');
        const activeGamesList = document.getElementById('activeGamesList');
        const container = document.getElementById('activeGamesContainer');
        
        if (games.length === 0) {
            
            // Show the list but with a helpful message
            resumeBtn.style.display = 'block';
            activeGamesList.style.display = 'block';
            
            container.innerHTML = `
                <div class="no-games-message">
                    <div class="no-games-icon">🎮</div>
                    <h4>No saved games found</h4>
                    <p>Start a new game to begin your zombie defense adventure!</p>
                    <div class="no-games-tips">
                        <p><strong>💡 Tip:</strong> Games are automatically saved when you pause or leave</p>
                    </div>
                </div>
            `;
            return;
        }
        
        
        // Show resume functionality
        resumeBtn.style.display = 'block';
        activeGamesList.style.display = 'block';
        
        // Clear existing games
        container.innerHTML = '';
        
        // Add each game with enhanced information
        games.forEach((game, index) => {
            const gameItem = document.createElement('div');
            gameItem.className = 'active-game-item';
            gameItem.dataset.gameId = game.gameId;
            
            // Create a friendly game name
            const gameDate = new Date(game.createdAt);
            const gameName = this.generateGameName(game, gameDate);
            const timeAgo = this.formatTimeSince(game.lastActivity);
            const statusIcon = this.getStatusIcon(game.status);
            const modeIcon = this.getModeIcon(game.mode);
            
            gameItem.innerHTML = `
                <div class="game-card-header">
                    <div class="game-name">
                        ${statusIcon} ${gameName}
                    </div>
                    <div class="game-status status-${game.status}">
                        ${game.status.toUpperCase()}
                    </div>
                </div>
                <div class="game-details">
                    <div class="game-info-row">
                        <span class="info-item">
                            ${modeIcon} ${this.formatMode(game.mode)}
                        </span>
                        <span class="info-item">
                            👥 ${game.players} player${game.players > 1 ? 's' : ''}
                        </span>
                        <span class="info-item">
                            🌊 Wave ${game.wave}
                        </span>
                    </div>
                    <div class="game-info-row">
                        <span class="info-item">
                            ☀️ ${game.playerSun} sun
                        </span>
                        <span class="info-item">
                            📅 ${gameDate.toLocaleDateString()}
                        </span>
                        <span class="info-item time-ago">
                            ⏰ ${timeAgo}
                        </span>
                    </div>
                </div>
                <div class="game-actions">
                    <button class="resume-game-btn">
                        ${game.status === 'paused' ? '▶️ Resume' : '🔄 Continue'}
                    </button>
                </div>
            `;
            
            // Add click event listener with proper binding
            const clickHandler = ((gameId) => {
                return (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    try {
                        this.resumeGame(gameId);
                    } catch (error) {
                        console.error('❌ Error in resumeGame:', error);
                    }
                };
            })(game.gameId);
            
            gameItem.addEventListener('click', clickHandler);
            
            container.appendChild(gameItem);
            
            // Verify the element was added
            
            // Also add onclick as backup
            gameItem.onclick = (event) => {
                event.preventDefault();
                this.resumeGame(game.gameId);
            };
        });
    }

    hideActiveGames() {
        document.getElementById('resumeGameBtn').style.display = 'none';
        document.getElementById('activeGamesList').style.display = 'none';
        // Clear game ID to ensure fresh start for new games
        document.getElementById('gameIdInput').value = '';
    }

    formatTimeSince(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    generateGameName(game, gameDate) {
        // Create friendly game names based on context
        const timeOfDay = gameDate.getHours();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[gameDate.getDay()];
        
        let timePeriod;
        if (timeOfDay < 6) timePeriod = 'Night';
        else if (timeOfDay < 12) timePeriod = 'Morning';
        else if (timeOfDay < 17) timePeriod = 'Afternoon';
        else if (timeOfDay < 21) timePeriod = 'Evening';
        else timePeriod = 'Night';
        
        // Generate contextual names
        const gameNames = [
            `${dayName} ${timePeriod} Defense`,
            `${timePeriod} Garden Battle`,
            `${dayName}'s Last Stand`,
            `Wave ${game.wave} Challenge`,
            `${timePeriod} Zombie Hunt`,
            `Garden Defense ${gameDate.getDate()}/${gameDate.getMonth() + 1}`
        ];
        
        // Pick a name based on game characteristics
        if (game.wave >= 10) return `Epic ${timePeriod} Battle`;
        if (game.status === 'paused') return `Paused ${timePeriod} Game`;
        if (game.players > 1) return `Team ${timePeriod} Defense`;
        
        return gameNames[Math.floor(Math.random() * gameNames.length)];
    }
    
    getStatusIcon(status) {
        const icons = {
            'playing': '🎮',
            'paused': '⏸️',
            'waiting': '⏳',
            'completed': '✅'
        };
        return icons[status] || '🎯';
    }
    
    getModeIcon(mode) {
        const icons = {
            'cooperative': '🤝',
            'versus': '⚔️',
            'survival': '🏃',
            'challenge': '🎯'
        };
        return icons[mode] || '🎮';
    }
    
    formatMode(mode) {
        const modes = {
            'cooperative': 'Co-op',
            'versus': 'Versus',
            'survival': 'Survival',
            'challenge': 'Challenge'
        };
        return modes[mode] || mode.charAt(0).toUpperCase() + mode.slice(1);
    }
    
    // ==========================================
    // USERNAME SUGGESTION SYSTEM
    // ==========================================

    generateSuggestedUsername() {
        // Specific high-quality username templates inspired by the sample data
        const premiumNames = [
            'GardenMaster', 'ZombieSlayer', 'PlantLover', 'DefenseKing', 'SunflowerFan',
            'WaveRider', 'PeaShooter', 'CherryBomb', 'WallNutPro', 'GardenGuardian',
            'PlantDefender', 'ZombieHunter', 'SunCollector', 'WaveWarrior', 'GreenThumb',
            'PlantWhisperer', 'ZombieCrusher', 'GardenHero', 'DefenseMaster', 'PlantKing',
            'SunMaster', 'WaveMaster', 'GardenLord', 'PlantChampion', 'ZombieTerminator'
        ];

        const plantNames = [
            'Sunflower', 'Peashooter', 'WallNut', 'CherryBomb', 'SnowPea', 
            'Chomper', 'Repeater', 'PuffShroom', 'SunShroom', 'FumeShroom',
            'Squash', 'Threepeater', 'Jalapeno', 'Spikeweed', 'Torchwood', 
            'TallNut', 'Cactus', 'Blover', 'SplitPea', 'Starfruit',
            'MagnetShroom', 'CabbagePult', 'KernelPult', 'Garlic', 'Marigold', 
            'MelonPult', 'Gatling', 'TwinSunflower', 'GloomShroom', 'Cattail'
        ];

        const gardenTerms = [
            'Garden', 'Plant', 'Sun', 'Leaf', 'Root', 'Bloom', 'Petal', 'Stem',
            'Seed', 'Sprout', 'Vine', 'Thorn', 'Flower', 'Bud', 'Branch'
        ];

        const actionWords = [
            'Master', 'King', 'Queen', 'Lord', 'Champion', 'Hero', 'Warrior',
            'Guardian', 'Defender', 'Protector', 'Slayer', 'Hunter', 'Ranger',
            'Expert', 'Pro', 'Ace', 'Star', 'Legend', 'Commander', 'Captain',
            'Fighter', 'Crusher', 'Destroyer', 'Eliminator', 'Fan', 'Lover'
        ];

        const adjectives = [
            'Epic', 'Mighty', 'Super', 'Mega', 'Ultra', 'Elite', 'Legendary', 'Supreme',
            'Golden', 'Silver', 'Diamond', 'Mystic', 'Thunder', 'Lightning', 'Fire',
            'Wild', 'Fierce', 'Bold', 'Brave', 'Swift', 'Strong', 'Tough', 'Steel'
        ];

        // Different username generation patterns
        const patterns = [
            // Premium names (30% chance)
            () => this.getRandomElement(premiumNames),
            () => this.getRandomElement(premiumNames),
            () => this.getRandomElement(premiumNames),
            
            // Plant + Action (25% chance)
            () => this.getRandomElement(plantNames) + this.getRandomElement(actionWords),
            () => this.getRandomElement(plantNames) + this.getRandomElement(actionWords),
            
            // Adjective + Plant (20% chance)
            () => this.getRandomElement(adjectives) + this.getRandomElement(plantNames),
            () => this.getRandomElement(adjectives) + this.getRandomElement(plantNames),
            
            // Garden + Action (15% chance)
            () => this.getRandomElement(gardenTerms) + this.getRandomElement(actionWords),
            
            // Plant + Number (10% chance)
            () => this.getRandomElement(plantNames) + (Math.floor(Math.random() * 999) + 1)
        ];

        const selectedPattern = this.getRandomElement(patterns);
        return selectedPattern();
    }

    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    prefillSuggestedUsername(inputId) {
        const input = document.getElementById(inputId);
        if (input && !input.value.trim()) {
            const suggestedName = this.generateSuggestedUsername();
            input.value = suggestedName;
            input.setAttribute('data-suggested', 'true');
            
            // Add visual indication that it's a suggestion
            input.style.fontStyle = 'italic';
            input.style.color = '#FFD700';
            
        }
    }

    clearSuggestedUsername(inputId) {
        const input = document.getElementById(inputId);
        if (input && input.getAttribute('data-suggested') === 'true') {
            input.value = '';
            input.removeAttribute('data-suggested');
            input.style.fontStyle = 'normal';
            input.style.color = '#FFFFFF';
        }
    }

    setupUsernameInputHandlers(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        // Clear suggestion when user starts typing
        input.addEventListener('input', (e) => {
            if (e.target.getAttribute('data-suggested') === 'true') {
                e.target.removeAttribute('data-suggested');
                e.target.style.fontStyle = 'normal';
                e.target.style.color = '#FFFFFF';
            }
        });

        // Clear suggestion when user focuses (clicks) on input
        input.addEventListener('focus', (e) => {
            if (e.target.getAttribute('data-suggested') === 'true') {
                e.target.select(); // Select all text so user can easily replace it
            }
        });

        // Add suggestion button
        this.addSuggestionButton(inputId);
    }

    addSuggestionButton(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const inputGroup = input.closest('.input-group');
        if (!inputGroup) return;

        // Check if button already exists
        if (inputGroup.querySelector('.suggestion-btn')) return;

        const suggestionBtn = document.createElement('button');
        suggestionBtn.type = 'button';
        suggestionBtn.className = 'suggestion-btn';
        suggestionBtn.innerHTML = '🎲 Random Name';
        suggestionBtn.title = 'Generate a cool plant-themed username';

        suggestionBtn.addEventListener('click', () => {
            const newName = this.generateSuggestedUsername();
            input.value = newName;
            input.removeAttribute('data-suggested');
            input.style.fontStyle = 'normal';
            input.style.color = '#FFFFFF';
            
            // Add a brief highlight effect
            input.style.background = 'rgba(76, 175, 80, 0.3)';
            setTimeout(() => {
                input.style.background = 'rgba(0, 0, 0, 0.7)';
            }, 500);
            
            input.focus();
            
            // Show notification
            this.showNotification(`Generated username: ${newName}`, 'success');
            
        });

        inputGroup.appendChild(suggestionBtn);
    }

    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }

        // Set message and type
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    showLeaderboard() {
        this.hideAllScreens();
        document.getElementById('leaderboardScreen').style.display = 'block';
        this.loadLeaderboard('high_scores');
        this.loadGlobalStats();
    }

    async loadLeaderboard(category = 'high_scores') {
        
        // Show loading state
        document.getElementById('leaderboardLoading').style.display = 'block';
        document.getElementById('leaderboardList').style.display = 'none';
        document.getElementById('leaderboardEmpty').style.display = 'none';
        
        try {
            const response = await fetch(`/api/leaderboard/${category}`);
            const data = await response.json();
            
            
            if (data.length === 0) {
                this.showEmptyLeaderboard();
            } else {
                this.displayLeaderboard(data, category);
            }
            
        } catch (error) {
            console.error('❌ Failed to load leaderboard:', error);
            this.showEmptyLeaderboard();
        }
    }

    displayLeaderboard(entries, category) {
        
        const listContainer = document.getElementById('leaderboardList');
        listContainer.innerHTML = '';
        
        entries.forEach((entry, index) => {
            const rank = index + 1;
            const entryElement = this.createLeaderboardEntry(entry, rank, category);
            listContainer.appendChild(entryElement);
        });
        
        // Hide loading, show list
        document.getElementById('leaderboardLoading').style.display = 'none';
        document.getElementById('leaderboardList').style.display = 'block';
        document.getElementById('leaderboardEmpty').style.display = 'none';
    }

    createLeaderboardEntry(entry, rank, category) {
        const entryDiv = document.createElement('div');
        entryDiv.className = `leaderboard-entry rank-${rank <= 3 ? rank : 'other'}`;
        
        // Get category-specific display info
        const categoryInfo = this.getCategoryInfo(category);
        const scoreValue = this.formatScore(entry.score, category);
        
        // Generate player avatar emoji based on name
        const avatarEmoji = this.generatePlayerAvatar(entry.player);
        
        entryDiv.innerHTML = `
            <div class="rank-number">${this.getRankDisplay(rank)}</div>
            <div class="player-info">
                <div class="player-avatar">${avatarEmoji}</div>
                <div class="player-details">
                    <div class="player-name">${entry.player}</div>
                    <div class="player-subtitle">${categoryInfo.subtitle}</div>
                </div>
            </div>
            <div class="score-value">${scoreValue}</div>
        `;
        
        return entryDiv;
    }

    getCategoryInfo(category) {
        const categories = {
            'high_scores': {
                subtitle: 'Garden Defender',
                unit: 'points'
            },
            'zombies_killed': {
                subtitle: 'Zombie Slayer',
                unit: 'zombies'
            },
            'plants_planted': {
                subtitle: 'Green Thumb',
                unit: 'plants'
            },
            'waves_completed': {
                subtitle: 'Wave Master',
                unit: 'waves'
            },
            'games_won': {
                subtitle: 'Victory Champion',
                unit: 'wins'
            }
        };
        
        return categories[category] || { subtitle: 'Player', unit: 'points' };
    }

    formatScore(score, category) {
        const num = parseInt(score);
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        
        return num.toLocaleString();
    }

    getRankDisplay(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    }

    generatePlayerAvatar(playerName) {
        const avatars = ['🌻', '🌱', '🌿', '🍄', '🌵', '🌶️', '🍒', '🌰', '🥕', '🌽'];
        const hash = playerName.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return avatars[Math.abs(hash) % avatars.length];
    }

    showEmptyLeaderboard() {
        document.getElementById('leaderboardLoading').style.display = 'none';
        document.getElementById('leaderboardList').style.display = 'none';
        document.getElementById('leaderboardEmpty').style.display = 'block';
    }

    async loadGlobalStats() {
        
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            
            // Update stat displays
            document.getElementById('totalGamesPlayed').textContent = 
                this.formatStatValue(stats.totalGames || 0);
            document.getElementById('totalPlayers').textContent = 
                this.formatStatValue(stats.uniquePlayers || 0);
            document.getElementById('totalZombiesKilled').textContent = 
                this.formatStatValue(stats.zombiesKilled || 0);
            document.getElementById('totalPlantsPlanted').textContent = 
                this.formatStatValue(stats.plantsPlanted || 0);
                
        } catch (error) {
            console.error('❌ Failed to load global stats:', error);
            // Set default values
            document.getElementById('totalGamesPlayed').textContent = '-';
            document.getElementById('totalPlayers').textContent = '-';
            document.getElementById('totalZombiesKilled').textContent = '-';
            document.getElementById('totalPlantsPlanted').textContent = '-';
        }
    }

    formatStatValue(value) {
        const num = parseInt(value);
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        
        return num.toLocaleString();
    }

    async createNewGame() {
        const playerName = document.getElementById('newPlayerNameInput').value.trim();
        const gameMode = document.querySelector('input[name="newGameMode"]:checked').value;
        
        if (!playerName) {
            this.showNotification('Please enter your name', 'warning');
            return;
        }
        
        if (playerName.length > 20) {
            this.showNotification('Name must be 20 characters or less', 'warning');
            return;
        }
        
        try {
            this.showLoadingScreen('Creating new game...');
            
            this.socket.emit('join_game', {
                playerName: playerName,
                gameId: null, // Always null for new games
                gameMode: gameMode
            });
            
        } catch (error) {
            console.error('❌ Error creating new game:', error);
            this.hideLoadingScreen();
            this.showNotification('Failed to create game', 'error');
        }
    }

    async loadSavedGames(playerName) {
        try {
            
            const response = await fetch(`/api/player/${encodeURIComponent(playerName)}/games`);
            const games = await response.json();
            
            this.displaySavedGames(games);
            
        } catch (error) {
            console.error('❌ Failed to load saved games:', error);
            this.hideSavedGames();
            this.showNotification('Failed to load saved games', 'error');
        }
    }

    displaySavedGames(games) {
        const savedGamesList = document.getElementById('savedGamesList');
        const noSavedGamesMessage = document.getElementById('noSavedGamesMessage');
        const savedGamesContainer = document.getElementById('savedGamesContainer');
        const savedGamesCount = document.getElementById('savedGamesCount');
        
        if (games.length === 0) {
            savedGamesList.style.display = 'none';
            noSavedGamesMessage.style.display = 'block';
            return;
        }
        
        // Show saved games list
        savedGamesList.style.display = 'block';
        noSavedGamesMessage.style.display = 'none';
        
        // Update count
        savedGamesCount.textContent = `${games.length} game${games.length > 1 ? 's' : ''} found`;
        
        // Clear existing games
        savedGamesContainer.innerHTML = '';
        
        // Add each saved game
        games.forEach((game, index) => {
            const gameItem = document.createElement('div');
            gameItem.className = 'saved-game-item';
            gameItem.dataset.gameId = game.gameId;
            
            // Create a friendly game name
            const gameDate = new Date(game.createdAt);
            const gameName = this.generateGameName(game, gameDate);
            const timeAgo = this.formatTimeSince(game.lastActivity);
            const statusIcon = this.getStatusIcon(game.status);
            const modeIcon = this.getModeIcon(game.mode);
            
            gameItem.innerHTML = `
                <div class="save-game-header">
                    <div class="save-game-name">
                        ${statusIcon} ${gameName}
                    </div>
                    <div class="save-game-status status-${game.status}">
                        ${game.status.toUpperCase()}
                    </div>
                </div>
                <div class="save-game-details">
                    <div class="save-detail-item">
                        ${modeIcon} ${this.formatMode(game.mode)}
                    </div>
                    <div class="save-detail-item">
                        👥 ${game.players} player${game.players > 1 ? 's' : ''}
                    </div>
                    <div class="save-detail-item">
                        🌊 Wave ${game.wave}
                    </div>
                    <div class="save-detail-item">
                        ☀️ ${game.playerSun} sun
                    </div>
                    <div class="save-detail-item">
                        📅 ${gameDate.toLocaleDateString()}
                    </div>
                    <div class="save-detail-item">
                        ⏰ ${timeAgo}
                    </div>
                </div>
                <div class="save-game-actions">
                    <button class="load-save-btn" onclick="window.gameClient.loadSavedGame('${game.gameId}')">
                        ${game.status === 'paused' ? '▶️ Resume' : '🔄 Continue'}
                    </button>
                    <button class="delete-save-btn" onclick="window.gameClient.deleteSavedGame('${game.gameId}')">
                        🗑️ Delete
                    </button>
                </div>
            `;
            
            savedGamesContainer.appendChild(gameItem);
        });
    }

    hideSavedGames() {
        document.getElementById('savedGamesList').style.display = 'none';
        document.getElementById('noSavedGamesMessage').style.display = 'none';
    }

    async loadSavedGame(gameId) {
        const playerName = document.getElementById('resumePlayerNameInput').value.trim();
        
        if (!playerName) {
            this.showNotification('Please enter your player name', 'warning');
            return;
        }
        
        try {
            this.showLoadingScreen('Loading saved game...');
            
            this.socket.emit('join_game', {
                playerName: playerName,
                gameId: gameId,
                gameMode: 'cooperative' // Mode doesn't matter for existing games
            });
            
        } catch (error) {
            console.error('❌ Error loading saved game:', error);
            this.hideLoadingScreen();
            this.showNotification('Failed to load saved game', 'error');
        }
    }

    async deleteSavedGame(gameId) {
        if (!confirm('Are you sure you want to delete this saved game? This action cannot be undone.')) {
            return;
        }
        
        try {
            this.showNotification('Delete functionality coming soon!', 'info');
            
        } catch (error) {
            console.error('❌ Error deleting saved game:', error);
            this.showNotification('Failed to delete saved game', 'error');
        }
    }

    resumeGame(gameId) {
        const playerName = document.getElementById('playerNameInput').value.trim();
        
        if (!playerName) {
            this.showNotification('Please enter your player name first', 'error');
            return;
        }
        
        // Set the game ID input and join the game
        document.getElementById('gameIdInput').value = gameId;
        
        try {
            this.joinGame();
        } catch (error) {
            console.error('❌ Error calling joinGame():', error);
        }
    }

    showActiveGamesList() {
        const activeGamesList = document.getElementById('activeGamesList');
        if (activeGamesList.style.display === 'none') {
            activeGamesList.style.display = 'block';
        } else {
            activeGamesList.style.display = 'none';
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
        
        // Load active games if player name is available
        const playerName = document.getElementById('playerNameInput').value.trim();
        if (playerName.length >= 2) {
            this.loadPlayerActiveGames(playerName);
        }
        
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

    // ==========================================
    // AUDIO CONTROLS
    // ==========================================

    toggleMusic() {
        const musicBtn = document.getElementById('musicToggle');
        const isMuted = musicBtn.classList.contains('muted');
        
        if (isMuted) {
            // Unmute music
            window.audioManager.setMusicVolume(0.3);
            musicBtn.classList.remove('muted');
            musicBtn.textContent = '🎵';
            musicBtn.title = 'Mute Music';
        } else {
            // Mute music
            window.audioManager.setMusicVolume(0);
            musicBtn.classList.add('muted');
            musicBtn.textContent = '🔇';
            musicBtn.title = 'Unmute Music';
        }
    }

    toggleSFX() {
        const sfxBtn = document.getElementById('sfxToggle');
        const isMuted = sfxBtn.classList.contains('muted');
        
        if (isMuted) {
            // Unmute SFX
            window.audioManager.setSFXVolume(0.5);
            sfxBtn.classList.remove('muted');
            sfxBtn.textContent = '🔊';
            sfxBtn.title = 'Mute Sound Effects';
        } else {
            // Mute SFX
            window.audioManager.setSFXVolume(0);
            sfxBtn.classList.add('muted');
            sfxBtn.textContent = '🔇';
            sfxBtn.title = 'Unmute Sound Effects';
        }
    }

    showAudioControls() {
        document.getElementById('audioControls').style.display = 'flex';
    }

    hideAudioControls() {
        document.getElementById('audioControls').style.display = 'none';
    }
}

// Initialize the game client when the page loads
window.addEventListener('load', () => {
    window.gameClient = new PlantsVsZombiesClient();
});
