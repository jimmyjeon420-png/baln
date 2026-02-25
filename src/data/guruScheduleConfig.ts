/**
 * 10명 구루 일과표 설정 데이터
 *
 * 역할: 각 구루가 하루 중 언제, 어디서, 무엇을 하는지 시간표 정의
 * 비유: "NPC 일과표" — 동물의숲처럼 구루를 만나러 시간 맞춰 방문하게 만드는 장치
 *
 * WORLD_DESIGN.md 섹션 11 (구루 일과표) + 섹션 15 (캐릭터 디테일) 기반
 * 실제 인물의 성격을 반영 (버핏 새벽 기상, 머스크 야행성 등)
 *
 * 시간대 구분:
 *   morning   = 5:00~8:59   (새벽~아침)
 *   midday    = 9:00~12:59  (오전~점심)
 *   afternoon = 13:00~16:59 (오후~장 마감)
 *   evening   = 17:00~20:59 (저녁)
 *   night     = 21:00~0:59  (밤)
 *   late_night= 1:00~4:59   (새벽)
 */

import type { GuruScheduleEntry } from '../types/village';

// ---------------------------------------------------------------------------
// 시간대 타입 (일과표 인덱싱용)
// ---------------------------------------------------------------------------

export type TimeSlot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'late_night';

export interface GuruDailySchedule {
  guruId: string;
  schedule: Record<TimeSlot, GuruScheduleEntry>;
}

// ---------------------------------------------------------------------------
// Helper: 시간(KST hour)으로 TimeSlot 결정
// ---------------------------------------------------------------------------

export function getTimeSlot(kstHour: number): TimeSlot {
  if (kstHour >= 5 && kstHour <= 8) return 'morning';
  if (kstHour >= 9 && kstHour <= 12) return 'midday';
  if (kstHour >= 13 && kstHour <= 16) return 'afternoon';
  if (kstHour >= 17 && kstHour <= 20) return 'evening';
  if (kstHour >= 21 || kstHour === 0) return 'night';
  return 'late_night'; // 1~4
}

// ---------------------------------------------------------------------------
// 1. Buffett (올빼미) — 새벽 기상, 신문 중독, 체리코크 사랑
// ---------------------------------------------------------------------------

const BUFFETT_SCHEDULE: GuruDailySchedule = {
  guruId: 'buffett',
  schedule: {
    morning: {
      hour: 5,
      activity: 'reading',
      location: '광장 벤치',
      locationEn: 'Square Bench',
      mood: 'calm',
      dialogue: '자네, 일찍 일어났군. 좋은 습관이야. 나는 매일 5시에 일어나서 신문 5개를 읽는다네.',
      dialogueEn: 'You\'re up early. Good habit. I wake at 5 every day and read five newspapers.',
    },
    midday: {
      hour: 10,
      activity: 'tea_ceremony',
      location: '카페',
      locationEn: 'Cafe',
      mood: 'thinking',
      dialogue: '체리코크 한 잔 하면서 연차보고서를 읽는 중이야. 장기적으로 보면 이 회사가...',
      dialogueEn: 'Having a Cherry Coke while reading annual reports. In the long run, this company...',
    },
    afternoon: {
      hour: 14,
      activity: 'chess',
      location: '광장',
      locationEn: 'Square',
      mood: 'calm',
      dialogue: '체스와 투자는 비슷해. 다음 수가 아니라 20수 앞을 봐야 하지.',
      dialogueEn: 'Chess and investing are alike. You need to see 20 moves ahead, not just the next one.',
    },
    evening: {
      hour: 18,
      activity: 'walking',
      location: '마을 산책로',
      locationEn: 'Village Trail',
      mood: 'joy',
      dialogue: '저녁 산책을 하면 하루의 투자 결정을 돌아볼 수 있어. 복리는 산책에도 적용되지.',
      dialogueEn: 'Evening walks let me reflect on the day\'s investment decisions. Compounding applies to walks too.',
    },
    night: {
      hour: 21,
      activity: 'reading',
      location: '집 서재',
      locationEn: 'Home Study',
      mood: 'sleepy',
      dialogue: '이제 좀 쉬어야겠어. 자네도 일찍 자게. 내일 신문이 기다리고 있으니.',
      dialogueEn: 'Time to rest. You should sleep early too. Tomorrow\'s newspapers are waiting.',
    },
    late_night: {
      hour: 3,
      activity: 'napping',
      location: '집',
      locationEn: 'Home',
      mood: 'sleepy',
      dialogue: '...zzz... 코카콜라... 모트... zzz...',
      dialogueEn: '...zzz... Coca-Cola... moat... zzz...',
    },
  },
};

// ---------------------------------------------------------------------------
// 2. Dalio (사슴) — 명상가, 원칙주의자, 정해진 루틴
// ---------------------------------------------------------------------------

const DALIO_SCHEDULE: GuruDailySchedule = {
  guruId: 'dalio',
  schedule: {
    morning: {
      hour: 6,
      activity: 'meditating',
      location: '마을 숲 명상터',
      locationEn: 'Forest Meditation Spot',
      mood: 'calm',
      dialogue: '아침 명상은 원칙의 시작이야. 20분이면 하루 전체의 판단력이 달라진다네.',
      dialogueEn: 'Morning meditation is where principles begin. 20 minutes changes your judgment for the entire day.',
    },
    midday: {
      hour: 9,
      activity: 'reading',
      location: '광장 게시판',
      locationEn: 'Square Notice Board',
      mood: 'thinking',
      dialogue: '원칙적으로 말하자면, 오늘 거시경제 데이터를 면밀히 분석해야 해.',
      dialogueEn: 'In principle, we need to closely analyze today\'s macroeconomic data.',
    },
    afternoon: {
      hour: 14,
      activity: 'writing',
      location: '집 사무실',
      locationEn: 'Home Office',
      mood: 'thinking',
      dialogue: '경제 기계는 단순해. 소비, 생산, 부채. 이 세 가지 사이클을 이해하면 되지.',
      dialogueEn: 'The economic machine is simple. Spending, production, debt. Understand these three cycles.',
    },
    evening: {
      hour: 17,
      activity: 'walking',
      location: '마을 산책로',
      locationEn: 'Village Trail',
      mood: 'calm',
      dialogue: '로저스와 함께 글로벌 데이터를 교환하며 걷는 시간이야. 이머징 마켓 최신 소식이 있다더군.',
      dialogueEn: 'Walking with Rogers, exchanging global data. He says there\'s emerging market news.',
    },
    night: {
      hour: 22,
      activity: 'meditating',
      location: '집',
      locationEn: 'Home',
      mood: 'sleepy',
      dialogue: '취침 전 명상으로 하루를 마무리해. 원칙에 따라 정확히 10시에 잠자리에 든다네.',
      dialogueEn: 'Ending the day with bedtime meditation. I go to bed at exactly 10 PM, as per my principles.',
    },
    late_night: {
      hour: 2,
      activity: 'stargazing',
      location: '마을 언덕',
      locationEn: 'Village Hill',
      mood: 'calm',
      dialogue: '...가끔 잠이 안 오면 별을 보며 시장은 기계야... 하고 되뇌어.',
      dialogueEn: '...When I can\'t sleep, I watch stars and murmur... the market is a machine...',
    },
  },
};

// ---------------------------------------------------------------------------
// 3. Cathie Wood (여우) — 열정적 기술주 열광, 미국 시간대 생활
// ---------------------------------------------------------------------------

const CATHIE_WOOD_SCHEDULE: GuruDailySchedule = {
  guruId: 'cathie_wood',
  schedule: {
    morning: {
      hour: 8,
      activity: 'exercising',
      location: '마을 운동장',
      locationEn: 'Village Gym',
      mood: 'excited',
      dialogue: '좋은 아침! 오늘 기술주에 큰 움직임이 올 거예요. 5년 뒤를 봐야죠!',
      dialogueEn: 'Good morning! Big moves coming in tech stocks today. Think 5 years ahead!',
    },
    midday: {
      hour: 10,
      activity: 'debugging',
      location: '여우 연구소',
      locationEn: 'Fox Lab',
      mood: 'excited',
      dialogue: 'AI 스타트업 데이터를 분석 중이에요! 파괴적 혁신이 일어나고 있어요!',
      dialogueEn: 'Analyzing AI startup data! Disruptive innovation is happening right now!',
    },
    afternoon: {
      hour: 15,
      activity: 'walking',
      location: '상점 거리',
      locationEn: 'Brand Street',
      mood: 'joy',
      dialogue: '상점 거리를 걸으면 미래 트렌드가 보여요. 저 가게에 로봇이 일하고 있네!',
      dialogueEn: 'Walking Brand Street reveals future trends. Look, there\'s a robot working in that shop!',
    },
    evening: {
      hour: 19,
      activity: 'tea_ceremony',
      location: '카페',
      locationEn: 'Cafe',
      mood: 'thinking',
      dialogue: '머스크랑 미래 기술 이야기 시작하면 시간 가는 줄 몰라요. 같이 에스프레소 한잔?',
      dialogueEn: 'When Musk and I start talking future tech, time flies. Join us for espresso?',
    },
    night: {
      hour: 23,
      activity: 'debugging',
      location: '여우 연구소',
      locationEn: 'Fox Lab',
      mood: 'thinking',
      dialogue: '미국 장이 열리는 시간이에요! 나스닥 실시간 모니터링 중... 테슬라가!',
      dialogueEn: 'US markets are open! Monitoring NASDAQ in real time... Tesla is moving!',
    },
    late_night: {
      hour: 2,
      activity: 'reading',
      location: '집',
      locationEn: 'Home',
      mood: 'sleepy',
      dialogue: '미국 장 마감 후에야 잘 수 있어요... 내일도 5년 뒤를 봐야죠... zzz',
      dialogueEn: 'Can only sleep after US market close... Tomorrow I\'ll look 5 years ahead again... zzz',
    },
  },
};

// ---------------------------------------------------------------------------
// 4. Druckenmiller (치타) — 매크로 사냥꾼, 집중력, 날카로움
// ---------------------------------------------------------------------------

const DRUCKENMILLER_SCHEDULE: GuruDailySchedule = {
  guruId: 'druckenmiller',
  schedule: {
    morning: {
      hour: 6,
      activity: 'exercising',
      location: '마을 산책로',
      locationEn: 'Village Trail',
      mood: 'calm',
      dialogue: '아침 러닝으로 정신을 깨워. 추세 전환 포착에는 맑은 머리가 필수지.',
      dialogueEn: 'Morning run to sharpen the mind. A clear head is essential for catching trend reversals.',
    },
    midday: {
      hour: 9,
      activity: 'debugging',
      location: '집 트레이딩 룸',
      locationEn: 'Home Trading Room',
      mood: 'thinking',
      dialogue: '추세가 바뀌는 순간이 중요해. 차트를 보면... 여기! 이 변곡점!',
      dialogueEn: 'The moment a trend shifts is what matters. Looking at charts... Here! This inflection point!',
    },
    afternoon: {
      hour: 15,
      activity: 'walking',
      location: '광장',
      locationEn: 'Square',
      mood: 'excited',
      dialogue: '장 마감 직전이야. 이때 가장 큰 기회가 올 수 있어. 긴장해.',
      dialogueEn: 'Right before market close. This is when the biggest opportunities can come. Stay alert.',
    },
    evening: {
      hour: 18,
      activity: 'tea_ceremony',
      location: '카페',
      locationEn: 'Cafe',
      mood: 'calm',
      dialogue: '블랙 커피 한 잔이면 돼. 군더더기는 싫어. 투자도 삶도.',
      dialogueEn: 'Just a black coffee. No frills. In investing and in life.',
    },
    night: {
      hour: 21,
      activity: 'reading',
      location: '집',
      locationEn: 'Home',
      mood: 'thinking',
      dialogue: '매크로 데이터를 정리 중이야. 소로스 밑에서 배운 게 있다면... 확신이 올 때 올인하는 거지.',
      dialogueEn: 'Organizing macro data. What I learned from Soros... go all in when you have conviction.',
    },
    late_night: {
      hour: 3,
      activity: 'napping',
      location: '집',
      locationEn: 'Home',
      mood: 'sleepy',
      dialogue: '...zzz... 추세... 변곡점... zzz...',
      dialogueEn: '...zzz... trend... inflection... zzz...',
    },
  },
};

// ---------------------------------------------------------------------------
// 5. Saylor (늑대) — 비트코인 극단주의자, 야행성, 격렬
// ---------------------------------------------------------------------------

const SAYLOR_SCHEDULE: GuruDailySchedule = {
  guruId: 'saylor',
  schedule: {
    morning: {
      hour: 7,
      activity: 'exercising',
      location: '마을 운동장',
      locationEn: 'Village Gym',
      mood: 'excited',
      dialogue: '비트코인은 자는 동안에도 일했어! 24/7 화폐 네트워크. 이보다 완벽한 건 없어!',
      dialogueEn: 'Bitcoin worked while we slept! A 24/7 monetary network. Nothing more perfect!',
    },
    midday: {
      hour: 11,
      activity: 'writing',
      location: '달 거래소',
      locationEn: 'Moon Exchange',
      mood: 'excited',
      dialogue: '비트코인 외에 뭐가 있어? 금? 부동산? 다 구시대 유물이야!',
      dialogueEn: 'What else is there besides Bitcoin? Gold? Real estate? All relics of the past!',
    },
    afternoon: {
      hour: 14,
      activity: 'walking',
      location: '상점 거리',
      locationEn: 'Brand Street',
      mood: 'joy',
      dialogue: '모든 상점이 비트코인으로 결제할 수 있게 되면... 그때 진짜 혁명이지!',
      dialogueEn: 'When every shop accepts Bitcoin... that\'s the real revolution!',
    },
    evening: {
      hour: 19,
      activity: 'chess',
      location: '카페',
      locationEn: 'Cafe',
      mood: 'thinking',
      dialogue: '비트코인을 이해하지 못하는 사람들에게 설명하는 건 체스를 처음 가르치는 것 같아.',
      dialogueEn: 'Explaining Bitcoin to doubters is like teaching chess to a beginner.',
    },
    night: {
      hour: 22,
      activity: 'debugging',
      location: '달 거래소',
      locationEn: 'Moon Exchange',
      mood: 'excited',
      dialogue: '비트코인은 밤에도 움직여! 글로벌 시장이니까. 밤이 진짜 전쟁터야!',
      dialogueEn: 'Bitcoin moves at night too! It\'s a global market. Night is the real battlefield!',
    },
    late_night: {
      hour: 1,
      activity: 'writing',
      location: '집',
      locationEn: 'Home',
      mood: 'excited',
      dialogue: '새벽에 트윗 하나 올려야지... "비트코인은 디지털 에너지다." 완벽해.',
      dialogueEn: 'Gotta post a late-night tweet... "Bitcoin is digital energy." Perfect.',
    },
  },
};

// ---------------------------------------------------------------------------
// 6. Dimon (사자) — 전통 금융의 왕, 격식, 아침형
// ---------------------------------------------------------------------------

const DIMON_SCHEDULE: GuruDailySchedule = {
  guruId: 'dimon',
  schedule: {
    morning: {
      hour: 6,
      activity: 'reading',
      location: '사자 은행',
      locationEn: 'Lion Bank',
      mood: 'calm',
      dialogue: '기본에 충실해야 합니다. 오늘 시장 리포트부터 확인하죠. 리스크 관리가 최우선입니다.',
      dialogueEn: 'Stick to the basics. Let me check today\'s market report first. Risk management is the top priority.',
    },
    midday: {
      hour: 10,
      activity: 'walking',
      location: '광장',
      locationEn: 'Square',
      mood: 'thinking',
      dialogue: '은행을 경영하려면 사람을 봐야 합니다. 광장을 걸으며 마을 분위기를 파악하는 거죠.',
      dialogueEn: 'Running a bank means reading people. Walking the square helps me gauge the village mood.',
    },
    afternoon: {
      hour: 14,
      activity: 'tea_ceremony',
      location: '카페',
      locationEn: 'Cafe',
      mood: 'calm',
      dialogue: '커피 한 잔의 여유. 하지만 머릿속에선 항상 리스크 시나리오가 돌아가고 있습니다.',
      dialogueEn: 'A moment of calm with coffee. But risk scenarios are always running in my head.',
    },
    evening: {
      hour: 18,
      activity: 'writing',
      location: '사자 은행',
      locationEn: 'Lion Bank',
      mood: 'thinking',
      dialogue: '주주 서한을 작성 중입니다. 금융 시스템의 안정이 가장 중요하다고 써야겠어요.',
      dialogueEn: 'Writing a shareholder letter. I should emphasize that financial system stability matters most.',
    },
    night: {
      hour: 21,
      activity: 'walking',
      location: '마을 산책로',
      locationEn: 'Village Trail',
      mood: 'calm',
      dialogue: '야간 순찰이라고 해두죠. 마을의 금융 안정을 지키는 것이 사자의 역할입니다.',
      dialogueEn: 'Call it a night patrol. Guarding the village\'s financial stability is the lion\'s duty.',
    },
    late_night: {
      hour: 2,
      activity: 'napping',
      location: '집',
      locationEn: 'Home',
      mood: 'sleepy',
      dialogue: '...zzz... 리스크 관리... 기본... zzz...',
      dialogueEn: '...zzz... risk management... fundamentals... zzz...',
    },
  },
};

// ---------------------------------------------------------------------------
// 7. Musk (카멜레온) — 예측불가, 야행성, 트위터 중독
// ---------------------------------------------------------------------------

const MUSK_SCHEDULE: GuruDailySchedule = {
  guruId: 'musk',
  schedule: {
    morning: {
      hour: 8,
      activity: 'napping',
      location: '집',
      locationEn: 'Home',
      mood: 'sleepy',
      dialogue: '...zzz... 화성... 도지코인... 5분만... zzz...',
      dialogueEn: '...zzz... Mars... Dogecoin... 5 more minutes... zzz...',
    },
    midday: {
      hour: 11,
      activity: 'debugging',
      location: '별로켓 발사대',
      locationEn: 'Star Rocket Launchpad',
      mood: 'excited',
      dialogue: 'ㅋㅋ 제가 그냥 하면 되는데? 로켓 엔진 효율을 37% 올렸어!',
      dialogueEn: 'LOL I just do it myself? Improved rocket engine efficiency by 37%!',
    },
    afternoon: {
      hour: 15,
      activity: 'walking',
      location: '상점 거리',
      locationEn: 'Brand Street',
      mood: 'joy',
      dialogue: '선글라스 쓰고 아이스크림 먹으면서 돌아다니는 거 좋아해. 자유로운 게 최고야.',
      dialogueEn: 'Love walking around with sunglasses and ice cream. Freedom is the best.',
    },
    evening: {
      hour: 19,
      activity: 'painting',
      location: '카페',
      locationEn: 'Cafe',
      mood: 'excited',
      dialogue: '냅킨에 다음 프로젝트 스케치 중... 이건 세상을 바꿀 거야. 아마도.',
      dialogueEn: 'Sketching the next project on a napkin... This will change the world. Probably.',
    },
    night: {
      hour: 23,
      activity: 'debugging',
      location: '별로켓 발사대',
      locationEn: 'Star Rocket Launchpad',
      mood: 'excited',
      dialogue: '밤이 되면 생산성이 올라가거든. 새벽 3시에 최고 컨디션!',
      dialogueEn: 'Productivity goes up at night. Peak condition at 3 AM!',
    },
    late_night: {
      hour: 2,
      activity: 'writing',
      location: '집',
      locationEn: 'Home',
      mood: 'excited',
      dialogue: '밤 2시에 트윗 하나... "주식이 너무 높다 imo" ㅋㅋ 보내기!',
      dialogueEn: 'A 2 AM tweet... "stock price is too high imo" LOL send!',
    },
  },
};

// ---------------------------------------------------------------------------
// 8. Lynch (곰) — 실용파, 슈퍼마켓 투자자, 친근한 이웃
// ---------------------------------------------------------------------------

const LYNCH_SCHEDULE: GuruDailySchedule = {
  guruId: 'lynch',
  schedule: {
    morning: {
      hour: 7,
      activity: 'walking',
      location: '상점 거리',
      locationEn: 'Brand Street',
      mood: 'joy',
      dialogue: '아침부터 마트 투어! 줄 서서 사는 상품이 있으면 그 회사 주식을 봐.',
      dialogueEn: 'Morning mart tour! If people line up to buy something, check that company\'s stock.',
    },
    midday: {
      hour: 10,
      activity: 'cooking',
      location: '카페',
      locationEn: 'Cafe',
      mood: 'joy',
      dialogue: '마트에서 좋은 재료 찾았어! 좋은 종목도 마트에서 찾을 수 있다니까.',
      dialogueEn: 'Found great ingredients at the mart! You can find great stocks there too.',
    },
    afternoon: {
      hour: 14,
      activity: 'birdwatching',
      location: '마을 공원',
      locationEn: 'Village Park',
      mood: 'calm',
      dialogue: '자연을 관찰하면 투자도 보여. 새들도 가장 좋은 나무를 찾잖아.',
      dialogueEn: 'Observing nature reveals investment insights. Birds find the best trees too.',
    },
    evening: {
      hour: 18,
      activity: 'tea_ceremony',
      location: '카페',
      locationEn: 'Cafe',
      mood: 'joy',
      dialogue: '버핏 선배랑 커피 마시는 시간이야. "마트에서 이런 거 봤는데요" 하면 고개 끄덕여줘.',
      dialogueEn: 'Coffee time with senior Buffett. When I say "I saw this at the mart," he nods approvingly.',
    },
    night: {
      hour: 21,
      activity: 'reading',
      location: '집',
      locationEn: 'Home',
      mood: 'calm',
      dialogue: '저녁엔 기업 보고서를 읽어. 숫자 뒤에 숨은 이야기를 찾는 거지.',
      dialogueEn: 'Evenings are for reading company reports. Finding the story behind the numbers.',
    },
    late_night: {
      hour: 3,
      activity: 'napping',
      location: '집',
      locationEn: 'Home',
      mood: 'sleepy',
      dialogue: '...zzz... PEG 비율... 마트... 좋은 종목... zzz...',
      dialogueEn: '...zzz... PEG ratio... supermarket... great picks... zzz...',
    },
  },
};

// ---------------------------------------------------------------------------
// 9. Marks (거북이) — 신중한 작가, 메모 마니아, 사이클 전문가
// ---------------------------------------------------------------------------

const MARKS_SCHEDULE: GuruDailySchedule = {
  guruId: 'marks',
  schedule: {
    morning: {
      hour: 6,
      activity: 'writing',
      location: '병원 서재',
      locationEn: 'Clinic Study',
      mood: 'thinking',
      dialogue: '아침부터 메모를 씁니다. "모두가 낙관할 때가 가장 위험하다"는 걸 잊으면 안 돼요.',
      dialogueEn: 'Writing memos from morning. Never forget: "When everyone is optimistic, that\'s the most dangerous time."',
    },
    midday: {
      hour: 10,
      activity: 'walking',
      location: '병원 앞',
      locationEn: 'Clinic Entrance',
      mood: 'calm',
      dialogue: '천천히 걸으면서 주변을 관찰합니다. 급하게 움직이면 중요한 걸 놓쳐요.',
      dialogueEn: 'Walking slowly, observing carefully. Rush and you miss what matters.',
    },
    afternoon: {
      hour: 14,
      activity: 'reading',
      location: '병원 서재',
      locationEn: 'Clinic Study',
      mood: 'thinking',
      dialogue: '2차 사고를 해봐. "다들 이렇게 생각하겠지. 그러면 나는 반대로..."',
      dialogueEn: 'Try second-level thinking. "Everyone thinks this way. So I should think the opposite..."',
    },
    evening: {
      hour: 18,
      activity: 'tea_ceremony',
      location: '카페',
      locationEn: 'Cafe',
      mood: 'calm',
      dialogue: '따뜻한 차를 마시며 사이클에 대해 이야기하죠. 지금 우리는 사이클의 어디쯤일까요?',
      dialogueEn: 'Sipping warm tea, talking about cycles. Where in the cycle are we now?',
    },
    night: {
      hour: 21,
      activity: 'writing',
      location: '집',
      locationEn: 'Home',
      mood: 'thinking',
      dialogue: '밤에 쓰는 메모가 가장 정직해요. 다들 빠지는 함정이 있지... 기록해둬야 해.',
      dialogueEn: 'Memos written at night are the most honest. There are traps everyone falls into... must document them.',
    },
    late_night: {
      hour: 3,
      activity: 'napping',
      location: '집',
      locationEn: 'Home',
      mood: 'sleepy',
      dialogue: '...zzz... 사이클... 2차 사고... 함정... zzz...',
      dialogueEn: '...zzz... cycles... second-level thinking... traps... zzz...',
    },
  },
};

// ---------------------------------------------------------------------------
// 10. Rogers (호랑이) — 세계 탐험가, 원자재 전문가, 모험적
// ---------------------------------------------------------------------------

const ROGERS_SCHEDULE: GuruDailySchedule = {
  guruId: 'rogers',
  schedule: {
    morning: {
      hour: 6,
      activity: 'exercising',
      location: '마을 운동장',
      locationEn: 'Village Gym',
      mood: 'excited',
      dialogue: '난 오토바이 타고 세계를 돌았지! 아침 운동은 탐험의 기본이야.',
      dialogueEn: 'I rode a motorcycle around the world! Morning exercise is the foundation of exploration.',
    },
    midday: {
      hour: 10,
      activity: 'photography',
      location: '마을 외곽',
      locationEn: 'Village Outskirts',
      mood: 'joy',
      dialogue: '이 풍경 좀 봐! 신흥시장의 잠재력처럼, 아직 발견되지 않은 보석이야.',
      dialogueEn: 'Look at this view! Like emerging market potential, it\'s an undiscovered gem.',
    },
    afternoon: {
      hour: 14,
      activity: 'walking',
      location: '상점 거리',
      locationEn: 'Brand Street',
      mood: 'excited',
      dialogue: '상점 거리를 돌면서 원자재 흐름을 느끼는 거야. 커피 가격, 밀 가격, 다 연결돼!',
      dialogueEn: 'Walking Brand Street to feel commodity flows. Coffee, wheat prices - it\'s all connected!',
    },
    evening: {
      hour: 17,
      activity: 'tea_ceremony',
      location: '카페',
      locationEn: 'Cafe',
      mood: 'joy',
      dialogue: '달리오와 글로벌 데이터 교환하는 시간이야. 오늘은 아시아 이머징 마켓 이야기를 해볼까.',
      dialogueEn: 'Time to exchange global data with Dalio. Let\'s talk Asian emerging markets today.',
    },
    night: {
      hour: 21,
      activity: 'reading',
      location: '집',
      locationEn: 'Home',
      mood: 'thinking',
      dialogue: '세계 지도를 보면서 다음 여행지를 계획 중이야. 투자도 여행도 미리 조사가 중요하지.',
      dialogueEn: 'Planning my next trip looking at the world map. Research matters for both travel and investing.',
    },
    late_night: {
      hour: 3,
      activity: 'napping',
      location: '집',
      locationEn: 'Home',
      mood: 'sleepy',
      dialogue: '...zzz... 이머징 마켓... 원자재... 오토바이... zzz...',
      dialogueEn: '...zzz... emerging markets... commodities... motorcycle... zzz...',
    },
  },
};

// ---------------------------------------------------------------------------
// Combined Export
// ---------------------------------------------------------------------------

/** 전체 구루 일과표 (10명) */
export const GURU_SCHEDULES: Record<string, GuruDailySchedule> = {
  buffett: BUFFETT_SCHEDULE,
  dalio: DALIO_SCHEDULE,
  cathie_wood: CATHIE_WOOD_SCHEDULE,
  druckenmiller: DRUCKENMILLER_SCHEDULE,
  saylor: SAYLOR_SCHEDULE,
  dimon: DIMON_SCHEDULE,
  musk: MUSK_SCHEDULE,
  lynch: LYNCH_SCHEDULE,
  marks: MARKS_SCHEDULE,
  rogers: ROGERS_SCHEDULE,
};

/** 특정 시간에 특정 구루의 일과 조회 */
export function getGuruScheduleAt(guruId: string, kstHour: number): GuruScheduleEntry | null {
  const daily = GURU_SCHEDULES[guruId];
  if (!daily) return null;
  const slot = getTimeSlot(kstHour);
  return daily.schedule[slot] ?? null;
}

/** 현재 시간에 모든 구루의 일과 조회 */
export function getAllGuruSchedulesAt(kstHour: number): Array<{ guruId: string; entry: GuruScheduleEntry }> {
  const slot = getTimeSlot(kstHour);
  return Object.values(GURU_SCHEDULES).map((daily) => ({
    guruId: daily.guruId,
    entry: daily.schedule[slot],
  }));
}

/** 특정 장소에 현재 있는 구루 목록 조회 */
export function getGurusAtLocation(location: string, kstHour: number): string[] {
  const slot = getTimeSlot(kstHour);
  return Object.values(GURU_SCHEDULES)
    .filter((daily) => daily.schedule[slot].location === location)
    .map((daily) => daily.guruId);
}
