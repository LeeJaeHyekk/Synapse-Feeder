import { config } from 'dotenv'
import { EnvSchema } from './env.schema'
import type { AppConfig } from './types'

// .env 파일 로드
config()

/**
 * 환경변수 로드 및 검증
 * 설정 에러 시 즉시 프로세스 종료
 */
export function loadConfig(): AppConfig {
  try {
    const raw = {
      NODE_ENV: process.env.NODE_ENV,
      SLACK_TOKEN: process.env.SLACK_TOKEN?.trim(),
      SLACK_CHANNEL: process.env.SLACK_CHANNEL?.trim(),
      // 빈 문자열을 undefined로 변환 (optional 필드)
      SLACK_ERROR_CHANNEL: process.env.SLACK_ERROR_CHANNEL?.trim() || undefined,
      DB_PATH: process.env.DB_PATH?.trim(),
      DEFAULT_TIMEOUT_MS: process.env.DEFAULT_TIMEOUT_MS,
    }

    // 디버깅: 로드된 값 확인 (개발 환경에서만)
    if (process.env.NODE_ENV === 'dev') {
      console.log('[DEBUG] Loaded env vars:', {
        SLACK_TOKEN: raw.SLACK_TOKEN ? `${raw.SLACK_TOKEN.substring(0, 10)}...` : 'undefined',
        SLACK_CHANNEL: raw.SLACK_CHANNEL || 'undefined',
        SLACK_ERROR_CHANNEL: raw.SLACK_ERROR_CHANNEL || 'undefined',
      })
    }

    const validated = EnvSchema.parse(raw)
    return validated
  } catch (error) {
    if (error instanceof Error) {
      console.error('[CONFIG_ERROR] Invalid environment variables:', error.message)
    } else {
      console.error('[CONFIG_ERROR] Invalid environment variables:', String(error))
    }
    process.exit(1)
  }
}

/**
 * Config 관련 타입 export
 */
export type { AppConfig } from './types'
