import type { ExecutionContext } from './ExecutionContext'

/**
 * Raw Record 타입
 * Collector가 반환하는 원시 데이터
 */
export type RawRecord = Record<string, unknown>

/**
 * Collector Policy
 * Collector별 리소스 통제 정책
 */
export interface CollectorPolicy {
  /** Collector 실행 단위 타임아웃 (ms) */
  timeoutMs: number
  /** 최대 재시도 횟수 */
  maxRetries: number
  /** Rate Limit 정책 (선택) */
  rateLimit?: {
    /** 초당 요청 수 */
    requestsPerSecond: number
    /** 최소 요청 간격 (ms) */
    minIntervalMs: number
  }
}

/**
 * Base Collector Interface
 * 모든 Collector가 구현해야 하는 계약
 */
export interface BaseCollector {
  /** 소스 식별자 */
  readonly sourceName: string
  /** 리소스 통제 정책 */
  readonly policy?: CollectorPolicy
  /** Raw 데이터 수집 */
  collect(ctx: ExecutionContext): Promise<RawRecord[]>
}
