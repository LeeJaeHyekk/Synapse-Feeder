/**
 * Strategy Selector
 * 
 * 책임: PageAnalysis를 CrawlStrategy로 변환
 * - 전략 매트릭스 기반 결정
 * - Config 오버라이드 지원
 */

import type {
  PageAnalysis,
  PageProfile,
  CrawlStrategy,
  RetryPolicy,
  PageConfig,
} from './types.js'

/**
 * 전략 매트릭스 기반 전략 선택
 */
export function selectStrategy(
  analysis: PageAnalysis,
  profile: PageProfile,
  config?: PageConfig
): CrawlStrategy {
  // Config 오버라이드가 있으면 우선 적용
  if (config?.override) {
    return createStrategyFromOverride(analysis, profile, config.override)
  }

  // 기본 전략 결정
  let fetcher: 'AXIOS' | 'PLAYWRIGHT' = 'AXIOS'
  let parser: 'LIST' | 'DETAIL' | 'API' | 'MIXED' = 'LIST'
  let useReadability = false

  // Fetcher 결정
  if (profile.renderingType === 'STATIC' && profile.dataAccessType === 'HTML') {
    fetcher = 'AXIOS'
  } else if (profile.renderingType === 'CSR') {
    fetcher = 'PLAYWRIGHT'
  } else if (
    profile.dataAccessType === 'XHR' &&
    analysis.detectedApis.length > 0
  ) {
    fetcher = 'PLAYWRIGHT'
    parser = 'API'
  } else if (profile.dataAccessType === 'MIXED') {
    fetcher = 'PLAYWRIGHT'
    parser = 'MIXED'
  }

  // Parser 결정
  if (profile.pageRole.startsWith('LIST_')) {
    parser = 'LIST'
  } else if (profile.pageRole.startsWith('DETAIL_')) {
    parser = 'DETAIL'
    useReadability = true // 상세 페이지는 Readability 사용
  }

  // Readability 사용 여부
  if (!useReadability) {
    useReadability =
      profile.pageRole.startsWith('DETAIL_') ||
      (analysis.hasMeaningfulHtml && analysis.jsDependencyScore < 0.3)
  }

  // Retry Policy
  const retryPolicy: RetryPolicy = {
    maxRetries: fetcher === 'PLAYWRIGHT' ? 2 : 3,
    backoffMs: fetcher === 'PLAYWRIGHT' ? 2000 : 1000,
    strategy: 'exponential',
  }

  // Timeout
  const timeoutMs = fetcher === 'PLAYWRIGHT' ? 30000 : 15000

  return {
    fetcher,
    parser,
    retryPolicy,
    timeoutMs,
    useReadability,
  }
}

/**
 * Config 오버라이드로 전략 생성
 */
function createStrategyFromOverride(
  analysis: PageAnalysis,
  profile: PageProfile,
  override: NonNullable<PageConfig['override']>
): CrawlStrategy {
  const fetcher = override.fetcher || (profile.renderingType === 'CSR' ? 'PLAYWRIGHT' : 'AXIOS')
  const parser = override.parser || (profile.pageRole.startsWith('LIST_') ? 'LIST' : 'DETAIL')
  const useReadability = override.useReadability ?? (parser === 'DETAIL')

  return {
    fetcher,
    parser,
    retryPolicy: {
      maxRetries: fetcher === 'PLAYWRIGHT' ? 2 : 3,
      backoffMs: fetcher === 'PLAYWRIGHT' ? 2000 : 1000,
      strategy: 'exponential',
    },
    timeoutMs: fetcher === 'PLAYWRIGHT' ? 30000 : 15000,
    useReadability,
  }
}
