/**
 * 사이트 타입별 Collector 전략 매핑
 * 
 * 향후 전략 패턴 도입 시 사용할 수 있는 구조
 * 현재는 참고용으로만 제공
 */

import type { SiteType } from '../types/site.js'

/**
 * 전략 매핑 (향후 구현 예정)
 * 
 * 현재는 각 Collector가 직접 구현되어 있지만,
 * 향후 전략 패턴을 도입하면 이 매핑을 사용하여
 * Collector를 자동 생성할 수 있습니다.
 */
export const StrategyMap: Record<SiteType, string> = {
  'portal-csr': 'ApiCollector', // 내부 API → Playwright fallback
  'public-board': 'HtmlBoardCollector', // HTML 게시판 직접 파싱
  'shopping': 'ApiCollector', // JSON API
  'blog': 'RssCollector', // RSS → HTML
  'static-article': 'HtmlBoardCollector', // SSR HTML
} as const

/**
 * 사이트 타입별 권장 기술 스택
 */
export const StrategyTechStack: Record<SiteType, string[]> = {
  'portal-csr': ['axios', 'playwright'],
  'public-board': ['axios', 'cheerio', 'euc-kr'],
  'shopping': ['axios'],
  'blog': ['rss-parser'],
  'static-article': ['cheerio'],
} as const
