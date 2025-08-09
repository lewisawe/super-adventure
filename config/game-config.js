// Plants vs Zombies Game Configuration

const GAME_CONFIG = {
    // Game Board
    BOARD: {
        ROWS: 5,           // 5 lanes
        COLS: 9,           // 9 columns
        CELL_SIZE: 80,     // pixels
        LAWN_MOWER_COL: 0  // Column where lawn mowers are placed
    },

    // Game Mechanics
    GAMEPLAY: {
        INITIAL_SUN: 50,
        SUN_FALL_INTERVAL: 10000,    // 10 seconds
        SUN_FALL_AMOUNT: 25,
        WAVE_DELAY: 30000,           // 30 seconds between waves
        MAX_WAVES: 10,
        ZOMBIE_SPAWN_INTERVAL: 5000, // 5 seconds
        GAME_SPEED: 60               // FPS target
    },

    // Plants Configuration
    PLANTS: {
        '🌻': { // Sunflower
            name: 'Sunflower',
            cost: 50,
            health: 300,
            cooldown: 7500,
            sunProduction: 25,
            sunInterval: 24000,
            description: 'Produces sun for planting other plants'
        },
        '🌱': { // Peashooter
            name: 'Peashooter',
            cost: 100,
            health: 300,
            cooldown: 7500,
            damage: 20,
            fireRate: 1400,
            projectileSpeed: 5,
            description: 'Shoots peas at zombies'
        },
        '❄️': { // Snow Pea
            name: 'Snow Pea',
            cost: 175,
            health: 300,
            cooldown: 7500,
            damage: 20,
            fireRate: 1400,
            projectileSpeed: 5,
            slowEffect: 0.5,
            slowDuration: 3000,
            description: 'Shoots frozen peas that slow zombies'
        },
        '🌰': { // Wall-nut
            name: 'Wall-nut',
            cost: 50,
            health: 4000,
            cooldown: 30000,
            description: 'Blocks zombies with high health'
        },
        '🍒': { // Cherry Bomb
            name: 'Cherry Bomb',
            cost: 150,
            health: 1,
            cooldown: 50000,
            damage: 1800,
            explosionRadius: 1.5,
            fuseTime: 1500,
            description: 'Explodes and destroys all zombies in a 3x3 area'
        },
        '🌶️': { // Jalapeno
            name: 'Jalapeno',
            cost: 125,
            health: 1,
            cooldown: 50000,
            damage: 1800,
            fuseTime: 2000,
            description: 'Destroys all zombies in its lane'
        },
        '🌵': { // Cactus
            name: 'Cactus',
            cost: 125,
            health: 300,
            cooldown: 7500,
            damage: 20,
            fireRate: 1400,
            projectileSpeed: 5,
            canHitFlying: true,
            description: 'Shoots spikes, can hit flying zombies'
        },
        '🍄': { // Puff-shroom
            name: 'Puff-shroom',
            cost: 0,
            health: 300,
            cooldown: 7500,
            damage: 20,
            fireRate: 1400,
            range: 3,
            sleepsDuringDay: true,
            description: 'Free mushroom that shoots short range'
        }
    },

    // Zombies Configuration with Proper Speed Values (pixels per second)
    ZOMBIES: {
        '🧟': { // Basic Zombie
            name: 'Basic Zombie',
            health: 200,
            speed: 8, // Slower zombie-like speed (was 15)
            damage: 100,
            attackRate: 1000,
            points: 10,
            description: 'A regular zombie'
        },
        '🧟‍♂️': { // Conehead Zombie
            name: 'Conehead Zombie',
            health: 640,
            speed: 6, // Slower due to cone weight (was 12)
            damage: 100,
            attackRate: 1000,
            points: 20,
            description: 'Zombie with a traffic cone for extra protection'
        },
        '🧟‍♀️': { // Buckethead Zombie
            name: 'Buckethead Zombie',
            health: 1370,
            speed: 5, // Very slow due to heavy bucket (was 10)
            damage: 100,
            attackRate: 1000,
            points: 30,
            description: 'Zombie with a bucket for maximum protection'
        },
        '🏃‍♂️': { // Runner Zombie
            name: 'Runner Zombie',
            health: 200,
            speed: 18, // Fast but not crazy fast (was 35)
            damage: 100,
            attackRate: 1000,
            points: 15,
            description: 'Fast zombie that runs'
        },
        '🦘': { // Pole Vaulting Zombie
            name: 'Pole Vaulting Zombie',
            health: 500,
            speed: 25, // Fast until it vaults, then normal speed
            damage: 100,
            attackRate: 1000,
            canVault: true,
            points: 25,
            description: 'Zombie that can vault over the first plant'
        },
        '🎈': { // Balloon Zombie
            name: 'Balloon Zombie',
            health: 280,
            speed: 20, // Moderate flying speed
            damage: 100,
            attackRate: 1000,
            flying: true,
            points: 35,
            description: 'Flying zombie that can only be hit by cactus'
        },
        '👑': { // Boss Zombie
            name: 'Boss Zombie',
            health: 3000,
            speed: 8, // Very slow but devastating
            damage: 200,
            attackRate: 800,
            points: 100,
            isBoss: true,
            description: 'Massive zombie boss'
        }
    },

    // Enhanced Wave System with Timeline
    WAVE_SYSTEM: {
        FIRST_WAVE_DELAY: 45000,        // 45 seconds before first wave
        PREPARATION_TIME: 30000,        // 30 seconds between waves
        HORDE_SPAWN_RATE: 500,         // Spawn every 0.5 seconds during horde
        NORMAL_SPAWN_RATE: 2000        // Spawn every 2 seconds normally
    },

    // Wave Patterns with Timeline-based Events
    WAVES: [
        { // Wave 1 - Tutorial Wave
            timeline: [
                { time: 0, event: 'spawn', zombies: [{ type: '🧟', count: 1, lanes: 'random' }] },
                { time: 10000, event: 'spawn', zombies: [{ type: '🧟', count: 1, lanes: 'random' }] },
                { time: 20000, event: 'spawn', zombies: [{ type: '🧟', count: 2, lanes: 'random' }] }
            ],
            zombiePool: ['🧟'],
            duration: 30000,
            message: 'The zombies are coming! Plant some defenses!'
        },
        { // Wave 2 - Introduction of Conehead
            timeline: [
                { time: 0, event: 'spawn', zombies: [{ type: '🧟', count: 2, lanes: 'random' }] },
                { time: 8000, event: 'spawn', zombies: [{ type: '🧟‍♂️', count: 1, lanes: 'random' }] },
                { time: 15000, event: 'spawn', zombies: [{ type: '🧟', count: 2, lanes: 'random' }] },
                { time: 25000, event: 'spawn', zombies: [{ type: '🧟', count: 1, lanes: 'random' }] }
            ],
            zombiePool: ['🧟', '🧟‍♂️'],
            duration: 35000,
            message: 'Conehead zombies appear! They have extra protection!'
        },
        { // Wave 3 - First Horde Event
            timeline: [
                { time: 0, event: 'spawn', zombies: [{ type: '🧟', count: 3, lanes: 'random' }] },
                { time: 12000, event: 'horde_start', duration: 15000, spawnRate: 1000 },
                { time: 30000, event: 'spawn', zombies: [{ type: '🧟‍♂️', count: 2, lanes: 'random' }] }
            ],
            zombiePool: ['🧟', '🧟‍♂️'],
            duration: 40000,
            message: 'Zombie horde incoming! Prepare your defenses!'
        },
        { // Wave 4 - Speed Variety
            timeline: [
                { time: 0, event: 'spawn', zombies: [{ type: '🧟', count: 2, lanes: 'random' }] },
                { time: 10000, event: 'spawn', zombies: [{ type: '🏃‍♂️', count: 2, lanes: 'random' }] },
                { time: 18000, event: 'spawn', zombies: [{ type: '🧟‍♂️', count: 1, lanes: 'random' }] },
                { time: 25000, event: 'spawn', zombies: [{ type: '🏃‍♂️', count: 1, lanes: 'random' }] },
                { time: 35000, event: 'spawn', zombies: [{ type: '🧟', count: 3, lanes: 'random' }] }
            ],
            zombiePool: ['🧟', '🧟‍♂️', '🏃‍♂️'],
            duration: 45000,
            message: 'Fast zombies detected! Watch out for runners!'
        },
        { // Wave 5 - Boss Wave
            timeline: [
                { time: 0, event: 'spawn', zombies: [{ type: '🧟', count: 4, lanes: 'random' }] },
                { time: 15000, event: 'horde_start', duration: 20000, spawnRate: 800 },
                { time: 40000, event: 'spawn', zombies: [{ type: '👑', count: 1, lanes: 'center' }] },
                { time: 45000, event: 'spawn', zombies: [{ type: '🧟‍♂️', count: 2, lanes: 'random' }] }
            ],
            zombiePool: ['🧟', '🧟‍♂️', '🏃‍♂️', '👑'],
            duration: 60000,
            isBossWave: true,
            message: 'BOSS WAVE! A massive zombie approaches!'
        }
    ],

    // Multiplayer Settings
    MULTIPLAYER: {
        MAX_PLAYERS_PER_GAME: 4,
        GAME_MODES: {
            COOPERATIVE: 'cooperative',    // Players work together
            VERSUS: 'versus',             // Players compete
            SURVIVAL: 'survival'          // Endless waves
        },
        LOBBY_TIMEOUT: 60000,            // 1 minute
        TURN_TIME_LIMIT: 30000           // 30 seconds per turn
    },

    // Scoring System
    SCORING: {
        ZOMBIE_KILL_BASE: 10,
        BOSS_KILL_BONUS: 100,
        WAVE_COMPLETION_BONUS: 50,
        SURVIVAL_BONUS_PER_SECOND: 1,
        PLANT_EFFICIENCY_BONUS: 5,
        PERFECT_WAVE_BONUS: 100,
        MULTIPLAYER_BONUS: 1.5
    },

    // Power-ups and Special Items
    POWERUPS: {
        '☀️': { // Extra Sun
            name: 'Sun Boost',
            effect: 'sun',
            amount: 100,
            duration: 0,
            cooldown: 60000
        },
        '⚡': { // Speed Boost
            name: 'Speed Boost',
            effect: 'speed',
            multiplier: 2,
            duration: 10000,
            cooldown: 90000
        },
        '🛡️': { // Plant Shield
            name: 'Plant Shield',
            effect: 'shield',
            multiplier: 2,
            duration: 15000,
            cooldown: 120000
        },
        '💥': { // Damage Boost
            name: 'Damage Boost',
            effect: 'damage',
            multiplier: 3,
            duration: 12000,
            cooldown: 100000
        }
    },

    // Achievement System
    ACHIEVEMENTS: {
        FIRST_PLANT: {
            name: 'Gardener',
            description: 'Plant your first plant',
            points: 10
        },
        FIRST_ZOMBIE_KILL: {
            name: 'Zombie Hunter',
            description: 'Kill your first zombie',
            points: 10
        },
        WAVE_SURVIVOR: {
            name: 'Wave Survivor',
            description: 'Complete your first wave',
            points: 25
        },
        BOSS_SLAYER: {
            name: 'Boss Slayer',
            description: 'Defeat a boss zombie',
            points: 50
        },
        PERFECT_DEFENSE: {
            name: 'Perfect Defense',
            description: 'Complete a wave without losing any plants',
            points: 75
        },
        GAME_WINNER: {
            name: 'Lawn Defender',
            description: 'Win your first game',
            points: 100
        },
        MULTIPLAYER_CHAMPION: {
            name: 'Multiplayer Champion',
            description: 'Win 10 multiplayer games',
            points: 200
        }
    }
};

module.exports = GAME_CONFIG;
