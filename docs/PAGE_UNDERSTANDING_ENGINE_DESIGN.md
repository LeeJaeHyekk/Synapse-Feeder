# Page Understanding Engine 설계도

## 📋 목차
1. [핵심 개념](#핵심-개념)
2. [전체 아키텍처](#전체-아키텍처)
3. [단계별 상세 설계](#단계별-상세-설계)
4. [데이터 모델](#데이터-모델)
5. [전략 매트릭스](#전략-매트릭스)
6. [구현 계획](#구현-계획)
7. [마이그레이션 전략](#마이그레이션-전략)

---

## 🎯 핵심 개념

### 기존 방식 (사이트 중심)
```
사이트 A → Collector A
사이트 B → Collector B
사이트 C → Collector C
```

**문제점:**
- 사이트마다 Collector 필요
- DOM 변경 시 Collector 수정 필요
- 유사한 페이지도 중복 구현

### 새로운 방식 (페이지 이해 중심)
```
URL → 페이지 분석 → 정보 모델 → 전략 선택 → 수집
```

**핵심 원칙:**
> "크롤링을 먼저 하지 말고, 페이지를 분석해 '어떤 정보가 존재하는지'를 정의한 뒤 그 정보에 맞는 수집 전략을 실행하라."

---

## 🏗️ 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    URL 입력                                  │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              1. Page Loader                                  │
│  - axios로 초기 HTML GET                                     │
│  - 응답 헤더 수집                                            │
│  - 목적: "이 페이지가 비어있는지, 껍데기인지" 판단          │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              2. Page Analyzer                                │
│  ├─ HTML 정적 분석                                           │
│  │  ├─ 의미 있는 HTML 판단 (textLength > 2000)              │
│  │  ├─ JS 의존도 계산 (scriptCount, contentLength)          │
│  │  └─ 인라인 데이터 탐지 (window.__DATA__)                 │
│  │                                                           │
│  ├─ JS 실행 필요성 판단                                      │
│  │  └─ requiresJsExecution 계산                             │
│  │                                                           │
│  └─ API 탐지 (Playwright 경량 실행)                         │
│     └─ XHR/Fetch 요청 모니터링                              │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              3. Page Classification                          │
│  ├─ Rendering Type: STATIC | CSR                            │
│  ├─ Data Access Type: HTML | XHR | MIXED                    │
│  └─ Page Role: LIST_NOTICE | DETAIL_NOTICE | ...            │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              4. Information Extractor                        │
│  ├─ Content Block 탐지                                       │
│  │  ├─ LIST, DETAIL, TABLE, TEXT                           │
│  │  └─ Semantic Type: NOTICE, RECRUIT, EVENT                │
│  │                                                           │
│  └─ Field 자동 탐지 (휴리스틱)                              │
│     ├─ 날짜: /\d{4}-\d{2}-\d{2}/                           │
│     ├─ 부서: /팀$|부$|과$/                                  │
│     └─ 상세 URL: href 패턴 분석                             │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              5. Information Model Builder                   │
│  - ContentBlock[] → PageDataModel 변환                      │
│  - 페이지 기준 정규화 (Article 이전 단계)                   │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              6. Strategy Selector                            │
│  - PageAnalysis → CrawlStrategy 변환                         │
│  - 전략 매트릭스 기반 결정                                   │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              7. Dynamic Collector Execution                  │
│  ├─ LIST → Pagination 전략                                  │
│  ├─ DETAIL → detailUrl 재귀 수집                            │
│  └─ API → Batch 호출                                        │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              기존 Pipeline (유지)                            │
│  ├─ Raw Storage                                             │
│  ├─ Normalizer                                              │
│  ├─ Deduplicator                                            │
│  └─ DB Storage                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 단계별 상세 설계

### 1. Page Loader

**책임:** 초기 HTML 로드 (파싱 없음)

```typescript
interface LoadedPage {
  url: string
  initialHtml: string
  responseHeaders: Record<string, string>
  statusCode: number
  loadTimeMs: number
}

async function loadPage(url: string): Promise<LoadedPage> {
  const startTime = Date.now()
  const response = await axios.get(url, { timeout: 8000 })
  
  return {
    url,
    initialHtml: response.data,
    responseHeaders: response.headers,
    statusCode: response.status,
    loadTimeMs: Date.now() - startTime,
  }
}
```

**핵심:**
- 여기서는 절대 파싱하지 않음
- 목적: "이 페이지가 비어있는지, 껍데기인지" 판단

---

### 2. Page Analyzer

**책임:** 페이지의 정보 접근성 분석

```typescript
interface PageAnalysis {
  // HTML 분석 결과
  hasMeaningfulHtml: boolean
  htmlSignals: HtmlSignals
  
  // JS 의존도
  requiresJsExecution: boolean
  jsDependencyScore: number // 0~1
  
  // API 탐지
  detectedApis: DetectedApi[]
  dataAccessType: 'HTML' | 'XHR' | 'MIXED'
  
  // 렌더링 타입
  renderingType: 'STATIC' | 'CSR'
}

interface HtmlSignals {
  scriptCount: number
  inlineDataPresence: boolean // window.__DATA__, __INITIAL_STATE__
  noscriptOnly: boolean
  contentLength: number
  hasTable: boolean // tbody tr 존재
  hasArticle: boolean // article 태그 존재
}

interface DetectedApi {
  url: string
  method: string
  contentType: string
  requestBody?: unknown
}
```

#### 2-1. 의미 있는 HTML 판단

```typescript
function analyzeHtmlSignals(html: string): HtmlSignals {
  const $ = cheerio.load(html)
  
  return {
    scriptCount: $('script').length,
    inlineDataPresence: 
      html.includes('window.__DATA__') ||
      html.includes('__INITIAL_STATE__') ||
      html.includes('__NEXT_DATA__'),
    noscriptOnly: $('noscript').length > 0 && $('body').text().trim().length < 100,
    contentLength: html.length,
    hasTable: $('tbody tr').length > 3,
    hasArticle: $('article').length > 1,
  }
}

function hasMeaningfulHtml(signals: HtmlSignals): boolean {
  return (
    signals.contentLength > 2000 &&
    (signals.hasTable || signals.hasArticle)
  )
}
```

#### 2-2. JS 의존도 계산

```typescript
function calculateJsDependencyScore(signals: HtmlSignals): number {
  let score = 0
  
  // 스크립트가 많으면 동적일 가능성
  if (signals.scriptCount > 10) score += 0.4
  
  // HTML이 짧으면 동적일 가능성
  if (signals.contentLength < 5000) score += 0.4
  
  // 인라인 데이터가 있으면 정적일 가능성
  if (signals.inlineDataPresence) score -= 0.2
  
  return Math.max(0, Math.min(1, score))
}

function requiresJsExecution(score: number): boolean {
  return score > 0.5
}
```

#### 2-3. API 탐지 (Playwright 경량 실행)

```typescript
async function detectApis(url: string): Promise<DetectedApi[]> {
  // STATIC으로 판단되면 실행하지 않음
  if (!requiresJsExecution) return []
  
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const apis: DetectedApi[] = []
  
  page.on('response', (response) => {
    const request = response.request()
    if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
      apis.push({
        url: response.url(),
        method: request.method(),
        contentType: response.headers()['content-type'] || '',
      })
    }
  })
  
  await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 })
  await browser.close()
  
  return apis
}
```

---

### 3. Page Classification

**책임:** 분석 결과를 의미 있는 타입으로 변환

```typescript
interface PageProfile {
  renderingType: 'STATIC' | 'CSR'
  dataAccessType: 'HTML' | 'XHR' | 'MIXED'
  pageRole: PageRole
}

type PageRole =
  | 'LIST_NOTICE'
  | 'DETAIL_NOTICE'
  | 'LIST_RECRUIT'
  | 'DETAIL_RECRUIT'
  | 'LIST_EVENT'
  | 'DETAIL_EVENT'
  | 'STATIC_PAGE'
  | 'UNKNOWN'

function classifyPage(
  url: string,
  html: string,
  analysis: PageAnalysis
): PageProfile {
  // Rendering Type
  const renderingType = analysis.renderingType
  
  // Data Access Type
  const dataAccessType = 
    analysis.detectedApis.length > 0 && analysis.hasMeaningfulHtml
      ? 'MIXED'
      : analysis.detectedApis.length > 0
      ? 'XHR'
      : 'HTML'
  
  // Page Role (휴리스틱)
  const pageRole = inferPageRole(url, html)
  
  return {
    renderingType,
    dataAccessType,
    pageRole,
  }
}

function inferPageRole(url: string, html: string): PageRole {
  const lowerUrl = url.toLowerCase()
  const lowerHtml = html.toLowerCase()
  
  // 공지사항
  if (lowerUrl.includes('notice') || lowerHtml.includes('공지')) {
    return html.includes('tbody tr') ? 'LIST_NOTICE' : 'DETAIL_NOTICE'
  }
  
  // 채용
  if (lowerUrl.includes('recruit') || lowerHtml.includes('채용')) {
    return html.includes('tbody tr') ? 'LIST_RECRUIT' : 'DETAIL_RECRUIT'
  }
  
  // 행사
  if (lowerUrl.includes('event') || lowerHtml.includes('행사')) {
    return html.includes('tbody tr') ? 'LIST_EVENT' : 'DETAIL_EVENT'
  }
  
  return 'STATIC_PAGE'
}
```

**핵심:**
- 완벽하지 않아도 됨
- 잘못 분류되면 config에서 override 가능

---

### 4. Information Extractor

**책임:** 페이지에서 정보 단위 추출

```typescript
interface ContentBlock {
  blockType: 'LIST' | 'DETAIL' | 'TABLE' | 'TEXT'
  semanticType: 'NOTICE' | 'RECRUIT' | 'EVENT' | 'UNKNOWN'
  fields: DetectedField[]
  selector?: string // 발견된 셀렉터
}

interface DetectedField {
  name: string // 'title', 'date', 'author', 'department', 'views', 'detailUrl'
  selector?: string
  pattern?: RegExp
  confidence: number // 0~1
}

function extractContentBlocks(
  html: string,
  pageRole: PageRole
): ContentBlock[] {
  const $ = cheerio.load(html)
  const blocks: ContentBlock[] = []
  
  // 테이블 기반 리스트 탐지
  const tables = $('table tbody')
  if (tables.length > 0) {
    const firstRow = tables.first().find('tr').first()
    const fields = detectFieldsFromRow(firstRow, $)
    
    blocks.push({
      blockType: 'TABLE',
      semanticType: inferSemanticType(pageRole),
      fields,
      selector: 'table tbody tr',
    })
  }
  
  // article 기반 리스트 탐지
  const articles = $('article, .article, .post')
  if (articles.length > 1) {
    const firstArticle = articles.first()
    const fields = detectFieldsFromElement(firstArticle, $)
    
    blocks.push({
      blockType: 'LIST',
      semanticType: inferSemanticType(pageRole),
      fields,
      selector: 'article, .article, .post',
    })
  }
  
  return blocks
}

function detectFieldsFromRow(row: cheerio.Cheerio, $: cheerio.CheerioAPI): DetectedField[] {
  const fields: DetectedField[] = []
  const cells = row.find('td')
  
  cells.each((_, cell) => {
    const $cell = $(cell)
    const text = $cell.text().trim()
    
    // 날짜 필드
    if (/\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2}/.test(text)) {
      fields.push({
        name: 'date',
        selector: 'td',
        confidence: 0.9,
      })
    }
    
    // 부서 필드
    if (/팀$|부$|과$/.test(text)) {
      fields.push({
        name: 'department',
        selector: 'td',
        confidence: 0.7,
      })
    }
    
    // 조회수 필드
    if (/^\d+$/.test(text) && parseInt(text) > 0 && parseInt(text) < 1000000) {
      fields.push({
        name: 'views',
        selector: 'td',
        confidence: 0.6,
      })
    }
    
    // 링크가 있으면 제목 또는 상세 URL
    const link = $cell.find('a').first()
    if (link.length > 0) {
      const href = link.attr('href')
      if (href && (href.includes('rNo=') || href.includes('view') || href.includes('detail'))) {
        fields.push({
          name: 'detailUrl',
          selector: 'td a',
          confidence: 0.8,
        })
      } else {
        fields.push({
          name: 'title',
          selector: 'td a',
          confidence: 0.9,
        })
      }
    }
  })
  
  return fields
}
```

---

### 5. Information Model Builder

**책임:** ContentBlock을 PageDataModel로 변환

```typescript
interface PageDataModel {
  pageUrl: string
  blocks: ContentBlock[]
  items: ExtractedItem[] // 실제 추출된 데이터
}

interface ExtractedItem {
  blockType: string
  semanticType: string
  fields: Record<string, string>
}

function buildPageDataModel(
  html: string,
  blocks: ContentBlock[],
  baseUrl: string
): PageDataModel {
  const $ = cheerio.load(html)
  const items: ExtractedItem[] = []
  
  for (const block of blocks) {
    if (!block.selector) continue
    
    const elements = $(block.selector)
    
    elements.each((_, el) => {
      const $el = $(el)
      const item: ExtractedItem = {
        blockType: block.blockType,
        semanticType: block.semanticType,
        fields: {},
      }
      
      // 각 필드 추출
      for (const field of block.fields) {
        if (field.selector) {
          const value = extractFieldValue($el, field, baseUrl)
          if (value) {
            item.fields[field.name] = value
          }
        }
      }
      
      if (Object.keys(item.fields).length > 0) {
        items.push(item)
      }
    })
  }
  
  return {
    pageUrl: baseUrl,
    blocks,
    items,
  }
}

function extractFieldValue(
  $el: cheerio.Cheerio,
  field: DetectedField,
  baseUrl: string
): string | undefined {
  if (!field.selector) return undefined
  
  const element = $el.find(field.selector).first()
  if (element.length === 0) return undefined
  
  if (field.name === 'detailUrl') {
    const href = element.attr('href')
    return href ? new URL(href, baseUrl).href : undefined
  }
  
  return element.text().trim() || undefined
}
```

---

### 6. Strategy Selector

**책임:** PageAnalysis를 CrawlStrategy로 변환

```typescript
interface CrawlStrategy {
  fetcher: 'AXIOS' | 'PLAYWRIGHT'
  parser: 'LIST' | 'DETAIL' | 'API' | 'MIXED'
  retryPolicy: RetryPolicy
  timeoutMs: number
  useReadability: boolean // @mozilla/readability 사용 여부
}

interface RetryPolicy {
  maxRetries: number
  backoffMs: number
  strategy: 'exponential' | 'linear' | 'fixed'
}

function selectStrategy(analysis: PageAnalysis, profile: PageProfile): CrawlStrategy {
  // 전략 매트릭스 기반 결정
  let fetcher: 'AXIOS' | 'PLAYWRIGHT' = 'AXIOS'
  let parser: 'LIST' | 'DETAIL' | 'API' | 'MIXED' = 'LIST'
  
  // Fetcher 결정
  if (profile.renderingType === 'STATIC' && profile.dataAccessType === 'HTML') {
    fetcher = 'AXIOS'
  } else if (profile.renderingType === 'CSR') {
    fetcher = 'PLAYWRIGHT'
  } else if (profile.dataAccessType === 'XHR' && analysis.detectedApis.length > 0) {
    fetcher = 'PLAYWRIGHT'
    parser = 'API'
  }
  
  // Parser 결정
  if (profile.pageRole.startsWith('LIST_')) {
    parser = 'LIST'
  } else if (profile.pageRole.startsWith('DETAIL_')) {
    parser = 'DETAIL'
  }
  
  // Readability 사용 여부
  const useReadability = 
    profile.pageRole.startsWith('DETAIL_') ||
    (analysis.hasMeaningfulHtml && analysis.jsDependencyScore < 0.3)
  
  return {
    fetcher,
    parser,
    retryPolicy: {
      maxRetries: fetcher === 'PLAYWRIGHT' ? 2 : 3,
      backoffMs: fetcher === 'PLAYWRIGHT' ? 2000 : 1000,
      strategy: 'exponential',
    },
    timeoutMs: fetcher === 'PLAYWRIGHT' ? 30000 : 15000,
    useReadability,
  }
}
```

---

### 7. 전략 매트릭스

| Rendering | DataAccess | Fetcher | Parser | Readability |
|-----------|------------|---------|--------|-------------|
| STATIC | HTML | AXIOS | LIST/DETAIL | Optional |
| STATIC | XHR | AXIOS | API | No |
| CSR | HTML | PLAYWRIGHT | LIST/DETAIL | Yes |
| CSR | XHR | PLAYWRIGHT | API | No |
| CSR | MIXED | PLAYWRIGHT | MIXED | Yes |

---

## 📁 디렉토리 구조

```
src/
├── analyzer/                    # 새로운 모듈
│   ├── PageLoader.ts           # 1. 페이지 로드
│   ├── PageAnalyzer.ts          # 2. 페이지 분석
│   ├── PageClassifier.ts        # 3. 페이지 분류
│   ├── InformationExtractor.ts # 4. 정보 추출
│   ├── ModelBuilder.ts         # 5. 모델 빌더
│   └── StrategySelector.ts      # 6. 전략 선택
│
├── collectors/                 # 기존 구조 유지
│   ├── base/
│   │   ├── BaseWebCollector.ts
│   │   └── BaseRenderCollector.ts
│   ├── dynamic/                # 새로운 동적 Collector
│   │   ├── DynamicCollector.ts # 전략 기반 실행
│   │   └── strategies/
│   │       ├── AxiosStrategy.ts
│   │       ├── PlaywrightStrategy.ts
│   │       └── ApiStrategy.ts
│   └── ...
│
├── parsers/                    # 새로운 Schema-driven Parser
│   ├── ListParser.ts
│   ├── DetailParser.ts
│   ├── ApiParser.ts
│   └── schemas/
│       ├── NoticeSchema.ts
│       ├── RecruitSchema.ts
│       └── EventSchema.ts
│
└── config/                     # Config 구조 변경
    ├── PageConfig.ts           # 페이지별 설정
    └── StrategyOverride.ts     # 전략 오버라이드
```

---

## 🔄 실행 흐름 예시

### 예시 1: KLCA 공지사항 리스트

```
1. Page Loader
   → HTML 로드 (2000자 이상, 테이블 존재)

2. Page Analyzer
   → hasMeaningfulHtml: true
   → jsDependencyScore: 0.2
   → requiresJsExecution: false
   → detectedApis: []

3. Page Classification
   → renderingType: STATIC
   → dataAccessType: HTML
   → pageRole: LIST_NOTICE

4. Information Extractor
   → ContentBlock 발견:
     - blockType: TABLE
     - semanticType: NOTICE
     - fields: [title, date, department, views, detailUrl]

5. Strategy Selector
   → fetcher: AXIOS
   → parser: LIST
   → useReadability: false

6. Dynamic Collector Execution
   → AxiosStrategy 실행
   → ListParser로 파싱
   → 각 항목의 detailUrl로 재귀 수집
```

### 예시 2: 네이버 CSR 페이지

```
1. Page Loader
   → HTML 로드 (짧음, 껍데기)

2. Page Analyzer
   → hasMeaningfulHtml: false
   → jsDependencyScore: 0.8
   → requiresJsExecution: true
   → Playwright로 API 탐지
   → detectedApis: [{ url: '/api/notices', method: 'GET' }]

3. Page Classification
   → renderingType: CSR
   → dataAccessType: XHR
   → pageRole: LIST_NOTICE

4. Strategy Selector
   → fetcher: PLAYWRIGHT
   → parser: API

5. Dynamic Collector Execution
   → PlaywrightStrategy 실행
   → API 재현하여 데이터 수집
```

---

## 🚀 구현 계획

### Phase 1: 기반 구조 (1주)
- [ ] PageLoader 구현
- [ ] PageAnalyzer 기본 구현 (HTML 분석)
- [ ] 타입 정의 완료

### Phase 2: 분석 고도화 (1주)
- [ ] JS 의존도 계산 로직
- [ ] API 탐지 (Playwright 경량)
- [ ] PageClassification 구현

### Phase 3: 정보 추출 (1주)
- [ ] InformationExtractor 구현
- [ ] Field 자동 탐지 로직
- [ ] ModelBuilder 구현

### Phase 4: 전략 시스템 (1주)
- [ ] StrategySelector 구현
- [ ] DynamicCollector 구현
- [ ] Strategy 구현 (Axios, Playwright, API)

### Phase 5: 통합 및 테스트 (1주)
- [ ] 기존 Collector와 통합
- [ ] 테스트 케이스 작성
- [ ] 문서화

---

## 🔀 마이그레이션 전략

### 단계적 전환

1. **하이브리드 모드**
   - 기존 Collector 유지
   - 새로운 Page Understanding Engine 병행
   - 결과 비교 및 검증

2. **점진적 전환**
   - 사이트별로 하나씩 전환
   - 성공 검증 후 다음 사이트로

3. **Config 기반 제어**
   ```typescript
   {
     "sources": [
       {
         "name": "klca",
         "usePageEngine": true,  // 새 엔진 사용
         "override": {
           "pageRole": "LIST_NOTICE",
           "fetcher": "AXIOS"
         }
       },
       {
         "name": "naver",
         "usePageEngine": false, // 기존 Collector 사용
         "collector": "NaverCollector"
       }
     ]
   }
   ```

---

## 📊 기대 효과

### 1. 확장성
- ✅ 새 사이트 추가 시 Config만 수정
- ✅ Collector 파일 폭발 방지

### 2. 유지보수성
- ✅ DOM 변경 시 자동 적응 (일부)
- ✅ 전략만 수정하면 전체 적용

### 3. 정확도
- ✅ 페이지 분석 기반 최적 전략 선택
- ✅ 불필요한 Playwright 사용 방지

### 4. 이식성
- ✅ Python 전환 시 구조 유지
- ✅ 각 단계가 명확히 분리

---

## 🎯 핵심 문장

> **"사이트를 크롤링하지 말고, 페이지를 '판별'한 다음 그 성격에 맞는 전략을 실행하라."**

이것이 크롤러 → 스크래퍼 → ETL을 넘어선 **"페이지 이해 엔진(Page Understanding Engine)"** 설계입니다.
