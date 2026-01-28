import { WebClient } from '@slack/web-api'
import type { ExecutionContext } from '../types/index.js'

/**
 * 에러 전용 Notifier
 * 보고용 Slack과 분리된 장애 알림 채널
 */
export class ErrorNotifier {
  private client: WebClient

  constructor(token: string, private channel: string) {
    this.client = new WebClient(token)
  }

  /**
   * Collector 에러 알림
   */
  async notifyCollectorError(
    ctx: ExecutionContext,
    sourceName: string,
    error: unknown
  ): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined

      await this.client.chat.postMessage({
        channel: this.channel,
        text: [
          '🚨 *Crawler Error*',
          `• Source: ${sourceName}`,
          `• Stage: collect`,
          `• Run ID: ${ctx.runId}`,
          `• Date: ${ctx.runDate}`,
          `• Error: \`${errorMessage.slice(0, 500)}\``,
          stack ? `• Stack: \`\`\`${stack.slice(0, 1000)}\`\`\`` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      })
    } catch (err) {
      // 에러 알림 실패는 로그만
      ctx.logger.error('Failed to send error notification', err)
    }
  }

  /**
   * Normalize 에러 알림
   */
  async notifyNormalizeError(
    ctx: ExecutionContext,
    sourceName: string,
    error: unknown
  ): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error)

      await this.client.chat.postMessage({
        channel: this.channel,
        text: [
          '🚨 *Normalize Error*',
          `• Source: ${sourceName}`,
          `• Stage: normalize`,
          `• Run ID: ${ctx.runId}`,
          `• Date: ${ctx.runDate}`,
          `• Error: \`${errorMessage.slice(0, 500)}\``,
        ].join('\n'),
      })
    } catch (err) {
      ctx.logger.error('Failed to send error notification', err)
    }
  }
}
