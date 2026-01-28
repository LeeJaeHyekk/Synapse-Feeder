import NodeCache from 'node-cache'

/**
 * 캐싱 유틸리티
 * 
 * 개선사항:
 * - node-cache 라이브러리 사용
 * - 중복 요청 방지
 * - 네트워크 비용 절감
 * 
 * 주의사항:
 * - 메모리 사용량 증가
 * - 실시간성 저하 가능
 * - 선택적 사용 권장
 */

/**
 * 기본 캐시 인스턴스 (1시간 TTL)
 */
const defaultCache = new NodeCache({
  stdTTL: 3600, // 1시간
  checkperiod: 600, // 10분마다 만료된 항목 정리
  useClones: false, // 성능 최적화
})

/**
 * 캐시에서 값 가져오기
 * @param key 캐시 키
 * @returns 캐시된 값 또는 undefined
 */
export function getCache<T>(key: string): T | undefined {
  return defaultCache.get<T>(key)
}

/**
 * 캐시에 값 저장
 * @param key 캐시 키
 * @param value 저장할 값
 * @param ttlSeconds TTL (초, 선택적)
 */
export function setCache<T>(key: string, value: T, ttlSeconds?: number): void {
  if (ttlSeconds) {
    defaultCache.set(key, value, ttlSeconds)
  } else {
    defaultCache.set(key, value)
  }
}

/**
 * 캐시에서 값 삭제
 * @param key 캐시 키
 */
export function deleteCache(key: string): void {
  defaultCache.del(key)
}

/**
 * 캐시 전체 삭제
 */
export function clearCache(): void {
  defaultCache.flushAll()
}

/**
 * 캐시 통계 가져오기
 */
export function getCacheStats(): NodeCache.Stats {
  return defaultCache.getStats()
}

/**
 * 캐시된 함수 실행 (캐시가 있으면 캐시 사용, 없으면 실행 후 캐시)
 * @param key 캐시 키
 * @param fn 실행할 함수
 * @param ttlSeconds TTL (초, 선택적)
 * @returns 함수 실행 결과
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const cached = getCache<T>(key)
  if (cached !== undefined) {
    return cached
  }

  const result = await fn()
  setCache(key, result, ttlSeconds)
  return result
}

/**
 * 커스텀 캐시 인스턴스 생성
 * @param options 캐시 옵션
 * @returns NodeCache 인스턴스
 */
export function createCache(options?: NodeCache.Options): NodeCache {
  return new NodeCache(options)
}
