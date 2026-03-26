import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'].includes(process.env.LOG_LEVEL!)
    ? process.env.LOG_LEVEL
    : isDev
      ? 'debug'
      : 'info',
  base: { pid: process.pid },
  transport: isDev
    ? {
        target: '@/logger/pretty.ts',
      }
    : undefined,
})

export default logger
