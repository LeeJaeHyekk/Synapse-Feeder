# 외부 라이브러리 기반 기능 고도화 분석

## 📋 개요

현재 프로젝트에서 외부 라이브러리를 도입하여 기능을 고도화할 수 있는 영역을 분석한 문서입니다.

---

## 🎯 개선 가능 영역 분석

### 1. HTML 파싱 (🔴 높은 우선순위)

**현재 상태:**
- 정규식 기반 HTML 파싱 (`htmlParser.ts`)
- 복잡한 HTML 구조 파싱 어려움
- 중첩된 태그나 동적 속성 처리 제한적

**개선 방안: `cheerio` 도입**

```typescript
// 현재 (정규식)
const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

// 개선 후 (cheerio)
import * as cheerio from 'cheerio'
const $ = cheerio.load(html)
const title = $('title').text()
```

**장점:**
- ✅ jQuery와 유사한 API로 직관적
- ✅ 복잡한 선택자 지원 (`.class`, `#id`, `[attr]`)
- ✅ 중첩된 구조 파싱 용이
- ✅ 서버 사이드 DOM 조작 가능

**추가 패키지:**
```json
{
  "dependencies": {
    "cheerio": "^1.0.0-rc.12"
  },
  "devDependencies": {
    "@types/cheerio": "^0.22.31"
  }
}
```

**예상 영향:**
- `src/collectors/utils/htmlParser.ts` 리팩토링
- 모든 Web Collector의 파싱 로직 개선
- 더 정확한 데이터 추출 가능

---

### 2. Retry 로직 (🟡 중간 우선순위)

**현재 상태:**
- 커스텀 retry 구현 (`src/utils/retry.ts`)
- 기본적인 exponential/linear/fixed 전략 지원
- 검증된 라이브러리 대비 기능 제한적

**개선 방안: `p-retry` 도입**

```typescript
// 현재 (커스텀)
await retry(fn, {
  retries: 3,
  backoffMs: 1000,
  strategy: 'exponential',
})

// 개선 후 (p-retry)
import pRetry from 'p-retry'

await pRetry(fn, {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 10000,
  factor: 2, // exponential
  onFailedAttempt: (error) => {
    ctx.logger.warn(`Retry attempt ${error.attemptNumber}`, { error })
  }
})
```

**장점:**
- ✅ 검증된 라이브러리 (수백만 다운로드/주)
- ✅ 더 많은 옵션 (randomize, onFailedAttempt 등)
- ✅ TypeScript 완벽 지원
- ✅ 에러 핸들링 개선

**추가 패키지:**
```json
{
  "dependencies": {
    "p-retry": "^6.2.0"
  }
}
```

**예상 영향:**
- `src/utils/retry.ts` 교체 또는 래핑
- `BaseWebCollector`, `BaseApiCollector`에서 사용

---

### 3. Rate Limiting (🟡 중간 우선순위)

**현재 상태:**
- 커스텀 RateLimiter 구현 (`src/utils/rateLimiter.ts`)
- 기본적인 requestsPerSecond 제한
- 메모리 기반 (프로세스 재시작 시 초기화)

**개선 방안: `bottleneck` 또는 `p-limit` 도입**

```typescript
// 현재 (커스텀)
const limiter = new RateLimiter({
  requestsPerSecond: 3,
  minIntervalMs: 1000,
})
await limiter.waitIfNeeded()

// 개선 후 (bottleneck)
import Bottleneck from 'bottleneck'

const limiter = new Bottleneck({
  minTime: 1000 / 3, // 333ms between requests
  maxConcurrent: 1,
})

await limiter.schedule(() => fetchHtml(url))
```

**장점:**
- ✅ 더 정교한 제어 (priority, weight 등)
- ✅ 클러스터 모드 지원 (Redis 기반)
- ✅ 통계 및 모니터링 기능
- ✅ 동적 rate limit 조정

**추가 패키지:**
```json
{
  "dependencies": {
    "bottleneck": "^2.19.5"
  }
}
```

**대안: `p-limit` (더 가벼움)**
```typescript
import pLimit from 'p-limit'

const limit = pLimit(3) // 동시 3개만 실행
await Promise.all(urls.map(url => limit(() => fetchHtml(url))))
```

---

### 4. HTTP Retry (🟢 낮은 우선순위)

**현재 상태:**
- axios 직접 사용
- 커스텀 retry 로직으로 래핑

**개선 방안: `axios-retry` 도입**

```typescript
// 현재
await retry(() => axios.get(url), { retries: 3 })

// 개선 후
import axiosRetry from 'axios-retry'

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error)
  }
})

await axios.get(url) // 자동 retry
```

**장점:**
- ✅ axios와 완벽 통합
- ✅ 네트워크 에러 자동 감지
- ✅ 설정 간소화

**추가 패키지:**
```json
{
  "dependencies": {
    "axios-retry": "^0.0.7"
  }
}
```

---

### 5. 로깅 (🟡 중간 우선순위)

**현재 상태:**
- 커스텀 ConsoleLogger (`src/logger/index.ts`)
- 기본적인 info/error/warn 레벨
- 파일 출력, 로테이션 등 부재

**개선 방안: `pino` 또는 `winston` 도입**

```typescript
// 현재
ctx.logger.info('Message', { meta })

// 개선 후 (pino - 성능 우수)
import pino from 'pino'

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

logger.info({ source: 'klca', count: 5 }, 'Collected items')
```

**장점:**
- ✅ 구조화된 로깅 (JSON)
- ✅ 파일 출력 및 로테이션
- ✅ 성능 최적화 (pino는 매우 빠름)
- ✅ 프로덕션 레벨 기능

**추가 패키지:**
```json
{
  "dependencies": {
    "pino": "^8.15.0",
    "pino-pretty": "^10.2.0"
  }
}
```

**대안: `winston` (더 많은 기능)**
- 다양한 transport (파일, DB, Slack 등)
- 로그 포맷팅 유연
- 성능은 pino보다 낮음

---

### 6. RSS 파싱 (🟢 낮은 우선순위)

**현재 상태:**
- RSS 지원 없음
- `addAlgorism.md`에서 언급됨

**개선 방안: `rss-parser` 도입**

```typescript
import Parser from 'rss-parser'

const parser = new Parser()
const feed = await parser.parseURL('https://example.com/rss')

feed.items.forEach(item => {
  // item.title, item.link, item.pubDate 등
})
```

**장점:**
- ✅ RSS/Atom 피드 지원
- ✅ 블로그 크롤링 용이
- ✅ 표준 포맷 처리

**추가 패키지:**
```json
{
  "dependencies": {
    "rss-parser": "^3.13.0"
  }
}
```

---

### 7. 동적 콘텐츠 렌더링 (🟢 낮은 우선순위)

**현재 상태:**
- 정적 HTML만 수집
- JavaScript 렌더링 불가

**개선 방안: `playwright` 도입**

```typescript
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('https://example.com')
const html = await page.content()
await browser.close()
```

**장점:**
- ✅ JavaScript 실행 가능
- ✅ SPA 크롤링 가능
- ✅ 스크린샷, PDF 생성 등

**단점:**
- ⚠️ 리소스 사용량 큼 (메모리, CPU)
- ⚠️ 실행 시간 증가
- ⚠️ 헤드리스 브라우저 필요

**추가 패키지:**
```json
{
  "dependencies": {
    "playwright": "^1.40.0"
  }
}
```

**권장사항:**
- 필요한 경우에만 사용
- Collector별로 선택적 사용
- 타임아웃 충분히 설정

---

### 8. URL 파싱/정규화 (🟢 낮은 우선순위)

**현재 상태:**
- Node.js 내장 `url` 모듈 사용
- 상대 URL 처리 제한적

**개선 방안: `normalize-url` 도입**

```typescript
import normalizeUrl from 'normalize-url'

const normalized = normalizeUrl('https://example.com/path?query=1#hash', {
  stripWWW: true,
  removeTrailingSlash: true,
})
```

**장점:**
- ✅ URL 정규화
- ✅ 중복 URL 감지 개선
- ✅ 상대 URL 절대 URL 변환

**추가 패키지:**
```json
{
  "dependencies": {
    "normalize-url": "^7.0.1"
  }
}
```

---

### 9. 캐싱 (🟢 낮은 우선순위)

**현재 상태:**
- 캐싱 없음
- 매번 새로 수집

**개선 방안: `node-cache` 도입**

```typescript
import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 3600 }) // 1시간

const cached = cache.get(url)
if (cached) return cached

const data = await fetchHtml(url)
cache.set(url, data)
return data
```

**장점:**
- ✅ 중복 요청 방지
- ✅ 네트워크 비용 절감
- ✅ 응답 시간 개선

**단점:**
- ⚠️ 실시간성 저하
- ⚠️ 메모리 사용 증가

**추가 패키지:**
```json
{
  "dependencies": {
    "node-cache": "^5.1.2"
  }
}
```

**권장사항:**
- 선택적 사용 (설정으로 활성화/비활성화)
- TTL 적절히 설정
- 프로덕션에서는 Redis 고려

---

### 10. 에러 추적 (선택사항)

**현재 상태:**
- 로컬 로깅만
- 에러 추적 서비스 없음

**개선 방안: `@sentry/node` 도입**

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

try {
  await collector.collect(ctx)
} catch (error) {
  Sentry.captureException(error, {
    tags: { source: collector.sourceName },
    extra: { ctx }
  })
}
```

**장점:**
- ✅ 프로덕션 에러 추적
- ✅ 알림 및 대시보드
- ✅ 스택 트레이스 분석

**단점:**
- ⚠️ 외부 서비스 의존
- ⚠️ 비용 발생 가능

**추가 패키지:**
```json
{
  "dependencies": {
    "@sentry/node": "^7.80.0"
  }
}
```

---

## 📊 우선순위 요약

| 우선순위 | 라이브러리 | 이유 | 예상 효과 |
|---------|-----------|------|----------|
| 🔴 높음 | `cheerio` | HTML 파싱 정확도 대폭 향상 | ⭐⭐⭐⭐⭐ |
| 🟡 중간 | `p-retry` | 검증된 retry 로직, 안정성 향상 | ⭐⭐⭐⭐ |
| 🟡 중간 | `bottleneck` | Rate limiting 고도화 | ⭐⭐⭐ |
| 🟡 중간 | `pino` | 프로덕션 레벨 로깅 | ⭐⭐⭐ |
| 🟢 낮음 | `axios-retry` | HTTP retry 간소화 | ⭐⭐ |
| 🟢 낮음 | `rss-parser` | RSS 피드 지원 | ⭐⭐ |
| 🟢 낮음 | `playwright` | 동적 콘텐츠 지원 | ⭐⭐⭐ (리소스 비용 ⚠️) |
| 🟢 낮음 | `normalize-url` | URL 정규화 | ⭐ |
| 🟢 낮음 | `node-cache` | 캐싱 (선택적) | ⭐⭐ |

---

## 🚀 구현 권장 순서

### Phase 1: 핵심 개선 (즉시)
1. **cheerio 도입** - HTML 파싱 정확도 향상
2. **p-retry 도입** - Retry 로직 안정화

### Phase 2: 안정성 향상 (단기)
3. **bottleneck 도입** - Rate limiting 고도화
4. **pino 도입** - 로깅 개선

### Phase 3: 기능 확장 (중기)
5. **rss-parser 도입** - RSS 피드 지원
6. **playwright 도입** - 동적 콘텐츠 지원 (필요시)

### Phase 4: 최적화 (장기)
7. **node-cache 도입** - 캐싱 (선택적)
8. **@sentry/node 도입** - 에러 추적 (선택적)

---

## ⚠️ 주의사항

1. **의존성 증가**: 각 라이브러리는 번들 크기와 설치 시간 증가
2. **학습 곡선**: 팀원들이 새로운 API 학습 필요
3. **유지보수**: 외부 라이브러리 업데이트 및 보안 패치 관리
4. **설계 원칙 준수**: 기존 설계 원칙 (Hard Boundary, Contract-First 등) 유지

---

## 📝 결론

현재 프로젝트는 잘 구조화되어 있으나, 다음 영역에서 외부 라이브러리 도입으로 큰 개선 효과를 기대할 수 있습니다:

1. **HTML 파싱**: `cheerio` 도입으로 정확도 대폭 향상
2. **Retry 로직**: `p-retry`로 안정성 향상
3. **Rate Limiting**: `bottleneck`으로 고도화
4. **로깅**: `pino`로 프로덕션 레벨 로깅

이러한 개선은 점진적으로 진행하며, 각 단계에서 테스트와 검증을 거치는 것을 권장합니다.
