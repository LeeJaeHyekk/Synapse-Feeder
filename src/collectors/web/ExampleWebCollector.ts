import type { ExecutionContext, RawRecord } from '../../types/index.js'
import { BaseWebCollector } from '../base/BaseWebCollector.js'
import { extractTitle, createRawRecord } from '../utils/htmlParser.js'

/**
 * 예제 Web Collector
 * 실제 구현 시 이 파일을 참고하여 새로운 Collector 생성
 * 
 * 모듈화 개선:
 * - BaseWebCollector 상속으로 공통 로직 재사용
 * - HTML 파싱은 하위 클래스에서 구현
 */
export class ExampleWebCollector extends BaseWebCollector {
  readonly sourceName = 'example_web'

  readonly policy = {
    timeoutMs: 8_000,
    maxRetries: 2,
    rateLimit: {
      requestsPerSecond: 3,
      minIntervalMs: 1000,
    },
  }

  protected getUrl(): string {
    return 'https://example.com/news'
  }

  protected parseHtml(html: string, ctx: ExecutionContext): RawRecord[] {
    // 예제: HTML 파싱 로직 구현
    // 실제 구현 시 htmlParser 유틸리티 사용 권장
    
    // 페이지 제목 추출 예시
    const pageTitle = extractTitle(html, 'Example Site')
    
    // 로깅 예시 (ctx 사용)
    ctx.logger.info('Parsing HTML', { source: this.sourceName, title: pageTitle })
    
    // 기본 RawRecord 생성 예시
    return [
      createRawRecord(
        this.sourceName,
        pageTitle,
        this.getUrl(),
        'Example content extracted from HTML'
      ),
    ]
  }
}
