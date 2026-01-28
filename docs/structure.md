핵심 철학

Node는 배치 실행기

모든 레이어는 순수 함수 + 계약

장애는 격리, 복구는 재실행

Python 전환 시 폴더/개념 1:1 유지

1️⃣ 실행 구조 (Scheduler & Runtime)
cron
 └─ node dist/main.js

0 6 * * * node /app/dist/main.js >> /var/log/crawler.log 2>&1

원칙

Node 프로세스는 실행 → 종료

상태 유지 ❌

PM2 / forever ❌

장애 복구 = cron 재실행

📌 Python 전환 시

0 6 * * * python main.py


→ 구조 변경 0

2️⃣ Entry Point 분리 (실무 핵심)
src/
 ├─ main.ts          # 진짜 Entry (얇음)
 └─ app.ts           # Orchestrator

main.ts (절대 비즈니스 없음)
import { runApp } from './app';

runApp()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });


📌 이유

테스트 시 app.ts 단독 실행 가능

Python 전환 시 if __name__ == "__main__" 구조와 동일

3️⃣ app.ts (Orchestrator – 통제 타워)

❗ 여기가 설계의 중심

책임 (명확화)

파이프라인 조립

레이어 호출 순서 보장

실패 격리

로깅 컨텍스트 유지

❌ 금지 (기존 유지)

cheerio / playwright ❌

SQL ❌

Slack SDK ❌

개선된 흐름 (의사코드)
export async function runApp() {
  const collectors = loadCollectors();
  const notifier = loadNotifier();
  const repository = loadRepository();

  const successArticles: Article[] = [];
  const errors: AppError[] = [];

  for (const collector of collectors) {
    const ctx = { source: collector.sourceName };

    try {
      const raw = await collector.collect();
      await saveRaw(ctx.source, raw);

      let normalized: Article[];
      try {
        normalized = normalize(raw, ctx.source);
      } catch (e) {
        logNormalizeError(e, ctx);
        continue; // normalize 실패는 source 단위 스킵
      }

      await repository.saveMany(normalized);
      successArticles.push(...normalized);

    } catch (e) {
      logCollectorError(e, ctx);
      errors.push(wrapError(e, ctx));
      continue;
    }
  }

  const report = formatReport(successArticles);
  await safeNotify(notifier, report);
}


📌 중요한 개선 포인트

Collector 실패 ≠ normalize 실패

normalize 실패는 해당 source만 스킵

Slack 실패는 절대 throw 안 함

4️⃣ Collector Layer (확장 포인트 – 계약 강화)
계약 (유지 + 보강)
export interface BaseCollector {
  readonly sourceName: string;
  collect(): Promise<ReadonlyArray<Record<string, unknown>>>;
}


📌 개선 이유

ReadonlyArray → 실수로 mutate 방지

raw 데이터는 불변 취급

Collector 디렉토리 구조
collectors/
 ├─ BaseCollector.ts
 ├─ web/
 │   ├─ SiteACollector.ts
 │   └─ SiteBCollector.ts
 └─ api/
     └─ ApiBCollector.ts


📌 Collector 내부 원칙

HTTP / 파싱까지만

날짜 변환 ❌

필드 보정 ❌

null 처리 ❌

5️⃣ Normalizer Layer (Schema Gate – 강화)
책임 재정의

유일한 런타임 검증 지점

여기 통과 = 도메인 신뢰 데이터

구조
normalizers/
 ├─ article.schema.ts
 ├─ article.normalizer.ts
 └─ utils/
     ├─ date.ts
     └─ sanitize.ts

normalize 함수 (source 격리)
export function normalize(
  rawList: ReadonlyArray<Record<string, unknown>>,
  source: string
): Article[] {
  return rawList.map(raw => {
    try {
      return ArticleSchema.parse({
        source,
        title: raw['title'],
        url: raw['url'],
        publishedAt: parseDate(raw['date']),
        content: sanitizeHtml(raw['content']),
      });
    } catch (e) {
      throw new NormalizeError(source, raw, e);
    }
  });
}


📌 실무 포인트

raw + source 같이 에러로 남김

나중에 “왜 깨졌는지” 재현 가능

6️⃣ Storage Layer (의미 최소화)
Raw Storage (fs)
saveRaw(source: string, data: unknown[]): Promise<void>

data/raw/YYYY-MM-DD/{source}.json


JSON 그대로

변형 ❌

압축은 나중 문제

Normalized Storage (Repository)
export interface ArticleRepository {
  saveMany(articles: ReadonlyArray<Article>): Promise<void>;
}


📌 DB 철학

의미 모름

validation 없음

unique / index만 책임

7️⃣ Formatter Layer (View 전용)
책임

읽기 좋은 결과물

비즈니스 판단 ❌

formatReport(articles: Article[]): string;


📌 Formatter는 DB / Collector 몰라야 함
📌 Python → Jinja2 완벽 대응

8️⃣ Notifier Layer (Side Effect 격리)
인터페이스 유지
export interface Notifier {
  send(message: string): Promise<void>;
}

안전 호출 래퍼 (Orchestrator 전용)
async function safeNotify(notifier: Notifier, message: string) {
  try {
    await notifier.send(message);
  } catch (e) {
    console.error('[NOTIFY_FAIL]', e);
  }
}


📌 절대 throw 금지
→ 배치 성공 여부와 알림은 분리

9️⃣ Config 관리 (운영 필수)
const EnvSchema = z.object({
  NODE_ENV: z.enum(['dev', 'prod']),
  SLACK_TOKEN: z.string(),
  SLACK_CHANNEL: z.string(),
  DB_URL: z.string(),
  CRAWL_TIMEOUT: z.coerce.number().default(10),
});


📌 app 시작 시 1회 검증
📌 실패 시 즉시 종료

🔟 장애 설계 (정리)
상황	처리
Collector 실패	해당 source 스킵
normalize 실패	해당 source 스킵
DB 실패	프로세스 실패
Slack 실패	로그만
프로세스 크래시	cron 재시작

👉 Node = 재실행 머신