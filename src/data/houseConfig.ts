/**
 * houseConfig — 유저 집 시스템 설정 데이터
 *
 * 역할: "부동산 도감" — 유저의 마을 내 집 레벨과 가구 아이템 정의
 * 비유: 동물의숲의 집 업그레이드 시스템
 *       마을 번영도가 올라갈수록 텐트 → 오두막 → 나무집 → 벽돌집 → 저택
 *
 * 사용처:
 * - useHouseSystem 훅: 번영도 연동 자동 업그레이드
 * - HouseView 컴포넌트: 마을 씬 내 집 외관
 * - HouseInteriorModal: 가구 배치 인테리어 화면
 */

// ============================================================================
// 타입
// ============================================================================

export interface HouseLevel {
  level: number;
  nameKo: string;
  nameEn: string;
  emoji: string;
  /** Prosperity level required to unlock */
  requiredProsperity: number;
  /** Available furniture slots */
  furnitureSlots: number;
  descriptionKo: string;
  descriptionEn: string;
}

export interface FurnitureItem {
  id: string;
  nameKo: string;
  nameEn: string;
  emoji: string;
  /** Prosperity level to unlock */
  unlockLevel: number;
  category: 'wall' | 'floor' | 'table' | 'decoration';
}

// ============================================================================
// 집 레벨 (5단계)
// ============================================================================

export const HOUSE_LEVELS: HouseLevel[] = [
  {
    level: 1,
    nameKo: '텐트',
    nameEn: 'Tent',
    emoji: '\u26FA',
    requiredProsperity: 1,
    furnitureSlots: 1,
    descriptionKo: '소박하지만 든든한 첫 보금자리',
    descriptionEn: 'A humble but sturdy first shelter',
  },
  {
    level: 2,
    nameKo: '오두막',
    nameEn: 'Cabin',
    emoji: '\uD83D\uDED6',
    requiredProsperity: 3,
    furnitureSlots: 3,
    descriptionKo: '나무 향이 나는 아늑한 오두막',
    descriptionEn: 'A cozy cabin with a woody scent',
  },
  {
    level: 3,
    nameKo: '나무집',
    nameEn: 'Wooden House',
    emoji: '\uD83C\uDFE0',
    requiredProsperity: 5,
    furnitureSlots: 5,
    descriptionKo: '안정적인 나무집, 마을의 일원이 되었습니다',
    descriptionEn: 'A solid wooden house, you belong to the village',
  },
  {
    level: 4,
    nameKo: '벽돌집',
    nameEn: 'Brick House',
    emoji: '\uD83C\uDFE1',
    requiredProsperity: 7,
    furnitureSlots: 8,
    descriptionKo: '튼튼한 벽돌집, 구루들도 부러워합니다',
    descriptionEn: 'A sturdy brick house, even gurus envy you',
  },
  {
    level: 5,
    nameKo: '저택',
    nameEn: 'Mansion',
    emoji: '\uD83C\uDFF0',
    requiredProsperity: 9,
    furnitureSlots: 12,
    descriptionKo: '전설의 투자자에 걸맞는 대저택!',
    descriptionEn: 'A grand mansion befitting a legendary investor!',
  },
];

// ============================================================================
// 가구 아이템 (15개)
// ============================================================================

export const FURNITURE_ITEMS: FurnitureItem[] = [
  // wall (벽 장식)
  { id: 'wall_clock', nameKo: '시장 시계', nameEn: 'Market Clock', emoji: '\uD83D\uDD70\uFE0F', unlockLevel: 1, category: 'wall' },
  { id: 'wall_chart', nameKo: '차트 액자', nameEn: 'Chart Frame', emoji: '\uD83D\uDCCA', unlockLevel: 2, category: 'wall' },
  { id: 'wall_diploma', nameKo: '투자 졸업장', nameEn: 'Investment Diploma', emoji: '\uD83C\uDF93', unlockLevel: 4, category: 'wall' },
  { id: 'wall_painting', nameKo: '버핏 초상화', nameEn: 'Buffett Portrait', emoji: '\uD83D\uDDBC\uFE0F', unlockLevel: 5, category: 'wall' },

  // floor (바닥 장식)
  { id: 'floor_rug', nameKo: '양모 러그', nameEn: 'Wool Rug', emoji: '\uD83E\uDEA8', unlockLevel: 1, category: 'floor' },
  { id: 'floor_plant', nameKo: '행운 나무', nameEn: 'Lucky Tree', emoji: '\uD83C\uDF33', unlockLevel: 2, category: 'floor' },
  { id: 'floor_fountain', nameKo: '금빛 분수', nameEn: 'Golden Fountain', emoji: '\u26F2', unlockLevel: 5, category: 'floor' },

  // table (탁상 장식)
  { id: 'table_lamp', nameKo: '분석 램프', nameEn: 'Analysis Lamp', emoji: '\uD83D\uDCA1', unlockLevel: 1, category: 'table' },
  { id: 'table_globe', nameKo: '세계 지구본', nameEn: 'World Globe', emoji: '\uD83C\uDF0D', unlockLevel: 3, category: 'table' },
  { id: 'table_computer', nameKo: '트레이딩 모니터', nameEn: 'Trading Monitor', emoji: '\uD83D\uDCBB', unlockLevel: 4, category: 'table' },
  { id: 'table_trophy', nameKo: '투자 트로피', nameEn: 'Investment Trophy', emoji: '\uD83C\uDFC6', unlockLevel: 5, category: 'table' },

  // decoration (기타 장식)
  { id: 'deco_bookshelf', nameKo: '투자 서재', nameEn: 'Investment Bookshelf', emoji: '\uD83D\uDCDA', unlockLevel: 2, category: 'decoration' },
  { id: 'deco_aquarium', nameKo: '금붕어 어항', nameEn: 'Goldfish Tank', emoji: '\uD83D\uDC1F', unlockLevel: 3, category: 'decoration' },
  { id: 'deco_telescope', nameKo: '시장 망원경', nameEn: 'Market Telescope', emoji: '\uD83D\uDD2D', unlockLevel: 4, category: 'decoration' },
  { id: 'deco_crystal', nameKo: '수정 구슬', nameEn: 'Crystal Ball', emoji: '\uD83D\uDD2E', unlockLevel: 5, category: 'decoration' },
];

// ============================================================================
// 유틸
// ============================================================================

/** 번영도 레벨 → 집 레벨 변환 */
export function getHouseLevelForProsperity(prosperityLevel: number): HouseLevel {
  for (let i = HOUSE_LEVELS.length - 1; i >= 0; i--) {
    if (prosperityLevel >= HOUSE_LEVELS[i].requiredProsperity) {
      return HOUSE_LEVELS[i];
    }
  }
  return HOUSE_LEVELS[0];
}

/** 특정 집 레벨에서 사용 가능한 가구 목록 */
export function getUnlockedFurniture(prosperityLevel: number): FurnitureItem[] {
  return FURNITURE_ITEMS.filter(item => item.unlockLevel <= Math.ceil(prosperityLevel / 2));
}
