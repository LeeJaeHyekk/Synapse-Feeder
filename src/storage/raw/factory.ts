import type { RawStorage } from './RawStorage'
import { FileRawStorage } from './RawStorage'

/**
 * Raw Storage 생성
 */
export function createRawStorage(baseDir?: string): RawStorage {
  return new FileRawStorage(baseDir)
}
