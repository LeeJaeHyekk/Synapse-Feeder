import sanitize from 'sanitize-html'

/**
 * HTML → text 정제
 * XSS 방지 목적 아님 (내부 데이터)
 * @param input HTML 문자열
 * @returns 정제된 텍스트
 */
export function sanitizeHtml(input: unknown): string {
  if (typeof input !== 'string') {
    return ''
  }

  return sanitize(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim()
}
