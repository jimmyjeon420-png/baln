/**
 * 처방전 탭 공유 타입 정의
 *
 * 이전: HeroSection, MarketWeatherSection, TodayActionsSection 등에서 각각 중복 정의
 * 현재: 한 곳에서 정의하고 import로 공유
 */

// ── CFO 날씨 ──
export interface CfoWeather {
  emoji: string;
  status: string;
  message: string;
}

// ── 부동산 인사이트 ──
export interface RealEstateInsight {
  title: string;
  analysis: string;
  recommendation: string;
}

// ── 매크로 요약 ──
export interface MacroSummary {
  title: string;
  highlights: string[];
  marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  interestRateProbability?: string;
}

// ── 모닝 브리핑 (UI 표시용, gemini.ts의 MorningBriefingResult와 동일 구조) ──
export interface MorningBriefingData {
  macroSummary: MacroSummary;
  cfoWeather: CfoWeather;
  realEstateInsight?: RealEstateInsight | null;
  generatedAt: string;
}

// ── 포트폴리오 액션 ──
export interface PortfolioAction {
  ticker: string;
  name: string;
  action: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ── 포트폴리오 자산 (UI 표시용) ──
export interface RebalancePortfolioAsset {
  ticker: string;
  name: string;
  quantity?: number;
  currentPrice: number;
  avgPrice: number;
  currentValue: number;
}

// ── 실시간 가격 ──
export interface LivePriceData {
  currentPrice: number;
}

// ── 또래 비교 ──
export interface PeerComparison {
  bracketLabel: string;
  avgScore: number;
  sampleCount: number;
}
