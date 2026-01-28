import * as cheerio from 'cheerio'

/**
 * HTML 파싱 유틸리티
 * Collector에서 공통으로 사용하는 HTML 파싱 함수들
 * 
 * 개선사항:
 * - cheerio 기반 DOM 파싱으로 정확도 향상
 * - 복잡한 선택자 지원
 * - 중첩된 구조 파싱 용이
 */

/**
 * HTML에서 title 태그 추출 (cheerio 기반)
 */
export function extractTitle(html: string, fallback: string = 'Untitled'): string {
  const $ = cheerio.load(html)
  const title = $('title').text().trim()
  return title || fallback
}

/**
 * CSS 선택자로 HTML에서 요소 추출
 * @param html HTML 문자열
 * @param selector CSS 선택자 (예: '.class', '#id', 'div > a')
 * @param maxCount 최대 추출 개수
 * @returns 추출된 텍스트 배열
 */
export function extractBySelector(
  html: string,
  selector: string,
  maxCount: number = 10
): string[] {
  const $ = cheerio.load(html)
  const elements = $(selector).slice(0, maxCount)
  return elements
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(text => text.length > 0)
}

/**
 * 정규식으로 HTML에서 매칭된 텍스트 추출 (하위 호환성 유지)
 * @deprecated extractBySelector 사용 권장
 */
export function extractMatches(
  html: string,
  pattern: RegExp,
  maxCount: number = 10
): string[] {
  const matches = html.match(pattern) || []
  return matches
    .slice(0, maxCount)
    .map(match => match.replace(/<[^>]*>/g, '').trim())
    .filter(text => text.length > 0)
}

/**
 * cheerio 인스턴스 생성 헬퍼
 * @param html HTML 문자열
 * @returns cheerio 인스턴스
 */
export function loadHtml(html: string): ReturnType<typeof cheerio.load> {
  return cheerio.load(html)
}

/**
 * 속성 값 추출
 * @param html HTML 문자열
 * @param selector CSS 선택자
 * @param attribute 속성 이름 (예: 'href', 'src')
 * @returns 속성 값 배열
 */
export function extractAttributes(
  html: string,
  selector: string,
  attribute: string,
  maxCount: number = 10
): string[] {
  const $ = cheerio.load(html)
  return $(selector)
    .slice(0, maxCount)
    .map((_, el) => $(el).attr(attribute) || '')
    .get()
    .filter(attr => attr.length > 0)
}

/**
 * RawRecord 생성 헬퍼
 */
export function createRawRecord(
  source: string,
  title: string,
  url: string,
  content: string,
  date?: string
): Record<string, unknown> {
  return {
    title,
    url,
    date: date ?? new Date().toISOString(),
    content,
    source,
  }
}

/**
 * 여러 RawRecord를 일괄 생성
 */
export function createRawRecords(
  source: string,
  baseUrl: string,
  items: Array<{
    title: string
    content: string
    url?: string
    date?: string
  }>
): Record<string, unknown>[] {
  return items.map(item =>
    createRawRecord(
      source,
      item.title,
      item.url ? resolveUrl(baseUrl, item.url) : baseUrl,
      item.content,
      item.date
    )
  )
}

/**
 * 상대 URL을 절대 URL로 변환
 */
export function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href
  } catch {
    return relativeUrl.startsWith('http') ? relativeUrl : baseUrl
  }
}

/**
 * 구조화된 아이템 추출 (제목, 링크, 날짜, 내용)
 */
export interface StructuredItem {
  title: string
  url?: string
  date?: string
  content: string
}

export function extractStructuredItems(
  html: string,
  itemSelector: string,
  options: {
    titleSelector?: string
    urlSelector?: string
    dateSelector?: string
    contentSelector?: string
    maxCount?: number
  } = {}
): StructuredItem[] {
  const $ = loadHtml(html)
  const {
    titleSelector = 'a, .title, h1, h2, h3',
    urlSelector = 'a',
    dateSelector = '.date, .published, time, [datetime]',
    contentSelector = '.content, .description, p',
    maxCount = 20,
  } = options

  const items: StructuredItem[] = []
  const elements = $(itemSelector).slice(0, maxCount)

  elements.each((_, el) => {
    const $el = $(el)
    
    // 제목 추출
    const title = $el.find(titleSelector).first().text().trim() 
      || $el.text().trim().split('\n')[0].trim()
      || 'Untitled'

    // URL 추출
    const url = $el.find(urlSelector).first().attr('href') 
      || $el.attr('href')
      || undefined

    // 날짜 추출
    const date = $el.find(dateSelector).first().attr('datetime')
      || $el.find(dateSelector).first().text().trim()
      || $el.attr('datetime')
      || undefined

    // 내용 추출
    const content = $el.find(contentSelector).first().text().trim()
      || $el.text().trim()
      || title

    if (title && title !== 'Untitled') {
      items.push({ title, url, date, content })
    }
  })

  return items.filter(item => item.title.length > 0)
}

/**
 * 링크와 텍스트를 함께 추출
 */
export function extractLinks(
  html: string,
  linkSelector: string = 'a[href]',
  maxCount: number = 20
): Array<{ title: string; url: string }> {
  const $ = loadHtml(html)
  const links: Array<{ title: string; url: string }> = []

  $(linkSelector).slice(0, maxCount).each((_, el) => {
    const $el = $(el)
    const url = $el.attr('href')
    const title = $el.text().trim() || $el.attr('title') || url || ''

    if (url && title) {
      links.push({ title, url })
    }
  })

  return links
}

/**
 * Mercury Parser를 사용한 콘텐츠 추출
 * @mozilla/readability와 함께 사용하여 최적의 결과 선택
 */
export interface MercuryResult {
  title?: string
  content?: string
  author?: string
  datePublished?: string
  leadImageUrl?: string
  excerpt?: string
  wordCount?: number
  direction?: string
}

export async function extractContentWithMercury(
  html: string,
  url: string
): Promise<MercuryResult | null> {
  try {
    // 동적 import로 Mercury Parser 로드 (@postlight/parser로 변경됨)
    const Parser = await import('@postlight/parser')
    
    // @postlight/parser는 default export를 사용
    const parser = Parser.default || Parser
    const result = await parser.parse(url, {
      html,
    })

    if (!result || !result.content) {
      console.warn('[Mercury Parser] No content extracted', { url })
      return null
    }

    console.log('[Mercury Parser] Successfully extracted content', {
      url,
      title: result.title,
      contentLength: result.content?.length || 0,
      author: result.author,
      datePublished: result.date_published,
    })

    return {
      title: result.title || undefined,
      content: result.content || undefined,
      author: result.author || undefined,
      datePublished: result.date_published || undefined,
      leadImageUrl: result.lead_image_url || undefined,
      excerpt: result.excerpt || undefined,
      wordCount: result.word_count || undefined,
      direction: result.direction || undefined,
    }
  } catch (error) {
    // Mercury Parser 실패 시 null 반환 (fallback 사용)
    console.warn('[Mercury Parser] Failed to extract content', {
      url,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Readability와 Mercury 결과를 비교하여 최적의 결과 선택
 */
export interface BestExtractionResult {
  title: string
  content: string
  author?: string
  datePublished?: string
  excerpt?: string
  method: 'readability' | 'mercury' | 'hybrid'
  confidence: number
}

export async function extractBestContent(
  html: string,
  url: string
): Promise<BestExtractionResult | null> {
  console.log('[extractBestContent] Starting hybrid extraction', { url })
  
  // Readability와 Mercury 병렬 실행
  const [readabilityResult, mercuryResult] = await Promise.all([
    extractMainContentWithReadability(html, url),
    extractContentWithMercury(html, url),
  ])

  console.log('[extractBestContent] Results', {
    url,
    readabilitySuccess: !!readabilityResult,
    mercurySuccess: !!mercuryResult,
    readabilityLength: readabilityResult?.content.length || 0,
    mercuryLength: mercuryResult?.content?.length || 0,
  })

  // 둘 다 실패한 경우
  if (!readabilityResult && !mercuryResult) {
    return null
  }

  // Readability만 성공한 경우
  if (readabilityResult && !mercuryResult) {
    return {
      title: readabilityResult.title || 'Untitled',
      content: readabilityResult.content,
      excerpt: readabilityResult.excerpt,
      method: 'readability',
      confidence: readabilityResult.confidence,
    }
  }

  // Mercury만 성공한 경우
  if (!readabilityResult && mercuryResult) {
    return {
      title: mercuryResult.title || 'Untitled',
      content: mercuryResult.content || '',
      author: mercuryResult.author,
      datePublished: mercuryResult.datePublished,
      method: 'mercury',
      confidence: mercuryResult.content && mercuryResult.content.length > 100 ? 0.85 : 0.7,
    }
  }

  // 둘 다 성공한 경우 - 더 나은 결과 선택
  const readability = readabilityResult!
  const mercury = mercuryResult!

  // 콘텐츠 길이와 품질 비교
  const readabilityScore = readability.content.length > 200 ? readability.confidence : readability.confidence * 0.7
  const mercuryScore = mercury.content && mercury.content.length > 200 ? 0.85 : 0.7

  // 더 긴 콘텐츠와 더 나은 제목을 가진 것을 선택
  const readabilityBetter = 
    readability.content.length > (mercury.content?.length || 0) * 0.8 &&
    readability.title && readability.title.length > 5

  const mercuryBetter =
    mercury.content && mercury.content.length > readability.content.length * 0.8 &&
    mercury.title && mercury.title.length > 5

  if (readabilityBetter && readabilityScore >= mercuryScore) {
    return {
      title: readability.title || mercury.title || 'Untitled',
      content: readability.content,
      excerpt: readability.excerpt,
      author: mercury.author, // Mercury에서 추가 정보 가져오기
      datePublished: mercury.datePublished,
      method: 'hybrid',
      confidence: Math.max(readabilityScore, mercuryScore),
    }
  } else if (mercuryBetter) {
    return {
      title: mercury.title || readability.title || 'Untitled',
      content: mercury.content || '',
      author: mercury.author,
      datePublished: mercury.datePublished || undefined,
      excerpt: mercury.excerpt || readability.excerpt,
      method: 'hybrid',
      confidence: Math.max(readabilityScore, mercuryScore),
    }
  } else {
    // 기본적으로 Readability 선택 (더 안정적)
    return {
      title: readability.title || mercury.title || 'Untitled',
      content: readability.content,
      excerpt: readability.excerpt || mercury.excerpt,
      author: mercury.author,
      datePublished: mercury.datePublished,
      method: 'hybrid',
      confidence: readabilityScore,
    }
  }
}

/**
 * Zero-Shot Classification export
 */
export {
  classifyWithZeroShot,
  classifyBatch,
  classifyWithScores,
  type ZeroShotClassificationResult,
  type ZeroShotClassificationOptions,
} from './zeroShotClassifier.js'

/**
 * 구조화된 콘텐츠 추출 export
 */
export {
  extractStructuredContent,
  formatStructuredContent,
  type StructuredContent,
} from './structured/index.js'

/**
 * 데이터 분류 및 고품질 추출 알고리즘 export
 */
export {
  classifyCategory,
  extractHighQualityField,
  evaluateQuality,
  extractHighQualityData,
  organizeByCategory,
  extractMainContentWithReadability,
  type CategoryHierarchy,
  type ExtractedField,
  type HighQualityItem,
} from './dataClassifier.js'
