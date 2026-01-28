import type { ExecutionContext, Article } from '../../types'

/**
 * Article Repository Interface
 */
export interface ArticleRepository {
  saveMany(ctx: ExecutionContext, articles: Article[]): Promise<void>
}
