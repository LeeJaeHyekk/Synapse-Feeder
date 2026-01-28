/**
 * API Strategy
 * 
 * API 엔드포인트를 통한 데이터 수집 전략
 */

import type { FetchStrategy } from './FetchStrategy.js'
import type { RawRecord, ExecutionContext } from '../../../types/index.js'
import { chromium, type Browser } from 'playwright'
import { httpClient } from '../../../utils/index.js'
import { createRawRecord } from '../../utils/htmlParser.js'
import type { DetectedApi } from '../../../analyzer/types.js'

export class ApiStrategy implements FetchStrategy {
  readonly name = 'API'

  async fetch(
    url: string,
    ctx: ExecutionContext,
    options?: {
      timeout?: number
      detectedApis?: DetectedApi[]
    }
  ): Promise<RawRecord[]> {
    ctx.logger.info(`Fetching with API strategy: ${url}`, {
      source: 'api_strategy',
      url,
      apiCount: options?.detectedApis?.length || 0,
    })

    const items: RawRecord[] = []

    // API가 제공된 경우 직접 호출
    if (options?.detectedApis && options.detectedApis.length > 0) {
      for (const api of options.detectedApis) {
        try {
          const response = await httpClient.get(api.url, {
            timeout: options.timeout ?? 15000,
            headers: {
              'Accept': api.contentType || 'application/json',
            },
          })

          // JSON 응답을 RawRecord로 변환
          if (typeof response.data === 'object') {
            const data = Array.isArray(response.data) ? response.data : [response.data]
            
            for (const item of data) {
              items.push(
                createRawRecord(
                  'dynamic',
                  item.title || item.name || 'API Item',
                  api.url,
                  JSON.stringify(item),
                  item.date || item.publishedAt || undefined
                )
              )
            }
          }
        } catch (error) {
          ctx.logger.warn(`Failed to fetch API: ${api.url}`, error, {
            source: 'api_strategy',
            url: api.url,
          })
        }
      }
    } else {
      // API 탐지를 위해 Playwright 사용
      const browser = await chromium.launch({ headless: true })
      try {
        const page = await browser.newPage()
        const apis: DetectedApi[] = []

        page.on('response', (response) => {
          const request = response.request()
          if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
            const contentType = response.headers()['content-type'] || ''
            if (contentType.includes('application/json')) {
              apis.push({
                url: response.url(),
                method: request.method(),
                contentType,
              })
            }
          }
        })

        await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: (options?.timeout ?? 30000) - 5000,
        })

        // 탐지된 API 호출
        for (const api of apis) {
          try {
            const response = await httpClient.get(api.url, {
              timeout: options?.timeout ?? 15000,
            })

            if (typeof response.data === 'object') {
              const data = Array.isArray(response.data) ? response.data : [response.data]
              
              for (const item of data) {
                items.push(
                  createRawRecord(
                    'dynamic',
                    item.title || item.name || 'API Item',
                    api.url,
                    JSON.stringify(item),
                    item.date || item.publishedAt || undefined
                  )
                )
              }
            }
          } catch (error) {
            ctx.logger.warn(`Failed to fetch API: ${api.url}`, error, {
              source: 'api_strategy',
            })
          }
        }
      } finally {
        await browser.close()
      }
    }

    return items
  }
}
