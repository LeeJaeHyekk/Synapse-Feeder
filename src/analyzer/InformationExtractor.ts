/**
 * Information Extractor
 * 
 * 책임: 페이지에서 정보 단위 추출
 * - Content Block 탐지
 * - Field 자동 탐지 (휴리스틱)
 */

import * as cheerio from 'cheerio'
import type { ContentBlock, DetectedField, PageRole } from './types.js'

/**
 * Semantic Type 추론
 */
function inferSemanticType(pageRole: PageRole): 'NOTICE' | 'RECRUIT' | 'EVENT' | 'UNKNOWN' {
  if (pageRole.includes('NOTICE')) return 'NOTICE'
  if (pageRole.includes('RECRUIT')) return 'RECRUIT'
  if (pageRole.includes('EVENT')) return 'EVENT'
  return 'UNKNOWN'
}

/**
 * 테이블 행에서 필드 탐지
 */
function detectFieldsFromRow(
  row: cheerio.Cheerio<cheerio.Element>,
  $: cheerio.CheerioAPI
): DetectedField[] {
  const fields: DetectedField[] = []
  const cells = row.find('td')

  cells.each((_, cell) => {
    const $cell = $(cell)
    const text = $cell.text().trim()

    // 날짜 필드 (YYYY-MM-DD, YY.MM.DD 등)
    if (/\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2}/.test(text) || /\d{2}[.\-\/]\d{1,2}[.\-\/]\d{1,2}/.test(text)) {
      fields.push({
        name: 'date',
        selector: 'td',
        confidence: 0.9,
      })
    }

    // 부서 필드 (팀, 부, 과로 끝나는 경우)
    if (/팀$|부$|과$|실$/.test(text) && text.length < 20) {
      fields.push({
        name: 'department',
        selector: 'td',
        confidence: 0.7,
      })
    }

    // 조회수 필드 (숫자만 있고 범위가 적절한 경우)
    if (/^\d+$/.test(text)) {
      const num = parseInt(text)
      if (num > 0 && num < 1000000) {
        fields.push({
          name: 'views',
          selector: 'td',
          confidence: 0.6,
        })
      }
    }

    // 링크가 있으면 제목 또는 상세 URL
    const link = $cell.find('a').first()
    if (link.length > 0) {
      const href = link.attr('href') || ''
      const linkText = link.text().trim()

      // 상세 URL 패턴
      if (
        href &&
        (href.includes('rNo=') ||
          href.includes('view') ||
          href.includes('detail') ||
          href.includes('read') ||
          /no=\d+/i.test(href))
      ) {
        fields.push({
          name: 'detailUrl',
          selector: 'td a',
          confidence: 0.8,
        })
      }

      // 제목 필드 (링크 텍스트가 있고 길이가 적절한 경우)
      if (linkText && linkText.length > 5 && linkText.length < 200) {
        fields.push({
          name: 'title',
          selector: 'td a',
          confidence: 0.9,
        })
      }
    } else if (text.length > 5 && text.length < 200) {
      // 링크가 없지만 텍스트가 있으면 제목일 가능성
      fields.push({
        name: 'title',
        selector: 'td',
        confidence: 0.6,
      })
    }
  })

  return fields
}

/**
 * 요소에서 필드 탐지 (article, .post 등)
 */
function detectFieldsFromElement(
  element: cheerio.Cheerio<cheerio.Element>,
  $: cheerio.CheerioAPI
): DetectedField[] {
  const fields: DetectedField[] = []
  const $el = $(element)

  // 제목 (h1, h2, .title 등)
  const titleSelectors = ['h1', 'h2', '.title', '.post-title', '.article-title']
  for (const selector of titleSelectors) {
    const titleEl = $el.find(selector).first()
    if (titleEl.length > 0) {
      fields.push({
        name: 'title',
        selector,
        confidence: 0.9,
      })
      break
    }
  }

  // 날짜
  const dateSelectors = ['.date', '.published', 'time', '[datetime]']
  for (const selector of dateSelectors) {
    const dateEl = $el.find(selector).first()
    if (dateEl.length > 0) {
      fields.push({
        name: 'date',
        selector,
        confidence: 0.8,
      })
      break
    }
  }

  // 작성자
  const authorSelectors = ['.author', '.writer', '.by']
  for (const selector of authorSelectors) {
    const authorEl = $el.find(selector).first()
    if (authorEl.length > 0) {
      fields.push({
        name: 'author',
        selector,
        confidence: 0.8,
      })
      break
    }
  }

  // 본문
  const contentSelectors = ['.content', '.article-content', '.post-content', 'article']
  for (const selector of contentSelectors) {
    const contentEl = $el.find(selector).first()
    if (contentEl.length > 0) {
      fields.push({
        name: 'content',
        selector,
        confidence: 0.9,
      })
      break
    }
  }

  // 상세 URL
  const link = $el.find('a').first()
  if (link.length > 0) {
    const href = link.attr('href') || ''
    if (href && (href.includes('view') || href.includes('detail'))) {
      fields.push({
        name: 'detailUrl',
        selector: 'a',
        confidence: 0.7,
      })
    }
  }

  return fields
}

/**
 * 콘텐츠 블록 추출
 */
export function extractContentBlocks(
  html: string,
  pageRole: PageRole
): ContentBlock[] {
  const $ = cheerio.load(html)
  const blocks: ContentBlock[] = []
  const semanticType = inferSemanticType(pageRole)

  // 테이블 기반 리스트 탐지
  const tables = $('table tbody')
  if (tables.length > 0) {
    const firstRow = tables.first().find('tr').first()
    if (firstRow.length > 0) {
      const fields = detectFieldsFromRow(firstRow, $)

      if (fields.length > 0) {
        blocks.push({
          blockType: 'TABLE',
          semanticType,
          fields,
          selector: 'table tbody tr',
        })
      }
    }
  }

  // article 기반 리스트 탐지
  const articles = $('article, .article, .post, .item')
  if (articles.length > 1) {
    const firstArticle = articles.first()
    const fields = detectFieldsFromElement(firstArticle, $)

    if (fields.length > 0) {
      blocks.push({
        blockType: 'LIST',
        semanticType,
        fields,
        selector: 'article, .article, .post, .item',
      })
    }
  }

  // 단일 article (상세 페이지)
  if (articles.length === 1) {
    const article = articles.first()
    const fields = detectFieldsFromElement(article, $)

    if (fields.length > 0) {
      blocks.push({
        blockType: 'DETAIL',
        semanticType,
        fields,
        selector: 'article, .article',
      })
    }
  }

  // 리스트 아이템 탐지 (ul > li)
  const listItems = $('ul li, ol li').filter((_, el) => {
    const $el = $(el)
    const text = $el.text().trim()
    return text.length > 20 // 최소 길이 체크
  })

  if (listItems.length > 3) {
    const firstItem = listItems.first()
    const fields = detectFieldsFromElement(firstItem, $)

    if (fields.length > 0) {
      blocks.push({
        blockType: 'LIST',
        semanticType,
        fields,
        selector: 'ul li, ol li',
      })
    }
  }

  return blocks
}
