import { winston } from '@strapi/logger';

export const createPluginLogger = (logLevel: unknown = 'info') => {

  const validatedLogLevel = typeof logLevel === 'string' && ['error', 'warn', 'info', 'debug'].includes(logLevel) 
    ? logLevel 
    : 'info';
    
  return winston.createLogger({
    level: validatedLogLevel,
    format: winston.format.combine(
      // Add a label to distinguish your plugin's logs
      winston.format.label({ label: 'strapi-plugin-record-locking' }), 
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, label, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}: [${label}] ${message}${metaStr}`;
      })
    ),
    transports: [
      new winston.transports.Console(),
    ],
  });
};

export default createPluginLogger;