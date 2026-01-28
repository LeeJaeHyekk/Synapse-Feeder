/**
 * Axios Strategy
 * 
 * 정적 HTML 페이지 수집 전략
 */

import type { FetchStrategy } from './FetchStrategy.js'
import type { RawRecord, ExecutionContext } from '../../../types/index.js'
import { fetchHtml } from '../../../utils/index.js'
import { loadHtml, extractBestContent, extractStructuredContent } from '../../utils/htmlParser.js'
import { createRawRecord } from '../../utils/htmlParser.js'

/**
 * 콘텐츠 길이 제한 (가독성을 위한 최대 길이)
 */
const MAX_CONTENT_LENGTH = 5000

/**
 * 의미 있는 콘텐츠 추출 (스크립트, 스타일, 메타 태그 제거)
 */
function extractMeaningfulContent($: ReturnType<typeof loadHtml>): string {
  // 스크립트, 스타일, 메타 태그 제거
  $('script, style, noscript, meta, link[rel="stylesheet"]').remove()
  
  // 주요 콘텐츠 영역 우선 추출
  const contentSelectors = [
    'main',
    'article',
    '.content',
    '.main-content',
    '#content',
    '[role="main"]',
    '.article-content',
    '.post-content',
  ]

  for (const selector of contentSelectors) {
    const content = $(selector).first().text().trim()
    if (content.length > 100) {
      return truncateContent(content)
    }
  }

  // body에서 직접 추출하되, 의미 있는 부분만
  const bodyText = $('body').text().trim()
  return truncateContent(bodyText)
}

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

export class AxiosStrategy implements FetchStrategy {
  readonly name = 'AXIOS'

  async fetch(
    url: string,
    ctx: ExecutionContext,
    options?: {
      timeout?: number
      useReadability?: boolean
    }
  ): Promise<RawRecord[]> {
    ctx.logger.info(`Fetching with Axios strategy: ${url}`, {
      source: 'axios_strategy',
      url,
    })

    const { html } = await fetchHtml(url, {
      timeout: options?.timeout ?? 15000,
    })

    const items: RawRecord[] = []
    const $ = loadHtml(html)
    const fallbackTitle = $('title').text().trim() || 'Untitled'

    // Readability와 Mercury Parser 하이브리드 추출
    if (options?.useReadability !== false) {
      const bestResult = await extractBestContent(html, url)
      
      if (bestResult && bestResult.content.length > 50) {
        ctx.logger.info(`Content extracted using ${bestResult.method}`, {
          source: 'axios_strategy',
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
      // 구조화 실패 시 의미 있는 콘텐츠만 추출
      const meaningfulContent = extractMeaningfulContent($)
      items.push(
        createRawRecord('dynamic', fallbackTitle, url, meaningfulContent, undefined)
      )
    }

    return items
  }
}
