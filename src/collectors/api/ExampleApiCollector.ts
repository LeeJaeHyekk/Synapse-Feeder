import type { BaseCollector, ExecutionContext, RawRecord } from '../../types'
import { retry, isRetryableHttpError } from '../../utils'
import axios from 'axios'

/**
 * 예제 API Collector
 * REST API를 호출하는 Collector 예시
 */
export class ExampleApiCollector implements BaseCollector {
  readonly sourceName = 'example_api'

  readonly policy = {
    timeoutMs: 5_000,
    maxRetries: 3,
    rateLimit: {
      requestsPerSecond: 5,
      minIntervalMs: 200,
    },
  }

  async collect(ctx: ExecutionContext): Promise<RawRecord[]> {
    ctx.logger.info(`Collecting from ${this.sourceName}`)

    return retry(
      async () => {
        const response = await axios.get('https://api.example.com/articles', {
          timeout: 3_000,
          headers: {
            'Accept': 'application/json',
          },
        })

        // API 응답을 Raw 데이터로 반환
        return (response.data.data ?? []) as RawRecord[]
      },
      {
        retries: this.policy.maxRetries,
        backoffMs: 500,
        retryOn: isRetryableHttpError,
      }
    )
  }
}
