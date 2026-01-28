import { AppError } from './AppError.js'
import type { RetryableError } from './index.js'

/**
 * Collector 실행 중 발생한 에러
 * addAlgorism.md 개선사항: 재시도 가능 여부 추가
 */
export class CollectorError extends AppError implements RetryableError {
  public retryable: boolean
  public context?: Record<string, unknown>

  constructor(
    public readonly sourceName: string,
    public readonly originalError: unknown,
    retryable: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(
      `Collector failed: ${sourceName}`,
      'COLLECTOR_ERROR',
      originalError
    )
    this.retryable = retryable
    this.context = context
  }
}
