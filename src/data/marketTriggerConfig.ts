/**
 * 시장 트리거 이벤트 설정
 *
 * 역할: "마을 비상벨" — 시장 상황에 따라 마을에 특별 이벤트 발생
 * 비유: 실적 시즌이면 마을이 축제 분위기, 시장 급락이면 폭풍 분위기
 *
 * WORLD_DESIGN.md 섹션 6-1 (마켓 트리거 이벤트)
 */

// ============================================================================
// Types
// ============================================================================

export interface MarketTriggerEvent {
  id: string;
  nameKo: string;
  nameEn: string;
  emoji: string;
  descriptionKo: string;
  descriptionEn: string;
  /** 데코레이션 테마 */
  decorationTheme: string;
  /** 반복 패턴 */
  schedule: MarketTriggerSchedule;
  /** 관련 구루 (이벤트 주인공) */
  featuredGuruIds: string[];
}

export type MarketTriggerSchedule =
  | { type: 'months'; months: number[] }
  | { type: 'month_range'; startMonth: number; startDay: number; endMonth: number; endDay: number }
  | { type: 'condition'; condition: 'market_crash' | 'bull_run' };

// ============================================================================
// Market Trigger Events
// ============================================================================

export const MARKET_TRIGGER_EVENTS: MarketTriggerEvent[] = [
  {
    id: 'earnings_season',
    nameKo: '실적 시즌 축제',
    nameEn: 'Earnings Season Festival',
    emoji: '📊',
    descriptionKo: '기업들의 분기 실적 발표! 마을이 흥분과 긴장으로 들썩입니다.',
    descriptionEn: 'Quarterly earnings announcements! The village buzzes with excitement and tension.',
    decorationTheme: 'earnings_festival',
    schedule: { type: 'months', months: [1, 4, 7, 10] },
    featuredGuruIds: ['buffett', 'lynch', 'druckenmiller'],
  },
  {
    id: 'jackson_hole',
    nameKo: '잭슨홀 캠프',
    nameEn: 'Jackson Hole Camp',
    emoji: '🏔️',
    descriptionKo: '잭슨홀 경제 심포지엄! 매크로파 구루들이 텐트를 치고 토론합니다.',
    descriptionEn: 'Jackson Hole Economic Symposium! Macro gurus set up camp for discussions.',
    decorationTheme: 'mountain_camp',
    schedule: { type: 'month_range', startMonth: 8, startDay: 20, endMonth: 8, endDay: 28 },
    featuredGuruIds: ['dalio', 'druckenmiller', 'rogers'],
  },
  {
    id: 'fomc_meeting',
    nameKo: 'FOMC 긴급회의',
    nameEn: 'FOMC Emergency Meeting',
    emoji: '🏛️',
    descriptionKo: 'FOMC 회의 주간! 금리 결정에 마을 전체가 긴장합니다.',
    descriptionEn: 'FOMC meeting week! The whole village watches the interest rate decision.',
    decorationTheme: 'federal_reserve',
    schedule: { type: 'months', months: [1, 3, 5, 6, 7, 9, 11, 12] },
    featuredGuruIds: ['dimon', 'dalio', 'druckenmiller'],
  },
  {
    id: 'market_crash',
    nameKo: '시장 급락 폭풍',
    nameEn: 'Market Crash Storm',
    emoji: '⛈️',
    descriptionKo: '시장이 급락했습니다! 마을에 폭풍이 몰아칩니다. 구루들이 긴급 대응 중.',
    descriptionEn: 'Market crash! A storm hits the village. Gurus are in emergency response mode.',
    decorationTheme: 'storm',
    schedule: { type: 'condition', condition: 'market_crash' },
    featuredGuruIds: ['buffett', 'marks', 'dalio'],
  },
  {
    id: 'bull_run',
    nameKo: '강세장 무지개 축제',
    nameEn: 'Bull Run Rainbow Festival',
    emoji: '🌈',
    descriptionKo: '시장이 강세! 마을에 무지개가 뜨고 구루들이 축배를 듭니다.',
    descriptionEn: 'Bull market! Rainbows appear over the village as gurus celebrate.',
    decorationTheme: 'rainbow',
    schedule: { type: 'condition', condition: 'bull_run' },
    featuredGuruIds: ['cathie_wood', 'saylor', 'musk'],
  },
];
