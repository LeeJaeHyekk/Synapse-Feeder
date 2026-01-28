import type { Notifier } from './Notifier'
import { SlackNotifier } from './SlackNotifier'
import { ErrorNotifier } from './ErrorNotifier'
import type { ExecutionContext } from '../types'

/**
 * Notifier 생성
 */
export function createNotifier(token: string, channel: string): Notifier {
  return new SlackNotifier(token, channel)
}

/**
 * Error Notifier 생성
 */
export function createErrorNotifier(
  token: string,
  channel: string
): ErrorNotifier {
  return new ErrorNotifier(token, channel)
}

/**
 * 안전한 Notifier 호출
 * 실패해도 throw하지 않음
 */
export async function safeNotify(
  notifier: Notifier,
  ctx: ExecutionContext,
  message: string
): Promise<void> {
  try {
    await notifier.send(ctx, message)
  } catch (e) {
    ctx.logger.error('[NOTIFY_FAIL]', e)
    // 절대 throw 금지
  }
}
