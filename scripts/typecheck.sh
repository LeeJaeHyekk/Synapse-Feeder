#!/bin/bash
# TypeScript 타입 체크 스크립트

echo "🔍 TypeScript 타입 체크 시작..."

# TypeScript 컴파일러로 타입 체크
npx tsc --noEmit

if [ $? -eq 0 ]; then
  echo "✅ 타입 체크 통과!"
  exit 0
else
  echo "❌ 타입 오류 발견"
  exit 1
fi
