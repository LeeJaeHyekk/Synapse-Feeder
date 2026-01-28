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
  if (input === null || input === undefined) {
    throw new Error(`Invalid date value: ${String(input)}`)
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

  throw new Error(`Invalid date value: ${String(input)}`)
}
