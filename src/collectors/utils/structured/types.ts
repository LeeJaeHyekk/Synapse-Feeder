/**
 * 구조화된 콘텐츠 타입 정의
 */

/**
 * 상품/아이템 정보
 */
export interface ProductItem {
  /** 제목/이름 */
  title?: string
  /** 가격 */
  price?: string
  /** 할인 가격 */
  discountPrice?: string
  /** 배송비 */
  deliveryFee?: string
  /** 순위 */
  rank?: number
  /** 카테고리 */
  category?: string
  /** 이미지 URL */
  imageUrl?: string
  /** 상세 URL */
  detailUrl?: string
  /** 기타 정보 */
  metadata?: Record<string, unknown>
}

/**
 * 랭킹 정보
 */
export interface RankingItem {
  /** 순위 */
  rank: number
  /** 제목 */
  title: string
  /** 변화 (상승/하락/유지) */
  change?: 'up' | 'down' | 'stable' | 'new' | 'soar'
  /** 변화량 */
  changeAmount?: number
  /** 카테고리 */
  category?: string
  /** 관련 상품들 */
  products?: ProductItem[]
}

/**
 * 섹션 타입
 */
export type SectionType = 'list' | 'ranking' | 'product' | 'article' | 'table' | 'text'

/**
 * 섹션 정보
 */
export interface Section {
  name: string
  type?: SectionType
  items?: string[]
  products?: ProductItem[]
  rankings?: RankingItem[]
  metadata?: Record<string, unknown>
}

/**
 * 구조화된 콘텐츠 인터페이스
 */
export interface StructuredContent {
  /** 네비게이션 요소들 */
  navigation?: string[]
  /** 헤더 정보 */
  header?: {
    brand?: string
    services?: string[]
    menu?: string[]
  }
  /** 검색 관련 */
  search?: {
    area?: string
    layer?: string
    keywords?: string[]
    keywordRankings?: RankingItem[]
  }
  /** 메인 콘텐츠 */
  mainContent?: {
    title?: string
    sections?: Section[]
  }
  /** 사이드바/부가 정보 */
  sidebar?: Array<{
    title: string
    items: string[]
  }>
  /** 푸터 정보 */
  footer?: {
    links?: string[]
    copyright?: string
    companyInfo?: Record<string, string>
  }
  /** 기타 구조화된 데이터 */
  metadata?: Record<string, unknown>
}
