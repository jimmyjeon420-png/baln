/**
 * 6팩터 리밸런싱 건강 점수 엔진
 * ─────────────────────────────────
 * 브릿지워터 Risk Parity + 로보어드바이저 실무 기반
 * AI 의존 없이 앱 내 즉시 계산 (순수 함수)
 *
 * 6팩터: 배분 이탈도 / 자산 집중도 / 상관관계 / 변동성 / 하방리스크 / 세금효율
 */

import { Asset, AssetType } from '../types/asset';
import { getStockComposition } from '../data/tickerProfile';
import { t } from '../locales';

// ============================================================================
// 타입 정의
// ============================================================================

/** 자산 분류 카테고리 */
export type AssetCategory = 'cash' | 'bond' | 'large_cap' | 'realestate' | 'bitcoin' | 'altcoin' | 'gold' | 'commodity';

/** 유동 자산 카테고리 (부동산 제외) */
export const LIQUID_ASSET_CATEGORIES: AssetCategory[] = [
  'cash',
  'bond',
  'large_cap',
  'bitcoin',
  'altcoin',
  'gold',
  'commodity',
];

/** 건강 등급 */
export type HealthGrade = 'S' | 'A' | 'B' | 'C' | 'D';

/** 개별 팩터 결과 */
export interface FactorResult {
  label: string;       // 팩터 이름
  icon: string;        // 이모지 아이콘
  rawPenalty: number;  // 원시 패널티 (0~100)
  weight: number;      // 가중치 (0~1)
  weightedPenalty: number; // 가중 패널티
  score: number;       // 개별 점수 (100 - rawPenalty)
  comment: string;     // 한 줄 코멘트
}

/** 부동산 요약 정보 */
export interface RealEstateSummary {
  totalValue: number;           // 부동산 총 평가금액
  totalDebt: number;            // 부동산 총 대출
  netValue: number;             // 순자산 (평가 - 대출)
  ratioOfTotal: number;         // 전체 자산 대비 비율 (%)
  message: string;              // 긍정적 메시지
  diversificationBonus: number; // 건강 점수 보너스 (+0~+10점)
  bonusReason: string;          // 보너스 이유 설명
  avgLtv: number;               // 평균 LTV (%)
}

/** 건강 점수 계산 옵션 */
export interface HealthScoreOptions {
  /** 선택 구루 스타일 ('dalio' | 'buffett' | 'cathie_wood') */
  guruStyle?: string;
  /** 현재 코스톨라니 국면 ('A'~'F') */
  kostolalyPhase?: string;
}

/** 종합 건강 점수 결과 */
export interface HealthScoreResult {
  totalScore: number;      // 종합 점수 (0~100)
  grade: HealthGrade;      // 등급 (S/A/B/C/D)
  gradeColor: string;      // 등급 색상
  gradeBgColor: string;    // 등급 배경색
  gradeLabel: string;      // 한국어 라벨 ("최적"/"양호"/...)
  factors: FactorResult[]; // 7개 팩터 상세
  summary: string;         // 가장 취약 팩터 중심 한 줄 요약
  driftStatus: {           // 기존 배너 호환용
    label: string;
    color: string;
    bgColor: string;
  };
  realEstateSummary?: RealEstateSummary; // 부동산 별도 요약 (비유동 자산이 있을 때만)
}

// ============================================================================
// 상수 테이블
// ============================================================================

/** 크립토 티커 목록 (CoinGeckoProvider 기반) */
const CRYPTO_TICKERS = new Set([
  'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'DOGE', 'MATIC',
  'LTC', 'BCH', 'XLM', 'LINK', 'DOT', 'AVAX', 'ATOM', 'UNI', 'AAVE', 'SUSHI',
  // 추가 알트코인 (확장용)
  'SHIB', 'APE', 'SAND', 'MANA', 'FTM', 'NEAR', 'ALGO', 'VET', 'EOS', 'TRX',
]);

/** 스테이블코인 (현금 등가) */
const STABLECOIN_TICKERS = new Set(['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD']);

/** 채권 ETF 티커 */
const BOND_TICKERS = new Set([
  // 미국 채권 ETF
  'AGG', 'BND', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'TIP', 'VCIT', 'GOVT',
  'VGSH', 'SCHO', 'MUB', 'BNDX', 'EMB',
  // 국내 채권 ETF (KODEX 시리즈)
  '148070.KS', '114820.KS', '136340.KS',
]);

/**
 * 금/귀금속 티커 (달리오: "모든 포트폴리오에 금이 필요하다")
 * 금현물 ETF + 실물금 + 금선물 ETF + 귀금속 포함
 */
const GOLD_TICKERS = new Set([
  // 미국 금 ETF
  'GLD', 'IAU', 'GLDM', 'SGOL', 'BAR', 'AAAU',
  // 귀금속 (은, 백금)
  'SLV', 'SIVR', 'PPLT', 'PALL',
  // 국내 금 ETF (KODEX/TIGER)
  'GOLD', 'KODEX골드선물', '132030.KS', '319640.KS', '132030',
  // 금 관련 직접 표기
  'AU', 'XAU',
]);

/**
 * 원자재 티커 (에너지·농산물·광물 — 인플레이션 직접 헤지)
 * 달리오 All Weather: 원자재 7.5% 권장
 */
const COMMODITY_TICKERS = new Set([
  // 광범위 원자재 ETF
  'DJP', 'PDBC', 'GSCI', 'COMB', 'BCI', 'COMT',
  // 원유 ETF
  'USO', 'DBO', 'BNO', 'UCO',
  // 에너지 ETF
  'XLE', 'VDE', 'IYE', 'FENY',
  // 농산물 ETF
  'DBA', 'CORN', 'WEAT', 'SOYB',
  // 국내 원자재 ETF
  'COMMODITY', '261220.KS',
]);

/** 자산군별 연간 변동성 (학술 데이터 기반, %)
 * 금: World Gold Council 데이터 (연간 15%)
 * 원자재: Bloomberg Commodity Index (연간 25%)
 */
const VOLATILITY_MAP: Record<AssetCategory, number> = {
  cash: 1,
  bond: 6,
  large_cap: 18,
  realestate: 15,
  bitcoin: 70,
  altcoin: 100,
  gold: 15,       // 금: 실물 헤지 자산 (변동성은 주식 수준이지만 반대 방향)
  commodity: 25,  // 원자재: 에너지·농산물·광물 (공급 충격에 민감)
};

/**
 * 상관계수 매트릭스 (8×8, 학술 데이터 기반)
 * 순서: cash, bond, large_cap, realestate, bitcoin, altcoin, gold, commodity
 *
 * 금(gold) 핵심 특성 — 달리오 All Weather:
 * - 주식과 상관관계 ≈ 0.00 (위기 시 반대 방향) → 최고의 분산 효과
 * - 인플레이션 환경에서 구매력 보존 → 채권 대체재
 * - 원자재와 상관관계 0.60 (모두 실물 자산)
 *
 * 원자재(commodity) 핵심 특성:
 * - 인플레이션 직접 헤지 (CPI 구성 요소)
 * - 채권과 음의 상관관계 -0.10 (인플레이션 수혜 vs 피해)
 */
const CORRELATION_MATRIX: Record<AssetCategory, Record<AssetCategory, number>> = {
  cash:      { cash: 1.00, bond: 0.10, large_cap: -0.05, realestate: 0.05, bitcoin: 0.00, altcoin: 0.00, gold: 0.05,  commodity: 0.00 },
  bond:      { cash: 0.10, bond: 1.00, large_cap: -0.20, realestate: 0.15, bitcoin: 0.05, altcoin: 0.05, gold: 0.10,  commodity: -0.10 },
  large_cap: { cash: -0.05, bond: -0.20, large_cap: 1.00, realestate: 0.55, bitcoin: 0.35, altcoin: 0.45, gold: 0.00, commodity: 0.25 },
  realestate:{ cash: 0.05, bond: 0.15, large_cap: 0.55, realestate: 1.00, bitcoin: 0.20, altcoin: 0.25, gold: 0.15,  commodity: 0.30 },
  bitcoin:   { cash: 0.00, bond: 0.05, large_cap: 0.35, realestate: 0.20, bitcoin: 1.00, altcoin: 0.80, gold: 0.15,  commodity: 0.10 },
  altcoin:   { cash: 0.00, bond: 0.05, large_cap: 0.45, realestate: 0.25, bitcoin: 0.80, altcoin: 1.00, gold: 0.05,  commodity: 0.05 },
  gold:      { cash: 0.05, bond: 0.10, large_cap: 0.00,  realestate: 0.15, bitcoin: 0.15, altcoin: 0.05, gold: 1.00,  commodity: 0.60 },
  commodity: { cash: 0.00, bond: -0.10, large_cap: 0.25, realestate: 0.30, bitcoin: 0.10, altcoin: 0.05, gold: 0.60,  commodity: 1.00 },
};

/**
 * 달리오 All Weather 목표 배분 (크립토 포함 현대 버전)
 * 원칙: "어떤 경제 환경에서도 살아남는 포트폴리오"
 * 채권 40%로 경기침체 방어 극대화, 금·원자재로 인플레 헤지
 */
export const DALIO_TARGET: Record<AssetCategory, number> = {
  large_cap:  30,   // 주식: 성장 환경 수익원 (달리오 원칙 30%)
  bond:       40,   // 채권: 침체·디플레 방어 (원래 55% → 크립토 추가로 하향)
  bitcoin:     5,   // 비트코인: 디지털 금 소량 (달리오 2024 인정)
  gold:       10,   // 금: 인플레·지정학 헤지 (달리오 7.5% 기준 소폭 상향)
  commodity:   8,   // 원자재: 인플레 직접 헤지 (달리오 7.5% 기준)
  altcoin:     2,   // 알트코인: 최소 투기 (달리오 투기 자산 제한 원칙)
  cash:        5,   // 현금: 최소화 (달리오 "현금은 쓰레기")
  realestate:  0,   // 비유동 → 별도 관리
};

/**
 * 버핏 Berkshire 목표 배분 (생산적 자산 중심)
 * 원칙: "생산하는 자산만이 진짜 투자다"
 * 주식 60%, 현금 25%로 기회 포착 실탄 극대화
 */
export const BUFFETT_TARGET: Record<AssetCategory, number> = {
  large_cap:  60,   // 주식: "90%도 가능" — 생산적 복리 자산
  bond:        5,   // 채권: 최소 (버핏 "채권은 끔찍한 투자")
  bitcoin:     3,   // 비트코인: 최소 (버핏 "쥐약의 제곱" — 극소량만)
  gold:        2,   // 금: 최소 (버핏 "아무것도 생산 안 함" — 극소량만)
  commodity:   5,   // 원자재: 에너지 기업 주식 대신 ETF 소량
  altcoin:     0,   // 알트코인: 0% (버핏 완전 반대)
  cash:       25,   // 현금: "기회 실탄" — 버크셔 항상 200억달러+ 유지
  realestate:  0,   // 비유동 → 별도 관리
};

/**
 * 캐시우드 ARK Invest 목표 배분 — 혁신 기술 + 암호화폐 집중
 * 원칙: "혁신이 미래다. 파괴적 기술에 집중하라"
 * BTC 25% + 혁신주 50% + 알트코인 10% + 현금 15%
 */
export const CATHIE_WOOD_TARGET: Record<AssetCategory, number> = {
  large_cap:  50,   // 혁신주 (TSLA, NVDA, COIN 등 ARK 핵심 종목)
  bond:        0,   // 고정수익 0% — 혁신 시대에 채권은 불필요
  bitcoin:    25,   // BTC 강력 지지 ($1.5M 목표, ARK 주요 전략)
  gold:        0,   // 전통 저장 수단 × — 혁신으로 대체 가능
  commodity:   0,   // 원자재 0% — 혁신 주도 세상에서 불필요
  altcoin:    10,   // ETH, DeFi, Web3 (ARK의 크립토 생태계 투자)
  cash:       15,   // 변동성 기회 포착 실탄
  realestate:  0,   // 비유동 → 별도 관리
};

/**
 * 기본 목표 배분 — 달리오 All Weather × 버핏 Berkshire 합성
 *
 * [3인 라운드테이블 최종 합의]
 * ┌────────────────┬──────────┬──────────┬──────────────┐
 * │                │ 달리오   │ 버핏     │ 합의 (최종)  │
 * ├────────────────┼──────────┼──────────┼──────────────┤
 * │ 주식           │ 30%      │ 90%      │ 40% ↑        │
 * │ 채권           │ 55%      │ 10%      │ 15% ↓↓       │
 * │ 비트코인       │ 1-3%     │ 0%       │ 10% (한국)   │
 * │ 금             │ 7.5%     │ 0%       │ 12% (달리오) │
 * │ 원자재         │ 7.5%     │ 0%       │ 8%  (달리오) │
 * │ 알트코인       │ 0%       │ 0%       │ 5%  (투기↓)  │
 * │ 현금           │ -        │ 15-20%   │ 10% (버핏)   │
 * └────────────────┴──────────┴──────────┴──────────────┘
 *
 * 핵심 논거:
 * - 주식 40%: 버핏 "생산적 자산이 장기 복리". 20-40대 20년+ 투자 지평
 * - 채권 15%: 달리오 "경기침체 방어"는 맞지만 젊은 투자자는 시간으로 버틸 수 있음
 * - 금 12%: 달리오 승 — 인플레·지정학 헤지. 버핏은 "무수익"이라 반대하나 분산 효과 검증됨
 * - 원자재 8%: 달리오 "CPI 직접 헤지". 인플레 환경에서 채권보다 우수
 * - 비트코인 10%: 달리오(2024) "소량 보유 합리적". 한국 20-40대 실질적 보유 현황 반영
 * - 알트코인 5%: 두 거장 모두 반대. 현실적 최소선 유지
 * - 현금 10%: 버핏 "기회 포착 탄약". 급락 시 저가 매수 실탄
 */
export const DEFAULT_TARGET: Record<AssetCategory, number> = {
  large_cap:  40,   // 주식: 성장 엔진 (버핏 방향으로 상향)
  bond:       15,   // 채권: 침체 방어 (달리오 55%에서 대폭 하향 — 젊은 투자자 기준)
  bitcoin:    10,   // 비트코인: 디지털 금 (달리오 인정, 한국 현실)
  gold:       12,   // 금: 인플레·지정학 헤지 (달리오 7.5%에서 소폭 상향)
  commodity:   8,   // 원자재: 인플레 직접 헤지 (달리오 7.5% 기준)
  altcoin:     5,   // 알트코인: 투기적 성장 (두 거장 모두 반대 → 최소 보유)
  cash:       10,   // 현금: 기회 실탄 (버핏 영향)
  realestate:  0,   // 비유동 → 리밸런싱 제외 (달리오: "기준점이지 대상이 아님")
};

// ============================================================================
// 코스톨라니 달걀 모형 (Kostolany Egg Model)
// ============================================================================

/**
 * 코스톨라니 달걀 모형 국면 (A~F)
 * 독일 투자 거장 앙드레 코스톨라니의 주식시장 사이클 이론
 *
 * A → B → C → D → E → F → A (순환)
 * 각 국면마다 최적 자산 배분이 다름
 */
export type KostolalyPhase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** 국면 한국어 이름 */
export const KOSTOLANY_PHASE_NAMES: Record<KostolalyPhase, string> = {
  A: '바닥 국면',
  B: '상승 국면',
  C: '과열 국면',
  D: '하락 초기',
  E: '패닉 국면',
  F: '극비관 국면',
};

/** 국면 영어 이름 */
export const KOSTOLANY_PHASE_NAMES_EN: Record<KostolalyPhase, string> = {
  A: 'Bottom',
  B: 'Uptrend',
  C: 'Overheated',
  D: 'Early Decline',
  E: 'Panic',
  F: 'Stagnation',
};

/** 국면 이모지 */
export const KOSTOLANY_PHASE_EMOJIS: Record<KostolalyPhase, string> = {
  A: '🌱', B: '📈', C: '🔥', D: '⚠️', E: '💥', F: '🕳️',
};

/** 국면 설명 (투자 관점) */
export const KOSTOLANY_PHASE_DESCRIPTIONS: Record<KostolalyPhase, string> = {
  A: '비관론이 극에 달해 주가가 바닥. 은행 대출로 주식 사는 시기. 코스톨라니 "지금이 매수 찬스"',
  B: '주가 상승 시작. 거래량 증가. 기관투자자 진입. 추세 추종자들 합류',
  C: '시장 과열. 모두가 낙관론. 개인투자자 몰림. 뉴스가 강세로 가득. 매도 준비',
  D: '상승 추세 꺾임. 실망 매도 시작. 하락세 초기. 추세 추종자 이탈',
  E: '패닉 매도. 기관투자자 손절. 거래량 폭증. 신용융자 강제청산',
  F: '극단적 비관론. 거래량 감소. 무관심. 주식 관련 뉴스 실종. A 국면 전 단계',
};

/** 국면 설명 영어 (투자 관점) */
export const KOSTOLANY_PHASE_DESCRIPTIONS_EN: Record<KostolalyPhase, string> = {
  A: 'Pessimism at peak, stocks at bottom. Banks lending to buy stocks. Kostolany says "Now is the buying opportunity"',
  B: 'Stock prices rising. Volume increasing. Institutional investors entering. Trend followers joining',
  C: 'Market overheated. Everyone is optimistic. Retail investors flooding in. News full of bullish sentiment. Prepare to sell',
  D: 'Uptrend broken. Disappointment selling begins. Early decline. Trend followers exiting',
  E: 'Panic selling. Institutional stop-losses. Volume surging. Margin calls triggered',
  F: 'Post-crash stagnation. Fear lingers. Only contrarians start buying. Smart money accumulating quietly',
};

/**
 * 코스톨라니 국면별 최적 목표 배분
 * 코스톨라니 이론 + 달리오 All Weather + 버핏 Berkshire 합성
 *
 * A(바닥): 주식 최대 — "공포 극성일 때 사라"
 * B(상승): 주식 확대 + BTC 추가 — 추세 편승
 * C(과열): 주식 축소 + 현금/금 확대 — "탐욕 극성일 때 팔아라"
 * D(하락초): 채권/금 비중 확대
 * E(패닉): 채권/금 최대 — 방어 모드
 * F(극비관): 주식 조금씩 담기 시작 — A 준비
 */
export const KOSTOLANY_TARGETS: Record<KostolalyPhase, Record<AssetCategory, number>> = {
  A: { large_cap: 55, bond: 10, bitcoin: 10, gold: 15, commodity: 5,  altcoin: 3, cash: 2,  realestate: 0 },
  B: { large_cap: 65, bond: 5,  bitcoin: 15, gold: 5,  commodity: 3,  altcoin: 5, cash: 2,  realestate: 0 },
  C: { large_cap: 30, bond: 10, bitcoin: 5,  gold: 20, commodity: 10, altcoin: 2, cash: 23, realestate: 0 },
  D: { large_cap: 35, bond: 20, bitcoin: 5,  gold: 20, commodity: 8,  altcoin: 2, cash: 10, realestate: 0 },
  E: { large_cap: 20, bond: 30, bitcoin: 3,  gold: 25, commodity: 5,  altcoin: 2, cash: 15, realestate: 0 },
  F: { large_cap: 45, bond: 15, bitcoin: 8,  gold: 18, commodity: 5,  altcoin: 4, cash: 5,  realestate: 0 },
};

/**
 * 국면 조정 목표 배분 계산
 * 구루 기본 배분의 75% + 코스톨라니 국면 배분의 25% 합성
 *
 * @param guruTarget 구루 기본 목표 배분 (달리오/버핏/캐시우드)
 * @param phase 현재 코스톨라니 국면 (null이면 기본 배분 그대로 반환)
 * @returns 국면 반영된 조정 목표 배분 (합계 100% 보정됨)
 */
export function getPhaseAdjustedTarget(
  guruTarget: Record<AssetCategory, number>,
  phase: KostolalyPhase | null | undefined,
): Record<AssetCategory, number> {
  if (!phase) return guruTarget;

  const phaseTarget = KOSTOLANY_TARGETS[phase];
  const categories = Object.keys(guruTarget) as AssetCategory[];
  const adjusted: Record<string, number> = {};
  let sum = 0;

  for (const cat of categories) {
    const val = Math.round(guruTarget[cat] * 0.75 + phaseTarget[cat] * 0.25);
    adjusted[cat] = val;
    sum += val;
  }

  // 합계 100% 보정 — 가장 큰 카테고리에서 차이 조정
  if (sum !== 100) {
    let maxCat = categories[0];
    let maxVal = 0;
    for (const cat of categories) {
      if (adjusted[cat] > maxVal) { maxVal = adjusted[cat]; maxCat = cat; }
    }
    adjusted[maxCat] += (100 - sum);
  }

  return adjusted as Record<AssetCategory, number>;
}

/**
 * 유동 자산(부동산 제외) 기준으로 목표 비중을 100%로 정규화
 *
 * 리밸런싱은 유동 자산 안에서만 실행하므로,
 * customTarget에 realestate 비중이 포함되어도 유동 7개 카테고리 합이 100%가 되도록 보정한다.
 */
export function normalizeLiquidTarget(
  customTarget?: Record<AssetCategory, number>,
): Record<AssetCategory, number> {
  const target = customTarget ?? DEFAULT_TARGET;
  const liquidSum = LIQUID_ASSET_CATEGORIES.reduce(
    (sum, cat) => sum + Math.max(0, target[cat] || 0),
    0,
  );

  const fallbackSum = LIQUID_ASSET_CATEGORIES.reduce(
    (sum, cat) => sum + Math.max(0, DEFAULT_TARGET[cat] || 0),
    0,
  );
  const denom = liquidSum > 0 ? liquidSum : Math.max(1, fallbackSum);

  const normalized = { ...DEFAULT_TARGET } as Record<AssetCategory, number>;
  LIQUID_ASSET_CATEGORIES.forEach((cat) => {
    const raw = liquidSum > 0 ? (target[cat] || 0) : (DEFAULT_TARGET[cat] || 0);
    normalized[cat] = (Math.max(0, raw) / denom) * 100;
  });

  // 부동산은 리밸런싱 대상이 아니므로 점수/처방전 계산에서 직접 사용하지 않는다.
  normalized.realestate = target.realestate ?? 0;

  return normalized;
}

/** 등급 색상 설정 (정적) */
const GRADE_COLORS: Record<HealthGrade, { color: string; bgColor: string }> = {
  S: { color: '#2E7D32', bgColor: 'rgba(46,125,50,0.15)' },
  A: { color: '#3F8C42', bgColor: 'rgba(63,140,66,0.15)' },
  B: { color: '#B56A00', bgColor: 'rgba(181,106,0,0.16)' },
  C: { color: '#B6572A', bgColor: 'rgba(182,87,42,0.15)' },
  D: { color: '#B23A48', bgColor: 'rgba(178,58,72,0.15)' },
};

/** 등급 설정 (라벨은 i18n 적용) */
function getGradeConfig(grade: HealthGrade): { color: string; bgColor: string; label: string } {
  const colors = GRADE_COLORS[grade];
  return {
    ...colors,
    label: t(`health.gradeLabels.${grade}`),
  };
}

// ============================================================================
// 자산 분류 함수
// ============================================================================

/**
 * 개별 자산을 6개 카테고리로 분류
 * - illiquid → 부동산
 * - BTC → bitcoin
 * - 스테이블코인 → 현금
 * - 채권 ETF → 채권
 * - 기타 크립토 → altcoin
 * - 나머지 → large_cap (주식)
 */
export function classifyAsset(asset: Asset): AssetCategory {
  const ticker = (asset.ticker || '').toUpperCase();

  // 비유동 자산 → 부동산
  if (asset.assetType === AssetType.ILLIQUID) return 'realestate';

  // CASH_ 접두사 → 원화현금/달러예금/CMA
  if (ticker.startsWith('CASH_')) return 'cash';

  // 스테이블코인 → 현금 등가
  if (STABLECOIN_TICKERS.has(ticker)) return 'cash';

  // 비트코인
  if (ticker === 'BTC') return 'bitcoin';

  // 기타 크립토
  if (CRYPTO_TICKERS.has(ticker)) return 'altcoin';

  // 채권 ETF
  if (BOND_TICKERS.has(ticker)) return 'bond';

  // 금/귀금속 ETF (달리오: 모든 포트폴리오에 금이 필요)
  if (GOLD_TICKERS.has(ticker)) return 'gold';

  // 원자재 ETF (에너지·농산물·광물 — 인플레이션 직접 헤지)
  if (COMMODITY_TICKERS.has(ticker)) return 'commodity';

  // 나머지 → 주식 (대형주)
  return 'large_cap';
}

// ============================================================================
// 팩터 계산 함수들
// ============================================================================

/** 자산의 현재 평가 금액 (NaN/Infinity 방어) */
function getAssetValue(asset: Asset): number {
  const computed = (asset.quantity != null && asset.quantity > 0 && asset.currentPrice != null && asset.currentPrice > 0)
    ? asset.quantity * asset.currentPrice
    : asset.currentValue;
  return Number.isFinite(computed) ? computed : 0;
}

/**
 * 자산의 순자산 (총자산 - 대출)
 * Phase 1: 부동산 대출만 지원
 */
export function getNetAssetValue(asset: Asset): number {
  const grossValue = getAssetValue(asset);
  const debt = asset.debtAmount || 0;
  return Math.max(0, grossValue - debt);
}

/**
 * LTV (Loan-to-Value) 계산
 * 대출 잔액 / 자산 가치 × 100
 */
export function calculateLTV(asset: Asset): number {
  const grossValue = getAssetValue(asset);
  const debt = asset.debtAmount || 0;
  if (grossValue === 0 || debt === 0) return 0;
  return (debt / grossValue) * 100;
}

/**
 * 팩터 1: 배분 이탈도 (25%)
 * 카테고리 단위로 현재 비중 vs 목표 비중 비교 (DEFAULT_TARGET 기반)
 *
 * [이전 방식 문제]: 자산별 DB field `targetAllocation` 사용
 *   → 사용자가 목표를 설정 안 하면 모두 0% → 언제나 최악의 패널티
 *
 * [새 방식]: 자산군 카테고리 단위 비교 (DEFAULT_TARGET 또는 커스텀 target)
 *   → 실제 포트폴리오 구성이 달리오/버핏 최적 배분과 얼마나 다른지 측정
 */
function calcDriftPenalty(
  assets: Asset[],
  total: number,
  customTarget?: Record<AssetCategory, number>,
): FactorResult {
  if (total === 0) {
    return { label: '배분 이탈도', icon: '🎯', rawPenalty: 0, weight: 0.225, weightedPenalty: 0, score: 100, comment: t('checkup.factor_comments.add_assets') };
  }

  const target = normalizeLiquidTarget(customTarget);

  // 카테고리별 현재 비중 계산 (유동 자산만, 순자산 기준)
  const categoryPct: Record<string, number> = {};
  for (const cat of LIQUID_ASSET_CATEGORIES) categoryPct[cat] = 0;

  for (const asset of assets) {
    const cat = classifyAsset(asset);
    if (cat !== 'realestate') {
      categoryPct[cat] = (categoryPct[cat] || 0) + (getNetAssetValue(asset) / total) * 100;
    }
  }

  // 목표 대비 이탈도: Σ|실제% - 목표%| / 2
  const drift = LIQUID_ASSET_CATEGORIES.reduce((sum, cat) => {
    return sum + Math.abs((categoryPct[cat] || 0) - (target[cat] || 0));
  }, 0) / 2;

  const penalty = Math.min(100, drift * 2.5); // ×4 → ×2.5로 완화 (카테고리 기준 더 엄격해지므로)
  const score = Math.round(100 - penalty);

  // 가장 많이 이탈한 카테고리 찾기
  let maxDriftCat = LIQUID_ASSET_CATEGORIES[0];
  let maxDrift = 0;
  for (const cat of LIQUID_ASSET_CATEGORIES) {
    const d = Math.abs((categoryPct[cat] || 0) - (target[cat] || 0));
    if (d > maxDrift) { maxDrift = d; maxDriftCat = cat; }
  }

  const catKey = `checkup.cat_labels.${maxDriftCat}`;
  const catName = t(catKey);

  const comment = drift < 5
    ? t('checkup.factor_comments.drift_good')
    : drift < 15
    ? t('checkup.factor_comments.drift_mild', { cat: catName, pct: maxDrift.toFixed(0) })
    : drift < 25
    ? t('checkup.factor_comments.drift_mod', { cat: catName })
    : t('checkup.factor_comments.drift_bad');

  return { label: '배분 이탈도', icon: '🎯', rawPenalty: penalty, weight: 0.225, weightedPenalty: penalty * 0.225, score, comment };
}

/**
 * 팩터 2: 위험 집중도 (20%) - 달리오 Risk Parity
 * 금액이 아니라 위험 기여도로 집중도 측정
 * 위험 기여도 = 자산 가치 × 변동성
 */
function calcRiskWeightedConcentration(assets: Asset[], total: number): FactorResult {
  if (total === 0 || assets.length === 0) {
    return { label: '위험 집중도', icon: '⚖️', rawPenalty: 0, weight: 0.180, weightedPenalty: 0, score: 100, comment: t('checkup.factor_comments.add_assets') };
  }

  // 1. 각 자산의 위험 기여도 계산
  const riskContributions: number[] = [];
  let totalRisk = 0;

  for (const asset of assets) {
    const value = getNetAssetValue(asset); // 순자산 (부동산은 대출 차감)
    const vol = VOLATILITY_MAP[classifyAsset(asset)] / 100;
    const risk = value * vol;
    riskContributions.push(risk);
    totalRisk += risk;
  }

  if (totalRisk === 0) {
    return { label: '위험 집중도', icon: '⚖️', rawPenalty: 0, weight: 0.180, weightedPenalty: 0, score: 100, comment: t('checkup.factor_comments.risk_unmeasurable') };
  }

  // 2. 위험 가중 HHI 계산
  const riskHHI = riskContributions.reduce((sum, risk) => {
    const riskWeight = risk / totalRisk;
    return sum + riskWeight * riskWeight;
  }, 0);

  // 3. 정규화
  const n = assets.length;
  const minHHI = 1 / n;
  const normalizedHHI = n === 1 ? 100 : ((riskHHI - minHHI) / (1 - minHHI)) * 100;
  const penalty = Math.min(100, Math.max(0, normalizedHHI));
  const score = Math.round(100 - penalty);

  // 4. 가장 큰 위험 기여 자산 찾기
  let maxRiskAsset = assets[0];
  let maxRisk = 0;
  for (let i = 0; i < assets.length; i++) {
    if (riskContributions[i] > maxRisk) {
      maxRisk = riskContributions[i];
      maxRiskAsset = assets[i];
    }
  }
  const maxRiskPct = (maxRisk / totalRisk) * 100;

  const comment = penalty < 20
    ? t('checkup.factor_comments.risk_good')
    : t('checkup.factor_comments.risk_concentrated', { name: maxRiskAsset.ticker || maxRiskAsset.name, pct: maxRiskPct.toFixed(0) });

  return { label: '위험 집중도', icon: '⚖️', rawPenalty: penalty, weight: 0.180, weightedPenalty: penalty * 0.180, score, comment };
}

/**
 * 팩터 3: 상관관계 리스크 (15%)
 * 카테고리별 비중 × 상관계수 매트릭스 가중 평균
 */
function calcCorrelationPenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '상관관계', icon: '🔗', rawPenalty: 0, weight: 0.135, weightedPenalty: 0, score: 100, comment: t('checkup.factor_comments.add_assets') };
  }

  // 카테고리별 비중 계산 (순자산 기준)
  const categoryWeights: Record<AssetCategory, number> = {
    cash: 0, bond: 0, large_cap: 0, realestate: 0, bitcoin: 0, altcoin: 0, gold: 0, commodity: 0,
  };
  for (const asset of assets) {
    const cat = classifyAsset(asset);
    categoryWeights[cat] += getNetAssetValue(asset) / total;
  }

  // 포트폴리오 가중 평균 상관계수
  let weightedCorr = 0;
  let totalWeight = 0;
  const categories = Object.keys(categoryWeights) as AssetCategory[];

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const wi = categoryWeights[categories[i]];
      const wj = categoryWeights[categories[j]];
      if (wi > 0 && wj > 0) {
        const corr = CORRELATION_MATRIX[categories[i]][categories[j]];
        const pairWeight = wi * wj;
        weightedCorr += corr * pairWeight;
        totalWeight += pairWeight;
      }
    }
  }

  const avgCorr = totalWeight > 0 ? weightedCorr / totalWeight : 0;
  // 상관계수 0.5+ → 위험, -0.2 → 이상적
  // 정규화: (-0.3 ~ 0.8) → (0 ~ 100)
  const penalty = Math.min(100, Math.max(0, ((avgCorr + 0.3) / 1.1) * 100));
  const score = Math.round(100 - penalty);

  const usedCategories = categories.filter(c => categoryWeights[c] > 0.01);
  const comment = usedCategories.length <= 1
    ? t('checkup.factor_comments.corr_single')
    : avgCorr > 0.4
    ? t('checkup.factor_comments.corr_high')
    : avgCorr < 0.1
    ? t('checkup.factor_comments.corr_good')
    : t('checkup.factor_comments.corr_optimal');

  return { label: '상관관계', icon: '🔗', rawPenalty: penalty, weight: 0.135, weightedPenalty: penalty * 0.135, score, comment };
}

/**
 * 팩터 4: 변동성 리스크 (15%)
 * 가중평균 변동성 vs 벤치마크(18%)
 */
function calcVolatilityPenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '변동성', icon: '📈', rawPenalty: 0, weight: 0.135, weightedPenalty: 0, score: 100, comment: t('checkup.factor_comments.add_assets') };
  }

  // 가중평균 변동성 계산 (순자산 기준)
  let weightedVol = 0;
  for (const asset of assets) {
    const cat = classifyAsset(asset);
    const weight = getNetAssetValue(asset) / total;
    weightedVol += VOLATILITY_MAP[cat] * weight;
  }

  // 벤치마크 18% 대비 초과 변동성 → 패널티
  const benchmark = 18;
  const excessVol = Math.max(0, weightedVol - benchmark);
  // 초과 1%당 1.5점 패널티, 최대 100
  const penalty = Math.min(100, excessVol * 1.5);
  const score = Math.round(100 - penalty);

  const comment = weightedVol < 15
    ? t('checkup.factor_comments.vol_low')
    : weightedVol <= 25
    ? t('checkup.factor_comments.vol_ok', { pct: weightedVol.toFixed(0) })
    : t('checkup.factor_comments.vol_high', { pct: weightedVol.toFixed(0) });

  return { label: '변동성', icon: '📈', rawPenalty: penalty, weight: 0.135, weightedPenalty: penalty * 0.135, score, comment };
}

/**
 * 팩터 5: 하방 리스크 (10%)
 * 손실 자산의 가중평균 손실률 × 3
 */
function calcDownsidePenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '하방 리스크', icon: '🛡️', rawPenalty: 0, weight: 0.090, weightedPenalty: 0, score: 100, comment: t('checkup.factor_comments.add_assets') };
  }

  let lossCount = 0;
  let weightedLoss = 0;

  for (const asset of assets) {
    const currentValue = getAssetValue(asset);
    const costBasis = asset.costBasis || asset.currentValue;
    if (costBasis > 0 && currentValue < costBasis) {
      const lossPct = ((costBasis - currentValue) / costBasis) * 100;
      const weight = currentValue / total;
      weightedLoss += lossPct * weight;
      lossCount++;
    }
  }

  const penalty = Math.min(100, weightedLoss * 3);
  const score = Math.round(100 - penalty);

  const comment = lossCount === 0
    ? t('checkup.factor_comments.loss_none')
    : t('checkup.factor_comments.loss_count', { count: lossCount });

  return { label: '하방 리스크', icon: '🛡️', rawPenalty: penalty, weight: 0.090, weightedPenalty: penalty * 0.090, score, comment };
}

/**
 * 팩터 6: 세금 효율 (5%)
 * TLH(Tax-Loss Harvesting) 가능 종목 비율 (5%+ 손실)
 */
function calcTaxEfficiencyPenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '세금 효율', icon: '💰', rawPenalty: 0, weight: 0.045, weightedPenalty: 0, score: 100, comment: t('checkup.factor_comments.add_assets') };
  }

  let tlhCount = 0;
  const liquidAssets = assets.filter(a => a.assetType === AssetType.LIQUID);

  for (const asset of liquidAssets) {
    const currentValue = getAssetValue(asset);
    const costBasis = asset.costBasis || asset.currentValue;
    if (costBasis > 0) {
      const lossPct = ((costBasis - currentValue) / costBasis) * 100;
      // 5% 이상 손실 → TLH 기회
      if (lossPct >= 5) {
        tlhCount++;
      }
    }
  }

  // TLH 기회가 많을수록 "활용 안 하고 있다" → 패널티
  // 전체 유동 자산 중 TLH 가능 비율 × 100
  const tlhRatio = liquidAssets.length > 0 ? (tlhCount / liquidAssets.length) : 0;
  const penalty = Math.min(100, tlhRatio * 100);
  const score = Math.round(100 - penalty);

  const comment = tlhCount === 0
    ? t('checkup.factor_comments.tax_none')
    : t('checkup.factor_comments.tax_opportunity', { count: tlhCount });

  return { label: '세금 효율', icon: '💰', rawPenalty: penalty, weight: 0.045, weightedPenalty: penalty * 0.045, score, comment };
}

/**
 * 팩터 7: 레버리지 건전성 (10%) - 신규 추가
 * 레버리지 위험 = LTV × 변동성 × 자산 가치
 * 달리오: "레버리지는 리스크를 증폭시킨다"
 */
function calcLeveragePenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '레버리지 건전성', icon: '💳', rawPenalty: 0, weight: 0.090, weightedPenalty: 0, score: 100, comment: t('checkup.factor_comments.add_assets') };
  }

  let totalLeverageRisk = 0;
  let debtCount = 0;

  for (const asset of assets) {
    const value = getAssetValue(asset);
    const debt = asset.debtAmount || 0;

    if (debt > 0 && value > 0) {
      const ltv = debt / value;
      const volatility = VOLATILITY_MAP[classifyAsset(asset)] / 100;

      // 레버리지 위험 = LTV × 변동성 × 자산 가치
      // 예: 부동산 10억, 대출 4억, 변동성 15%
      //    → 0.4 × 0.15 × 10억 = 6,000만
      const leverageRisk = ltv * volatility * value;
      totalLeverageRisk += leverageRisk;
      debtCount++;
    }
  }

  if (debtCount === 0) {
    return { label: '레버리지 건전성', icon: '💳', rawPenalty: 0, weight: 0.090, weightedPenalty: 0, score: 100, comment: t('checkup.factor_comments.leverage_none') };
  }

  // 포트폴리오 전체 대비 레버리지 위험 비율
  const leverageRiskRatio = (totalLeverageRisk / total) * 100;

  // 패널티 계산
  // 0-5%: 안전 (패널티 0-50)
  // 5-10%: 주의 (패널티 50-100)
  // 10%+: 위험 (패널티 100)
  const penalty = Math.min(100, leverageRiskRatio * 10);
  const score = Math.round(100 - penalty);

  const comment = penalty < 20
    ? t('checkup.factor_comments.leverage_safe')
    : penalty < 50
    ? t('checkup.factor_comments.leverage_mod', { pct: leverageRiskRatio.toFixed(1) })
    : t('checkup.factor_comments.leverage_high', { pct: leverageRiskRatio.toFixed(1) });

  return { label: '레버리지 건전성', icon: '💳', rawPenalty: penalty, weight: 0.090, weightedPenalty: penalty * 0.090, score, comment };
}

/**
 * 팩터 8: 철학 정합도 (10%) — 신규
 * 선택 구루 철학과 실제 보유 종목 스타일의 정합도 측정
 *
 * [버핏]: 가치주+배당주 비중 높을수록 고점
 * [캐시우드]: 성장주 비중 높을수록 고점 (투기주 과다 시 감점)
 * [달리오]: 성장/가치/배당 균형 잡힐수록 고점
 * [코스톨라니]: 기본 75점 (국면별 동적 조정은 useHeartAssets에서)
 */
function calcPhilosophyAlignment(
  assets: Asset[],
  guruStyle: string,
): FactorResult {
  const stockAssets = assets.filter(a => classifyAsset(a) === 'large_cap');

  // 주식 미보유 → 중립 (100점, 해당 없음)
  if (stockAssets.length === 0) {
    return {
      label: '철학 정합도',
      icon: '🧭',
      rawPenalty: 0,
      weight: 0.10,
      weightedPenalty: 0,
      score: 100,
      comment: t('checkup.factor_comments.philosophy_na'),
    };
  }

  const comp = getStockComposition(stockAssets);
  let score = 0;

  if (guruStyle === 'buffett') {
    // 가치주 + 배당주 비중이 높을수록 고점
    score = Math.min(100, (comp.value + comp.dividend) * 1.2);
  } else if (guruStyle === 'cathie_wood') {
    // 성장주 비중 높을수록 고점, 투기주 과다 시 감점
    score = Math.min(100, Math.max(0, comp.growth * 1.3 - comp.speculative * 0.5));
  } else {
    // 달리오 기본: 성장/가치/배당 균형 → 편중 없을수록 고점
    const deviation =
      Math.abs(comp.growth - comp.value) +
      Math.abs(comp.value - comp.dividend);
    score = Math.max(0, 100 - deviation * 0.6);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const rawPenalty = 100 - score;

  return {
    label: '철학 정합도',
    icon: '🧭',
    rawPenalty,
    weight: 0.10,
    weightedPenalty: rawPenalty * 0.10,
    score,
    comment: score >= 70
      ? t('checkup.factor_comments.philosophy_good')
      : score >= 40
      ? t('checkup.factor_comments.philosophy_mod')
      : t('checkup.factor_comments.philosophy_bad'),
  };
}

// ============================================================================
// 등급 판정
// ============================================================================

function getGrade(score: number): HealthGrade {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * 부동산 분산 보너스 (달리오 All Weather 원칙)
 *
 * 달리오 근거:
 * 1. 실물 자산(부동산)은 금융 자산과 낮은 상관관계 → 실질적인 분산 효과
 * 2. 인플레이션 환경에서 실물 자산은 구매력 보존 → 포트폴리오 안정성 기여
 * 3. 적절한 LTV(≤60%)는 레버리지 이점을 안전하게 활용
 *
 * 보너스 조건:
 * - 부동산 순자산 비율 10~60% (최적 구간 20~40%: 최대 보너스)
 * - 평균 LTV 80% 미만 (안전 레버리지)
 * - 최대 +10점
 */
export function calcRealEstateDiversificationBonus(
  illiquidAssets: Asset[],
  totalNetAssets: number,
): { bonus: number; reason: string; avgLtv: number } {
  if (illiquidAssets.length === 0 || totalNetAssets <= 0) {
    return { bonus: 0, reason: '', avgLtv: 0 };
  }

  const grossValue = illiquidAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  const totalDebt = illiquidAssets.reduce((sum, a) => sum + (a.debtAmount || 0), 0);
  const netValue = grossValue - totalDebt;
  const avgLtv = grossValue > 0 ? (totalDebt / grossValue) * 100 : 0;

  if (netValue <= 0) {
    return { bonus: 0, reason: t('checkup.realestate_bonus.ltv_over100'), avgLtv };
  }

  if (avgLtv >= 80) {
    return { bonus: 0, reason: t('checkup.realestate_bonus.ltv_over80'), avgLtv };
  }

  const ratio = netValue / totalNetAssets;

  // 비율이 너무 낮거나 너무 높으면 보너스 없음
  if (ratio < 0.1) return { bonus: 0, reason: '', avgLtv };
  if (ratio > 0.9) return { bonus: 0, reason: t('checkup.realestate_bonus.ratio_high'), avgLtv };

  // 비율 점수: 20~60% 구간 최대 (한국 실정 반영), 그 외 선형 감소
  // 한국 40~50대는 부동산 비중이 50~70%인 경우가 흔하므로 구간 확대
  let ratioScore: number;
  if (ratio >= 0.20 && ratio <= 0.60) {
    ratioScore = 1.0;
  } else if (ratio < 0.20) {
    ratioScore = (ratio - 0.10) / 0.10;
  } else {
    // 60~90%: 선형 감소 (90%에서 0)
    ratioScore = 1.0 - (ratio - 0.60) / 0.30;
  }

  // LTV 점수: 60% 이하면 만점, 60~80% 구간에서 선형 감소
  // (한국 안심전환대출·DSR 기준 LTV 60% = 안전 레버리지)
  const ltvScore = avgLtv <= 60
    ? 1.0
    : Math.max(0, (80 - avgLtv) / 20);

  const bonus = Math.max(1, Math.round(ratioScore * ltvScore * 10));

  let reason: string;
  if (bonus >= 8) {
    reason = t('checkup.realestate_bonus.high');
  } else if (bonus >= 5) {
    reason = t('checkup.realestate_bonus.medium');
  } else {
    reason = t('checkup.realestate_bonus.low');
  }

  return { bonus, reason, avgLtv };
}

/**
 * 포트폴리오 건강 점수 계산 (8팩터 종합 - 달리오 Risk Parity + 철학 정합도)
 *
 * 부동산(ILLIQUID)은 리밸런싱 대상에서 제외됩니다.
 * 달리오: "비유동 자산은 리밸런싱 대상이 아니라 기준점"
 * 이승건: "행동 불가능한 정보로 불안 유발 금지"
 *
 * @param assets 전체 자산 배열 (부동산 포함)
 * @param totalAssets 총 평가금액 (참고용 — 내부에서 재계산)
 * @param customTarget 사용자 커스텀 목표 배분 (없으면 DEFAULT_TARGET 사용)
 * @param options 건강 점수 옵션 (구루 스타일, 코스톨라니 국면)
 * @returns HealthScoreResult (종합 점수, 등급, 8팩터 상세, 부동산 요약)
 */
export function calculateHealthScore(
  assets: Asset[],
  totalAssets: number,
  customTarget?: Record<AssetCategory, number>,
  options?: HealthScoreOptions,
): HealthScoreResult {
  // ── 부동산(비유동) 자산 분리 ──
  const liquidAssets = assets.filter(a => a.assetType !== AssetType.ILLIQUID);
  const illiquidAssets = assets.filter(a => a.assetType === AssetType.ILLIQUID);

  // 유동 자산의 순자산 합계 (7팩터 계산 기준)
  const liquidNetTotal = liquidAssets.reduce((sum, a) => sum + getNetAssetValue(a), 0);

  // 전체 순자산 (부동산 비율 계산용)
  const totalNetAssets = assets.reduce((sum, a) => sum + getNetAssetValue(a), 0);

  // 8팩터 계산 — 유동 자산만 대상 (달리오 Risk Parity + 철학 정합도)
  const guruStyle = options?.guruStyle ?? 'dalio';
  const factors: FactorResult[] = [
    calcDriftPenalty(liquidAssets, liquidNetTotal, customTarget),
    calcRiskWeightedConcentration(liquidAssets, liquidNetTotal),
    calcCorrelationPenalty(liquidAssets, liquidNetTotal),
    calcVolatilityPenalty(liquidAssets, liquidNetTotal),
    calcDownsidePenalty(liquidAssets, liquidNetTotal),
    calcTaxEfficiencyPenalty(liquidAssets, liquidNetTotal),
    calcLeveragePenalty(liquidAssets, liquidNetTotal),
    calcPhilosophyAlignment(liquidAssets, guruStyle),
  ];

  // 종합 점수: 100 - Σ(rawPenalty × weight)
  const totalPenalty = factors.reduce((sum, f) => sum + f.weightedPenalty, 0);
  const totalScore = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  // 등급 판정
  const grade = getGrade(totalScore);
  const _gradeConfig = getGradeConfig(grade);

  // 가장 취약한 팩터 → summary 생성 (일반인 친화적 언어)
  const worstFactor = [...factors].sort((a, b) => b.rawPenalty - a.rawPenalty)[0];
  const FACTOR_FRIENDLY_KEY: Record<string, string> = {
    '배분 이탈도': 'checkup.friendly_labels.drift',
    '위험 집중도': 'checkup.friendly_labels.concentration',
    '상관관계': 'checkup.friendly_labels.correlation',
    '변동성': 'checkup.friendly_labels.volatility',
    '하방 리스크': 'checkup.friendly_labels.downside',
    '세금 효율': 'checkup.friendly_labels.tax',
  };
  const friendlyLabel = FACTOR_FRIENDLY_KEY[worstFactor.label]
    ? t(FACTOR_FRIENDLY_KEY[worstFactor.label])
    : worstFactor.label;
  const summary = totalScore >= 85
    ? t('checkup.summary.excellent')
    : totalScore >= 70
    ? t('checkup.summary.good', { factor: friendlyLabel })
    : totalScore >= 55
    ? t('checkup.summary.fair', { factor: friendlyLabel })
    : t('checkup.summary.poor');

  // driftStatus 호환 (기존 배너용)
  const driftStatus = totalScore >= 75
    ? { label: t('health.driftLabels.balanced'), color: '#2E7D32', bgColor: 'rgba(46,125,50,0.15)' }
    : totalScore >= 50
    ? { label: t('health.driftLabels.caution'), color: '#B56A00', bgColor: 'rgba(181,106,0,0.15)' }
    : { label: t('health.driftLabels.needsAdjustment'), color: '#B23A48', bgColor: 'rgba(178,58,72,0.15)' };

  // ── 부동산 분산 보너스 (달리오 All Weather 원칙) ──
  const { bonus: realEstateBonus, reason: bonusReason, avgLtv } =
    calcRealEstateDiversificationBonus(illiquidAssets, totalNetAssets);

  // 보너스 반영한 최종 점수 (최대 100점)
  const finalScore = Math.min(100, totalScore + realEstateBonus);
  const finalGrade = getGrade(finalScore);
  const finalGradeConfig = getGradeConfig(finalGrade);

  // ── 부동산 요약 정보 ──
  const realEstateGrossValue = illiquidAssets.reduce((sum, a) => sum + getAssetValue(a), 0);
  const realEstateDebt = illiquidAssets.reduce((sum, a) => sum + (a.debtAmount || 0), 0);
  const realEstateNetValue = realEstateGrossValue - realEstateDebt;
  const realEstateRatio = totalNetAssets > 0 ? (realEstateNetValue / totalNetAssets) * 100 : 0;

  const realEstateSummary: RealEstateSummary | undefined = illiquidAssets.length > 0
    ? {
        totalValue: realEstateGrossValue,
        totalDebt: realEstateDebt,
        netValue: realEstateNetValue,
        ratioOfTotal: realEstateRatio,
        avgLtv,
        diversificationBonus: realEstateBonus,
        bonusReason,
        message: realEstateBonus >= 5
          ? t('checkup.realestate_msg.strong', { pts: realEstateBonus })
          : realEstateBonus >= 1
          ? t('checkup.realestate_msg.moderate', { pts: realEstateBonus })
          : t('checkup.realestate_msg.review'),
      }
    : undefined;

  return {
    totalScore: finalScore,
    grade: finalGrade,
    gradeColor: finalGradeConfig.color,
    gradeBgColor: finalGradeConfig.bgColor,
    gradeLabel: finalGradeConfig.label,
    factors,
    summary,
    driftStatus,
    realEstateSummary,
  };
}
