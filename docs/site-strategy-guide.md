# 사이트 타입 분류표 및 전략 가이드

## 📊 사이트 타입별 수집 전략

| Site Type | 대표 사이트 | 수집 전략 | 사용 기술 |
|-----------|------------|----------|----------|
| `portal-csr` | 네이버, 카카오 | 내부 API → Playwright fallback | axios, playwright |
| `public-board` | KLCA, 정부 | HTML 게시판 직접 | axios + cheerio + euc-kr |
| `shopping` | 쿠팡, 스토어 | JSON API | axios |
| `blog` | 티스토리 | RSS → HTML | rss-parser |
| `static-article` | 언론, 협회 | SSR HTML | cheerio |

## 🎯 전략 선택 원칙

1. **API 우선**: 공개 API가 있으면 API 사용
2. **HTML 파싱**: API가 없으면 HTML 직접 파싱
3. **동적 콘텐츠**: JavaScript 렌더링 필요 시 Playwright
4. **RSS 활용**: 블로그는 RSS 피드 우선

## 📝 사이트 설정 예시

```typescript
// sites/klca.ts
export const KlcaSite: SiteConfig = {
  sourceName: 'klca',
  siteType: 'public-board',
  encoding: 'auto', // 자동 인코딩 처리
  entryPoints: [
    {
      name: 'notice',
      url: 'https://www.klca.or.kr/board/notice/list.do'
    },
    {
      name: 'seminar',
      url: 'https://www.klca.or.kr/board/seminar/list.do'
    }
  ]
}
```

## 🔄 향후 확장 계획

현재는 각 Collector가 직접 구현되어 있지만, 향후 다음과 같이 전략 패턴을 도입할 수 있습니다:

```typescript
// collectors/strategyMap.ts
export const StrategyMap = {
  'portal-csr': ApiCollector,
  'public-board': HtmlBoardCollector,
  'shopping': ApiCollector,
  'blog': RssCollector,
  'static-article': HtmlBoardCollector
} as const

// collectors/factory.ts
export function createCollector(siteConfig: SiteConfig): BaseCollector {
  const Strategy = StrategyMap[siteConfig.siteType]
  return new Strategy(siteConfig)
}
```

이렇게 하면:
- ✅ Collector 파일 추가 ❌
- ✅ Config 추가 ⭕
- ✅ 전략 재사용 ⭕
