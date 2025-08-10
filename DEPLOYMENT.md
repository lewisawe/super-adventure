# 🚀 Deployment Guide

This guide covers different deployment options for Plants vs Zombies - Redis Edition.

## 📋 Prerequisites

- **Node.js** 14+ and npm 6+
- **Redis** 6+ server
- **Linux/macOS** (recommended) or Windows with WSL

## 🎯 Quick Deployment

### Option 1: Local Deployment

```bash
# Clone and setup
git clone <repository-url>
cd plants-vs-zombies-redis

# Run cleanup and start
./deploy-cleanup.sh
./start.sh
```

### Option 2: Docker Deployment

```bash
# Single container (includes Redis)
docker build -t pvz-redis .
docker run -p 3001:3001 pvz-redis

# Multi-container (recommended)
docker-compose up -d
```

### Option 3: Production Server

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install nodejs npm redis-server

# Setup application
git clone <repository-url>
cd plants-vs-zombies-redis
npm install --production

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start services
sudo systemctl start redis
./start.sh
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Game Settings
MAX_PLAYERS_PER_GAME=4
GAME_TIMEOUT=3600000
```

### Redis Configuration

For production, configure Redis with:

```bash
# /etc/redis/redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
save 900 1
save 300 10
save 60 10000
```

## 🌐 Reverse Proxy Setup

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring

### Health Checks

```bash
# Application health
curl http://localhost:3001/api/health

# Redis health
redis-cli ping

# System monitoring
npm run logs
```

### Metrics Endpoints

- **Health**: `/api/health`
- **Statistics**: `/api/stats`
- **Leaderboard**: `/api/leaderboard/high_scores`

## 🔒 Security

### Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow application port (if direct access needed)
sudo ufw allow 3001

# Redis (only if external access needed)
sudo ufw allow from trusted_ip to any port 6379
```

### SSL/TLS Setup

Use Let's Encrypt with Certbot:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🔄 Process Management

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'plants-vs-zombies',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Using Systemd

```bash
# Create service file
sudo tee /etc/systemd/system/plants-vs-zombies.service << EOF
[Unit]
Description=Plants vs Zombies Redis Edition
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/plants-vs-zombies-redis
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable plants-vs-zombies
sudo systemctl start plants-vs-zombies
```

## 📦 Backup Strategy

### Automated Backups

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
redis-cli --rdb backups/redis-backup-$DATE.rdb
find backups -name "*.rdb" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## 🚨 Troubleshooting

### Common Issues

**Redis Connection Failed**
```bash
# Check Redis status
sudo systemctl status redis
redis-cli ping

# Restart Redis
sudo systemctl restart redis
```

**Port Already in Use**
```bash
# Find process using port
sudo lsof -i :3001
sudo kill -9 <PID>
```

**Memory Issues**
```bash
# Check memory usage
free -h
redis-cli info memory

# Configure Redis memory limit
redis-cli config set maxmemory 256mb
```

### Log Analysis

```bash
# Application logs
tail -f logs/server.log

# System logs
sudo journalctl -u plants-vs-zombies -f

# Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

## 📈 Performance Optimization

### Redis Optimization

```bash
# Redis configuration for production
echo "maxmemory 512mb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
echo "tcp-keepalive 60" >> /etc/redis/redis.conf
```

### Node.js Optimization

```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=512"

# Enable production optimizations
export NODE_ENV=production
```

## 🔄 Updates and Maintenance

### Update Process

```bash
# Backup current version
cp -r /path/to/app /path/to/app-backup

# Pull updates
git pull origin main

# Install dependencies
npm install --production

# Restart application
pm2 restart plants-vs-zombies
```

### Maintenance Mode

```bash
# Enable maintenance mode (nginx)
touch /var/www/maintenance.flag

# Disable maintenance mode
rm /var/www/maintenance.flag
```

## 📞 Support

For deployment issues:

1. Check logs: `npm run logs`
2. Verify health: `curl http://localhost:3001/api/health`
3. Test Redis: `redis-cli ping`
4. Review configuration files
5. Check firewall and network settings

## 🎉 Success!

After deployment, your game will be available at:

- **Game**: `http://your-domain.com`
- **API**: `http://your-domain.com/api`
- **Health**: `http://your-domain.com/api/health`
- **Stats**: `http://your-domain.com/api/stats`

Enjoy your Plants vs Zombies - Redis Edition deployment! 🌻🧟‍♂️
