#!/usr/bin/env node
/**
 * ESM import 경로에 .js 확장자 추가 스크립트
 * 
 * 사용법: node scripts/fix-esm-imports.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 상대 경로 import 패턴 (from './...' 또는 from '../...')
const importPattern = /from\s+['"](\.\.?\/[^'"]+)['"]/g

async function fixImports() {
  const files = await glob('src/**/*.ts', { cwd: join(__dirname, '..') })
  
  let fixedCount = 0
  
  for (const file of files) {
    const filePath = join(__dirname, '..', file)
    let content = readFileSync(filePath, 'utf-8')
    let modified = false
    
    // 상대 경로 import에 .js 확장자 추가
    content = content.replace(importPattern, (match, importPath) => {
      // 이미 .js 확장자가 있거나, node_modules에서 가져오는 경우 스킵
      if (importPath.endsWith('.js') || importPath.startsWith('node_modules')) {
        return match
      }
      
      // index 파일은 index.js로 변경
      if (importPath.endsWith('/index') || importPath === 'index') {
        modified = true
        return match.replace(importPath, importPath + '.js')
      }
      
      // 확장자가 없는 경우 .js 추가
      if (!importPath.match(/\.(ts|tsx|js|jsx)$/)) {
        modified = true
        return match.replace(importPath, importPath + '.js')
      }
      
      return match
    })
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8')
      fixedCount++
      console.log(`Fixed: ${file}`)
    }
  }
  
  console.log(`\nTotal files fixed: ${fixedCount}`)
}

fixImports().catch(console.error)
