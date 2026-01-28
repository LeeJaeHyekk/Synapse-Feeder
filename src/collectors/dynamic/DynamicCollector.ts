/**
 * Dynamic Collector
 * 
 * 페이지 분석 기반 동적 수집 전략 실행
 * 
 * 핵심: 사이트별 Collector가 아닌 페이지 분석 기반 전략 선택
 */

import type { BaseCollector, ExecutionContext, RawRecord } from '../../types/index.js'
import type { CollectorPolicy } from '../../types/index.js'
import type { PageConfig, CrawlStrategy } from '../../analyzer/types.js'
import { analyzeAndClassify } from '../../analyzer/index.js'
import { createStrategy } from './strategies/index.js'
import { ApiStrategy } from './strategies/index.js'
import { retry, isRetryableHttpError } from '../../utils/index.js'

/**
 * Dynamic Collector
 * 
 * 페이지를 분석하여 최적의 수집 전략을 자동 선택하고 실행
 */
export class DynamicCollector implements BaseCollector {
  readonly sourceName: string
  readonly policy: CollectorPolicy
  private readonly config: PageConfig

  constructor(config: PageConfig) {
    this.sourceName = config.sourceName
    this.config = config

    // 기본 정책 설정
    this.policy = {
      timeoutMs: 30000,
      maxRetries: 2,
      rateLimit: {
        requestsPerSecond: 1,
        minIntervalMs: 2000,
      },
    }
  }

  async collect(ctx: ExecutionContext): Promise<RawRecord[]> {
    ctx.logger.info(`Dynamic collecting from ${this.sourceName}`, {
      source: this.sourceName,
      url: this.config.url,
    })

    return retry(
      async () => {
        // 1. 페이지 분석 및 분류
        const {
          analysis,
          profile,
          model,
          strategy,
        } = await analyzeAndClassify(this.config.url, this.config)

        ctx.logger.info('Page analysis completed', {
          source: this.sourceName,
          renderingType: profile.renderingType,
          dataAccessType: profile.dataAccessType,
          pageRole: profile.pageRole,
          strategy: strategy.fetcher,
          itemsFound: model.items.length,
        })

        // 2. 전략에 따라 수집 실행
        const strategyInstance = this.createStrategyInstance(strategy, analysis)
        const items = await strategyInstance.fetch(
          this.config.url,
          ctx,
          {
            timeout: strategy.timeoutMs,
            useReadability: strategy.useReadability,
            detectedApis: analysis.detectedApis,
          }
        )

        // 3. 모델의 아이템을 RawRecord로 변환 (추가 데이터)
        const modelItems = this.convertModelToRawRecords(model, ctx)

        // 4. 전략으로 수집한 아이템과 모델 아이템 병합
        const allItems = [...items, ...modelItems]

        ctx.logger.info(`Collected ${allItems.length} items from ${this.sourceName}`, {
          source: this.sourceName,
          count: allItems.length,
          strategyItems: items.length,
          modelItems: modelItems.length,
        })

        return allItems
      },
      {
        retries: this.policy.maxRetries,
        backoffMs: this.policy.rateLimit.minIntervalMs,
        retryOn: isRetryableHttpError,
        strategy: 'exponential',
        maxDelayMs: 10000,
      }
    )
  }

  /**
   * 전략 인스턴스 생성
   */
  private createStrategyInstance(
    strategy: CrawlStrategy,
    analysis: { detectedApis: import('../../analyzer/types.js').DetectedApi[] }
  ): import('./strategies/FetchStrategy.js').FetchStrategy {
    if (strategy.parser === 'API') {
      return new ApiStrategy()
    }

    return createStrategy(strategy.fetcher)
  }

  /**
   * 모델 아이템을 RawRecord로 변환
   */
  private convertModelToRawRecords(
    model: any,
    ctx: ExecutionContext
  ): RawRecord[] {
    const records: RawRecord[] = []

    for (const item of model.items) {
      records.push({
        title: item.fields.title || 'Untitled',
        url: item.fields.detailUrl || model.pageUrl,
        date: item.fields.date || new Date().toISOString(),
        content: this.formatItemContent(item),
        source: this.sourceName,
      })
    }

    return records
  }

  /**
   * 아이템 내용 포맷팅
   */
  private formatItemContent(item: any): string {
    const parts: string[] = []

    if (item.fields.author) {
      parts.push(`작성자: ${item.fields.author}`)
    }
    if (item.fields.date) {
      parts.push(`작성일: ${item.fields.date}`)
    }
    if (item.fields.department) {
      parts.push(`부서: ${item.fields.department}`)
    }
    if (item.fields.views) {
      parts.push(`조회수: ${item.fields.views}`)
    }
    if (item.fields.content) {
      parts.push('', item.fields.content)
    } else if (item.fields.title) {
      parts.push(item.fields.title)
    }

    return parts.filter(Boolean).join('\n')
  }
}
