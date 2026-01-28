/**
 * 사이트 타입 정의
 * Collector 전략 선택을 위한 도메인 모델
 */

/**
 * 사이트 타입
 */
export type SiteType =
  | 'portal-csr' // 포털 CSR (네이버, 카카오 등)
  | 'public-board' // 공공 게시판 (KLCA, 정부 사이트 등)
  | 'shopping' // 쇼핑몰 (쿠팡, 스토어 등)
  | 'blog' // 블로그 (티스토리 등)
  | 'static-article' // 정적 기사 (언론, 협회 등)

/**
 * 사이트 엔트리 포인트
 */
export interface SiteEntryPoint {
  /** 엔트리 포인트 이름 */
  name: string
  /** URL */
  url: string
}

/**
 * 사이트 설정
 */
export interface SiteConfig {
  /** 소스 이름 */
  sourceName: string
  /** 사이트 타입 */
  siteType: SiteType
  /** 인코딩 (auto는 자동 판별) */
  encoding?: 'auto' | 'utf-8' | 'euc-kr'
  /** 엔트리 포인트 목록 */
  entryPoints: SiteEntryPoint[]
}
