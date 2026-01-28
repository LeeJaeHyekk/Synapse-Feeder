# 경로 최적화 및 타입 가드 가이드

## 개요

프로젝트의 안정성과 유지보수성을 높이기 위해 경로 최적화와 타입 가드를 추가했습니다.

## 1. 경로 최적화

### 원칙

모든 모듈은 `index.ts`를 통해 export하여 깔끔한 import 경로를 제공합니다.

### 구조

```
src/
├── types/
│   ├── index.ts          # 모든 타입 통합 export
│   └── guards.ts         # 타입 가드 함수들
├── collectors/
│   ├── index.ts          # Collector 타입 및 registry export
│   └── registry.ts       # Collector 등록 로직
├── normalizers/
│   ├── index.ts          # Normalizer 함수 및 타입 export
│   └── utils/
│       └── index.ts      # 유틸리티 함수 export
├── storage/
│   ├── raw/
│   │   ├── index.ts      # RawStorage 타입 및 factory export
│   │   └── factory.ts    # RawStorage 생성 로직
│   └── repository/
│       ├── index.ts      # Repository 타입 및 factory export
│       └── factory.ts    # Repository 생성 로직
└── ...
```

### 사용 예시

#### Before (직접 경로)
```typescript
import type { ExecutionContext } from '../types/ExecutionContext'
import type { Article } from '../normalizers/schemas/Article.schema'
import type { RawRecord } from '../types/Collector'
import { retry } from '../utils/retry'
import { isRetryableHttpError } from '../utils/httpRetry'
```

#### After (최적화된 경로)
```typescript
import type { ExecutionContext, Article, RawRecord } from '../types'
import { retry, isRetryableHttpError } from '../utils'
```

### 장점

1. **가독성 향상**: import 문이 간결해짐
2. **유지보수성**: 파일 구조 변경 시 한 곳만 수정
3. **일관성**: 모든 모듈이 동일한 패턴 사용
4. **재사용성**: 타입과 함수를 쉽게 찾아 사용

## 2. 타입 가드 (Type Guards)

### 목적

런타임 타입 검증을 통해 타입 안전성을 확보하고, 잘못된 데이터로 인한 런타임 에러를 방지합니다.

### 구현된 타입 가드

#### 기본 타입 가드

```typescript
// src/types/guards.ts

// RawRecord 검증
isRawRecord(value: unknown): value is RawRecord
isRawRecordArray(value: unknown): value is RawRecord[]

// Article 검증
isArticle(value: unknown): value is Article
isArticleArray(value: unknown): value is Article[]

// ExecutionContext 검증
isExecutionContext(value: unknown): value is ExecutionContext

// 기본 타입 검증
isString(value: unknown): value is string
isNonEmptyString(value: unknown): value is string
isNumber(value: unknown): value is number
isPositiveNumber(value: unknown): value is number
isUrl(value: unknown): value is string
isDate(value: unknown): value is Date
```

### 사용 예시

#### Collector에서 Raw 데이터 검증
```typescript
// src/app.ts
const raw = await collector.collect(ctx)

// 타입 가드로 검증
if (!isRawRecordArray(raw)) {
  throw new Error(`Invalid raw data format from ${collector.sourceName}`)
}
```

#### Normalizer에서 입력 검증
```typescript
// src/normalizers/article.normalizer.ts
export function normalizeArticles(
  ctx: ExecutionContext,
  sourceName: string,
  rawList: RawRecord[]
): Article[] {
  // 타입 가드: 입력 데이터 검증
  if (!isRawRecordArray(rawList)) {
    throw new NormalizeError(sourceName, rawList, -1, new Error('Invalid raw data format'))
  }
  // ...
}
```

#### Repository에서 Article 검증
```typescript
// src/storage/repository/SQLiteArticleRepository.ts
async saveMany(ctx: ExecutionContext, articles: Article[]): Promise<void> {
  // 타입 가드: Article 배열 검증
  if (!isArticleArray(articles)) {
    ctx.logger.error('Invalid article data format', undefined, {
      count: articles.length,
    })
    throw new Error('Invalid article data format')
  }
  // ...
}
```

#### Formatter에서 Article 검증
```typescript
// src/formatter/formatReport.ts
export function formatDailyReport(
  ctx: ExecutionContext,
  executionResult: ExecutionResult,
  articles: Article[]
): string {
  // 타입 가드: Article 배열 검증
  if (!isArticleArray(articles)) {
    ctx.logger.warn('Invalid article data format in formatter', {
      count: articles.length,
    })
    return '⚠️ Invalid article data format'
  }
  // ...
}
```

### 타입 가드 적용 위치

1. **Collector → Raw Storage**: Raw 데이터 검증
2. **Raw Storage → Normalizer**: Raw 배열 검증
3. **Normalizer → Repository**: Article 배열 검증
4. **Repository → Formatter**: Article 배열 검증

각 레이어 경계에서 타입 가드를 적용하여 데이터 무결성을 보장합니다.

## 3. 안정성 향상 효과

### Before (타입 가드 없음)

```typescript
// 런타임 에러 가능성
const articles = normalizeArticles(ctx, source, raw)
await repository.saveMany(ctx, articles) // articles가 잘못된 형식일 수 있음
```

### After (타입 가드 적용)

```typescript
// 런타임 검증으로 안전성 확보
const raw = await collector.collect(ctx)
if (!isRawRecordArray(raw)) {
  throw new Error('Invalid raw data')
}

const articles = normalizeArticles(ctx, source, raw)
if (!isArticleArray(articles)) {
  throw new Error('Invalid article data')
}

await repository.saveMany(ctx, articles) // 안전하게 저장
```

### 장점

1. **조기 에러 감지**: 잘못된 데이터가 파이프라인 깊숙이 전파되기 전에 발견
2. **명확한 에러 메시지**: 어느 단계에서 문제가 발생했는지 명확히 알 수 있음
3. **타입 안전성**: TypeScript 컴파일 타임 + 런타임 검증으로 이중 보호
4. **디버깅 용이**: 문제 발생 지점을 빠르게 파악 가능

## 4. 모듈 구조

### types/index.ts

```typescript
// 모든 타입 정의 재export
export type { Article } from './Article'
export type { ExecutionContext } from './ExecutionContext'
export type { BaseCollector, CollectorPolicy, RawRecord } from './Collector'
export { ExecutionResult, type CollectorResult } from './ExecutionResult'

// 타입 가드 함수들 export
export * from './guards'
```

### 사용법

```typescript
// 한 번의 import로 모든 타입과 가드 사용 가능
import type { ExecutionContext, Article, RawRecord } from '../types'
import { isRawRecordArray, isArticleArray } from '../types'
```

## 5. 모범 사례

### 1. 항상 타입 가드 사용

레이어 경계에서 데이터를 전달할 때 타입 가드를 사용하세요.

```typescript
// ✅ Good
if (!isRawRecordArray(data)) {
  throw new Error('Invalid data')
}

// ❌ Bad
const data = someFunction() // 타입 검증 없이 사용
```

### 2. 명확한 에러 메시지

타입 가드 실패 시 명확한 에러 메시지를 제공하세요.

```typescript
if (!isArticleArray(articles)) {
  ctx.logger.error('Invalid article data format', undefined, {
    count: articles.length,
    source: sourceName,
  })
  throw new Error(`Invalid article data format for source: ${sourceName}`)
}
```

### 3. index.ts를 통한 export

모든 모듈은 `index.ts`를 통해 export하여 깔끔한 import 경로를 제공하세요.

```typescript
// ✅ Good
export { normalizeArticles } from './article.normalizer'
export * from './utils'

// ❌ Bad
// 직접 파일 경로로 import
```

## 6. 마이그레이션 가이드

기존 코드를 최적화된 경로로 마이그레이션하려면:

1. `index.ts` 파일 확인
2. 직접 경로 import를 `index.ts`를 통한 import로 변경
3. 타입 가드 추가 (필요한 경우)
4. 테스트 실행

## 결론

경로 최적화와 타입 가드를 통해:
- ✅ 코드 가독성 향상
- ✅ 타입 안전성 확보
- ✅ 런타임 에러 방지
- ✅ 유지보수성 향상

이제 프로젝트는 더욱 안정적이고 유지보수하기 쉬운 구조가 되었습니다.
