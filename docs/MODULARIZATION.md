# 모듈화 가이드

## 개요

프로젝트의 중복 코드를 제거하고 기능별로 모듈화하여 유지보수성을 향상시킵니다.

## 모듈화 원칙

1. **DRY (Don't Repeat Yourself)**: 중복 코드 제거
2. **단일 책임 원칙**: 각 모듈은 하나의 책임만 가짐
3. **재사용성**: 공통 로직은 재사용 가능한 모듈로 추출
4. **일관성**: 동일한 패턴을 일관되게 적용

## 주요 모듈화 개선사항

### 1. Collector 공통 기능 추출

#### BaseWebCollector
- HTML 수집 공통 로직 통합
- retry 로직 통합
- fetchHtml 호출 통합
- 공통 정책 적용

#### BaseApiCollector
- API 수집 공통 로직 통합
- retry 로직 통합
- axios 호출 통합
- 공통 정책 적용

#### 개선 효과
- **중복 코드 제거**: 각 Collector에서 반복되던 retry, fetchHtml 로직 제거
- **일관성 향상**: 모든 Collector가 동일한 패턴 사용
- **유지보수성 향상**: 공통 로직 수정 시 한 곳만 수정

### 2. HTML 파싱 유틸리티 모듈화

#### htmlParser.ts
- `extractTitle()`: HTML에서 title 추출
- `extractMatches()`: 정규식으로 매칭된 텍스트 추출
- `createRawRecord()`: RawRecord 생성 헬퍼
- `createRawRecords()`: 여러 RawRecord 일괄 생성

#### 개선 효과
- **중복 코드 제거**: HTML 파싱 로직 통합
- **재사용성 향상**: 다른 Collector에서도 사용 가능
- **테스트 용이성**: 유틸리티 함수 단위 테스트 가능

### 3. Factory 패턴 통일

모든 Factory는 동일한 패턴을 따릅니다:

```typescript
// storage/raw/factory.ts
export function createRawStorage(baseDir?: string): RawStorage {
  return new FileRawStorage(baseDir)
}

// storage/repository/factory.ts
export function createArticleRepository(dbPath: string): ArticleRepository {
  const db = createDatabase(dbPath)
  return new SQLiteArticleRepository(db)
}

// notifier/factory.ts
export function createNotifier(token: string, channel: string): Notifier {
  return new SlackNotifier(token, channel)
}
```

### 4. Index 파일 Export 패턴 통일

모든 index.ts 파일은 다음 패턴을 따릅니다:

```typescript
// 타입 export
export type { TypeA, TypeB } from './types'

// 함수/클래스 export
export { FunctionA, ClassB } from './module'

// 모든 export
export * from './utils'
```

## 모듈 구조

```
src/
├── collectors/
│   ├── base/                    # Base 클래스
│   │   ├── BaseWebCollector.ts
│   │   ├── BaseApiCollector.ts
│   │   └── index.ts
│   ├── utils/                   # 유틸리티
│   │   ├── htmlParser.ts
│   │   └── index.ts
│   ├── web/                     # Web Collector 구현
│   ├── api/                     # API Collector 구현
│   └── index.ts                 # 통합 export
```

## 사용 예시

### 새로운 Web Collector 추가

```typescript
import { BaseWebCollector } from '../base/BaseWebCollector'
import { extractTitle, createRawRecord } from '../utils/htmlParser'

export class MyWebCollector extends BaseWebCollector {
  readonly sourceName = 'my_source'
  readonly policy = { timeoutMs: 10_000, maxRetries: 2 }

  protected getUrl(): string {
    return 'https://example.com'
  }

  protected parseHtml(html: string, ctx: ExecutionContext): RawRecord[] {
    const title = extractTitle(html, 'Default Title')
    return [createRawRecord(this.sourceName, title, this.getUrl(), html)]
  }
}
```

### 새로운 API Collector 추가

```typescript
import { BaseApiCollector } from '../base/BaseApiCollector'

export class MyApiCollector extends BaseApiCollector {
  readonly sourceName = 'my_api'
  readonly policy = { timeoutMs: 5_000, maxRetries: 3 }

  protected getRequestConfig(): AxiosRequestConfig {
    return {
      url: 'https://api.example.com/data',
      method: 'GET',
    }
  }

  protected parseResponse(data: unknown, ctx: ExecutionContext): RawRecord[] {
    return (data as { items: RawRecord[] }).items ?? []
  }
}
```

## 개선 효과

### 코드 중복 제거
- **Before**: 각 Collector마다 retry, fetchHtml 로직 반복 (약 30줄씩)
- **After**: Base 클래스로 통합 (각 Collector 약 10줄)

### 유지보수성 향상
- 공통 로직 수정 시 한 곳만 수정
- 새로운 Collector 추가 시 최소한의 코드 작성

### 테스트 용이성
- Base 클래스 단위 테스트 가능
- 유틸리티 함수 단위 테스트 가능

## 향후 개선 계획

1. **Parser 모듈화**: HTML 파싱 로직을 더 세분화
2. **Validator 모듈화**: 데이터 검증 로직 통합
3. **Config 모듈화**: 설정 관리 로직 통합
