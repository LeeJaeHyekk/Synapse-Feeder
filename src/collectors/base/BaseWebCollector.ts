import type { BaseCollector, ExecutionContext, RawRecord } from '../../types/index.js'
import { retry, isRetryableHttpError, fetchHtml } from '../../utils/index.js'
import type { CollectorPolicy } from '../../types/index.js'

/**
 * Base Web Collector
 * HTML 수집 공통 로직을 제공하는 추상 클래스
 * 
 * 중복 코드 제거:
 * - retry 로직 통합
 * - fetchHtml 호출 통합
 * - 공통 정책 적용
 */
export abstract class BaseWebCollector implements BaseCollector {
  abstract readonly sourceName: string
  abstract readonly policy: CollectorPolicy

  /**
   * 수집할 URL
   */
  protected abstract getUrl(): string

  /**
   * HTML 파싱 로직 (하위 클래스에서 구현)
   * 비동기로 변경하여 상세 페이지 크롤링 지원
   */
  protected abstract parseHtml(html: string, ctx: ExecutionContext): Promise<RawRecord[]> | RawRecord[]

  /**
   * 공통 수집 로직
   */
  async collect(ctx: ExecutionContext): Promise<RawRecord[]> {
    ctx.logger.info(`Collecting from ${this.sourceName}`)

    return retry(
      async () => {
        const url = this.getUrl()
        const { html, encoding } = await fetchHtml(url, {
          timeout: this.policy.timeoutMs - 5_000, // Collector timeout보다 짧게
        })

        ctx.logger.info(`Decoded HTML using encoding: ${encoding}`, {
          source: this.sourceName,
          encoding,
        })

        // 하위 클래스의 파싱 로직 호출 (Promise 또는 동기 반환 모두 지원)
        const parseResult = this.parseHtml(html, ctx)
        const items = parseResult instanceof Promise ? await parseResult : parseResult

        ctx.logger.info(`Collected ${items.length} items from ${this.sourceName}`, {
          source: this.sourceName,
          count: items.length,
        })

        return items
      },
      {
        retries: this.policy.maxRetries,
        backoffMs: 1000,
        retryOn: isRetryableHttpError,
        strategy: 'exponential',
        maxDelayMs: 10_000,
      }
    )
  }
}
