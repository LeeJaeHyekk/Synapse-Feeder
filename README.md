# Synapse Feeder

**"매일 돌아가지만 아무도 관리하지 않는 시스템"**을 사고 없이 굴리기 위한 Daily Crawling Automation 시스템

## 📋 개요

Data Ingestion(수집) → Transformation(가공) → Notification(알림)으로 이어지는 파이프라인 설계

### 핵심 특징

- ✅ **무인 실행**: cron 기반 단발 실행, 상태 없음
- ✅ **부분 실패 허용**: Collector 단위 격리
- ✅ **증거 보존**: Raw 데이터 저장
- ✅ **신뢰 데이터**: Normalizer 통과 후만 저장
- ✅ **확장성**: 새 소스 추가 시 파일 1개만 수정
- ✅ **이식성**: Python 전환 시 구조 유지
- ✅ **관측 가능**: 모든 실패/성공 기록

## 🏗️ 아키텍처

```
cron → node dist/main.js → Orchestrator → Pipeline
  ├─ Collector Layer (Raw 생성)
  ├─ Raw Storage (증거 보존)
  ├─ Normalizer Layer (Schema Gate)
  ├─ Normalized Storage (신뢰 데이터)
  ├─ Formatter Layer (Human-readable)
  └─ Notifier Layer (Side Effect)
```

## 🚀 시작하기

### 필수 요구사항

- Node.js >= 20.0.0
- npm 또는 yarn

### 설치

#### Node.js 버전 확인

**중요**: Node.js v20 LTS 또는 v22 LTS를 사용하세요.

```bash
node --version
# v20.x.x 또는 v22.x.x가 출력되어야 합니다
```

Node.js v24는 아직 LTS가 아니며 `better-sqlite3`의 prebuilt 바이너리가 제공되지 않습니다.

#### 설치

```bash
npm install
```

#### Windows 사용자 - 문제 해결

설치 중 `better-sqlite3` 빌드 에러가 발생하는 경우:

1. **Node.js LTS 버전 사용** (권장)
   - [Node.js LTS 다운로드](https://nodejs.org/)
   - v20.x.x 또는 v22.x.x 설치

2. 자세한 내용은 [Windows 설치 가이드](./INSTALL_WINDOWS.md)를 참고하세요.

### 빌드

```bash
npm run build
```

### 환경 설정

`.env.example`을 참고하여 `.env` 파일을 생성하세요:

```bash
cp .env.example .env
```

필수 환경변수:
- `SLACK_TOKEN`: Slack Bot Token
- `SLACK_CHANNEL`: 리포트 전송 채널
- `SLACK_ERROR_CHANNEL`: 에러 알림 채널 (선택)

### 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

## 📁 프로젝트 구조

```
src/
├── main.ts                 # Entry Point
├── app.ts                  # Orchestrator
├── config/                 # 환경변수 검증
├── collectors/             # 데이터 수집 레이어
│   ├── BaseCollector.ts
│   ├── web/
│   └── api/
├── normalizers/            # 데이터 정규화 레이어
│   ├── schemas/
│   └── utils/
├── storage/                # 저장 레이어
│   ├── raw/                # Raw 데이터 저장
│   └── repository/         # 정규화된 데이터 저장
├── formatter/              # 리포트 포맷팅
├── notifier/               # 알림 전송
├── errors/                 # 에러 타입
├── logger/                 # 로깅
└── utils/                  # 유틸리티
```

## 🔧 Collector 추가하기

새로운 데이터 소스를 추가하려면:

1. `src/collectors/web/` 또는 `src/collectors/api/`에 새 Collector 클래스 생성
2. `BaseCollector` 인터페이스 구현
3. `src/collectors/index.ts`의 `loadCollectors()`에 등록

예시:

```typescript
import type { BaseCollector } from '../BaseCollector'
import type { ExecutionContext } from '../../types/ExecutionContext'

export class MyCollector implements BaseCollector {
  readonly sourceName = 'my_source'
  
  readonly policy = {
    timeoutMs: 8_000,
    maxRetries: 2,
  }
  
  async collect(ctx: ExecutionContext) {
    // 수집 로직
    return []
  }
}
```

## 📊 데이터 흐름

1. **Collector**: Raw 데이터 수집 (파싱/변환 ❌)
2. **Raw Storage**: 증거 보존 (JSON 그대로 저장)
3. **Normalizer**: Schema 검증 및 정규화
4. **Repository**: 정규화된 데이터 저장 (멱등성 보장)
5. **Formatter**: 리포트 생성
6. **Notifier**: Slack 전송

## 🛡️ 에러 처리

- **Collector 실패**: 해당 source 스킵, 다음 진행
- **Normalize 실패**: 해당 source 스킵, Raw 보존
- **DB 실패**: 프로세스 실패 (데이터 손실 방지)
- **Slack 실패**: 로그만, 프로세스 성공 유지

## 🔄 Cron 설정

프로덕션 환경에서는 cron으로 자동 실행:

```bash
# 매일 오전 6시 실행
0 6 * * * cd /path/to/synapse-feeder && node dist/main.js >> /var/log/crawler.log 2>&1
```

## 📝 로깅

모든 로그는 다음 형식으로 출력됩니다:

```
[INFO] 2026-01-28T06:00:00.000Z 🚀 Daily crawling job started
[INFO] 2026-01-28T06:00:01.000Z 🔍 Collecting from site_a
[INFO] 2026-01-28T06:00:05.000Z ✅ site_a: 15 items
[ERROR] 2026-01-28T06:00:10.000Z [CollectorFailed] source=site_b error=TimeoutError
[INFO] 2026-01-28T06:00:15.000Z 📨 Slack report sent
[INFO] 2026-01-28T06:00:15.000Z 🏁 Daily crawling job finished
```

## 🐳 Docker 배포

Dockerfile과 cron 설정은 `docs/최종 설계도.md`를 참고하세요.

## 📚 문서

- [최종 설계도](./docs/최종%20설계도.md)
- [Windows 설치 가이드](./docs/WINDOWS_SETUP.md)
- [아키텍처](./docs/architecture.md)
- [설계 원칙](./docs/design%20principles.md)
- [폴더 구조](./docs/Folder%20tree%20scaffolding.md)

## 🔧 문제 해결

### Windows에서 npm install 실패

`better-sqlite3` 빌드 에러가 발생하는 경우:

1. **빠른 해결** (권장):
   ```bash
   npm run install:windows
   ```

2. **수동 설정**:
   ```bash
   set BUILD_FROM_SOURCE=false
   npm install
   ```

3. **Python 및 빌드 도구 설치**:
   - [Windows 설치 가이드](./docs/WINDOWS_SETUP.md) 참고

## 📄 라이선스

MIT
