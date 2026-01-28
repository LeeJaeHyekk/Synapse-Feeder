import type { ExecutionContext, ExecutionResult, Article } from '../types'
import Handlebars from 'handlebars'
import { readFileSync } from 'fs'
import { join } from 'path'
import { isArticleArray } from '../types'

/**
 * 일일 리포트 포맷팅
 */
export function formatDailyReport(
  ctx: ExecutionContext,
  executionResult: ExecutionResult,
  articles: Article[]
): string {
  // 타입 가드: Article 배열 검증 (런타임 검증)
  const articleCount = articles.length
  if (!isArticleArray(articles)) {
    ctx.logger.warn('Invalid article data format in formatter', {
      count: articleCount,
    })
    return '⚠️ Invalid article data format'
  }

  // 템플릿 로드 (CommonJS 환경에서 __dirname 사용)
  const templatePath = join(__dirname, 'templates', 'daily-report.hbs')
  const templateSource = readFileSync(templatePath, 'utf-8')
  const template = Handlebars.compile(templateSource)

  // 소스별 그룹핑
  const grouped = groupBySource(articles)
  const sources = Object.entries(grouped).map(([source, items]) => ({
    source,
    count: items.length,
    articles: items.slice(0, 10).map(a => ({
      title: a.title,
      url: a.url,
      summary: a.content.slice(0, 120),
    })),
  }))

  // 실패 정보 수집
  const failures = executionResult
    .getResults()
    .filter(r => !r.success)
    .map(r => ({
      source: r.sourceName,
      error: r.error instanceof Error ? r.error.message : String(r.error ?? 'Unknown error'),
    }))

  return template({
    date: ctx.runDate,
    totalSources: executionResult.getResults().length,
    successfulCount: executionResult.getSuccessfulSources().length,
    failedCount: executionResult.getFailedSources().length,
    totalItems: executionResult.getTotalItemCount(),
    executionTime: executionResult.getExecutionTime(),
    hasFailures: executionResult.hasFailures(),
    failedSources: executionResult.getFailedSources().join(', '),
    sources,
    failures,
  })
}

/**
 * Article을 소스별로 그룹핑
 */
function groupBySource(articles: Article[]): Record<string, Article[]> {
  return articles.reduce<Record<string, Article[]>>((acc, article) => {
    acc[article.source] ??= []
    acc[article.source].push(article)
    return acc
  }, {})
}
