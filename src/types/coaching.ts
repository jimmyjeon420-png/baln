/**
 * AI 코칭 및 진단 시스템 타입 정의
 */

import { EggCycleAnalysis, DiagnosisAnswers, MarketDriver, InvestmentAction } from './kostolany';
import { Asset } from './asset';

/**
 * 코칭 메시지의 심각도 수준
 */
export enum CoachingSeverity {
  /** 위험 신호 - 빨간색 */
  DANGER = 'DANGER',

  /** 주의 신호 - 노란색 */
  WARNING = 'WARNING',

  /** 정보성 - 파란색 */
  INFO = 'INFO',

  /** 긍정 신호 - 초록색 */
  SUCCESS = 'SUCCESS',
}

/**
 * AI 코칭 메시지
 */
export interface CoachingMessage {
  /** 심각도 (색상 결정) */
  severity: CoachingSeverity;

  /** 메인 메시지 (한 줄 요약) */
  message: string;

  /** 상세 설명 (선택사항) */
  detailedMessage?: string;

  /** 아이콘/이모지 */
  icon: string;

  /** 배경색 (16진수) */
  backgroundColor: string;

  /** 텍스트색 (16진수) */
  textColor: string;

  /** 권장 액션 */
  recommendedAction?: string;
}

/**
 * 진단 결과 전체 (Egg + Coach + Market Drivers)
 */
export interface DiagnosisResult {
  /** 설문 답변 */
  answers: DiagnosisAnswers;

  /** Egg 사이클 분석 */
  eggAnalysis: EggCycleAnalysis;

  /** 포트폴리오 기반 코칭 메시지 */
  coachingMessage: CoachingMessage;

  /** 시장을 움직이는 Top 3 요인 */
  marketDrivers: MarketDriver[];

  /** 사용자 포트폴리오 스냅샷 */
  portfolioSnapshot?: {
    totalValue: number;
    totalAllocation: number;
    cryptoAllocation: number;
    cashAllocation: number;
    assetCount: number;
  };

  /** 결과 생성 타임스탐프 */
  createdAt: number;
}

/**
 * 진단 결과를 위한 저장 데이터 (AsyncStorage 용)
 */
export interface DiagnosisStorage {
  /** 최신 진단 결과 */
  latest?: DiagnosisResult;

  /** 이전 진단 결과들 (최대 10개) */
  history: DiagnosisResult[];

  /** 마지막 업데이트 */
  lastUpdated: number;
}

/**
 * 포트폴리오 분석을 위한 내부 계산값
 */
export interface PortfolioAnalysis {
  /** 암호화폐 비중 (%) */
  cryptoAllocation: number;

  /** 현금/스테이블코인 비중 (%) */
  cashAllocation: number;

  /** 주식/ETF 비중 (%) */
  stockAllocation: number;

  /** 부동산 비중 (%) */
  realEstateAllocation: number;

  /** 기타 자산 비중 (%) */
  otherAllocation: number;

  /** 총 자산 개수 */
  assetCount: number;

  /** 포트폴리오 총 가치 */
  totalValue: number;

  /** 분석 가능 여부 */
  isAnalyzable: boolean;

  /** 분석 불가 사유 */
  analysisNote?: string;
}

/**
 * 코칭 로직을 위한 내부 상태
 */
export interface CoachingState {
  /** 현재 Egg 단계의 액션 */
  currentAction: InvestmentAction;

  /** 사용자 포트폴리오의 극단적 특성 */
  isExtremeCrypto: boolean;   // 암호화폐 90% 이상
  isExtremeCash: boolean;     // 현금 90% 이상
  isExtremeBonds: boolean;    // 채권 90% 이상

  /** 포트폴리오 분산도 */
  diversificationScore: number; // 0-100

  /** 위험 수위 */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
