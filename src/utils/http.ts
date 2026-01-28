import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import axiosRetry from 'axios-retry'
import type { DecodedHtml } from '../types/http.js'
import { decodeHtml } from './encoding.js'
import { cached } from './cache.js'

/**
 * HTTP 미들웨어
 * Collector 친화적 - 인코딩 자동 처리
 * 
 * 개선사항:
 * - axios-retry 통합으로 자동 retry
 * - 네트워크 에러 자동 감지 및 재시도
 * - 선택적 캐싱 지원
 */

/**
 * Retry가 설정된 axios 인스턴스 생성
 */
function createAxiosInstance(): AxiosInstance {
  const instance = axios.create()

  // axios-retry 설정
  axiosRetry(instance, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      // 네트워크 에러 또는 재시도 가능한 HTTP 에러만 재시도
      return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.response?.status !== undefined && error.response.status >= 500)
    },
    onRetry: (retryCount, error) => {
      // 재시도 로그 (선택적)
      if (process.env.DEBUG === 'true') {
        console.log(`Retry attempt ${retryCount} for ${error.config?.url}`)
      }
    },
  })

  return instance
}

// 전역 axios 인스턴스
const httpClient = createAxiosInstance()

/**
 * HTML 페이지를 가져와서 UTF-8 문자열로 변환
 * 인코딩은 자동으로 처리됨
 * @param url 대상 URL
 * @param options 추가 옵션
 * @returns 디코딩된 HTML과 사용된 인코딩
 */
export async function fetchHtml(
  url: string,
  options?: {
    timeout?: number
    headers?: Record<string, string>
    useCache?: boolean
    cacheTtl?: number
  }
): Promise<DecodedHtml> {
  const fetchFn = async (): Promise<DecodedHtml> => {
    const response: AxiosResponse<ArrayBuffer> = await httpClient.get(url, {
      responseType: 'arraybuffer',
      timeout: options?.timeout ?? 10_000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        ...options?.headers,
      },
    })

    const result = decodeHtml(response.data, response.headers)
    return result
  }

  // 캐싱이 활성화된 경우 캐시 사용
  if (options?.useCache) {
    return cached(`html:${url}`, fetchFn, options.cacheTtl)
  }

  return fetchFn()
}

/**
 * axios 인스턴스 export (다른 곳에서 사용 가능)
 */
export { httpClient }
