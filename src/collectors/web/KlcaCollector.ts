import type { ExecutionContext, RawRecord } from '../../types/index.js'
import { BaseWebCollector } from '../base/BaseWebCollector.js'
import { fetchHtml } from '../../utils/index.js'
import {
  extractTitle,
  loadHtml,
  extractStructuredItems,
  extractLinks,
  createRawRecord,
  createRawRecords,
  resolveUrl,
  extractHighQualityData,
  organizeByCategory,
  type HighQualityItem,
} from '../utils/htmlParser.js'

/**
 * 한국상장회사협의회(KLCA) Collector
 * 공지사항 및 세미나 정보 수집
 * 
 * 고도화 개선:
 * - Cheerio 기반 구조화된 데이터 추출
 * - 실제 링크, 날짜 정보 수집
 * - 공지사항/세미나/행사 구분하여 수집
 */
export class KlcaCollector extends BaseWebCollector {
  readonly sourceName = 'klca'

  readonly policy = {
    timeoutMs: 15_000,
    maxRetries: 2,
    rateLimit: {
      requestsPerSecond: 2,
      minIntervalMs: 2000,
    },
  }

  protected getUrl(): string {
    // 실제 공지사항 목록 페이지로 변경
    return 'https://www.klca.or.kr/sub/comm/notice.asp'
  }

  protected async parseHtml(html: string, ctx: ExecutionContext): Promise<RawRecord[]> {
    const baseUrl = 'https://www.klca.or.kr'
    const items: RawRecord[] = []

    // 페이지 제목 추출
    const pageTitle = extractTitle(html, '한국상장회사협의회 공지사항')

    // 고품질 데이터 추출 알고리즘 적용 (@mozilla/readability 통합)
    ctx.logger.info('Applying high-quality data extraction algorithm with @mozilla/readability', {
      source: this.sourceName,
    })

    const highQualityItems = extractHighQualityData(html, baseUrl)
    
    // 계층적 분류로 정리
    const organized = organizeByCategory(highQualityItems)

    // @mozilla/readability 사용 통계
    const readabilityUsed = highQualityItems.filter(item =>
      item.fields.some(field => field.method.includes('readability'))
    ).length

    ctx.logger.info('Data organized by category hierarchy', {
      source: this.sourceName,
      categories: Object.keys(organized),
      totalItems: highQualityItems.length,
      readabilityUsed,
      qualityStats: {
        high: highQualityItems.filter(i => i.qualityScore >= 0.8).length,
        medium: highQualityItems.filter(i => i.qualityScore >= 0.6 && i.qualityScore < 0.8).length,
        low: highQualityItems.filter(i => i.qualityScore < 0.6).length,
      },
    })

    // 각 카테고리별로 RawRecord 생성
    for (const [majorCategory, minorCategories] of Object.entries(organized)) {
      for (const [minorCategory, categoryItems] of Object.entries(minorCategories)) {
        // 품질 점수가 높은 순으로 정렬된 항목들을 RawRecord로 변환
        for (const item of categoryItems) {
          const categoryLabel = minorCategory !== '기타' 
            ? `${majorCategory} > ${minorCategory}`
            : majorCategory

          items.push(
            createRawRecord(
              this.sourceName,
              item.title,
              item.url || this.getUrl(),
              this.formatItemContent(item, categoryLabel),
              item.date
            )
          )
        }
      }
    }

    // 기본 페이지 정보 추가
    items.unshift(
      createRawRecord(
        this.sourceName,
        pageTitle,
        this.getUrl(),
        `한국상장회사협의회 - 고품질 데이터 추출\n` +
        `대분류: ${Object.keys(organized).join(', ')}\n` +
        `총 ${highQualityItems.length}개 항목 (품질 점수 평균: ${
          (highQualityItems.reduce((sum, i) => sum + i.qualityScore, 0) / highQualityItems.length || 0).toFixed(2)
        })`
      )
    )

    return items
  }

  /**
   * 아이템 내용 포맷팅 (카테고리 정보 포함)
   */
  private formatItemContent(item: HighQualityItem, categoryLabel: string): string {
    const parts = [
      `[${categoryLabel}] 품질점수: ${(item.qualityScore * 100).toFixed(0)}%`,
      item.author ? `작성자: ${item.author}` : '',
      item.date ? `작성일: ${item.date}` : '',
      '',
      item.content,
    ]

    return parts.filter(Boolean).join('\n')
  }

}
