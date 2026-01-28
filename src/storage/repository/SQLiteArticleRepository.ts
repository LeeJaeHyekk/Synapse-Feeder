import type { ExecutionContext, Article } from '../../types'
import type { ArticleRepository } from './ArticleRepository'
import Database from 'better-sqlite3'
import dayjs from 'dayjs'
import { isArticleArray } from '../../types'

/**
 * SQLite 기반 Article Repository 구현
 */
export class SQLiteArticleRepository implements ArticleRepository {
  constructor(private db: Database.Database) {}

  async saveMany(ctx: ExecutionContext, articles: Article[]): Promise<void> {
    if (articles.length === 0) {
      return
    }

    // 타입 가드: Article 배열 검증 (런타임 검증)
    const articleCount = articles.length
    if (!isArticleArray(articles)) {
      ctx.logger.error('Invalid article data format', undefined, {
        count: articleCount,
      })
      throw new Error('Invalid article data format')
    }

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO articles
      (source, title, url, published_at, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const now = dayjs().utc().toISOString()

    const transaction = this.db.transaction((items: Article[]) => {
      for (const article of items) {
        try {
          stmt.run(
            article.source,
            article.title,
            article.url,
            article.publishedAt.toISOString(),
            article.content,
            now
          )
        } catch (err) {
          ctx.logger.error(
            `Failed to save article: ${article.url}`,
            err,
            { source: article.source }
          )
          // 개별 실패는 로그만 남기고 계속 진행
        }
      }
    })

    transaction(articles)
  }
}
