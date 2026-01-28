import axios from 'axios'

/**
 * HTTP 에러가 재시도 가능한지 판단
 * @param error 에러 객체
 * @returns 재시도 가능 여부
 */
export function isRetryableHttpError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false
  }

  const status = error.response?.status

  // 네트워크 에러는 재시도
  if (!status) {
    return true
  }

  // 429 Too Many Requests
  if (status === 429) {
    return true
  }

  // 5xx 서버 에러
  if (status >= 500) {
    return true
  }

  // 4xx 클라이언트 에러는 재시도 안 함
  return false
}
