import { createExecutionContext } from './context'
import { loadConfig } from './config'
import { loadCollectors } from './collectors'
import { normalizeArticles } from './normalizers'
import { createRawStorage } from './storage/raw'
import { createArticleRepository } from './storage/repository'
import { formatDailyReport } from './formatter'
import { createNotifier, createErrorNotifier, safeNotify } from './notifier'
import { withTimeout } from './utils'
import { ExecutionResult, type Article, isRawRecordArray } from './types'

/**
 * Orchestrator
 * 파이프라인 실행 순서 제어 및 실패 격리
 */
export async function runApp(): Promise<void> {
  // 1. 설정 로드
  const config = loadConfig()

  // 2. Context 생성
  const ctx = createExecutionContext(config)
  ctx.logger.info('🚀 Daily crawling job started', {
    runId: ctx.runId,
    runDate: ctx.runDate,
  })

  try {
    // 3. 컴포넌트 로드
    const collectors = loadCollectors()
    const rawStorage = createRawStorage()
    const repository = createArticleRepository(config.DB_PATH)
    const notifier = createNotifier(config.SLACK_TOKEN, config.SLACK_CHANNEL)
    const errorNotifier = config.SLACK_ERROR_CHANNEL
      ? createErrorNotifier(config.SLACK_TOKEN, config.SLACK_ERROR_CHANNEL)
      : null

    // 4. 실행 결과 집계
    const executionResult = new ExecutionResult()
    const allArticles: Article[] = []

    // 5. Collector 순회
    for (const collector of collectors) {
      ctx.logger.info(`🔍 Collecting from ${collector.sourceName}`)

      try {
        // Timeout 적용
        const timeoutMs = collector.policy?.timeoutMs ?? config.DEFAULT_TIMEOUT_MS
        const raw = await withTimeout(
          collector.collect(ctx),
          timeoutMs
        )

        // 타입 가드: Raw 데이터 검증
        if (!isRawRecordArray(raw)) {
          throw new Error(`Invalid raw data format from ${collector.sourceName}`)
        }

        // Raw 저장 (항상 먼저)
        await rawStorage.save(ctx, collector.sourceName, raw)

        // 정규화
        let normalized: Article[]
        try {
          normalized = normalizeArticles(ctx, collector.sourceName, raw)
        } catch (normalizeErr) {
          ctx.logger.error(
            `[NormalizeFailed] source=${collector.sourceName}`,
            normalizeErr
          )
          if (errorNotifier) {
            await errorNotifier.notifyNormalizeError(
              ctx,
              collector.sourceName,
              normalizeErr
            )
          }
          executionResult.fail(collector.sourceName, normalizeErr)
          continue // normalize 실패는 source 단위 스킵
        }

        // DB 저장
        await repository.saveMany(ctx, normalized)
        allArticles.push(...normalized)

        executionResult.success(collector.sourceName, normalized.length)
        ctx.logger.info(`✅ ${collector.sourceName}: ${normalized.length} items`)

      } catch (err) {
        // Collector 실패 처리
        ctx.logger.error(
          `[CollectorFailed] source=${collector.sourceName}`,
          err
        )

        if (errorNotifier) {
          await errorNotifier.notifyCollectorError(
            ctx,
            collector.sourceName,
            err
          )
        }

        executionResult.fail(collector.sourceName, err)
        // 실패해도 전체 중단 금지, 다음 Collector 진행
      }
    }

    // 6. 리포트 생성 & 전송
    const report = formatDailyReport(ctx, executionResult, allArticles)
    await safeNotify(notifier, ctx, report)

    ctx.logger.info('🏁 Daily crawling job finished', {
      totalSources: executionResult.getResults().length,
      successful: executionResult.getSuccessfulSources().length,
      failed: executionResult.getFailedSources().length,
      totalItems: executionResult.getTotalItemCount(),
      executionTime: executionResult.getExecutionTime(),
    })

  } catch (err) {
    ctx.logger.error('[FATAL] Unexpected error in orchestrator', err)
    throw err
  }
}
