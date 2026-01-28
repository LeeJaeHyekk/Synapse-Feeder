# 빠른 시작 가이드

## Node.js LTS 설치 후

### 1. Node.js 버전 확인

```bash
node --version
# v20.x.x 또는 v22.x.x가 출력되어야 합니다
```

### 2. 기존 설치 정리 (선택사항)

이전 설치 시도로 인한 잔여 파일이 있다면 정리:

```bash
# Git Bash에서
rm -rf node_modules package-lock.json
```

### 3. 의존성 설치

```bash
npm install
```

### 4. 빌드 테스트

```bash
npm run build
```

에러가 없으면 성공입니다! ✅

### 5. 환경변수 설정

`.env` 파일을 생성하고 설정:

```bash
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값들을 설정:
- `SLACK_TOKEN`: Slack Bot Token
- `SLACK_CHANNEL`: 리포트 전송 채널 (예: `#daily-report`)
- `SLACK_ERROR_CHANNEL`: 에러 알림 채널 (선택사항)

### 6. 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드 (빌드 후)
npm run build
npm start
```

## 문제 해결

### 설치 중 에러가 발생하면

1. **Node.js 버전 확인**
   ```bash
   node --version
   ```
   - v20.x.x 또는 v22.x.x가 아니면 LTS 버전으로 재설치

2. **npm 캐시 정리**
   ```bash
   npm cache clean --force
   ```

3. **재설치**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 여전히 better-sqlite3 에러가 발생하면

`.npmrc` 파일이 있는지 확인하고, 다음 내용이 있는지 확인:
```
build-from-source=false
```

그래도 안 되면 [INSTALL_WINDOWS.md](./INSTALL_WINDOWS.md)의 다른 방법들을 시도해보세요.

## 다음 단계

1. Collector 추가하기
   - `src/collectors/index.ts`에서 Collector 등록
   - 예제 Collector 참고: `src/collectors/web/ExampleWebCollector.ts`

2. 환경변수 설정
   - `.env` 파일에 Slack 토큰 등 설정

3. 실행 및 테스트
   - `npm run dev`로 로컬 테스트

## 도움말

- [최종 설계도](./최종%20설계도.md)
- [Windows 설치 가이드](./INSTALL_WINDOWS.md)
- [README](../README.md)
