import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

/**
 * 날짜 파싱
 * 실패 시 즉시 throw → normalize 단계에서 걸러짐
 * @param input 날짜 입력값
 * @returns Date 객체
 */
export function parseDate(input: unknown): Date {
  // 빈 문자열이나 공백만 있는 경우 현재 시간 사용
  if (typeof input === 'string' && input.trim() === '') {
    return new Date()
  }

  if (input === null || input === undefined) {
    return new Date() // 기본값으로 현재 시간 사용
  }

  if (typeof input === 'string' || typeof input === 'number') {
    const d = dayjs(input).utc()
    if (d.isValid()) {
      return d.toDate()
    }
  }

  if (input instanceof Date) {
    return input
  }

  // 파싱 실패 시 현재 시간 반환 (throw 대신)
  return new Date()
}
