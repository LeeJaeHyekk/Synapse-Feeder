import { AppError } from './AppError'

/**
 * Collector 실행 중 발생한 에러
 */
export class CollectorError extends AppError {
  constructor(
    public readonly sourceName: string,
    public readonly originalError: unknown
  ) {
    super(
      `Collector failed: ${sourceName}`,
      'COLLECTOR_ERROR',
      originalError
    )
  }
}
