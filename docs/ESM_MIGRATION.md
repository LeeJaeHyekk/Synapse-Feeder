# ESM 마이그레이션 가이드

## 개요

프로젝트 전체를 ESM (ECMAScript Modules) 문법으로 전환했습니다.

## 주요 변경사항

### 1. package.json 설정

```json
{
  "type": "module",
  "scripts": {
    "dev": "ts-node --esm src/main.ts"
  }
}
```

### 2. tsconfig.json 설정

```json
{
  "compilerOptions": {
    "module": "ES2022",
    "moduleResolution": "bundler"
  },
  "ts-node": {
    "esm": true
  }
}
```

### 3. Import 경로에 .js 확장자 추가

**Before (CommonJS):**
```typescript
import { createExecutionContext } from './context'
import { loadConfig } from './config'
```

**After (ESM):**
```typescript
import { createExecutionContext } from './context/index.js'
import { loadConfig } from './config/index.js'
```

### 4. __dirname 대체

**Before (CommonJS):**
```typescript
const templatePath = join(__dirname, 'templates', 'daily-report.hbs')
```

**After (ESM):**
```typescript
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const templatePath = join(__dirname, 'templates', 'daily-report.hbs')
```

## ESM 규칙

### 1. 상대 경로 Import

모든 상대 경로 import에 `.js` 확장자를 명시해야 합니다:

```typescript
// ✅ 올바른 예
import { something } from './module.js'
import { other } from '../types/index.js'

// ❌ 잘못된 예
import { something } from './module'
import { other } from '../types'
```

### 2. Index 파일

`index.ts` 파일을 import할 때는 `index.js`로 명시:

```typescript
// ✅ 올바른 예
import { something } from './utils/index.js'

// ❌ 잘못된 예
import { something } from './utils'
```

### 3. Node Modules

외부 패키지는 확장자 없이 import:

```typescript
// ✅ 올바른 예
import axios from 'axios'
import { z } from 'zod'

// ❌ 잘못된 예
import axios from 'axios.js'
```

## 실행 방법

### 개발 모드

```bash
npm run dev
```

### 빌드

```bash
npm run build
```

### 프로덕션 실행

```bash
npm start
```

## 주의사항

1. **TypeScript 컴파일**: TypeScript는 `.ts` 파일을 컴파일하지만, import 경로에는 `.js`를 사용해야 합니다.
2. **ts-node**: `--esm` 플래그가 필요합니다.
3. **__dirname**: ESM에서는 `import.meta.url`을 사용해야 합니다.

## 마이그레이션 체크리스트

- [x] package.json에 `"type": "module"` 추가
- [x] tsconfig.json에서 `"module": "ES2022"` 설정
- [x] 모든 상대 경로 import에 `.js` 확장자 추가
- [x] `__dirname` 사용처를 `import.meta.url`로 대체
- [x] ts-node에 `--esm` 플래그 추가
- [x] 모든 index.ts 파일의 export 경로 수정

## 참고 자료

- [Node.js ESM 문서](https://nodejs.org/api/esm.html)
- [TypeScript ESM 가이드](https://www.typescriptlang.org/docs/handbook/esm-node.html)
