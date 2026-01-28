# @mozilla/readability 통합 가이드

## 개요

`@mozilla/readability` 라이브러리를 통합하여 본문 추출 정확도를 향상시켰습니다.

## 통합 내용

### 1. 패키지 추가
```json
{
  "dependencies": {
    "@mozilla/readability": "^0.5.0",
    "jsdom": "^24.1.3"
  }
}
```

### 2. 알고리즘 개선

**기존 방식:**
- CSS 셀렉터 기반 본문 추출
- 여러 패턴 시도하지만 정확도 제한적

**개선된 방식:**
- @mozilla/readability를 사용한 고품질 본문 추출
- 섹션 단위 추출 시도 → 실패 시 전체 페이지 추출
- Readability 결과와 기존 방법 비교하여 더 나은 결과 선택

### 3. 작동 방식

```typescript
// 1. 기본 셀렉터로 본문 추출 시도
const contentField = extractHighQualityField($, 'content', $section)

// 2. @mozilla/readability로 섹션 단위 본문 추출 시도
const sectionHtml = $section.html()
const readabilityResult = extractContentWithReadability(sectionHtml, baseUrl)

// 3. Readability 결과가 더 좋으면 사용 (신뢰도 95%)
if (readabilityResult && readabilityResult.confidence > contentConfidence) {
  finalContent = readabilityResult.content
}

// 4. 실패 시 전체 페이지에서 Readability 시도
if (!readabilityResult || readabilityResult.content.length < 50) {
  const fullPageReadability = extractContentWithReadability(html, baseUrl)
  // 더 긴 본문이면 사용
}
```

## 개선 효과

### 정확도 향상
- **기존**: 셀렉터 기반 추출 (신뢰도 50-80%)
- **개선**: @mozilla/readability 사용 시 신뢰도 95%
- 광고, 사이드바 등 불필요한 요소 자동 제거

### 본문 품질
- **기존**: HTML 구조에 따라 불완전한 추출 가능
- **개선**: Mozilla Readability 알고리즘으로 정확한 본문 추출
- 제목, 요약도 함께 추출 가능

## 사용 예시

### 자동 통합
`extractHighQualityData()` 함수가 자동으로 @mozilla/readability를 사용합니다:

```typescript
import { extractHighQualityData } from '../utils/htmlParser.js'

const items = extractHighQualityData(html, baseUrl)
// @mozilla/readability가 자동으로 적용됨
```

### 수동 사용
특정 HTML에서 본문만 추출하려면:

```typescript
import { extractMainContentWithReadability } from '../utils/htmlParser.js'

const result = extractMainContentWithReadability(html, baseUrl)
if (result) {
  console.log(result.content)  // 본문
  console.log(result.title)    // 제목
  console.log(result.excerpt)  // 요약
}
```

## 성능

- **속도**: 기존 대비 약간 느림 (JSDOM 사용으로 인해)
- **메모리**: JSDOM 사용으로 메모리 사용량 증가 (하지만 정확도 향상으로 가치 있음)
- **실패 처리**: Readability 실패 시 기존 방법으로 자동 fallback

## 로깅

통합 후 로그에서 Readability 사용 여부 확인:

```
[INFO] Data organized by category hierarchy
  readabilityUsed: 15  // @mozilla/readability로 추출된 항목 수
  totalItems: 20
  qualityStats: { high: 12, medium: 6, low: 2 }
```

## 참고

- @mozilla/readability는 Mozilla의 공식 Readability 라이브러리
- Firefox의 Reader View와 동일한 알고리즘 사용
- JSDOM을 사용하여 DOM API 제공
