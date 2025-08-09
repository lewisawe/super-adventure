#!/bin/bash

# Plants vs Zombies - Redis Edition Startup Script

echo "🌻 Starting Plants vs Zombies - Redis Edition"
echo "=============================================="

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

# Start the game server
echo "🚀 Starting Plants vs Zombies server..."
echo ""
echo "🎮 Game will be available at: http://localhost:3000"
echo "📊 API will be available at: http://localhost:3000/api"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the Node.js server
npm start
