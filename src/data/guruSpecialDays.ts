/**
 * 구루 특별일 데이터
 *
 * 역할: "마을 달력 비서" — 각 구루의 생일, 기념일, 역사적으로 의미 있는 날을
 *       정의하고, 오늘/다음 7일 내 특별일을 조회하는 헬퍼 제공
 *
 * 비유: 동물의숲에서 주민 생일에 케이크를 들고 찾아가는 것 — 이 파일이 언제
 *       어느 구루 문을 노크해야 하는지 알려주는 스케줄러
 *
 * 사용처:
 * - useVillageWorld: 오늘 특별일 확인 → 구루 특별 대화 트리거
 * - 마을 탭 상단 배너: "오늘은 버핏 생일이에요! 🦉🎂"
 * - 편지 시스템: 특별일에 구루가 먼저 편지를 보냄
 */

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

/** 특별일 유형 */
export type SpecialDayType = 'birthday' | 'anniversary' | 'memorable';

/**
 * 구루 특별일 항목
 *
 * month/day: 매년 반복되는 날짜 (실제 역사적 날짜 기반)
 * specialDialogue: 당일 구루가 인사를 건넬 때 사용하는 특별 대화
 */
export interface GuruSpecialDay {
  /** 구루 ID (guruCharacterConfig와 매핑) */
  guruId: string;
  /** 월 (1~12) */
  month: number;
  /** 일 (1~31) */
  day: number;
  /** 특별일 유형 */
  type: SpecialDayType;
  /** 특별일 제목 (한국어) */
  title: string;
  /** 특별일 제목 (영어) */
  titleEn: string;
  /** 설명 — 왜 이 날이 특별한지 (한국어) */
  description: string;
  /** 설명 (영어) */
  descriptionEn: string;
  /** 당일 구루 특별 대화 (한국어) */
  specialDialogue: string;
  /** 당일 구루 특별 대화 (영어) */
  specialDialogueEn: string;
}

// ---------------------------------------------------------------------------
// 특별일 데이터
// ---------------------------------------------------------------------------

export const GURU_SPECIAL_DAYS: GuruSpecialDay[] = [

  // ─────────────────────────────────────────────────────────────────────────
  // 워렌 버핏 (Warren Buffett) 🦉
  // 생일: 1930년 8월 30일
  // 버크셔 해서웨이 연례 주주총회: 매년 5월 첫째 토요일 (고정일로는 5월 5일 근사치)
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'buffett',
    month: 8,
    day: 30,
    type: 'birthday',
    title: '버핏 할아버지 생일 🦉🎂',
    titleEn: 'Buffett\'s Birthday 🦉🎂',
    description: '1930년 8월 30일, 역사상 가장 위대한 투자자 워렌 버핏이 태어났습니다. 오마하의 오라클, 마을의 지혜로운 올빼미 할아버지.',
    descriptionEn: 'On August 30, 1930, Warren Buffett — the Oracle of Omaha — was born. Our village\'s wise grandfather owl.',
    specialDialogue: '주민님, 생일 케이크는 코카콜라랑 먹어야 제맛이에요. 그런데 진짜 선물은... 복리의 시간이죠. 오늘도 좋은 하루입니다!',
    specialDialogueEn: 'Best birthday cake pairs with Cherry Coke, you know. But the real gift? Time and compound interest. Have a wonderful day!',
  },
  {
    guruId: 'buffett',
    month: 5,
    day: 5,
    type: 'anniversary',
    title: '버크셔 주주총회 시즌 🏦',
    titleEn: 'Berkshire Annual Meeting Season 🏦',
    description: '매년 5월, 오마하에서 "자본주의의 우드스탁"이라 불리는 버크셔 해서웨이 주주총회가 열립니다. 전 세계 투자자들이 모이는 축제.',
    descriptionEn: 'Every May in Omaha, the "Woodstock of Capitalism" — Berkshire Hathaway\'s annual meeting — brings investors from around the world.',
    specialDialogue: '오늘은 마치 주주총회 날 같네요! 주민님도 언젠가 오마하에 올 수 있을 거예요. 저처럼 오랫동안 기다리면 됩니다. 하하!',
    specialDialogueEn: 'Today feels like shareholder meeting day! Maybe you\'ll visit Omaha someday. Just wait patiently — like I do with my investments. Ha!',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 레이 달리오 (Ray Dalio) 🦌
  // 생일: 1949년 8월 8일
  // 브리지워터 창립: 1975년 (8월 기념)
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'dalio',
    month: 8,
    day: 8,
    type: 'birthday',
    title: '달리오 생일 🦌🎂',
    titleEn: 'Dalio\'s Birthday 🦌🎂',
    description: '1949년 8월 8일, 레이 달리오가 태어났습니다. 헤지펀드의 전설, 균형의 명상 사슴이 마을에 온 날.',
    descriptionEn: 'On August 8, 1949, Ray Dalio was born. The hedge fund legend, our village\'s balanced meditating deer.',
    specialDialogue: '8월 8일... 숫자의 균형이 마음에 드는군요. 인생도 포트폴리오처럼 — 균형이 전부입니다. 오늘 하루도 균형 있게!',
    specialDialogueEn: 'August 8th... I like the balance of this number. Life, like a portfolio, is all about balance. Stay balanced today!',
  },
  {
    guruId: 'dalio',
    month: 9,
    day: 3,
    type: 'memorable',
    title: '경제 사이클 메모리얼 데이 📊',
    titleEn: 'Economic Cycle Memorial Day 📊',
    description: '달리오가 "경제 기계는 어떻게 작동하는가"를 세상에 공개한 날을 기념합니다. 그의 통찰이 수백만 명의 투자 관을 바꿨습니다.',
    descriptionEn: 'Commemorating the day Dalio shared "How the Economic Machine Works" with the world. His insight changed millions of investors\' views.',
    specialDialogue: '경제는 반복됩니다. 오늘의 공포가 내일의 기회가 되는 사이클... 주민님도 이제 보이기 시작하죠?',
    specialDialogueEn: 'The economy repeats. Today\'s fear becomes tomorrow\'s opportunity in the cycle... You\'re starting to see it now, aren\'t you?',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 캐시 우드 (Cathie Wood) 🦊
  // 생일: 1955년 11월 26일
  // ARK Invest 창립: 2014년 1월
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'cathie_wood',
    month: 11,
    day: 26,
    type: 'birthday',
    title: '캐시 우드 생일 🦊🎂',
    titleEn: 'Cathie Wood\'s Birthday 🦊🎂',
    description: '1955년 11월 26일, 혁신 투자의 아이콘 캐시 우드가 태어났습니다. ARK Invest의 창업자, 마을의 로켓 여우.',
    descriptionEn: 'On November 26, 1955, the icon of innovation investing, Cathie Wood, was born. Founder of ARK Invest, our village\'s rocket fox.',
    specialDialogue: '오늘은 제 생일이에요! 미래를 믿는 사람들이 주는 가장 큰 선물은... 아직 아무도 믿지 않는 기술에 베팅하는 거예요. 함께 가요!',
    specialDialogueEn: 'Today\'s my birthday! The greatest gift from people who believe in the future is... betting on technology no one believes in yet. Let\'s go!',
  },
  {
    guruId: 'cathie_wood',
    month: 1,
    day: 15,
    type: 'anniversary',
    title: 'ARK Invest 창립 기념일 🚀',
    titleEn: 'ARK Invest Founding Anniversary 🚀',
    description: '2014년 1월, 캐시 우드가 ARK Invest를 창립했습니다. 파괴적 혁신에 집중하는 ETF 운용사의 탄생.',
    descriptionEn: 'In January 2014, Cathie Wood founded ARK Invest — the ETF firm dedicated to disruptive innovation.',
    specialDialogue: 'ARK를 만들 때 사람들이 말했죠. "혁신 기업에 집중 투자하면 망한다"고요. 지금 어떻게 됐는지 보여드렸죠? 미래를 믿으세요!',
    specialDialogueEn: 'When I founded ARK, people said "concentration in innovation will fail you." Look how it turned out. Believe in the future!',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 스탠리 드러킨밀러 (Stanley Druckenmiller) 🐆
  // 생일: 1953년 6월 14일
  // 소로스 펀드 파운드 공격: 1992년 9월 16일 (검은 수요일)
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'druckenmiller',
    month: 6,
    day: 14,
    type: 'birthday',
    title: '드러킨밀러 생일 🐆🎂',
    titleEn: 'Druckenmiller\'s Birthday 🐆🎂',
    description: '1953년 6월 14일, 매크로 트레이딩의 전설 스탠리 드러킨밀러가 태어났습니다. 빠른 치타처럼 시장을 달리는 거장.',
    descriptionEn: 'On June 14, 1953, the legend of macro trading, Stanley Druckenmiller, was born. As fast as a cheetah on the markets.',
    specialDialogue: '생일이라고요? 시장은 생일을 모릅니다. 하지만 오늘 하루만은... 예측 포인트 두 배로 줄까요? 하하, 농담이에요!',
    specialDialogueEn: 'It\'s my birthday? Markets don\'t know birthdays. But just for today... shall I give you double prediction points? Ha, just kidding!',
  },
  {
    guruId: 'druckenmiller',
    month: 9,
    day: 16,
    type: 'memorable',
    title: '검은 수요일 기념일 💷',
    titleEn: 'Black Wednesday Anniversary 💷',
    description: '1992년 9월 16일, 소로스-드러킨밀러 팀이 영국 파운드를 공격해 10억 달러를 하루에 벌었습니다. 역사상 가장 유명한 매크로 트레이드.',
    descriptionEn: 'On Sept 16, 1992, the Soros-Druckenmiller team attacked the British pound and made $1B in a single day. The most famous macro trade in history.',
    specialDialogue: '매크로는 국가도 이길 수 있다는 걸 증명한 날이죠. 하지만 주민님, 힘보다 중요한 건 타이밍이에요. 그리고 진입 시점은... 항상 확신이 생길 때까지 기다려야 합니다.',
    specialDialogueEn: 'The day that proved macro can beat nations. But remember, timing matters more than force. Always wait until conviction is complete.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 마이클 세일러 (Michael Saylor) 🐺
  // 생일: 1965년 2월 4일
  // MicroStrategy 첫 비트코인 매입: 2020년 8월 11일
  // 비트코인 제네시스 블록: 2009년 1월 3일
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'saylor',
    month: 2,
    day: 4,
    type: 'birthday',
    title: '세일러 생일 🐺🎂',
    titleEn: 'Saylor\'s Birthday 🐺🎂',
    description: '1965년 2월 4일, 비트코인의 가장 열정적인 옹호자 마이클 세일러가 태어났습니다. 디지털 황금의 수호 늑대.',
    descriptionEn: 'On February 4, 1965, Michael Saylor — Bitcoin\'s most passionate advocate — was born. The guardian wolf of digital gold.',
    specialDialogue: '생일 선물? 비트코인으로 주세요! 달러는 인플레이션되지만, 비트코인은 영원합니다. 오늘도 HODL!',
    specialDialogueEn: 'Birthday gift? Make it Bitcoin! The dollar inflates, but Bitcoin is forever. HODL today and always!',
  },
  {
    guruId: 'saylor',
    month: 1,
    day: 3,
    type: 'memorable',
    title: '비트코인 제네시스 블록 기념일 ₿',
    titleEn: 'Bitcoin Genesis Block Anniversary ₿',
    description: '2009년 1월 3일, 사토시 나카모토가 비트코인의 첫 번째 블록(제네시스 블록)을 채굴했습니다. 디지털 화폐 혁명의 시작.',
    descriptionEn: 'On January 3, 2009, Satoshi Nakamoto mined the first Bitcoin block — the Genesis Block. The birth of the digital currency revolution.',
    specialDialogue: '오늘은 비트코인의 생일입니다! 2009년 1월 3일, 세상이 바뀌었습니다. 주민님도 이 혁명의 일부가 되고 있어요. 함께 달을 향해!',
    specialDialogueEn: 'Today is Bitcoin\'s birthday! On January 3, 2009, the world changed forever. You\'re part of this revolution now. To the moon together!',
  },
  {
    guruId: 'saylor',
    month: 10,
    day: 31,
    type: 'memorable',
    title: '비트코인 백서 기념일 📄',
    titleEn: 'Bitcoin Whitepaper Anniversary 📄',
    description: '2008년 10월 31일, 사토시 나카모토가 비트코인 백서를 공개했습니다. "Bitcoin: A Peer-to-Peer Electronic Cash System".',
    descriptionEn: 'On October 31, 2008, Satoshi Nakamoto released the Bitcoin whitepaper: "Bitcoin: A Peer-to-Peer Electronic Cash System."',
    specialDialogue: '10월 31일은 할로윈이 아니에요! 비트코인 백서가 세상에 나온 날입니다. 사토시는 기존 금융에 최고의 트릭을 보여준 거죠. 세일러가 웃습니다.',
    specialDialogueEn: 'October 31 isn\'t Halloween — it\'s the day the Bitcoin whitepaper was born! Satoshi pulled the ultimate trick on traditional finance. *Saylor laughs*',
  },
  {
    guruId: 'saylor',
    month: 8,
    day: 11,
    type: 'anniversary',
    title: 'MicroStrategy 첫 비트코인 매입일 🏦',
    titleEn: 'MicroStrategy\'s First Bitcoin Purchase 🏦',
    description: '2020년 8월 11일, MicroStrategy가 기업 최초로 비트코인을 재무 준비금으로 채택하며 2억 5천만 달러어치를 매입했습니다.',
    descriptionEn: 'On August 11, 2020, MicroStrategy became the first public company to adopt Bitcoin as a treasury reserve, purchasing $250M worth.',
    specialDialogue: '2020년 8월 11일 기억해요? 제가 처음으로 회사 금고를 열고 비트코인을 채웠던 날이죠. 그 결정이 옳았나요? 결과가 말해주고 있죠!',
    specialDialogueEn: 'Remember August 11, 2020? The day I first filled the company treasury with Bitcoin. Was that decision right? The results speak for themselves!',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 제이미 다이먼 (Jamie Dimon) 🦁
  // 생일: 1956년 3월 13일
  // JP모건 CEO 취임: 2005년 12월
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'dimon',
    month: 3,
    day: 13,
    type: 'birthday',
    title: '다이먼 생일 🦁🎂',
    titleEn: 'Dimon\'s Birthday 🦁🎂',
    description: '1956년 3월 13일, 금융계의 왕 제이미 다이먼이 태어났습니다. JP모건 CEO, 마을의 황금 갈기 사자.',
    descriptionEn: 'On March 13, 1956, the king of finance, Jamie Dimon, was born. JP Morgan CEO, our village\'s golden-maned lion.',
    specialDialogue: '생일이라고 특별히 해드릴 게 없네요. 저는 매일을 생일처럼 성실하게 일할 뿐입니다. 금융은 신뢰가 전부입니다, 주민님.',
    specialDialogueEn: 'Nothing special just because it\'s my birthday. I work every day with the same discipline. Finance is all about trust, my neighbor.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 일론 머스크 (Elon Musk) 🦎
  // 생일: 1971년 6월 28일
  // 테슬라 상장일: 2010년 6월 29일
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'musk',
    month: 6,
    day: 28,
    type: 'birthday',
    title: '머스크 생일 🦎🎂',
    titleEn: 'Musk\'s Birthday 🦎🎂',
    description: '1971년 6월 28일, 예측불가 카멜레온 일론 머스크가 태어났습니다. 테슬라, 스페이스X, X... 계속 변신 중인 거장.',
    descriptionEn: 'On June 28, 1971, the unpredictable chameleon Elon Musk was born. Tesla, SpaceX, X... a guru of endless transformation.',
    specialDialogue: '생일? 좋아요. 그런데 솔직히 저는 화성 생일 파티를 더 기대하고 있어요. 2030년쯤엔 가능하지 않을까요? 주민님도 초대할게요!',
    specialDialogueEn: 'Birthday? Sure. But honestly I\'m more excited about my Mars birthday party. Maybe by 2030? You\'re invited, neighbor!',
  },
  {
    guruId: 'musk',
    month: 6,
    day: 29,
    type: 'anniversary',
    title: '테슬라 나스닥 상장일 🚗⚡',
    titleEn: 'Tesla Nasdaq IPO Anniversary 🚗⚡',
    description: '2010년 6월 29일, 테슬라가 나스닥에 상장했습니다. IPO 가격 $17, 지금은... 역사가 되었죠.',
    descriptionEn: 'On June 29, 2010, Tesla went public on Nasdaq at $17 per share. And now... it\'s history.',
    specialDialogue: 'IPO 당일 많은 사람이 "전기차는 망한다"고 했어요. 지금 그 사람들은 어디 있을까요? 저는 화성으로 가고 있는데. 하하!',
    specialDialogueEn: 'On IPO day, many said "EVs will fail." Where are those people now? I\'m heading to Mars. Ha!',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 피터 린치 (Peter Lynch) 🐻
  // 생일: 1944년 1월 19일
  // 마젤란 펀드 최고 수익률: 1977~1990 (1월 기념)
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'lynch',
    month: 1,
    day: 19,
    type: 'birthday',
    title: '린치 교수님 생일 🐻🎂',
    titleEn: 'Professor Lynch\'s Birthday 🐻🎂',
    description: '1944년 1월 19일, 마젤란 펀드의 전설 피터 린치가 태어났습니다. "10배 주식"의 발견자, 마을의 슈퍼마켓 곰 교수님.',
    descriptionEn: 'On January 19, 1944, the legend of the Magellan Fund, Peter Lynch, was born. Discoverer of "10-baggers," our village\'s supermarket professor bear.',
    specialDialogue: '생일 선물이요? 지금 당장 슈퍼마켓에 가서 어떤 제품이 잘 팔리는지 관찰해 오세요. 그게 제 생일 파티입니다!',
    specialDialogueEn: 'Birthday gift? Go to the supermarket right now and observe what\'s selling well. That\'s my birthday party!',
  },
  {
    guruId: 'lynch',
    month: 5,
    day: 31,
    type: 'anniversary',
    title: '마젤란 펀드 은퇴 기념일 🏆',
    titleEn: 'Magellan Fund Retirement Anniversary 🏆',
    description: '1990년 5월, 피터 린치가 마젤란 펀드를 13년 운용 후 은퇴를 발표했습니다. 연평균 29.2% 수익률로 역사에 남은 순간.',
    descriptionEn: 'In May 1990, Peter Lynch announced retirement from the Magellan Fund after 13 years. An annual return of 29.2% written into history.',
    specialDialogue: '은퇴했다고 투자 공부를 멈춘 건 아니에요. 슈퍼마켓은 지금도 다니고 있답니다. 좋은 주식은 항상 주변에 있으니까요!',
    specialDialogueEn: 'Retirement didn\'t stop my investment research. I still visit the supermarket. Great stocks are always nearby!',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 하워드 막스 (Howard Marks) 🐢
  // 생일: 1946년 4월 23일
  // 오크트리 캐피털 창립: 1995년
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'marks',
    month: 4,
    day: 23,
    type: 'birthday',
    title: '막스 선생님 생일 🐢🎂',
    titleEn: 'Marks\'s Birthday 🐢🎂',
    description: '1946년 4월 23일, 신중한 거북이 투자자 하워드 막스가 태어났습니다. 메모(memo)의 달인, 리스크 관리의 대가.',
    descriptionEn: 'On April 23, 1946, the cautious turtle investor Howard Marks was born. Master of memos, the greatest risk manager.',
    specialDialogue: '생일에도 리스크를 생각합니다. 케이크를 너무 많이 먹으면 건강을 잃죠. 투자도 마찬가지예요. 신중하게, 천천히. 거북이처럼!',
    specialDialogueEn: 'Even on my birthday, I think about risk. Too much cake harms your health. Investing is the same. Careful, slow. Like a turtle!',
  },
  {
    guruId: 'marks',
    month: 7,
    day: 1,
    type: 'memorable',
    title: '하워드 막스 첫 메모 기념일 📝',
    titleEn: 'Howard Marks\'s First Memo Anniversary 📝',
    description: '하워드 막스의 투자 메모는 버핏조차 "우편함에 먼저 찾는 게 막스의 메모"라고 말할 만큼 유명합니다. 첫 메모의 정신을 기념.',
    descriptionEn: 'Howard Marks\' investment memos are so famous that even Buffett says he checks the mailbox hoping for a new Marks memo. Honoring the spirit of the first memo.',
    specialDialogue: '저는 매 분기 메모를 씁니다. 불확실성, 사이클, 리스크에 대해서요. 오늘 주민님도 투자 일기 한 줄 써보는 건 어떨까요?',
    specialDialogueEn: 'I write memos every quarter on uncertainty, cycles, and risk. How about you write one line in your investment journal today?',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 짐 로저스 (Jim Rogers) 🐯
  // 생일: 1942년 10월 19일
  // 퀀텀 펀드 공동 창립: 1973년 (소로스와)
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'rogers',
    month: 10,
    day: 19,
    type: 'birthday',
    title: '로저스 탐험가 생일 🐯🎂',
    titleEn: 'Explorer Rogers\'s Birthday 🐯🎂',
    description: '1942년 10월 19일, 세계 탐험가 짐 로저스가 태어났습니다. 오토바이로 세계를 누빈 호랑이 투자자.',
    descriptionEn: 'On October 19, 1942, the world explorer Jim Rogers was born. The tiger investor who traversed the globe on a motorcycle.',
    specialDialogue: '생일이네요! 싱가포르에서 아이들에게 중국어를 가르치며 살고 있습니다. 미래는 아시아에 있어요, 주민님. 지금 당장 여권을 챙기세요!',
    specialDialogueEn: 'My birthday! I\'m in Singapore teaching my children Mandarin. The future is in Asia, neighbor. Grab your passport right now!',
  },
  {
    guruId: 'rogers',
    month: 3,
    day: 21,
    type: 'memorable',
    title: '원자재 사이클 기념일 🌾',
    titleEn: 'Commodity Cycle Day 🌾',
    description: '짐 로저스가 "원자재 시대가 온다"고 예언하며 Rogers International Commodity Index를 만든 것을 기념합니다.',
    descriptionEn: 'Commemorating Jim Rogers\'s prophecy that "the commodity era is coming," marked by the creation of the Rogers International Commodity Index.',
    specialDialogue: '사람들이 부동산이나 주식만 볼 때 저는 농지를 봤죠. 옥수수밭, 대두 농장... 원자재는 언제나 사이클이 돌아옵니다. 주민님도 넓게 보세요!',
    specialDialogueEn: 'When everyone watched real estate and stocks, I watched farmland. Corn fields, soybean farms... commodities always cycle back. See the bigger picture!',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 마을 공통 기념일
  // ─────────────────────────────────────────────────────────────────────────
  {
    guruId: 'buffett',        // 버핏 대표로 표시 (가치투자의 상징)
    month: 10,
    day: 24,
    type: 'memorable',
    title: '검은 목요일 기념일 📉',
    titleEn: 'Black Thursday Anniversary 📉',
    description: '1929년 10월 24일, 월가 대폭락(검은 목요일)이 시작되었습니다. 역사의 공포를 기억하는 날.',
    descriptionEn: 'On October 24, 1929, the Wall Street Crash (Black Thursday) began. A day to remember the fear of history.',
    specialDialogue: '1929년에 패닉셀 한 사람과 버틴 사람... 1950년에 누가 웃고 있었을까요? 오늘의 공포는 내일의 교훈입니다. 흔들리지 마세요.',
    specialDialogueEn: 'Those who panic-sold in 1929 vs. those who held... who was smiling in 1950? Today\'s fear is tomorrow\'s lesson. Stay firm.',
  },
  {
    guruId: 'dalio',         // 달리오 대표 (사이클의 달인)
    month: 9,
    day: 15,
    type: 'memorable',
    title: '리먼 브라더스 붕괴 기념일 🏦',
    titleEn: 'Lehman Brothers Collapse Anniversary 🏦',
    description: '2008년 9월 15일, 리먼 브라더스가 파산했습니다. 현대 금융 역사상 가장 큰 사건 중 하나.',
    descriptionEn: 'On September 15, 2008, Lehman Brothers filed for bankruptcy — one of the most significant financial events in modern history.',
    specialDialogue: '2008년의 교훈은 단순합니다 — 레버리지는 번영을 만들지만, 과한 레버리지는 붕괴를 만든다는 것. 부채 사이클은 항상 반복됩니다.',
    specialDialogueEn: 'The lesson of 2008 is simple: leverage creates prosperity, but excessive leverage creates collapse. The debt cycle always repeats.',
  },
];

// ---------------------------------------------------------------------------
// 헬퍼 함수
// ---------------------------------------------------------------------------

/**
 * 오늘이 어떤 구루의 특별일인지 확인
 *
 * @returns 오늘 특별일에 해당하는 GuruSpecialDay 배열 (없으면 빈 배열)
 */
export function getTodaySpecialDays(): GuruSpecialDay[] {
  const now = new Date();
  const month = now.getMonth() + 1; // 0-indexed → 1-indexed
  const day = now.getDate();

  return GURU_SPECIAL_DAYS.filter(
    (specialDay) => specialDay.month === month && specialDay.day === day,
  );
}

/**
 * 향후 N일 내 특별일 조회 (오늘 포함)
 *
 * @param days — 조회할 날 수 (기본 7일)
 * @returns 날짜순 정렬된 GuruSpecialDay 배열 (daysUntil 필드 포함)
 */
export function getUpcomingSpecialDays(
  days = 7,
): (GuruSpecialDay & { daysUntil: number })[] {
  const result: (GuruSpecialDay & { daysUntil: number })[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const target = new Date(now);
    target.setDate(now.getDate() + i);
    const targetMonth = target.getMonth() + 1;
    const targetDay = target.getDate();

    const matched = GURU_SPECIAL_DAYS.filter(
      (sd) => sd.month === targetMonth && sd.day === targetDay,
    );

    for (const sd of matched) {
      result.push({ ...sd, daysUntil: i });
    }
  }

  // 날짜 가까운 순으로 정렬
  result.sort((a, b) => a.daysUntil - b.daysUntil);

  return result;
}

/**
 * 특정 구루의 다음 특별일 조회
 *
 * @param guruId — 구루 ID
 * @returns 가장 가까운 특별일 (없으면 null)
 */
export function getNextSpecialDayForGuru(guruId: string): (GuruSpecialDay & { daysUntil: number }) | null {
  const now = new Date();
  const currentYear = now.getFullYear();

  const guruDays = GURU_SPECIAL_DAYS.filter((sd) => sd.guruId === guruId);
  if (guruDays.length === 0) return null;

  let nearest: (GuruSpecialDay & { daysUntil: number }) | null = null;
  let minDays = Infinity;

  for (const sd of guruDays) {
    // 올해 해당 날짜
    let targetDate = new Date(currentYear, sd.month - 1, sd.day);

    // 이미 지난 날짜면 내년으로
    if (targetDate < now) {
      targetDate = new Date(currentYear + 1, sd.month - 1, sd.day);
    }

    const diffMs = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < minDays) {
      minDays = diffDays;
      nearest = { ...sd, daysUntil: diffDays };
    }
  }

  return nearest;
}

/**
 * 특별일 유형별 이모지 반환
 */
export function getSpecialDayTypeEmoji(type: SpecialDayType): string {
  switch (type) {
    case 'birthday': return '🎂';
    case 'anniversary': return '🎊';
    case 'memorable': return '📅';
    default: return '⭐';
  }
}
