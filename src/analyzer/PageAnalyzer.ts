/**
 * Page Analyzer
 * 
 * 책임: 페이지의 정보 접근성 분석
 * - HTML 정적 분석
 * - JS 의존도 계산
 * - API 탐지 (선택적)
 */

import * as cheerio from 'cheerio'
import type { HtmlSignals, PageAnalysis, DetectedApi } from './types.js'
import type { LoadedPage } from './types.js'

/**
 * HTML 신호 분석
 */
export function analyzeHtmlSignals(html: string): HtmlSignals {
  const $ = cheerio.load(html)
  const bodyText = $('body').text().trim()
  
  return {
    scriptCount: $('script').length,
    inlineDataPresence:
      html.includes('window.__DATA__') ||
      html.includes('__INITIAL_STATE__') ||
      html.includes('__NEXT_DATA__') ||
      html.includes('window.__INITIAL_DATA__'),
    noscriptOnly: $('noscript').length > 0 && bodyText.length < 100,
    contentLength: html.length,
    hasTable: $('tbody tr').length > 3,
    hasArticle: $('article').length > 1,
  }
}

/**
 * 의미 있는 HTML 판단
 */
export function hasMeaningfulHtml(signals: HtmlSignals): boolean {
  return (
    signals.contentLength > 2000 &&
    (signals.hasTable || signals.hasArticle)
  )
}

/**
 * JS 의존도 점수 계산 (0~1)
 */
export function calculateJsDependencyScore(signals: HtmlSignals): number {
  let score = 0

  // 스크립트가 많으면 동적일 가능성
  if (signals.scriptCount > 10) score += 0.4

  // HTML이 짧으면 동적일 가능성
  if (signals.contentLength < 5000) score += 0.4

  // 인라인 데이터가 있으면 정적일 가능성
  if (signals.inlineDataPresence) score -= 0.2

  return Math.max(0, Math.min(1, score))
}

/**
 * JS 실행 필요성 판단
 */
export function requiresJsExecution(score: number): boolean {
  return score > 0.5
}

/**
 * 렌더링 타입 판단
 */
export function determineRenderingType(
  signals: HtmlSignals,
  jsDependencyScore: number
): 'STATIC' | 'CSR' {
  if (jsDependencyScore > 0.5) {
    return 'CSR'
  }
  return 'STATIC'
}

/**
 * API 탐지 (Playwright 경량 실행)
 * 
 * 주의: STATIC으로 판단되면 실행하지 않음
 * 성능 고려: 필요할 때만 실행
 */
export async function detectApis(
  url: string,
  requiresJs: boolean
): Promise<DetectedApi[]> {
  // STATIC으로 판단되면 실행하지 않음
  if (!requiresJs) {
    return []
  }

  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    })
    const page = await browser.newPage()
    const apis: DetectedApi[] = []

    // 응답 모니터링
    page.on('response', (response) => {
      const request = response.request()
      const resourceType = request.resourceType()

      if (resourceType === 'xhr' || resourceType === 'fetch') {
        const contentType = response.headers()['content-type'] || ''
        
        // JSON 응답만 수집
        if (contentType.includes('application/json')) {
          apis.push({
            url: response.url(),
            method: request.method(),
            contentType,
          })
        }
      }
    })

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 10000,
    })

    // 추가 대기 (API 호출 완료 대기)
    await page.waitForTimeout(2000)

    await browser.close()
    return apis
  } catch (error) {
    // Playwright 실패 시 빈 배열 반환 (에러 무시)
    return []
  }
}

/**
 * Data Access Type 판단
 */
export function determineDataAccessType(
  hasMeaningfulHtml: boolean,
  detectedApis: DetectedApi[]
): 'HTML' | 'XHR' | 'MIXED' {
  if (detectedApis.length > 0 && hasMeaningfulHtml) {
    return 'MIXED'
  }
  if (detectedApis.length > 0) {
    return 'XHR'
  }
  return 'HTML'
}

/**
 * 페이지 분석 실행
 */
export async function analyzePage(
  loadedPage: LoadedPage
): Promise<PageAnalysis> {
  const html = loadedPage.initialHtml

  // HTML 신호 분석
  const htmlSignals = analyzeHtmlSignals(html)
  const hasMeaningful = hasMeaningfulHtml(htmlSignals)

  // JS 의존도 계산
  const jsDependencyScore = calculateJsDependencyScore(htmlSignals)
  const requiresJs = requiresJsExecution(jsDependencyScore)

  // 렌더링 타입 판단
  const renderingType = determineRenderingType(htmlSignals, jsDependencyScore)

  // API 탐지 (필요한 경우만)
  const detectedApis = await detectApis(loadedPage.url, requiresJs)

  // Data Access Type 판단
  const dataAccessType = determineDataAccessType(hasMeaningful, detectedApis)

  return {
    hasMeaningfulHtml: hasMeaningful,
    htmlSignals,
    requiresJsExecution: requiresJs,
    jsDependencyScore,
    detectedApis,
    dataAccessType,
    renderingType,
  }
}
