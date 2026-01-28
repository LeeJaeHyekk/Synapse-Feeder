📐 Crawling System Architecture (CursorAI Friendly) - 개선된 버전

## 0. 설계 목표 (Cursor가 이해해야 할 핵심 컨셉)

이 시스템은 사이트 타입에 따라 서로 다른 수집 전략(Collector)을 자동 선택하고,
렌더링 / API / HTML 수집을 혼합하여
의미 있는 구조화 데이터만 DB에 저장하는 파이프라인이다.

**핵심 원칙:**
- ✅ 부분 실패 허용: 하나의 Collector 실패가 전체를 중단시키지 않음
- ✅ 타입 안정성: 모든 단계에서 타입 검증 및 스키마 검증
- ✅ 에러 격리: 각 레이어에서 발생한 에러는 해당 레이어에서 처리
- ✅ 리소스 통제: Timeout, Retry, Rate Limit을 명확히 정의
- ✅ 증거 보존: Raw 데이터는 항상 저장 (정규화 실패 시에도)

---

## 1️⃣ 전체 파이프라인 개요 (한 눈에 이해)

```
[Scheduler / Trigger]
        ↓
[Site Config Resolver]
        ↓
[Collector Selector]
        ↓
[Collector 실행]
 (HTML | Render | API)
        ↓
[Raw Storage] ← 증거 보존 (항상 먼저 저장)
        ↓
[Normalizer / Parser] ← 타입 검증 + 스키마 검증
        ↓
[Data Model Validator] ← Zod 스키마 검증
        ↓
[Deduplicator] ← URL + Hash 기반 중복 제거
        ↓
[DB Storage] ← 정규화된 데이터만 저장
        ↓
[Post Process]
 (알림 / 로그 / 통계)
```

**중요한 흐름:**
1. Raw 데이터는 **항상 먼저 저장** (정규화 실패 시에도 증거 보존)
2. 정규화 실패는 해당 Collector만 스킵 (다른 Collector는 계속 진행)
3. 중복 제거는 DB 저장 전에 수행 (메모리 효율성)
4. 각 단계에서 에러 발생 시 명확한 에러 타입과 컨텍스트 제공

---

## 2️⃣ 디렉터리 구조 (CursorAI가 제일 잘 이해하는 형태)

```
src/
 ├─ core/
 │   ├─ scheduler.ts          # 실행 주기 / 트리거
 │   ├─ pipeline.ts           # 전체 흐름 제어
 │   └─ context.ts            # 실행 컨텍스트
 │
 ├─ config/
 │   ├─ sites/
 │   │   ├─ klca.ts
 │   │   └─ *.ts
 │   └─ site-types.ts         # 사이트 타입 정의
 │
 ├─ collectors/
 │   ├─ base/
 │   │   └─ BaseCollector.ts
 │   │
 │   ├─ HtmlCollector.ts
 │   ├─ RenderCollector.ts
 │   ├─ ApiCollector.ts
 │   └─ AuthCollector.ts
 │
 ├─ middleware/
 │   ├─ encoding.ts           # 인코딩 자동 처리
 │   ├─ retry.ts              # Rate Limit / Retry
 │   ├─ timeout.ts            # Collector별 timeout
 │   └─ rateLimiter.ts        # Rate Limit 구현
 │
 ├─ parsers/
 │   ├─ notice.parser.ts
 │   └─ seminar.parser.ts
 │
 ├─ models/
 │   ├─ Notice.ts
 │   └─ BaseModel.ts
 │
 ├─ storage/
 │   ├─ repository.ts
 │   └─ deduplicator.ts       # 중복 제거 로직
 │
 └─ utils/
     ├─ logger.ts
     └─ http.ts
```

**👉 Cursor는 역할 기반 폴더를 가장 잘 추론함**

---

## 3️⃣ Site Config (핵심 중의 핵심) - 개선된 버전

**❗ Cursor가 이 파일만 보면**
"아, 이 사이트는 이렇게 크롤링하면 되는구나"
바로 이해해야 함

### config/sites/klca.ts

```typescript
import { SiteConfig } from '../site-types';

export const KLCA: SiteConfig = {
  siteKey: 'klca',
  baseUrl: 'https://www.klca.or.kr',

  type: 'CSR_API',

  collector: {
    name: 'ApiCollector',
    timeout: 15_000,
    retry: {
      strategy: 'exponential',  // 'exponential' | 'linear' | 'fixed'
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10_000,
    },
    rateLimit: {
      requestsPerSecond: 2,
      minIntervalMs: 500,
    },
  },

  endpoints: {
    notice: {
      url: '/api/notice/list',
      method: 'POST',
      body: { page: 1, size: 20 },
      headers: {
        'Content-Type': 'application/json',
      },
    },
  },

  parser: 'notice.parser',

  model: 'Notice',

  // 에러 처리 전략
  errorHandling: {
    onCollectorFailure: 'skip',  // 'skip' | 'retry' | 'fail'
    onParserFailure: 'skip',
    onNormalizeFailure: 'skip',
  },
};
```

**개선 사항:**
- ✅ Retry 전략을 명확히 정의 (exponential backoff)
- ✅ Rate Limit 정책 명시
- ✅ 에러 처리 전략 명시
- ✅ 타입 안정성 보장

**👉 사이트별 전략은 코드가 아니라 설정으로 결정**

---

## 4️⃣ 사이트 타입 분류표 (전략 결정 테이블) - 개선된 버전

### config/site-types.ts

```typescript
export type SiteType =
  | 'STATIC_HTML'      // 정적 HTML (cheerio)
  | 'CSR_SIMPLE'       // 간단한 CSR (axios + cheerio)
  | 'CSR_API'          // API 기반 CSR (axios)
  | 'PAGINATION'       // 페이지네이션 필요
  | 'SCROLL'           // 무한 스크롤 (Playwright)
  | 'AUTH';            // 인증 필요 (AuthCollector)

export type RetryStrategy = 'exponential' | 'linear' | 'fixed' | 'none';

export interface RetryConfig {
  strategy: RetryStrategy;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs?: number;  // exponential backoff 상한
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  minIntervalMs: number;
}

export interface ErrorHandlingConfig {
  onCollectorFailure: 'skip' | 'retry' | 'fail';
  onParserFailure: 'skip' | 'retry' | 'fail';
  onNormalizeFailure: 'skip' | 'retry' | 'fail';
}

export interface ApiEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;  // 엔드포인트별 타임아웃 (선택)
}

export interface SiteConfig {
  siteKey: string;
  baseUrl: string;
  type: SiteType;

  collector: {
    name: CollectorName;
    timeout: number;  // Collector 전체 실행 타임아웃
    retry: RetryConfig;
    rateLimit?: RateLimitConfig;
  };

  endpoints?: Record<string, ApiEndpoint>;
  parser: string;
  model: string;
  errorHandling: ErrorHandlingConfig;
}
```

**개선 사항:**
- ✅ Retry 전략 타입 명확화
- ✅ Rate Limit 설정 타입 정의
- ✅ 에러 처리 전략 타입 정의
- ✅ 엔드포인트별 타임아웃 지원

**👉 Cursor는 type → collector → 파서 → 모델 흐름을 자연스럽게 연결함**

---

## 5️⃣ Collector 설계 (함수형 + ESM 기준) - 개선된 버전

### BaseCollector

```typescript
export interface CollectorContext {
  site: SiteConfig;
  logger: Logger;
  runId: string;
}

export interface CollectorResult {
  raw: RawRecord[];  // 타입 명확화
  meta: {
    fetchedAt: Date;
    source: string;
    itemCount: number;
    encoding?: string;  // 인코딩 정보 (HTML 수집 시)
  };
}

export interface CollectorError extends Error {
  source: string;
  stage: 'collect' | 'parse' | 'normalize';
  retryable: boolean;
  context?: Record<string, unknown>;
}
```

### ApiCollector 예시 (개선된 버전)

```typescript
import { retry } from '../middleware/retry';
import { rateLimiter } from '../middleware/rateLimiter';
import { isRetryableHttpError } from '../utils/httpRetry';

export const ApiCollector = async (
  ctx: CollectorContext
): Promise<CollectorResult> => {
  const { site, logger } = ctx;
  const endpoint = site.endpoints!.notice;

  // Rate Limit 적용
  const limiter = rateLimiter(site.collector.rateLimit);

  // Retry 전략 적용
  const result = await retry(
    async () => {
      await limiter.wait();  // Rate Limit 대기

      const res = await fetch(site.baseUrl + endpoint.url, {
        method: endpoint.method,
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...endpoint.headers,
        },
        signal: AbortSignal.timeout(endpoint.timeout ?? 10_000),  // 엔드포인트별 타임아웃
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // 타입 검증
      if (!Array.isArray(data.list)) {
        throw new Error('Invalid response format: expected array');
      }

      return data.list.map((item: unknown) => ({
        title: item.title,
        url: item.url,
        date: item.date,
        content: item.content,
      }));
    },
    {
      strategy: site.collector.retry.strategy,
      maxAttempts: site.collector.retry.maxAttempts,
      initialDelayMs: site.collector.retry.initialDelayMs,
      maxDelayMs: site.collector.retry.maxDelayMs,
      retryOn: isRetryableHttpError,
    }
  );

  return {
    raw: result,
    meta: {
      fetchedAt: new Date(),
      source: site.siteKey,
      itemCount: result.length,
    },
  };
};
```

**개선 사항:**
- ✅ Rate Limit 적용
- ✅ Retry 전략 명확화
- ✅ 타입 검증 추가
- ✅ 에러 타입 명확화
- ✅ AbortSignal을 사용한 타임아웃 (표준 API)

**👉 클래스 ❌ / 상태 ❌ / 순수 함수 기반**
**👉 CursorAI가 수정·확장하기 매우 쉬움**

---

## 6️⃣ Middleware 설계 (AI가 개입하기 좋은 지점) - 개선된 버전

### 인코딩 자동 처리

```typescript
export const encodingMiddleware = async (res: Response): Promise<string> => {
  const buffer = await res.arrayBuffer();
  const headers = Object.fromEntries(res.headers.entries());
  
  // 인코딩 자동 판별 및 변환
  const { html, encoding } = decodeHtml(buffer, headers);
  
  return html;  // 항상 UTF-8 문자열 반환
};
```

### Retry 전략 (개선된 버전)

```typescript
export type RetryStrategy = 'exponential' | 'linear' | 'fixed' | 'none';

export interface RetryPolicy {
  strategy: RetryStrategy;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs?: number;
  retryOn: (error: unknown) => boolean;
}

export async function retry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<T> {
  let attempt = 0;
  let delay = policy.initialDelayMs;

  while (attempt < policy.maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      attempt++;

      if (!policy.retryOn(err) || attempt >= policy.maxAttempts) {
        throw err;
      }

      // 전략별 지연 시간 계산
      switch (policy.strategy) {
        case 'exponential':
          delay = Math.min(
            policy.initialDelayMs * Math.pow(2, attempt - 1),
            policy.maxDelayMs ?? Infinity
          );
          break;
        case 'linear':
          delay = policy.initialDelayMs * attempt;
          break;
        case 'fixed':
          delay = policy.initialDelayMs;
          break;
        case 'none':
          throw err;  // 즉시 실패
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retry attempts exceeded');
}
```

### Rate Limiter (추가)

```typescript
export interface RateLimitConfig {
  requestsPerSecond: number;
  minIntervalMs: number;
}

export function rateLimiter(config?: RateLimitConfig) {
  if (!config) {
    return {
      wait: async () => {},  // Rate limit 없음
    };
  }

  let lastRequestTime = 0;
  const minInterval = Math.max(
    config.minIntervalMs,
    1000 / config.requestsPerSecond
  );

  return {
    wait: async () => {
      const now = Date.now();
      const elapsed = now - lastRequestTime;

      if (elapsed < minInterval) {
        await new Promise(resolve =>
          setTimeout(resolve, minInterval - elapsed)
        );
      }

      lastRequestTime = Date.now();
    },
  };
}
```

**개선 사항:**
- ✅ Retry 전략 명확화 (exponential, linear, fixed)
- ✅ Rate Limiter 구현 추가
- ✅ 최대 지연 시간 제한 (exponential backoff)

---

## 7️⃣ Parser & Model (의미 있는 데이터만 남기기) - 개선된 버전

### Parser (타입 안정성 강화)

```typescript
import { z } from 'zod';

// Parser 입력 스키마
const RawNoticeSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  date: z.union([z.string(), z.number(), z.date()]),
  content: z.string().optional(),
});

// Parser 함수
export const parseNotice = (raw: unknown[]): Notice[] => {
  // 타입 검증
  const validated = z.array(RawNoticeSchema).parse(raw);

  return validated.map(item => ({
    id: generateId(item.url),  // URL 기반 ID 생성
    title: item.title.trim(),
    url: item.url,
    publishedAt: parseDate(item.date),
    source: 'klca',
    content: item.content?.trim() ?? '',
  }));
};

// 날짜 파싱 헬퍼
function parseDate(date: string | number | Date): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'number') return new Date(date);
  // 문자열 파싱
  return new Date(date);
}

// ID 생성 헬퍼
function generateId(url: string): string {
  return Buffer.from(url).toString('base64').slice(0, 16);
}
```

### Model (Zod 스키마)

```typescript
import { z } from 'zod';

export const NoticeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(500),
  url: z.string().url(),
  publishedAt: z.date(),
  source: z.string().min(1),
  content: z.string().max(10000).optional(),
});

export type Notice = z.infer<typeof NoticeSchema>;
```

**개선 사항:**
- ✅ Zod를 사용한 타입 검증
- ✅ Parser 단계에서 타입 검증
- ✅ 날짜 파싱 헬퍼 함수
- ✅ ID 생성 로직 명확화

**👉 "content 덩어리" ❌**
**👉 업무 단위 객체 ⭕**

---

## 8️⃣ DB를 쓰는 정확한 위치 (개선된 버전)

```
Parser 결과
   ↓
[타입 검증] ← Zod 스키마 검증
   ↓
[Deduplicator] ← URL + Hash 기반 중복 제거
   ↓
[배치 저장] ← 메모리 효율적 배치 처리
   ↓
DB 저장
```

### Deduplicator 구현

```typescript
export interface DeduplicationStrategy {
  key: (item: Article) => string;  // 중복 판단 키
  hash?: (item: Article) => string;  // 내용 해시 (선택)
}

export class Deduplicator {
  private seen = new Set<string>();

  constructor(private strategy: DeduplicationStrategy) {}

  deduplicate(items: Article[]): Article[] {
    return items.filter(item => {
      const key = this.strategy.key(item);
      const hash = this.strategy.hash?.(item);

      const uniqueKey = hash ? `${key}:${hash}` : key;

      if (this.seen.has(uniqueKey)) {
        return false;  // 중복 제거
      }

      this.seen.add(uniqueKey);
      return true;
    });
  }

  reset(): void {
    this.seen.clear();
  }
}

// 사용 예시
const deduplicator = new Deduplicator({
  key: (item) => item.url,  // URL 기반 중복 판단
  hash: (item) => hashContent(item.content),  // 내용 해시 (선택)
});

const uniqueItems = deduplicator.deduplicate(parsedItems);
```

**개선 사항:**
- ✅ 중복 제거 로직 명확화
- ✅ URL + Hash 기반 중복 판단
- ✅ 메모리 효율적 Set 사용

**👉 DB는 Collector 뒤가 아니라 Parser 뒤**

---

## 9️⃣ 에러 처리 전략 (추가)

### 에러 타입 정의

```typescript
export class CollectorError extends Error {
  constructor(
    public source: string,
    public stage: 'collect' | 'parse' | 'normalize',
    public retryable: boolean,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CollectorError';
  }
}

export class ParserError extends Error {
  constructor(
    public source: string,
    public rawData: unknown,
    message: string
  ) {
    super(message);
    this.name = 'ParserError';
  }
}

export class NormalizeError extends Error {
  constructor(
    public source: string,
    public rawData: unknown,
    public index: number,
    public originalError: unknown
  ) {
    super(`Normalize failed at index ${index}: ${originalError}`);
    this.name = 'NormalizeError';
  }
}
```

### 에러 처리 흐름

```typescript
// Orchestrator에서의 에러 처리
for (const collector of collectors) {
  try {
    const raw = await collector.collect(ctx);
    await rawStorage.save(ctx, collector.sourceName, raw);  // 항상 저장

    try {
      const parsed = await parser.parse(raw);
      const normalized = await normalizer.normalize(parsed);
      const unique = deduplicator.deduplicate(normalized);

      await repository.saveMany(ctx, unique);
    } catch (err) {
      // Parser/Normalize 실패는 해당 Collector만 스킵
      logger.error(`[${collector.sourceName}] Parse/Normalize failed`, err);
      continue;  // 다음 Collector 계속 진행
    }
  } catch (err) {
    // Collector 실패 처리
    if (err instanceof CollectorError && err.retryable) {
      // 재시도 가능한 에러는 재시도
      // (이미 Collector 내부에서 재시도했지만, 추가 재시도 가능)
    }

    logger.error(`[${collector.sourceName}] Collector failed`, err);
    // 실패해도 전체 중단 금지
  }
}
```

**개선 사항:**
- ✅ 에러 타입 명확화
- ✅ 에러 처리 전략 명시
- ✅ 부분 실패 허용

---

## 🔟 타임아웃 계층 구조 (명확화)

```
Collector timeout (최상위, 예: 15초)
 └─ Endpoint timeout (중간, 예: 10초)
     └─ Network timeout (내부, 예: 5초)
```

**원칙:**
- Collector timeout > Endpoint timeout > Network timeout
- 각 레벨에서 더 짧은 타임아웃 사용
- 무한 대기 방지

**예시:**
```typescript
// Collector timeout: 15초
const collectorTimeout = 15_000;

// Endpoint timeout: 10초
const endpointTimeout = 10_000;

// Network timeout: 5초
const networkTimeout = 5_000;

// 사용
const result = await withTimeout(
  fetch(url, {
    signal: AbortSignal.timeout(networkTimeout),
  }),
  endpointTimeout
);
```

---

## 1️⃣1️⃣ CursorAI에게 이 설계를 이해시키는 팁

ARCHITECTURE.md에 이 문구를 꼭 써라 👇

"Collector는 사이트 타입에 따라 선택되며,
새로운 사이트 추가 시 config + parser만 작성하면 된다.
에러는 각 레이어에서 격리 처리되며, 부분 실패가 전체를 중단시키지 않는다."

Cursor에게 이렇게 요청하면 정확히 따라옴

이 아키텍처를 기준으로
- 새로운 사이트 config 추가
- ApiCollector 확장
- parser 작성
- 에러 처리 전략 수정

---

## 🔚 한 줄 요약 (Cursor용)

이 시스템은
'사이트 타입 → Collector → Raw Storage → Parser → Normalizer → Deduplicator → DB'
로 이어지는 데이터 파이프라인이며,
각 단계에서 타입 검증, 에러 격리, 리소스 통제가 이루어진다.

---

## 📋 주요 개선 사항 요약

1. ✅ **타입 안정성 강화**: Zod 스키마 검증, 타입 가드 추가
2. ✅ **에러 처리 전략 명확화**: 에러 타입 정의, 처리 전략 명시
3. ✅ **중복 제거 로직 추가**: Deduplicator 구현
4. ✅ **Rate Limit 구현**: Rate Limiter 미들웨어 추가
5. ✅ **Retry 전략 개선**: Exponential backoff, 최대 지연 시간 제한
6. ✅ **타임아웃 계층 구조 명확화**: Collector > Endpoint > Network
7. ✅ **검증 단계 추가**: Parser 단계에서 타입 검증
8. ✅ **메모리 효율성**: 배치 처리, Set 기반 중복 제거
9. ✅ **로깅 전략**: 각 단계에서 명확한 로깅
10. ✅ **부분 실패 허용**: 하나의 Collector 실패가 전체를 중단시키지 않음
