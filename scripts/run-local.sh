#!/bin/bash

# 로컬 실행 스크립트

set -e

echo "🚀 Starting Synapse Feeder..."

# .env 파일 확인
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Please create .env from .env.example"
  exit 1
fi

# 빌드
echo "📦 Building..."
npm run build

# 실행
echo "▶️  Running..."
node dist/main.js

echo "✅ Done!"
