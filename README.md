# 🌻 Plants vs Zombies - Redis Edition

A multiplayer Plants vs Zombies tower defense game showcasing **Redis as a multi-model platform** - going far beyond simple caching to demonstrate Redis's capabilities as a complete application database.

![Plants vs Zombies Banner](https://img.shields.io/badge/Redis-Multi--Model-red?style=for-the-badge&logo=redis)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-blue?style=for-the-badge&logo=socket.io)

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- Redis Server 6+
- Modern web browser

### One-Command Deployment

```bash
git clone <repository-url>
cd plants-vs-zombies-redis
./start.sh
```

**Game**: http://localhost:3001  
**API**: http://localhost:3001/api  
**Health**: http://localhost:3001/api/health

## 🎯 Beyond the Cache Challenge

This project demonstrates Redis as a **powerful, multi-model platform** rather than just a cache:

### 🗄️ **Primary Database** (Hashes)
- Complete game state persistence
- Player profiles with stats, achievements, unlocked content
- No traditional database required - Redis IS the database

### 📡 **Real-time Pub/Sub**
- Live multiplayer game updates (plant placements, zombie movements)
- Wave notifications and game events
- Real-time player status updates

### 📊 **Streams for Event Sourcing**
- Complete game replay capability
- Analytics pipeline for game insights
- Automatic event cleanup and management

### 🏆 **Sorted Sets for Leaderboards**
- Global high scores with automatic ranking
- Category-specific leaderboards (zombies killed, plants placed)
- Real-time score updates

### 📋 **Lists for Lane Management**
- Efficient zombie queues per lane
- FIFO operations for game mechanics
- Lane-specific operations

### 👥 **Sets for Session Management**
- Active games and player tracking
- Real-time lobby management
- Efficient membership operations

### 📈 **Analytics & Metrics**
- HyperLogLog for memory-efficient unique player counting
- Counters for game statistics
- Performance monitoring

## 🎮 Game Features

### 🌱 **Plants Arsenal**
- **🌻 Sunflower**: Produces sun for economy
- **🌱 Peashooter**: Basic projectile damage
- **❄️ Snow Pea**: Slowing projectiles
- **🌰 Wall-nut**: High-health defensive barrier
- **🍒 Cherry Bomb**: Area-of-effect explosion
- **🌶️ Jalapeno**: Full-lane destruction
- **🌵 Cactus**: Anti-air capabilities
- **🍄 Puff-shroom**: Free short-range defense

### 🧟 **Zombie Horde**
- **🧟 Basic Zombie**: Standard threat
- **🧟‍♂️ Conehead**: Armored zombie
- **🧟‍♀️ Buckethead**: Heavy armor
- **🏃‍♂️ Runner**: Fast-moving threat
- **🦘 Pole Vaulter**: Jumps over first plant
- **🎈 Balloon**: Flying zombie
- **👑 Boss Zombies**: Massive health and damage

### ⚡ **Power-ups System**
- **☀️ Sun Boost**: Instant sun generation
- **⚡ Speed Boost**: Accelerated plant actions
- **🛡️ Plant Shield**: Damage reduction
- **💥 Damage Boost**: Increased plant damage

### 🎯 **Game Modes**
- **🤝 Cooperative**: Team up against zombies
- **⚔️ Versus**: Competitive multiplayer
- **🏃 Survival**: Endless wave challenge

### 🏆 **Real-Time Leaderboards**
- **High Scores**: Overall game performance
- **Zombies Killed**: Combat effectiveness
- **Plants Planted**: Strategic deployment
- **Waves Completed**: Survival achievements
- **Games Won**: Victory statistics

### 🎲 **Smart Username System**
- Auto-generated plant-themed usernames
- Random name generator with 🎲 button
- Names like: `GardenMaster`, `ZombieSlayer`, `EpicSunflower`

## 🚀 Deployment Options

### Local Development
```bash
./start.sh
```

### Docker Deployment
```bash
# Single container
docker build -t pvz-redis .
docker run -p 3001:3001 pvz-redis

# Multi-container (recommended)
docker-compose up -d
```

### Production Server
```bash
# Install dependencies
sudo apt-get install nodejs npm redis-server

# Deploy application
git clone <repository-url>
cd plants-vs-zombies-redis
npm install --production
./start.sh
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🎯 How to Play

### 1. **Join a Game**
- Enter your player name (or use suggested username)
- Choose game mode (Cooperative/Versus/Survival)
- Optionally enter a game ID to join existing game

### 2. **Plant Strategy**
- Start with **🌻 Sunflowers** for economy
- Place **🌱 Peashooters** for basic defense
- Use **🌰 Wall-nuts** to protect valuable plants
- **🍒 Cherry Bombs** for emergency crowd control

### 3. **Wave Management**
- Prepare for boss waves (every 5 waves)
- Use power-ups strategically
- Coordinate with teammates in multiplayer

### 4. **Advanced Tactics**
- **❄️ Snow Peas** slow zombies for better targeting
- **🌵 Cactus** can hit flying **🎈 Balloon Zombies**
- **🌶️ Jalapenos** clear entire lanes instantly

## 🏗️ Architecture

### Backend Components

```
server.js           # Express server with Socket.IO
game-engine.js      # Core game logic and mechanics
redis-client.js     # Multi-model Redis operations
config/game-config.js # Game balance and configuration
```

### Frontend Components

```
public/index.html      # Main game interface
public/styles.css      # Responsive game styling
public/game-client.js  # Client-side game logic
```

### Redis Data Structures

```bash
# Game States (Hashes)
game:{gameId}:state -> Complete game state as JSON

# Player Data (Hashes)
player:{playerId}:data -> Profile, stats, achievements

# Event Sourcing (Streams)
game:{gameId}:events -> All game events for replay

# Leaderboards (Sorted Sets)
leaderboard:high_scores -> Global high scores
leaderboard:zombies_killed -> Zombie kill rankings

# Lane Management (Lists)
game:{gameId}:lane:{laneIndex}:zombies -> Zombie queues

# Active Games (Sets)
active_games -> Set of active game IDs
game:{gameId}:players -> Players in game

# Analytics (Various)
counter:total_games -> Game counter
counter:plants_planted -> Plant counter
hll:unique_players -> Unique player count (HyperLogLog)
```

## 📊 API Endpoints

### Game Management
```bash
# Health check
GET /api/health

# Global statistics
GET /api/stats

# Active games
GET /api/games/active
```

### Leaderboards
```bash
# Get leaderboard by category
GET /api/leaderboard/high_scores
GET /api/leaderboard/zombies_killed
GET /api/leaderboard/plants_planted
GET /api/leaderboard/waves_completed
GET /api/leaderboard/games_won
```

### Player Data
```bash
# Get player data
GET /api/player/{playerName}
```

## 🧪 Demo & Testing

### Interactive Demo

```bash
# Demonstrates all Redis multi-model capabilities
node demo.js
```

The demo showcases:
- ✅ Primary database operations
- ✅ Real-time pub/sub messaging
- ✅ Event sourcing with streams
- ✅ Leaderboard management
- ✅ Lane-based operations
- ✅ Analytics and metrics

## 📊 Redis Performance Benefits

### Memory Efficiency
- **Compressed JSON**: Game states stored efficiently
- **HyperLogLog**: ~12KB for millions of unique players
- **Automatic Cleanup**: TTL and size limits prevent memory bloat

### Real-time Performance
- **Sub-millisecond**: Pub/Sub message delivery
- **Zero Polling**: Event-driven updates only
- **Horizontal Scaling**: Redis Cluster support ready

### Data Persistence
- **RDB Snapshots**: Point-in-time game state backups
- **AOF Logging**: Every game action persisted
- **Replication**: Master-slave setup for high availability

## 🔧 Configuration

### Game Balance

Edit `config/game-config.js` to adjust:
- Plant costs and damage
- Zombie health and speed
- Wave patterns and difficulty
- Power-up effects and cooldowns

### Environment Variables

Copy `.env.example` to `.env` and configure:
```bash
NODE_ENV=production
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
MAX_PLAYERS_PER_GAME=4
```

## 📈 Monitoring & Analytics

### Health Monitoring

```bash
# Application health
curl http://localhost:3001/api/health

# Redis monitoring
redis-cli monitor

# View logs
npm run logs
```

### Game Analytics

The game automatically tracks:
- Total games played
- Unique players (HyperLogLog)
- Plants planted and zombies killed
- Player progression and achievements
- Game session duration and outcomes

## 🐛 Troubleshooting

### Common Issues

**Redis Connection Failed**
```bash
redis-cli ping
redis-server --daemonize yes
```

**Game Not Loading**
- Check browser console for JavaScript errors
- Ensure all dependencies are installed (`npm install`)
- Verify Redis server is accessible

**Performance Issues**
```bash
# Check Redis latency
redis-cli --latency

# Monitor memory usage
redis-cli info memory
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive troubleshooting.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure Redis operations are efficient
5. Update documentation
6. Submit a pull request

## 📜 License

MIT License - Feel free to use this project as a reference for Redis multi-model applications.

## 🎉 Acknowledgments

- **Redis Team** for creating an amazing multi-model platform
- **Plants vs Zombies** for the original game inspiration
- **Socket.IO** for real-time communication
- **Node.js** community for excellent tooling

---

## 🌟 Why This Showcases "Beyond the Cache"

This project demonstrates Redis as a **complete application platform**:

1. **🗄️ Primary Database**: No SQL database needed - Redis stores everything
2. **📡 Real-time Engine**: Pub/Sub handles all live updates
3. **📊 Analytics Platform**: Built-in counters, sets, and HyperLogLog
4. **🔄 Event Sourcing**: Streams provide complete audit trails
5. **🏆 Ranking System**: Sorted sets for leaderboards
6. **⚡ High Performance**: Sub-millisecond operations
7. **📈 Scalability**: Ready for Redis Cluster deployment

**Redis isn't just a cache here - it's the entire backend infrastructure!**

---

**Ready to defend your lawn? 🌻🧟‍♂️**

*Start the game and experience Redis multi-model power in action!*
