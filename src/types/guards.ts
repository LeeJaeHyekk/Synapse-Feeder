import type { RawRecord } from './Collector'
import type { Article } from './Article'
import type { ExecutionContext } from './ExecutionContext'
import { ArticleSchema } from '../normalizers/schemas/Article.schema'

/**
 * 타입 가드 함수들
 * 런타임 타입 검증을 통한 안정성 확보
 */

/**
 * RawRecord 타입 가드
 * @param value 검증할 값
 * @returns RawRecord 여부
 */
export function isRawRecord(value: unknown): value is RawRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).every(key => typeof key === 'string')
  )
}

/**
 * RawRecord 배열 타입 가드
 * @param value 검증할 값
 * @returns RawRecord[] 여부
 */
export function isRawRecordArray(value: unknown): value is RawRecord[] {
  return (
    Array.isArray(value) &&
    value.every(item => isRawRecord(item))
  )
}

/**
 * Article 타입 가드
 * @param value 검증할 값
 * @returns Article 여부
 */
export function isArticle(value: unknown): value is Article {
  try {
    ArticleSchema.parse(value)
    return true
  } catch {
    return false
  }
}

/**
 * Article 배열 타입 가드
 * @param value 검증할 값
 * @returns Article[] 여부
 */
export function isArticleArray(value: unknown): value is Article[] {
  return (
    Array.isArray(value) &&
    value.every(item => isArticle(item))
  )
}

/**
 * ExecutionContext 타입 가드
 * @param value 검증할 값
 * @returns ExecutionContext 여부
 */
export function isExecutionContext(value: unknown): value is ExecutionContext {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const ctx = value as Record<string, unknown>

  return (
    typeof ctx.runId === 'string' &&
    ctx.runId.length > 0 &&
    typeof ctx.runDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(ctx.runDate) &&
    ctx.timezone === 'UTC' &&
    typeof ctx.logger === 'object' &&
    ctx.logger !== null &&
    typeof ctx.config === 'object' &&
    ctx.config !== null
  )
}

/**
 * 문자열 타입 가드
 * @param value 검증할 값
 * @returns string 여부
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * 비어있지 않은 문자열 타입 가드
 * @param value 검증할 값
 * @returns 비어있지 않은 string 여부
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * 숫자 타입 가드
 * @param value 검증할 값
 * @returns number 여부
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * 양수 타입 가드
 * @param value 검증할 값
 * @returns 양수 number 여부
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0
}

/**
 * URL 문자열 타입 가드
 * @param value 검증할 값
 * @returns 유효한 URL string 여부
 */
export function isUrl(value: unknown): value is string {
  if (!isString(value)) {
    return false
  }

  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/**
 * Date 객체 타입 가드
 * @param value 검증할 값
 * @returns Date 여부
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime())
}
