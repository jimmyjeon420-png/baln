/**
 * 마을 이벤트 설정 데이터 (30개 이벤트)
 *
 * 역할: 발른 마을에서 발생하는 축제, 장터, 대회, 축하, 긴급, 계절 이벤트 정의
 * 비유: "마을 달력" — 어떤 행사가 언제 열리고, 누가 참여하고, 보상이 뭔지 정리
 *
 * WORLD_DESIGN.md 섹션 27 (마을 미니 이벤트) 기반
 */

import type { VillageEvent } from '../types/village';

// ---------------------------------------------------------------------------
// Festival Events (축제 — 계절/특별 축제 5개)
// ---------------------------------------------------------------------------

const FESTIVAL_EVENTS: VillageEvent[] = [
  {
    id: 'festival_cherry_blossom',
    type: 'festival',
    title: '벚꽃 축제',
    titleEn: 'Cherry Blossom Festival',
    description: '마을 광장에 벚꽃이 만개했습니다! 구루들이 피크닉을 즐기며 봄 투자 전략을 나눕니다.',
    descriptionEn: 'Cherry blossoms bloom across the village square! Gurus enjoy a picnic and share spring investment strategies.',
    duration: 1440, // 24시간
    participants: ['buffett', 'dalio', 'lynch', 'marks', 'rogers'],
    rewards: { credits: 10, badge: 'spring_bloom' },
  },
  {
    id: 'festival_harvest',
    type: 'festival',
    title: '추수감사 축제',
    titleEn: 'Harvest Thanksgiving Festival',
    description: '한 해 투자 성과를 돌아보며 감사하는 축제. 배당의 계절에 도토리가 쏟아집니다!',
    descriptionEn: 'A festival to reflect on the year\'s investment results. Acorns pour down during dividend season!',
    duration: 1440,
    participants: ['buffett', 'lynch', 'marks', 'dalio', 'dimon'],
    rewards: { credits: 15, badge: 'harvest_thanks' },
  },
  {
    id: 'festival_christmas_market',
    type: 'festival',
    title: '크리스마스 마켓',
    titleEn: 'Christmas Market',
    description: '마을이 눈과 조명으로 빛납니다. 구루들이 서로에게 선물을 교환하고, 유저에게도 특별 선물이!',
    descriptionEn: 'The village glows with snow and lights. Gurus exchange gifts, and there\'s a special present for you too!',
    duration: 2880, // 48시간
    participants: ['buffett', 'dalio', 'cathie_wood', 'lynch', 'musk', 'marks', 'rogers', 'dimon', 'druckenmiller', 'saylor'],
    rewards: { credits: 20, badge: 'christmas_spirit' },
  },
  {
    id: 'festival_new_year',
    type: 'festival',
    title: '새해 축제',
    titleEn: 'New Year Festival',
    description: '새해 카운트다운! 구루들이 올해 시장 전망을 발표하고, 마을 하늘에 불꽃놀이가 올라갑니다.',
    descriptionEn: 'New Year countdown! Gurus announce their market outlook and fireworks light up the village sky.',
    duration: 1440,
    participants: ['buffett', 'dalio', 'cathie_wood', 'druckenmiller', 'saylor', 'dimon', 'musk', 'lynch', 'marks', 'rogers'],
    rewards: { credits: 25, badge: 'new_year_fireworks' },
  },
  {
    id: 'festival_summer_splash',
    type: 'festival',
    title: '여름 물놀이 축제',
    titleEn: 'Summer Splash Festival',
    description: '마을 해변에서 물놀이 대회! 린치와 로저스의 서핑 배틀, 머스크의 물총 기습이 펼쳐집니다.',
    descriptionEn: 'Water party at the village beach! Lynch vs Rogers surfing battle, plus Musk\'s surprise water gun attack!',
    duration: 1440,
    participants: ['lynch', 'rogers', 'musk', 'cathie_wood', 'saylor'],
    rewards: { credits: 10, badge: 'summer_surfer' },
  },
];

// ---------------------------------------------------------------------------
// Market Day Events (장터 이벤트 5개)
// ---------------------------------------------------------------------------

const MARKET_EVENTS: VillageEvent[] = [
  {
    id: 'market_flea',
    type: 'market',
    title: '마을 벼룩시장',
    titleEn: 'Village Flea Market',
    description: '구루들이 자신의 애장품을 내놓았습니다! 버핏의 오래된 신문, 막스의 메모 노트, 머스크의 이상한 발명품까지.',
    descriptionEn: 'Gurus sell their treasured items! Buffett\'s old newspapers, Marks\' memo notebooks, and Musk\'s bizarre inventions.',
    duration: 720, // 12시간
    participants: ['buffett', 'marks', 'musk', 'lynch', 'rogers'],
    rewards: { credits: 5 },
  },
  {
    id: 'market_guru_yard_sale',
    type: 'market',
    title: '구루 차고 세일',
    titleEn: 'Guru Yard Sale',
    description: '구루들이 포트폴리오 정리 시즌에 마을에 차고 세일을 엽니다. "투자 정리 = 인생 정리"라는 막스의 한마디.',
    descriptionEn: 'Gurus open yard sales during portfolio rebalancing season. Marks says: "Tidying investments = tidying life."',
    duration: 480, // 8시간
    participants: ['marks', 'buffett', 'lynch', 'dalio'],
    rewards: { credits: 5 },
  },
  {
    id: 'market_food_festival',
    type: 'market',
    title: '마을 음식 축제',
    titleEn: 'Village Food Festival',
    description: '각 구루가 자기 나라 음식을 가져왔습니다! 버핏의 체리코크, 로저스의 세계 요리, 린치의 마트 시식 코너.',
    descriptionEn: 'Each guru brings their signature dish! Buffett\'s Cherry Coke, Rogers\' world cuisine, Lynch\'s supermarket samples.',
    duration: 720,
    participants: ['buffett', 'rogers', 'lynch', 'musk', 'cathie_wood'],
    rewards: { credits: 8 },
  },
  {
    id: 'market_brand_street_sale',
    type: 'market',
    title: '상점 거리 대세일',
    titleEn: 'Brand Street Big Sale',
    description: '마을 상점 거리에서 대규모 할인! 린치가 직접 상점을 돌며 "이건 사야 해!" 코멘트를 남깁니다.',
    descriptionEn: 'Massive sale on Brand Street! Lynch tours the shops commenting "You gotta buy this one!"',
    duration: 1440,
    participants: ['lynch', 'buffett', 'cathie_wood', 'musk'],
    rewards: { credits: 10 },
  },
  {
    id: 'market_night_market',
    type: 'market',
    title: '달빛 야시장',
    titleEn: 'Moonlight Night Market',
    description: '밤에만 열리는 특별 야시장! 세일러가 비트코인 굿즈를, 캐시우드가 미래 기술 전시를 엽니다.',
    descriptionEn: 'A special night market open only after dark! Saylor sells Bitcoin merch, Cathie exhibits future tech.',
    duration: 360, // 6시간 (저녁~자정)
    participants: ['saylor', 'cathie_wood', 'musk', 'druckenmiller'],
    rewards: { credits: 7 },
  },
];

// ---------------------------------------------------------------------------
// Competition Events (대회 이벤트 5개)
// ---------------------------------------------------------------------------

const COMPETITION_EVENTS: VillageEvent[] = [
  {
    id: 'competition_prediction_tournament',
    type: 'competition',
    title: '예측왕 토너먼트',
    titleEn: 'Prediction Championship Tournament',
    description: '이번 주 최고 적중률을 가린다! 드러킨밀러가 심사위원장. 우승하면 전설 뱃지와 함께 구루의 인정을!',
    descriptionEn: 'Who has the best prediction accuracy this week? Druckenmiller judges. Win for a legendary badge and guru respect!',
    duration: 10080, // 7일
    participants: ['druckenmiller', 'dalio', 'buffett', 'rogers'],
    rewards: { credits: 30, badge: 'prediction_champion' },
  },
  {
    id: 'competition_quiz_championship',
    type: 'competition',
    title: '투자 퀴즈 챔피언십',
    titleEn: 'Investment Quiz Championship',
    description: '경제 상식 퀴즈 대회! 달리오가 출제하고, 막스가 채점합니다. 합격하면 "현명한 주민" 뱃지!',
    descriptionEn: 'Economics quiz contest! Dalio creates questions, Marks grades. Pass for the "Wise Resident" badge!',
    duration: 1440,
    participants: ['dalio', 'marks', 'buffett', 'lynch'],
    rewards: { credits: 15, badge: 'quiz_master' },
  },
  {
    id: 'competition_debate_club',
    type: 'competition',
    title: '대토론회: 가치 vs 혁신',
    titleEn: 'Grand Debate: Value vs Innovation',
    description: '버핏과 캐시우드의 전설적 토론! 가치투자파와 혁신파가 정면 대결합니다. 어느 편에 설 건가요?',
    descriptionEn: 'The legendary debate between Buffett and Cathie! Value vs Innovation head-to-head. Which side are you on?',
    duration: 120, // 2시간
    participants: ['buffett', 'cathie_wood', 'marks', 'musk', 'saylor', 'dimon'],
    rewards: { credits: 10 },
  },
  {
    id: 'competition_surfing_race',
    type: 'competition',
    title: '서핑 대회',
    titleEn: 'Surfing Competition',
    description: '린치와 로저스의 서핑 대결! 마을 해변에서 파도를 타며 "가장 큰 파도 = 가장 큰 트렌드"를 외칩니다.',
    descriptionEn: 'Lynch vs Rogers surfing showdown! Riding waves at the beach, shouting "Biggest wave = biggest trend!"',
    duration: 180, // 3시간
    participants: ['lynch', 'rogers', 'musk', 'cathie_wood'],
    rewards: { credits: 8 },
  },
  {
    id: 'competition_chess_tournament',
    type: 'competition',
    title: '마을 체스 토너먼트',
    titleEn: 'Village Chess Tournament',
    description: '전략적 사고력 대결! 버핏과 막스의 체스는 투자 스타일 그 자체. 느리지만 확실한 한 수.',
    descriptionEn: 'A battle of strategic minds! Buffett and Marks play chess like they invest. Slow but certain moves.',
    duration: 240, // 4시간
    participants: ['buffett', 'marks', 'dalio', 'druckenmiller'],
    rewards: { credits: 8 },
  },
];

// ---------------------------------------------------------------------------
// Celebration Events (축하 이벤트 5개)
// ---------------------------------------------------------------------------

const CELEBRATION_EVENTS: VillageEvent[] = [
  {
    id: 'celebration_100_days',
    type: 'celebration',
    title: '100일 출석 축하 파티',
    titleEn: '100-Day Attendance Party',
    description: '주민님의 100일을 축하합니다! 구루 전원이 줄 서서 하이파이브. 마을에 "축하 100일!" 배너가 걸립니다.',
    descriptionEn: 'Celebrating your 100th day! All gurus line up for high-fives. "Happy 100 Days!" banners across the village.',
    duration: 1440,
    participants: ['buffett', 'dalio', 'cathie_wood', 'druckenmiller', 'saylor', 'dimon', 'musk', 'lynch', 'marks', 'rogers'],
    rewards: { credits: 50, badge: 'century_resident' },
  },
  {
    id: 'celebration_birthday_party',
    type: 'celebration',
    title: '생일 파티',
    titleEn: 'Birthday Party',
    description: '생일 축하합니다! 마을 카페에서 구루들이 각자 스타일대로 축하해 줍니다. 케이크와 도토리 선물도!',
    descriptionEn: 'Happy Birthday! Gurus celebrate in their own style at the cafe. Cake and acorn presents included!',
    duration: 1440,
    participants: ['buffett', 'dalio', 'cathie_wood', 'lynch', 'musk', 'marks'],
    rewards: { credits: 20, badge: 'birthday_star' },
  },
  {
    id: 'celebration_first_prediction_correct',
    type: 'celebration',
    title: '첫 예측 적중 축하',
    titleEn: 'First Correct Prediction Celebration',
    description: '첫 예측을 맞혔습니다! 드러킨밀러가 박수를 치며 "센스가 있군!" 하고 칭찬합니다.',
    descriptionEn: 'You got your first prediction right! Druckenmiller applauds: "You\'ve got the instinct!"',
    duration: 60,
    participants: ['druckenmiller', 'dalio', 'buffett'],
    rewards: { credits: 5 },
  },
  {
    id: 'celebration_health_a',
    type: 'celebration',
    title: '건강 점수 A 달성 축하',
    titleEn: 'Health Score A Achievement Celebration',
    description: '건강 점수 최고 등급 달성! 주치의 막스가 감동하며 "기적적인 회복입니다!" 특별 진단서를 발급합니다.',
    descriptionEn: 'Top health score achieved! Dr. Marks is moved: "A miraculous recovery!" He issues a special certificate.',
    duration: 120,
    participants: ['marks', 'buffett', 'dalio', 'lynch'],
    rewards: { credits: 15, badge: 'perfect_health' },
  },
  {
    id: 'celebration_prosperity_milestone',
    type: 'celebration',
    title: '마을 번영 축하제',
    titleEn: 'Village Prosperity Celebration',
    description: '마을 번영도가 새로운 단계에 도달했습니다! 광장에 새 건물이 세워지고, 구루 전원이 테이프 커팅!',
    descriptionEn: 'Village prosperity reached a new level! A new building rises in the square, and all gurus cut the ribbon!',
    duration: 720,
    participants: ['buffett', 'dalio', 'cathie_wood', 'druckenmiller', 'saylor', 'dimon', 'musk', 'lynch', 'marks', 'rogers'],
    rewards: { credits: 20 },
  },
];

// ---------------------------------------------------------------------------
// Emergency Events (긴급 이벤트 5개 — 시장 급변 대응)
// ---------------------------------------------------------------------------

const EMERGENCY_EVENTS: VillageEvent[] = [
  {
    id: 'emergency_crash_drill',
    type: 'emergency',
    title: '시장 급락 대응 훈련',
    titleEn: 'Market Crash Response Drill',
    description: '코스피 -3% 이상 급락! 구루들이 긴급 회의를 소집합니다. 버핏만 웃고 있네요 — "공포에 사라."',
    descriptionEn: 'KOSPI drops over -3%! Gurus call an emergency meeting. Only Buffett is smiling: "Be greedy when others are fearful."',
    duration: 480,
    participants: ['buffett', 'dalio', 'marks', 'dimon', 'druckenmiller'],
    rewards: { credits: 10 },
  },
  {
    id: 'emergency_crypto_surge',
    type: 'emergency',
    title: '비트코인 폭등 속보',
    titleEn: 'Bitcoin Surge Breaking News',
    description: '비트코인 +10% 급등! 세일러가 마을을 돌아다니며 깃발을 흔듭니다. 다이먼은 고개를 저으며 한숨.',
    descriptionEn: 'Bitcoin surges +10%! Saylor parades through the village waving a flag. Dimon shakes his head and sighs.',
    duration: 360,
    participants: ['saylor', 'musk', 'cathie_wood', 'dimon', 'buffett'],
    rewards: { credits: 8 },
  },
  {
    id: 'emergency_rate_hike',
    type: 'emergency',
    title: '긴급 금리 인상 발표',
    titleEn: 'Emergency Rate Hike Announcement',
    description: '중앙은행이 깜짝 금리 인상을 발표했습니다! 달리오가 긴급 강연을 열고, 다이먼이 "침착하세요" 연설 중.',
    descriptionEn: 'Central bank announces surprise rate hike! Dalio gives an emergency lecture. Dimon says "Stay calm."',
    duration: 240,
    participants: ['dalio', 'dimon', 'marks', 'buffett', 'druckenmiller'],
    rewards: { credits: 8 },
  },
  {
    id: 'emergency_vix_spike',
    type: 'emergency',
    title: '공포지수 급등 경보',
    titleEn: 'VIX Spike Alert',
    description: 'VIX 30 돌파! 마을에 안개가 깔리고 분위기가 긴장됩니다. 하지만 버핏만 유일하게 웃고 있어요.',
    descriptionEn: 'VIX breaks 30! Fog covers the village and tension rises. But Buffett is the only one smiling.',
    duration: 480,
    participants: ['buffett', 'marks', 'dalio', 'druckenmiller', 'dimon'],
    rewards: { credits: 10 },
  },
  {
    id: 'emergency_flash_crash',
    type: 'emergency',
    title: '플래시 크래시 긴급 대피',
    titleEn: 'Flash Crash Emergency',
    description: '갑작스러운 시장 급락! 드러킨밀러가 재빠르게 분석하고, 막스가 병원에서 "리스크 관리 교실"을 긴급 개최합니다.',
    descriptionEn: 'Sudden market flash crash! Druckenmiller analyzes rapidly, while Marks holds an emergency "Risk Management Class."',
    duration: 360,
    participants: ['druckenmiller', 'marks', 'dalio', 'buffett', 'dimon'],
    rewards: { credits: 12 },
  },
];

// ---------------------------------------------------------------------------
// Seasonal Events (계절 이벤트 5개)
// ---------------------------------------------------------------------------

const SEASONAL_EVENTS: VillageEvent[] = [
  {
    id: 'seasonal_rainy_reading',
    type: 'seasonal',
    title: '비 오는 날 독서 모임',
    titleEn: 'Rainy Day Book Club',
    description: '비 오는 날이면 카페에 구루들이 모여 독서를 합니다. 버핏의 추천 도서, 막스의 메모 작성법을 배워보세요.',
    descriptionEn: 'On rainy days, gurus gather at the cafe to read. Learn Buffett\'s book picks and Marks\' memo-writing method.',
    duration: 480,
    participants: ['buffett', 'marks', 'dalio', 'lynch'],
    rewards: { credits: 5 },
  },
  {
    id: 'seasonal_snow_day',
    type: 'seasonal',
    title: '눈 오는 날 특별 이벤트',
    titleEn: 'Snow Day Special',
    description: '마을에 눈이 내립니다! 머스크가 눈사람을 만들고, 린치가 핫초코를 나눠줍니다. 따뜻한 하루.',
    descriptionEn: 'Snow falls on the village! Musk builds a snowman, Lynch shares hot chocolate. A warm day indeed.',
    duration: 1440,
    participants: ['musk', 'lynch', 'cathie_wood', 'rogers', 'buffett'],
    rewards: { credits: 5 },
  },
  {
    id: 'seasonal_autumn_leaves',
    type: 'seasonal',
    title: '단풍길 산책',
    titleEn: 'Autumn Leaves Stroll',
    description: '마을 산책로가 붉게 물들었습니다. 버핏이 코카콜라를 마시며 회상하고, 달리오가 사이클을 이야기합니다.',
    descriptionEn: 'The village path turns red with autumn leaves. Buffett sips Coke reminiscing, Dalio talks about cycles.',
    duration: 1440,
    participants: ['buffett', 'dalio', 'marks', 'lynch', 'rogers'],
    rewards: { credits: 5 },
  },
  {
    id: 'seasonal_spring_garden',
    type: 'seasonal',
    title: '봄맞이 마을 정원 가꾸기',
    titleEn: 'Spring Village Garden Day',
    description: '봄이 왔습니다! 구루들이 함께 마을 정원을 가꿉니다. 캐시우드: "새 시즌엔 새 기회가!" 로저스: "씨앗에 투자하는 거야."',
    descriptionEn: 'Spring has come! Gurus tend the village garden together. Cathie: "New season, new opportunities!" Rogers: "Invest in seeds."',
    duration: 720,
    participants: ['cathie_wood', 'rogers', 'lynch', 'dalio', 'marks'],
    rewards: { credits: 8 },
  },
  {
    id: 'seasonal_starry_night',
    type: 'seasonal',
    title: '여름밤 별 보기 모임',
    titleEn: 'Summer Stargazing Night',
    description: '맑은 여름 밤, 마을 언덕에서 별을 봅니다. 달리오: "우주도 사이클이야." 세일러: "저 별이 비트코인이라면..."',
    descriptionEn: 'Clear summer night, stargazing on the village hill. Dalio: "The universe has cycles too." Saylor: "If that star were Bitcoin..."',
    duration: 360,
    participants: ['dalio', 'saylor', 'musk', 'cathie_wood', 'rogers'],
    rewards: { credits: 5 },
  },
];

// ---------------------------------------------------------------------------
// Combined Export
// ---------------------------------------------------------------------------

/** 전체 마을 이벤트 목록 (30개) */
export const VILLAGE_EVENTS: VillageEvent[] = [
  ...FESTIVAL_EVENTS,
  ...MARKET_EVENTS,
  ...COMPETITION_EVENTS,
  ...CELEBRATION_EVENTS,
  ...EMERGENCY_EVENTS,
  ...SEASONAL_EVENTS,
];

/** 이벤트 유형별 조회 헬퍼 */
export function getEventsByType(type: VillageEvent['type']): VillageEvent[] {
  return VILLAGE_EVENTS.filter((e) => e.type === type);
}

/** 특정 구루가 참여하는 이벤트 조회 */
export function getEventsForGuru(guruId: string): VillageEvent[] {
  return VILLAGE_EVENTS.filter((e) => e.participants.includes(guruId));
}

/** 이벤트 ID로 단건 조회 */
export function getEventById(eventId: string): VillageEvent | undefined {
  return VILLAGE_EVENTS.find((e) => e.id === eventId);
}
