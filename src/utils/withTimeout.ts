/**
 * Timeout 에러
 */
export class TimeoutError extends Error {
  constructor(public readonly ms: number) {
    super(`Operation timeout after ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

/**
 * Promise에 타임아웃 적용
 * @param promise 실행할 Promise
 * @param timeoutMs 타임아웃 시간 (ms)
 * @returns 타임아웃이 적용된 Promise
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: NodeJS.Timeout | undefined

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new TimeoutError(timeoutMs))
      }, timeoutMs)
    }),
  ]).finally(() => {
    if (timer) {
      clearTimeout(timer)
    }
  })
}
