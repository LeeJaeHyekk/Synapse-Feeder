import type { ExecutionContext, RawRecord } from '../../types/index.js'
import type Parser from 'rss-parser'
import { BaseRssCollector } from './BaseRssCollector.js'

/**
 * 예제 RSS Collector
 * 실제 구현 시 이 파일을 참고하여 새로운 RSS Collector 생성
 */
export class ExampleRssCollector extends BaseRssCollector {
  readonly sourceName = 'example_rss'

  readonly policy = {
    timeoutMs: 15_000,
    maxRetries: 2,
    rateLimit: {
      requestsPerSecond: 2,
      minIntervalMs: 2000,
    },
  }

  protected getFeedUrl(): string {
    return 'https://example.com/feed.xml'
  }

  protected transformItem(
    item: Parser.Item,
    ctx: ExecutionContext
  ): RawRecord {
    return {
      title: item.title || 'Untitled',
      url: item.link || '',
      date: item.pubDate || new Date().toISOString(),
      content: item.contentSnippet || item.content || '',
      source: this.sourceName,
    }
  }
}
