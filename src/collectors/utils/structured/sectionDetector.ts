/**
 * 섹션 타입 자동 감지
 */

import type { SectionType } from './types.js'

/**
 * 섹션 타입 자동 감지
 */
export function detectSectionType($el: any, text: string): SectionType {
  const html = ($el.html && typeof $el.html === 'function' && $el.html()) || ''
  const classNames = ($el.attr && typeof $el.attr === 'function' && $el.attr('class')) || ''
  
  // 랭킹 섹션
  if (/rank|ranking|랭킹/i.test(text + classNames + html)) {
    return 'ranking'
  }
  
  // 상품 섹션
  if (/product|goods|상품|item|아이템/i.test(classNames + html)) {
    return 'product'
  }
  
  // 테이블 섹션
  if ($el.find && typeof $el.find === 'function' && $el.find('table').length > 0) {
    return 'table'
  }
  if ($el.is && typeof $el.is === 'function' && $el.is('table')) {
    return 'table'
  }
  
  // 리스트 섹션
  if ($el.find && typeof $el.find === 'function' && $el.find('ul, ol, li').length > 0) {
    return 'list'
  }
  if ($el.is && typeof $el.is === 'function' && $el.is('ul, ol')) {
    return 'list'
  }
  
  // 아티클 섹션
  if ($el.is && typeof $el.is === 'function' && $el.is('article')) {
    return 'article'
  }
  if ($el.find && typeof $el.find === 'function' && $el.find('article').length > 0) {
    return 'article'
  }
  
  return 'text'
}
