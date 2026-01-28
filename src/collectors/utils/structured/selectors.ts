/**
 * 시맨틱 태그 기반 섹션 선택자
 */

export const SEMANTIC_SELECTORS = {
  navigation: ['nav', '[role="navigation"]', '.nav', '.navigation', '.menu', '.gnb'],
  header: ['header', '[role="banner"]', '.header', '.top', '.topbar'],
  main: ['main', '[role="main"]', '.main', '.content', '#content', '.container'],
  sidebar: ['aside', '[role="complementary"]', '.sidebar', '.side', '.side-menu'],
  footer: ['footer', '[role="contentinfo"]', '.footer', '.bottom'],
  search: ['.search', '#search', '[role="search"]', '.search-area', '.search-layer'],
  article: ['article', '.article', '.post', '.entry'],
  section: ['section', '.section'],
} as const

/**
 * 상품 선택자들
 */
export const PRODUCT_SELECTORS = [
  '[class*="product"]',
  '[class*="goods"]',
  '[class*="item"]:not([class*="list-item"]):not([class*="menu-item"])',
  'li[class*="product"]',
  'li[class*="goods"]',
  '.goods-item',
  '[data-product-id]',
  '[data-goods-no]',
] as const

/**
 * 랭킹 선택자들
 */
export const RANKING_SELECTORS = [
  '[class*="rank"]',
  '[class*="ranking"]',
  '.rank',
  '.ranking',
  '[class*="keyword"]',
  '[class*="best"]',
] as const

/**
 * 제목 선택자들
 */
export const TITLE_SELECTORS = [
  'h3', 'h4', 'h5',
  '.title', '[class*="title"]',
  'a[href]',
  '.name', '[class*="name"]',
  '.product-name', '[class*="product-name"]',
] as const

/**
 * 랭킹 아이템 선택자들
 */
export const RANKING_ITEM_SELECTORS = [
  'li',
  '.item',
  '[class*="item"]',
  'tr',
  'div[class*="rank"]',
  'div[class*="item"]',
] as const

/**
 * 키워드 선택자들
 */
export const KEYWORD_SELECTORS = [
  '.keyword',
  '[class*="keyword"]',
  '.rank',
  '[class*="rank"]',
  '.trending',
  '[class*="trending"]',
] as const

/**
 * 브랜드 선택자들
 */
export const BRAND_SELECTORS = [
  '.logo',
  '.brand',
  'h1',
  'h1 a',
  '[class*="logo"]',
  '[class*="brand"]',
] as const
