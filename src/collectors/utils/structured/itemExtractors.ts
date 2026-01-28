/**
 * 아이템 추출기 (상품, 랭킹)
 */

import type { ProductItem, RankingItem } from './types.js'
import { normalizeText, extractPrice, extractRank, splitTextIntoTokens } from './textUtils.js'
import { PRODUCT_SELECTORS, RANKING_SELECTORS, TITLE_SELECTORS, RANKING_ITEM_SELECTORS } from './selectors.js'

type CheerioInstance = any

/**
 * 상품 아이템 추출 (개선된 버전)
 */
export function extractProductItems($: CheerioInstance, container: any): ProductItem[] {
  const products: ProductItem[] = []
  const processed = new Set<string>()
  
  for (const selector of PRODUCT_SELECTORS) {
    container.find(selector).each((_index: number, el: any) => {
      const $el = $(el)
      const text = normalizeText($el.text())
      
      // 너무 짧거나 긴 텍스트 제외
      if (text.length < 10 || text.length > 1000) return
      
      // 중복 제거
      const textKey = text.substring(0, 50)
      if (processed.has(textKey)) return
      processed.add(textKey)
      
      // 제목 추출
      let title = ''
      for (const titleSel of TITLE_SELECTORS) {
        const titleEl = $el.find(titleSel).first()
        if (titleEl.length === 0) continue
        
        let titleText = normalizeText(titleEl.text())
        if (titleText.length > 100) {
          titleText = titleText.substring(0, 100)
        }
        
        if (titleText && titleText.length > 3 && titleText.length <= 100) {
          title = titleText
          break
        }
      }
      
      // 제목이 없으면 텍스트에서 추출 시도
      if (!title) {
        const textWithoutPrice = text.replace(/[\d,]+원/g, '').trim()
        if (textWithoutPrice.length > 3 && textWithoutPrice.length < 100) {
          title = textWithoutPrice.substring(0, 100)
        }
      }
      
      // 가격 정보 추출
      const priceInfo = extractPrice(text)
      
      // 이미지 URL
      const imgEl = $el.find('img').first()
      const imageUrl = imgEl.attr('src') || 
                      imgEl.attr('data-src') ||
                      imgEl.attr('data-lazy-src') ||
                      undefined
      
      // 상세 URL
      const linkEl = $el.find('a[href]').first()
      const detailUrl = linkEl.attr('href') || undefined
      
      // 순위 정보
      const rankInfo = extractRank(text)
      
      // 카테고리 추출
      const categoryEl = $el.find('[class*="category"], [class*="cat"]').first()
      const category = categoryEl.length > 0 ? normalizeText(categoryEl.text()) : undefined
      
      // 상품 정보가 충분하면 추가
      if (title || priceInfo.price) {
        products.push({
          title: title || text.substring(0, 50),
          ...priceInfo,
          ...rankInfo,
          category,
          imageUrl,
          detailUrl,
        })
      }
    })
  }
  
  return products.slice(0, 50) // 최대 50개
}

/**
 * 랭킹 아이템 추출 (개선된 버전)
 */
export function extractRankingItems($: CheerioInstance, container: any): RankingItem[] {
  const rankings: RankingItem[] = []
  const processed = new Set<number>()
  
  for (const selector of RANKING_SELECTORS) {
    const rankingContainers = container.find(selector)
    
    rankingContainers.each((_containerIndex: number, containerEl: any) => {
      const $container = $(containerEl)
      
      for (const itemSel of RANKING_ITEM_SELECTORS) {
        $container.find(itemSel).each((_itemIndex: number, el: any) => {
          const $el = $(el)
          const text = normalizeText($el.text())
          
          // 너무 짧거나 긴 텍스트 제외
          if (text.length < 5 || text.length > 500) return
          
          const rankInfo = extractRank(text)
          if (!rankInfo.rank) return
          
          // 중복 제거
          if (processed.has(rankInfo.rank)) return
          processed.add(rankInfo.rank)
          
          // 제목 추출
          let title = ''
          for (const titleSel of TITLE_SELECTORS) {
            const titleEl = $el.find(titleSel).first()
            if (titleEl.length === 0) continue
            
            let titleText = normalizeText(titleEl.text())
            
            // 순위 정보 제거
            titleText = titleText
              .replace(/\d+\s*위/g, '')
              .replace(/랭킹\s*\d+/g, '')
              .replace(/상승|하락|유지|급등|신규/gi, '')
              .trim()
            
            if (titleText && titleText.length > 2 && titleText.length < 200) {
              title = titleText
              break
            }
          }
          
          // 제목이 없으면 텍스트에서 추출
          if (!title) {
            title = text
              .replace(/\d+\s*위/g, '')
              .replace(/랭킹\s*\d+/g, '')
              .replace(/상승|하락|유지|급등|신규/gi, '')
              .replace(/[\d,]+원/g, '')
              .trim()
              .substring(0, 100)
          }
          
          // 카테고리 추출
          const categoryEl = $el.find('[class*="category"], [class*="cat"]').first()
          const category = categoryEl.length > 0 ? normalizeText(categoryEl.text()) : undefined
          
          if (title && title.length > 2) {
            // 관련 상품 추출
            const products = extractProductItems($, $el)
            
            rankings.push({
              rank: rankInfo.rank,
              title,
              change: rankInfo.change,
              changeAmount: rankInfo.changeAmount,
              category,
              products: products.length > 0 ? products : undefined,
            })
          }
        })
      }
    })
  }
  
  // 순위 순으로 정렬
  rankings.sort((a, b) => (a.rank || 0) - (b.rank || 0))
  
  return rankings.slice(0, 50) // 최대 50개
}
