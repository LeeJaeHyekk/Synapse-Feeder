import type { ExecutionContext, RawRecord } from '../../types/index.js'
import type { Page } from 'playwright'
import { BaseRenderCollector } from './BaseRenderCollector.js'
import { extractTitle, createRawRecord } from '../utils/htmlParser.js'

/**
 * 예제 Render Collector
 * 실제 구현 시 이 파일을 참고하여 새로운 Render Collector 생성
 */
export class ExampleRenderCollector extends BaseRenderCollector {
  readonly sourceName = 'example_render'

  readonly policy = {
    timeoutMs: 30_000, // Playwright는 더 긴 타임아웃 필요
    maxRetries: 2,
    rateLimit: {
      requestsPerSecond: 1, // Playwright는 더 낮은 rate limit 권장
      minIntervalMs: 5000,
    },
  }

  protected getUrl(): string {
    return 'https://example.com/spa'
  }

  protected async afterLoad(page: Page, ctx: ExecutionContext): Promise<void> {
    // 예제: 추가 대기 시간 (동적 콘텐츠 로드 대기)
    await page.waitForTimeout(2000)
  }

  protected parseHtml(html: string, ctx: ExecutionContext): RawRecord[] {
    // 페이지 제목 추출
    const pageTitle = extractTitle(html, 'Example SPA')

    ctx.logger.info('Parsing rendered HTML', {
      source: this.sourceName,
      title: pageTitle,
    })

    // 기본 RawRecord 생성
    return [
      createRawRecord(
        this.sourceName,
        pageTitle,
        this.getUrl(),
        'Content extracted from rendered page'
      ),
    ]
  }
}
