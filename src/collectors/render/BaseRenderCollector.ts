import type { BaseCollector, ExecutionContext, RawRecord } from '../../types/index.js'
import { chromium, type Browser, type Page } from 'playwright'
import { retry } from '../../utils/retry.js'
import { isRetryableHttpError } from '../../utils/httpRetry.js'
import type { CollectorPolicy } from '../../types/index.js'

/**
 * Base Render Collector
 * JavaScript 렌더링이 필요한 동적 콘텐츠 수집을 위한 추상 클래스
 * 
 * 개선사항:
 * - playwright 라이브러리 사용
 * - SPA 크롤링 가능
 * - JavaScript 실행 후 HTML 추출
 * 
 * 주의사항:
 * - 리소스 사용량 큼 (메모리, CPU)
 * - 실행 시간 증가
 * - 필요한 경우에만 사용 권장
 */
export abstract class BaseRenderCollector implements BaseCollector {
  abstract readonly sourceName: string
  abstract readonly policy: CollectorPolicy

  /**
   * 수집할 URL
   */
  protected abstract getUrl(): string

  /**
   * 렌더링된 HTML 파싱 로직 (하위 클래스에서 구현)
   */
  protected abstract parseHtml(html: string, ctx: ExecutionContext): RawRecord[]

  /**
   * 페이지 로드 전 추가 설정 (선택적)
   */
  protected async beforeLoad(page: Page, ctx: ExecutionContext): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
    // 하위 클래스에서 필요시 오버라이드
  }

  /**
   * 페이지 로드 후 추가 대기 (선택적)
   */
  protected async afterLoad(page: Page, ctx: ExecutionContext): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
    // 하위 클래스에서 필요시 오버라이드
  }

  /**
   * 공통 수집 로직
   */
  async collect(ctx: ExecutionContext): Promise<RawRecord[]> {
    ctx.logger.info(`Collecting rendered content from ${this.sourceName}`)

    return retry(
      async () => {
        const url = this.getUrl()
        let browser: Browser | null = null

        try {
          // 브라우저 실행
          browser = await chromium.launch({
            headless: true,
          })

          const page = await browser.newPage()

          // 타임아웃 설정 (Collector timeout보다 짧게)
          const pageTimeout = this.policy.timeoutMs - 5_000

          // 페이지 로드 전 설정
          await this.beforeLoad(page, ctx)

          // 페이지 로드
          await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: pageTimeout,
          })

          // 페이지 로드 후 대기
          await this.afterLoad(page, ctx)

          // HTML 추출
          const html = await page.content()

          ctx.logger.info(`Rendered HTML extracted from ${this.sourceName}`, {
            source: this.sourceName,
            htmlLength: html.length,
          })

          // 하위 클래스의 파싱 로직 호출
          const items = this.parseHtml(html, ctx)

          ctx.logger.info(`Collected ${items.length} items from ${this.sourceName}`, {
            source: this.sourceName,
            count: items.length,
          })

          return items
        } finally {
          // 브라우저 종료
          if (browser) {
            await browser.close()
          }
        }
      },
      {
        retries: this.policy.maxRetries,
        backoffMs: 2000, // Playwright는 더 긴 대기 시간 필요
        retryOn: isRetryableHttpError,
        strategy: 'exponential',
        maxDelayMs: 30_000,
      }
    )
  }
}
