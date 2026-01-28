import dayjs from 'dayjs'

/**
 * 로그 포맷 유틸리티
 */
export function formatLog(level: string, message: string, meta?: Record<string, unknown>): string {
  const timestamp = dayjs().toISOString()
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
  return `[${level}] ${timestamp} ${message}${metaStr}`
}
