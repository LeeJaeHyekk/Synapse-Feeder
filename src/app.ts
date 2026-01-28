import * as Sentry from '@sentry/node'
import { createExecutionContext } from './context/index.js'
import { loadConfig } from './config/index.js'
import { loadCollectors } from './collectors/index.js'
import { normalizeArticles } from './normalizers/index.js'
import { createRawStorage } from './storage/raw/index.js'
import { createArticleRepository } from './storage/repository/index.js'
import { Deduplicator } from './storage/deduplicator.js'
import { formatDailyReport } from './formatter/index.js'
import { createNotifier, createErrorNotifier, safeNotify } from './notifier/index.js'
import { withTimeout } from './utils/index.js'
import { ExecutionResult, type Article, isRawRecordArray } from './types/index.js'

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
    const deduplicator = Deduplicator.createDefault()

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

        // 중복 제거 (addAlgorism.md 개선사항)
        const uniqueArticles = deduplicator.deduplicate(normalized)
        const duplicateCount = normalized.length - uniqueArticles.length

        if (duplicateCount > 0) {
          ctx.logger.info(
            `Deduplicated ${duplicateCount} items from ${collector.sourceName}`,
            { source: collector.sourceName, duplicates: duplicateCount }
          )
        }

        // DB 저장
        await repository.saveMany(ctx, uniqueArticles)
        allArticles.push(...uniqueArticles)

        executionResult.success(collector.sourceName, normalized.length)
        ctx.logger.info(`✅ ${collector.sourceName}: ${normalized.length} items`)

      } catch (err) {
        // Collector 실패 처리
        ctx.logger.error(
          `[CollectorFailed] source=${collector.sourceName}`,
          err
        )

        // Sentry에 에러 전송 (설정된 경우)
        if (process.env.SENTRY_DSN) {
          Sentry.captureException(err, {
            tags: {
              component: 'collector',
              source: collector.sourceName,
            },
            extra: {
              runId: ctx.runId,
              runDate: ctx.runDate,
            },
          })
        }

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
    
    // Sentry에 치명적 에러 전송 (설정된 경우)
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err, {
        tags: {
          component: 'orchestrator',
          severity: 'fatal',
        },
        extra: {
          runId: ctx.runId,
          runDate: ctx.runDate,
        },
      })
    }
    
    throw err
  }
}
