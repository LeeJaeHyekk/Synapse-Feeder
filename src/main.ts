import * as Sentry from '@sentry/node'
import { runApp } from './app.js'

/**
 * Entry Point
 * Node 프로세스는 실행 → 종료
 * 
 * 개선사항:
 * - Sentry 에러 추적 통합
 */

// Sentry 초기화 (환경변수가 설정된 경우에만)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // 민감한 정보 제거
      if (event.request) {
        delete event.request.cookies
        delete event.request.headers?.authorization
      }
      return event
    },
  })
}

runApp()
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    // Sentry에 에러 전송
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err, {
        tags: {
          component: 'main',
        },
      })
      // Sentry가 에러를 전송할 시간을 줌
      Sentry.flush(2000).then(() => {
        process.exit(1)
      })
    } else {
      console.error('[FATAL]', err)
      process.exit(1)
    }
  })
