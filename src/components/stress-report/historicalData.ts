/**
 * 역사적 시장 이벤트 정적 데이터
 *
 * 역할: 사용자에게 "과거에도 이런 일이 있었고, 회복했다"는 맥락 제공
 * 블랙록 Beat 2 (Historical Context) + Beat 4 (Recovery Outlook) 데이터 소스
 *
 * 모든 수치는 S&P 500 기준, 공식 통계 출처
 */

export interface HistoricalEvent {
  year: number;
  name: string;
  maxDrawdown: number;       // 최대 하락폭 (%)
  recoveryMonths: number;    // 회복까지 걸린 개월 수
  afterOneYear: number;      // 회복 후 1년 수익률 (%)
  shortDescription: string;  // 한 줄 설명
}

export interface RecoveryStats {
  totalCorrections: number;  // 1970년 이후 -10% 이상 조정 횟수
  recoveredCount: number;    // 회복한 횟수
  recoveryRate: number;      // 회복률 (%)
  avgRecoveryMonths: number; // 평균 회복 기간 (개월)
  avgAfterOneYear: number;   // 회복 후 평균 1년 수익률 (%)
}

/** 주요 역사적 시장 이벤트 (시나리오별 매칭용) */
export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  {
    year: 2008,
    name: '글로벌 금융위기',
    maxDrawdown: -56.8,
    recoveryMonths: 49,
    afterOneYear: 23.5,
    shortDescription: '리먼 브라더스 파산 → 전세계 신용경색',
  },
  {
    year: 2020,
    name: '코로나 팬데믹',
    maxDrawdown: -33.9,
    recoveryMonths: 5,
    afterOneYear: 68.0,
    shortDescription: '전세계 봉쇄 → 역대 최빠른 회복',
  },
  {
    year: 2022,
    name: '금리 인상 충격',
    maxDrawdown: -25.4,
    recoveryMonths: 10,
    afterOneYear: 19.6,
    shortDescription: 'Fed 급속 인상 → 성장주 대폭 조정',
  },
  {
    year: 2018,
    name: '미중 무역전쟁',
    maxDrawdown: -19.8,
    recoveryMonths: 4,
    afterOneYear: 28.9,
    shortDescription: '관세 충돌 → 시장 불확실성 확대',
  },
  {
    year: 2011,
    name: '유럽 재정위기',
    maxDrawdown: -19.4,
    recoveryMonths: 6,
    afterOneYear: 15.1,
    shortDescription: '그리스 국가부도 우려 → 글로벌 확산',
  },
];

/** 1970년 이후 S&P 500 -10% 이상 조정 통계 */
export const RECOVERY_STATS: RecoveryStats = {
  totalCorrections: 23,
  recoveredCount: 22,
  recoveryRate: 96,
  avgRecoveryMonths: 6,
  avgAfterOneYear: 15,
};

/** 시나리오별 관련 역사 이벤트 매칭 */
export const getEventsForScenario = (
  scenarioType: 'market_correction' | 'bear_market' | 'rate_shock'
): HistoricalEvent[] => {
  switch (scenarioType) {
    case 'market_correction':
      return HISTORICAL_EVENTS.filter(e =>
        [2020, 2018, 2011].includes(e.year)
      );
    case 'bear_market':
      return HISTORICAL_EVENTS.filter(e =>
        [2008, 2020, 2022].includes(e.year)
      );
    case 'rate_shock':
      return HISTORICAL_EVENTS.filter(e =>
        [2022, 2018, 2008].includes(e.year)
      );
    default:
      return HISTORICAL_EVENTS.slice(0, 3);
  }
};
