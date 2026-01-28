/**
 * Page Understanding Engine 타입 정의
 * 
 * 핵심 개념:
 * - 페이지를 분석하여 정보 모델을 만들고
 * - 그에 맞는 수집 전략을 동적으로 선택
 */

/**
 * 1. Page Loader 결과
 */
export interface LoadedPage {
  url: string
  initialHtml: string
  responseHeaders: Record<string, string>
  statusCode: number
  loadTimeMs: number
}

/**
 * 2. HTML 신호
 */
export interface HtmlSignals {
  scriptCount: number
  inlineDataPresence: boolean // window.__DATA__, __INITIAL_STATE__
  noscriptOnly: boolean
  contentLength: number
  hasTable: boolean // tbody tr 존재
  hasArticle: boolean // article 태그 존재
}

/**
 * 3. 탐지된 API
 */
export interface DetectedApi {
  url: string
  method: string
  contentType: string
  requestBody?: unknown
}

/**
 * 4. 페이지 분석 결과
 */
export interface PageAnalysis {
  // HTML 분석 결과
  hasMeaningfulHtml: boolean
  htmlSignals: HtmlSignals

  // JS 의존도
  requiresJsExecution: boolean
  jsDependencyScore: number // 0~1

  // API 탐지
  detectedApis: DetectedApi[]
  dataAccessType: 'HTML' | 'XHR' | 'MIXED'

  // 렌더링 타입
  renderingType: 'STATIC' | 'CSR'
}

/**
 * 5. 페이지 역할
 */
export type PageRole =
  | 'LIST_NOTICE'
  | 'DETAIL_NOTICE'
  | 'LIST_RECRUIT'
  | 'DETAIL_RECRUIT'
  | 'LIST_EVENT'
  | 'DETAIL_EVENT'
  | 'STATIC_PAGE'
  | 'UNKNOWN'

/**
 * 6. 페이지 프로필
 */
export interface PageProfile {
  renderingType: 'STATIC' | 'CSR'
  dataAccessType: 'HTML' | 'XHR' | 'MIXED'
  pageRole: PageRole
}

/**
 * 7. 탐지된 필드
 */
export interface DetectedField {
  name: string // 'title', 'date', 'author', 'department', 'views', 'detailUrl'
  selector?: string
  pattern?: RegExp
  confidence: number // 0~1
}

/**
 * 8. 콘텐츠 블록
 */
export interface ContentBlock {
  blockType: 'LIST' | 'DETAIL' | 'TABLE' | 'TEXT'
  semanticType: 'NOTICE' | 'RECRUIT' | 'EVENT' | 'UNKNOWN'
  fields: DetectedField[]
  selector?: string // 발견된 셀렉터
}

/**
 * 9. 추출된 아이템
 */
export interface ExtractedItem {
  blockType: string
  semanticType: string
  fields: Record<string, string>
}

/**
 * 10. 페이지 데이터 모델
 */
export interface PageDataModel {
  pageUrl: string
  blocks: ContentBlock[]
  items: ExtractedItem[]
}

/**
 * 11. 재시도 정책
 */
export interface RetryPolicy {
  maxRetries: number
  backoffMs: number
  strategy: 'exponential' | 'linear' | 'fixed'
}

/**
 * 12. 크롤링 전략
 */
export interface CrawlStrategy {
  fetcher: 'AXIOS' | 'PLAYWRIGHT'
  parser: 'LIST' | 'DETAIL' | 'API' | 'MIXED'
  retryPolicy: RetryPolicy
  timeoutMs: number
  useReadability: boolean // @mozilla/readability 사용 여부
}

/**
 * 13. 페이지 설정 (Config 오버라이드)
 */
export interface PageConfig {
  sourceName: string
  url: string
  override?: {
    pageRole?: PageRole
    fetcher?: 'AXIOS' | 'PLAYWRIGHT'
    parser?: 'LIST' | 'DETAIL' | 'API' | 'MIXED'
    useReadability?: boolean
  }
  selectors?: {
    list?: string
    item?: string
    title?: string
    date?: string
    author?: string
    content?: string
    detailUrl?: string
  }
}
