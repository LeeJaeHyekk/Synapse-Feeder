# Windows 설치 가이드

## 문제: better-sqlite3 빌드 에러

Windows에서 `better-sqlite3`는 네이티브 모듈을 빌드하기 위해 Python과 빌드 도구가 필요합니다.

## 해결 방법 1: Python 및 빌드 도구 설치 (권장)

### 1. Python 설치
- Python 3.6 이상 필요
- [Python 공식 사이트](https://www.python.org/downloads/)에서 다운로드
- 설치 시 "Add Python to PATH" 옵션 체크

### 2. Visual Studio Build Tools 설치
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) 다운로드
- "C++ build tools" 워크로드 설치

### 3. npm 설정
```bash
npm config set python python
npm config set msvs_version 2022
```

### 4. 재설치
```bash
npm install
```

## 해결 방법 2: Prebuilt 바이너리 사용

`better-sqlite3`는 prebuilt 바이너리를 제공합니다. Python 없이도 설치할 수 있습니다:

```bash
npm install --build-from-source=false better-sqlite3
```

또는 환경변수 설정:
```bash
set BUILD_FROM_SOURCE=false
npm install
```

## 해결 방법 3: 대안 라이브러리 사용

Windows에서 빌드 도구 없이 사용하려면 `sql.js`로 교체할 수 있습니다:

```bash
npm uninstall better-sqlite3 @types/better-sqlite3
npm install sql.js
```

단, `sql.js`는 비동기식이고 성능이 `better-sqlite3`보다 낮습니다.

## 빠른 해결 (권장)

가장 빠른 방법은 prebuilt 바이너리를 사용하는 것입니다:

```bash
# 1. 기존 node_modules 삭제
rm -rf node_modules package-lock.json

# 2. 환경변수 설정 후 설치
set BUILD_FROM_SOURCE=false
npm install
```

또는 PowerShell에서:
```powershell
$env:BUILD_FROM_SOURCE="false"
npm install
```
