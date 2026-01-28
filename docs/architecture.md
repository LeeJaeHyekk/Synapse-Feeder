1️⃣ 최상위 실행 구조 (Execution Model)
[ OS cron ]
    ↓
[ Node Single-run Process ]
    ↓
[ Execution Context ]
    ├─ Job Metadata (runId, date, tz)
    ├─ Logger
    ├─ Config (validated)
    └─ Resource Limits

핵심 의미

프로세스는 상태를 기억하지 않는다

실행 단위 = Job 1회

모든 하위 레이어는 Context에 의존 (전역 상태 ❌)

2️⃣ 최종 아키텍처 다이어그램
cron
 └─ node dist/main.js
       │
       ▼
┌────────────────────────────┐
│        Orchestrator         │  main.ts
│────────────────────────────┤
│ - ExecutionContext 생성     │
│ - Collector 순회            │
│ - 실패 격리                 │
│ - 결과 집계                 │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────────────────────────┐
│                  Pipeline                       │
│────────────────────────────────────────────────│
│ 1. Collector Layer     (Raw 생성)               │
│ 2. Raw Storage         (증거 보존)              │
│ 3. Normalizer Layer    (Schema Gate)            │
│ 4. Normalized Storage  (신뢰 데이터)            │
│ 5. Formatter Layer     (Human-readable)         │
│ 6. Notifier Layer      (Side Effect)            │
└────────────────────────────────────────────────┘


📌 중요

Formatter / Notifier는 Collector 루프 밖

Slack 실패로 크롤링 결과 손실 ❌

3️⃣ Execution Context (실무 핵심)
왜 필요한가?

“어디서 로그 찍지?”
“오늘 실행 날짜 어디서 가져오지?”
→ 전역 접근 ❌

구조
interface ExecutionContext {
  runId: string;          // uuid
  runDate: string;        // YYYY-MM-DD (UTC)
  timezone: 'UTC';
  logger: Logger;
  config: AppConfig;
}


📌 모든 레이어는 Context를 주입받는다
📌 Python 이식 시에도 그대로 유지 가능

4️⃣ Orchestrator (main.ts) – 책임 재정의
역할

파이프라인 실행 순서 제어

Collector 단위 실패 격리

결과 집계

❌ 금지

데이터 가공

I/O 직접 처리

Slack SDK 접근

실제 실행 흐름 (정교화)
for (const collector of collectors) {
  try {
    const raw = await collector.collect(ctx);

    rawStore.save(ctx, collector.sourceName, raw);

    const normalized = normalizer.normalize(
      ctx,
      collector.sourceName,
      raw
    );

    repository.saveMany(ctx, normalized);

    executionResult.success(collector.sourceName, normalized.length);
  } catch (err) {
    executionResult.fail(collector.sourceName, err);
  }
}

const report = formatter.render(ctx, executionResult);
notifier.send(ctx, report);


📌 executionResult

성공/실패/건수 집계 객체

Formatter 입력으로 사용

5️⃣ Collector Layer (Boundary 강화)
collectors/
 ├─ BaseCollector.ts   ← 계약
 ├─ web/
 │   └─ SiteACollector.ts
 └─ api/
     └─ ApiBCollector.ts

계약
interface BaseCollector {
  readonly sourceName: string;
  collect(ctx: ExecutionContext): Promise<RawRecord[]>;
}


📌 Collector는

Context는 읽기만 가능

파일 저장 ❌

schema ❌

6️⃣ Raw Storage Layer (증거 보존 전용)
storage/
 └─ raw/
     └─ RawStore.ts

책임

atomic write

날짜/소스 기준 분리

overwrite 허용

rawStore.save(ctx, sourceName, raw);


📌 Raw는 재처리 전용
📌 Formatter / Notifier 접근 금지

7️⃣ Normalizer Layer (Single Schema Gate)
normalizer/
 ├─ schemas/
 │   └─ Article.schema.ts
 └─ normalize.ts

원칙 적용

zod 사용 위치 단 1곳

실패 시 예외 throw

normalize(ctx, sourceName, raw): Article[]


📌 Collector별 mapping은 여기서 처리
📌 Python 리팩토링 시 pydantic 1:1 대응

8️⃣ Normalized Storage Layer (신뢰 자산)
storage/
 └─ repository/
     └─ ArticleRepository.ts

책임

멱등성 보장

비즈니스 의미 없음

saveMany(ctx, articles)


📌 unique key: (date, source, url)

9️⃣ Formatter Layer (Human Interface)
formatter/
 ├─ templates/
 │   └─ dailyReport.hbs
 └─ DailyReportFormatter.ts

입력

ExecutionResult

Article list

출력

Markdown string

📌 Formatter는 실패/성공을 숨기지 않는다
→ 실패 source도 리포트에 표시

🔟 Notifier Layer (Side-effect Boundary)
notifier/
 ├─ Notifier.ts
 └─ SlackNotifier.ts

원칙

데이터 변경 ❌

실패 throw ❌

notifier.send(ctx, markdown);

1️⃣1️⃣ Config & Validation
config/
 ├─ env.schema.ts
 └─ loadConfig.ts


zod 기반 검증

실행 초기에만 로드

📌 설정 에러 = 즉시 프로세스 종료

1️⃣2️⃣ 장애 & 운영 대응 매핑
설계 원칙	아키텍처 반영
무인 실행	cron + 단발
부분 실패	Collector try/catch
Raw 보존	RawStore
멱등성	Repository
관측 가능성	ExecutionResult
변경 내성	Collector 독립
🔚 최종 한 줄 정의

이 아키텍처는
“매일 돌아가지만 아무도 관리하지 않는 시스템”을
사고 없이 굴리기 위해 설계된 구조다.