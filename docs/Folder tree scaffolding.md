🎯 목표

파일 하나당 책임 1개

Python 이식 시 폴더 그대로 복사 가능

Cursor / Copilot이 맥락을 정확히 이해하도록 구조화

📁 프로젝트 폴더 트리 (TypeScript · Production)
project-root/
├─ package.json
├─ tsconfig.json
├─ .env
├─ .env.example
├─ .gitignore
├─ README.md
│
├─ src/
│  ├─ main.ts                # Entry Point (node dist/main.js)
│  ├─ app.ts                 # Orchestrator (파이프라인 조립)
│  │
│  ├─ config/
│  │  ├─ env.schema.ts       # zod 환경변수 스키마
│  │  └─ index.ts            # env 로드 + 검증
│  │
│  ├─ collectors/
│  │  ├─ BaseCollector.ts    # 수집 계약 (interface)
│  │  ├─ index.ts            # collector registry
│  │  │
│  │  ├─ web/
│  │  │  ├─ SiteACollector.ts
│  │  │  └─ SiteBCollector.ts
│  │  │
│  │  └─ api/
│  │     └─ ApiBCollector.ts
│  │
│  ├─ normalizers/
│  │  ├─ article.schema.ts   # zod schema
│  │  ├─ article.normalizer.ts
│  │  │
│  │  └─ utils/
│  │     ├─ parseDate.ts
│  │     └─ sanitizeHtml.ts
│  │
│  ├─ storage/
│  │  ├─ raw/
│  │  │  ├─ RawStorage.ts    # fs 기반 raw 저장
│  │  │  └─ index.ts
│  │  │
│  │  ├─ repository/
│  │  │  ├─ ArticleRepository.ts
│  │  │  ├─ SQLiteArticleRepository.ts
│  │  │  └─ index.ts
│  │  │
│  │  └─ db/
│  │     ├─ client.ts        # sqlite 연결
│  │     └─ migrations/
│  │        └─ 001_init.sql
│  │
│  ├─ formatter/
│  │  ├─ formatReport.ts
│  │  ├─ templates/
│  │  │  └─ daily-report.hbs
│  │  └─ index.ts
│  │
│  ├─ notifier/
│  │  ├─ Notifier.ts         # interface
│  │  ├─ SlackNotifier.ts
│  │  └─ index.ts
│  │
│  ├─ errors/
│  │  ├─ AppError.ts
│  │  ├─ CollectorError.ts
│  │  └─ NormalizeError.ts
│  │
│  ├─ logger/
│  │  ├─ index.ts
│  │  └─ format.ts
│  │
│  └─ types/
│     └─ Article.ts          # zod infer 재export (선택)
│
├─ data/
│  └─ raw/
│     └─ .gitkeep
│
├─ dist/                     # ts 빌드 결과
│
└─ scripts/
   └─ run-local.sh           # 로컬 실행용

📌 핵심 설계 의도 설명 (중요)
1️⃣ main.ts / app.ts 분리
main.ts  → 실행만
app.ts   → 조립만


👉 테스트, Python 전환, 장애 분석 전부 편해짐

2️⃣ Collector Registry 패턴
// collectors/index.ts
export function loadCollectors(): BaseCollector[] {
  return [
    new SiteACollector(),
    new ApiBCollector(),
  ];
}


📌 추가 시

파일 하나 추가

registry에 1줄 추가

기존 코드 무변경

3️⃣ Normalizer는 “Gate” 구조
raw (unknown)
  ↓
Normalizer (zod)
  ↓
Article (신뢰)


📌 zod schema가 곧 도메인 계약서

4️⃣ Storage는 의미를 몰라야 한다

RawStorage.ts → fs만

SQLiteArticleRepository.ts → insert only

👉 나중에 S3 / Postgres로 교체 가능

5️⃣ Formatter = View
Article[] → string (markdown)


📌 비즈니스 판단 ❌
📌 정렬/그룹화는 허용 (표현 목적)

6️⃣ errors / logger 분리 (실무 필수)
errors/   → 의미 있는 에러 타입
logger/   → 포맷 통일


👉 운영 중 “어디서 터졌는지” 바로 보임

7️⃣ Python 이식 시 1:1 대응표
TS	Python
collectors/	collectors/
normalizers/	schemas/
zod	pydantic
formatter/	templates/
app.ts	app.py