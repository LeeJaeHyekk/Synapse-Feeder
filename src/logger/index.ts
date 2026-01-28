import pino from 'pino'

/**
 * Logger Interface
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
}

/**
 * Pino Logger 구현
 * 
 * 개선사항:
 * - 구조화된 로깅 (JSON)
 * - 높은 성능
 * - 프로덕션 레벨 기능
 */
class PinoLogger implements Logger {
  private logger: pino.Logger

  constructor() {
    const isDevelopment = process.env.NODE_ENV !== 'production'
    
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined, // 프로덕션에서는 JSON 출력
    })
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(meta || {}, message)
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    const errorMeta: Record<string, unknown> = {
      ...meta,
    }

    if (error) {
      if (error instanceof Error) {
        errorMeta.error = error.message
        errorMeta.stack = error.stack
      } else {
        errorMeta.error = String(error)
      }
    }

    this.logger.error(errorMeta, message)
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(meta || {}, message)
  }
}

/**
 * Logger 인스턴스 생성
 */
export function createLogger(): Logger {
  return new PinoLogger()
}
