import type { CollectorPolicy } from '../types'

/**
 * Rate Limiter
 * Collector별 요청 속도 제한
 */
export class RateLimiter {
  private timestamps: number[] = []

  constructor(private policy: NonNullable<CollectorPolicy['rateLimit']>) {}

  /**
   * 필요시 대기
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now()

    // window 초과된 요청 제거
    const windowMs = 1000 / this.policy.requestsPerSecond
    this.timestamps = this.timestamps.filter(
      t => now - t < windowMs
    )

    // 최대 요청 수 초과 시 대기
    if (this.timestamps.length >= this.policy.requestsPerSecond) {
      const waitTime = windowMs - (now - this.timestamps[0])
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    // 최소 간격 보장
    if (this.timestamps.length > 0) {
      const sinceLast = now - this.timestamps[this.timestamps.length - 1]
      if (sinceLast < this.policy.minIntervalMs) {
        await new Promise(resolve =>
          setTimeout(resolve, this.policy.minIntervalMs - sinceLast)
        )
      }
    }

    this.timestamps.push(Date.now())
  }
}
