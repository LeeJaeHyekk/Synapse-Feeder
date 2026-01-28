# Windows 설치 가이드

## ⚠️ 중요: Node.js v24 이슈

Node.js v24.12.0은 아직 LTS가 아니며, `better-sqlite3`의 prebuilt 바이너리가 제공되지 않습니다.

## 해결 방법

### 방법 1: Node.js LTS 버전 사용 (가장 권장) ✅

Node.js v20 LTS 또는 v22 LTS를 사용하세요:

### 설치 단계:

1. **Node.js LTS 다운로드**
   - [Node.js LTS 다운로드 페이지](https://nodejs.org/)
   - **v20.x.x (LTS)** 또는 **v22.x.x (LTS)** 선택
   - Windows Installer (.msi) 다운로드

2. **Node.js 설치**
   - 다운로드한 .msi 파일 실행
   - 기본 설정으로 설치 (모든 옵션 체크)
   - 설치 완료 후 터미널 재시작

3. **버전 확인**
   ```bash
   node --version
   # v20.x.x 또는 v22.x.x가 출력되어야 함
   
   npm --version
   ```

4. **기존 node_modules 정리 (선택사항)**
   ```bash
   # Git Bash에서
   rm -rf node_modules package-lock.json
   ```

5. **의존성 설치**
   ```bash
   npm install
   ```

### 예상 결과:
- `better-sqlite3`가 prebuilt 바이너리로 설치됨
- Python이나 빌드 도구 없이도 설치 완료
- 빌드 에러 없이 정상 설치

### 방법 2: 스크립트 빌드 건너뛰기

빌드 스크립트를 건너뛰고 수동으로 설치:

```bash
# Git Bash에서
npm install --ignore-scripts
npm rebuild better-sqlite3 --build-from-source=false
```

### 방법 3: 환경변수 설정 (시도해볼 수 있음)

### CMD (명령 프롬프트)에서:
```cmd
set BUILD_FROM_SOURCE=false
set npm_config_build_from_source=false
npm install
```

### PowerShell에서:
```powershell
$env:BUILD_FROM_SOURCE="false"
$env:npm_config_build_from_source="false"
npm install
```

### Git Bash에서:
```bash
export BUILD_FROM_SOURCE=false
export npm_config_build_from_source=false
npm install
```

## 방법 4: 기존 설치 정리 후 재설치

```cmd
# 1. 기존 node_modules 삭제
rmdir /s /q node_modules
del package-lock.json

# 2. .npmrc 파일이 있으면 확인 (build-from-source=false 설정)
# 3. 재설치
npm install
```

**참고**: 프로젝트 루트에 `.npmrc` 파일이 생성되어 있어 `build-from-source=false`가 기본 설정됩니다.

## 방법 5: Python 및 빌드 도구 설치 (완전한 해결)

더 나은 성능과 호환성을 위해 네이티브 빌드를 사용하려면:

### 1. Python 설치
- [Python 3.11 다운로드](https://www.python.org/downloads/)
- 설치 시 **"Add Python to PATH"** 체크 필수!

### 2. Visual Studio Build Tools 설치
- [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) 다운로드
- 설치 시 **"C++ build tools"** 워크로드 선택

### 3. npm 설정
```cmd
npm config set python python
npm config set msvs_version 2022
```

### 4. 재설치
```cmd
npm install
```

## 확인

설치가 성공하면 다음 명령어로 확인:

```cmd
npm run build
```

에러가 없으면 성공입니다!

## 추가 도움말

더 자세한 내용은 [빠른 시작 가이드](./QUICK_START.md)를 참고하세요.
