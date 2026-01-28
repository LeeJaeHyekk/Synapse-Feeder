# 개선사항 구현 가이드

## 1️⃣ 인코딩 자동 처리 미들웨어 (구현 완료 ✅)

### 🎯 목표

- EUC-KR / UTF-8 / 기타 인코딩 자동 판별
- Collector에서는 **"그냥 HTML 문자열 받기"**만 하도록
- axios 공통 사용 가능
- 실패 시 안전한 fallback

### 1-1. 설계 원칙

**❌ Collector가 하면 안 되는 것**
- charset 판단
- iconv 직접 호출
- responseType 고민

**✅ Middleware 책임**
- bytes 수신
- charset 추론
- 문자열 변환
- 결과는 항상 UTF-8 string

### 1-2. 핵심 아이디어

1. HTTP 응답은 무조건 ArrayBuffer
2. Content-Type 헤더에서 charset 추출
3. 없으면 `<meta charset>` 검사
4. 그래도 없으면 한국 사이트 heuristic
5. 최종 fallback: utf-8

### 1-3. 타입 정의

✅ **구현 완료**: `src/types/http.ts`

```typescript
export interface DecodedHtml {
  html: string
  encoding: string
}
```

### 1-4. 인코딩 판별 유틸 (실무 코드)

✅ **구현 완료**: `src/utils/encoding.ts`

- `decodeHtml()`: ArrayBuffer를 UTF-8 문자열로 변환
- `normalizeEncoding()`: 인코딩 이름 정규화
- `looksLikeKoreanSite()`: 한국 사이트 휴리스틱 판단
- 에러 처리 및 fallback 로직 포함

**주요 기능:**
- Content-Type 헤더 기반 인코딩 추출
- HTML meta 태그 기반 인코딩 추출
- 한국 사이트 휴리스틱 (한글 + 키워드 패턴)
- 안전한 fallback (UTF-8)

### 1-5. HTTP 미들웨어화 (Collector 친화)

✅ **구현 완료**: `src/utils/http.ts`

```typescript
export async function fetchHtml(
  url: string,
  options?: { timeout?: number; headers?: Record<string, string> }
): Promise<DecodedHtml>
```

**특징:**
- axios를 사용하여 ArrayBuffer로 응답 수신
- 자동 인코딩 처리
- 기본 User-Agent 및 Accept 헤더 설정
- 타임아웃 및 커스텀 헤더 지원

### 1-6. Collector에서의 사용

✅ **적용 완료**: `KlcaCollector`, `NaverPlusStoreCollector`

```typescript
// 기존 코드 (인코딩 직접 처리)
const response = await axios.get(url, { ... })
const html = response.data // 인코딩 문제 가능

// 개선된 코드 (인코딩 자동 처리)
const { html, encoding } = await fetchHtml(url)
ctx.logger.info(`Decoded HTML using encoding: ${encoding}`)
// 이제 html은 항상 UTF-8 문자열
```

📌 **Collector는 인코딩을 "전혀 모름"** → 이게 실무 품질

**의존성 추가**: `iconv-lite` 패키지 설치 필요

---

## 2️⃣ 사이트 타입 분류표 (구조 추가 완료 ✅)

이건 진짜 중요하다. 이걸 안 만들면 Collector가 계속 난립함.

### 2-1. 사이트 타입 정의 (Domain Model)

✅ **구현 완료**: `src/types/site.ts`

```typescript
export type SiteType =
  | 'portal-csr'      // 포털 CSR (네이버, 카카오 등)
  | 'public-board'     // 공공 게시판 (KLCA, 정부 사이트 등)
  | 'shopping'         // 쇼핑몰 (쿠팡, 스토어 등)
  | 'blog'             // 블로그 (티스토리 등)
  | 'static-article'   // 정적 기사 (언론, 협회 등)

export interface SiteConfig {
  sourceName: string
  siteType: SiteType
  encoding?: 'auto' | 'utf-8' | 'euc-kr'
  entryPoints: SiteEntryPoint[]
}
```

### 2-2. 사이트 타입별 "정답 전략" 테이블

✅ **문서화 완료**: `docs/site-strategy-guide.md`

| Site Type | 대표 사이트 | 수집 전략 | 사용 기술 |
|-----------|------------|----------|----------|
| `portal-csr` | 네이버, 카카오 | 내부 API → Playwright fallback | axios, playwright |
| `public-board` | KLCA, 정부 | HTML 게시판 직접 | axios + cheerio + euc-kr |
| `shopping` | 쿠팡, 스토어 | JSON API | axios |
| `blog` | 티스토리 | RSS → HTML | rss-parser |
| `static-article` | 언론, 협회 | SSR HTML | cheerio |

### 2-3. 전략 매핑 코드 (참고용)

✅ **구조 추가 완료**: `src/collectors/strategyMap.ts`

- 현재는 참고용 매핑만 제공
- 향후 전략 패턴 도입 시 사용 예정
- `StrategyMap`: 사이트 타입 → 전략 클래스 매핑
- `StrategyTechStack`: 사이트 타입별 권장 기술 스택

### 2-4. 사이트 정의 (Config 기반)

📝 **예시**: `docs/site-strategy-guide.md` 참고

```typescript
export const KlcaSite: SiteConfig = {
  sourceName: 'klca',
  siteType: 'public-board',
  encoding: 'auto',
  entryPoints: [
    {
      name: 'notice',
      url: 'https://www.klca.or.kr/board/notice/list.do'
    },
    {
      name: 'seminar',
      url: 'https://www.klca.or.kr/board/seminar/list.do'
    }
  ]
}
```

### 2-5. Collector 자동 생성기 (향후 구현 예정)

📝 **현재는 각 Collector가 직접 구현되어 있음**

향후 전략 패턴 도입 시:

```typescript
// collectors/factory.ts
import { StrategyMap } from './strategyMap'

export function createCollector(siteConfig: SiteConfig): BaseCollector {
  const Strategy = StrategyMap[siteConfig.siteType]
  return new Strategy(siteConfig)
}
```

이렇게 하면:
- ✅ Collector 파일 추가 ❌
- ✅ Config 추가 ⭕
- ✅ 전략 재사용 ⭕

---

## 📌 현재 상태 요약

### ✅ 완료된 항목

1. **인코딩 자동 처리 미들웨어**
   - `src/utils/encoding.ts`: 인코딩 판별 로직
   - `src/utils/http.ts`: HTTP 미들웨어
   - `src/types/http.ts`: 타입 정의
   - 기존 Collector 업데이트 완료

2. **사이트 타입 분류표 구조**
   - `src/types/site.ts`: 타입 정의
   - `src/collectors/strategyMap.ts`: 전략 매핑 (참고용)
   - `docs/site-strategy-guide.md`: 가이드 문서

### ⏳ 향후 확장 계획

1. **전략 패턴 도입**
   - 전략별 Collector 클래스 구현
   - Factory 패턴으로 Collector 자동 생성
   - Config 기반 Collector 등록

2. **추가 기술 스택**
   - cheerio: HTML 파싱
   - playwright: 동적 콘텐츠 처리
   - rss-parser: RSS 피드 처리

---

## 🚀 사용 방법

### 새로운 Collector 추가 시

```typescript
import { fetchHtml } from '../../utils'
import type { BaseCollector, ExecutionContext, RawRecord } from '../../types'

export class MyCollector implements BaseCollector {
  readonly sourceName = 'my_source'
  
  readonly policy = {
    timeoutMs: 15_000,
    maxRetries: 2,
  }
  
  async collect(ctx: ExecutionContext): Promise<RawRecord[]> {
    // 인코딩 자동 처리 미들웨어 사용
    const { html, encoding } = await fetchHtml('https://example.com', {
      timeout: 10_000,
    })
    
    ctx.logger.info(`Decoded HTML using encoding: ${encoding}`)
    
    // 이제 html은 항상 UTF-8 문자열
    // 파싱 로직 구현...
    
    return []
  }
}
```

### 인코딩 확인

```typescript
const { html, encoding } = await fetchHtml(url)
console.log(`사용된 인코딩: ${encoding}`) // 'utf-8', 'euc-kr' 등
```

---

## 📚 참고 문서

- `docs/site-strategy-guide.md`: 사이트 타입별 전략 가이드
- `src/utils/http.ts`: HTTP 미들웨어 구현
- `src/utils/encoding.ts`: 인코딩 처리 로직
