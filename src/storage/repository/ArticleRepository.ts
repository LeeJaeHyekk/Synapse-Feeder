import type { ExecutionContext, Article } from '../../types/index.js'

/**
 * Article Repository Interface
 */
export interface ArticleRepository {
  saveMany(ctx: ExecutionContext, articles: Article[]): Promise<void>
}
