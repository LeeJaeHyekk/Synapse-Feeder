import type { Article } from '../types/index.js'
import { createHash } from 'crypto'

/**
 * 중복 제거 전략
 */
export interface DeduplicationStrategy {
  /** 중복 판단 키 생성 함수 */
  key: (item: Article) => string
  /** 내용 해시 생성 함수 (선택) */
  hash?: (item: Article) => string
}

/**
 * Deduplicator
 * URL + Hash 기반 중복 제거
 * 
 * 기존 설계 원칙 준수:
 * - Storage 레이어에 위치 (비즈니스 의미 모름)
 * - Normalizer 통과 후 데이터만 처리
 */
export class Deduplicator {
  private seen = new Set<string>()

  constructor(private strategy: DeduplicationStrategy) {}

  /**
   * 중복 제거
   * @param items Article 배열
   * @returns 중복 제거된 Article 배열
   */
  deduplicate(items: Article[]): Article[] {
    return items.filter(item => {
      const key = this.strategy.key(item)
      const hash = this.strategy.hash?.(item)

      // URL 기반 키 + 내용 해시 (선택)
      const uniqueKey = hash ? `${key}:${hash}` : key

      if (this.seen.has(uniqueKey)) {
        return false // 중복 제거
      }

      this.seen.add(uniqueKey)
      return true
    })
  }

  /**
   * 상태 초기화 (테스트용)
   */
  reset(): void {
    this.seen.clear()
  }

  /**
   * 기본 전략: URL 기반 중복 제거
   */
  static createDefault(): Deduplicator {
    return new Deduplicator({
      key: (item) => item.url,
      hash: (item) => {
        // 내용 해시 생성 (빈 문자열도 처리)
        const content = item.content || ''
        return createHash('md5').update(content).digest('hex').slice(0, 8)
      },
    })
  }
}
