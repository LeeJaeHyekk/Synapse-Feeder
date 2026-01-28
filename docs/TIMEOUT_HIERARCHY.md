# 타임아웃 계층 구조 가이드

## 개요

타임아웃은 여러 레벨에서 적용되며, 각 레벨은 상위 레벨보다 짧은 타임아웃을 가져야 합니다.

## 계층 구조

```
Collector timeout (최상위, 예: 15초)
 └─ Endpoint timeout (중간, 예: 10초)
     └─ Network timeout (내부, 예: 5초)
```

## 원칙

1. **계층적 타임아웃**: 상위 레벨 > 하위 레벨
2. **무한 대기 방지**: 각 레벨에서 더 짧은 타임아웃 사용
3. **명시적 설정**: 모든 타임아웃은 명시적으로 설정

## 권장 타임아웃 기준표

| 유형 | Collector Timeout | Endpoint Timeout | Network Timeout |
|------|------------------|------------------|-----------------|
| 공공 API | 5초 | 3초 | 2초 |
| 내부 API | 3초 | 2초 | 1초 |
| 정적 HTML | 8초 | 5초 | 3초 |
| 로그인 필요 | 15초 | 10초 | 5초 |
| Playwright | 30초 | 20초 | 10초 |

## 구현 예시

### Collector 레벨

```typescript
export class MyCollector implements BaseCollector {
  readonly policy = {
    timeoutMs: 15_000, // Collector 전체 실행 타임아웃
    maxRetries: 2,
  }

  async collect(ctx: ExecutionContext): Promise<RawRecord[]> {
    // Orchestrator에서 withTimeout으로 래핑됨
    return await this.fetchData(ctx)
  }
}
```

### Endpoint 레벨 (Collector 내부)

```typescript
async fetchData(ctx: ExecutionContext): Promise<RawRecord[]> {
  const endpointTimeout = 10_000 // Collector timeout보다 짧음

  return await withTimeout(
    async () => {
      const response = await axios.get(url, {
        timeout: 5_000, // Network timeout (가장 짧음)
      })
      return response.data
    },
    endpointTimeout
  )
}
```

### Network 레벨 (HTTP 클라이언트)

```typescript
const response = await axios.get(url, {
  timeout: 5_000, // 가장 짧은 타임아웃
})
```

## 주의사항

1. **Playwright 사용 시**: 
   - Collector timeout: 30초
   - `page.goto()` timeout: 20초
   - Network timeout: 10초

2. **중첩 타임아웃**: 
   - 내부 타임아웃이 먼저 발생하면 상위 타임아웃은 의미 없음
   - 하지만 상위 타임아웃은 안전장치 역할

3. **에러 처리**:
   - 타임아웃 에러는 명확히 구분
   - 재시도 가능 여부 판단에 사용

## 기존 설계 원칙 준수

- ✅ **Resource Discipline**: 모든 외부 자원은 타임아웃 제한
- ✅ **Hard Boundary Rule**: 각 레이어는 자신의 타임아웃만 관리
- ✅ **Observability**: 타임아웃 발생 시 명확한 로깅
