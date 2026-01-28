/**
 * Page Classifier
 * 
 * 책임: 분석 결과를 의미 있는 타입으로 변환
 * - Rendering Type 판단
 * - Data Access Type 판단
 * - Page Role 추론 (휴리스틱)
 */

import * as cheerio from 'cheerio'
import type { PageProfile, PageRole, PageAnalysis } from './types.js'

/**
 * 페이지 역할 추론 (휴리스틱)
 * 
 * 완벽하지 않아도 됨 → 잘못 분류되면 config에서 override 가능
 */
export function inferPageRole(url: string, html: string): PageRole {
  const lowerUrl = url.toLowerCase()
  const lowerHtml = html.toLowerCase()
  const $ = cheerio.load(html)

  // 공지사항
  if (lowerUrl.includes('notice') || lowerUrl.includes('공지') || lowerHtml.includes('공지')) {
    return html.includes('tbody tr') || $('table tbody tr').length > 0
      ? 'LIST_NOTICE'
      : 'DETAIL_NOTICE'
  }

  // 채용
  if (
    lowerUrl.includes('recruit') ||
    lowerUrl.includes('채용') ||
    lowerHtml.includes('채용')
  ) {
    return html.includes('tbody tr') || $('table tbody tr').length > 0
      ? 'LIST_RECRUIT'
      : 'DETAIL_RECRUIT'
  }

  // 행사
  if (
    lowerUrl.includes('event') ||
    lowerUrl.includes('행사') ||
    lowerHtml.includes('행사')
  ) {
    return html.includes('tbody tr') || $('table tbody tr').length > 0
      ? 'LIST_EVENT'
      : 'DETAIL_EVENT'
  }

  // 상세 페이지 판단 (리스트가 아닌 경우)
  if (
    lowerUrl.includes('view') ||
    lowerUrl.includes('detail') ||
    lowerUrl.includes('read') ||
    $('article').length === 1 ||
    $('.article-content').length > 0
  ) {
    // 공지 상세
    if (lowerHtml.includes('공지')) return 'DETAIL_NOTICE'
    // 채용 상세
    if (lowerHtml.includes('채용')) return 'DETAIL_RECRUIT'
    // 행사 상세
    if (lowerHtml.includes('행사')) return 'DETAIL_EVENT'
    
    return 'DETAIL_NOTICE' // 기본값
  }

  return 'STATIC_PAGE'
}

/**
 * 페이지 분류 실행
 */
export function classifyPage(
  url: string,
  html: string,
  analysis: PageAnalysis
): PageProfile {
  // Rendering Type은 분석 결과 사용
  const renderingType = analysis.renderingType

  // Data Access Type은 분석 결과 사용
  const dataAccessType = analysis.dataAccessType

  // Page Role 추론
  const pageRole = inferPageRole(url, html)

  return {
    renderingType,
    dataAccessType,
    pageRole,
  }
}
