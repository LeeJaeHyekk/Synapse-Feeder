import { randomUUID } from 'crypto'
import dayjs from 'dayjs'
import type { ExecutionContext } from '../types/index.js'
import type { Logger } from '../logger/index.js'
import type { AppConfig } from '../config/index.js'
import { createLogger } from '../logger/index.js'

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
