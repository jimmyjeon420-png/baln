/**
 * bilingualData.ts — 이중 언어 데이터 접근자
 *
 * 역할: 데이터 파일에서 현재 언어에 맞는 필드를 자동 선택
 * 비유: 자동 번역 스위치 — 한국어/영어 버전 중 현재 언어에 맞는 것을 골라줌
 *
 * 사용법:
 *   localized('안녕', 'Hello')  →  언어에 따라 자동 반환
 *   localizedField(guru, 'characterConcept', 'characterConceptEn')
 */

import { getCurrentDisplayLanguage } from '../context/LocaleContext';

/**
 * 한국어/영어 값 중 현재 언어에 맞는 것을 반환
 *
 * @param ko 한국어 값
 * @param en 영어 값 (없으면 한국어 폴백)
 */
export function localized(ko: string, en?: string): string {
  if (getCurrentDisplayLanguage() === 'en' && en) return en;
  return ko;
}

/**
 * 객체에서 한국어/영어 필드를 언어에 따라 반환
 *
 * @param item 데이터 객체
 * @param koField 한국어 필드 키
 * @param enField 영어 필드 키
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function localizedField<T extends Record<string, any>>(
  item: T,
  koField: keyof T,
  enField: keyof T,
): string {
  if (getCurrentDisplayLanguage() === 'en') {
    const enValue = item[enField];
    if (enValue && typeof enValue === 'string' && enValue.trim()) return enValue;
  }
  return String(item[koField] ?? '');
}
