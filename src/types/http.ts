/**
 * HTTP 관련 타입 정의
 */

/**
 * 디코딩된 HTML 결과
 */
export interface DecodedHtml {
  /** UTF-8로 변환된 HTML 문자열 */
  html: string
  /** 사용된 인코딩 */
  encoding: string
}
