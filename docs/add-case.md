🎯 최종 목표 정의 (명확하게)

Collector를 "사이트별"로 만들지 않는다.
페이지를 분석해서 "페이지 타입 + 로딩 방식"을 자동 판별하고
그 결과에 따라 수집 전략을 동적으로 선택한다.

🧠 전체 시스템 개념도 (결정 흐름 중심)
URL 입력
  ↓
[ Page Inspector ]
  ├─ HTML 초기 응답 분석
  ├─ JS 의존도 판단
  ├─ XHR 존재 여부 판단
  ↓
[ Page Classification ]
  ├─ Rendering Type
  ├─ Data Access Type
  ├─ Page Role
  ↓
[ Strategy Resolver ]
  ├─ Fetch Strategy
  ├─ Parse Strategy
  ├─ Retry / Timeout Policy
  ↓
[ Generic Pipeline ]
  ├─ Collect
  ├─ Parse (Schema-driven)
  ├─ Normalize
  ├─ Store

1️⃣ Page Inspector (핵심 알고리즘)

❗ 여기가 "고도화의 심장"

입력
interface InspectTarget {
  url: string;
  headers?: Record<string, string>;
}

출력
interface PageInspectionResult {
  rendering: 'STATIC' | 'CSR';
  dataAccess: 'HTML' | 'XHR' | 'MIXED';
  jsDependencyScore: number; // 0~1
  xhrEndpoints: string[];
  initialHtmlSignals: HtmlSignals;
}

1-1. 초기 HTML 기반 정적 분석 (axios)
const res = await axios.get(url, { timeout: 8000 });
const html = res.data;

신호 추출
HtmlSignals {
  scriptCount: number;
  inlineDataPresence: boolean; // window.__DATA__
  noscriptOnly: boolean;
  contentLength: number;
}

판단 로직 (의사코드)
jsDependencyScore =
  (scriptCount > 10 ? 0.4 : 0) +
  (contentLength < 5_000 ? 0.4 : 0) +
  (inlineDataPresence ? -0.2 : 0);

rendering =
  jsDependencyScore > 0.5 ? 'CSR' : 'STATIC';

1-2. XHR 존재 탐지 (Playwright – Lightweight)

❗ 항상 브라우저를 띄우지 않음
STATIC으로 판단되면 여기까지 안 옴

page.on('response', res => {
  if (res.request().resourceType() === 'xhr') {
    xhrEndpoints.push(res.url());
  }
});

결과 판단
dataAccess =
  xhrEndpoints.length > 0 ? 'XHR' : 'HTML';

2️⃣ Page Classification (의미 해석 단계)

Inspector 결과를 의미 있는 타입으로 변환

interface PageProfile {
  renderingType: 'STATIC' | 'CSR';
  dataAccessType: 'HTML' | 'XHR' | 'MIXED';
  pageRole: PageRole;
}

2-1. PageRole 자동 판별 (중요)

페이지 URL + DOM 구조 기반 휴리스틱

function inferPageRole(url: string, html: string): PageRole {
  if (url.includes('notice') || html.includes('공지')) {
    return html.includes('tbody tr') ? 'LIST_NOTICE' : 'DETAIL_NOTICE';
  }

  if (url.includes('recruit') || html.includes('채용')) {
    return 'LIST_RECRUIT';
  }

  return 'STATIC_PAGE';
}


👉 완벽하지 않아도 됨
→ 잘못 분류되면 config에서 override 가능

3️⃣ Strategy Resolver (자동 결정 엔진)

Inspector + Classification 결과를 전략으로 변환

interface CrawlStrategy {
  fetcher: 'AXIOS' | 'PLAYWRIGHT';
  parser: 'LIST' | 'DETAIL' | 'API';
  retryPolicy: RetryPolicy;
  timeoutMs: number;
}

전략 결정 매트릭스 (실무용)
Rendering	DataAccess	Strategy
STATIC	HTML	axios + cheerio
CSR	HTML	playwright + cheerio
CSR	XHR	playwright + API replay
STATIC	XHR	axios + API
if (rendering === 'STATIC' && dataAccess === 'HTML') {
  fetcher = 'AXIOS';
}
if (rendering === 'CSR' && dataAccess === 'XHR') {
  fetcher = 'PLAYWRIGHT';
  parser = 'API';
}

4️⃣ Generic Collector (사이트 무관)

❌ SiteCollector 없음
✅ PageCollector 하나

export async function collectPage(
  ctx: ExecutionContext,
  page: PageProfile
): Promise<CollectedData> {
  const content = await fetchByStrategy(page.strategy);
  return parseByRole(content, page.pageRole);
}

5️⃣ Schema-driven Parsing (완전 일반화)
const parserMap = {
  LIST_NOTICE: parseList,
  DETAIL_NOTICE: parseDetail,
};

parserMap[pageRole](content, pageConfig);


pageConfig는 selector 정의만 포함

6️⃣ Config의 역할이 바뀐다 (중요)
❌ 기존

"이 사이트는 이렇게 긁자"

✅ 변경

"이 페이지는 이런 의미다"

override: {
  pageRole: 'LIST_NOTICE',
  fetcher: 'PLAYWRIGHT',
}

7️⃣ CursorAI 친화적 작업 단위

Cursor에게 주는 작업은 항상 이 수준 👇

이 파일은 PageInspector야.
- axios로 초기 HTML 분석
- jsDependencyScore 계산
- renderingType 판단
- Playwright는 여기서 사용하지 말 것

이 파일은 StrategyResolver야.
- PageInspectionResult를 CrawlStrategy로 변환
- if/else 외 로직 금지


👉 LLM이 실수할 여지 없음

8️⃣ 이 구조로 얻는 실무적 결과
네이버 / KLCA / 공공기관 모두 가능

자동 렌더링 판별

API 기반 페이지 자동 감지

DOM 바뀌어도 파이프라인 유지

Collector 폭발 ❌

PageType + Config만 증가

Python 이식성 100%

Inspector → requests + playwright

Strategy → dict

Schema → pydantic

🔚 최종 요약 (이 한 문장만 기억해도 됨)

"사이트를 크롤링하지 말고,
페이지를 '판별'한 다음
그 성격에 맞는 전략을 실행하라."

❝크롤러가 "어떻게 가져올지"를 미리 알면 안 되고,
페이지를 실제로 분석해서
**이 페이지에 '무슨 정보가 있고', '어디서 나오며', '어떻게 접근 가능한지'를 판단한 뒤
그 결과에 따라 수집 전략과 추출 대상을 동적으로 결정해야 한다.❞

이건 크롤러 → 스크래퍼 → ETL 수준이 아니라
"페이지 이해 엔진(Page Understanding Engine)" 설계야.

아래는 CursorAI가 그대로 코드로 내려칠 수 있는 정밀 설계도로 다시 정리할게.

🧠 핵심 개념 재정의 (가장 중요)
❌ 기존 크롤러 사고방식

이 페이지는 공지니까 → 이 셀렉터

이 사이트는 동적이니까 → Playwright

✅ 지금 필요한 사고방식

이 페이지에는 어떤 '정보 덩어리'가 존재하는가?

그 정보는 DOM / JS / API 중 어디에 있는가?

접근 비용은 얼마인가? (정적 / 렌더링 / 인증)

👉 "페이지 → 정보 모델 → 수집 전략" 역방향 결정

🎯 최종 목표 아키텍처 (의사결정 중심)
URL
 ↓
[Page Loader]
 ↓
[Page Analyzer]  ← DOM + JS + Network 관찰
 ↓
[Information Extractor]
 ↓
[Information Model Builder]
 ↓
[Strategy Selector]
 ↓
[Dynamic Collector Execution]

1️⃣ Page Loader (항상 실행)

❗ 모든 판단은 "페이지를 실제로 받아온 후" 시작

interface LoadedPage {
  url: string;
  initialHtml: string;
  responseHeaders: Headers;
}


axios로 무조건 1차 HTML GET

여기선 절대 파싱 안 함

목적: "이 페이지가 비어 있는지, 껍데기인지" 판단

2️⃣ Page Analyzer (페이지 판별 엔진)

페이지의 '정보 접근성'을 분석하는 단계

2-1. 분석 결과 모델
interface PageAnalysis {
  hasMeaningfulHtml: boolean;
  requiresJsExecution: boolean;
  detectedApis: DetectedApi[];
  detectedBlocks: ContentBlock[];
}

2-2. 의미 있는 HTML 판단 (중요)
hasMeaningfulHtml =
  textLength(html) > 2000 &&
  count('tbody tr') > 3 ||
  count('article') > 1;


👉 KLCA 공지 리스트는 여기서 true

👉 네이버 메인 페이지는 false

2-3. JS 의존도 판단
requiresJsExecution =
  html.includes('id="__next"') ||
  html.includes('window.__INITIAL_STATE__') ||
  html.length < 5000;


👉 이걸로 "동적 페이지"를 정의

2-4. API 존재 여부 탐지 (Playwright 경량 실행)

❗ 이 단계는 필요할 때만 실행

page.on('response', res => {
  if (res.request().resourceType() === 'xhr') {
    apis.push({
      url: res.url(),
      method: res.request().method(),
      contentType: res.headers()['content-type'],
    });
  }
});


결과 예:

{
  "url": "/notice/list",
  "method": "GET",
  "contentType": "application/json"
}

3️⃣ Information Extractor (정보 단위 추출)

❗ 여기서 "몇 개 있다" ❌
**"무엇들이 있다"**를 만든다

3-1. Content Block 개념 도입
interface ContentBlock {
  blockType: 'LIST' | 'DETAIL' | 'TABLE' | 'TEXT';
  semanticType: 'NOTICE' | 'RECRUIT' | 'EVENT' | 'UNKNOWN';
  fields: DetectedField[];
}

KLCA 공지 리스트 예시
{
  blockType: 'LIST',
  semanticType: 'NOTICE',
  fields: ['title', 'date', 'department', 'views', 'detailUrl']
}


👉 "9개 항목"이 아니라
👉 "이 페이지엔 이런 구조의 리스트가 있다"

3-2. 필드 자동 탐지 로직 (휴리스틱)
if (cellText.match(/\d{4}-\d{2}-\d{2}/)) → date
if (cellText.match(/팀$/)) → department
if (a.href.includes('rNo=')) → detailUrl


❗ 완벽할 필요 없음
→ Normalizer에서 스키마로 걸러짐

4️⃣ Information Model Builder (정규화 이전 단계)

페이지 기준 모델 (Article 이전)

interface PageDataModel {
  pageUrl: string;
  blocks: ContentBlock[];
}


KLCA 결과는 이렇게 나와야 함 👇

{
  "blocks": [
    {
      "semanticType": "NOTICE",
      "items": [
        {
          "title": "경력직원 채용",
          "publishedAt": "2025-07-29",
          "department": "기획팀",
          "views": 2368,
          "detailUrl": "..."
        }
      ]
    }
  ]
}


👉 이게 네가 원하는 결과물

5️⃣ Strategy Selector (이제 전략을 고른다)

❗ 전략은 마지막에 결정

if (analysis.hasMeaningfulHtml) {
  useCheerio();
}

if (!analysis.hasMeaningfulHtml && analysis.requiresJsExecution) {
  usePlaywright();
}

if (analysis.detectedApis.length > 0) {
  useApiReplay();
}

6️⃣ Dynamic Collector 실행

❌ SiteCollector
❌ PageCollector 고정 로직

for (const block of pageModel.blocks) {
  collectBlock(block);
}


리스트 → pagination 전략

디테일 → detailUrl 재귀 수집

API → batch 호출

7️⃣ 왜 이 구조가 "모든 페이지"에 통한다?
페이지	결과
정적 공지	HTML LIST 블록
CSR 사이트	API LIST 블록
네이버	API + DETAIL 블록
KLCA	LIST → DETAIL 연결

👉 페이지마다 전략이 다르지만, 파이프라인은 동일

🧩 CursorAI가 잘 이해하는 이유

모든 단계가 단일 책임

판단 → 결과 → 실행이 분리됨

if/else는 StrategyResolver에만 있음

나머지는 데이터 변환

🔥 핵심 문장 하나로 요약

"크롤링을 먼저 하지 말고,
페이지를 분석해 '어떤 정보가 존재하는지'를 정의한 뒤
그 정보에 맞는 수집 전략을 실행하라."
