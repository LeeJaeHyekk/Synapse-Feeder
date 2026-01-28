import type { ArticleRepository } from './ArticleRepository'
import { SQLiteArticleRepository } from './SQLiteArticleRepository'
import { createDatabase } from '../db'

/**
 * Article Repository 생성
 */
export function createArticleRepository(dbPath: string): ArticleRepository {
  const db = createDatabase(dbPath)
  return new SQLiteArticleRepository(db)
}
