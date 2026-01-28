import type { ExecutionContext } from '../types'

/**
 * Notifier Interface
 */
export interface Notifier {
  send(ctx: ExecutionContext, message: string): Promise<void>
}
