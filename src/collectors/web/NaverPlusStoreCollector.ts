import type { ExecutionContext, RawRecord } from '../../types/index.js'
import { BaseWebCollector } from '../base/BaseWebCollector.js'
import {
  extractTitle,
  loadHtml,
  extractStructuredItems,
  extractLinks,
  createRawRecord,
  createRawRecords,
  resolveUrl,
} from '../utils/htmlParser.js'

/**
 * 네이버 플러스 스토어 Collector
 * 베스트 키워드 및 상품 정보 수집
 * 
 * 고도화 개선:
 * - Cheerio 기반 구조화된 데이터 추출
 * - 실제 링크, 날짜 정보 수집
 * - 더 정확한 셀렉터 사용
 */
export class NaverPlusStoreCollector extends BaseWebCollector {
  readonly sourceName = 'naver_plus_store'

  readonly policy = {
    timeoutMs: 15_000,
    maxRetries: 2,
    rateLimit: {
      requestsPerSecond: 2,
      minIntervalMs: 2000,
    },
  }

  protected getUrl(): string {
    return 'https://snxbest.naver.com/home'
  }

  protected parseHtml(html: string, ctx: ExecutionContext): RawRecord[] {
    const baseUrl = 'https://snxbest.naver.com/home'
    const $ = loadHtml(html)
    const items: RawRecord[] = []

    // 페이지 제목 추출
    const pageTitle = extractTitle(html, '네이버 플러스 스토어')

    // 베스트 키워드 섹션 찾기 (다양한 선택자 시도)
    const keywordSelectors = [
      '.keyword_item',
      '.best_keyword',
      '[class*="keyword"]',
      '[class*="rank"]',
      'li[class*="item"]',
      '.item',
    ]

    let keywordItems: Array<{ title: string; url?: string; content: string }> = []

    // 각 선택자로 시도
    for (const selector of keywordSelectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        ctx.logger.info(`Found ${elements.length} items with selector: ${selector}`, {
          source: this.sourceName,
          selector,
        })

        elements.each((_, el) => {
          const $el = $(el)
          const title = $el.find('a, .title, .text').first().text().trim() 
            || $el.text().trim()
          const url = $el.find('a').first().attr('href')
          const content = $el.find('.desc, .description, p').first().text().trim()
            || title

          if (title && title.length > 2) {
            keywordItems.push({
              title: title.length > 50 ? title.substring(0, 50) + '...' : title,
              url: url ? resolveUrl(baseUrl, url) : undefined,
              content: content || title,
            })
          }
        })

        if (keywordItems.length > 0) break
      }
    }

    // 링크 기반 추출 (키워드가 없을 경우)
    if (keywordItems.length === 0) {
      const links = extractLinks(html, 'a[href*="keyword"], a[href*="rank"], a[href*="best"]', 20)
      keywordItems = links.map(link => ({
        title: link.title,
        url: resolveUrl(baseUrl, link.url),
        content: link.title,
      }))
    }

    // 기본 페이지 정보
    items.push(
      createRawRecord(
        this.sourceName,
        pageTitle,
        baseUrl,
        `네이버 플러스 스토어 메인 페이지\n수집된 키워드: ${keywordItems.length}개`
      )
    )

    // 키워드 정보 추가 (최대 20개)
    if (keywordItems.length > 0) {
      items.push(
        ...createRawRecords(
          this.sourceName,
          baseUrl,
          keywordItems.slice(0, 20).map((item, index) => ({
            title: `베스트 키워드 ${index + 1}: ${item.title}`,
            content: item.content,
            url: item.url,
          }))
        )
      )
    }

    ctx.logger.info(`Extracted ${keywordItems.length} keywords from ${this.sourceName}`, {
      source: this.sourceName,
      count: keywordItems.length,
    })

    return items
  }
}
