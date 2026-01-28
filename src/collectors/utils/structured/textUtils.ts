/**
 * 텍스트 처리 유틸리티
 */

import type { RankingItem } from './types.js'

/**
 * 텍스트 정리 (공백, 줄바꿈 정규화)
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}

/**
 * 텍스트를 의미 있는 단위로 분리 (개선된 버전)
 * 예: "프랭크버거진격의거인수집품" → ["프랭크버거", "진격의거인", "수집품"]
 * 예: "39,000원배송비4,000원" → ["39,000원", "배송비", "4,000원"]
 */
export function splitTextIntoTokens(text: string): string[] {
  const tokens: string[] = []
  
  // 1. 가격 패턴 먼저 보호 (39,000원, 4,000원 등)
  const pricePattern = /[\d,]+원/g
  const prices: string[] = []
  let processedText = text.replace(pricePattern, (match) => {
    prices.push(match)
    return `__PRICE_${prices.length - 1}__`
  })
  
  // 2. 숫자와 한글/영문 사이 분리
  processedText = processedText.replace(/(\d+)([가-힣a-zA-Z])/g, '$1 $2')
  processedText = processedText.replace(/([가-힣a-zA-Z])(\d+)/g, '$1 $2')
  
  // 3. 특수문자 기준 분리
  processedText = processedText.replace(/([가-힣a-zA-Z])([,，.。!！?？])/g, '$1 $2')
  processedText = processedText.replace(/([,，.。!！?？])([가-힣a-zA-Z])/g, '$1 $2')
  
  // 4. 공백 기준 분리
  const parts = processedText.split(/\s+/).filter(p => p.length > 0)
  
  // 5. 각 부분 처리
  for (const part of parts) {
    // 가격 플레이스홀더 복원
    if (part.startsWith('__PRICE_')) {
      const priceIndex = parseInt(part.replace('__PRICE_', '').replace('__', ''), 10)
      if (prices[priceIndex]) {
        tokens.push(prices[priceIndex])
      }
      continue
    }
    
    // 한글 단어 경계 분리 (더 정교한 패턴)
    const koreanMatches = part.match(/[가-힣]+/g) || []
    
    for (const korean of koreanMatches) {
      if (korean.length <= 4) {
        tokens.push(korean)
      } else {
        // 긴 단어는 2-4글자 단위로 분리 시도
        let remaining = korean
        while (remaining.length > 0) {
          if (remaining.length >= 4) {
            tokens.push(remaining.substring(0, 4))
            remaining = remaining.substring(4)
          } else if (remaining.length >= 3) {
            tokens.push(remaining.substring(0, 3))
            remaining = remaining.substring(3)
          } else if (remaining.length >= 2) {
            tokens.push(remaining.substring(0, 2))
            remaining = remaining.substring(2)
          } else {
            if (tokens.length > 0) {
              tokens[tokens.length - 1] += remaining
            }
            remaining = ''
          }
        }
      }
    }
    
    // 한글이 아닌 부분 처리
    const nonKorean = part.replace(/[가-힣]+/g, ' ').trim()
    if (nonKorean) {
      const nonKoreanParts = nonKorean.split(/\s+/).filter(t => t.length > 0)
      tokens.push(...nonKoreanParts)
    }
  }
  
  // 최종 필터링: 너무 짧거나 긴 토큰 제거, 중복 제거
  return [...new Set(tokens.filter(t => t.length >= 2 && t.length < 100))]
}

/**
 * 가격 정보 추출
 */
export function extractPrice(text: string): { price?: string; discountPrice?: string; deliveryFee?: string } {
  const result: { price?: string; discountPrice?: string; deliveryFee?: string } = {}
  
  // 가격 패턴: 숫자,숫자원 또는 숫자원
  const priceMatch = text.match(/([\d,]+)\s*원/g)
  if (priceMatch) {
    const prices = priceMatch.map(p => p.replace(/\s/g, ''))
    if (prices.length >= 1) {
      result.price = prices[0]
    }
    if (prices.length >= 2) {
      result.discountPrice = prices[1]
    }
  }
  
  // 배송비 패턴
  const deliveryMatch = text.match(/배송비\s*([\d,]+원|무료|FREE)/i)
  if (deliveryMatch) {
    result.deliveryFee = deliveryMatch[1]
  }
  
  return result
}

/**
 * 순위 정보 추출 (개선된 버전)
 */
export function extractRank(text: string): { rank?: number; change?: RankingItem['change']; changeAmount?: number } {
  const result: { rank?: number; change?: RankingItem['change']; changeAmount?: number } = {}
  
  // 순위 패턴
  const rankPatterns = [
    /(\d+)\s*위/i,
    /랭킹\s*(\d+)/i,
    /랭킹(\d+)/i,
    /(\d+)\s*위랭킹/i,
    /#(\d+)/i,
    /순위\s*(\d+)/i,
  ]
  
  for (const pattern of rankPatterns) {
    const match = text.match(pattern)
    if (match) {
      const rankNum = parseInt(match[1], 10)
      if (rankNum > 0 && rankNum <= 1000) {
        result.rank = rankNum
        break
      }
    }
  }
  
  // 변화 패턴
  if (/상승|UP|up|\+/.test(text)) {
    result.change = 'up'
    const changeMatch = text.match(/(\d+)\s*(단계?|위|step)?\s*(상승|UP|up|\+)/i) || 
                       text.match(/\+\s*(\d+)/)
    if (changeMatch) {
      result.changeAmount = parseInt(changeMatch[1] || changeMatch[2], 10)
    }
  } else if (/하락|DOWN|down|-/.test(text)) {
    result.change = 'down'
    const changeMatch = text.match(/(\d+)\s*(단계?|위|step)?\s*(하락|DOWN|down|-)/i) ||
                       text.match(/-\s*(\d+)/)
    if (changeMatch) {
      result.changeAmount = parseInt(changeMatch[1] || changeMatch[2], 10)
    }
  } else if (/유지|STABLE|stable|STABLE/i.test(text)) {
    result.change = 'stable'
  } else if (/급등|SOAR|soar/i.test(text)) {
    result.change = 'soar'
    const changeMatch = text.match(/(\d+)\s*(단계?|위)?\s*급등/i)
    if (changeMatch) {
      result.changeAmount = parseInt(changeMatch[1], 10)
    }
  } else if (/신규|NEW|new/i.test(text)) {
    result.change = 'new'
  }
  
  return result
}
