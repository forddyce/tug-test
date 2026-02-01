import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const consoleFormat = printf(
    ({ level, message, timestamp, context, trace }) => {
        const contextString = context ? ` [${context}]` : '';
        const traceString = trace ? `\n${trace}` : '';
        return `${timestamp} ${level}${contextString} ${message}${traceString}`;
    },
);

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

export const winstonConfig = {
    level: logLevel,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize({ all: nodeEnv === 'development' }),
                consoleFormat,
            ),
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: combine(timestamp(), winston.format.json()),
        }),
        ...(nodeEnv === 'production'
            ? [
                  new winston.transports.File({
                      filename: 'logs/combined.log',
                      format: combine(timestamp(), winston.format.json()),
                  }),
              ]
            : []),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
};
