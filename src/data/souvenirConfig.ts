/**
 * 마을 기념품 설정
 *
 * 역할: "마을 기념품점 카탈로그" — 브랜드 상점에서 살 수 있는 기념품 정의
 * 비유: 동물의숲에서 상점에서 기념품/가구를 사는 것
 *
 * WORLD_DESIGN.md 섹션 31-7 (브랜드 기념품 시스템)
 */

// ============================================================================
// Types
// ============================================================================

export interface SouvenirItem {
  id: string;
  nameKo: string;
  nameEn: string;
  emoji: string;
  /** 크레딧 가격 */
  cost: number;
  /** 연관 브랜드 ID (brandWorldConfig의 brandId) */
  brandId: string;
  /** 설명 */
  descriptionKo: string;
  descriptionEn: string;
  /** 레어도 */
  rarity: 'common' | 'rare' | 'epic';
}

// ============================================================================
// Souvenir Items
// ============================================================================

export const SOUVENIR_ITEMS: SouvenirItem[] = [
  {
    id: 'apple_keychain',
    nameKo: '사과 열쇠고리',
    nameEn: 'Apple Keychain',
    emoji: '🔑',
    cost: 3,
    brandId: 'apple',
    descriptionKo: '반짝이는 사과 모양 열쇠고리',
    descriptionEn: 'Shiny apple-shaped keychain',
    rarity: 'common',
  },
  {
    id: 'tesla_postcard',
    nameKo: '번개 엽서',
    nameEn: 'Lightning Postcard',
    emoji: '📮',
    cost: 2,
    brandId: 'tesla',
    descriptionKo: '번개 자동차가 그려진 예쁜 엽서',
    descriptionEn: 'Beautiful postcard with lightning car',
    rarity: 'common',
  },
  {
    id: 'nvidia_pin',
    nameKo: '마법 칩 핀',
    nameEn: 'Magic Chip Pin',
    emoji: '📌',
    cost: 5,
    brandId: 'nvidia',
    descriptionKo: '빛나는 AI 칩 모양 핀 배지',
    descriptionEn: 'Glowing AI chip shaped pin badge',
    rarity: 'rare',
  },
  {
    id: 'samsung_sticker',
    nameKo: '별빛 스티커',
    nameEn: 'Starlight Sticker',
    emoji: '⭐',
    cost: 2,
    brandId: 'samsung',
    descriptionKo: '별빛 전자의 반도체 모양 스티커',
    descriptionEn: 'Semiconductor-shaped sticker from Starlight Electronics',
    rarity: 'common',
  },
  {
    id: 'nike_magnet',
    nameKo: '발자국 자석',
    nameEn: 'Pawprint Magnet',
    emoji: '🧲',
    cost: 3,
    brandId: 'nike',
    descriptionKo: '발자국 운동화 모양 냉장고 자석',
    descriptionEn: 'Pawprint sneaker fridge magnet',
    rarity: 'common',
  },
  {
    id: 'starbucks_mug',
    nameKo: '도토리 머그컵',
    nameEn: 'Acorn Mug',
    emoji: '☕',
    cost: 8,
    brandId: 'starbucks',
    descriptionKo: '도토리 모양이 새겨진 특별한 머그컵',
    descriptionEn: 'Special mug with acorn engravings',
    rarity: 'rare',
  },
  {
    id: 'disney_figurine',
    nameKo: '요정 피규어',
    nameEn: 'Fairy Figurine',
    emoji: '🧚',
    cost: 15,
    brandId: 'disney',
    descriptionKo: '요정 왕국에서 가져온 미니 피규어',
    descriptionEn: 'Mini figurine from the Fairy Kingdom',
    rarity: 'epic',
  },
  {
    id: 'amazon_compass',
    nameKo: '밀림 나침반',
    nameEn: 'Jungle Compass',
    emoji: '🧭',
    cost: 5,
    brandId: 'amazon',
    descriptionKo: '밀림 택배에서 만든 골드 나침반',
    descriptionEn: 'Gold compass made by Jungle Delivery',
    rarity: 'rare',
  },
  {
    id: 'google_bookmark',
    nameKo: '알파벳 북마크',
    nameEn: 'Alphabet Bookmark',
    emoji: '🔖',
    cost: 2,
    brandId: 'google',
    descriptionKo: '알파벳 도서관의 예쁜 북마크',
    descriptionEn: 'Pretty bookmark from Alphabet Library',
    rarity: 'common',
  },
  {
    id: 'meta_snowglobe',
    nameKo: '거울세계 스노우볼',
    nameEn: 'Mirror World Snow Globe',
    emoji: '🔮',
    cost: 12,
    brandId: 'meta',
    descriptionKo: '거울세계가 보이는 마법 스노우볼',
    descriptionEn: 'Magic snow globe showing the Mirror World',
    rarity: 'epic',
  },
];
