/**
 * Logger Utility
 * Menyediakan logging dengan level INFO, WARN, ERROR, DEBUG
 * Tidak boleh log credential / API key
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const COLORS = {
  DEBUG: '\x1b[36m',   // Cyan
  INFO: '\x1b[32m',    // Green
  WARN: '\x1b[33m',    // Yellow
  ERROR: '\x1b[31m',   // Red
  RESET: '\x1b[0m',
};

class Logger {
  constructor(level = 'INFO') {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    this.logs = [];
  }

  /**
   * Format timestamp untuk log
   */
  _timestamp() {
    return new Date().toISOString();
  }

  /**
   * Sanitize message — hilangkan credential jika terdeteksi
   */
  _sanitize(message) {
    if (typeof message !== 'string') return message;
    // Mask API keys, tokens, passwords
    return message
      .replace(/(sk-[a-zA-Z0-9]{10})[a-zA-Z0-9]*/g, '$1***')
      .replace(/(key|token|password|secret|credential)[\s]*[=:]\s*\S+/gi, '$1=***');
  }

  /**
   * Core log method
   */
  _log(level, message, data = null) {
    if (LOG_LEVELS[level] < this.level) return;

    const sanitizedMessage = this._sanitize(message);
    const timestamp = this._timestamp();
    const color = COLORS[level] || COLORS.RESET;
    
    const logEntry = {
      timestamp,
      level,
      message: sanitizedMessage,
      data: data ? this._sanitize(JSON.stringify(data)) : undefined,
    };
    
    this.logs.push(logEntry);

    const prefix = `${color}[${level}]${COLORS.RESET}`;
    const time = `\x1b[90m${timestamp}\x1b[0m`;
    
    let output = `${prefix} ${time} ${sanitizedMessage}`;
    if (data) {
      output += ` ${JSON.stringify(data, null, 0)}`;
    }

    if (level === 'ERROR') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  debug(message, data) { this._log('DEBUG', message, data); }
  info(message, data) { this._log('INFO', message, data); }
  warn(message, data) { this._log('WARN', message, data); }
  error(message, data) { this._log('ERROR', message, data); }

  /**
   * Progress tracking untuk batch processing
   */
  progress(current, total, completed, failed) {
    const remaining = total - current;
    const pct = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    
    console.log('');
    console.log(`\x1b[36m  Processing videos... ${bar} ${pct}%\x1b[0m`);
    console.log(`  \x1b[90m${current}/${total} videos processed\x1b[0m`);
    console.log(`  \x1b[32mCompleted: ${completed}\x1b[0m  \x1b[31mFailed: ${failed}\x1b[0m  \x1b[33mRemaining: ${remaining}\x1b[0m`);
    console.log('');
  }

  /**
   * Dapatkan semua log entries
   */
  getLogs() {
    return [...this.logs];
  }
}

// Singleton instance
const logger = new Logger(process.env.LOG_LEVEL || 'INFO');

export default logger;
export { Logger };
