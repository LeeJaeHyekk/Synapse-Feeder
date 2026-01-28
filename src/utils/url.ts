import normalizeUrl from 'normalize-url'

/**
 * URL 정규화 유틸리티
 * 
 * 개선사항:
 * - normalize-url 라이브러리 사용
 * - URL 정규화 및 중복 감지 개선
 */

/**
 * URL 정규화
 * @param url 정규화할 URL
 * @param options 정규화 옵션
 * @returns 정규화된 URL
 */
export function normalizeUrlString(
  url: string,
  options?: {
    stripWWW?: boolean
    removeTrailingSlash?: boolean
    removeQueryParameters?: string[]
  }
): string {
  return normalizeUrl(url, {
    stripWWW: options?.stripWWW ?? true,
    removeTrailingSlash: options?.removeTrailingSlash ?? true,
    removeQueryParameters: options?.removeQueryParameters ?? [],
  })
}

/**
 * 상대 URL을 절대 URL로 변환
 * @param relativeUrl 상대 URL
 * @param baseUrl 기준 URL
 * @returns 절대 URL
 */
export function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href
  } catch {
    return relativeUrl
  }
}

/**
 * URL이 유효한지 확인
 * @param url 확인할 URL
 * @returns 유효 여부
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
