import type { ExecutionContext, RawRecord } from '../types'
import { ArticleSchema, type Article } from './schemas/Article.schema'
import { parseDate, sanitizeHtml } from './utils'
import { NormalizeError } from '../errors'
import { isRawRecordArray } from '../types'

/**
 * Raw 데이터를 Article로 정규화
 * 이 함수를 통과한 데이터는 "절대 신뢰"
 * @param ctx Execution Context
 * @param sourceName 소스 이름
 * @param rawList Raw 데이터 배열
 * @returns 정규화된 Article 배열
 */
export function normalizeArticles(
  ctx: ExecutionContext,
  sourceName: string,
  rawList: RawRecord[]
): Article[] {
  // 타입 가드: 입력 데이터 검증
  if (!isRawRecordArray(rawList)) {
    ctx.logger.error(`Invalid raw data format for source: ${sourceName}`, undefined, {
      source: sourceName,
      dataType: typeof rawList,
    })
    throw new NormalizeError(sourceName, rawList, -1, new Error('Invalid raw data format'))
  }

  return rawList.map((raw, index) => {
    try {
      return ArticleSchema.parse({
        source: sourceName,
        title: String(raw['title'] ?? raw['headline'] ?? ''),
        url: String(raw['url'] ?? raw['link'] ?? ''),
        publishedAt: parseDate(raw['publishedAt'] ?? raw['date'] ?? raw['published_at']),
        content: sanitizeHtml(raw['content'] ?? raw['body'] ?? raw['description'] ?? ''),
      })
    } catch (err) {
      ctx.logger.error(`Normalize error at index ${index}`, err, {
        source: sourceName,
        index,
      })
      throw new NormalizeError(sourceName, raw, index, err)
    }
  })
}
