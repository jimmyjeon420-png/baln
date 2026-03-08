/**
 * gemini.ts — Gemini AI 서비스 통합 엔트리포인트
 *
 * 모든 Gemini 관련 함수와 타입을 이 파일에서 re-export합니다.
 * 기존 import 경로(`from '../services/gemini'`)가 변경 없이 동작합니다.
 *
 * 내부 모듈 구조:
 * - geminiCore.ts     — API 초기화, 공통 유틸리티, JSON 파서
 * - geminiParser.ts   — 이미지 분석(OCR), 티커 매핑, 가격 보정
 * - geminiDeepDive.ts — AI 종목 딥다이브 분석
 * - geminiRisk.ts     — 포트폴리오 리스크 분석 (Panic Shield & FOMO Vaccine)
 * - geminiBriefing.ts — 시장 브리핑, 최적 배분, 티커 분류
 * - geminiWhatIf.ts   — What-If 시뮬레이터
 * - geminiTax.ts      — 세금 최적화 리포트
 * - geminiChat.ts     — AI CFO 채팅, 포트폴리오 어드바이스
 */

// ============================================================================
// Core: API 초기화, JSON 파서, 공통 유틸리티
// ============================================================================
export { parseGeminiJson } from './geminiCore';

// ============================================================================
// Parser: 이미지 분석, 티커 매핑, 가격 보정
// ============================================================================
export {
  KOREAN_TO_TICKER_MAP,
  validateAssetData,
  analyzeAssetImage,
  analyzeAssetImageLegacy,
} from './geminiParser';

export type {
  ParsedAsset,
  AnalyzeImageOptions,
  AnalyzeImageResult,
} from './geminiParser';

// ============================================================================
// DeepDive: AI 종목 딥다이브 분석
// ============================================================================
export { generateDeepDive } from './geminiDeepDive';

// ============================================================================
// Risk: 포트폴리오 리스크 분석
// ============================================================================
export { analyzePortfolioRisk } from './geminiRisk';

export type {
  PortfolioAsset,
  UserProfile,
  PanicSubScores,
  FomoSubScores,
  RiskAnalysisResult,
} from './geminiRisk';

// ============================================================================
// Briefing: 시장 브리핑, 최적 배분, 티커 분류
// ============================================================================
export {
  generateMorningBriefing,
  classifyTicker,
  generateOptimalAllocation,
} from './geminiBriefing';

export type {
  MorningBriefingResult,
  OptimalAllocationInput,
  OptimalAllocationResult,
} from './geminiBriefing';

// ============================================================================
// What-If: 시나리오 시뮬레이터
// ============================================================================
export { generateWhatIf } from './geminiWhatIf';

// ============================================================================
// Tax: 세금 최적화 리포트
// ============================================================================
export { generateTaxReport } from './geminiTax';

// ============================================================================
// Chat: AI CFO 채팅, 포트폴리오 어드바이스, 대화 요약
// ============================================================================
export {
  getPortfolioAdvice,
  summarizeChat,
  generateAICFOResponse,
} from './geminiChat';
