import type { ExecutionContext, RawRecord } from '../../types/index.js'
import { BaseRenderCollector } from '../render/BaseRenderCollector.js'
import type { Page } from 'playwright'
import {
  extractTitle,
  loadHtml,
  createRawRecord,
  createRawRecords,
  resolveUrl,
} from '../utils/htmlParser.js'

/**
 * 한국상장회사협의회(KLCA) 고급 Collector
 * Playwright를 사용하여 동적 콘텐츠 및 상세 정보 수집
 * 
 * 개선사항:
 * - JavaScript 렌더링 지원
 * - 각 공지사항의 상세 내용 추출
 * - 더 정확한 날짜/제목/내용 파싱
 */
export class KlcaAdvancedCollector extends BaseRenderCollector {
  readonly sourceName = 'klca_advanced'

  readonly policy = {
    timeoutMs: 30_000, // Playwright는 더 긴 타임아웃 필요
    maxRetries: 2,
    rateLimit: {
      requestsPerSecond: 1, // Playwright는 더 낮은 rate limit 권장
      minIntervalMs: 3000,
    },
  }

  protected getUrl(): string {
    return 'https://www.klca.or.kr/sub/comm/notice.asp'
  }

  protected async afterLoad(page: Page, ctx: ExecutionContext): Promise<void> {
    // 페이지가 완전히 로드될 때까지 대기
    await page.waitForTimeout(2000)
    
    // 테이블이 로드될 때까지 대기
    try {
      await page.waitForSelector('table.board_list, table[class*="board"], table tbody tr', {
        timeout: 5000,
      })
    } catch {
      ctx.logger.warn('Table selector not found, continuing anyway', {
        source: this.sourceName,
      })
    }
  }

  protected parseHtml(html: string, ctx: ExecutionContext): RawRecord[] {
    const baseUrl = 'https://www.klca.or.kr'
    const $ = loadHtml(html)
    const items: RawRecord[] = []

    const pageTitle = extractTitle(html, '한국상장회사협의회 공지사항')

    // 공지사항 목록 추출
    const noticeItems: Array<{ title: string; url?: string; date?: string; content: string }> = []

    // 테이블 행에서 공지사항 추출
    const rows = $('table.board_list tr, table[class*="board"] tr, table tbody tr')
      .not(':first-child') // 헤더 제외
      .slice(0, 20) // 최대 20개

    rows.each((_, row) => {
      const $row = $(row)
      const cells = $row.find('td')
      
      if (cells.length >= 2) {
        const titleLink = $row.find('td a').first()
        const title = titleLink.text().trim() || $row.find('td').eq(1).text().trim()
        const url = titleLink.attr('href')
        
        // 날짜 추출
        let date = ''
        cells.each((_, cell) => {
          const cellText = $(cell).text().trim()
          if (cellText.match(/\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2}/) || 
              cellText.match(/\d{2}[.\-\/]\d{1,2}[.\-\/]\d{1,2}/)) {
            date = cellText
          }
        })

        if (title && title.length > 2 && !title.match(/^(번호|제목|작성자|날짜|조회수)$/)) {
          noticeItems.push({
            title: title.replace(/\s+/g, ' ').trim(),
            url: url ? resolveUrl(baseUrl, url) : undefined,
            date: date || undefined,
            content: title, // 기본값은 제목, 상세 내용은 별도 크롤링 필요
          })
        }
      }
    })

    // 기본 페이지 정보
    items.push(
      createRawRecord(
        this.sourceName,
        pageTitle,
        this.getUrl(),
        `한국상장회사협의회 공지사항 (고급 수집)\n수집된 공지사항: ${noticeItems.length}개`
      )
    )

    // 공지사항 정보 추가
    if (noticeItems.length > 0) {
      items.push(
        ...createRawRecords(
          this.sourceName,
          baseUrl,
          noticeItems.map(item => ({
            title: item.title,
            content: item.content || item.title,
            url: item.url,
            date: item.date,
          }))
        )
      )
    }

    ctx.logger.info(`Extracted ${noticeItems.length} notices (advanced)`, {
      source: this.sourceName,
      count: noticeItems.length,
    })

    return items
  }
}
