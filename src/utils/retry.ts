/**
 * Retry 정책
 */
export interface RetryPolicy {
  /** 재시도 횟수 */
  retries: number
  /** 백오프 시간 (ms) */
  backoffMs: number
  /** 재시도 여부 판단 함수 */
  retryOn: (error: unknown) => boolean
}

/**
 * 재시도 로직
 * @param fn 실행할 함수
 * @param policy 재시도 정책
 * @returns 실행 결과
 */
export async function retry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<T> {
  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (err) {
      attempt++

      if (attempt > policy.retries || !policy.retryOn(err)) {
        throw err
      }

      const delay = policy.backoffMs * attempt
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
