import { runApp } from './app'

/**
 * Entry Point
 * Node 프로세스는 실행 → 종료
 */
runApp()
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    console.error('[FATAL]', err)
    process.exit(1)
  })
