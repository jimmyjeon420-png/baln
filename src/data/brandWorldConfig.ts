/**
 * 브랜드 월드 설정 데이터 (20개 브랜드 상점)
 *
 * 역할: 실제 기업을 동물의숲 스타일 마을 상점으로 패러디한 설정 관리
 * 비유: "마을 상점 거리 설계도" — 나이키가 "발자국 운동화"로, 테슬라가 "번개 자동차"로 변환
 *
 * WORLD_DESIGN.md 섹션 31 (브랜드 월드) 기반
 * 피터 린치 철학: "마트에서 종목을 찾아라" — 일상 소비와 투자를 연결
 *
 * 법적 주의: 실제 브랜드명 직접 사용 불가 → 패러디명 사용
 */

import type { BrandShop } from '../types/village';

// ---------------------------------------------------------------------------
// 20개 브랜드 상점 데이터
// ---------------------------------------------------------------------------

export const BRAND_SHOPS: BrandShop[] = [
  // --- Tech ---
  {
    brandId: 'apple',
    realName: 'Apple',
    villageName: '사과 상점',
    villageNameEn: 'Apple Shop',
    animal: '고슴도치',
    animalEn: 'Hedgehog',
    emoji: '🍎',
    category: 'tech',
    ticker: 'AAPL',
    description: '반짝이는 사과폰과 사과북이 진열된 작은 전자기기 가게. 고슴도치 주인이 "심플함이 최고"라며 물건을 닦고 있습니다.',
    descriptionEn: 'A small gadget shop displaying shiny Apple-phones and Apple-books. The hedgehog owner polishes items saying "Simplicity is the ultimate sophistication."',
  },
  {
    brandId: 'samsung',
    realName: 'Samsung Electronics',
    villageName: '별빛 전자',
    villageNameEn: 'Starlight Electronics',
    animal: '수달',
    animalEn: 'Otter',
    emoji: '✨',
    category: 'tech',
    ticker: '005930',
    description: '반도체 칩을 만드는 대장간 느낌의 전자 공방. 수달 장인이 정밀한 손으로 칩을 가공하고 있습니다.',
    descriptionEn: 'An electronics workshop with a forge-like vibe for making semiconductor chips. The otter craftsman processes chips with precise hands.',
  },
  {
    brandId: 'nvidia',
    realName: 'NVIDIA',
    villageName: '마법 칩 공방',
    villageNameEn: 'Magic Chip Workshop',
    animal: '부엉이',
    animalEn: 'Owl',
    emoji: '🔮',
    category: 'tech',
    ticker: 'NVDA',
    description: '마법 같은 AI 칩을 연구하는 신비로운 공방. 부엉이 연구원이 빛나는 칩을 조심스럽게 다루고 있습니다.',
    descriptionEn: 'A mystical workshop researching magical AI chips. The owl researcher carefully handles glowing chips.',
  },
  {
    brandId: 'google',
    realName: 'Google',
    villageName: '무지개 도서관',
    villageNameEn: 'Rainbow Library',
    animal: '앵무새',
    animalEn: 'Parrot',
    emoji: '🌈',
    category: 'tech',
    ticker: 'GOOGL',
    description: '세상 모든 지식을 검색할 수 있는 거대한 도서관. 앵무새 사서가 "뭐든 물어보세요!" 하며 안내합니다.',
    descriptionEn: 'A grand library where you can search all the world\'s knowledge. The parrot librarian guides visitors: "Ask me anything!"',
  },

  // --- Fashion ---
  {
    brandId: 'nike',
    realName: 'Nike',
    villageName: '발자국 운동화',
    villageNameEn: 'Pawprint Sneakers',
    animal: '치타',
    animalEn: 'Cheetah',
    emoji: '👟',
    category: 'fashion',
    ticker: 'NKE',
    description: '동물 발 모양 쿠션이 특징인 운동화 전문점. 치타 점원이 "이 신발 신으면 나만큼 빨라져요!" 하며 홍보합니다.',
    descriptionEn: 'A sneaker shop famous for animal-paw cushioned soles. The cheetah clerk promotes: "Wear these and you\'ll be as fast as me!"',
  },
  {
    brandId: 'lvmh',
    realName: 'LVMH',
    villageName: '여우 부티크',
    villageNameEn: 'Fox Boutique',
    animal: '페르시안 고양이',
    animalEn: 'Persian Cat',
    emoji: '👜',
    category: 'fashion',
    ticker: 'MC.PA',
    description: '마을에서 가장 고급스러운 부티크. 페르시안 고양이 주인이 콧대 높게 "안목이 있으시네요" 하며 맞이합니다.',
    descriptionEn: 'The village\'s most luxurious boutique. The Persian cat owner greets with a haughty "You have taste."',
  },

  // --- Food & Beverage ---
  {
    brandId: 'starbucks',
    realName: 'Starbucks',
    villageName: '도토리 카페',
    villageNameEn: 'Acorn Cafe',
    animal: '다람쥐',
    animalEn: 'Squirrel',
    emoji: '☕',
    category: 'food',
    ticker: 'SBUX',
    description: '도토리 라떼와 솔방울 머핀이 인기인 아늑한 카페. 다람쥐 바리스타가 라떼아트를 열심히 연습 중입니다.',
    descriptionEn: 'A cozy cafe known for acorn lattes and pinecone muffins. The squirrel barista practices latte art diligently.',
  },
  {
    brandId: 'mcdonalds',
    realName: 'McDonald\'s',
    villageName: '황금 아치 식당',
    villageNameEn: 'Golden Arch Diner',
    animal: '너구리',
    animalEn: 'Raccoon',
    emoji: '🍔',
    category: 'food',
    ticker: 'MCD',
    description: '누구나 부담 없이 들를 수 있는 마을 식당. 너구리 점장이 "오늘의 특선: 도토리 버거!" 하며 맞이합니다.',
    descriptionEn: 'A village diner everyone can afford. The raccoon manager greets with "Today\'s special: Acorn Burger!"',
  },
  {
    brandId: 'cocacola',
    realName: 'Coca-Cola',
    villageName: '별빛 음료',
    villageNameEn: 'Starlight Drinks',
    animal: '북극곰',
    animalEn: 'Polar Bear',
    emoji: '🥤',
    category: 'food',
    ticker: 'KO',
    description: '버핏 할아버지가 매일 들르는 음료 가게. 북극곰 주인이 "체리코크 한 잔 하실래요?" 하며 반갑게 맞이합니다.',
    descriptionEn: 'A drink shop Grandpa Buffett visits daily. The polar bear owner greets warmly: "Care for a Cherry Coke?"',
  },

  // --- Auto ---
  {
    brandId: 'tesla',
    realName: 'Tesla',
    villageName: '번개 자동차',
    villageNameEn: 'Lightning Motors',
    animal: '전기뱀장어',
    animalEn: 'Electric Eel',
    emoji: '⚡',
    category: 'auto',
    ticker: 'TSLA',
    description: '전기로 달리는 마차와 수레를 만드는 공방. 전기뱀장어 기술자가 "이 마차는 소리가 안 나요!" 하며 자랑합니다.',
    descriptionEn: 'A workshop building electric carriages and carts. The electric eel technician boasts: "This carriage makes no noise!"',
  },
  {
    brandId: 'toyota',
    realName: 'Toyota',
    villageName: '참나무 자동차',
    villageNameEn: 'Oak Motors',
    animal: '코끼리',
    animalEn: 'Elephant',
    emoji: '🌳',
    category: 'auto',
    ticker: '7203.T',
    description: '튼튼하고 오래가는 자동차를 만드는 정비소. 코끼리 정비사가 "이 차는 100년 가요" 하며 자부합니다.',
    descriptionEn: 'A garage building sturdy, long-lasting vehicles. The elephant mechanic says proudly: "This car lasts 100 years."',
  },

  // --- Entertainment ---
  {
    brandId: 'netflix',
    realName: 'Netflix',
    villageName: '달빛 극장',
    villageNameEn: 'Moonlight Theater',
    animal: '올빼미',
    animalEn: 'Owl',
    emoji: '🎬',
    category: 'entertainment',
    ticker: 'NFLX',
    description: '밤마다 불이 켜지는 작은 극장. 올빼미 영사기사가 "오늘 밤 상영작은..." 하며 안내합니다.',
    descriptionEn: 'A small theater that lights up every night. The owl projectionist announces: "Tonight\'s feature is..."',
  },
  {
    brandId: 'disney',
    realName: 'Disney',
    villageName: '꿈나라 놀이공원',
    villageNameEn: 'Dreamland Park',
    animal: '토끼',
    animalEn: 'Rabbit',
    emoji: '🏰',
    category: 'entertainment',
    ticker: 'DIS',
    description: '마을 외곽에 있는 작은 놀이공원. 토끼 안내원이 "꿈을 믿으면 이루어져요!" 하며 환영합니다.',
    descriptionEn: 'A small theme park on the village outskirts. The rabbit guide welcomes: "Believe in dreams and they come true!"',
  },

  // --- Finance ---
  {
    brandId: 'bitcoin_exchange',
    realName: 'Bitcoin Exchange',
    villageName: '달 거래소',
    villageNameEn: 'Moon Exchange',
    animal: '늑대',
    animalEn: 'Wolf',
    emoji: '🌙',
    category: 'finance',
    ticker: 'BTC',
    description: '마을의 디지털 금고. 세일러 늑대가 상주하며 "비트코인은 디지털 에너지다!" 하고 열변을 토합니다.',
    descriptionEn: 'The village\'s digital vault. Saylor the wolf is always here, passionately declaring: "Bitcoin is digital energy!"',
  },
  {
    brandId: 'goldman_sachs',
    realName: 'Goldman Sachs',
    villageName: '황금 금고',
    villageNameEn: 'Golden Vault',
    animal: '독수리',
    animalEn: 'Eagle',
    emoji: '🏦',
    category: 'finance',
    ticker: 'GS',
    description: '마을에서 가장 보안이 철저한 금고. 독수리 경비원이 날카로운 눈으로 모든 거래를 감시합니다.',
    descriptionEn: 'The most secure vault in the village. Eagle guards watch every transaction with sharp eyes.',
  },
  {
    brandId: 'berkshire',
    realName: 'Berkshire Hathaway',
    villageName: '올빼미 지주회사',
    villageNameEn: 'Owl Holdings',
    animal: '올빼미',
    animalEn: 'Owl',
    emoji: '🦉',
    category: 'finance',
    ticker: 'BRK.B',
    description: '버핏 할아버지가 직접 운영하는 지주회사. 간판에 "복리의 힘을 믿으세요"라고 적혀 있습니다.',
    descriptionEn: 'A holding company run by Grandpa Buffett himself. The sign reads: "Believe in the power of compounding."',
  },
  {
    brandId: 'jpmorgan',
    realName: 'JP Morgan',
    villageName: '사자 은행',
    villageNameEn: 'Lion Bank',
    animal: '사자',
    animalEn: 'Lion',
    emoji: '🦁',
    category: 'finance',
    ticker: 'JPM',
    description: '다이먼 사자가 경영하는 마을의 대형 은행. "기본에 충실하면 흔들리지 않습니다" 문구가 입구에.',
    descriptionEn: 'The village\'s large bank managed by Dimon the lion. "Stick to basics and you won\'t falter" is written at the entrance.',
  },

  // --- Delivery / E-commerce ---
  {
    brandId: 'amazon',
    realName: 'Amazon',
    villageName: '정글 택배',
    villageNameEn: 'Jungle Delivery',
    animal: '개미',
    animalEn: 'Ant',
    emoji: '📦',
    category: 'tech',
    ticker: 'AMZN',
    description: '뭐든 배달해주는 거대한 창고. 개미 배달부 군단이 부지런히 마을 곳곳에 물건을 나릅니다.',
    descriptionEn: 'A massive warehouse that delivers anything. An ant delivery squad diligently carries goods across the village.',
  },

  // --- Guru-linked Special Brands ---
  {
    brandId: 'spacex',
    realName: 'SpaceX',
    villageName: '별로켓 발사대',
    villageNameEn: 'Star Rocket Launchpad',
    animal: '카멜레온',
    animalEn: 'Chameleon',
    emoji: '🚀',
    category: 'tech',
    description: '머스크 카멜레온의 비밀 로켓 공방. 매일 폭발과 성공을 오가며 "화성 갈 사람?" 하고 외칩니다.',
    descriptionEn: 'Musk the chameleon\'s secret rocket workshop. Bouncing between explosions and successes, he shouts "Who\'s going to Mars?"',
  },
  {
    brandId: 'ark_invest',
    realName: 'ARK Invest',
    villageName: '여우 연구소',
    villageNameEn: 'Fox Lab',
    animal: '여우',
    animalEn: 'Fox',
    emoji: '🔬',
    category: 'finance',
    ticker: 'ARKK',
    description: '캐시우드 여우가 이끄는 혁신 연구소. 벽면 가득 미래 기술 차트와 "5년 뒤를 보세요!" 포스터가 붙어 있습니다.',
    descriptionEn: 'An innovation lab led by Cathie the fox. Walls are covered with future tech charts and "Look 5 years ahead!" posters.',
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** 브랜드 ID로 단건 조회 */
export function getBrandById(brandId: string): BrandShop | undefined {
  return BRAND_SHOPS.find((b) => b.brandId === brandId);
}

/** 주식 티커로 상점 조회 */
export function getBrandByTicker(ticker: string): BrandShop | undefined {
  return BRAND_SHOPS.find((b) => b.ticker === ticker);
}

/** 카테고리별 상점 목록 조회 */
export function getBrandsByCategory(category: BrandShop['category']): BrandShop[] {
  return BRAND_SHOPS.filter((b) => b.category === category);
}

/** 전체 티커 목록 (주식 관련 상점만) */
export function getAllBrandTickers(): string[] {
  return BRAND_SHOPS
    .filter((b) => b.ticker != null)
    .map((b) => b.ticker as string);
}
