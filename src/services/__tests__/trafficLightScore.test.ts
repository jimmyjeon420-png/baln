import {
  convertContextToBriefing,
  getAssetSignals,
  getEmptyTrafficLight,
  getTrafficLight,
} from '../trafficLightScore';
import type { HealthScoreResult, FactorResult } from '../rebalanceScore';

function createFactor(overrides: Partial<FactorResult> = {}): FactorResult {
  return {
    label: '분산',
    icon: '📊',
    rawPenalty: 10,
    weight: 0.2,
    weightedPenalty: 2,
    score: 90,
    comment: '분산 상태가 안정적입니다.',
    ...overrides,
  };
}

function createHealthScore(totalScore: number, factors: FactorResult[]): HealthScoreResult {
  return {
    totalScore,
    grade: totalScore >= 85 ? 'S' : totalScore >= 75 ? 'A' : totalScore >= 50 ? 'B' : totalScore >= 30 ? 'C' : 'D',
    gradeColor: '#4CAF50',
    gradeBgColor: 'rgba(76, 175, 80, 0.1)',
    gradeLabel: '양호',
    factors,
    summary: factors[0]?.comment ?? '',
    driftStatus: {
      label: '안정',
      color: '#4CAF50',
      bgColor: 'rgba(76, 175, 80, 0.1)',
    },
  };
}

describe('trafficLightScore', () => {
  it('maps health score thresholds and weakest factor summary consistently', () => {
    const weakest = createFactor({ label: '집중도', score: 42, comment: '자산 집중도가 높습니다.' });
    const score75 = createHealthScore(75, [createFactor(), weakest, createFactor({ label: '변동성', score: 61 })]);
    const score50 = createHealthScore(50, [weakest, createFactor()]);
    const score49 = createHealthScore(49, [weakest, createFactor()]);

    expect(getTrafficLight(score75)).toMatchObject({
      light: 'green',
      label: '양호',
      summary: '자산 집중도가 높습니다.',
      weakestFactor: { label: '집중도', score: 42 },
    });

    expect(getTrafficLight(score50)).toMatchObject({
      light: 'yellow',
      label: '주의',
    });

    expect(getTrafficLight(score49)).toMatchObject({
      light: 'red',
      label: '위험',
    });
  });

  it('assigns per-asset signals based on weight and overall light', () => {
    const assets = [
      { name: '엔비디아', ticker: 'NVDA', currentValue: 40 },
      { name: '알파벳', ticker: 'GOOGL', currentValue: 20 },
      { name: '현금', ticker: 'CASH_KRW', currentValue: 10 },
    ];

    expect(getAssetSignals(assets, 70, 'green').map((item) => item.signal)).toEqual(['green', 'green', 'green']);
    expect(getAssetSignals(assets, 70, 'yellow').map((item) => item.signal)).toEqual(['yellow', 'green', 'green']);
    expect(getAssetSignals(assets, 70, 'red').map((item) => item.signal)).toEqual(['red', 'yellow', 'green']);
  });

  it('converts context card text into compact briefing without leaking raw price strings', () => {
    const briefing = convertContextToBriefing({
      headline: '연준 완화 기대 재확산',
      macroChain: ['금리 인하 기대', '유동성 확대', '성장주 리레이팅', '후속 문장'],
      portfolioImpact: {
        message: '₩300만원 증가 예상, -1.2% 변동성 확대',
      },
      sentiment: 'caution',
    });

    expect(briefing).toMatchObject({
      fact: '연준 완화 기대 재확산',
      mechanism: '금리 인하 기대 → 유동성 확대 → 성장주 리레이팅',
      sentiment: 'caution',
      sentimentLabel: '주의',
    });
    expect(briefing.impact).not.toContain('₩');
    expect(briefing.impact).not.toContain('%');
  });

  it('falls back to a readable impact summary when sanitized text becomes empty', () => {
    const briefing = convertContextToBriefing({
      portfolioImpact: {
        message: '₩300만원 -1.2%',
      },
    });

    expect(briefing.impact).toBe('오늘의 시장이 내 포트폴리오에 미치는 영향을 확인하세요');
  });

  it('returns the expected onboarding empty state', () => {
    expect(getEmptyTrafficLight()).toMatchObject({
      light: 'green',
      label: '시작하기',
      grade: '-',
      summary: '관심 자산을 하트하면 건강 점수를 알려드려요',
    });
  });
});
