/**
 * Information Model Builder
 * 
 * 책임: ContentBlock을 PageDataModel로 변환
 * - 실제 데이터 추출
 * - 페이지 기준 정규화 (Article 이전 단계)
 */

import * as cheerio from 'cheerio'
import type {
  ContentBlock,
  PageDataModel,
  ExtractedItem,
  DetectedField,
} from './types.js'

/**
 * 필드 값 추출
 */
function extractFieldValue(
  $el: cheerio.Cheerio<cheerio.Element>,
  field: DetectedField,
  baseUrl: string
): string | undefined {
  if (!field.selector) return undefined

  let element: cheerio.Cheerio<cheerio.Element>

  // 상대 셀렉터인 경우 (td a 등)
  if (field.selector.includes(' ')) {
    element = $el.find(field.selector).first()
  } else {
    // 절대 셀렉터인 경우
    element = $el.find(field.selector).first()
  }

  if (element.length === 0) return undefined

  // 상세 URL인 경우 href 속성 추출
  if (field.name === 'detailUrl') {
    const href = element.attr('href')
    if (!href) return undefined

    try {
      return new URL(href, baseUrl).href
    } catch {
      return href.startsWith('http') ? href : undefined
    }
  }

  // datetime 속성이 있으면 사용
  if (field.name === 'date') {
    const datetime = element.attr('datetime')
    if (datetime) return datetime
  }

  // 텍스트 추출
  const text = element.text().trim()
  return text || undefined
}

/**
 * 페이지 데이터 모델 빌드
 */
export function buildPageDataModel(
  html: string,
  blocks: ContentBlock[],
  baseUrl: string
): PageDataModel {
  const $ = cheerio.load(html)
  const items: ExtractedItem[] = []

  for (const block of blocks) {
    if (!block.selector) continue

    const elements = $(block.selector)

    elements.each((_, el) => {
      const $el = $(el)
      const item: ExtractedItem = {
        blockType: block.blockType,
        semanticType: block.semanticType,
        fields: {},
      }

      // 각 필드 추출
      for (const field of block.fields) {
        const value = extractFieldValue($el, field, baseUrl)
        if (value) {
          item.fields[field.name] = value
        }
      }

      // 최소 1개 필드라도 있어야 추가
      if (Object.keys(item.fields).length > 0) {
        items.push(item)
      }
    })
  }

  return {
    pageUrl: baseUrl,
    blocks,
    items,
  }
}
