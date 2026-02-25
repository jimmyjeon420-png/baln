/**
 * 10명 구루 캐릭터 설정 데이터 — 주토피아 × 동물의숲 에디션 🐾
 *
 * 역할: 각 거장의 캐릭터 비주얼 정보를 한곳에서 관리
 * 비유: "캐릭터 도감" — 누가 어떤 동물이고, 어떤 성격인지 정리
 *
 * 컨셉: 각 투자 거장 = 고유 동물 (주토피아 의인화)
 * 향후 10명까지 교체 가능한 구조
 */

import type { GuruCharacterConfig } from '../types/character';

export const GURU_CHARACTER_CONFIGS: Record<string, GuruCharacterConfig> = {
  buffett: {
    guruId: 'buffett',
    guruName: '워렌 버핏',
    guruNameEn: 'Warren Buffett',
    emoji: '🦉',
    accentColor: '#FF5722',
    characterConcept: '지혜로운 올빼미 할아버지',
    characterConceptEn: 'Wise Grandfather Owl',
    accessory: '둥근 안경, 흰 머리카락',
    accessoryEn: 'Round glasses, white hair',
    hasSvg: true,
  },
  dalio: {
    guruId: 'dalio',
    guruName: '레이 달리오',
    guruNameEn: 'Ray Dalio',
    emoji: '🦌',
    accentColor: '#4CAF50',
    characterConcept: '균형의 명상 사슴',
    characterConceptEn: 'Balanced Meditating Deer',
    accessory: '우아한 뿔, 나뭇잎 핀',
    accessoryEn: 'Elegant antlers, leaf pin',
    hasSvg: true,
  },
  cathie_wood: {
    guruId: 'cathie_wood',
    guruName: '캐시 우드',
    guruNameEn: 'Cathie Wood',
    emoji: '🦊',
    accentColor: '#9C27B0',
    characterConcept: '혁신의 로켓 여우',
    characterConceptEn: 'Innovation Rocket Fox',
    accessory: '미래형 바이저, 로켓 가운',
    accessoryEn: 'Futuristic visor, rocket gown',
    hasSvg: true,
  },
  druckenmiller: {
    guruId: 'druckenmiller',
    guruName: '스탠리 드러킨밀러',
    guruNameEn: 'Stanley Druckenmiller',
    emoji: '🐆',
    accentColor: '#FFB74D',
    characterConcept: '매크로 사냥 치타',
    characterConceptEn: 'Macro-Hunting Cheetah',
    accessory: '눈물 자국, 치타 점박이',
    accessoryEn: 'Tear marks, cheetah spots',
    hasSvg: true,
  },
  saylor: {
    guruId: 'saylor',
    guruName: '마이클 세일러',
    guruNameEn: 'Michael Saylor',
    emoji: '🐺',
    accentColor: '#F7931A',
    characterConcept: '비트코인 수호 늑대',
    characterConceptEn: 'Bitcoin Guardian Wolf',
    accessory: '레이저 눈, BTC 목걸이',
    accessoryEn: 'Laser eyes, BTC necklace',
    hasSvg: true,
  },
  dimon: {
    guruId: 'dimon',
    guruName: '제이미 다이먼',
    guruNameEn: 'Jamie Dimon',
    emoji: '🦁',
    accentColor: '#1565C0',
    characterConcept: '금융의 왕 사자',
    characterConceptEn: 'King of Finance Lion',
    accessory: '황금 갈기, 블루 수트',
    accessoryEn: 'Golden mane, blue suit',
    hasSvg: true,
  },
  musk: {
    guruId: 'musk',
    guruName: '일론 머스크',
    guruNameEn: 'Elon Musk',
    emoji: '🦎',
    accentColor: '#FDD835',
    characterConcept: '예측불가 카멜레온',
    characterConceptEn: 'Unpredictable Chameleon',
    accessory: '번개 무늬, 뾰족 볏',
    accessoryEn: 'Lightning pattern, spiky crest',
    hasSvg: true,
  },
  lynch: {
    guruId: 'lynch',
    guruName: '피터 린치',
    guruNameEn: 'Peter Lynch',
    emoji: '🐻',
    accentColor: '#5C6BC0',
    characterConcept: '슈퍼마켓 곰 교수님',
    characterConceptEn: 'Supermarket Professor Bear',
    accessory: '둥근 안경, 나비넥타이',
    accessoryEn: 'Round glasses, bow tie',
    hasSvg: true,
  },
  marks: {
    guruId: 'marks',
    guruName: '하워드 막스',
    guruNameEn: 'Howard Marks',
    emoji: '🐢',
    accentColor: '#546E7A',
    characterConcept: '신중한 거북이 작가',
    characterConceptEn: 'Cautious Turtle Author',
    accessory: '노트패드, 등껍질',
    accessoryEn: 'Notepad, shell',
    hasSvg: true,
  },
  rogers: {
    guruId: 'rogers',
    guruName: '짐 로저스',
    guruNameEn: 'Jim Rogers',
    emoji: '🐯',
    accentColor: '#FF8F00',
    characterConcept: '세계 탐험 호랑이',
    characterConceptEn: 'World Explorer Tiger',
    accessory: '탐험모자, 나침반',
    accessoryEn: 'Explorer hat, compass',
    hasSvg: true,
  },
};

/**
 * 구루 이름(한글/영문)으로 캐릭터 설정 찾기
 * Central Kitchen의 GuruInsight.guruName과 매핑할 때 사용
 */
export function findCharacterConfigByName(name: string): GuruCharacterConfig | null {
  const n = name.toLowerCase();
  for (const config of Object.values(GURU_CHARACTER_CONFIGS)) {
    if (
      n.includes(config.guruName.toLowerCase()) ||
      n.includes(config.guruNameEn.toLowerCase()) ||
      config.guruNameEn.toLowerCase().includes(n)
    ) {
      return config;
    }
  }
  return null;
}
