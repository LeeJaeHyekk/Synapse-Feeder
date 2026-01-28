/**
 * Collector 실행 결과
 */
export interface CollectorResult {
  sourceName: string
  success: boolean
  itemCount?: number
  error?: unknown
}

/**
 * 전체 실행 결과 집계
 */
export class ExecutionResult {
  private results: CollectorResult[] = []
  private startTime: number = Date.now()

  /**
   * 성공 기록
   */
  success(sourceName: string, itemCount: number): void {
    this.results.push({
      sourceName,
      success: true,
      itemCount,
    })
  }

  /**
   * 실패 기록
   */
  fail(sourceName: string, error: unknown): void {
    this.results.push({
      sourceName,
      success: false,
      error,
    })
  }

  /**
   * 모든 결과 조회
   */
  getResults(): ReadonlyArray<CollectorResult> {
    return this.results
  }

  /**
   * 성공한 Collector 목록
   */
  getSuccessfulSources(): string[] {
    return this.results
      .filter(r => r.success)
      .map(r => r.sourceName)
  }

  /**
   * 실패한 Collector 목록
   */
  getFailedSources(): string[] {
    return this.results
      .filter(r => !r.success)
      .map(r => r.sourceName)
  }

  /**
   * 총 수집 건수
   */
  getTotalItemCount(): number {
    return this.results
      .filter(r => r.success && r.itemCount !== undefined)
      .reduce((sum, r) => sum + (r.itemCount ?? 0), 0)
  }

  /**
   * 실행 시간 (ms)
   */
  getExecutionTime(): number {
    return Date.now() - this.startTime
  }

  /**
   * 성공 여부
   */
  hasFailures(): boolean {
    return this.results.some(r => !r.success)
  }
}
