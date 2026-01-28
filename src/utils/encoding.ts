import iconv from 'iconv-lite'

/**
 * 인코딩 자동 처리 유틸리티
 * Collector는 인코딩을 "전혀 모름" - 항상 UTF-8 문자열만 받음
 */

const CHARSET_REGEX = /charset\s*=\s*([^\s;]+)/i
const META_CHARSET_REGEX = /<meta[^>]+charset=["']?([^"'>\s]+)/i

/**
 * HTML 버퍼를 UTF-8 문자열로 디코딩
 * @param buffer 원시 바이너리 데이터
 * @param headers HTTP 응답 헤더 (axios 호환)
 * @returns 디코딩된 HTML과 사용된 인코딩
 */
export function decodeHtml(
  buffer: ArrayBuffer,
  headers: Record<string, unknown>
): { html: string; encoding: string } {
  // 1️⃣ Content-Type 헤더에서 charset 추출
  const contentType = headers['content-type'] || headers['Content-Type']
  const contentTypeStr = Array.isArray(contentType)
    ? contentType[0]
    : typeof contentType === 'string' || typeof contentType === 'number'
    ? String(contentType)
    : null

  if (contentTypeStr) {
    const match = contentTypeStr.match(CHARSET_REGEX)
    if (match) {
      const encoding = normalizeEncoding(match[1])
      try {
        return {
          html: iconv.decode(Buffer.from(buffer), encoding),
          encoding,
        }
      } catch (err) {
        // 인코딩 실패 시 다음 단계로 진행
      }
    }
  }

  // 2️⃣ meta charset 기반 (utf-8로 임시 디코딩 후 탐색)
  let utf8Html: string
  try {
    utf8Html = iconv.decode(Buffer.from(buffer), 'utf-8')
  } catch {
    // UTF-8 디코딩 실패 시 EUC-KR 시도
    try {
      return {
        html: iconv.decode(Buffer.from(buffer), 'euc-kr'),
        encoding: 'euc-kr',
      }
    } catch {
      // 모든 디코딩 실패 시 원본 반환
      return {
        html: Buffer.from(buffer).toString('utf-8'),
        encoding: 'utf-8',
      }
    }
  }

  const metaMatch = utf8Html.match(META_CHARSET_REGEX)
  if (metaMatch) {
    const encoding = normalizeEncoding(metaMatch[1])
    if (encoding !== 'utf-8') {
      try {
        return {
          html: iconv.decode(Buffer.from(buffer), encoding),
          encoding,
        }
      } catch {
        // 인코딩 실패 시 UTF-8 결과 사용
      }
    }
  }

  // 3️⃣ 한국 사이트 heuristic
  if (looksLikeKoreanSite(utf8Html)) {
    try {
      const eucKrHtml = iconv.decode(Buffer.from(buffer), 'euc-kr')
      // EUC-KR 디코딩이 성공하고 한글이 제대로 보이면 사용
      if (/[가-힣]/.test(eucKrHtml)) {
        return {
          html: eucKrHtml,
          encoding: 'euc-kr',
        }
      }
    } catch {
      // EUC-KR 디코딩 실패 시 UTF-8 사용
    }
  }

  // 4️⃣ fallback: UTF-8
  return {
    html: utf8Html,
    encoding: 'utf-8',
  }
}

/**
 * 인코딩 이름 정규화
 * @param enc 인코딩 이름
 * @returns 정규화된 인코딩 이름
 */
function normalizeEncoding(enc: string): string {
  const lower = enc.toLowerCase().trim()
  if (lower.includes('euc') || lower.includes('ks')) {
    return 'euc-kr'
  }
  if (lower.includes('utf-8') || lower === 'utf8') {
    return 'utf-8'
  }
  if (lower.includes('utf')) {
    return 'utf-8'
  }
  return lower
}

/**
 * 한국 사이트 여부 휴리스틱 판단
 * @param html HTML 문자열
 * @returns 한국 사이트일 가능성
 */
function looksLikeKoreanSite(html: string): boolean {
  // 한글이 포함되어 있고, 한국 관련 키워드가 있으면 한국 사이트로 판단
  return /[가-힣]/.test(html) && /한국|협회|공지|세미나|행사|정부|기관/.test(html)
}
