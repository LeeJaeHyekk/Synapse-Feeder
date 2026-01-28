export { AppError } from './AppError.js'
export { CollectorError } from './CollectorError.js'
export { NormalizeError } from './NormalizeError.js'

/**
 * 에러 타입 확장
 * addAlgorism.md 개선사항 반영
 */

/**
 * 재시도 가능 여부를 포함한 에러 인터페이스
 */
export interface RetryableError extends Error {
  /** 재시도 가능 여부 */
  retryable: boolean
  /** 에러 컨텍스트 */
  context?: Record<string, unknown>
}
