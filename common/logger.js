const levels = {
    VERBOSE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
};

class Logger {
    constructor(level = 'INFO') {
        // Set the log level (default is 'INFO')
        this.currentLevel = levels[level.toUpperCase()] !== undefined ? levels[level.toUpperCase()] : levels.INFO;
    }

    log(level, ...args) {
        const levelKey = level.toUpperCase();
        if (levels[levelKey] !== undefined && levels[levelKey] >= this.currentLevel) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [${levelKey}]`, ...args);
        }
    }

    debug(...args) {
        this.log('DEBUG', ...args);
    }

    info(...args) {
        this.log('INFO', ...args);
    }

    warn(...args) {
        this.log('WARN', ...args);
    }

    error(...args) {
        this.log('ERROR', ...args);
    }

    verbose(...args) {
        this.log('VERBOSE', ...args);
    }

    // Method to change the log level dynamically
    setLogLevel(level) {
        if (levels[level.toUpperCase()] !== undefined) {
            this.currentLevel = levels[level.toUpperCase()];
        } else {
            console.warn(`Unknown log level: ${level}. Defaulting to INFO.`);
            this.currentLevel = levels.INFO;
        }
    }
}

// Example usage:
const logger = new Logger('DEBUG');  // Set initial log level to DEBUG
export default logger;