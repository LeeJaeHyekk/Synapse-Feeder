import Bottleneck from 'bottleneck'
import type { CollectorPolicy } from '../types/index.js'

/**
 * Rate Limiter (bottleneck 기반)
 * Collector별 요청 속도 제한
 * 
 * 개선사항:
 * - bottleneck 라이브러리 사용으로 안정성 향상
 * - 통계 및 모니터링 기능 제공
 * - 동적 rate limit 조정 가능
 */
export class RateLimiter {
  private limiter: Bottleneck

  constructor(private policy: NonNullable<CollectorPolicy['rateLimit']>) {
    // requestsPerSecond를 minTime으로 변환
    // 예: 3 req/s = 1000/3 = 333ms between requests
    const minTime = 1000 / this.policy.requestsPerSecond

    this.limiter = new Bottleneck({
      minTime: Math.max(minTime, this.policy.minIntervalMs),
      maxConcurrent: 1, // 순차 실행 보장
    })
  }

  /**
   * 함수를 rate limit과 함께 실행
   * @param fn 실행할 함수
   * @returns 실행 결과
   */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(() => fn())
  }

  /**
   * 필요시 대기 (하위 호환성 유지)
   * @deprecated schedule() 사용 권장
   */
  async waitIfNeeded(): Promise<void> {
    // bottleneck은 schedule 내부에서 자동으로 대기하므로
    // 빈 함수로 실행하여 대기만 수행
    await this.limiter.schedule(async () => {
      // 빈 작업
    })
  }

  /**
   * 통계 정보 가져오기
   */
  getStats(): Bottleneck.Counts {
    return this.limiter.counts()
  }

  /**
   * Rate limit 동적 조정
   */
  updateSettings(settings: { minTime?: number; maxConcurrent?: number }): void {
    this.limiter.updateSettings(settings)
  }

  /**
   * 리소스 정리
   */
  async disconnect(): Promise<void> {
    await this.limiter.disconnect()
  }
}
