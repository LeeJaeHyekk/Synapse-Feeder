import type { BaseCollector, ExecutionContext, RawRecord } from '../../types'
import { retry, isRetryableHttpError } from '../../utils'
import axios from 'axios'

/**
 * 네이버 플러스 스토어 Collector
 * 베스트 키워드 및 상품 정보 수집
 */
export class NaverPlusStoreCollector implements BaseCollector {
  readonly sourceName = 'naver_plus_store'

  readonly policy = {
    timeoutMs: 15_000,
    maxRetries: 2,
    rateLimit: {
      requestsPerSecond: 2,
      minIntervalMs: 2000,
    },
  }

  async collect(ctx: ExecutionContext): Promise<RawRecord[]> {
    ctx.logger.info(`Collecting from ${this.sourceName}`)

    return retry(
      async () => {
        const response = await axios.get('https://snxbest.naver.com/home', {
          timeout: 10_000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        })

        // HTML 응답을 Raw 데이터로 변환
        // 실제로는 HTML 파싱이 필요하지만, 테스트를 위해 간단하게 처리
        const html = response.data

        // 베스트 키워드 추출 (간단한 정규식 사용)
        const keywordMatches = html.match(/<[^>]*>([^<]*랭킹[^<]*)</g) || []
        const items: RawRecord[] = []

        // 페이지 제목 추출
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        const pageTitle = titleMatch ? titleMatch[1].trim() : '네이버 플러스 스토어'

        // 기본 정보 수집
        items.push({
          title: pageTitle,
          url: 'https://snxbest.naver.com/home',
          date: new Date().toISOString(),
          content: `네이버 플러스 스토어 메인 페이지\n키워드 매치 수: ${keywordMatches.length}`,
          source: this.sourceName,
        })

        // 키워드 정보 추가 (최대 10개)
        keywordMatches.slice(0, 10).forEach((match: string, index: number) => {
          const text = match.replace(/<[^>]*>/g, '').trim()
          if (text && text.length > 0) {
            items.push({
              title: `베스트 키워드 ${index + 1}: ${text}`,
              url: 'https://snxbest.naver.com/home',
              date: new Date().toISOString(),
              content: text,
              source: this.sourceName,
            })
          }
        })

        ctx.logger.info(`Collected ${items.length} items from ${this.sourceName}`)
        return items
      },
      {
        retries: this.policy.maxRetries,
        backoffMs: 1000,
        retryOn: isRetryableHttpError,
      }
    )
  }
}
