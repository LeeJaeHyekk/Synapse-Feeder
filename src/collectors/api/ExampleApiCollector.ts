import type { ExecutionContext, RawRecord } from '../../types/index.js'
import { BaseApiCollector } from '../base/BaseApiCollector.js'
import type { AxiosRequestConfig } from 'axios'

/**
 * 예제 API Collector
 * REST API를 호출하는 Collector 예시
 * 
 * 모듈화 개선:
 * - BaseApiCollector 상속으로 공통 로직 재사용
 */
export class ExampleApiCollector extends BaseApiCollector {
  readonly sourceName = 'example_api'

  readonly policy = {
    timeoutMs: 5_000,
    maxRetries: 3,
    rateLimit: {
      requestsPerSecond: 5,
      minIntervalMs: 200,
    },
  }

  protected getRequestConfig(): AxiosRequestConfig {
    return {
      url: 'https://api.example.com/articles',
      method: 'GET',
      timeout: 3_000,
      headers: {
        'Accept': 'application/json',
      },
    }
  }

  protected parseResponse(data: unknown, ctx: ExecutionContext): RawRecord[] {
    // API 응답을 Raw 데이터로 반환
    if (typeof data === 'object' && data !== null && 'data' in data) {
      return (data as { data: RawRecord[] }).data ?? []
    }
    return []
  }
}
