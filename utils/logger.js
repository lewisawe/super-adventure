// Production Logger Utility
// Replaces console.log with structured logging

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...(data && { data })
        };
        
        return JSON.stringify(logEntry);
    }

    writeToFile(level, message, data = null) {
        if (!this.isProduction) return;
        
        const logFile = path.join(this.logDir, `${level}.log`);
        const formattedMessage = this.formatMessage(level, message, data);
        
        fs.appendFileSync(logFile, formattedMessage + '\n');
    }

    info(message, data = null) {
        if (!this.isProduction) {
            console.log(`ℹ️  ${message}`, data || '');
        }
        this.writeToFile('info', message, data);
    }

    error(message, error = null) {
        const errorData = error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : null;
        
        console.error(`❌ ${message}`, errorData || '');
        this.writeToFile('error', message, errorData);
    }

    warn(message, data = null) {
        if (!this.isProduction) {
            console.warn(`⚠️  ${message}`, data || '');
        }
        this.writeToFile('warn', message, data);
    }

    debug(message, data = null) {
        // Only log debug messages in development
        if (!this.isProduction) {
            console.log(`🐛 ${message}`, data || '');
        }
    }

    game(message, data = null) {
        // Game-specific logging
        if (!this.isProduction) {
            console.log(`🎮 ${message}`, data || '');
        }
        this.writeToFile('game', message, data);
    }

    redis(message, data = null) {
        // Redis-specific logging
        if (!this.isProduction) {
            console.log(`🔴 ${message}`, data || '');
        }
        this.writeToFile('redis', message, data);
    }
}

// Export singleton instance
module.exports = new Logger();
