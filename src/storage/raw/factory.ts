import type { RawStorage } from './RawStorage.js'
import { FileRawStorage } from './RawStorage.js'

/**
 * Raw Storage 생성
 */
export function createRawStorage(baseDir?: string): RawStorage {
  return new FileRawStorage(baseDir)
}
