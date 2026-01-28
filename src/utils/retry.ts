import pRetry, { AbortError } from 'p-retry'

/**
 * Retry 전략 타입
 */
export type RetryStrategy = 'exponential' | 'linear' | 'fixed'

/**
 * Retry 정책
 */
export interface RetryPolicy {
  /** 재시도 횟수 */
  retries: number
  /** 백오프 시간 (ms) - fixed/linear 전략에서 사용 */
  backoffMs: number
  /** 재시도 여부 판단 함수 */
  retryOn: (error: unknown) => boolean
  /** 재시도 전략 (기본값: linear) */
  strategy?: RetryStrategy
  /** 최대 지연 시간 (ms) - exponential 전략에서 사용 */
  maxDelayMs?: number
  /** 재시도 시도 시 호출되는 콜백 (선택) */
  onFailedAttempt?: (error: { attemptNumber: number; retriesLeft: number; error: unknown }) => void
}

/**
 * 재시도 로직 (p-retry 기반)
 * @param fn 실행할 함수
 * @param policy 재시도 정책
 * @returns 실행 결과
 */
export async function retry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<T> {
  const strategy = policy.strategy ?? 'linear'
  const initialDelay = policy.backoffMs

  // 전략별 delay 함수 생성
  let delayFn: (attemptCount: number) => number
  switch (strategy) {
    case 'exponential': {
      delayFn = (attemptCount) => {
        const exponentialDelay = initialDelay * Math.pow(2, attemptCount - 1)
        return policy.maxDelayMs
          ? Math.min(exponentialDelay, policy.maxDelayMs)
          : exponentialDelay
      }
      break
    }
    case 'linear':
      delayFn = (attemptCount) => initialDelay * attemptCount
      break
    case 'fixed':
    default:
      delayFn = () => initialDelay
      break
  }

  return pRetry(
    async (attemptNumber) => {
      try {
        return await fn()
      } catch (error) {
        // 재시도 불가능한 에러인 경우 AbortError로 변환
        if (!policy.retryOn(error)) {
          throw new AbortError(error)
        }
        throw error
      }
    },
    {
      retries: policy.retries,
      minTimeout: initialDelay,
      maxTimeout: policy.maxDelayMs ?? Infinity,
      factor: strategy === 'exponential' ? 2 : 1,
      onFailedAttempt: (error) => {
        // 커스텀 콜백 호출
        if (policy.onFailedAttempt) {
          policy.onFailedAttempt({
            attemptNumber: error.attemptNumber,
            retriesLeft: error.retriesLeft,
            error: error.error,
          })
        }
      },
    }
  )
}
