import { z } from 'zod'

/**
 * Article Schema
 * 시스템 전체에서 "신뢰 가능한 Article"
 * 이 스키마를 통과하지 못하면 저장/전송 불가
 */
export const ArticleSchema = z.object({
  source: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  publishedAt: z.date(),
  content: z.string().min(1),
})

export type Article = z.infer<typeof ArticleSchema>
