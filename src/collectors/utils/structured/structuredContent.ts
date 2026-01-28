/**
 * 구조화된 콘텐츠 추출 메인 함수
 */

import { loadHtml } from '../htmlParser.js'
import type { StructuredContent } from './types.js'
import { SEMANTIC_SELECTORS } from './selectors.js'
import { extractHeader, extractSearch, extractMainContent, extractFooter, extractNavigation, extractSidebar } from './sectionExtractors.js'

/**
 * HTML을 구조화된 콘텐츠로 변환
 */
export function extractStructuredContent(html: string): StructuredContent {
  const $ = loadHtml(html)
  const structured: StructuredContent = {}
  
  // 네비게이션 추출
  const navTexts = extractNavigation($)
  if (navTexts.length > 0) {
    structured.navigation = navTexts.slice(0, 30)
  }
  
  // 헤더 추출
  const header = extractHeader($)
  if (header) {
    structured.header = header
  }
  
  // 검색 영역 추출
  const search = extractSearch($)
  if (search) {
    structured.search = search
  }
  
  // 메인 콘텐츠 추출
  const mainContent = extractMainContent($)
  if (mainContent) {
    structured.mainContent = mainContent
  }
  
  // 사이드바 추출
  const sidebarTexts = extractSidebar($)
  if (sidebarTexts.length > 0) {
    structured.sidebar = [{
      title: 'Sidebar',
      items: sidebarTexts.slice(0, 30),
    }]
  }
  
  // 푸터 추출
  const footer = extractFooter($)
  if (footer) {
    structured.footer = footer
  }
  
  return structured
}

/**
 * 구조화된 콘텐츠를 가독성 있는 문자열로 변환
 */
export function formatStructuredContent(structured: StructuredContent): string {
  const parts: string[] = []
  
  if (structured.navigation && structured.navigation.length > 0) {
    parts.push('## 네비게이션')
    structured.navigation.forEach(item => parts.push(`- ${item}`))
    parts.push('')
  }
  
  if (structured.header) {
    parts.push('## 헤더')
    if (structured.header.brand) {
      parts.push(`브랜드: ${structured.header.brand}`)
    }
    if (structured.header.services && structured.header.services.length > 0) {
      parts.push('서비스:')
      structured.header.services.forEach(service => parts.push(`  - ${service}`))
    }
    parts.push('')
  }
  
  if (structured.search) {
    parts.push('## 검색')
    if (structured.search.area) {
      parts.push(`영역: ${structured.search.area}`)
    }
    if (structured.search.keywords && structured.search.keywords.length > 0) {
      parts.push('키워드:')
      structured.search.keywords.forEach(keyword => parts.push(`  - ${keyword}`))
    }
    parts.push('')
  }
  
  if (structured.mainContent) {
    parts.push('## 메인 콘텐츠')
    if (structured.mainContent.title) {
      parts.push(`제목: ${structured.mainContent.title}`)
    }
    if (structured.mainContent.sections && structured.mainContent.sections.length > 0) {
      structured.mainContent.sections.forEach(section => {
        parts.push(`### ${section.name}`)
        if (section.items && section.items.length > 0) {
          section.items.forEach(item => parts.push(`  - ${item}`))
        }
        if (section.products && section.products.length > 0) {
          section.products.forEach(product => {
            parts.push(`  - ${product.title || 'Untitled'}`)
            if (product.price) parts.push(`    가격: ${product.price}`)
            if (product.deliveryFee) parts.push(`    배송비: ${product.deliveryFee}`)
          })
        }
        if (section.rankings && section.rankings.length > 0) {
          section.rankings.forEach(ranking => {
            parts.push(`  ${ranking.rank}위: ${ranking.title}`)
            if (ranking.change) parts.push(`    변화: ${ranking.change}`)
          })
        }
        parts.push('')
      })
    }
  }
  
  if (structured.sidebar && structured.sidebar.length > 0) {
    parts.push('## 사이드바')
    structured.sidebar.forEach(sidebar => {
      parts.push(`### ${sidebar.title}`)
      sidebar.items.forEach(item => parts.push(`  - ${item}`))
    })
    parts.push('')
  }
  
  if (structured.footer) {
    parts.push('## 푸터')
    if (structured.footer.links && structured.footer.links.length > 0) {
      parts.push('링크:')
      structured.footer.links.forEach(link => parts.push(`  - ${link}`))
    }
    if (structured.footer.copyright) {
      parts.push(`저작권: ${structured.footer.copyright}`)
    }
    if (structured.footer.companyInfo) {
      parts.push('회사 정보:')
      Object.entries(structured.footer.companyInfo).forEach(([key, value]) => {
        parts.push(`  ${key}: ${value}`)
      })
    }
  }
  
  return parts.join('\n')
}
