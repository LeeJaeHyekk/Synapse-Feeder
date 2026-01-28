1️⃣ Collector 계약 정의
📄 src/collectors/BaseCollector.ts
/**
 * Collector는 "데이터 수집"만 책임진다.
 * - 파싱/정규화/저장/전송 절대 금지
 * - 반환 데이터는 무조건 Raw (unknown)
 */
export interface BaseCollector {
  /**
   * source 식별자 (파일명 / Slack 그룹핑 / 로그 기준)
   * 예: "site_a", "api_b"
   */
  readonly sourceName: string;

  /**
   * Raw 데이터 수집
   * - 어떤 구조든 허용
   * - 단, 배열이어야 함
   */
  collect(): Promise<Record<string, unknown>[]>;
}


📌 의도

any 완전 차단

Collector는 **“몰라도 된다”**를 전제로 설계

Python 이식 시 → ABC + abstractmethod collect()

📄 src/collectors/index.ts (Registry)
import { BaseCollector } from './BaseCollector';

// 실제 구현체
import { SiteACollector } from './web/SiteACollector';
import { ApiBCollector } from './api/ApiBCollector';

/**
 * Orchestrator가 사용할 Collector 목록
 * 👉 신규 소스 추가 시 여기만 수정
 */
export function loadCollectors(): BaseCollector[] {
  return [
    new SiteACollector(),
    new ApiBCollector(),
  ];
}


📌 실무 포인트

동적 로딩 ❌ (초기엔 복잡도만 증가)

명시적 등록 → 장애 원인 추적 쉬움

2️⃣ Normalizer – Schema Gate
📄 src/normalizers/article.schema.ts
import { z } from 'zod';

/**
 * 시스템 전체에서 "신뢰 가능한 Article"
 * 이 스키마를 통과하지 못하면 저장/전송 불가
 */
export const ArticleSchema = z.object({
  source: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  publishedAt: z.date(),
  content: z.string().min(1),
});

export type Article = z.infer<typeof ArticleSchema>;


📌 중요

optional ❌

default ❌

“없으면 실패”가 맞다 → 크롤링은 신뢰성 게임

📄 src/normalizers/utils/parseDate.ts
import dayjs from 'dayjs';

/**
 * 날짜 파싱 실패 시 즉시 throw
 * → normalize 단계에서 걸러짐
 */
export function parseDate(input: unknown): Date {
  if (typeof input === 'string' || typeof input === 'number') {
    const d = dayjs(input);
    if (d.isValid()) {
      return d.toDate();
    }
  }

  throw new Error(`Invalid date value: ${String(input)}`);
}

📄 src/normalizers/utils/sanitizeHtml.ts
import sanitize from 'sanitize-html';

/**
 * HTML → text 정제
 * XSS 방지 목적 아님 (내부 데이터)
 */
export function sanitizeHtml(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  return sanitize(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

📄 src/normalizers/article.normalizer.ts
import { Article, ArticleSchema } from './article.schema';
import { parseDate } from './utils/parseDate';
import { sanitizeHtml } from './utils/sanitizeHtml';

/**
 * Raw → Article[]
 * 이 함수를 통과한 데이터는 "절대 신뢰"
 */
export function normalizeArticles(
  rawList: Record<string, unknown>[],
  source: string
): Article[] {
  return rawList.map((raw, index) => {
    try {
      return ArticleSchema.parse({
        source,
        title: raw['title'],
        url: raw['url'],
        publishedAt: parseDate(raw['publishedAt'] ?? raw['date']),
        content: sanitizeHtml(raw['content']),
      });
    } catch (err) {
      throw new Error(
        `[NormalizeError] source=${source}, index=${index}, reason=${String(err)}`
      );
    }
  });
}


📌 의도

Collector는 실패 허용

Normalizer 실패는 “데이터 자체 문제”

어디서 깨졌는지 index까지 로그 가능

3️⃣ (보너스) Collector 예제 1개
📄 src/collectors/web/SiteACollector.ts
import axios from 'axios';
import cheerio from 'cheerio';
import { BaseCollector } from '../BaseCollector';

export class SiteACollector implements BaseCollector {
  readonly sourceName = 'site_a';

  async collect(): Promise<Record<string, unknown>[]> {
    const res = await axios.get('https://example.com/news');
    const $ = cheerio.load(res.data);

    const items: Record<string, unknown>[] = [];

    $('.article').each((_, el) => {
      items.push({
        title: $(el).find('.title').text(),
        url: $(el).find('a').attr('href'),
        publishedAt: $(el).find('.date').text(),
        content: $(el).find('.content').html(),
      });
    });

    return items;
  }
}


📌 중요

여기서 날짜 파싱 ❌

여기서 HTML 정제 ❌

여기서 타입 단정 ❌

2️⃣ Orchestrator 구현 (중추 신경)
📄 src/app.ts
import { loadCollectors } from './collectors';
import { normalizeArticles } from './normalizers/article.normalizer';
import { saveRawData } from './storage/rawStorage';
import { createArticleRepository } from './storage/articleRepository';
import { formatDailyReport } from './formatter/dailyReport';
import { SlackNotifier } from './notifier/SlackNotifier';
import { logger } from './utils/logger';

export async function main(): Promise<void> {
  logger.info('🚀 Daily crawling job started');

  const collectors = loadCollectors();
  const repository = createArticleRepository();
  const notifier = new SlackNotifier();

  const allArticles = [];

  for (const collector of collectors) {
    logger.info(`🔍 Collecting from ${collector.sourceName}`);

    try {
      // 1. 수집
      const raw = await collector.collect();

      // 2. Raw 저장 (항상 먼저)
      await saveRawData(collector.sourceName, raw);

      // 3. 정규화
      const normalized = normalizeArticles(raw, collector.sourceName);

      // 4. DB 저장
      await repository.saveMany(normalized);

      allArticles.push(...normalized);

      logger.info(`✅ ${collector.sourceName}: ${normalized.length} items`);
    } catch (err) {
      logger.error(
        `[CollectorFailed] source=${collector.sourceName} error=${String(err)}`
      );

      // ❗ 실패해도 전체 중단 금지
      continue;
    }
  }

  // 5. 리포트 생성 & 전송
  try {
    const report = formatDailyReport(allArticles);
    await notifier.send(report);
    logger.info('📨 Slack report sent');
  } catch (err) {
    logger.error(`[NotifierFailed] ${String(err)}`);
  }

  logger.info('🏁 Daily crawling job finished');
}

📄 src/main.ts (엔트리 포인트)
import { main } from './app';

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


📌 중요

Node는 무조건 종료

복구는 cron이 담당

PM2 / forever ❌

3️⃣ Storage Layer 구현
3-1️⃣ Raw Storage (fs)
📄 src/storage/rawStorage.ts
import { promises as fs } from 'fs';
import path from 'path';
import dayjs from 'dayjs';

const BASE_DIR = path.resolve(process.cwd(), 'data/raw');

export async function saveRawData(
  source: string,
  data: unknown[]
): Promise<void> {
  const date = dayjs().format('YYYY-MM-DD');
  const dir = path.join(BASE_DIR, date);

  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${source}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}


📌 실무 포인트

실패 시 throw → Orchestrator에서 격리

Raw는 정규화 이전 데이터

재처리·감사 대응 핵심

3-2️⃣ SQLite Repository (정형 데이터)
선택 라이브러리

better-sqlite3 (동기 + 안정성)

cron 단발 실행에 최적

📄 src/storage/db.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'data/articles.db');

export const db = new Database(dbPath);

// 앱 시작 시 테이블 보장
db.exec(`
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

📄 src/storage/articleRepository.ts
import { Article } from '../normalizers/article.schema';
import { db } from './db';
import dayjs from 'dayjs';

export interface ArticleRepository {
  saveMany(articles: Article[]): Promise<void>;
}

class SQLiteArticleRepository implements ArticleRepository {
  async saveMany(articles: Article[]): Promise<void> {
    if (articles.length === 0) return;

    const stmt = db.prepare(`
      INSERT INTO articles
      (source, title, url, published_at, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = dayjs().toISOString();

    const transaction = db.transaction((items: Article[]) => {
      for (const a of items) {
        stmt.run(
          a.source,
          a.title,
          a.url,
          a.publishedAt.toISOString(),
          a.content,
          now
        );
      }
    });

    transaction(articles);
  }
}

export function createArticleRepository(): ArticleRepository {
  return new SQLiteArticleRepository();
}


📌 설계 의도

Repository는 도메인 의미 ❌

validation ❌

단순 insert만 수행

4️⃣ (필수) 최소 유틸
📄 src/utils/logger.ts
export const logger = {
  info: (msg: string) => {
    console.log(`[INFO] ${msg}`);
  },
  error: (msg: string) => {
    console.error(`[ERROR] ${msg}`);
  },
};

4️⃣ Formatter + Slack UX 최적화
목표 (실무 기준)

Slack에서 한눈에 읽힘

너무 길면 섹션별 분리

source 기준 자동 그룹핑

Python(Jinja2)로 1:1 이식 가능

📄 src/formatter/dailyReport.ts
import { Article } from '../normalizers/article.schema';
import dayjs from 'dayjs';
import Handlebars from 'handlebars';

type GroupedArticles = Record<string, Article[]>;

function groupBySource(articles: Article[]): GroupedArticles {
  return articles.reduce<GroupedArticles>((acc, article) => {
    acc[article.source] ??= [];
    acc[article.source].push(article);
    return acc;
  }, {});
}

const TEMPLATE = `
📊 *Daily Crawling Report*
🗓 {{date}}

{{#each sources}}
━━━━━━━━━━━━━━━━━━━━
*📰 {{source}}* ({{count}})
{{#each articles}}
• *{{title}}*
  {{#if summary}}_{{summary}}_{{/if}}
  🔗 {{url}}
{{/each}}

{{/each}}
`;

export function formatDailyReport(articles: Article[]): string {
  if (articles.length === 0) {
    return '📭 오늘 수집된 데이터가 없습니다.';
  }

  const grouped = groupBySource(articles);

  const sources = Object.entries(grouped).map(([source, items]) => ({
    source,
    count: items.length,
    articles: items.slice(0, 10).map(a => ({
      title: a.title,
      url: a.url,
      summary: a.content.slice(0, 120),
    })),
  }));

  const template = Handlebars.compile(TEMPLATE.trim());

  return template({
    date: dayjs().format('YYYY-MM-DD'),
    sources,
  });
}

Slack UX 설계 포인트

bold + emoji 최소 사용

한 source 당 최대 10개 (Slack 가독성)

너무 긴 content ❌

링크는 반드시 노출

📌 Slack에 잘 보이는 이유

Slack Markdown (*bold*, _italic_)만 사용

block kit ❌ → 유지보수 지옥 방지

Python 이식 시 Jinja2 거의 동일

4️⃣-1️⃣ Slack Notifier (실무 안전 설계)
📄 src/notifier/SlackNotifier.ts
import { WebClient } from '@slack/web-api';
import { logger } from '../utils/logger';

const token = process.env.SLACK_TOKEN!;
const channel = process.env.SLACK_CHANNEL!;

export class SlackNotifier {
  private client = new WebClient(token);

  async send(message: string): Promise<void> {
    try {
      await this.client.chat.postMessage({
        channel,
        text: message,
      });
    } catch (err) {
      // ❗ Slack 실패는 시스템 실패 아님
      logger.error(`[SlackSendFailed] ${String(err)}`);
    }
  }
}


📌 절대 throw 안 함
→ Slack 장애로 크롤링 시스템이 멈추면 안 됨

5️⃣ Docker + cron 컨테이너 (배포 완성)
목표

서버에 Docker만 있으면 됨

Node는 단발 실행

장애 복구 = cron 재실행

📄 Dockerfile
FROM node:20-slim

# cron 설치
RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성
COPY package*.json ./
RUN npm ci

# 소스
COPY . .

# 빌드
RUN npm run build

# cron 등록
COPY docker/crontab /etc/cron.d/daily-crawler
RUN chmod 0644 /etc/cron.d/daily-crawler && crontab /etc/cron.d/daily-crawler

# 로그 파일
RUN touch /var/log/crawler.log

CMD ["cron", "-f"]

📄 docker/crontab
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin

0 6 * * * node /app/dist/main.js >> /var/log/crawler.log 2>&1


📌 중요

PM2 ❌

forever ❌

cron이 재시작 책임

📄 .dockerignore
node_modules
data
.env
.git

📄 .env.example
SLACK_TOKEN=xoxb-xxxx
SLACK_CHANNEL=#daily-report

🧠 운영 관점에서 이 구조의 강점
항목	이유
장애 복구	cron 재실행
메모리 누수	없음 (단발 실행)
로그 추적	날짜별 cron 로그
Python 전환	파일 구조 그대로
확장	Collector만 추가

1️⃣ Playwright 기반 JS 렌더링 Collector 템플릿
언제 쓰는가

CSR / SPA (React, Vue)

스크롤 로딩

API가 숨겨진 사이트

👉 “최후의 수단”
가능하면 axios + cheerio 먼저.

📦 의존성
npm install playwright
npx playwright install chromium

📄 src/collectors/web/PlaywrightCollectorBase.ts
import { chromium, Browser, Page } from 'playwright';

/**
 * JS 렌더링 Collector 공통 베이스
 * - 브라우저 생명주기 캡슐화
 * - Orchestrator는 Playwright 존재를 모름
 */
export abstract class PlaywrightCollectorBase {
  protected abstract sourceName: string;
  protected abstract targetUrl: string;

  protected abstract parse(page: Page): Promise<Record<string, unknown>[]>;

  async collect(): Promise<Record<string, unknown>[]> {
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(this.targetUrl, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });

      return await this.parse(page);
    } finally {
      await browser?.close();
    }
  }
}

📄 src/collectors/web/SiteCCollector.ts
import { Page } from 'playwright';
import { PlaywrightCollectorBase } from './PlaywrightCollectorBase';

export class SiteCCollector extends PlaywrightCollectorBase {
  protected sourceName = 'site_c';
  protected targetUrl = 'https://example.com/app';

  protected async parse(page: Page): Promise<Record<string, unknown>[]> {
    await page.waitForSelector('.article');

    return page.$$eval('.article', els =>
      els.map(el => ({
        title: el.querySelector('.title')?.textContent,
        url: el.querySelector('a')?.getAttribute('href'),
        publishedAt: el.querySelector('.date')?.textContent,
        content: el.querySelector('.content')?.innerHTML,
      }))
    );
  }
}

운영 포인트

Collector 실패율 높음 → timeout 필수

사이트당 Playwright 1개만

매일 수십 개면 Python 전환 고려

2️⃣ 에러 전용 Slack 알림 분리 (운영 필수)

“보고용 Slack”과 “장애 Slack”은 절대 섞지 않는다

📄 src/notifier/ErrorNotifier.ts
export interface ErrorNotifier {
  notify(
    source: string,
    stage: 'collect' | 'normalize' | 'storage' | 'unknown',
    error: unknown
  ): Promise<void>;
}

📄 src/notifier/SlackErrorNotifier.ts
import { WebClient } from '@slack/web-api';
import { ErrorNotifier } from './ErrorNotifier';

export class SlackErrorNotifier implements ErrorNotifier {
  private client = new WebClient(process.env.SLACK_ERROR_TOKEN!);
  private channel = process.env.SLACK_ERROR_CHANNEL!;

  async notify(
    source: string,
    stage: string,
    error: unknown
  ): Promise<void> {
    await this.client.chat.postMessage({
      channel: this.channel,
      text: [
        '🚨 *Crawler Error*',
        `• Source: ${source}`,
        `• Stage: ${stage}`,
        `• Error: \`${String(error).slice(0, 500)}\``,
      ].join('\n'),
    });
  }
}

📄 app.ts 수정 포인트 (핵심)
catch (err) {
  logger.error(`[FAILED] ${collector.sourceName}`);
  await errorNotifier.notify(
    collector.sourceName,
    'collect',
    err
  );
}

결과

보고 Slack: 조용

장애 Slack: 즉시 반응

야간 장애 대응 가능

3️⃣ DB 중복 방지 (Unique Index)
중복 기준 (현실적)

source + url

날짜 기준 ❌ (사이트마다 다름)

📄 src/storage/db.ts 수정
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (source, url)
);

📄 articleRepository.ts 수정 (무시 삽입)
const stmt = db.prepare(`
  INSERT OR IGNORE INTO articles
  (source, title, url, published_at, content, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

효과

중복 크롤링 안전

재실행(cron 재시작) 안전

Raw 재처리 가능

4️⃣ Python 리팩토링 가이드 (파일별 대응표)

구조를 바꾸지 않는 리팩토링
→ 위험도 최저

📊 1:1 대응표
TypeScript	Python
interface BaseCollector	ABC + abstractmethod
Record<string, unknown>	dict[str, Any]
zod schema	pydantic BaseModel
normalizeArticles	Model.parse_obj
fs/promises	pathlib / json
better-sqlite3	SQLAlchemy
handlebars	jinja2
cron	cron
app.ts	main.py
예시 변환
TS
export interface BaseCollector {
  collect(): Promise<Record<string, unknown>[]>;
}

Python
class BaseCollector(ABC):
    @abstractmethod
    def collect(self) -> list[dict]:
        pass

TS → Python 전략 (중요)

Collector 그대로

Normalizer 먼저

Storage 마지막

Slack은 최후

👉 “눈에 보이는 결과”부터 옮기면 실패 확률 0


1️⃣ 사이트별 Rate Limit 정책 (Collector 레벨)
설계 핵심

❌ 전역 rate limit
❌ axios interceptor 공통 적용

✅ Collector마다 명시적 정책 보유
✅ Python 전환 시 1:1 이식 가능
✅ Cursor가 이해하기 쉬운 구조

1-1️⃣ RateLimit 정책 타입 정의
📄 src/policies/rateLimit.ts
export interface RateLimitPolicy {
  /**
   * 요청 간 최소 대기 시간 (ms)
   */
  minIntervalMs: number;

  /**
   * 연속 요청 허용 개수
   */
  maxRequests: number;

  /**
   * window 시간 (ms)
   */
  windowMs: number;
}

1-2️⃣ 간단하지만 실무용 RateLimiter

cron 단발 실행 기준 최적화
Redis ❌ / in-memory ✅

📄 src/utils/rateLimiter.ts
export class RateLimiter {
  private timestamps: number[] = [];

  constructor(private policy: RateLimitPolicy) {}

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // window 초과된 요청 제거
    this.timestamps = this.timestamps.filter(
      t => now - t < this.policy.windowMs
    );

    // 초과 시 대기
    if (this.timestamps.length >= this.policy.maxRequests) {
      const waitTime =
        this.policy.windowMs - (now - this.timestamps[0]);

      await new Promise(res => setTimeout(res, waitTime));
    }

    // 최소 간격 보장
    if (this.timestamps.length > 0) {
      const sinceLast = now - this.timestamps[this.timestamps.length - 1];
      if (sinceLast < this.policy.minIntervalMs) {
        await new Promise(res =>
          setTimeout(res, this.policy.minIntervalMs - sinceLast)
        );
      }
    }

    this.timestamps.push(Date.now());
  }
}

1-3️⃣ Collector에 정책 주입
📄 src/collectors/BaseCollector.ts (확장)
import { RateLimitPolicy } from '../policies/rateLimit';

export interface BaseCollector {
  readonly sourceName: string;

  /**
   * 사이트별 rate limit 정책
   * 없으면 제한 없음
   */
  readonly rateLimit?: RateLimitPolicy;

  collect(): Promise<Record<string, unknown>[]>;
}

1-4️⃣ Web Collector 예시
import { RateLimiter } from '../../utils/rateLimiter';

export class SiteACollector implements BaseCollector {
  sourceName = 'site_a';

  rateLimit = {
    minIntervalMs: 1000,
    maxRequests: 10,
    windowMs: 60_000,
  };

  private limiter = new RateLimiter(this.rateLimit);

  async collect() {
    await this.limiter.waitIfNeeded();

    const html = await fetchHtml();
    return parse(html);
  }
}


📌 의도

Rate Limit은 Collector의 책임

Orchestrator는 전혀 모름

Python → 동일 로직 구현 가능

2️⃣ Retry 전략 세분화 (실무 핵심)
Retry는 “무조건”이 아니라 조건부
상황	Retry
네트워크 타임아웃	✅
429 (Too Many Requests)	✅
5xx	✅
4xx (400, 404)	❌
파싱 오류	❌
normalize 실패	❌
2-1️⃣ Retry 정책 정의
📄 src/policies/retryPolicy.ts
export interface RetryPolicy {
  retries: number;
  backoffMs: number;
  retryOn: (error: unknown) => boolean;
}

2-2️⃣ Retry 유틸 (axios / fetch 공통)
📄 src/utils/retry.ts
export async function retry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;

      if (attempt > policy.retries || !policy.retryOn(err)) {
        throw err;
      }

      const delay = policy.backoffMs * attempt;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

2-3️⃣ HTTP 전용 Retry 조건
📄 src/utils/httpRetry.ts
import axios from 'axios';

export function isRetryableHttpError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;

  if (!status) return true; // network error
  if (status === 429) return true;
  if (status >= 500) return true;

  return false;
}

2-4️⃣ Collector에서 Retry 적용
import { retry } from '../../utils/retry';
import { isRetryableHttpError } from '../../utils/httpRetry';

async collect() {
  return retry(
    async () => {
      const res = await axios.get(this.url, { timeout: 10_000 });
      return res.data.items;
    },
    {
      retries: 3,
      backoffMs: 1000,
      retryOn: isRetryableHttpError,
    }
  );
}


📌 중요

Retry는 Collector 내부

Orchestrator는 “한 번만 호출”

실패 시 바로 다음 Collector 진행

3️⃣ 운영 기준 Best Practice 요약
Rate Limit

사이트당 명시적 정책

없는 사이트는 rateLimit 미정의

Playwright 사이트는 항상 느리게

Retry

Retry는 네트워크 전용

파싱/정규화는 재시도 ❌

Slack 실패는 retry ❌

4️⃣ Python 전환 대응 (핵심)
TS	Python
RateLimiter	asyncio.sleep 기반
retry(fn)	tenacity
retryOn	retry_if_exception

목표 정리

사이트별 특성 차이를 Collector 레벨에서 흡수

Orchestrator는 정책을 몰라야 함

Timeout / Retry / RateLimit 은 Collector의 계약

장기 실행 방지 (cron 단발 실행) 유지

장애 시 Collector 단위 격리

1️⃣ Timeout 설계 원칙 (중요)
❌ 안 좋은 방식
axios.get(url, { timeout: 10000 }) // 전역 고정


사이트별 특성 무시

Playwright / API / HTML 수집 구분 불가

느린 사이트 하나로 전체 장애

✅ 좋은 방식 (실무 기준)

Timeout은 Collector의 “능력치”

Collector마다 하드 상한

요청 단위가 아니라 Collector 실행 단위

Orchestrator는 시간 초과 여부만 판단

2️⃣ Collector 계약 (Timeout 포함)
BaseCollector.ts
export interface CollectorContext {
  runId: string
  startedAt: number
}

export interface CollectorPolicy {
  timeoutMs: number
  maxRetries: number
  rateLimit?: {
    requestsPerSecond: number
  }
}

export interface CollectorResult<T = unknown> {
  raw: T
  collectedAt: string
  meta?: Record<string, any>
}

export interface Collector {
  readonly name: string
  readonly policy: CollectorPolicy

  collect(ctx: CollectorContext): Promise<CollectorResult>
}


📌 핵심

policy.timeoutMs → 강제 상한

Collector 외부에서 timeout 값 수정 ❌

정책은 코드에 명시 (문서화 효과)

3️⃣ Timeout 실행 래퍼 (Orchestrator 전용)
utils/withTimeout.ts
export class TimeoutError extends Error {
  constructor(public readonly ms: number) {
    super(`Collector timeout after ${ms}ms`)
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: NodeJS.Timeout

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs)
    }),
  ]).finally(() => clearTimeout(timer))
}

4️⃣ Orchestrator에서의 사용 방식
app.ts (중추 신경)
for (const collector of collectors) {
  try {
    const result = await withTimeout(
      collector.collect(ctx),
      collector.policy.timeoutMs
    )

    await rawStorage.save(collector.name, result)
  } catch (err) {
    await errorNotifier.notifyCollectorError({
      collector: collector.name,
      error: err,
      runId: ctx.runId,
    })
  }
}


📌 Orchestrator는:

timeout 값 ❌ 모름

사이트 특성 ❌ 모름

Collector 계약만 신뢰

5️⃣ Collector별 Timeout 정책 예시
REST API Collector
export class GovApiCollector implements Collector {
  name = 'gov-api'

  policy = {
    timeoutMs: 5_000,
    maxRetries: 2,
    rateLimit: {
      requestsPerSecond: 3,
    },
  }

  async collect(): Promise<CollectorResult> {
    // axios / fetch
  }
}

HTML 정적 크롤링
export class NewsHtmlCollector implements Collector {
  name = 'news-html'

  policy = {
    timeoutMs: 8_000,
    maxRetries: 1,
  }

  async collect() {
    // cheerio 기반
  }
}

Playwright JS 렌더링
export class PlaywrightCollector implements Collector {
  name = 'playwright-site'

  policy = {
    timeoutMs: 25_000, // ❗ 절대 상한
    maxRetries: 0,     // retry 금지 (비용 큼)
  }

  async collect() {
    // browser.launch
    // page.goto (timeout은 내부에서 더 짧게)
  }
}


📌 Playwright는 Collector timeout > page timeout

6️⃣ Timeout 계층 구조 (중요)
Collector timeout (최상위)
 └─ 내부 네트워크 timeout
     └─ page.goto timeout

내부에서는 항상 더 짧게
page.goto(url, { timeout: 10_000 }) // collector는 25s


→ 무한 대기 방지

7️⃣ 실무 권장 Timeout 기준표
유형	권장 Timeout
공공 API	3~5초
내부 API	2~3초
정적 HTML	5~8초
로그인 필요	10~15초
Playwright	20~30초 (상한)
8️⃣ 장애 분석이 쉬워지는 이유

Slack 에러 알림:

❌ Collector Timeout
- name: playwright-site
- timeout: 25000ms
- runId: 2026-01-28T03


“어디서 느린지” 바로 판단 가능

서버 전체 멈춤 ❌

cron 재실행 시 자동 복구