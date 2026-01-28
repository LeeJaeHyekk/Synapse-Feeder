import { formatLog } from './format'

/**
 * Logger Interface
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
}

/**
 * 기본 Logger 구현
 */
class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(formatLog('INFO', message, meta))
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    const errorMeta = error
      ? {
          ...meta,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }
      : meta
    console.error(formatLog('ERROR', message, errorMeta))
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(formatLog('WARN', message, meta))
  }
}

/**
 * Logger 인스턴스 생성
 */
export function createLogger(): Logger {
  return new ConsoleLogger()
}
