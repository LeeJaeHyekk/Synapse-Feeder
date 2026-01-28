import type { BaseCollector, ExecutionContext, RawRecord } from '../../types/index.js'
import Parser from 'rss-parser'
import { retry } from '../../utils/retry.js'
import { isRetryableHttpError } from '../../utils/httpRetry.js'
import type { CollectorPolicy } from '../../types/index.js'

/**
 * Base RSS Collector
 * RSS/Atom 피드 수집을 위한 추상 클래스
 * 
 * 개선사항:
 * - rss-parser 라이브러리 사용
 * - RSS/Atom 표준 포맷 지원
 * - 블로그 크롤링 용이
 */
export abstract class BaseRssCollector implements BaseCollector {
  abstract readonly sourceName: string
  abstract readonly policy: CollectorPolicy

  /**
   * RSS 피드 URL
   */
  protected abstract getFeedUrl(): string

  /**
   * RSS 아이템을 RawRecord로 변환 (하위 클래스에서 구현)
   */
  protected abstract transformItem(
    item: Parser.Item,
    ctx: ExecutionContext
  ): RawRecord

  /**
   * 공통 수집 로직
   */
  async collect(ctx: ExecutionContext): Promise<RawRecord[]> {
    ctx.logger.info(`Collecting RSS feed from ${this.sourceName}`)

    return retry(
      async () => {
        const feedUrl = this.getFeedUrl()
        const parser = new Parser({
          timeout: this.policy.timeoutMs - 5_000,
          customFields: {
            item: ['pubDate', 'author', 'category'],
          },
        })

        const feed = await parser.parseURL(feedUrl)

        ctx.logger.info(`Parsed RSS feed: ${feed.title}`, {
          source: this.sourceName,
          itemCount: feed.items.length,
        })

        // 각 아이템을 RawRecord로 변환
        const records: RawRecord[] = []
        for (const item of feed.items) {
          try {
            const record = this.transformItem(item, ctx)
            records.push(record)
          } catch (error) {
            ctx.logger.warn(`Failed to transform RSS item: ${item.title}`, {
              source: this.sourceName,
              error: error instanceof Error ? error.message : String(error),
            })
            // 개별 아이템 실패는 스킵하고 계속 진행
          }
        }

        ctx.logger.info(`Collected ${records.length} items from ${this.sourceName}`, {
          source: this.sourceName,
          count: records.length,
        })

        return records
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
