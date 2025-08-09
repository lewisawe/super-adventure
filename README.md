# 🌻 Plants vs Zombies - Redis Edition

A multiplayer Plants vs Zombies tower defense game showcasing **Redis as a multi-model platform** - going far beyond simple caching to demonstrate Redis's capabilities as a complete application database.

![Plants vs Zombies Banner](https://img.shields.io/badge/Redis-Multi--Model-red?style=for-the-badge&logo=redis)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-blue?style=for-the-badge&logo=socket.io)

## 🎯 Beyond the Cache Challenge

This project demonstrates Redis as a **powerful, multi-model platform** rather than just a cache:

### 🗄️ **Primary Database** (Hashes)
- Complete game state persistence
- Player profiles with stats, achievements, unlocked content
- No traditional database required - Redis IS the database

### 📡 **Real-time Pub/Sub**
- Live multiplayer game updates (plant placements, zombie movements)
- Chat system with zero polling
- Wave notifications and game events

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

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- Redis Server 6+
- Modern web browser

### Installation

```bash
# Clone or navigate to the project
cd /home/sierra/Desktop/projects/plantsVsZombies

# Install dependencies
npm install

# Start the game (includes Redis check)
./start.sh
```

### Manual Setup

```bash
# Start Redis server
redis-server --daemonize yes

# Start the game server
npm start
```

### Access the Game

- **Game**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Stats**: http://localhost:3000/api/stats

## 🎯 How to Play

### 1. **Join a Game**
- Enter your player name
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

## 🧪 Demo & Testing

### Run the Interactive Demo

```bash
# Demonstrates all Redis multi-model capabilities
./demo.js
```

The demo showcases:
- ✅ Primary database operations
- ✅ Real-time pub/sub messaging
- ✅ Event sourcing with streams
- ✅ Leaderboard management
- ✅ Lane-based operations
- ✅ Analytics and metrics

### API Endpoints

```bash
# Get leaderboard
curl http://localhost:3000/api/leaderboard/high_scores

# Get player data
curl http://localhost:3000/api/player/PlayerName

# Get active games
curl http://localhost:3000/api/games/active

# Get global statistics
curl http://localhost:3000/api/stats
```

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

## 🎨 Customization

### Adding New Plants

```javascript
// In config/game-config.js
PLANTS: {
    '🌸': {
        name: 'Cherry Blossom',
        cost: 200,
        health: 300,
        damage: 25,
        fireRate: 1200,
        special: 'charm' // Custom ability
    }
}
```

### Adding New Zombies

```javascript
// In config/game-config.js
ZOMBIES: {
    '🤖': {
        name: 'Robot Zombie',
        health: 800,
        speed: 1.5,
        damage: 150,
        special: 'electromagnetic' // Custom ability
    }
}
```

### Custom Game Modes

```javascript
// In game-engine.js
async createGame(hostPlayerId, gameMode = 'custom') {
    // Implement custom game mode logic
}
```

## 🔧 Configuration

### Game Balance

Edit `config/game-config.js` to adjust:
- Plant costs and damage
- Zombie health and speed
- Wave patterns and difficulty
- Power-up effects and cooldowns

### Redis Settings

```javascript
// In redis-client.js
const client = redis.createClient({
    host: 'localhost',
    port: 6379,
    // Add custom Redis configuration
});
```

## 📈 Monitoring & Analytics

### Redis Monitoring

```bash
# Monitor Redis operations
redis-cli monitor

# Check memory usage
redis-cli info memory

# View active connections
redis-cli client list

# Check key statistics
redis-cli --scan --pattern "game:*" | wc -l
```

### Game Analytics

The game automatically tracks:
- Total games played
- Unique players (HyperLogLog)
- Plants planted and zombies killed
- Player progression and achievements
- Game session duration and outcomes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure Redis operations are efficient
5. Update documentation
6. Submit a pull request

### Development Setup

```bash
# Install development dependencies
npm install --dev

# Run tests
npm test

# Start development server with auto-reload
npm run dev
```

## 🐛 Troubleshooting

### Common Issues

**Redis Connection Failed**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis if needed
redis-server --daemonize yes
```

**Game Not Loading**
- Check browser console for JavaScript errors
- Ensure all dependencies are installed (`npm install`)
- Verify Redis server is accessible

**Multiplayer Issues**
- Check firewall settings for port 3000
- Ensure Socket.IO connections are not blocked
- Verify Redis pub/sub is working (`redis-cli monitor`)

### Performance Optimization

**High Memory Usage**
- Adjust TTL values in Redis operations
- Implement game state cleanup routines
- Use Redis memory optimization settings

**Slow Game Updates**
- Check Redis latency (`redis-cli --latency`)
- Optimize game loop frequency
- Implement client-side prediction

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
