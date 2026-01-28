import type { BaseCollector } from './BaseCollector.js'
import { DynamicCollector } from './dynamic/index.js'

/**
 * Collector Registry
 * Dynamic Collector를 우선적으로 사용하여 페이지 분석 기반 동적 수집
 * 
 * 신규 소스 추가 시 DynamicCollector로 등록
 */
export function loadCollectors(): BaseCollector[] {
  return [
    // Dynamic Collector: 페이지 분석 기반 자동 전략 선택
    new DynamicCollector({
      sourceName: 'naver_plus_store',
      url: 'https://snxbest.naver.com/home',
    }),
    new DynamicCollector({
      sourceName: 'klca',
      url: 'https://www.klca.or.kr/sub/comm/notice.asp',
    }),
    // 추가 소스는 DynamicCollector로 등록
    // 예: new DynamicCollector({ sourceName: 'site_name', url: 'https://example.com' })
  ]
}
