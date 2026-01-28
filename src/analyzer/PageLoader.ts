/**
 * Page Loader
 * 
 * 책임: 초기 HTML 로드 (파싱 없음)
 * 목적: "이 페이지가 비어있는지, 껍데기인지" 판단
 */

import type { LoadedPage } from './types.js'
import { fetchHtml } from '../utils/index.js'

/**
 * 페이지 로드 옵션
 */
export interface PageLoadOptions {
  timeout?: number
  headers?: Record<string, string>
}

/**
 * 페이지 로드
 * 
 * @param url 대상 URL
 * @param options 로드 옵션
 * @returns 로드된 페이지 정보
 */
export async function loadPage(
  url: string,
  options: PageLoadOptions = {}
): Promise<LoadedPage> {
  const startTime = Date.now()
  
  try {
    const { html, encoding } = await fetchHtml(url, {
      timeout: options.timeout ?? 8000,
      headers: options.headers,
    })

    const responseHeaders: Record<string, string> = {}
    // fetchHtml은 인코딩 정보만 반환하므로 기본 헤더 구성
    if (encoding) {
      responseHeaders['content-type'] = `text/html; charset=${encoding}`
    }

    return {
      url,
      initialHtml: html,
      responseHeaders,
      statusCode: 200,
      loadTimeMs: Date.now() - startTime,
    }
  } catch (error: any) {
    // 에러 발생 시에도 기본 정보 반환
    return {
      url,
      initialHtml: '',
      responseHeaders: {},
      statusCode: error.response?.status || 0,
      loadTimeMs: Date.now() - startTime,
    }
  }
}
