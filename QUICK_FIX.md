# 빠른 수정 가이드

## .env 파일 수정

`.env` 파일을 다음과 같이 수정하세요:

```env
# Node Environment
NODE_ENV=dev

# Slack Configuration
# 테스트용 더미 값 사용 가능
SLACK_TOKEN=dummy-token-for-test
SLACK_CHANNEL=#test-channel
# 에러 채널은 선택사항 (주석 처리하거나 더미 값 사용)
SLACK_ERROR_CHANNEL=#test-errors

# Database
DB_PATH=./data/articles.db

# Crawler Configuration
DEFAULT_TIMEOUT_MS=30000
```

## 중요 사항

1. **SLACK_CHANNEL은 필수**입니다. 최소 1자 이상의 값이 필요합니다.
2. **SLACK_ERROR_CHANNEL은 선택사항**입니다. 주석 처리하거나 제거해도 됩니다.
3. 테스트 목적이라면 더미 값으로 설정해도 됩니다.

## 수정 후

```bash
npm run dev
```
