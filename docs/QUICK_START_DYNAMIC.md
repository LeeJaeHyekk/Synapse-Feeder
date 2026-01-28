# Dynamic Collector 빠른 시작 가이드

## 🚀 5분 안에 시작하기

### 1. Registry에 추가

```typescript
// src/collectors/registry.ts
import { DynamicCollector } from './dynamic/index.js'

export function loadCollectors(): BaseCollector[] {
  return [
    // 기존 Collector
    new NaverPlusStoreCollector(),
    new KlcaCollector(),
    
    // Dynamic Collector 추가 (한 줄!)
    new DynamicCollector({
      sourceName: 'klca_dynamic',
      url: 'https://www.klca.or.kr/sub/comm/notice.asp',
    }),
  ]
}
```

### 2. 실행

```bash
npm run dev
```

### 3. 결과 확인

Dynamic Collector가 자동으로:
1. 페이지 분석
2. 전략 선택 (AXIOS 또는 PLAYWRIGHT)
3. 데이터 수집
4. RawRecord[] 반환

---

## 📝 Config 예시

### 기본 사용 (자동 판단)

```typescript
new DynamicCollector({
  sourceName: 'my_site',
  url: 'https://example.com/notices',
})
```

### Config 오버라이드

```typescript
new DynamicCollector({
  sourceName: 'my_site',
  url: 'https://example.com/notices',
  override: {
    pageRole: 'LIST_NOTICE',
    fetcher: 'AXIOS',
    useReadability: false,
  },
})
```

### 셀렉터 지정

```typescript
new DynamicCollector({
  sourceName: 'my_site',
  url: 'https://example.com/notices',
  selectors: {
    list: 'table tbody tr',
    title: 'td a',
    date: 'td:nth-child(3)',
  },
})
```

---

## 🔍 작동 원리

```
URL 입력
  ↓
[Page Loader] HTML 로드
  ↓
[Page Analyzer] 분석
  ├─ HTML 신호 분석
  ├─ JS 의존도 계산
  └─ API 탐지 (필요시)
  ↓
[Page Classifier] 분류
  ├─ Rendering: STATIC | CSR
  ├─ DataAccess: HTML | XHR | MIXED
  └─ PageRole: LIST_NOTICE | DETAIL_NOTICE | ...
  ↓
[Information Extractor] 블록 탐지
  └─ ContentBlock[] 추출
  ↓
[Model Builder] 모델 생성
  └─ PageDataModel 생성
  ↓
[Strategy Selector] 전략 선택
  └─ CrawlStrategy 결정
  ↓
[Dynamic Collector] 실행
  └─ RawRecord[] 반환
```

---

## ✅ 완료!

이제 Dynamic Collector가 자동으로 페이지를 분석하고 최적의 전략으로 데이터를 수집합니다!
