import type { BaseCollector, ExecutionContext, RawRecord } from '../../types/index.js'
import { retry, isRetryableHttpError } from '../../utils/index.js'
import type { CollectorPolicy } from '../../types/index.js'
import axios, { type AxiosRequestConfig } from 'axios'

/**
 * Base API Collector
 * API 수집 공통 로직을 제공하는 추상 클래스
 * 
 * 중복 코드 제거:
 * - retry 로직 통합
 * - axios 호출 통합
 * - 공통 정책 적용
 */
export abstract class BaseApiCollector implements BaseCollector {
  abstract readonly sourceName: string
  abstract readonly policy: CollectorPolicy

  /**
   * API 요청 설정 (하위 클래스에서 구현)
   */
  protected abstract getRequestConfig(): AxiosRequestConfig

  /**
   * API 응답 파싱 로직 (하위 클래스에서 구현)
   */
  protected abstract parseResponse(data: unknown, ctx: ExecutionContext): RawRecord[]

  /**
   * 공통 수집 로직
   */
  async collect(ctx: ExecutionContext): Promise<RawRecord[]> {
    ctx.logger.info(`Collecting from ${this.sourceName}`)

    return retry(
      async () => {
        const config = this.getRequestConfig()
        
        // 타임아웃 설정 (Collector timeout보다 짧게)
        const timeout = Math.min(
          config.timeout ?? 5_000,
          this.policy.timeoutMs - 2_000
        )

        const response = await axios.request({
          ...config,
          timeout,
        })

        // 하위 클래스의 파싱 로직 호출
        const items = this.parseResponse(response.data, ctx)

        ctx.logger.info(`Collected ${items.length} items from ${this.sourceName}`, {
          source: this.sourceName,
          count: items.length,
        })

        return items
      },
      {
        retries: this.policy.maxRetries,
        backoffMs: 500,
        retryOn: isRetryableHttpError,
        strategy: 'exponential',
        maxDelayMs: 10_000,
      }
    )
  }
}
