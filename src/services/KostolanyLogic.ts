/**
 * Kostolany의 The Egg 이론 분석 엔진
 * 시장 사이클을 6단계로 분류하고 투자 액션을 제시합니다
 */

import {
  EggPhase,
  InterestRateTrend,
  MarketInputs,
  MarketSentiment,
  VolumeCondition,
  EggCycleAnalysis,
  InvestmentAction,
} from '../types/kostolany';
import { EGG_CYCLE_PHASES, PHASE_TRANSITIONS } from '../constants/eggCycleData';

/**
 * Kostolany Egg 분석 엔진 (싱글톤)
 * 금리 추세 기반 시장 단계 분석
 */
export class KostolanyLogic {
  private static instance: KostolanyLogic;

  private constructor() {}

  /**
   * 싱글톤 인스턴스 획득
   */
  public static getInstance(): KostolanyLogic {
    if (!KostolanyLogic.instance) {
      KostolanyLogic.instance = new KostolanyLogic();
    }
    return KostolanyLogic.instance;
  }

  /**
   * 핵심 분석 메서드: 시장 입력값 → Egg 단계 + 액션
   * @param inputs 금리 추세, 감정, 거래량
   * @returns Egg 단계 분석 결과
   */
  public analyzePhase(inputs: MarketInputs): EggCycleAnalysis {
    const { interestRateTrend, sentiment = MarketSentiment.NEUTRAL, volume = VolumeCondition.MEDIUM } =
      inputs;

    // Phase 1: 금리 고점 → 매수 신호
    if (interestRateTrend === InterestRateTrend.PEAK) {
      return this.createAnalysis(
        sentiment === MarketSentiment.FEAR
          ? EggPhase.A1_CORRECTION
          : EggPhase.A1_CORRECTION,
        InvestmentAction.BUY,
        '매수 (적립)',
        volume === VolumeCondition.LOW ? 85 : 70,
        '금리가 고점에 도달했습니다. 시장 진입의 최고 타이밍입니다. 역사적으로 이 시점부터의 매수가 가장 높은 수익률을 기록했습니다.',
        EggPhase.A2_ACCOMPANIMENT
      );
    }

    // Phase 2: 금리 하락 → 파도타기
    if (interestRateTrend === InterestRateTrend.FALLING) {
      return this.createAnalysis(
        EggPhase.A2_ACCOMPANIMENT,
        InvestmentAction.HOLD,
        '보유 (파도타기)',
        80,
        '금리 하락 중입니다. 시장은 상승 추세를 보이고 있습니다. 기업 실적도 개선되고 있으므로 보유를 권장합니다.',
        EggPhase.A3_EXAGGERATION
      );
    }

    // Phase 3: 금리 저점 → 매도 신호
    if (interestRateTrend === InterestRateTrend.BOTTOM) {
      return this.createAnalysis(
        sentiment === MarketSentiment.GREED
          ? EggPhase.A3_EXAGGERATION
          : EggPhase.A3_EXAGGERATION,
        InvestmentAction.SELL,
        '매도 (이익 실현)',
        volume === VolumeCondition.HIGH ? 90 : 75,
        '금리가 저점입니다. 시장이 과열되고 있습니다. 투자자들의 과신으로 자산 가격이 내재 가치를 초과하고 있습니다. 이익 실현을 고려하세요.',
        EggPhase.B1_CORRECTION
      );
    }

    // Phase 4-6: 금리 상승 구간
    if (interestRateTrend === InterestRateTrend.RISING) {
      // 상승 초기: B1 (수익 실현)
      if (sentiment === MarketSentiment.CAUTIOUS) {
        return this.createAnalysis(
          EggPhase.B1_CORRECTION,
          InvestmentAction.HOLD,
          '일부 매도 (수익 실현)',
          65,
          '금리 상승 추세가 시작되었습니다. 시장 심리가 악화되고 있습니다. 이익을 취하거나 포지션을 줄일 시점입니다.',
          EggPhase.B2_ACCOMPANIMENT
        );
      }

      // 상승 중기: B2 (방어)
      return this.createAnalysis(
        EggPhase.B2_ACCOMPANIMENT,
        InvestmentAction.HOLD,
        '방어 (현금 확보)',
        45,
        '금리가 계속 상승하고 시장도 약세입니다. 비즈니스 심리가 악화되고 있으므로 방어적 자세를 유지하세요.',
        EggPhase.B3_EXAGGERATION
      );
    }

    // 기본값: 미정의
    return this.createAnalysis(
      EggPhase.A2_ACCOMPANIMENT,
      InvestmentAction.HOLD,
      '보유',
      50,
      '시장 신호를 모니터링하세요.',
      EggPhase.A2_ACCOMPANIMENT
    );
  }

  /**
   * 다양한 입력 시나리오 테스트용 확장 분석
   */
  public analyzePhaseDetailed(inputs: MarketInputs & { previousPhase?: EggPhase }): EggCycleAnalysis {
    return this.analyzePhase(inputs);
  }

  /**
   * 현재 단계에서 이전 단계로의 되돌아가기 로직
   * (거래 신호가 지연되는 경우 사용)
   */
  public getPreviousPhase(currentPhase: EggPhase): EggPhase {
    const reverseTransitions: Record<EggPhase, EggPhase> = {
      [EggPhase.A2_ACCOMPANIMENT]: EggPhase.A1_CORRECTION,
      [EggPhase.A3_EXAGGERATION]: EggPhase.A2_ACCOMPANIMENT,
      [EggPhase.B1_CORRECTION]: EggPhase.A3_EXAGGERATION,
      [EggPhase.B2_ACCOMPANIMENT]: EggPhase.B1_CORRECTION,
      [EggPhase.B3_EXAGGERATION]: EggPhase.B2_ACCOMPANIMENT,
      [EggPhase.A1_CORRECTION]: EggPhase.B3_EXAGGERATION,
    };
    return reverseTransitions[currentPhase] || currentPhase;
  }

  /**
   * 특정 단계의 메타데이터 조회
   */
  public getPhaseInfo(phase: EggPhase) {
    return EGG_CYCLE_PHASES[phase];
  }

  /**
   * 모든 단계의 색상 맵핑
   */
  public getPhaseColors(): Record<EggPhase, string> {
    return Object.values(EggPhase).reduce(
      (acc, phase) => {
        acc[phase] = EGG_CYCLE_PHASES[phase]?.color || '#CCCCCC';
        return acc;
      },
      {} as Record<EggPhase, string>
    );
  }

  /**
   * 위험도 기반 액션 제시
   * (포트폴리오 위험도에 따른 추가 조정)
   */
  public getAdjustedAction(
    baseAction: InvestmentAction,
    portfolioRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  ): InvestmentAction {
    // 보수적 포트폴리오는 매도 신호 강화
    if (portfolioRiskLevel === 'LOW' && baseAction === InvestmentAction.SELL) {
      return InvestmentAction.SELL; // 더 강하게 매도
    }

    // 공격적 포트폴리오는 매수 신호 강화
    if (portfolioRiskLevel === 'HIGH' && baseAction === InvestmentAction.BUY) {
      return InvestmentAction.BUY; // 더 강하게 매수
    }

    return baseAction;
  }

  /**
   * 분석 결과 객체 생성 헬퍼
   */
  private createAnalysis(
    phase: EggPhase,
    action: InvestmentAction,
    actionKorean: string,
    confidence: number,
    description: string,
    nextPhase: EggPhase
  ): EggCycleAnalysis {
    const phaseInfo = EGG_CYCLE_PHASES[phase];

    return {
      currentPhase: phase,
      action,
      actionKorean,
      confidence,
      description,
      nextPhase,
      phaseTitle: phaseInfo.titleKorean,
      historicalSuccess: phaseInfo.historicalSuccessRate,
    };
  }
}

/**
 * 전역 싱글톤 인스턴스
 */
export const kostolanyLogic = KostolanyLogic.getInstance();
