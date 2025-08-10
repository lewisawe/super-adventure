#!/bin/bash

# Plants vs Zombies - Redis Edition Production Startup Script

set -e  # Exit on any error

echo "🌻 Starting Plants vs Zombies - Redis Edition"
echo "=============================================="

# Create necessary directories
mkdir -p logs
mkdir -p backups

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "🔴 Redis server is not running"
    echo "📡 Starting Redis server..."
    redis-server --daemonize yes
    sleep 2
    
    if pgrep -x "redis-server" > /dev/null; then
        echo "✅ Redis server started successfully"
    else
        echo "❌ Failed to start Redis server"
        echo "Please install Redis or start it manually:"
        echo "  sudo apt-get install redis-server"
        echo "  redis-server --daemonize yes"
        exit 1
    fi
else
    echo "✅ Redis server is already running"
fi

# Check Redis connection
echo "🔍 Testing Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis connection successful"
else
    echo "❌ Cannot connect to Redis"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version)
echo "📦 Node.js version: $NODE_VERSION"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set production environment
export NODE_ENV=production

# Start the game server
echo "🚀 Starting Plants vs Zombies server..."
echo ""
echo "🎮 Game: http://localhost:3001"
echo "📊 API: http://localhost:3001/api"
echo "🏥 Health: http://localhost:3001/api/health"
echo "📈 Stats: http://localhost:3001/api/stats"
echo "🏆 Leaderboard: http://localhost:3001/api/leaderboard/high_scores"
echo ""
echo "📝 Logs: tail -f logs/server.log"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Start the Node.js server with logging
node server.js 2>&1 | tee -a logs/server.log
