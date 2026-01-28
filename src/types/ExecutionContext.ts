import type { Logger } from '../logger/index.js'
import type { AppConfig } from '../config/index.js'

/**
 * Execution Context
 * 모든 레이어에 주입되는 실행 컨텍스트
 */
export interface ExecutionContext {
  /** 실행 ID (UUID) */
  runId: string
  /** 실행 날짜 (YYYY-MM-DD, UTC) */
  runDate: string
  /** 타임존 (항상 UTC) */
  timezone: 'UTC'
  /** 로거 인스턴스 */
  logger: Logger
  /** 검증된 설정 */
  config: AppConfig
}
