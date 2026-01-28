/**
 * Zero-Shot Classification 유틸리티
 * 
 * ML 기반 텍스트 분류를 위한 구조
 * Python API 서버와 통신하여 분류 수행
 * 
 * 사용 방법:
 * 1. Python FastAPI 서버 구축 (선택적)
 * 2. 환경 변수에 API URL 설정 (ZERO_SHOT_API_URL)
 * 3. classify 함수 호출
 */

export interface ZeroShotClassificationResult {
  label: string
  score: number
}

export interface ZeroShotClassificationOptions {
  /** 분류할 카테고리 목록 */
  categories: string[]
  /** API 서버 URL (기본값: 환경 변수 또는 localhost) */
  apiUrl?: string
  /** 타임아웃 (ms) */
  timeout?: number
}

/**
 * Zero-Shot Classification 수행
 * 
 * @param text 분류할 텍스트
 * @param options 분류 옵션
 * @returns 분류 결과 (실패 시 null)
 */
export async function classifyWithZeroShot(
  text: string,
  options: ZeroShotClassificationOptions
): Promise<ZeroShotClassificationResult | null> {
  const apiUrl = options.apiUrl || process.env.ZERO_SHOT_API_URL || 'http://localhost:8000'
  
  // API URL이 설정되지 않았거나 비활성화된 경우
  if (!apiUrl || apiUrl === 'disabled') {
    return null
  }

  try {
    const { httpClient } = await import('../../utils/index.js')
    
    const response = await httpClient.post(
      `${apiUrl}/classify`,
      {
        text,
        categories: options.categories,
      },
      {
        timeout: options.timeout || 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.data && response.data.label) {
      return {
        label: response.data.label,
        score: response.data.score || 0,
      }
    }

    return null
  } catch (error) {
    // API 호출 실패 시 조용히 실패 (선택적 기능이므로)
    console.warn('Zero-Shot Classification failed:', error)
    return null
  }
}

/**
 * 여러 텍스트를 일괄 분류
 */
export async function classifyBatch(
  texts: string[],
  options: ZeroShotClassificationOptions
): Promise<(ZeroShotClassificationResult | null)[]> {
  const results = await Promise.all(
    texts.map(text => classifyWithZeroShot(text, options))
  )
  return results
}

/**
 * 카테고리별 신뢰도 점수 반환
 */
export async function classifyWithScores(
  text: string,
  options: ZeroShotClassificationOptions
): Promise<Record<string, number> | null> {
  const apiUrl = options.apiUrl || process.env.ZERO_SHOT_API_URL || 'http://localhost:8000'
  
  if (!apiUrl || apiUrl === 'disabled') {
    return null
  }

  try {
    const { httpClient } = await import('../../utils/index.js')
    
    const response = await httpClient.post(
      `${apiUrl}/classify-scores`,
      {
        text,
        categories: options.categories,
      },
      {
        timeout: options.timeout || 5000,
      }
    )

    if (response.data && typeof response.data === 'object') {
      return response.data as Record<string, number>
    }

    return null
  } catch (error) {
    console.warn('Zero-Shot Classification with scores failed:', error)
    return null
  }
}
