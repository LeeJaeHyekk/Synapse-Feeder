import type { ArticleRepository } from './ArticleRepository.js'
import { SQLiteArticleRepository } from './SQLiteArticleRepository.js'
import { createDatabase } from '../db/index.js'

/**
 * Article Repository 생성
 */
export function createArticleRepository(dbPath: string): ArticleRepository {
  const db = createDatabase(dbPath)
  return new SQLiteArticleRepository(db)
}
