import Database from 'better-sqlite3'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

let dbInstance: Database.Database | null = null

/**
 * SQLite 데이터베이스 클라이언트 생성
 * @param dbPath 데이터베이스 파일 경로
 * @returns Database 인스턴스
 */
export function createDatabase(dbPath: string): Database.Database {
  if (dbInstance) {
    return dbInstance
  }

  // 디렉토리 생성
  const dir = path.dirname(dbPath)
  fs.mkdir(dir, { recursive: true }).catch(() => {
    // 이미 존재하면 무시
  })

  dbInstance = new Database(dbPath)

  // 초기 스키마 생성
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      published_at TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (source, url)
    );

    CREATE INDEX IF NOT EXISTS idx_source ON articles(source);
    CREATE INDEX IF NOT EXISTS idx_published_at ON articles(published_at);
  `)

  return dbInstance
}

/**
 * 데이터베이스 연결 종료
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
