@echo off
REM TypeScript 타입 체크 스크립트 (Windows)

echo 🔍 TypeScript 타입 체크 시작...

REM TypeScript 컴파일러로 타입 체크
call npx tsc --noEmit

if %ERRORLEVEL% EQU 0 (
  echo ✅ 타입 체크 통과!
  exit /b 0
) else (
  echo ❌ 타입 오류 발견
  exit /b 1
)
