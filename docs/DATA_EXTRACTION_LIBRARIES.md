# 고품질 데이터 추출 라이브러리 가이드

## 개요

웹 크롤링에서 본문, 제목, 작성자 등 핵심 콘텐츠를 정확하게 추출하는 전문 라이브러리들입니다.

---

## 1. @mozilla/readability (추천 ⭐⭐⭐⭐⭐)

**Mozilla의 Reader View 알고리즘**

### 특징
- ✅ Firefox의 Reader View와 동일한 알고리즘
- ✅ TypeScript 지원
- ✅ 의존성 없음 (zero dependencies)
- ✅ 활발히 유지보수됨
- ✅ 메타데이터 추출 (제목, 작성자, 날짜 등)

### 설치
```bash
npm install @mozilla/readability jsdom
```

### 사용 예시
```typescript
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

const dom = new JSDOM(html, { url: baseUrl })
const reader = new Readability(dom.window.document)
const article = reader.parse()

// 결과:
// {
//   title: "제목",
//   byline: "작성자",
//   content: "본문 HTML",
//   textContent: "본문 텍스트",
//   excerpt: "요약",
//   siteName: "사이트명"
// }
```

### 장점
- 매우 정확한 본문 추출
- 광고, 사이드바 등 불필요한 요소 자동 제거
- 메타데이터 자동 추출

### 단점
- JSDOM 필요 (메모리 사용량 큼)
- Cheerio와 직접 호환 안 됨

---

## 2. cheer-reader (Cheerio 사용 시 추천 ⭐⭐⭐⭐)

**Cheerio 호환 Readability 포트**

### 특징
- ✅ Cheerio 기반 (기존 코드와 호환)
- ✅ 원본보다 6-8배 빠름
- ✅ 메모리 사용량 적음
- ✅ Node.js, Deno, Bun 모두 지원

### 설치
```bash
npm install cheer-reader cheerio
```

### 사용 예시
```typescript
import * as cheerio from 'cheerio'
import { Readability } from 'cheer-reader'

const $ = cheerio.load(html)
const reader = new Readability($)
const article = reader.parse()

// 결과:
// {
//   title: "제목",
//   content: "본문 HTML",
//   textContent: "본문 텍스트",
//   excerpt: "요약"
// }
```

### 장점
- 기존 Cheerio 코드와 완벽 호환
- 빠른 성능
- 낮은 메모리 사용

---

## 3. @scrapmd/mercury-parser (고급 기능 ⭐⭐⭐⭐)

**Postlight의 Mercury Parser**

### 특징
- ✅ 제목, 작성자, 날짜, 본문, 이미지 추출
- ✅ 커스텀 파서 지원 (도메인별 특화)
- ✅ JavaScript/CSS 셀렉터로 확장 가능
- ✅ AMP 변환 지원

### 설치
```bash
npm install @scrapmd/mercury-parser
```

### 사용 예시
```typescript
import { parse } from '@scrapmd/mercury-parser'

const result = await parse(url, {
  html: html, // 또는 URL만 전달
  contentType: 'html'
})

// 결과:
// {
//   title: "제목",
//   author: "작성자",
//   date_published: "2024-01-01",
//   content: "본문 HTML",
//   excerpt: "요약",
//   lead_image_url: "이미지 URL",
//   dek: "부제목"
// }
```

### 장점
- 매우 정확한 메타데이터 추출
- 커스텀 파서로 특정 사이트 최적화 가능
- 이미지, 비디오 등 미디어 추출

### 단점
- 상대적으로 무거움
- 일부 사이트는 커스텀 파서 필요

---

## 4. Crawlee (종합 솔루션 ⭐⭐⭐⭐⭐)

**프로덕션급 웹 크롤링 프레임워크**

### 특징
- ✅ HTTP + 브라우저 크롤링 통합
- ✅ 자동 본문 추출 (Readability 통합)
- ✅ 프록시 로테이션, 세션 관리
- ✅ TypeScript 완전 지원
- ✅ Playwright, Puppeteer, Cheerio 지원

### 설치
```bash
npm install crawlee playwright
```

### 사용 예시
```typescript
import { CheerioCrawler } from 'crawlee'

const crawler = new CheerioCrawler({
  async requestHandler({ request, $, body }) {
    // 자동으로 본문 추출
    const title = $('title').text()
    const content = $('article, .content').text()
    
    // 또는 Readability 사용
    // const article = extractMainContent($)
  }
})

await crawler.run(['https://example.com'])
```

### 장점
- 프로덕션 환경에 최적화
- 자동 재시도, 에러 처리
- 확장성 (분산 크롤링)

### 단점
- 학습 곡선 있음
- 작은 프로젝트에는 과할 수 있음

---

## 비교표

| 라이브러리 | 속도 | 정확도 | 메모리 | Cheerio 호환 | 메타데이터 | 커스터마이징 |
|-----------|------|--------|--------|-------------|-----------|------------|
| @mozilla/readability | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ❌ | ⭐⭐⭐⭐ | ⭐⭐ |
| cheer-reader | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐ | ⭐⭐ |
| mercury-parser | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Crawlee | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 추천 사용 시나리오

### 1. 기존 Cheerio 코드 유지하면서 개선
→ **cheer-reader** 사용

### 2. 최고 정확도가 필요한 경우
→ **@mozilla/readability** 또는 **mercury-parser**

### 3. 프로덕션 환경, 대규모 크롤링
→ **Crawlee**

### 4. 특정 사이트 최적화 필요
→ **mercury-parser** (커스텀 파서)

---

## 현재 프로젝트 통합 예시

### 옵션 1: cheer-reader 통합 (가장 쉬움)

```typescript
// src/collectors/utils/contentExtractor.ts
import * as cheerio from 'cheerio'
import { Readability } from 'cheer-reader'

export function extractMainContent(html: string, baseUrl: string) {
  const $ = cheerio.load(html)
  const reader = new Readability($)
  const article = reader.parse()
  
  return {
    title: article.title,
    content: article.textContent || article.content,
    excerpt: article.excerpt,
  }
}
```

### 옵션 2: @mozilla/readability 통합

```typescript
// src/collectors/utils/contentExtractor.ts
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export function extractMainContent(html: string, baseUrl: string) {
  const dom = new JSDOM(html, { url: baseUrl })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()
  
  return {
    title: article?.title,
    author: article?.byline,
    content: article?.textContent || article?.content,
    excerpt: article?.excerpt,
  }
}
```

---

## 결론

현재 프로젝트에는 **cheer-reader**가 가장 적합합니다:
- ✅ 기존 Cheerio 코드와 완벽 호환
- ✅ 빠른 성능
- ✅ 낮은 메모리 사용
- ✅ 쉬운 통합

더 높은 정확도가 필요하면 **@mozilla/readability** 또는 **mercury-parser**를 고려하세요.
