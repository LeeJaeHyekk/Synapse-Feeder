# Dynamic Collector 사용 가이드

## 개요

Dynamic Collector는 페이지를 분석하여 최적의 수집 전략을 자동으로 선택하고 실행합니다.

---

## 기본 사용법

### 1. Registry에 추가

```typescript
// src/collectors/registry.ts
import { DynamicCollector } from './dynamic/index.js'
import type { PageConfig } from '../analyzer/types.js'

export function loadCollectors(): BaseCollector[] {
  return [
    // 기존 Collector
    new NaverPlusStoreCollector(),
    new KlcaCollector(),
    
    // Dynamic Collector 추가
    new DynamicCollector({
      sourceName: 'klca_dynamic',
      url: 'https://www.klca.or.kr/sub/comm/notice.asp',
    }),
  ]
}
```

### 2. Config 오버라이드 사용

```typescript
new DynamicCollector({
  sourceName: 'klca_notice',
  url: 'https://www.klca.or.kr/sub/comm/notice.asp',
  override: {
    pageRole: 'LIST_NOTICE',
    fetcher: 'AXIOS',
    useReadability: false,
  },
  selectors: {
    list: 'table tbody tr',
    title: 'td a',
    date: 'td:nth-child(3)',
  },
})
```

---

## 작동 흐름

```
1. URL 입력
   ↓
2. Page Loader: 초기 HTML 로드
   ↓
3. Page Analyzer: HTML/JS/API 분석
   ↓
4. Page Classifier: Rendering/DataAccess/PageRole 판단
   ↓
5. Information Extractor: ContentBlock 탐지
   ↓
6. Model Builder: PageDataModel 생성
   ↓
7. Strategy Selector: 최적 전략 선택
   ↓
8. Dynamic Collector: 전략 실행
   ↓
9. RawRecord[] 반환
```

---

## 예시 시나리오

### 시나리오 1: 정적 공지사항 리스트 (KLCA)

```typescript
const collector = new DynamicCollector({
  sourceName: 'klca_notice',
  url: 'https://www.klca.or.kr/sub/comm/notice.asp',
})

// 자동 판단:
// - Rendering: STATIC
// - DataAccess: HTML
// - PageRole: LIST_NOTICE
// - Strategy: AXIOS + LIST parser
```

### 시나리오 2: CSR 페이지 (네이버)

```typescript
const collector = new DynamicCollector({
  sourceName: 'naver_csr',
  url: 'https://example.com/csr-page',
})

// 자동 판단:
// - Rendering: CSR
// - DataAccess: XHR
// - PageRole: LIST_NOTICE
// - Strategy: PLAYWRIGHT + API parser
```

### 시나리오 3: 상세 페이지

```typescript
const collector = new DynamicCollector({
  sourceName: 'article_detail',
  url: 'https://example.com/article/123',
})

// 자동 판단:
// - Rendering: STATIC
// - DataAccess: HTML
// - PageRole: DETAIL_NOTICE
// - Strategy: AXIOS + DETAIL parser + Readability
```

---

## Config 옵션

### PageConfig 인터페이스

```typescript
interface PageConfig {
  sourceName: string      // 필수: 소스 이름
  url: string            // 필수: 대상 URL
  
  override?: {
    pageRole?: PageRole  // 페이지 역할 오버라이드
    fetcher?: 'AXIOS' | 'PLAYWRIGHT'
    parser?: 'LIST' | 'DETAIL' | 'API' | 'MIXED'
    useReadability?: boolean
  }
  
  selectors?: {
    list?: string        // 리스트 셀렉터
    item?: string        // 아이템 셀렉터
    title?: string       // 제목 셀렉터
    date?: string        // 날짜 셀렉터
    author?: string      // 작성자 셀렉터
    content?: string     // 본문 셀렉터
    detailUrl?: string   // 상세 URL 셀렉터
  }
}
```

---

## 로깅

Dynamic Collector는 상세한 로그를 제공합니다:

```
[INFO] Dynamic collecting from klca_dynamic
[INFO] Page analysis completed
  renderingType: "STATIC"
  dataAccessType: "HTML"
  pageRole: "LIST_NOTICE"
  strategy: "AXIOS"
  itemsFound: 15
[INFO] Collected 15 items from klca_dynamic
```

---

## 장점

1. **자동 전략 선택**: 페이지 분석 기반 최적 전략 자동 선택
2. **Config 기반 제어**: 필요시 오버라이드 가능
3. **확장성**: 새 사이트 추가 시 Config만 수정
4. **유지보수성**: DOM 변경 시 자동 적응 (일부)

---

## 제한사항

1. **초기 분석 비용**: 페이지 분석에 시간 소요
2. **완벽하지 않은 판단**: 일부 페이지는 잘못 분류될 수 있음
   → Config 오버라이드로 해결

---

## 마이그레이션 가이드

### 기존 Collector → Dynamic Collector

**Before:**
```typescript
export class KlcaCollector extends BaseWebCollector {
  // 수백 줄의 코드
}
```

**After:**
```typescript
new DynamicCollector({
  sourceName: 'klca',
  url: 'https://www.klca.or.kr/sub/comm/notice.asp',
})
```

**장점:**
- 코드량 대폭 감소
- 유지보수 용이
- 자동 전략 선택
