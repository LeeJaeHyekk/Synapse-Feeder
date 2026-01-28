# 구조화된 데이터 분류 라이브러리 및 알고리즘 가이드

## 개요

웹 크롤링에서 구조화된 데이터를 자동으로 분류하고 추출하는 방법들을 정리합니다.

---

## 1. 현재 프로젝트에서 사용 중인 방법

### 1.1 휴리스틱 기반 분류 (`dataClassifier.ts`)
- **장점**: 빠르고 가벼움, 추가 의존성 없음
- **단점**: 패턴이 복잡하거나 새로운 사이트에 대한 적응력 낮음
- **적용**: 카테고리 키워드 매칭, CSS 선택자 기반 필드 추출

### 1.2 @mozilla/readability
- **장점**: 본문 추출에 특화, Firefox 기반 검증된 알고리즘
- **단점**: 분류 기능 없음, 단순 본문 추출만 가능
- **적용**: 현재 `AxiosStrategy`에서 사용 중

---

## 2. 추천 라이브러리 (Node.js/TypeScript)

### 2.1 Mercury Parser (Postlight)
**특징**: 웹 페이지에서 의미 있는 콘텐츠 자동 추출

```bash
npm install @postlight/parser
```

**참고**: `@postlight/mercury-parser`는 deprecated되었습니다. `@postlight/parser`를 사용하세요.

**장점**:
- 본문, 제목, 작성자, 날짜 자동 추출
- 광고/보일러플레이트 자동 제거
- TypeScript 지원

**단점**:
- 분류 기능은 없음 (추출만)
- 일부 사이트에서 정확도 낮을 수 있음

**사용 예시**:
```typescript
import Mercury from '@postlight/parser'

const result = await Mercury.parse(url, {
  html: htmlContent,
})
// result.title, result.content, result.author, result.date_published
```

---

### 2.2 Unfluff (Node.js)
**특징**: HTML에서 구조화된 메타데이터 추출

```bash
npm install unfluff
```

**장점**:
- 제목, 설명, 이미지, 언어 자동 감지
- 가볍고 빠름

**단점**:
- 분류 기능 없음
- 본문 추출 품질이 Readability보다 낮을 수 있음

---

### 2.3 Diffbot (상용 API)
**특징**: AI 기반 자동 구조화 및 분류

**장점**:
- 매우 높은 정확도
- 자동 분류 및 엔티티 추출
- 다양한 콘텐츠 타입 지원 (기사, 제품, 토론 등)

**단점**:
- 유료 (무료 티어 제한적)
- API 의존성

---

## 3. ML/AI 기반 접근법

### 3.1 Zero-Shot Classification
**개념**: 학습하지 않은 카테고리도 분류 가능

**라이브러리**:
- `@huggingface/transformers` (Node.js)
- 또는 Python API 서버 구축 후 호출

**장점**:
- 사전 학습된 모델 활용
- 새로운 카테고리 추가 용이

**단점**:
- 리소스 사용량 높음
- Node.js에서 직접 사용 시 성능 이슈

**예시**:
```typescript
// Python 서버 구축 후 API 호출 권장
const response = await axios.post('http://localhost:8000/classify', {
  text: content,
  categories: ['공지사항', '세미나', '행사', '뉴스']
})
```

---

### 3.2 LangExtract (Python, 2024)
**특징**: Google Gemini 기반 구조화된 데이터 추출

**장점**:
- 스키마 기반 일관된 출력
- 긴 문서 처리 최적화
- 도메인 무관 (의료, 법률, 비즈니스 등)

**단점**:
- Python 전용 (Node.js에서 사용하려면 API 서버 필요)
- Google API 키 필요

---

## 4. DOM 트리 분석 기반 알고리즘

### 4.1 Fathom (Mozilla)
**특징**: 감독 학습 기반 웹 페이지 분류

**장점**:
- 규칙 기반 + 신경망 학습
- 웹 페이지 전체 분류 가능

**단점**:
- 학습 데이터 필요
- Node.js 바인딩 없음 (Python/JavaScript 직접 사용)

---

### 4.2 GROWN+UP (연구용)
**특징**: Graph Neural Network 기반 DOM 그래프 분석

**장점**:
- 최신 연구 결과 (SOTA)
- 보일러플레이트 제거에 특화

**단점**:
- 연구 단계 (프로덕션 미검증)
- 구현 복잡도 높음

---

## 5. 하이브리드 접근법 (권장)

### 5.1 계층적 분류 전략

```
1단계: 휴리스틱 (빠른 필터링)
  ↓
2단계: DOM 구조 분석 (의미 있는 영역 식별)
  ↓
3단계: Readability/Mercury (본문 추출)
  ↓
4단계: Zero-Shot Classification (필요시)
```

### 5.2 구현 예시

```typescript
// 1. 휴리스틱으로 빠른 분류
const quickCategory = classifyCategory(text) // 현재 dataClassifier.ts

// 2. DOM 구조 분석으로 콘텐츠 영역 식별
const contentArea = identifyContentArea($)

// 3. Readability로 본문 추출
const readability = extractMainContentWithReadability(html, url)

// 4. 필요시 ML 분류 (API 호출)
if (needsMLClassification) {
  const mlCategory = await classifyWithML(content)
}
```

---

## 6. 프로젝트 적용 권장사항

### 단기 (즉시 적용 가능)
1. **Mercury Parser 통합**
   - `@postlight/mercury-parser` 추가
   - `AxiosStrategy`에 fallback으로 사용
   - Readability와 결과 비교 후 더 나은 것 선택

2. **DOM 구조 분석 강화**
   - 현재 `dataClassifier.ts`의 섹션 선택자 확장
   - 시맨틱 HTML 태그 우선 활용 (`<main>`, `<article>`, `<section>`)

### 중기 (1-2주)
3. **Zero-Shot Classification API 서버**
   - Python FastAPI 서버 구축
   - `transformers` 라이브러리 사용
   - Node.js에서 HTTP 호출

4. **카테고리별 전용 추출기**
   - 공지사항, 세미나, 행사 등 타입별 최적화된 추출 로직
   - 각 타입의 특징 패턴 학습

### 장기 (1개월+)
5. **자동 학습 시스템**
   - 수집된 데이터로 모델 개선
   - 피드백 루프 구축
   - 정확도 지표 모니터링

---

## 7. 라이브러리 비교표

| 라이브러리 | 언어 | 분류 | 추출 | 속도 | 정확도 | 비용 |
|-----------|------|------|------|------|--------|------|
| **현재 (휴리스틱)** | TS | ✅ | ✅ | ⚡⚡⚡ | ⭐⭐ | 무료 |
| **Readability** | TS | ❌ | ✅ | ⚡⚡⚡ | ⭐⭐⭐ | 무료 |
| **Mercury Parser** | TS | ❌ | ✅ | ⚡⚡ | ⭐⭐⭐ | 무료 |
| **Unfluff** | TS | ❌ | ✅ | ⚡⚡⚡ | ⭐⭐ | 무료 |
| **Zero-Shot (API)** | Any | ✅ | ❌ | ⚡ | ⭐⭐⭐⭐ | 무료/저렴 |
| **Diffbot** | Any | ✅ | ✅ | ⚡⚡ | ⭐⭐⭐⭐⭐ | 유료 |
| **LangExtract** | Python | ✅ | ✅ | ⚡ | ⭐⭐⭐⭐ | API 키 필요 |

---

## 8. 결론 및 추천

### 즉시 적용 가능
1. **Mercury Parser 추가**: Readability와 함께 사용하여 추출 품질 향상
2. **DOM 구조 분석 강화**: 현재 `dataClassifier.ts` 개선

### 단기 개선
3. **Zero-Shot Classification API**: Python 서버 구축 후 Node.js에서 호출
4. **하이브리드 전략**: 휴리스틱 → DOM 분석 → ML 분류 순차 적용

### 장기 비전
5. **자동 학습 시스템**: 수집 데이터로 모델 개선 및 정확도 향상

---

## 참고 자료

- [Mercury Parser GitHub](https://github.com/postlight/mercury-parser)
- [LangExtract 공식 문서](https://langextract.com/)
- [Fathom 소개](https://mozilla.github.io/fathom/intro.html)
- [Zero-Shot Classification 가이드](https://huggingface.co/docs/transformers/tasks/zero_shot_classification)
