import { WebClient } from '@slack/web-api'
import type { Notifier } from './Notifier'
import type { ExecutionContext } from '../types'

/**
 * Slack Notifier 구현
 */
export class SlackNotifier implements Notifier {
  private client: WebClient

  constructor(token: string, private channel: string) {
    this.client = new WebClient(token)
  }

  async send(ctx: ExecutionContext, message: string): Promise<void> {
    try {
      await this.client.chat.postMessage({
        channel: this.channel,
        text: message,
      })
      ctx.logger.info('Slack notification sent', { channel: this.channel })
    } catch (err) {
      // Slack 실패는 시스템 실패 아님
      ctx.logger.error('Failed to send Slack notification', err, {
        channel: this.channel,
      })
      // 절대 throw 안 함
    }
  }
}
