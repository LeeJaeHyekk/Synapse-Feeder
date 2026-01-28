/**
 * Playwright Strategy
 * 
 * 동적 렌더링 페이지 수집 전략
 */

import type { FetchStrategy } from './FetchStrategy.js'
import type { RawRecord, ExecutionContext } from '../../../types/index.js'
import { chromium, type Browser } from 'playwright'
import { loadHtml, extractBestContent, extractStructuredContent } from '../../utils/htmlParser.js'
import { createRawRecord } from '../../utils/htmlParser.js'

/**
 * 콘텐츠 길이 제한 (가독성을 위한 최대 길이)
 */
const MAX_CONTENT_LENGTH = 5000

/**
 * 콘텐츠 길이 제한 및 정리
 */
function truncateContent(content: string): string {
  // 연속된 공백/줄바꿈 정리
  const cleaned = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()

  // 길이 제한
  if (cleaned.length > MAX_CONTENT_LENGTH) {
    return cleaned.substring(0, MAX_CONTENT_LENGTH) + '...'
  }

  return cleaned
}

export class PlaywrightStrategy implements FetchStrategy {
  readonly name = 'PLAYWRIGHT'

  async fetch(
    url: string,
    ctx: ExecutionContext,
    options?: {
      timeout?: number
      useReadability?: boolean
    }
  ): Promise<RawRecord[]> {
    ctx.logger.info(`Fetching with Playwright strategy: ${url}`, {
      source: 'playwright_strategy',
      url,
    })

    const timeout = options?.timeout ?? 30000
    let browser: Browser | null = null

    try {
      browser = await chromium.launch({ headless: true })
      const page = await browser.newPage()

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: timeout - 5000,
      })

      // 추가 대기 (동적 콘텐츠 로드)
      await page.waitForTimeout(2000)

      const html = await page.content()
      const items: RawRecord[] = []
      const $ = loadHtml(html)
      const fallbackTitle = $('title').text().trim() || 'Untitled'

      // Readability와 Mercury Parser 하이브리드 추출
      if (options?.useReadability !== false) {
        const bestResult = await extractBestContent(html, url)
        
        if (bestResult && bestResult.content.length > 50) {
          ctx.logger.info(`Content extracted using ${bestResult.method}`, {
            source: 'playwright_strategy',
            method: bestResult.method,
            confidence: bestResult.confidence,
            contentLength: bestResult.content.length,
          })

          // 구조화된 콘텐츠 추출
          const structuredContent = extractStructuredContent(html)
          
          // 구조화된 콘텐츠가 있으면 객체로 저장, 없으면 텍스트로 저장
          const content = Object.keys(structuredContent).length > 0
            ? structuredContent
            : truncateContent(bestResult.content)

          items.push(
            createRawRecord(
              'dynamic',
              bestResult.title || fallbackTitle,
              url,
              content,
              bestResult.datePublished
            )
          )
          return items
        }
      }

      // 하이브리드 추출 실패 시 구조화된 콘텐츠 추출 시도
      const structuredContent = extractStructuredContent(html)
      
      if (Object.keys(structuredContent).length > 0) {
        // 구조화된 콘텐츠가 있으면 객체로 저장
        items.push(
          createRawRecord('dynamic', fallbackTitle, url, structuredContent, undefined)
        )
      } else {
        // 구조화 실패 시 기본 HTML 파싱
        const bodyText = $('body').text().trim()
        items.push(
          createRawRecord('dynamic', fallbackTitle, url, truncateContent(bodyText), undefined)
        )
      }

      return items
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }
}
