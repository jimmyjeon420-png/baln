/**
 * 마을 캘린더 이벤트 설정
 *
 * 역할: "마을 달력" — 계절별/특별 이벤트 정의
 * 비유: 동물의숲에서 벚꽃 축제, 할로윈, 크리스마스에 마을이 변하는 것
 *
 * WORLD_DESIGN.md 섹션 6-2 (캘린더 시즌 이벤트)
 */

// ============================================================================
// Types
// ============================================================================

export interface CalendarEvent {
  id: string;
  nameKo: string;
  nameEn: string;
  emoji: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  /** Village decoration changes */
  decorationTheme: string;
  specialGuruId?: string;
  descriptionKo: string;
  descriptionEn: string;
}

// ============================================================================
// Calendar Events
// ============================================================================

export const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'new_year',
    nameKo: '새해 축제',
    nameEn: 'New Year Festival',
    emoji: '🎊',
    startMonth: 1,
    startDay: 1,
    endMonth: 1,
    endDay: 3,
    decorationTheme: 'fireworks',
    descriptionKo: '마을 광장에서 새해를 축하합니다! 구루들이 새해 투자 목표를 나눕니다.',
    descriptionEn: 'Celebrate the new year in the village square! Gurus share their investment goals.',
  },
  {
    id: 'cherry_blossom',
    nameKo: '벚꽃 축제',
    nameEn: 'Cherry Blossom Festival',
    emoji: '🌸',
    startMonth: 3,
    startDay: 20,
    endMonth: 4,
    endDay: 10,
    decorationTheme: 'sakura',
    specialGuruId: 'dalio',
    descriptionKo: '마을에 벚꽃이 만발합니다. 달리오가 명상 벚꽃길 산책을 이끕니다.',
    descriptionEn: 'Cherry blossoms bloom throughout the village. Dalio leads meditation walks along the sakura path.',
  },
  {
    id: 'summer_beach',
    nameKo: '여름 해변 파티',
    nameEn: 'Summer Beach Party',
    emoji: '🏖️',
    startMonth: 7,
    startDay: 1,
    endMonth: 8,
    endDay: 31,
    decorationTheme: 'beach',
    specialGuruId: 'rogers',
    descriptionKo: '마을 근처 해변에서 여름 파티! 짐 로저스가 세계 여행 이야기를 들려줍니다.',
    descriptionEn: 'Summer party at the village beach! Jim Rogers shares world travel stories.',
  },
  {
    id: 'chuseok',
    nameKo: '추석 한가위',
    nameEn: 'Harvest Moon Festival',
    emoji: '🌕',
    startMonth: 9,
    startDay: 15,
    endMonth: 9,
    endDay: 17,
    decorationTheme: 'harvest',
    specialGuruId: 'buffett',
    descriptionKo: '풍요로운 한가위! 버핏 할아버지가 송편을 나눠주며 복리 이야기를 합니다.',
    descriptionEn: 'Harvest Moon! Grandfather Buffett shares rice cakes and compound interest stories.',
  },
  {
    id: 'halloween',
    nameKo: '할로윈 축제',
    nameEn: 'Halloween Festival',
    emoji: '🎃',
    startMonth: 10,
    startDay: 25,
    endMonth: 10,
    endDay: 31,
    decorationTheme: 'spooky',
    specialGuruId: 'musk',
    descriptionKo: '마을이 으스스하게 변합니다! 머스크가 "진짜 무서운 건 인플레이션"이라며 장난칩니다.',
    descriptionEn: 'The village gets spooky! Musk jokes that "the real horror is inflation."',
  },
  {
    id: 'christmas',
    nameKo: '크리스마스',
    nameEn: 'Christmas',
    emoji: '🎄',
    startMonth: 12,
    startDay: 20,
    endMonth: 12,
    endDay: 26,
    decorationTheme: 'winter_holiday',
    specialGuruId: 'lynch',
    descriptionKo: '마을에 눈이 내리고 크리스마스 트리가 세워집니다. 린치가 선물 포장을 도와줍니다.',
    descriptionEn: 'Snow falls on the village with a Christmas tree. Lynch helps wrap presents.',
  },
];
