/**
 * 유저 아바타 설정 데이터
 *
 * 역할: "유저 캐릭터 도감" — 플레이어가 마을에서 사용할 자기 아바타를 꾸미는 데이터
 * 비유: 동물의숲에서 처음 시작할 때 "당신의 캐릭터를 만들어보세요!" 화면
 *
 * 구성:
 * - 12종 동물 (무료 4 + 잠금 6 + 프리미엄 2)
 * - 8색 팔레트 (무료 4 + 레벨업 2 + 프리미엄 2)
 * - 15종 액세서리 (무료 5 + 크레딧 6 + 우정 2 + 프리미엄 2)
 */

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export type AvatarUnlockCondition =
  | 'free'
  | 'streak_7'
  | 'streak_30'
  | 'level_3'
  | 'level_5'
  | 'level_7'
  | 'credits_10'
  | 'credits_25'
  | 'friendship_3'
  | 'premium';

export type AccessoryCategory = 'hat' | 'glasses' | 'bag' | 'scarf' | 'tool';

export interface UserAvatarAnimal {
  /** 동물 고유 ID (AsyncStorage 키, DB 저장값) */
  id: string;
  /** 한국어 이름 */
  name: string;
  /** 영어 이름 */
  nameEn: string;
  /** 대표 이모지 (UI 렌더링용) */
  emoji: string;
  /** 한국어 특성 설명 */
  description: string;
  /** 영어 특성 설명 */
  descriptionEn: string;
  /** 해금 조건 */
  unlockCondition: AvatarUnlockCondition;
}

export interface UserAvatarColor {
  /** 색상 고유 ID */
  id: string;
  /** 한국어 색상 이름 */
  name: string;
  /** 영어 색상 이름 */
  nameEn: string;
  /** 실제 hex 값 (아바타 배경/의상 틴트에 적용) */
  hex: string;
  /** 해금 조건 */
  unlockCondition: AvatarUnlockCondition;
}

export interface UserAccessory {
  /** 액세서리 고유 ID */
  id: string;
  /** 한국어 이름 */
  name: string;
  /** 영어 이름 */
  nameEn: string;
  /** 이모지 (UI 렌더링용) */
  emoji: string;
  /** 카테고리 (슬롯 구분) */
  category: AccessoryCategory;
  /** 해금 조건 */
  unlockCondition: AvatarUnlockCondition;
}

// ---------------------------------------------------------------------------
// 12종 동물
// ---------------------------------------------------------------------------

export const USER_ANIMALS: UserAvatarAnimal[] = [
  // ── 무료 4종 ──────────────────────────────────────────────────────────────
  {
    id: 'puppy',
    name: '강아지',
    nameEn: 'Puppy',
    emoji: '🐶',
    description: '충실한 투자 동반자. 원칙을 끝까지 지킨다.',
    descriptionEn: 'Loyal investment companion. Sticks to principles.',
    unlockCondition: 'free',
  },
  {
    id: 'kitten',
    name: '고양이',
    nameEn: 'Kitten',
    emoji: '🐱',
    description: '독립적인 투자자. 남들 의견 안 듣고 내 판단을.',
    descriptionEn: 'Independent investor. Trusts own judgment.',
    unlockCondition: 'free',
  },
  {
    id: 'bunny',
    name: '토끼',
    nameEn: 'Bunny',
    emoji: '🐰',
    description: '빠른 판단력. 기회를 남보다 먼저 포착.',
    descriptionEn: 'Quick decision maker. Spots opportunities first.',
    unlockCondition: 'free',
  },
  {
    id: 'hamster',
    name: '햄스터',
    nameEn: 'Hamster',
    emoji: '🐹',
    description: '알뜰한 저축가. 조금씩 모으는 게 최고.',
    descriptionEn: 'Thrifty saver. Slow and steady wins.',
    unlockCondition: 'free',
  },

  // ── 7일 연속 출석 해금 ────────────────────────────────────────────────────
  {
    id: 'panda',
    name: '판다',
    nameEn: 'Panda',
    emoji: '🐼',
    description: '균형잡힌 포트폴리오. 달리오 스타일 All Weather.',
    descriptionEn: 'Balanced portfolio. Dalio-style All Weather.',
    unlockCondition: 'streak_7',
  },
  {
    id: 'penguin',
    name: '펭귄',
    nameEn: 'Penguin',
    emoji: '🐧',
    description: '냉정한 분석가. 감정에 흔들리지 않는다.',
    descriptionEn: 'Cool analyst. Never swayed by emotion.',
    unlockCondition: 'streak_7',
  },

  // ── 30일 연속 출석 해금 ───────────────────────────────────────────────────
  {
    id: 'koala',
    name: '코알라',
    nameEn: 'Koala',
    emoji: '🐨',
    description: '느긋한 장기 투자자. 10년 뒤를 본다.',
    descriptionEn: 'Relaxed long-term investor. Sees 10 years ahead.',
    unlockCondition: 'streak_30',
  },
  {
    id: 'fox_cub',
    name: '아기 여우',
    nameEn: 'Fox Cub',
    emoji: '🦊',
    description: '캐시 우드의 제자. 혁신 기업만 담는다.',
    descriptionEn: "Cathie Wood's apprentice. ARK-style conviction.",
    unlockCondition: 'streak_30',
  },

  // ── 레벨 5 해금 ───────────────────────────────────────────────────────────
  {
    id: 'baby_owl',
    name: '아기 올빼미',
    nameEn: 'Baby Owl',
    emoji: '🦉',
    description: '버핏의 제자. 해자 있는 기업만 집중 투자.',
    descriptionEn: "Buffett's apprentice. Moat-focused concentration.",
    unlockCondition: 'level_5',
  },
  {
    id: 'dragon',
    name: '용',
    nameEn: 'Dragon',
    emoji: '🐉',
    description: '전설의 투자자. 시장을 지배하는 자.',
    descriptionEn: 'Legendary investor. Commands the market.',
    unlockCondition: 'level_5',
  },

  // ── 프리미엄 전용 ─────────────────────────────────────────────────────────
  {
    id: 'unicorn',
    name: '유니콘',
    nameEn: 'Unicorn',
    emoji: '🦄',
    description: '유니콘 기업 발굴가. 세상에 하나뿐인 투자자.',
    descriptionEn: 'Unicorn discoverer. One-of-a-kind investor.',
    unlockCondition: 'premium',
  },
  {
    id: 'phoenix',
    name: '불사조',
    nameEn: 'Phoenix',
    emoji: '🔥',
    description: '위기에서 부활하는 자. 급락은 나의 기회.',
    descriptionEn: 'Rises from crisis. Crashes are my opportunity.',
    unlockCondition: 'premium',
  },
];

// ---------------------------------------------------------------------------
// 8색 팔레트
// ---------------------------------------------------------------------------

export const USER_COLORS: UserAvatarColor[] = [
  // ── 무료 4색 ──────────────────────────────────────────────────────────────
  {
    id: 'mint',
    name: '민트',
    nameEn: 'Mint',
    hex: '#5DBB63',
    unlockCondition: 'free',
  },
  {
    id: 'sky',
    name: '하늘',
    nameEn: 'Sky Blue',
    hex: '#5DADE2',
    unlockCondition: 'free',
  },
  {
    id: 'peach',
    name: '복숭아',
    nameEn: 'Peach',
    hex: '#FFAB91',
    unlockCondition: 'free',
  },
  {
    id: 'lavender',
    name: '라벤더',
    nameEn: 'Lavender',
    hex: '#CE93D8',
    unlockCondition: 'free',
  },

  // ── 레벨 3 해금 ───────────────────────────────────────────────────────────
  {
    id: 'sunset_orange',
    name: '선셋 오렌지',
    nameEn: 'Sunset Orange',
    hex: '#FF8C42',
    unlockCondition: 'level_3',
  },

  // ── 레벨 7 해금 ───────────────────────────────────────────────────────────
  {
    id: 'ocean_blue',
    name: '오션 블루',
    nameEn: 'Ocean Blue',
    hex: '#1A6FA3',
    unlockCondition: 'level_7',
  },

  // ── 프리미엄 전용 ─────────────────────────────────────────────────────────
  {
    id: 'rose_gold',
    name: '로즈 골드',
    nameEn: 'Rose Gold',
    hex: '#E8A598',
    unlockCondition: 'premium',
  },
  {
    id: 'starlight_silver',
    name: '스타라이트 실버',
    nameEn: 'Starlight Silver',
    hex: '#B0BEC5',
    unlockCondition: 'premium',
  },
];

// ---------------------------------------------------------------------------
// 15종 액세서리
// ---------------------------------------------------------------------------

export const USER_ACCESSORIES: UserAccessory[] = [
  // ── 무료 5종 ──────────────────────────────────────────────────────────────
  {
    id: 'invest_cap',
    name: '투자 캡',
    nameEn: 'Investor Cap',
    emoji: '🧢',
    category: 'hat',
    unlockCondition: 'free',
  },
  {
    id: 'round_glasses',
    name: '둥근 안경',
    nameEn: 'Round Glasses',
    emoji: '👓',
    category: 'glasses',
    unlockCondition: 'free',
  },
  {
    id: 'backpack',
    name: '배낭',
    nameEn: 'Backpack',
    emoji: '🎒',
    category: 'bag',
    unlockCondition: 'free',
  },
  {
    id: 'magnifier',
    name: '돋보기',
    nameEn: 'Magnifier',
    emoji: '🔍',
    category: 'tool',
    unlockCondition: 'free',
  },
  {
    id: 'scarf',
    name: '스카프',
    nameEn: 'Scarf',
    emoji: '🧣',
    category: 'scarf',
    unlockCondition: 'free',
  },

  // ── 크레딧 10C 해금 ───────────────────────────────────────────────────────
  {
    id: 'wizard_hat',
    name: '마법사 모자',
    nameEn: 'Wizard Hat',
    emoji: '🪄',
    category: 'hat',
    unlockCondition: 'credits_10',
  },
  {
    id: 'sunglasses',
    name: '선글라스',
    nameEn: 'Sunglasses',
    emoji: '🕶️',
    category: 'glasses',
    unlockCondition: 'credits_10',
  },
  {
    id: 'briefcase',
    name: '서류가방',
    nameEn: 'Briefcase',
    emoji: '💼',
    category: 'bag',
    unlockCondition: 'credits_10',
  },
  {
    id: 'necktie',
    name: '넥타이',
    nameEn: 'Necktie',
    emoji: '👔',
    category: 'scarf',
    unlockCondition: 'credits_10',
  },

  // ── 크레딧 25C 해금 ───────────────────────────────────────────────────────
  {
    id: 'beret',
    name: '베레모',
    nameEn: 'Beret',
    emoji: '🎨',
    category: 'hat',
    unlockCondition: 'credits_25',
  },
  {
    id: 'chart_tablet',
    name: '차트 태블릿',
    nameEn: 'Chart Tablet',
    emoji: '📊',
    category: 'tool',
    unlockCondition: 'credits_25',
  },
  {
    id: 'telescope',
    name: '망원경',
    nameEn: 'Telescope',
    emoji: '🔭',
    category: 'tool',
    unlockCondition: 'credits_25',
  },

  // ── 우정 Tier 3 (close_friend) 해금 ─────────────────────────────────────
  {
    id: 'guru_pin',
    name: '구루 핀',
    nameEn: 'Guru Pin',
    emoji: '📌',
    category: 'scarf',
    unlockCondition: 'friendship_3',
  },
  {
    id: 'gold_compass',
    name: '황금 나침반',
    nameEn: 'Gold Compass',
    emoji: '🧭',
    category: 'tool',
    unlockCondition: 'friendship_3',
  },

  // ── 프리미엄 전용 ─────────────────────────────────────────────────────────
  {
    id: 'crown',
    name: '황금 왕관',
    nameEn: 'Golden Crown',
    emoji: '👑',
    category: 'hat',
    unlockCondition: 'premium',
  },
];

// ---------------------------------------------------------------------------
// 유저 아바타 저장 타입 (AsyncStorage / Supabase profiles 동기화)
// ---------------------------------------------------------------------------

export interface UserAvatarState {
  animalId: string;
  colorId: string;
  /** 착용 중인 액세서리 ID 목록 (슬롯별 1개씩, 최대 3개) */
  equippedAccessoryIds: string[];
}

export const DEFAULT_AVATAR_STATE: UserAvatarState = {
  animalId: 'puppy',
  colorId: 'mint',
  equippedAccessoryIds: [],
};

// ---------------------------------------------------------------------------
// 헬퍼 함수
// ---------------------------------------------------------------------------

/** 현재 조건에서 해금된 동물 목록 반환 */
export function getUnlockedAnimals(
  streak: number,
  level: number,
  isPremium: boolean,
): UserAvatarAnimal[] {
  return USER_ANIMALS.filter(a => isAnimalUnlocked(a, streak, level, isPremium));
}

/** 현재 조건에서 해금된 색상 목록 반환 */
export function getUnlockedColors(level: number, isPremium: boolean): UserAvatarColor[] {
  return USER_COLORS.filter(c => {
    if (c.unlockCondition === 'free') return true;
    if (c.unlockCondition === 'level_3') return level >= 3;
    if (c.unlockCondition === 'level_7') return level >= 7;
    if (c.unlockCondition === 'premium') return isPremium;
    return false;
  });
}

/** 현재 조건에서 해금된 액세서리 목록 반환 */
export function getUnlockedAccessories(
  credits: number,
  maxFriendshipTier: number,
  isPremium: boolean,
): UserAccessory[] {
  return USER_ACCESSORIES.filter(acc => {
    if (acc.unlockCondition === 'free') return true;
    if (acc.unlockCondition === 'credits_10') return credits >= 10;
    if (acc.unlockCondition === 'credits_25') return credits >= 25;
    // friendship_3 = close_friend 이상 (tier 인덱스 3+)
    if (acc.unlockCondition === 'friendship_3') return maxFriendshipTier >= 3;
    if (acc.unlockCondition === 'premium') return isPremium;
    return false;
  });
}

/** 개별 동물 해금 여부 */
export function isAnimalUnlocked(
  animal: UserAvatarAnimal,
  streak: number,
  level: number,
  isPremium: boolean,
): boolean {
  switch (animal.unlockCondition) {
    case 'free':
      return true;
    case 'streak_7':
      return streak >= 7;
    case 'streak_30':
      return streak >= 30;
    case 'level_5':
      return level >= 5;
    case 'premium':
      return isPremium;
    default:
      return false;
  }
}

/** 해금 조건 한국어 레이블 반환 (잠금 UI 표시용) */
export function getUnlockLabel(condition: AvatarUnlockCondition, lang: 'ko' | 'en' = 'ko'): string {
  const labels: Record<AvatarUnlockCondition, [string, string]> = {
    free: ['무료', 'Free'],
    streak_7: ['7일 연속 출석', '7-Day Streak'],
    streak_30: ['30일 연속 출석', '30-Day Streak'],
    level_3: ['레벨 3 달성', 'Level 3'],
    level_5: ['레벨 5 달성', 'Level 5'],
    level_7: ['레벨 7 달성', 'Level 7'],
    credits_10: ['크레딧 10C', '10 Credits'],
    credits_25: ['크레딧 25C', '25 Credits'],
    friendship_3: ['우정 3단계', 'Friendship Tier 3'],
    premium: ['프리미엄 전용', 'Premium Only'],
  };
  return lang === 'ko' ? labels[condition][0] : labels[condition][1];
}

/** ID로 동물 찾기 */
export function findAnimalById(id: string): UserAvatarAnimal | undefined {
  return USER_ANIMALS.find(a => a.id === id);
}

/** ID로 색상 찾기 */
export function findColorById(id: string): UserAvatarColor | undefined {
  return USER_COLORS.find(c => c.id === id);
}

/** ID로 액세서리 찾기 */
export function findAccessoryById(id: string): UserAccessory | undefined {
  return USER_ACCESSORIES.find(a => a.id === id);
}
