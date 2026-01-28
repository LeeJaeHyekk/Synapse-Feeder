/**
 * Page Understanding Engine
 * 
 * 페이지 분석 및 전략 선택을 위한 통합 모듈
 */

// 타입 export
export type {
  LoadedPage,
  HtmlSignals,
  DetectedApi,
  PageAnalysis,
  PageRole,
  PageProfile,
  DetectedField,
  ContentBlock,
  ExtractedItem,
  PageDataModel,
  RetryPolicy,
  CrawlStrategy,
  PageConfig,
} from './types.js'

// Page Loader
export { loadPage, type PageLoadOptions } from './PageLoader.js'

// Page Analyzer
export {
  analyzePage,
  analyzeHtmlSignals,
  hasMeaningfulHtml,
  calculateJsDependencyScore,
  requiresJsExecution,
  determineRenderingType,
  detectApis,
  determineDataAccessType,
} from './PageAnalyzer.js'

// Page Classifier
export { classifyPage, inferPageRole } from './PageClassifier.js'

// Information Extractor
export { extractContentBlocks } from './InformationExtractor.js'

// Model Builder
export { buildPageDataModel } from './ModelBuilder.js'

// Strategy Selector
export { selectStrategy } from './StrategySelector.js'

/**
 * 전체 파이프라인 실행 (편의 함수)
 */
export async function analyzeAndClassify(
  url: string,
  config?: PageConfig
): Promise<{
  loadedPage: LoadedPage
  analysis: PageAnalysis
  profile: PageProfile
  blocks: ContentBlock[]
  model: PageDataModel
  strategy: CrawlStrategy
}> {
  // 1. 페이지 로드
  const { loadPage } = await import('./PageLoader.js')
  const loadedPage = await loadPage(url)

  // 2. 페이지 분석
  const { analyzePage } = await import('./PageAnalyzer.js')
  const analysis = await analyzePage(loadedPage)

  // 3. 페이지 분류
  const { classifyPage } = await import('./PageClassifier.js')
  const profile = classifyPage(url, loadedPage.initialHtml, analysis)

  // 4. 콘텐츠 블록 추출
  const { extractContentBlocks } = await import('./InformationExtractor.js')
  const blocks = extractContentBlocks(loadedPage.initialHtml, profile.pageRole)

  // 5. 데이터 모델 빌드
  const { buildPageDataModel } = await import('./ModelBuilder.js')
  const model = buildPageDataModel(loadedPage.initialHtml, blocks, url)

  // 6. 전략 선택
  const { selectStrategy } = await import('./StrategySelector.js')
  const strategy = selectStrategy(analysis, profile, config)

  return {
    loadedPage,
    analysis,
    profile,
    blocks,
    model,
    strategy,
  }
}
