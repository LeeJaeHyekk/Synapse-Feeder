import type { BaseCollector, ExecutionContext, RawRecord } from '../../types'
import { retry, isRetryableHttpError } from '../../utils'
import axios from 'axios'

/**
 * 예제 Web Collector
 * 실제 구현 시 이 파일을 참고하여 새로운 Collector 생성
 */
export class ExampleWebCollector implements BaseCollector {
  readonly sourceName = 'example_web'

  readonly policy = {
    timeoutMs: 8_000,
    maxRetries: 2,
    rateLimit: {
      requestsPerSecond: 3,
      minIntervalMs: 1000,
    },
  }

  async collect(ctx: ExecutionContext): Promise<RawRecord[]> {
    ctx.logger.info(`Collecting from ${this.sourceName}`)

    // Retry 로직은 Collector 내부에서 처리
    return retry(
      async () => {
        const response = await axios.get('https://example.com/news', {
          timeout: 5_000,
        })

        // Raw 데이터 그대로 반환 (파싱/변환 ❌)
        return response.data.items as RawRecord[]
      },
      {
        retries: this.policy.maxRetries,
        backoffMs: 1000,
        retryOn: isRetryableHttpError,
      }
    )
  }
}
