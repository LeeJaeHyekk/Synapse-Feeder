import { z } from 'zod'

/**
 * 환경변수 스키마
 * zod로 검증하여 타입 안전성 보장
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['dev', 'prod']).default('dev'),
  SLACK_TOKEN: z.string().min(1),
  SLACK_CHANNEL: z.string().min(1),
  SLACK_ERROR_CHANNEL: z.string().min(1).optional(),
  DB_PATH: z.string().default('./data/articles.db'),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(30_000),
})

export type EnvConfig = z.infer<typeof EnvSchema>

/**
 * App Config
 * 검증된 환경변수를 기반으로 한 애플리케이션 설정
 */
export interface AppConfig extends EnvConfig {
  // 필요시 추가 설정 필드
}
