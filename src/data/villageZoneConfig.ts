/**
 * 마을 구역(Zone) 설정 데이터
 *
 * 역할: 발른 마을의 지리적 구역을 정의 — 각 구루가 어디서 시간을 보내는지,
 *       마을 지도에서 어느 위치에 있는지, 어떤 지형인지를 관리
 * 비유: "마을 지도" — 동물의숲에서 각 구역을 방문해 주민을 만나는 것처럼,
 *       구루를 만나려면 제 시간에 제 장소를 찾아야 함
 *
 * 좌표계: x/y 는 마을 전체 지도 기준 0.0~1.0 비율 (좌상단 원점)
 * 시간대: KST (한국 표준시) 기준
 */

// ---------------------------------------------------------------------------
// VillageZone 타입 정의
// ---------------------------------------------------------------------------

export interface VillageZone {
  /** 구역 고유 ID (영문 snake_case) */
  id: string;
  /** 구역 이름 (한국어) */
  name: string;
  /** 구역 이름 (영어) */
  nameEn: string;
  /** 구역 설명 (한국어) */
  description: string;
  /** 구역 설명 (영어) */
  descriptionEn: string;
  /** 대표 이모지 */
  emoji: string;
  /**
   * 마을 지도 상 위치 (비율 0.0~1.0)
   * x/y: 좌상단 기준 오프셋, width/height: 구역 크기
   */
  bounds: { x: number; y: number; width: number; height: number };
  /** 이 구역을 자주 방문하는 구루 ID 목록 */
  frequentGurus: string[];
  /** 가장 활성화되는 KST 시간대 (hour 단위) */
  peakHours: number[];
  /** 지형 종류 — 배경 렌더링에 사용 */
  terrain: 'grass' | 'stone' | 'water' | 'sand' | 'wood' | 'garden';
  /** 이 구역에 있는 브랜드 상점 ID (brandWorldConfig 참조) */
  brandIds?: string[];
  /** 마을 번영도 몇 레벨 이상이어야 해금되는가 (1 = 처음부터 개방) */
  unlockLevel: number;
}

// ---------------------------------------------------------------------------
// 12개 구역 데이터
// ---------------------------------------------------------------------------

export const VILLAGE_ZONES: VillageZone[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. 마을 광장 — 마을 중심부, 항상 활성, 모든 구루가 지나다님
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'village_square',
    name: '마을 광장',
    nameEn: 'Village Square',
    description: '마을의 심장부. 모든 구루가 하루에 한 번은 지나가는 만남의 장소입니다. 중앙에 큰 시계탑이 서 있고, 게시판에는 오늘의 맥락 카드가 붙어 있습니다.',
    descriptionEn: 'The heart of the village. Every guru passes through at least once a day. A large clock tower stands at the center, and the notice board displays today\'s context card.',
    emoji: '🏛️',
    bounds: { x: 0.35, y: 0.35, width: 0.30, height: 0.30 },
    frequentGurus: ['buffett', 'dalio', 'lynch', 'dimon', 'druckenmiller', 'marks', 'rogers', 'cathie_wood', 'saylor', 'musk'],
    peakHours: [9, 10, 14, 15, 18],
    terrain: 'stone',
    unlockLevel: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. 올빼미 도서관 — 버핏·막스·린치가 독서하는 공간
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'owl_library',
    name: '올빼미 도서관',
    nameEn: 'Owl Library',
    description: '마을에서 가장 오래된 건물. 천장까지 닿는 책장에는 연차보고서, 역사책, 투자 고전이 빼곡합니다. 버핏 할아버지가 즐겨 찾는 벤치가 입구 오른쪽에 있습니다.',
    descriptionEn: 'The oldest building in the village. Floor-to-ceiling shelves are packed with annual reports, history books, and investment classics. Grandpa Buffett\'s favorite bench sits to the right of the entrance.',
    emoji: '📚',
    bounds: { x: 0.05, y: 0.05, width: 0.25, height: 0.25 },
    frequentGurus: ['buffett', 'marks', 'lynch'],
    peakHours: [5, 6, 7, 21, 22],
    terrain: 'wood',
    brandIds: ['berkshire'],
    unlockLevel: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. 혁신 연구소 — 캐시우드·머스크·세일러의 기술 허브
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'innovation_lab',
    name: '혁신 연구소',
    nameEn: 'Innovation Lab',
    description: '미래 기술의 용광로. 홀로그래픽 차트와 로봇 팔이 가득한 실험실입니다. 캐시우드 여우, 머스크 카멜레온, 세일러 늑대가 돌아가며 프레젠테이션을 합니다.',
    descriptionEn: 'The forge of future technology. A lab filled with holographic charts and robotic arms. Cathie the fox, Musk the chameleon, and Saylor the wolf take turns presenting here.',
    emoji: '🔬',
    bounds: { x: 0.70, y: 0.05, width: 0.25, height: 0.30 },
    frequentGurus: ['cathie_wood', 'musk', 'saylor'],
    peakHours: [10, 11, 22, 23, 0, 1, 2],
    terrain: 'stone',
    brandIds: ['ark_invest', 'nvidia', 'spacex'],
    unlockLevel: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. 명상 정원 — 달리오·막스의 고요한 사색 공간
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'meditation_garden',
    name: '명상 정원',
    nameEn: 'Meditation Garden',
    description: '마을 북서쪽 조용한 구석. 대나무 숲과 연못이 어우러진 일본식 정원입니다. 달리오 사슴이 매일 아침 여기서 명상을 하며, 막스 거북이는 느릿느릿 산책합니다.',
    descriptionEn: 'A quiet corner in the northwest of the village. A Japanese-style garden blending bamboo groves and a pond. Dalio the deer meditates here every morning, and Marks the turtle takes slow strolls.',
    emoji: '🍃',
    bounds: { x: 0.05, y: 0.35, width: 0.22, height: 0.30 },
    frequentGurus: ['dalio', 'marks'],
    peakHours: [6, 7, 18, 22],
    terrain: 'garden',
    unlockLevel: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. 사냥꾼의 언덕 — 드러킨밀러·로저스의 전망대
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'hunters_hill',
    name: '사냥꾼의 언덕',
    nameEn: 'Hunter\'s Hill',
    description: '마을 전체가 내려다보이는 높은 언덕. 드러킨밀러 치타가 쌍안경을 들고 추세를 관찰하고, 로저스 호랑이는 세계 지도를 펼쳐놓고 이머징 마켓을 분석합니다.',
    descriptionEn: 'A high hill overlooking the entire village. Druckenmiller the cheetah watches trends through binoculars, while Rogers the tiger spreads a world map to analyze emerging markets.',
    emoji: '🔭',
    bounds: { x: 0.70, y: 0.35, width: 0.25, height: 0.22 },
    frequentGurus: ['druckenmiller', 'rogers'],
    peakHours: [6, 7, 9, 15, 21],
    terrain: 'grass',
    unlockLevel: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. 달빛 호수 — 낚시, 평화, 밤 활동
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'moonlight_lake',
    name: '달빛 호수',
    nameEn: 'Moonlight Lake',
    description: '마을 남쪽의 넓은 호수. 밤이면 달빛이 수면에 반사되어 아름답습니다. 낚시를 좋아하는 구루들이 여기서 기다리는 법을 배웁니다. "기회가 올 때까지 기다려라" — 버핏.',
    descriptionEn: 'A wide lake in the south of the village. At night, moonlight reflects beautifully off the surface. Gurus who love fishing learn patience here. "Wait until opportunity comes" — Buffett.',
    emoji: '🌙',
    bounds: { x: 0.35, y: 0.70, width: 0.30, height: 0.25 },
    frequentGurus: ['buffett', 'dalio', 'rogers', 'marks'],
    peakHours: [17, 18, 19, 21, 22],
    terrain: 'water',
    unlockLevel: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. 시장 거리 — 브랜드 상점, 린치의 슈퍼마켓 탐방로
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'market_street',
    name: '시장 거리',
    nameEn: 'Market Street',
    description: '마을 동쪽을 따라 길게 이어진 상점 거리. 피터 린치 곰이 "마트에서 종목을 찾아라"를 실천하는 곳입니다. 도토리 카페, 황금 아치 식당, 발자국 운동화 등 다양한 상점이 줄지어 있습니다.',
    descriptionEn: 'A long shopping street running along the east side of the village. Peter Lynch the bear practices "find stocks at the supermarket" here. Acorn Cafe, Golden Arch Diner, and Pawprint Sneakers line the street.',
    emoji: '🏪',
    bounds: { x: 0.70, y: 0.62, width: 0.25, height: 0.33 },
    frequentGurus: ['lynch', 'rogers', 'cathie_wood', 'saylor', 'musk'],
    peakHours: [7, 8, 10, 14, 15, 18],
    terrain: 'stone',
    brandIds: ['starbucks', 'mcdonalds', 'nike', 'cocacola', 'amazon', 'lvmh', 'apple', 'toyota'],
    unlockLevel: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. 사자 은행 — 다이먼의 영역, 전통 금융 구역
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'lion_bank',
    name: '사자 은행',
    nameEn: 'Lion Bank',
    description: '웅장한 기둥과 육중한 금고 문이 인상적인 마을 중앙 은행. 다이먼 사자의 본거지. "기본에 충실하면 흔들리지 않습니다"는 문구가 대리석 입구에 새겨져 있습니다.',
    descriptionEn: 'The village central bank with impressive columns and heavy vault doors. Dimon the lion\'s home base. "Stick to basics and you won\'t falter" is carved into the marble entrance.',
    emoji: '🏦',
    bounds: { x: 0.35, y: 0.05, width: 0.30, height: 0.22 },
    frequentGurus: ['dimon', 'buffett', 'marks'],
    peakHours: [6, 7, 9, 10, 14, 18],
    terrain: 'stone',
    brandIds: ['jpmorgan', 'goldman_sachs', 'berkshire'],
    unlockLevel: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. 달 거래소 — 세일러의 암호화폐 성지
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'moon_exchange',
    name: '달 거래소',
    nameEn: 'Moon Exchange',
    description: '밤에 가장 빛나는 거래소. 벽면 전체가 비트코인 가격 차트로 뒤덮여 있고, 레이저 눈 이모티콘 장식이 가득합니다. 세일러 늑대가 24시간 상주하며 "비트코인이 답이다"를 외칩니다.',
    descriptionEn: 'The exchange that shines brightest at night. Walls are covered with Bitcoin price charts and laser eye emoji decorations. Saylor the wolf is on-site 24/7 shouting "Bitcoin is the answer."',
    emoji: '₿',
    bounds: { x: 0.05, y: 0.70, width: 0.25, height: 0.25 },
    frequentGurus: ['saylor', 'musk'],
    peakHours: [11, 14, 22, 23, 0, 1],
    terrain: 'stone',
    brandIds: ['bitcoin_exchange'],
    unlockLevel: 2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. 별 로켓 발사대 — 머스크의 우주 개발 기지
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'star_launchpad',
    name: '별 로켓 발사대',
    nameEn: 'Star Rocket Launchpad',
    description: '마을 북동쪽 끝에 있는 거대한 발사대. 머스크 카멜레온이 로켓을 조립하고 테스트하는 곳. 가끔 폭발음이 들리지만 주민들은 익숙합니다. "실패는 데이터다" — 머스크.',
    descriptionEn: 'A massive launchpad at the northeast edge of the village. Musk the chameleon assembles and tests rockets here. Occasional explosions are heard but residents are used to it. "Failure is data" — Musk.',
    emoji: '🚀',
    bounds: { x: 0.70, y: 0.05, width: 0.25, height: 0.25 },
    frequentGurus: ['musk', 'cathie_wood'],
    peakHours: [11, 23, 0, 1, 2, 3],
    terrain: 'sand',
    brandIds: ['spacex', 'tesla'],
    unlockLevel: 2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 11. 탐험가의 항구 — 로저스의 세계 여행 테마 구역
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'explorers_harbor',
    name: '탐험가의 항구',
    nameEn: 'Explorer\'s Harbor',
    description: '마을 남서쪽 해안의 작은 항구. 세계 각국의 깃발이 펄럭이고, 오래된 지도와 나침반이 진열되어 있습니다. 짐 로저스 호랑이가 다음 탐험지를 계획하는 곳입니다.',
    descriptionEn: 'A small harbor on the southwest coast of the village. Flags from countries worldwide flutter, and old maps and compasses are on display. Jim Rogers the tiger plans his next expedition here.',
    emoji: '⚓',
    bounds: { x: 0.05, y: 0.62, width: 0.25, height: 0.33 },
    frequentGurus: ['rogers', 'dalio'],
    peakHours: [6, 10, 14, 17, 21],
    terrain: 'sand',
    unlockLevel: 2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 12. 축제 마당 — 이벤트·축하 전용 (번영도 3레벨 해금)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'festival_ground',
    name: '축제 마당',
    nameEn: 'Festival Ground',
    description: '번영도가 높아지면 열리는 특별한 광장. 모든 구루가 한자리에 모여 계절 축제, 예측 경연, 라운드테이블 토론을 펼칩니다. 등불과 깃발로 화려하게 꾸며집니다.',
    descriptionEn: 'A special square that opens as prosperity grows. All gurus gather here for seasonal festivals, prediction tournaments, and roundtable debates. Decorated with lanterns and colorful banners.',
    emoji: '🎉',
    bounds: { x: 0.35, y: 0.35, width: 0.30, height: 0.30 },
    frequentGurus: ['buffett', 'dalio', 'cathie_wood', 'druckenmiller', 'saylor', 'dimon', 'musk', 'lynch', 'marks', 'rogers'],
    peakHours: [12, 13, 14, 19, 20],
    terrain: 'grass',
    unlockLevel: 3,
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** ID로 구역 단건 조회 */
export function getZoneById(id: string): VillageZone | undefined {
  return VILLAGE_ZONES.find((z) => z.id === id);
}

/** 특정 구루가 자주 방문하는 구역 목록 조회 */
export function getZonesForGuru(guruId: string): VillageZone[] {
  return VILLAGE_ZONES.filter((z) => z.frequentGurus.includes(guruId));
}

/**
 * 지도 좌표(x, y) 기준으로 해당 위치의 구역 조회
 * bounds 내에 좌표가 포함되는 첫 번째 구역 반환
 */
export function getZoneAtPosition(x: number, y: number): VillageZone | undefined {
  return VILLAGE_ZONES.find((z) => {
    const { bounds } = z;
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  });
}

/**
 * 특정 KST 시간에 활성화된 구역 목록 반환
 * peakHours에 포함된 구역 = 활성 구역
 */
export function getActiveZones(hour: number): VillageZone[] {
  return VILLAGE_ZONES.filter((z) => z.peakHours.includes(hour));
}

/** 번영도 레벨에 따라 해금된 구역 목록 반환 */
export function getUnlockedZones(prosperityLevel: number): VillageZone[] {
  return VILLAGE_ZONES.filter((z) => z.unlockLevel <= prosperityLevel);
}

/** 특정 브랜드 상점이 위치한 구역 조회 */
export function getZoneByBrandId(brandId: string): VillageZone | undefined {
  return VILLAGE_ZONES.find((z) => z.brandIds?.includes(brandId));
}

/** 지형 유형별 구역 목록 반환 */
export function getZonesByTerrain(terrain: VillageZone['terrain']): VillageZone[] {
  return VILLAGE_ZONES.filter((z) => z.terrain === terrain);
}
