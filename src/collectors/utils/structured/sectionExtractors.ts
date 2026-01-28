/**
 * 섹션별 추출기 (헤더, 검색, 푸터, 메인 콘텐츠)
 */

import type { StructuredContent, Section } from './types.js'
import { normalizeText, splitTextIntoTokens } from './textUtils.js'
import { SEMANTIC_SELECTORS, KEYWORD_SELECTORS, BRAND_SELECTORS } from './selectors.js'
import { detectSectionType } from './sectionDetector.js'
import { extractProductItems, extractRankingItems } from './itemExtractors.js'

type CheerioInstance = any

/**
 * 섹션별 텍스트 추출
 */
function extractSectionText($: CheerioInstance, selectors: string[]): string[] {
  const texts: string[] = []
  
  for (const selector of selectors) {
    $(selector).each((_index: number, el: any) => {
      const $el = $(el)
      
      // 링크나 버튼이 있으면 각각을 개별 항목으로 추출
      const links = $el.find('a, button')
      if (links.length > 0) {
        links.each((_linkIndex: number, linkEl: any) => {
          const linkText = normalizeText($(linkEl).text())
          if (linkText && linkText.length > 0 && linkText.length < 100) {
            texts.push(linkText)
          }
        })
      } else {
        // 링크가 없으면 텍스트를 토큰으로 분리
        const text = normalizeText($el.text())
        if (text.length > 0) {
          const tokens = splitTextIntoTokens(text)
          texts.push(...tokens)
        }
      }
    })
  }
  
  return [...new Set(texts)] // 중복 제거
}

/**
 * 헤더 정보 추출
 */
export function extractHeader($: CheerioInstance): StructuredContent['header'] {
  const header: StructuredContent['header'] = {}
  
  // 브랜드/로고
  for (const selector of BRAND_SELECTORS) {
    const brandEl = $(selector).first()
    if (brandEl.length > 0) {
      const brand = normalizeText(brandEl.text())
      if (brand && brand.length > 0 && brand.length < 50) {
        header.brand = brand
        break
      }
    }
  }
  
  // 서비스/메뉴 항목
  const headerContainer = $('header, .header, [role="banner"]').first()
  const container = headerContainer.length > 0 ? headerContainer : $('body')
  
  const services: string[] = []
  const menuItems: string[] = []
  
  // 링크 추출
  container.find('a').each((_index: number, el: any) => {
    const $el = $(el)
    const text = normalizeText($el.text())
    const href = $el.attr('href') || ''
    
    // 헤더 영역의 링크만 추출
    const parent = $el.parents('header, .header, nav, .nav, .gnb, [role="navigation"]')
    if (parent.length === 0 && headerContainer.length === 0) return
    
    if (text && text.length > 0 && text.length < 50) {
      if (/홈|메인|home|main/i.test(text) || /서비스|service/i.test(href)) {
        menuItems.push(text)
      } else {
        services.push(text)
      }
    }
  })
  
  // 텍스트가 붙어있는 경우 분리
  const headerText = normalizeText(container.text())
  if (headerText && services.length === 0 && menuItems.length === 0) {
    const tokens = splitTextIntoTokens(headerText)
    services.push(...tokens.filter(t => t.length > 1 && t.length < 30))
  }
  
  if (services.length > 0) {
    header.services = [...new Set(services)].slice(0, 15)
  }
  
  if (menuItems.length > 0) {
    header.menu = [...new Set(menuItems)].slice(0, 10)
  }
  
  return Object.keys(header).length > 0 ? header : undefined
}

/**
 * 검색 영역 추출
 */
export function extractSearch($: CheerioInstance): StructuredContent['search'] {
  const search: StructuredContent['search'] = {}
  
  const searchContainers = $(SEMANTIC_SELECTORS.search.join(', '))
  
  if (searchContainers.length > 0) {
    const searchContainer = searchContainers.first()
    const searchText = normalizeText(searchContainer.text())
    if (searchText) {
      search.area = searchText
    }
    
    // 검색 키워드 추출
    const keywords: string[] = []
    $(KEYWORD_SELECTORS.join(', ')).each((_index: number, el: any) => {
      const text = normalizeText($(el).text())
      if (text && text.length > 0 && text.length < 100) {
        const tokens = splitTextIntoTokens(text)
        keywords.push(...tokens)
      }
    })
    
    if (keywords.length > 0) {
      search.keywords = [...new Set(keywords)].slice(0, 30)
    }
    
    // 키워드 랭킹 추출
    const keywordRankings = extractRankingItems($, searchContainer)
    if (keywordRankings.length > 0) {
      search.keywordRankings = keywordRankings
    }
  }
  
  return Object.keys(search).length > 0 ? search : undefined
}

/**
 * 메인 콘텐츠 추출
 */
export function extractMainContent($: CheerioInstance): StructuredContent['mainContent'] {
  const mainContent: StructuredContent['mainContent'] = {}
  
  // 메인 콘텐츠 영역 찾기
  const mainSelectors = SEMANTIC_SELECTORS.main
  let mainContainer: any = $('body')
  
  for (const selector of mainSelectors) {
    const elements = $(selector)
    if (elements.length > 0) {
      mainContainer = elements.first() as any
      break
    }
  }
  
  const sections: Section[] = []
  
  // 섹션 헤더 찾기
  const sectionHeaders = mainContainer.find('h1, h2, h3, h4, h5, h6, .section-title, [class*="section-title"], [class*="title"]')
  const processedSections = new Set<string>()
  
  sectionHeaders.each((_headerIndex: number, headerEl: any) => {
    const $header = $(headerEl)
    const sectionName = normalizeText($header.text())
    
    // 너무 길거나 짧은 섹션명 제외
    if (!sectionName || sectionName.length < 2 || sectionName.length > 150) return
    
    // 중복 제거
    const sectionKey = sectionName.substring(0, 50)
    if (processedSections.has(sectionKey)) return
    processedSections.add(sectionKey)
    
    // 섹션 컨테이너 찾기
    let sectionContainer = $header.next()
    if (sectionContainer.length === 0) {
      sectionContainer = $header.parent().next()
    }
    if (sectionContainer.length === 0) {
      sectionContainer = $header.parent()
    }
    
    // 섹션 타입 감지
    const sectionContainerForType = sectionContainer.length > 0 ? sectionContainer : $header.parent()
    const sectionType = detectSectionType(sectionContainerForType as any, sectionName)
    
    const section: Section = {
      name: sectionName,
      type: sectionType,
    }
    
    // 타입별 데이터 추출
    const containerForExtraction = sectionContainer.length > 0 ? sectionContainer : $header.parent()
    if (sectionType === 'ranking') {
      const rankings = extractRankingItems($, containerForExtraction as any)
      if (rankings.length > 0) {
        section.rankings = rankings
      }
    } else if (sectionType === 'product') {
      const products = extractProductItems($, containerForExtraction as any)
      if (products.length > 0) {
        section.products = products
      }
    }
    
    // 일반 텍스트 아이템 추출
    if (!section.rankings && !section.products) {
      const items: string[] = []
      
      // 리스트 아이템 추출
      const listItems = sectionContainer.find('li, .item, [class*="item"]')
      if (listItems.length > 0) {
        listItems.each((_itemIndex: number, itemEl: any) => {
          const itemText = normalizeText($(itemEl).text())
          if (itemText && itemText.length > 2 && itemText.length < 300) {
            const tokens = splitTextIntoTokens(itemText)
            if (tokens.length > 0) {
              items.push(...tokens)
            } else {
              items.push(itemText)
            }
          }
        })
      } else {
        // 직접 텍스트 추출 및 분리
        const containerText = normalizeText(sectionContainer.text())
        if (containerText && containerText.length > 5) {
          const tokens = splitTextIntoTokens(containerText)
          items.push(...tokens.slice(0, 30))
        }
      }
      
      if (items.length > 0) {
        section.items = [...new Set(items)].slice(0, 30)
      }
    }
    
    // 섹션이 유효한 데이터를 가지고 있으면 추가
    if (section.rankings || section.products || (section.items && section.items.length > 0)) {
      sections.push(section)
    }
  })
  
  // 섹션 헤더가 없는 경우에도 주요 블록 추출
  if (sections.length === 0) {
    const blocks = mainContainer.find('section, .section, [class*="section"], article, .article')
    blocks.each((_blockIndex: number, blockEl: any) => {
      const $block = $(blockEl)
      const blockText = normalizeText($block.text())
      
      if (blockText.length < 20) return
      
      const sectionType = detectSectionType($block, blockText)
      const section: Section = {
        name: blockText.substring(0, 50) || 'Untitled Section',
        type: sectionType,
      }
      
      if (sectionType === 'ranking') {
        const rankings = extractRankingItems($, $block as any)
        if (rankings.length > 0) section.rankings = rankings
      } else if (sectionType === 'product') {
        const products = extractProductItems($, $block as any)
        if (products.length > 0) section.products = products
      } else {
        const tokens = splitTextIntoTokens(blockText)
        if (tokens.length > 0) {
          section.items = [...new Set(tokens)].slice(0, 30)
        }
      }
      
      if (section.rankings || section.products || section.items) {
        sections.push(section)
      }
    })
  }
  
  if (sections.length > 0) {
    mainContent.sections = sections.slice(0, 20) // 최대 20개 섹션
  }
  
  return Object.keys(mainContent).length > 0 ? mainContent : undefined
}

/**
 * 푸터 정보 추출
 */
export function extractFooter($: CheerioInstance): StructuredContent['footer'] {
  const footer: StructuredContent['footer'] = {}
  
  const footerContainers = $(SEMANTIC_SELECTORS.footer.join(', '))
  
  if (footerContainers.length > 0) {
    const footerContainer = footerContainers.first()
    
    // 링크 추출
    const links: string[] = []
    footerContainer.find('a').each((_linkIndex: number, el: any) => {
      const text = normalizeText($(el).text())
      if (text && text.length > 0 && text.length < 50) {
        links.push(text)
      }
    })
    
    if (links.length > 0) {
      footer.links = [...new Set(links)]
    }
    
    // 저작권 정보
    const copyrightText = footerContainer.find('[class*="copyright"], .copyright').text()
    if (copyrightText) {
      footer.copyright = normalizeText(copyrightText)
    }
    
    // 회사 정보
    const companyInfo: Record<string, string> = {}
    footerContainer.find('p, div').each((_infoIndex: number, el: any) => {
      const text = normalizeText($(el).text())
      if (text.includes('주소') || text.includes('Address')) {
        companyInfo.address = text
      } else if (text.includes('전화') || text.includes('Tel') || text.includes('Phone')) {
        companyInfo.phone = text
      } else if (text.includes('이메일') || text.includes('Email')) {
        companyInfo.email = text
      }
    })
    
    if (Object.keys(companyInfo).length > 0) {
      footer.companyInfo = companyInfo
    }
  }
  
  return Object.keys(footer).length > 0 ? footer : undefined
}

/**
 * 네비게이션 추출
 */
export function extractNavigation($: CheerioInstance): string[] {
  return extractSectionText($, SEMANTIC_SELECTORS.navigation)
}

/**
 * 사이드바 추출
 */
export function extractSidebar($: CheerioInstance): string[] {
  return extractSectionText($, SEMANTIC_SELECTORS.sidebar)
}
