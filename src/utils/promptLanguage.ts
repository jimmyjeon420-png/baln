/**
 * promptLanguage.ts — AI 프롬프트 언어 지시 유틸
 *
 * 역할: AI에게 "어떤 언어로 답해라"라고 지시하는 문장 생성
 * 비유: AI 비서에게 건네는 "언어 카드" — 한국어 카드를 주면 한국어로, 영어 카드를 주면 영어로 대답
 *
 * 사용처:
 *   - 클라이언트 Gemini 프롬프트 (gemini.ts, villageConversationService 등)
 *   - Edge Function 호출 시 lang 파라미터 전달
 */

import type { DisplayLanguage } from '../types/i18n';
import { getCurrentDisplayLanguage } from '../context/LocaleContext';

/**
 * AI 프롬프트에 삽입할 언어 지시 문장
 *
 * @example
 * const prompt = `분석해주세요. ${getPromptLanguageInstruction()}`;
 * // ko → "한국어로 자연스럽게 작성한다."
 * // en → "Write naturally in English."
 */
export function getPromptLanguageInstruction(lang?: DisplayLanguage): string {
  const current = lang || getCurrentDisplayLanguage();
  if (current === 'ko') return '한국어로 자연스럽게 작성한다.';
  if (current === 'ja') return '日本語で自然に書いてください。';
  return 'Write naturally in English.';
}

/**
 * 응답 언어 이름 (프롬프트 내에서 "응답 언어: 한국어" 형태로 사용)
 */
export function getResponseLanguage(lang?: DisplayLanguage): string {
  const current = lang || getCurrentDisplayLanguage();
  if (current === 'ko') return '한국어';
  if (current === 'ja') return '日本語';
  return 'English';
}

/**
 * Edge Function 호출 시 body에 포함할 lang 값
 *
 * @example
 * supabase.functions.invoke('gemini-proxy', {
 *   body: { ...params, lang: getLangParam() },
 * });
 */
export function getLangParam(lang?: DisplayLanguage): string {
  return lang || getCurrentDisplayLanguage();
}

/**
 * AI 프롬프트에 삽입할 금융 용어 가이드 (영어 응답 품질 향상용)
 * 영어 모드에서만 추가됨
 */
export function getFinanceTermGuide(lang?: DisplayLanguage): string {
  const current = lang || getCurrentDisplayLanguage();
  if (current === 'ko') return '';
  if (current === 'ja') return `
金融用語ガイド:
- リバランス (Rebalancing)
- ヘルススコア (Health Score)
- 配分乖離度 (Allocation Drift)
- 処方箋 (Prescription)
- コンテキストカード (Context Card)
- ダウンサイドリスク (Downside Risk)
- 相関関係 (Correlation)
- ボラティリティ (Volatility)
`;
  return `
Use standard financial terminology:
- 리밸런싱 → Rebalancing
- 건강 점수 → Health Score
- 배분 이탈도 → Allocation Drift
- 처방전 → Prescription / Action Plan
- 맥락 카드 → Context Card
- 하방 리스크 → Downside Risk
- 상관관계 → Correlation
- 변동성 → Volatility
`;
}
