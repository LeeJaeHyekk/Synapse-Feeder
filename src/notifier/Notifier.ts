import type { ExecutionContext } from '../types/index.js'

/**
 * Notifier Interface
 */
export interface Notifier {
  send(ctx: ExecutionContext, message: string): Promise<void>
}
