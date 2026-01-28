import type { BaseCollector } from './BaseCollector'
import { NaverPlusStoreCollector } from './web/NaverPlusStoreCollector'

/**
 * Collector Registry
 * 신규 소스 추가 시 여기만 수정
 */
export function loadCollectors(): BaseCollector[] {
  return [
    new NaverPlusStoreCollector(),
    // 추가 Collector는 여기에 등록
    // 예: new SiteACollector(), new ApiBCollector()
  ]
}
