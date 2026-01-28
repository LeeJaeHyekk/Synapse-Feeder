/**
 * Fetch Strategy 인터페이스
 * 
 * 다양한 수집 전략의 공통 인터페이스
 */

import type { RawRecord } from '../../../types/index.js'
import type { ExecutionContext } from '../../../types/index.js'

/**
 * Fetch Strategy 인터페이스
 */
export interface FetchStrategy {
  /**
   * 전략 이름
   */
  readonly name: string

  /**
   * 데이터 수집 실행
   */
  fetch(
    url: string,
    ctx: ExecutionContext,
    options?: {
      timeout?: number
      useReadability?: boolean
    }
  ): Promise<RawRecord[]>
}
