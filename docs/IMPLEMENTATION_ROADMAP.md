# Page Understanding Engine 구현 로드맵

## 📋 개요

`add case.md`를 기반으로 한 단계별 구현 계획입니다.

---

## 🎯 목표

**기존:** 사이트별 Collector 생성
**목표:** 페이지 분석 기반 동적 전략 선택

---

## 📅 구현 단계

### Phase 1: 기반 구조 구축 (1주)

#### 1.1 타입 정의 ✅
- [x] `src/analyzer/types.ts` 생성
- [x] 모든 인터페이스 정의 완료

#### 1.2 Page Loader 구현
- [ ] `src/analyzer/PageLoader.ts` 생성
- [ ] axios 기반 초기 HTML 로드
- [ ] 응답 헤더 수집
- [ ] 타임아웃 처리

#### 1.3 Page Analyzer 기본 구현
- [ ] `src/analyzer/PageAnalyzer.ts` 생성
- [ ] HTML 신호 분석 (HtmlSignals)
- [ ] 의미 있는 HTML 판단 로직
- [ ] JS 의존도 계산

**파일 구조:**
```
src/analyzer/
├── types.ts           ✅ 완료
├── PageLoader.ts      🔄 진행 중
└── PageAnalyzer.ts    🔄 진행 중
```

---

### Phase 2: 분석 고도화 (1주)

#### 2.1 API 탐지 구현
- [ ] Playwright 경량 실행
- [ ] XHR/Fetch 요청 모니터링
- [ ] API 엔드포인트 추출
- [ ] DataAccessType 판단

#### 2.2 Page Classification 구현
- [ ] `src/analyzer/PageClassifier.ts` 생성
- [ ] RenderingType 판단
- [ ] PageRole 추론 (휴리스틱)
- [ ] PageProfile 생성

**파일 구조:**
```
src/analyzer/
├── PageClassifier.ts  🔄 진행 중
└── ...
```

---

### Phase 3: 정보 추출 (1주)

#### 3.1 Information Extractor 구현
- [ ] `src/analyzer/InformationExtractor.ts` 생성
- [ ] ContentBlock 탐지
- [ ] Field 자동 탐지 로직
- [ ] 휴리스틱 기반 필드 매칭

#### 3.2 Model Builder 구현
- [ ] `src/analyzer/ModelBuilder.ts` 생성
- [ ] ContentBlock → ExtractedItem 변환
- [ ] PageDataModel 생성
- [ ] 필드 값 추출 로직

**파일 구조:**
```
src/analyzer/
├── InformationExtractor.ts  🔄 진행 중
└── ModelBuilder.ts          🔄 진행 중
```

---

### Phase 4: 전략 시스템 (1주)

#### 4.1 Strategy Selector 구현
- [ ] `src/analyzer/StrategySelector.ts` 생성
- [ ] 전략 매트릭스 기반 결정
- [ ] RetryPolicy 생성
- [ ] Config 오버라이드 지원

#### 4.2 Dynamic Collector 구현
- [ ] `src/collectors/dynamic/DynamicCollector.ts` 생성
- [ ] 전략 기반 실행
- [ ] Strategy 인터페이스 정의

#### 4.3 Strategy 구현
- [ ] `src/collectors/dynamic/strategies/AxiosStrategy.ts`
- [ ] `src/collectors/dynamic/strategies/PlaywrightStrategy.ts`
- [ ] `src/collectors/dynamic/strategies/ApiStrategy.ts`

**파일 구조:**
```
src/
├── analyzer/
│   └── StrategySelector.ts
└── collectors/
    └── dynamic/
        ├── DynamicCollector.ts
        └── strategies/
            ├── AxiosStrategy.ts
            ├── PlaywrightStrategy.ts
            └── ApiStrategy.ts
```

---

### Phase 5: Parser 시스템 (1주)

#### 5.1 Schema-driven Parser 구현
- [ ] `src/parsers/ListParser.ts`
- [ ] `src/parsers/DetailParser.ts`
- [ ] `src/parsers/ApiParser.ts`
- [ ] PageRole 기반 파서 선택

#### 5.2 Schema 정의
- [ ] `src/parsers/schemas/NoticeSchema.ts`
- [ ] `src/parsers/schemas/RecruitSchema.ts`
- [ ] `src/parsers/schemas/EventSchema.ts`

**파일 구조:**
```
src/parsers/
├── ListParser.ts
├── DetailParser.ts
├── ApiParser.ts
└── schemas/
    ├── NoticeSchema.ts
    ├── RecruitSchema.ts
    └── EventSchema.ts
```

---

### Phase 6: 통합 및 테스트 (1주)

#### 6.1 기존 시스템 통합
- [ ] DynamicCollector를 BaseCollector로 등록
- [ ] Registry 수정
- [ ] Config 시스템 통합

#### 6.2 테스트
- [ ] KLCA 공지사항 테스트
- [ ] 네이버 CSR 페이지 테스트
- [ ] 기존 Collector와 결과 비교

#### 6.3 문서화
- [ ] 사용 가이드 작성
- [ ] Config 예시 작성
- [ ] 트러블슈팅 가이드

---

## 🔄 마이그레이션 전략

### 하이브리드 모드

```typescript
// src/collectors/registry.ts
export function loadCollectors(): BaseCollector[] {
  return [
    // 기존 Collector (유지)
    new NaverPlusStoreCollector(),
    
    // 새로운 Page Engine 사용
    new DynamicCollector({
      sourceName: 'klca',
      url: 'https://www.klca.or.kr/sub/comm/notice.asp',
      usePageEngine: true,
    }),
  ]
}
```

### Config 기반 제어

```typescript
// config/pages.json
{
  "sources": [
    {
      "name": "klca",
      "url": "https://www.klca.or.kr/sub/comm/notice.asp",
      "usePageEngine": true,
      "override": {
        "pageRole": "LIST_NOTICE",
        "fetcher": "AXIOS"
      }
    }
  ]
}
```

---

## 📊 우선순위

### 높은 우선순위
1. ✅ 타입 정의
2. Page Loader
3. Page Analyzer (HTML 분석)
4. Page Classification

### 중간 우선순위
5. Information Extractor
6. Model Builder
7. Strategy Selector

### 낮은 우선순위
8. API 탐지 (Playwright)
9. Dynamic Collector
10. Schema-driven Parser

---

## 🎯 성공 기준

### Phase 1 완료 기준
- [ ] PageLoader가 정상적으로 HTML 로드
- [ ] PageAnalyzer가 HTML 신호 분석 성공
- [ ] 타입 오류 없음

### Phase 2 완료 기준
- [ ] PageClassification이 정확하게 역할 판단
- [ ] RenderingType 판단 정확도 > 80%

### Phase 3 완료 기준
- [ ] ContentBlock 탐지 성공
- [ ] Field 자동 탐지 정확도 > 70%

### Phase 4 완료 기준
- [ ] 전략 선택 정확도 > 90%
- [ ] DynamicCollector가 전략에 따라 실행

### Phase 5 완료 기준
- [ ] Parser가 PageRole에 맞게 동작
- [ ] Schema 검증 통과

### Phase 6 완료 기준
- [ ] 기존 시스템과 통합 완료
- [ ] 테스트 케이스 통과
- [ ] 문서화 완료

---

## 📝 다음 단계

**즉시 시작 가능한 작업:**
1. `src/analyzer/PageLoader.ts` 구현
2. `src/analyzer/PageAnalyzer.ts` 기본 구현
3. 단위 테스트 작성

**참고 문서:**
- `docs/PAGE_UNDERSTANDING_ENGINE_DESIGN.md` - 전체 설계도
- `add case.md` - 원본 요구사항
