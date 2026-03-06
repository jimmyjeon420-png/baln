/**
 * AI 코칭 서비스
 * Egg 단계 + 포트폴리오 분석 → 맞춤형 경고/조언
 */

import { Asset } from '../types/asset';
import {
  EggCycleAnalysis,
  InvestmentAction,
  MarketDriver,
} from '../types/kostolany';
import {
  CoachingMessage,
  CoachingSeverity,
  PortfolioAnalysis,
  CoachingState,
} from '../types/coaching';
import { COLORS } from '../styles/theme';
import { getMockMarketDrivers } from './mockMarketData';

/**
 * AI 코칭 서비스 (싱글톤)
 * 포트폴리오 특성 + Egg 분석 → 개인화된 조언
 */
export class CoachingService {
  private static instance: CoachingService;

  private constructor() {}

  public static getInstance(): CoachingService {
    if (!CoachingService.instance) {
      CoachingService.instance = new CoachingService();
    }
    return CoachingService.instance;
  }

  /**
   * 메인 코칭 메시지 생성
   * @param eggAnalysis Egg 단계 분석 결과
   * @param assets 사용자 포트폴리오
   * @returns 맞춤형 코칭 메시지
   */
  public generateCoachingMessage(
    eggAnalysis: EggCycleAnalysis,
    assets: Asset[],
    lang: string = 'ko'
  ): CoachingMessage {
    // 1. 포트폴리오 분석
    const portfolioAnalysis = this.analyzePortfolio(assets);

    // 2. 코칭 상태 계산
    const coachingState = this.calculateCoachingState(
      eggAnalysis.action,
      portfolioAnalysis
    );

    // 3. 위험도 기반 메시지 생성
    if (coachingState.isExtremeCrypto && eggAnalysis.action === InvestmentAction.SELL) {
      return {
        severity: CoachingSeverity.DANGER,
        message: lang === 'en'
          ? '⚠️ Danger! Market is overheating (Egg Phase 3). Most of your portfolio is crypto — strongly recommend taking profits.'
          : '⚠️ 위험! 시장이 과열되고 있습니다 (Egg Phase 3). 포트폴리오의 대부분이 암호화폐인데 이익 실현을 강력히 권장합니다.',
        detailedMessage: lang === 'en'
          ? 'Rates have bottomed and investor sentiment is extremely optimistic. Historically, asset prices far exceed intrinsic value at this point. Realize some profits and reduce risk.'
          : '금리가 저점에 도달하고 투자자 심리가 극도로 낙관적입니다. 역사적으로 이 시점에서 자산 가격은 내재 가치를 크게 초과합니다. 일부 이익을 실현하고 리스크를 낮추세요.',
        icon: '🚨',
        backgroundColor: COLORS.error + '30',
        textColor: COLORS.error,
        recommendedAction: lang === 'en' ? 'Consider partial sell immediately' : '즉시 일부 매도 고려',
      };
    }

    // 기회: 시장 조정 + 현금이 많은 포트폴리오
    if (coachingState.isExtremeCash && eggAnalysis.action === InvestmentAction.BUY) {
      return {
        severity: CoachingSeverity.SUCCESS,
        message: lang === 'en'
          ? '💰 Opportunity! The best time to buy is when others are fearful. You have sufficient cash at rate peak.'
          : '💰 기회! 남들이 두려워할 때가 매수의 최고 시점입니다. 금리 고점에 충분한 현금을 보유 중입니다.',
        detailedMessage: lang === 'en'
          ? 'This is a value investing opportunity. Rates are at peak, likely to decline. Historically, buying at this point yields the best returns.'
          : '이제가 바로 가치 투자의 기회입니다. 금리가 고점이므로 앞으로 하락할 가능성이 높습니다. 역사적으로 이 시점부터의 매수가 최고의 수익률을 기록했습니다.',
        icon: '💎',
        backgroundColor: COLORS.success + '30',
        textColor: COLORS.success,
        recommendedAction: lang === 'en' ? 'Proceed with staged buying' : '단계적 매수 진행',
      };
    }

    // 기회: 현금 여유 있고 매수 신호
    if (portfolioAnalysis.cashAllocation > 30 && eggAnalysis.action === InvestmentAction.BUY) {
      return {
        severity: CoachingSeverity.SUCCESS,
        message: lang === 'en'
          ? '📊 Good timing! Rates are at peak. Enter with your prepared cash.'
          : '📊 좋은 타이밍! 금리 고점입니다. 준비된 현금으로 진입하세요.',
        detailedMessage: lang === 'en'
          ? `Current cash allocation is ${portfolioAnalysis.cashAllocation.toFixed(1)}%. This environment is optimal for buying.`
          : `현재 현금 비중이 ${portfolioAnalysis.cashAllocation.toFixed(1)}%입니다. 이 환경은 매수에 최적입니다.`,
        icon: '🌱',
        backgroundColor: COLORS.success + '30',
        textColor: COLORS.success,
        recommendedAction: lang === 'en' ? 'Gradual buying' : '점진적 매수',
      };
    }

    // 경고: 매도 신호인데 현금이 많은 경우
    if (portfolioAnalysis.cashAllocation > 70 && eggAnalysis.action === InvestmentAction.SELL) {
      return {
        severity: CoachingSeverity.WARNING,
        message: lang === 'en'
          ? '⏳ Sell signal with high cash is a re-evaluation signal. Prepare for the next correction.'
          : '⏳ 현금 많은 상태에서 매도 신호는 재평가 신호입니다. 다음 조정장을 준비하세요.',
        detailedMessage: lang === 'en'
          ? 'Market is overheating, but your cash allocation is high. This means you are already sufficiently defensive.'
          : '시장이 과열되었으나, 포트폴리오 현금 비중이 높습니다. 이는 당신이 이미 충분히 방어적임을 의미합니다.',
        icon: '🛡️',
        backgroundColor: COLORS.warning + '30',
        textColor: COLORS.warning,
        recommendedAction: lang === 'en' ? 'Maintain position, prepare for correction' : '현 상태 유지, 조정장 준비',
      };
    }

    // 일반: 중립적 상황
    return {
      severity: CoachingSeverity.INFO,
      message: lang === 'en'
        ? `📈 Currently in ${eggAnalysis.actionKorean} zone. ${eggAnalysis.description}`
        : `📈 현재 ${eggAnalysis.actionKorean} 구간입니다. ${eggAnalysis.description}`,
      detailedMessage: lang === 'en'
        ? `Diversification: ${portfolioAnalysis.assetCount} assets, Crypto ${portfolioAnalysis.cryptoAllocation.toFixed(1)}% | Cash ${portfolioAnalysis.cashAllocation.toFixed(1)}%`
        : `분산도: ${portfolioAnalysis.assetCount}개 자산, 암호화폐 ${portfolioAnalysis.cryptoAllocation.toFixed(1)}% | 현금 ${portfolioAnalysis.cashAllocation.toFixed(1)}%`,
      icon: '📊',
      backgroundColor: COLORS.info + '30',
      textColor: COLORS.info,
      recommendedAction: lang === 'en'
        ? `Maintain ${eggAnalysis.actionKorean} stance`
        : `${eggAnalysis.actionKorean}을 유지하세요`,
    };
  }

  /**
   * 포트폴리오 자산 분배 분석
   */
  private analyzePortfolio(assets: Asset[]): PortfolioAnalysis {
    if (!assets || assets.length === 0) {
      return {
        cryptoAllocation: 0,
        cashAllocation: 0,
        stockAllocation: 0,
        realEstateAllocation: 0,
        otherAllocation: 0,
        assetCount: 0,
        totalValue: 0,
        isAnalyzable: false,
        analysisNote: 'Portfolio is empty',
      };
    }

    let totalValue = 0;
    let cryptoValue = 0;
    let cashValue = 0;
    let stockValue = 0;
    let realEstateValue = 0;

    assets.forEach((asset) => {
      totalValue += asset.currentValue;

      const name = asset.name.toLowerCase();
      const ticker = asset.ticker?.toLowerCase() || '';

      // 암호화폐 분류
      if (
        name.includes('bitcoin') ||
        name.includes('ethereum') ||
        name.includes('crypto') ||
        ticker.includes('btc') ||
        ticker.includes('eth')
      ) {
        cryptoValue += asset.currentValue;
      }
      // 현금/스테이블코인
      else if (
        name.includes('cash') ||
        name.includes('stable') ||
        name.includes('usd') ||
        ticker === 'usdt' ||
        ticker === 'usdc'
      ) {
        cashValue += asset.currentValue;
      }
      // 주식/ETF
      else if (
        name.includes('stock') ||
        name.includes('etf') ||
        name.includes('nasdaq') ||
        ticker === 'qqq' ||
        ticker === 'spy'
      ) {
        stockValue += asset.currentValue;
      }
      // 부동산
      else if (name.includes('real') || name.includes('estate') || name.includes('property')) {
        realEstateValue += asset.currentValue;
      }
    });

    const otherValue = totalValue - cryptoValue - cashValue - stockValue - realEstateValue;

    return {
      cryptoAllocation: totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0,
      cashAllocation: totalValue > 0 ? (cashValue / totalValue) * 100 : 0,
      stockAllocation: totalValue > 0 ? (stockValue / totalValue) * 100 : 0,
      realEstateAllocation: totalValue > 0 ? (realEstateValue / totalValue) * 100 : 0,
      otherAllocation: totalValue > 0 ? (otherValue / totalValue) * 100 : 0,
      assetCount: assets.length,
      totalValue,
      isAnalyzable: totalValue > 0,
    };
  }

  /**
   * 코칭 상태 계산
   */
  private calculateCoachingState(
    currentAction: InvestmentAction,
    portfolio: PortfolioAnalysis
  ): CoachingState {
    // 포트폴리오 극단성 판단 임계값 (70% 이상)
    const isExtremeCrypto = portfolio.cryptoAllocation > 70;
    const isExtremeCash = portfolio.cashAllocation > 70;
    const isExtremeBonds = portfolio.realEstateAllocation > 70;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (isExtremeCash || (portfolio.cryptoAllocation < 10 && portfolio.stockAllocation > 60)) {
      riskLevel = 'LOW';
    } else if (isExtremeCrypto || (portfolio.cryptoAllocation > 60)) {
      riskLevel = 'HIGH';
    }

    const diversificationScore = this.calculateDiversificationScore(portfolio);

    return {
      currentAction,
      isExtremeCrypto,
      isExtremeCash,
      isExtremeBonds,
      diversificationScore,
      riskLevel,
    };
  }

  /**
   * 분산도 점수 계산 (0-100)
   * 높을수록 더 잘 분산된 포트폴리오
   */
  private calculateDiversificationScore(portfolio: PortfolioAnalysis): number {
    if (portfolio.assetCount === 0) return 0;

    // 자산 개수 점수 (최대 40점)
    const countScore = Math.min(portfolio.assetCount * 5, 40);

    // 할당 분산도 (각 카테고리가 25% 정도가 이상적)
    const targetAllocation = 0.25;
    const allocations = [
      portfolio.cryptoAllocation / 100,
      portfolio.cashAllocation / 100,
      portfolio.stockAllocation / 100,
      portfolio.realEstateAllocation / 100,
    ];

    const convexityScore = allocations.reduce((score, alloc) => {
      const deviation = Math.abs(alloc - targetAllocation);
      return score + Math.max(0, 15 - deviation * 100);
    }, 0);

    return Math.min(countScore + convexityScore, 100);
  }

  /**
   * 시장 드라이버 조회 (현재는 Mock, 향후 실제 API로 대체)
   */
  public getMarketDrivers(): MarketDriver[] {
    return getMockMarketDrivers();
  }

  /**
   * 포트폴리오 특성 기반 추가 팁
   */
  public getPortfolioTip(assets: Asset[], lang: string = 'ko'): string {
    const portfolio = this.analyzePortfolio(assets);

    if (!portfolio.isAnalyzable) {
      return lang === 'en' ? 'Add assets to your portfolio to start analysis.' : '포트폴리오에 자산을 추가하여 분석을 시작하세요.';
    }

    if (portfolio.assetCount < 3) {
      return lang === 'en'
        ? `You only have ${portfolio.assetCount} assets. Diversifying into more asset classes can reduce risk.`
        : `현재 ${portfolio.assetCount}개 자산만 있습니다. 더 많은 자산 클래스로 분산하면 위험을 줄일 수 있습니다.`;
    }

    if (portfolio.cryptoAllocation > 80) {
      return lang === 'en'
        ? 'Crypto allocation is very high. Consider increasing cash or bond allocation for stability.'
        : '암호화폐 비중이 매우 높습니다. 안정성을 위해 현금이나 채권 비중을 높이는 것을 검토하세요.';
    }

    if (portfolio.cashAllocation > 60) {
      return lang === 'en'
        ? 'Cash allocation is high. It seems you\'re waiting for market entry or taking a defensive position.'
        : '현금 비중이 높습니다. 시장에 진입할 기회를 노리고 있거나, 방어적 포지션을 취하고 계신 것으로 보입니다.';
    }

    return lang === 'en'
      ? `Diversification: ${portfolio.assetCount} assets with ${portfolio.cryptoAllocation.toFixed(1)}% crypto, ${portfolio.cashAllocation.toFixed(1)}% cash.`
      : `포트폴리오 분산도: ${portfolio.assetCount}개 자산으로 ${portfolio.cryptoAllocation.toFixed(1)}% 암호화폐, ${portfolio.cashAllocation.toFixed(1)}% 현금을 보유 중입니다.`;
  }
}

/**
 * 전역 싱글톤 인스턴스
 */
export const coachingService = CoachingService.getInstance();
