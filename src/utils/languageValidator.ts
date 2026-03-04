/**
 * languageValidator.ts — Gemini API 응답 언어 검증
 *
 * 역할: AI 응답이 요청한 언어와 일치하는지 확인
 * 비유: 통역사가 올바른 언어로 말했는지 확인하는 감독관
 *
 * 사용법:
 *   import { isExpectedLanguage } from '@/utils/languageValidator';
 *   if (!isExpectedLanguage(response, 'ko')) { // retry }
 */

import type { DisplayLanguage } from '../types/i18n';

/**
 * 한글 문자 비율 계산 (공백, 숫자, 특수문자 제외)
 * 한글 유니코드 범위: AC00-D7AF (완성형), 3130-318F (자모)
 */
function getKoreanRatio(text: string): number {
  // 알파벳 + 한글만 추출 (숫자, 공백, 특수문자 제외)
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
  if (letters.length === 0) return 0;

  const koreanChars = letters.replace(/[^\uAC00-\uD7AF\u3130-\u318F]/g, '');
  return koreanChars.length / letters.length;
}

/**
 * 응답 텍스트가 기대 언어와 일치하는지 검증
 *
 * @param text - AI 응답 텍스트
 * @param expectedLang - 기대 언어 ('ko' | 'en')
 * @param threshold - 한글 비율 임계값 (기본 0.3 = 30%)
 * @returns true면 언어 일치, false면 불일치
 *
 * 로직:
 *   - 한국어 기대: 한글 비율이 threshold 이상이면 OK
 *   - 영어 기대: 한글 비율이 threshold 미만이면 OK
 *   - 짧은 텍스트(50자 미만)는 항상 OK (숫자, 심볼 위주일 수 있음)
 */
export function isExpectedLanguage(
  text: string,
  expectedLang: DisplayLanguage,
  threshold = 0.3,
): boolean {
  // 짧은 응답은 검증 스킵 (숫자, 티커 등)
  if (text.length < 50) return true;

  const koreanRatio = getKoreanRatio(text);

  if (expectedLang === 'ko') {
    return koreanRatio >= threshold;
  }
  // 영어 모드: 한글이 threshold 미만이어야 함
  return koreanRatio < threshold;
}

/**
 * 언어 불일치 시 강화된 프롬프트 지시문 반환
 */
export function getStrongLanguageDirective(lang: DisplayLanguage): string {
  if (lang === 'ko') {
    return '\n\n[CRITICAL LANGUAGE REQUIREMENT] 반드시 한국어(Korean)로만 응답하세요. 영어를 사용하지 마세요. 모든 설명, 분석, 제목을 한국어로 작성하세요.';
  }
  return '\n\n[CRITICAL LANGUAGE REQUIREMENT] You MUST respond ENTIRELY in English. Do NOT use any Korean characters. All explanations, analysis, and titles must be in English.';
}
