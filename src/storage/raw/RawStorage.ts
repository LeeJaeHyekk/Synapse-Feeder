import type { ExecutionContext, RawRecord } from '../../types'
import { isRawRecordArray } from '../../types'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Raw Storage Interface
 */
export interface RawStorage {
  save(ctx: ExecutionContext, sourceName: string, data: RawRecord[]): Promise<void>
}

/**
 * 파일 시스템 기반 Raw Storage 구현
 */
export class FileRawStorage implements RawStorage {
  constructor(private baseDir: string = './data/raw') {}

  async save(
    ctx: ExecutionContext,
    sourceName: string,
    data: RawRecord[]
  ): Promise<void> {
    // 타입 가드: Raw 데이터 검증
    if (!isRawRecordArray(data)) {
      throw new Error(`Invalid raw data format for source: ${sourceName}`)
    }

    const dateDir = path.join(this.baseDir, ctx.runDate)
    await fs.mkdir(dateDir, { recursive: true })

    const filePath = path.join(dateDir, `${sourceName}.json`)

    // Atomic write: 임시 파일에 쓰고 이동
    const tempPath = `${filePath}.tmp`
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8')
    await fs.rename(tempPath, filePath)

    ctx.logger.info(`Raw data saved: ${filePath}`, {
      source: sourceName,
      count: data.length,
    })
  }
}
