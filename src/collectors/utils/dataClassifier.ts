/**
 * 데이터 분류 및 고품질 추출 알고리즘
 * 
 * 목표:
 * 1. 대분류 → 소분류 계층적 분류
 * 2. 각 분류에서 정확한 필드 추출
 * 3. 데이터 품질 평가 및 검증
 */

import type { ReturnType } from 'cheerio'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { loadHtml } from './htmlParser.js'

/**
 * 계층적 분류 구조
 */
export interface CategoryHierarchy {
  /** 대분류 (예: "공지사항", "세미나", "행사") */
  majorCategory: string
  /** 소분류 (예: "긴급공지", "일반공지", "교육세미나") */
  minorCategory?: string
  /** 신뢰도 점수 (0-1) */
  confidence: number
  /** 분류 근거 */
  reason: string
}

/**
 * 추출된 필드 데이터
 */
export interface ExtractedField {
  /** 필드 이름 */
  name: string
  /** 필드 값 */
  value: string
  /** 신뢰도 점수 (0-1) */
  confidence: number
  /** 추출 방법 */
  method: string
}

/**
 * 고품질 데이터 항목
 */
export interface HighQualityItem {
  /** 제목 */
  title: string
  /** URL */
  url?: string
  /** 날짜 */
  date?: string
  /** 작성자 */
  author?: string
  /** 본문 내용 */
  content: string
  /** 첨부파일 */
  attachments?: string[]
  /** 분류 정보 */
  category: CategoryHierarchy
  /** 추출된 모든 필드 */
  fields: ExtractedField[]
  /** 전체 품질 점수 (0-1) */
  qualityScore: number
}

/**
 * 분류 키워드 패턴
 */
const CATEGORY_PATTERNS: Record<string, { major: string; minors: string[] }> = {
  notice: {
    major: '공지사항',
    minors: ['긴급', '일반', '안내', '알림', '공고'],
  },
  seminar: {
    major: '세미나',
    minors: ['교육', '네트워킹', '워크샵', '강연', '포럼'],
  },
  event: {
    major: '행사',
    minors: ['전시', '박람회', '컨퍼런스', '축제', '이벤트'],
  },
  news: {
    major: '뉴스',
    minors: ['보도자료', '언론보도', '기사', '인터뷰'],
  },
}

/**
 * 필드 추출 패턴 (우선순위 순)
 */
const FIELD_PATTERNS = {
  title: [
    { selector: 'h1.title, .article-title, .post-title', weight: 1.0 },
    { selector: 'h1, h2.title', weight: 0.9 },
    { selector: '.title, [class*="title"]', weight: 0.8 },
    { selector: 'title', weight: 0.7 },
  ],
  date: [
    { selector: 'time[datetime], [datetime]', attr: 'datetime', weight: 1.0 },
    { selector: '.date, .published, .created', weight: 0.9 },
    { selector: '[class*="date"], [class*="time"]', weight: 0.8 },
    { selector: 'time', weight: 0.7 },
  ],
  author: [
    { selector: '.author, .writer, .by', weight: 1.0 },
    { selector: '[class*="author"], [class*="writer"]', weight: 0.9 },
    { selector: '.user, .name', weight: 0.7 },
  ],
  content: [
    { selector: '.content, .article-content, .post-content', weight: 1.0 },
    { selector: '.body, .text, article', weight: 0.9 },
    { selector: '[class*="content"], [class*="body"]', weight: 0.8 },
    { selector: 'main, .main-content', weight: 0.7 },
  ],
}

/**
 * 텍스트에서 카테고리 분류
 */
export function classifyCategory(text: string): CategoryHierarchy {
  const lowerText = text.toLowerCase()
  let bestMatch: CategoryHierarchy | null = null
  let maxConfidence = 0

  for (const [key, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    // 대분류 매칭
    const majorMatch = lowerText.includes(pattern.major.toLowerCase())
    if (!majorMatch) continue

    let minorCategory: string | undefined
    let confidence = 0.6 // 기본 대분류 신뢰도
    let reason = `대분류 "${pattern.major}" 매칭`

    // 소분류 매칭
    for (const minor of pattern.minors) {
      if (lowerText.includes(minor.toLowerCase())) {
        minorCategory = minor
        confidence = 0.9 // 소분류까지 매칭되면 높은 신뢰도
        reason = `대분류 "${pattern.major}", 소분류 "${minor}" 매칭`
        break
      }
    }

    if (confidence > maxConfidence) {
      maxConfidence = confidence
      bestMatch = {
        majorCategory: pattern.major,
        minorCategory,
        confidence,
        reason,
      }
    }
  }

  // 매칭되지 않으면 기본 분류
  return (
    bestMatch || {
      majorCategory: '기타',
      confidence: 0.3,
      reason: '명확한 분류 패턴 없음',
    }
  )
}

/**
 * 고품질 필드 추출 (다양한 패턴 시도)
 */
export function extractHighQualityField(
  $: ReturnType<typeof loadHtml>,
  fieldName: keyof typeof FIELD_PATTERNS,
  context?: ReturnType<typeof loadHtml> | any // Cheerio 요소도 허용
): ExtractedField | null {
  const patterns = FIELD_PATTERNS[fieldName]
  
  // context가 Cheerio 요소인지 Cheerio 인스턴스인지 확인
  const isCheerioElement = context && typeof context.find === 'function' && typeof context.attr === 'function'
  const searchContext = isCheerioElement ? context : (context || $)

  for (const pattern of patterns) {
    let elements: any
    
    if (isCheerioElement) {
      // Cheerio 요소인 경우 find 사용
      elements = searchContext.find(pattern.selector)
    } else {
      // Cheerio 인스턴스인 경우 직접 셀렉터 사용
      elements = searchContext(pattern.selector)
    }

    if (elements && elements.length > 0) {
      const element = elements.first()
      let value = ''

      if (pattern.attr) {
        value = element.attr(pattern.attr) || ''
      } else {
        value = element.text().trim()
      }

      if (value && value.length > 0) {
        return {
          name: fieldName,
          value,
          confidence: pattern.weight,
          method: `selector: ${pattern.selector}`,
        }
      }
    }
  }

  return null
}

/**
 * @mozilla/readability를 사용한 전체 페이지 본문 추출 (고급)
 */
export function extractMainContentWithReadability(
  html: string,
  baseUrl: string = 'https://example.com'
): { content: string; title?: string; excerpt?: string } | null {
  try {
    const dom = new JSDOM(html, { url: baseUrl })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (article && article.textContent && article.textContent.trim().length > 50) {
      return {
        content: article.textContent.trim(),
        title: article.title,
        excerpt: article.excerpt,
      }
    }
  } catch (err) {
    // 실패 시 null 반환
  }

  return null
}

/**
 * 데이터 품질 평가
 */
export function evaluateQuality(item: Partial<HighQualityItem>): number {
  let score = 0
  let maxScore = 0

  // 제목 (필수, 가중치 0.3)
  maxScore += 0.3
  if (item.title && item.title.length > 5) {
    score += 0.3
  } else if (item.title && item.title.length > 0) {
    score += 0.15
  }

  // URL (선택, 가중치 0.2)
  maxScore += 0.2
  if (item.url && item.url.startsWith('http')) {
    score += 0.2
  }

  // 날짜 (선택, 가중치 0.2)
  maxScore += 0.2
  if (item.date && item.date.match(/\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2}/)) {
    score += 0.2
  } else if (item.date && item.date.length > 0) {
    score += 0.1
  }

  // 본문 내용 (필수, 가중치 0.3)
  maxScore += 0.3
  if (item.content && item.content.length > 100) {
    score += 0.3
  } else if (item.content && item.content.length > 50) {
    score += 0.2
  } else if (item.content && item.content.length > 0) {
    score += 0.1
  }

  return score / maxScore
}

/**
 * @mozilla/readability를 사용한 본문 추출 (고품질)
 */
function extractContentWithReadability(
  html: string,
  baseUrl: string
): { content: string; title?: string; excerpt?: string; confidence: number } | null {
  try {
    const dom = new JSDOM(html, { url: baseUrl })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (article && article.textContent && article.textContent.trim().length > 50) {
      return {
        content: article.textContent.trim(),
        title: article.title,
        excerpt: article.excerpt,
        confidence: 0.95, // Mozilla Readability는 매우 높은 신뢰도
      }
    }
  } catch (err) {
    // Readability 실패 시 무시하고 기본 방법 사용
  }

  return null
}

/**
 * HTML에서 고품질 데이터 추출 (cheer-reader 통합)
 */
export function extractHighQualityData(
  html: string,
  baseUrl: string
): HighQualityItem[] {
  const $ = loadHtml(html)
  const items: HighQualityItem[] = []

  // 페이지 전체에서 주요 섹션 찾기
  const sectionSelectors = [
    'article',
    '.article',
    '.post',
    '.item',
    'li[class*="item"]',
    '.list-item',
    'tr:not(:first-child)', // 테이블 행
  ]

  for (const sectionSelector of sectionSelectors) {
    const sections = $(sectionSelector).slice(0, 20)

    sections.each((_, section) => {
      const $section = $(section)
      const sectionText = $section.text().trim()

      // 최소 길이 체크
      if (sectionText.length < 10) return

      // 카테고리 분류
      const category = classifyCategory(sectionText)

      // 필드 추출 (기본 방법)
      let titleField = extractHighQualityField($, 'title', $section)
      const dateField = extractHighQualityField($, 'date', $section)
      const authorField = extractHighQualityField($, 'author', $section)
      const contentField = extractHighQualityField($, 'content', $section)

      // @mozilla/readability를 사용한 고품질 본문 추출 시도
      let finalContent = contentField?.value || sectionText
      let contentConfidence = contentField?.confidence || 0.5
      let readabilityResult: { content: string; title?: string; excerpt?: string; confidence: number } | null = null

      // 섹션의 HTML을 추출하여 Readability 적용 시도
      const sectionHtml = $section.html() || ''
      if (sectionHtml.length > 100) {
        readabilityResult = extractContentWithReadability(sectionHtml, baseUrl)
      }

      // Readability 결과가 더 좋으면 사용
      if (readabilityResult && readabilityResult.confidence > contentConfidence) {
        finalContent = readabilityResult.content
        contentConfidence = readabilityResult.confidence

        // Readability가 제목도 추출했고 더 정확하면 사용
        if (readabilityResult.title && (!titleField || titleField.confidence < 0.9)) {
          titleField = {
            name: 'title',
            value: readabilityResult.title,
            confidence: 0.95,
            method: '@mozilla/readability',
          }
        }
      }

      // Readability가 실패했거나 섹션 단위로 작동하지 않으면 전체 페이지에서 시도
      if (!readabilityResult || readabilityResult.content.length < 50) {
        const fullPageReadability = extractContentWithReadability(html, baseUrl)
        if (fullPageReadability && fullPageReadability.content.length > finalContent.length) {
          finalContent = fullPageReadability.content
          contentConfidence = fullPageReadability.confidence

          if (fullPageReadability.title && (!titleField || titleField.confidence < 0.9)) {
            titleField = {
              name: 'title',
              value: fullPageReadability.title,
              confidence: 0.95,
              method: '@mozilla/readability (full page)',
            }
          }
        }
      }

      // URL 추출
      const urlElement = $section.find('a').first()
      const url = urlElement.attr('href')
        ? new URL(urlElement.attr('href')!, baseUrl).href
        : undefined

      // 필드 배열 구성 (업데이트된 titleField 포함)
      const fields: ExtractedField[] = []
      if (titleField) fields.push(titleField)
      if (dateField) fields.push(dateField)
      if (authorField) fields.push(authorField)
      fields.push({
        name: 'content',
        value: finalContent,
        confidence: contentConfidence,
        method: readabilityResult ? '@mozilla/readability' : contentField?.method || 'selector',
      })

      // 데이터 구성
      const item: Partial<HighQualityItem> = {
        title: titleField?.value || sectionText.split('\n')[0].trim(),
        url,
        date: dateField?.value,
        author: authorField?.value,
        content: finalContent,
        category,
        fields,
      }

      // 품질 평가
      const qualityScore = evaluateQuality(item)

      // 최소 품질 기준 통과 시에만 추가
      if (qualityScore >= 0.4 && item.title && item.content) {
        items.push({
          ...item,
          qualityScore,
        } as HighQualityItem)
      }
    })
  }

  // 품질 점수로 정렬 (높은 순)
  return items.sort((a, b) => b.qualityScore - a.qualityScore)
}

/**
 * 계층적 데이터 구조로 변환
 */
export function organizeByCategory(
  items: HighQualityItem[]
): Record<string, Record<string, HighQualityItem[]>> {
  const organized: Record<string, Record<string, HighQualityItem[]>> = {}

  for (const item of items) {
    const major = item.category.majorCategory
    const minor = item.category.minorCategory || '기타'

    if (!organized[major]) {
      organized[major] = {}
    }

    if (!organized[major][minor]) {
      organized[major][minor] = []
    }

    organized[major][minor].push(item)
  }

  return organized
}
