import { AppError } from './AppError'

/**
 * Normalize 과정에서 발생한 에러
 */
export class NormalizeError extends AppError {
  constructor(
    public readonly sourceName: string,
    public readonly rawData: unknown,
    public readonly index: number,
    public readonly originalError: unknown
  ) {
    super(
      `Normalize failed: ${sourceName}[${index}]`,
      'NORMALIZE_ERROR',
      originalError
    )
  }
}
