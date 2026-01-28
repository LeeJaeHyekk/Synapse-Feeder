# 테스트 가이드

## 네이버 플러스 스토어 테스트

### 1. 환경 설정

#### .env 파일 생성

```bash
cp .env.example .env
```

#### .env 파일 편집

테스트를 위해 최소한의 설정만 필요합니다:

```env
# Node Environment
NODE_ENV=dev

# Slack Configuration (테스트 시 선택사항)
SLACK_TOKEN=test-token
SLACK_CHANNEL=#test-channel
SLACK_ERROR_CHANNEL=#test-errors

# Database
DB_PATH=./data/articles.db

# Crawler Configuration
DEFAULT_TIMEOUT_MS=30000
```

**참고**: Slack 토큰이 없어도 테스트는 가능합니다. 단, 리포트 전송 단계에서 실패할 수 있습니다.

### 2. 의존성 설치

```bash
npm install
```

### 3. 빌드

```bash
npm run build
```

### 4. 테스트 실행

#### 방법 1: 개발 모드로 실행 (권장)

```bash
npm run dev
```

#### 방법 2: 빌드 후 실행

```bash
npm run build
npm start
```

### 5. 예상 출력

성공적으로 실행되면 다음과 같은 로그가 출력됩니다:

```
[INFO] 2026-01-28T... 🚀 Daily crawling job started
[INFO] 2026-01-28T... 🔍 Collecting from naver_plus_store
[INFO] 2026-01-28T... Collected X items from naver_plus_store
[INFO] 2026-01-28T... Raw data saved: ./data/raw/YYYY-MM-DD/naver_plus_store.json
[INFO] 2026-01-28T... ✅ naver_plus_store: X items
[INFO] 2026-01-28T... 📨 Slack report sent (또는 실패 로그)
[INFO] 2026-01-28T... 🏁 Daily crawling job finished
```

### 6. 결과 확인

#### Raw 데이터 확인

```bash
# Windows (PowerShell)
cat data/raw/YYYY-MM-DD/naver_plus_store.json

# Git Bash
cat data/raw/$(date +%Y-%m-%d)/naver_plus_store.json
```

#### 데이터베이스 확인

SQLite 데이터베이스가 생성되고 데이터가 저장됩니다:

```bash
# SQLite 설치 필요
sqlite3 data/articles.db "SELECT * FROM articles LIMIT 10;"
```

### 7. 문제 해결

#### 에러: "Invalid environment variables"

`.env` 파일이 제대로 생성되었는지 확인하세요.

```bash
# .env 파일 확인
cat .env
```

#### 에러: "Collector failed"

네트워크 문제이거나 사이트 구조가 변경되었을 수 있습니다.

1. 인터넷 연결 확인
2. `src/collectors/web/NaverPlusStoreCollector.ts` 파일의 파싱 로직 확인
3. 로그에서 상세 에러 메시지 확인

#### 에러: "Slack notification failed"

Slack 토큰이 없거나 잘못된 경우 발생합니다. 테스트 목적이라면 무시해도 됩니다.

`.env`에서 Slack 관련 설정을 제거하거나 더미 값으로 설정:

```env
SLACK_TOKEN=dummy
SLACK_CHANNEL=#dummy
```

### 8. Collector 수정

네이버 플러스 스토어에서 더 많은 정보를 수집하려면 `src/collectors/web/NaverPlusStoreCollector.ts`를 수정하세요.

#### HTML 파싱 개선

더 정확한 파싱을 위해 `cheerio`를 사용할 수 있습니다:

```bash
npm install cheerio
npm install --save-dev @types/cheerio
```

그리고 Collector를 수정:

```typescript
import * as cheerio from 'cheerio'

// HTML 파싱
const $ = cheerio.load(html)
const keywords = $('.keyword-item').map((i, el) => $(el).text()).get()
```

### 9. 로컬 스크립트 사용

```bash
# Git Bash에서
bash scripts/run-local.sh
```

### 10. 다음 단계

1. **더 정확한 파싱**: cheerio를 사용하여 HTML 구조에 맞게 파싱
2. **다른 페이지 수집**: 베스트 상품, 브랜드 등 다른 섹션 추가
3. **정규화 개선**: Normalizer에서 네이버 플러스 스토어 특화 필드 매핑
4. **에러 처리**: 네트워크 에러, 파싱 에러 등 다양한 케이스 처리

## 빠른 테스트 체크리스트

- [ ] `.env` 파일 생성 및 설정
- [ ] `npm install` 실행
- [ ] `npm run build` 실행
- [ ] `npm run dev` 실행
- [ ] 로그 확인
- [ ] Raw 데이터 파일 확인
- [ ] 데이터베이스 확인

## 참고

- Collector는 `src/collectors/registry.ts`에 등록되어 있습니다
- Raw 데이터는 `data/raw/YYYY-MM-DD/` 디렉토리에 저장됩니다
- 정규화된 데이터는 `data/articles.db`에 저장됩니다
