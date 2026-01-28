🧠 Daily Crawling Automation
Production-grade Design Principles (TypeScript)
1️⃣ 시스템 생존성 원칙 (Operational Survivability)
1. 무인 실행 전제 원칙

이 시스템은 “사람이 지켜보지 않는다”

모든 실행은 비대화형 / 무상태

실행 중 중단되면 → 다음 cron 실행이 복구 수단

메모리·프로세스 상태에 의존 금지

✅ 적용

cron + 단발 실행

전역 싱글톤 상태 금지

2. 부분 실패 허용 원칙 (Partial Failure Tolerance)

성공/실패는 “전체”가 아니라 “소스 단위”로 판단

Collector A 실패 ≠ Job 실패

실패한 소스는 명시적으로 기록

성공한 결과는 반드시 남김

✅ 적용

Collector 단위 try/catch

실패 source 목록을 최종 리포트에 포함

2️⃣ 경계 엄격성 원칙 (Hard Boundary Rule)
3. 레이어 침범 절대 금지
레이어	알면 안 되는 것
Collector	Schema, DB, Slack
Normalizer	HTML, API 구조
Storage	비즈니스 의미
Formatter	Raw 구조
Notifier	데이터 구조

한 레이어라도 위반하면 구조 붕괴 시작

4. 단방향 의존성 원칙
Collector
   ↓
Normalizer
   ↓
Storage
   ↓
Formatter
   ↓
Notifier


❌ 역방향 import 금지
❌ 순환 의존 발생 시 즉시 리팩토링

3️⃣ 계약 중심 설계 원칙 (Contract-First Design)
5. 모든 레이어는 “계약”을 먼저 가진다

interface / abstract class 없이 구현 시작 ❌

계약이 곧 문서

CursorAI 생성 단위는 “계약 파일”

export interface BaseCollector {
  readonly sourceName: string;
  collect(): Promise<RawRecord[]>;
}

6. 컴파일 타입 ≠ 런타임 안전

TypeScript는 실행 시 타입을 보장하지 않는다

런타임 검증은 단 1곳

그곳이 Normalizer

❌ Collector에서 zod 사용
❌ Formatter에서 타입 체크

4️⃣ 데이터 무결성 원칙 (Data Integrity Doctrine)
7. Raw 데이터는 “증거(Evidence)”다

Raw는 절대 가공하지 않는다

JSON stringify 그대로 저장

사람이 읽지 않아도 됨

Raw가 없으면 장애 원인 추적 불가

8. 정규화 데이터는 “신뢰 자산(Asset)”이다

Normalizer 통과 전 데이터 = 불신

통과 후 데이터 = 재사용 가능

📌 이 원칙 때문에

Raw → Normalized 분리 필수

Schema Gate 단일화

5️⃣ 시간 & 재실행 원칙 (Temporal Safety)
9. Idempotency(멱등성) 보장

같은 날 N번 실행되어도 결과는 동일해야 한다

날짜 + source 기준 중복 제거

DB insert 시 unique key 고려

Raw overwrite 허용

10. 시간은 항상 명시적

서버 로컬 시간 ❌

UTC or 명시 TZ 사용

모든 날짜는 ISO 변환 후 저장

6️⃣ 리소스 통제 원칙 (Resource Discipline)
11. 외부 자원은 반드시 제한한다
자원	필수 제어
HTTP	timeout
크롤링	retry 횟수
Playwright	browser lifecycle
파일	atomic write

제어 안 하면 언젠가 멈춘다

12. 동시성은 명시적으로 관리

Promise.all 무분별 사용 ❌

Collector 단위 직렬 실행 기본

병렬은 옵션으로만 허용

7️⃣ 출력 책임 원칙 (Output Responsibility)
13. 문서는 “사람을 위한 API”

Formatter는 UX 책임을 진다

데이터 나열 ❌

맥락·그룹·요약 필수

14. Notifier는 결과를 바꾸지 않는다

실패해도 데이터 손상 ❌

전송 실패 = 부수 효과 실패

8️⃣ 변경 내성 원칙 (Change Resilience)
15. 새 소스 추가 시 수정 파일 수 ≤ 1

collectors/xxx.ts 추가

나머지 수정 발생 시 → 설계 위반

16. 언어 교체 가능성 유지

TS → Python 이식 가능해야 한다

TS	Python
interface	ABC
zod	pydantic
fs	pathlib
handlebars	jinja2
9️⃣ 관측 가능성 원칙 (Observability)
17. 모든 실패는 식별 가능해야 한다

sourceName 포함 로그

실행 날짜 포함

Stack trace 보존

18. 성공도 기록한다

성공 source 목록

수집 건수

실행 시간

🔚 핵심 요약 (실무 기준)

이 설계는
**“오늘은 잘 됐는데, 한 달 뒤부터 이유 없이 깨지는 자동화”**를
원천 차단하기 위한 구조다.