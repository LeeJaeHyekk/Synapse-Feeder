import { fileURLToPath } from 'url'
import { dirname } from 'path'

/**
 * ESM 환경에서 __dirname과 __filename을 제공하는 유틸리티
 */

/**
 * 현재 파일의 디렉토리 경로를 반환
 * @param importMetaUrl import.meta.url
 * @returns 디렉토리 경로
 */
export function getDirname(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl))
}

/**
 * 현재 파일의 파일 경로를 반환
 * @param importMetaUrl import.meta.url
 * @returns 파일 경로
 */
export function getFilename(importMetaUrl: string): string {
  return fileURLToPath(importMetaUrl)
}
