import { randomUUID } from 'crypto'
import dayjs from 'dayjs'
import type { ExecutionContext } from '../types'
import type { Logger } from '../logger'
import type { AppConfig } from '../config'
import { createLogger } from '../logger'

/**
 * Execution Context 생성
 */
export function createExecutionContext(
  config: AppConfig,
  logger?: Logger
): ExecutionContext {
  return {
    runId: randomUUID(),
    runDate: dayjs().utc().format('YYYY-MM-DD'),
    timezone: 'UTC',
    logger: logger ?? createLogger(),
    config,
  }
}
