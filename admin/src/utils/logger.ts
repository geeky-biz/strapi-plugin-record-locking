import { getFetchClient } from '@strapi/strapi/admin';

export interface LoggerConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableLogging: boolean;
}

export interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class BrowserLogger {
  public config: LoggerConfig;
  public label: string = 'strapi-plugin-record-locking';

  constructor(config: LoggerConfig = { logLevel: 'info', enableLogging: true }) {
    this.config = config;
  }

  public shouldLog(level: keyof LogLevel): boolean {
    if (!this.config.enableLogging) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.logLevel.toUpperCase() as keyof LogLevel];
  }

  public formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const metaStr = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: [${this.label}] ${message}${metaStr}`;
  }

  public log(level: keyof LogLevel, message: string, ...args: any[]): void {
    console.log('Logging message:', message);
    console.log('Level:', level);
    console.log('Should log:', this.shouldLog(level));
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, ...args);
    
    switch (level) {
      case 'DEBUG':
        console.log(formattedMessage, ...args);
        break;
      case 'INFO':
        console.log(formattedMessage, ...args);
        break;
      case 'WARN':
        console.log(formattedMessage, ...args);
        break;
      case 'ERROR':
        console.log(formattedMessage, ...args);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log('DEBUG', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('ERROR', message, ...args);
  }

  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Create and export a default logger instance
export const createPluginLogger = (config?: LoggerConfig): BrowserLogger => {
  return new BrowserLogger(config);
};

// Lazy logger instance - will be created after initializeLogger is called
let loggerInstance: BrowserLogger | null = null;

/**
 * Initialize the logger by fetching configuration from server
 * @returns Promise<void>
 */
export const initializeLogger = async (): Promise<void> => {
  try {
    const { get } = getFetchClient();
    
    // Fetch configuration from server
    const response = await get('/record-locking/log-settings');
    
    console.log('Server config response:', response.data);
    
    // Extract configuration from response
    const serverConfig: LoggerConfig = {
      logLevel: response.data.logLevel || 'info',
      enableLogging: response.data.enableLogging !== false,
    };
    
    // Create logger instance with server configuration
    loggerInstance = createPluginLogger(serverConfig);
    
    // Log successful initialization
    loggerInstance.info('Record locking plugin logger initialized with server config', { config: serverConfig });
    
  } catch (error) {
    console.warn('Failed to fetch plugin configuration from server:', error);
    
    // Set default configuration if server request fails
    const defaultConfig: LoggerConfig = {
      logLevel: 'debug',
      enableLogging: true,
    };
    
    // Create logger instance with default configuration
    loggerInstance = createPluginLogger(defaultConfig);
    loggerInstance.info('Record locking plugin logger initialized with default config');
  }
};

/**
 * Get the logger instance (creates with default config if not initialized)
 * @returns BrowserLogger instance
 */
export const logger = new Proxy({} as BrowserLogger, {
  get(target, prop) {
    if (!loggerInstance) {
      // Create logger with default config if not yet initialized
      loggerInstance = createPluginLogger({ logLevel: 'info', enableLogging: true });
    }
    return loggerInstance[prop as keyof BrowserLogger];
  }
});
