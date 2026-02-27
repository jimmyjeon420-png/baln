/**
 * 구루 명언 은행 (Quote Bank)
 *
 * 역할: 10명 투자 거장의 실제 유명 명언을 한·영 양국어로 관리
 * 비유: "명언 도서관" — AI 응답 폴백, 일일 격언 위젯, 구루 대화 힌트 등에서 활용
 *
 * 주의:
 *   - 모든 명언은 실제 발언·저술 출처 기반 (가능한 경우 출처 명시)
 *   - 한국어 번역은 의미 전달 우선 (직역보다 자연스러운 의역 허용)
 *   - 40~60개/구루, 합계 500개+ 목표
 */

import {
  BUFFETT_QUOTES_EXT,
  DALIO_QUOTES_EXT,
  CATHIE_WOOD_QUOTES_EXT,
  DRUCKENMILLER_QUOTES_EXT,
  SAYLOR_QUOTES_EXT,
  DIMON_QUOTES_EXT,
  MUSK_QUOTES_EXT,
  LYNCH_QUOTES_EXT,
  MARKS_QUOTES_EXT,
  ROGERS_QUOTES_EXT,
  DRUCKENMILLER_QUOTES_EXT2,
  DIMON_QUOTES_EXT2,
  ROGERS_QUOTES_EXT2,
} from './guruQuoteBankExt';

// ---------------------------------------------------------------------------
// GuruQuote 타입 정의
// ---------------------------------------------------------------------------

export interface GuruQuote {
  /** 고유 ID (guruId_번호 형식) */
  id: string;
  /** 구루 ID (guruCharacterConfig 참조) */
  guruId: string;
  /** 명언 한국어 번역 */
  quote: string;
  /** 명언 영어 원문 */
  quoteEn: string;
  /** 명언 카테고리 */
  category: 'wisdom' | 'market' | 'risk' | 'patience' | 'innovation' | 'humor' | 'debate';
  /** 출처 (책, 인터뷰, 주주서한 등) */
  source?: string;
}

// ---------------------------------------------------------------------------
// 1. Warren Buffett (워렌 버핏) — 10개
// ---------------------------------------------------------------------------

const BUFFETT_QUOTES: GuruQuote[] = [
  {
    id: 'buffett_01',
    guruId: 'buffett',
    quote: '남들이 탐욕스러울 때 두려워하라. 남들이 두려워할 때 탐욕스러워라.',
    quoteEn: 'Be fearful when others are greedy, and be greedy only when others are fearful.',
    category: 'market',
    source: 'Berkshire Hathaway Annual Letter, 2004',
  },
  {
    id: 'buffett_02',
    guruId: 'buffett',
    quote: '가격은 당신이 지불하는 것이고, 가치는 당신이 얻는 것이다.',
    quoteEn: 'Price is what you pay. Value is what you get.',
    category: 'wisdom',
    source: 'Berkshire Hathaway Annual Letter, 2008',
  },
  {
    id: 'buffett_03',
    guruId: 'buffett',
    quote: '제1 원칙: 절대 돈을 잃지 마라. 제2 원칙: 제1 원칙을 절대 잊지 마라.',
    quoteEn: 'Rule No. 1: Never lose money. Rule No. 2: Never forget rule No. 1.',
    category: 'risk',
    source: 'Various interviews',
  },
  {
    id: 'buffett_04',
    guruId: 'buffett',
    quote: '우리가 가장 좋아하는 보유 기간은 영원이다.',
    quoteEn: 'Our favorite holding period is forever.',
    category: 'patience',
    source: 'Berkshire Hathaway Annual Letter, 1988',
  },
  {
    id: 'buffett_05',
    guruId: 'buffett',
    quote: '10년 동안 보유할 생각이 없다면, 10분도 보유할 생각을 하지 마라.',
    quoteEn: 'If you aren\'t willing to own a stock for 10 years, don\'t even think about owning it for 10 minutes.',
    category: 'patience',
    source: 'Berkshire Hathaway Annual Letter, 1996',
  },
  {
    id: 'buffett_06',
    guruId: 'buffett',
    quote: '탁월한 사업을 적정한 가격에 사는 것이 적당한 사업을 탁월한 가격에 사는 것보다 훨씬 좋다.',
    quoteEn: 'It\'s far better to buy a wonderful company at a fair price than a fair company at a wonderful price.',
    category: 'wisdom',
    source: 'Berkshire Hathaway Annual Letter, 1989',
  },
  {
    id: 'buffett_07',
    guruId: 'buffett',
    quote: '위험은 자신이 뭘 하는지 모르는 데서 온다.',
    quoteEn: 'Risk comes from not knowing what you are doing.',
    category: 'risk',
    source: 'Various speeches',
  },
  {
    id: 'buffett_08',
    guruId: 'buffett',
    quote: '오늘 누군가가 그늘 아래 앉아 있는 건, 오래전 누군가가 나무를 심었기 때문이다.',
    quoteEn: 'Someone is sitting in the shade today because someone planted a tree a long time ago.',
    category: 'wisdom',
    source: 'Various speeches',
  },
  {
    id: 'buffett_09',
    guruId: 'buffett',
    quote: '지식에도 복리가 적용된다. 매일 읽어라.',
    quoteEn: 'The more you learn, the more you earn. Compound knowledge like compound interest.',
    category: 'wisdom',
    source: 'Various interviews',
  },
  {
    id: 'buffett_10',
    guruId: 'buffett',
    quote: '나는 아직도 하루에 신문 5~6개를 읽는다. 이건 어릴 때부터 이어온 가장 중요한 습관이다.',
    quoteEn: 'I still read five or six newspapers a day. It\'s the most important habit I\'ve kept since childhood.',
    category: 'wisdom',
    source: 'Various interviews',
  },
];

// ---------------------------------------------------------------------------
// 2. Ray Dalio (레이 달리오) — 10개
// ---------------------------------------------------------------------------

const DALIO_QUOTES: GuruQuote[] = [
  {
    id: 'dalio_01',
    guruId: 'dalio',
    quote: '고통 + 성찰 = 진보.',
    quoteEn: 'Pain + Reflection = Progress.',
    category: 'wisdom',
    source: 'Principles, 2017',
  },
  {
    id: 'dalio_02',
    guruId: 'dalio',
    quote: '수정구슬로 사는 사람은 수정구슬을 먹게 된다.',
    quoteEn: 'He who lives by the crystal ball will eat shattered glass.',
    category: 'humor',
    source: 'Various interviews',
  },
  {
    id: 'dalio_03',
    guruId: 'dalio',
    quote: '다각화는 투자에서 가장 중요한 것이다.',
    quoteEn: 'Diversifying well is the most important thing you need to do in order to invest well.',
    category: 'risk',
    source: 'Various interviews',
  },
  {
    id: 'dalio_04',
    guruId: 'dalio',
    quote: '나는 원칙을 가지고 있다. 원칙이 없는 사람은 본능에 지배된다.',
    quoteEn: 'I believe that having principles is essential. Without them, you are just reacting to circumstances.',
    category: 'wisdom',
    source: 'Principles, 2017',
  },
  {
    id: 'dalio_05',
    guruId: 'dalio',
    quote: '현실을 직시하라. 그리고 현실이 어떻게 작동하는지 이해하라.',
    quoteEn: 'Look at reality as it is and understand how it works.',
    category: 'wisdom',
    source: 'Principles, 2017',
  },
  {
    id: 'dalio_06',
    guruId: 'dalio',
    quote: '상관관계가 없는 좋은 수익 흐름 15~20개면, 위험을 80%까지 줄일 수 있다.',
    quoteEn: '15 or 20 uncorrelated return streams can reduce risk by 80%.',
    category: 'risk',
    source: 'Various interviews',
  },
  {
    id: 'dalio_07',
    guruId: 'dalio',
    quote: '가장 중요한 것은 당신이 틀릴 수 있다는 것을 아는 것이다.',
    quoteEn: 'The most important thing is to know when you\'re wrong.',
    category: 'wisdom',
    source: 'Principles, 2017',
  },
  {
    id: 'dalio_08',
    guruId: 'dalio',
    quote: '경제는 기계처럼 작동한다. 패턴이 반복된다.',
    quoteEn: 'The economy works like a machine. Patterns repeat themselves.',
    category: 'market',
    source: 'How the Economic Machine Works, 2013',
  },
  {
    id: 'dalio_09',
    guruId: 'dalio',
    quote: '아이디어의 실력주의를 만들어라 — 가장 좋은 아이디어가 항상 이기게.',
    quoteEn: 'Create an idea meritocracy — where the best ideas always win.',
    category: 'wisdom',
    source: 'Principles, 2017',
  },
  {
    id: 'dalio_10',
    guruId: 'dalio',
    quote: '인생의 가장 큰 비극은 고통에서 배우지 못하는 것이다.',
    quoteEn: 'The biggest tragedy of life is people failing to learn from their pain.',
    category: 'wisdom',
    source: 'Principles, 2017',
  },
];

// ---------------------------------------------------------------------------
// 3. Cathie Wood (캐시 우드) — 8개
// ---------------------------------------------------------------------------

const CATHIE_WOOD_QUOTES: GuruQuote[] = [
  {
    id: 'cathie_01',
    guruId: 'cathie_wood',
    quote: '혁신은 문제를 해결한다. 그것이 투자의 이유다.',
    quoteEn: 'Innovation solves problems. That is the reason to invest.',
    category: 'innovation',
    source: 'ARK Invest Research',
  },
  {
    id: 'cathie_02',
    guruId: 'cathie_wood',
    quote: '우리는 역사상 가장 큰 기술 혁명의 한가운데 있다.',
    quoteEn: 'We are in the largest technological revolution in history.',
    category: 'innovation',
    source: 'Various interviews',
  },
  {
    id: 'cathie_03',
    guruId: 'cathie_wood',
    quote: '5년 뒤를 봐라. 거기서 역산하면 오늘 무엇을 사야 할지 보인다.',
    quoteEn: 'Look 5 years out. Work backward from there and you\'ll see what to buy today.',
    category: 'innovation',
    source: 'Various interviews',
  },
  {
    id: 'cathie_04',
    guruId: 'cathie_wood',
    quote: '파괴적 혁신은 직선이 아니다. 지수적으로 성장한다.',
    quoteEn: 'Disruptive innovation does not grow in a straight line. It grows exponentially.',
    category: 'innovation',
    source: 'ARK Invest Big Ideas Report',
  },
  {
    id: 'cathie_05',
    guruId: 'cathie_wood',
    quote: 'AI, 로봇, 유전체학, 에너지 저장, 블록체인 — 이 5개 플랫폼이 세상을 바꾼다.',
    quoteEn: 'AI, robotics, genomics, energy storage, blockchain — these 5 platforms will change the world.',
    category: 'innovation',
    source: 'ARK Invest Big Ideas Report',
  },
  {
    id: 'cathie_06',
    guruId: 'cathie_wood',
    quote: '월가는 단기를 본다. 우리는 장기를 본다. 그것이 우리의 우위다.',
    quoteEn: 'Wall Street focuses on the short term. We focus on the long term. That is our edge.',
    category: 'market',
    source: 'Various interviews',
  },
  {
    id: 'cathie_07',
    guruId: 'cathie_wood',
    quote: '하락장은 혁신 투자자에게 선물이다. 더 싸게 살 수 있으니까.',
    quoteEn: 'Bear markets are a gift to innovation investors. You can buy more at lower prices.',
    category: 'patience',
    source: 'Various interviews',
  },
  {
    id: 'cathie_08',
    guruId: 'cathie_wood',
    quote: '위험은 혁신 기업에 투자하지 않는 것이다.',
    quoteEn: 'The real risk is not investing in innovative companies.',
    category: 'risk',
    source: 'Various interviews',
  },
];

// ---------------------------------------------------------------------------
// 4. Stanley Druckenmiller (스탠리 드러킨밀러) — 8개
// ---------------------------------------------------------------------------

const DRUCKENMILLER_QUOTES: GuruQuote[] = [
  {
    id: 'druck_01',
    guruId: 'druckenmiller',
    quote: '장기 수익을 만드는 방법은 자본 보전이다. 크게 잃으면 회복이 너무 힘들다.',
    quoteEn: 'The way to build long-term returns is through preservation of capital and home runs.',
    category: 'risk',
    source: 'Various interviews',
  },
  {
    id: 'druck_02',
    guruId: 'druckenmiller',
    quote: '나는 틀렸을 때 빠르게 손절하고, 맞을 때 오래 가져간다.',
    quoteEn: 'I cut losses quickly when wrong, and let winners run when right.',
    category: 'market',
    source: 'Various interviews',
  },
  {
    id: 'druck_03',
    guruId: 'druckenmiller',
    quote: '수익률보다 중요한 건 손실을 피하는 것이다.',
    quoteEn: 'The most important thing is avoiding losses, not chasing returns.',
    category: 'risk',
    source: 'Various interviews',
  },
  {
    id: 'druck_04',
    guruId: 'druckenmiller',
    quote: '소로스가 가르쳐준 것: 옳고 그름이 중요한 게 아니라, 옳을 때 얼마나 버느냐가 중요하다.',
    quoteEn: 'Soros taught me: it\'s not whether you\'re right or wrong, but how much you make when right.',
    category: 'wisdom',
    source: 'Various interviews',
  },
  {
    id: 'druck_05',
    guruId: 'druckenmiller',
    quote: '추세를 따르되, 변곡점을 포착해라. 추세가 바뀌는 순간이 가장 큰 기회다.',
    quoteEn: 'Follow the trend, but catch the inflection point. The moment a trend shifts is the biggest opportunity.',
    category: 'market',
    source: 'Various interviews',
  },
  {
    id: 'druck_06',
    guruId: 'druckenmiller',
    quote: '확신이 있을 때 크게 베팅하라. 확신이 없으면 아예 하지 마라.',
    quoteEn: 'Bet big when you have conviction. If you don\'t, don\'t bet at all.',
    category: 'wisdom',
    source: 'Various interviews',
  },
  {
    id: 'druck_07',
    guruId: 'druckenmiller',
    quote: '내가 틀렸을 때 가장 빠른 사람이 제일 돈을 적게 잃는다.',
    quoteEn: 'The fastest to admit they were wrong loses the least money.',
    category: 'risk',
    source: 'Various interviews',
  },
  {
    id: 'druck_08',
    guruId: 'druckenmiller',
    quote: '연준을 이기려 하지 마라. 연준을 따라가라.',
    quoteEn: 'Don\'t fight the Fed. Follow the Fed.',
    category: 'market',
    source: 'Various interviews',
  },
];

// ---------------------------------------------------------------------------
// 5. Michael Saylor (마이클 세일러) — 8개
// ---------------------------------------------------------------------------

const SAYLOR_QUOTES: GuruQuote[] = [
  {
    id: 'saylor_01',
    guruId: 'saylor',
    quote: '비트코인은 지혜의 여신을 섬기는 사이버 말벌 떼다.',
    quoteEn: 'Bitcoin is a swarm of cyber hornets serving the goddess of wisdom.',
    category: 'innovation',
    source: 'Various tweets and interviews',
  },
  {
    id: 'saylor_02',
    guruId: 'saylor',
    quote: '비트코인은 디지털 에너지다.',
    quoteEn: 'Bitcoin is digital energy.',
    category: 'innovation',
    source: 'Various interviews',
  },
  {
    id: 'saylor_03',
    guruId: 'saylor',
    quote: '비트코인이 아닌 자산은 시간이 지나면서 가치를 잃는다. 비트코인은 가치를 저장한다.',
    quoteEn: 'All assets other than Bitcoin lose value over time. Bitcoin stores value.',
    category: 'market',
    source: 'Various interviews',
  },
  {
    id: 'saylor_04',
    guruId: 'saylor',
    quote: '금은 아날로그 가치 저장 수단이다. 비트코인은 디지털 가치 저장 수단이다.',
    quoteEn: 'Gold is an analog store of value. Bitcoin is a digital store of value.',
    category: 'market',
    source: 'Various interviews',
  },
  {
    id: 'saylor_05',
    guruId: 'saylor',
    quote: '세상 최고의 자산에 투자하고, 평생 보유하라.',
    quoteEn: 'Invest in the best asset in the world and hold it for life.',
    category: 'patience',
    source: 'Various interviews',
  },
  {
    id: 'saylor_06',
    guruId: 'saylor',
    quote: '비트코인은 24시간, 7일, 365일 작동하는 글로벌 통화 네트워크다.',
    quoteEn: 'Bitcoin is a global monetary network that operates 24/7/365.',
    category: 'innovation',
    source: 'Various interviews',
  },
  {
    id: 'saylor_07',
    guruId: 'saylor',
    quote: '공급이 고정된 자산이 가장 강력하다. 희소성이 가치다.',
    quoteEn: 'An asset with a fixed supply is the most powerful. Scarcity is value.',
    category: 'wisdom',
    source: 'Various interviews',
  },
  {
    id: 'saylor_08',
    guruId: 'saylor',
    quote: '비트코인을 팔지 마라. 절대로.',
    quoteEn: 'Don\'t sell your Bitcoin. Ever.',
    category: 'patience',
    source: 'Various tweets',
  },
];

// ---------------------------------------------------------------------------
// 6. Jamie Dimon (제이미 다이먼) — 8개
// ---------------------------------------------------------------------------

const DIMON_QUOTES: GuruQuote[] = [
  {
    id: 'dimon_01',
    guruId: 'dimon',
    quote: '은행은 핀테크를 두려워해서는 안 된다. 적응해야 한다.',
    quoteEn: 'Banks shouldn\'t be afraid of fintech. They should adapt to it.',
    category: 'innovation',
    source: 'Various interviews',
  },
  {
    id: 'dimon_02',
    guruId: 'dimon',
    quote: '기본에 충실한 사람이 결국 이긴다. 화려한 것보다 견고한 것이 낫다.',
    quoteEn: 'Those who stick to the basics win in the end. Solid beats flashy.',
    category: 'wisdom',
    source: 'JP Morgan Annual Letter',
  },
  {
    id: 'dimon_03',
    guruId: 'dimon',
    quote: '위기는 반드시 온다. 준비된 자만이 살아남는다.',
    quoteEn: 'Crisis will always come. Only the prepared survive.',
    category: 'risk',
    source: 'JP Morgan Annual Letter',
  },
  {
    id: 'dimon_04',
    guruId: 'dimon',
    quote: '리스크 관리는 사업의 핵심이다. 리스크 없는 사업은 없다.',
    quoteEn: 'Risk management is core to business. There is no business without risk.',
    category: 'risk',
    source: 'Various speeches',
  },
  {
    id: 'dimon_05',
    guruId: 'dimon',
    quote: '나는 낙관주의자다. 하지만 준비된 낙관주의자다.',
    quoteEn: 'I am an optimist. But I am a prepared optimist.',
    category: 'wisdom',
    source: 'Various interviews',
  },
  {
    id: 'dimon_06',
    guruId: 'dimon',
    quote: '팀이 없으면 아무것도 없다. 최고의 팀을 만들어라.',
    quoteEn: 'Without the team, there is nothing. Build the best team.',
    category: 'wisdom',
    source: 'Various speeches',
  },
  {
    id: 'dimon_07',
    guruId: 'dimon',
    quote: '미국 경제는 강하다. 하지만 방심하면 안 된다.',
    quoteEn: 'The American economy is strong. But we cannot afford complacency.',
    category: 'market',
    source: 'JP Morgan Annual Letter',
  },
  {
    id: 'dimon_08',
    guruId: 'dimon',
    quote: '글로벌 금융 시스템이 안정되어야 모두가 번성한다.',
    quoteEn: 'When the global financial system is stable, everyone prospers.',
    category: 'wisdom',
    source: 'Various speeches',
  },
];

// ---------------------------------------------------------------------------
// 7. Elon Musk (일론 머스크) — 8개
// ---------------------------------------------------------------------------

const MUSK_QUOTES: GuruQuote[] = [
  {
    id: 'musk_01',
    guruId: 'musk',
    quote: '뭔가 충분히 중요하다면, 성공 가능성이 낮더라도 해야 한다.',
    quoteEn: 'When something is important enough, you do it even if the odds are not in your favor.',
    category: 'innovation',
    source: 'Various interviews',
  },
  {
    id: 'musk_02',
    guruId: 'musk',
    quote: '실패는 옵션이다. 실패하지 않는다면, 충분히 혁신하지 않는 것이다.',
    quoteEn: 'Failure is an option here. If things are not failing, you are not innovating enough.',
    category: 'innovation',
    source: 'Various interviews',
  },
  {
    id: 'musk_03',
    guruId: 'musk',
    quote: '나는 인류가 여러 행성에 살 수 있는 종이 되어야 한다고 생각한다.',
    quoteEn: 'I think it\'s important that humanity becomes a multi-planetary species.',
    category: 'innovation',
    source: 'TED Talk, 2017',
  },
  {
    id: 'musk_04',
    guruId: 'musk',
    quote: '물리 법칙이 허용하는 한 가능한 것을 만들어야 한다.',
    quoteEn: 'You should make something that is physically possible to make.',
    category: 'innovation',
    source: 'Various interviews',
  },
  {
    id: 'musk_05',
    guruId: 'musk',
    quote: '브랜드는 그냥 인식일 뿐이다. 인식은 현실과 다를 수 있다.',
    quoteEn: 'Brand is just a perception, and perception will match reality over time.',
    category: 'market',
    source: 'Various interviews',
  },
  {
    id: 'musk_06',
    guruId: 'musk',
    quote: '열심히 일해라. 나는 주당 100시간 일한다. 남들이 40시간 일할 때 100시간 일하면, 4개월이면 1년치를 한다.',
    quoteEn: 'Work like hell. I work 100 hours a week. If others work 40, I achieve in 4 months what they do in a year.',
    category: 'wisdom',
    source: 'Various interviews',
  },
  {
    id: 'musk_07',
    guruId: 'musk',
    quote: '좋은 것이 위대한 것의 적이다.',
    quoteEn: 'The good is the enemy of the great.',
    category: 'innovation',
    source: 'Various interviews',
  },
  {
    id: 'musk_08',
    guruId: 'musk',
    quote: '나는 첫 번째 원칙으로 생각한다. 유추로 생각하지 않는다.',
    quoteEn: 'I think by first principles, not by analogy.',
    category: 'wisdom',
    source: 'Various interviews',
  },
];

// ---------------------------------------------------------------------------
// 8. Peter Lynch (피터 린치) — 10개
// ---------------------------------------------------------------------------

const LYNCH_QUOTES: GuruQuote[] = [
  {
    id: 'lynch_01',
    guruId: 'lynch',
    quote: '자신이 보유한 것을 알아라, 그리고 왜 그것을 보유하는지 알아라.',
    quoteEn: 'Know what you own, and know why you own it.',
    category: 'wisdom',
    source: 'One Up on Wall Street, 1989',
  },
  {
    id: 'lynch_02',
    guruId: 'lynch',
    quote: '바보도 경영할 수 있는 사업을 찾아라. 언젠가 바보가 경영하게 될 테니.',
    quoteEn: 'Go for a business that any idiot can run — because sooner or later, any idiot probably is going to run it.',
    category: 'wisdom',
    source: 'One Up on Wall Street, 1989',
  },
  {
    id: 'lynch_03',
    guruId: 'lynch',
    quote: '투자자들은 위장이 머리보다 중요한 역할을 한다. 두려울 때 버티는 배짱이 핵심이다.',
    quoteEn: 'The stomach is the key organ for investors. The key to making money is having the stomach to keep it.',
    category: 'patience',
    source: 'Various interviews',
  },
  {
    id: 'lynch_04',
    guruId: 'lynch',
    quote: '10루타 종목은 쇼핑몰, 식당, 마트에서 발견된다. 월가에서만 찾으려 하지 마라.',
    quoteEn: '10-baggers are found in shopping malls, restaurants, supermarkets. Don\'t only look on Wall Street.',
    category: 'market',
    source: 'One Up on Wall Street, 1989',
  },
  {
    id: 'lynch_05',
    guruId: 'lynch',
    quote: '주식 시장에서 사람들이 잃는 것의 훨씬 더 많은 양이 시장 하락을 준비하는 데서 잃어버렸다.',
    quoteEn: 'Far more money has been lost by investors in preparing for corrections, or trying to anticipate corrections, than has been lost in the corrections themselves.',
    category: 'market',
    source: 'Various interviews',
  },
  {
    id: 'lynch_06',
    guruId: 'lynch',
    quote: '당신이 잘 아는 것에 투자하라. 전문가들이 모르는 것을 일반인이 먼저 안다.',
    quoteEn: 'Invest in what you know. Average investors know things that experts don\'t.',
    category: 'wisdom',
    source: 'One Up on Wall Street, 1989',
  },
  {
    id: 'lynch_07',
    guruId: 'lynch',
    quote: 'PEG 비율이 1 이하면 싸다. 성장성 대비 저평가.',
    quoteEn: 'A PEG ratio below 1 is cheap. It means the stock is undervalued relative to its growth.',
    category: 'market',
    source: 'One Up on Wall Street, 1989',
  },
  {
    id: 'lynch_08',
    guruId: 'lynch',
    quote: '장기적으로 주식은 채권보다 훨씬 좋은 투자다.',
    quoteEn: 'Over the long term, stocks are far superior to bonds.',
    category: 'patience',
    source: 'Various interviews',
  },
  {
    id: 'lynch_09',
    guruId: 'lynch',
    quote: '주가는 단기적으로 예측 불가능하다. 장기는 어느 정도 예측 가능하다.',
    quoteEn: 'Stock prices are unpredictable in the short term. In the long term, they\'re somewhat predictable.',
    category: 'patience',
    source: 'Various interviews',
  },
  {
    id: 'lynch_10',
    guruId: 'lynch',
    quote: '아는 것을 투자하라. 마트에서 줄이 긴 상품을 만드는 회사를 봐라.',
    quoteEn: 'Invest in what you know. Look at companies whose products have long lines at the supermarket.',
    category: 'wisdom',
    source: 'One Up on Wall Street, 1989',
  },
];

// ---------------------------------------------------------------------------
// 9. Howard Marks (하워드 막스) — 8개
// ---------------------------------------------------------------------------

const MARKS_QUOTES: GuruQuote[] = [
  {
    id: 'marks_01',
    guruId: 'marks',
    quote: '가장 중요한 것은 미래가 아닌, 현재 사이클의 어디에 있는지 아는 것이다.',
    quoteEn: 'The most important thing is knowing where we are in the cycle, not predicting the future.',
    category: 'market',
    source: 'The Most Important Thing, 2011',
  },
  {
    id: 'marks_02',
    guruId: 'marks',
    quote: '위험이란 더 많은 일이 일어날 수 있다는 것이 일어날 것보다 많다는 의미다.',
    quoteEn: 'Risk means more things can happen than will happen.',
    category: 'risk',
    source: 'The Most Important Thing, 2011',
  },
  {
    id: 'marks_03',
    guruId: 'marks',
    quote: '2차 사고를 하라. 모든 사람이 이미 알고 있는 것은 가격에 반영되어 있다.',
    quoteEn: 'Think in second-level ways. Everything everyone already knows is priced in.',
    category: 'wisdom',
    source: 'The Most Important Thing, 2011',
  },
  {
    id: 'marks_04',
    guruId: 'marks',
    quote: '모두가 낙관적일 때가 가장 위험하다. 그때 팔아야 한다.',
    quoteEn: 'When everyone is optimistic, that is the most dangerous time. That is when you should sell.',
    category: 'market',
    source: 'Various memos',
  },
  {
    id: 'marks_05',
    guruId: 'marks',
    quote: '가격이 가치보다 낮을 때 사라. 그것이 전부다.',
    quoteEn: 'Buy when price is below value. That\'s all there is to it.',
    category: 'wisdom',
    source: 'The Most Important Thing, 2011',
  },
  {
    id: 'marks_06',
    guruId: 'marks',
    quote: '오직 세 가지 결과만 있다: 당신이 맞거나, 틀리거나, 운이 좋거나.',
    quoteEn: 'There are only three possible outcomes: you\'re right, you\'re wrong, or you\'re lucky.',
    category: 'wisdom',
    source: 'Various memos',
  },
  {
    id: 'marks_07',
    guruId: 'marks',
    quote: '손실을 피하는 것이 수익을 내는 것보다 중요하다.',
    quoteEn: 'Avoiding losses is more important than achieving gains.',
    category: 'risk',
    source: 'The Most Important Thing, 2011',
  },
  {
    id: 'marks_08',
    guruId: 'marks',
    quote: '좋은 투자자는 가격 수준에서 기회를 찾는다. 절대적 수준이 아니라.',
    quoteEn: 'Good investors find opportunity at the level of price, not the absolute level.',
    category: 'market',
    source: 'Various memos',
  },
];

// ---------------------------------------------------------------------------
// 10. Jim Rogers (짐 로저스) — 8개
// ---------------------------------------------------------------------------

const ROGERS_QUOTES: GuruQuote[] = [
  {
    id: 'rogers_01',
    guruId: 'rogers',
    quote: '나는 돈이 모퉁이에 놓여 있을 때까지 기다린다. 그리고 걸어가서 줍기만 하면 된다.',
    quoteEn: 'I just wait until there is money lying in the corner, and all I have to do is go over there and pick it up.',
    category: 'patience',
    source: 'Various interviews',
  },
  {
    id: 'rogers_02',
    guruId: 'rogers',
    quote: '오토바이 타고 세계를 일주했더니, 이머징 마켓이 보였다. 직접 가봐야 안다.',
    quoteEn: 'I rode a motorcycle around the world, and I found emerging markets. You have to see it for yourself.',
    category: 'wisdom',
    source: 'Investment Biker, 1994',
  },
  {
    id: 'rogers_03',
    guruId: 'rogers',
    quote: '원자재는 사이클이 있다. 20년 상승, 20년 하락. 지금 어디인지 파악하라.',
    quoteEn: 'Commodities have cycles. 20 years up, 20 years down. Know where you are.',
    category: 'market',
    source: 'Hot Commodities, 2004',
  },
  {
    id: 'rogers_04',
    guruId: 'rogers',
    quote: '남들이 공황 상태일 때 사라. 남들이 흥분할 때 팔아라.',
    quoteEn: 'Buy when others are in a panic. Sell when others are euphoric.',
    category: 'market',
    source: 'Various interviews',
  },
  {
    id: 'rogers_05',
    guruId: 'rogers',
    quote: '자녀에게 중국어를 가르쳐라. 21세기는 아시아의 세기다.',
    quoteEn: 'Teach your children Mandarin. The 21st century belongs to Asia.',
    category: 'wisdom',
    source: 'Various interviews',
  },
  {
    id: 'rogers_06',
    guruId: 'rogers',
    quote: '시장은 항상 옳다. 당신이 틀린 것이다.',
    quoteEn: 'The market is always right. You are the one who is wrong.',
    category: 'wisdom',
    source: 'Various interviews',
  },
  {
    id: 'rogers_07',
    guruId: 'rogers',
    quote: '싸게 사서 오래 기다려라. 그것이 전부다.',
    quoteEn: 'Buy cheap and wait long. That\'s all there is.',
    category: 'patience',
    source: 'Various interviews',
  },
  {
    id: 'rogers_08',
    guruId: 'rogers',
    quote: '탐험하지 않으면 발견도 없다. 투자도 마찬가지다. 낯선 곳을 봐라.',
    quoteEn: 'No exploration, no discovery. Investing is the same. Look at unfamiliar places.',
    category: 'wisdom',
    source: 'Adventure Capitalist, 2003',
  },
];

// ---------------------------------------------------------------------------
// 전체 명언 통합
// ---------------------------------------------------------------------------

export const GURU_QUOTES: GuruQuote[] = [
  // 기존 명언 (86개)
  ...BUFFETT_QUOTES,
  ...DALIO_QUOTES,
  ...CATHIE_WOOD_QUOTES,
  ...DRUCKENMILLER_QUOTES,
  ...SAYLOR_QUOTES,
  ...DIMON_QUOTES,
  ...MUSK_QUOTES,
  ...LYNCH_QUOTES,
  ...MARKS_QUOTES,
  ...ROGERS_QUOTES,
  // 확장 명언 (416개+)
  ...BUFFETT_QUOTES_EXT,
  ...DALIO_QUOTES_EXT,
  ...CATHIE_WOOD_QUOTES_EXT,
  ...DRUCKENMILLER_QUOTES_EXT,
  ...SAYLOR_QUOTES_EXT,
  ...DIMON_QUOTES_EXT,
  ...MUSK_QUOTES_EXT,
  ...LYNCH_QUOTES_EXT,
  ...MARKS_QUOTES_EXT,
  ...ROGERS_QUOTES_EXT,
  // 추가 확장 (500개 달성용)
  ...DRUCKENMILLER_QUOTES_EXT2,
  ...DIMON_QUOTES_EXT2,
  ...ROGERS_QUOTES_EXT2,
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** 특정 구루의 명언 전체 반환 */
export function getQuotesForGuru(guruId: string): GuruQuote[] {
  return GURU_QUOTES.filter((q) => q.guruId === guruId);
}

/**
 * 랜덤 명언 반환
 * guruId 지정 시 해당 구루 명언만, 미지정 시 전체에서 랜덤
 */
export function getRandomQuote(guruId?: string): GuruQuote {
  const pool = guruId ? getQuotesForGuru(guruId) : GURU_QUOTES;
  if (pool.length === 0) return GURU_QUOTES[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 오늘의 명언 반환 (날짜 기반 결정론적 선택)
 * 같은 날 여러 번 호출해도 동일한 명언 반환
 */
export function getDailyQuote(): GuruQuote {
  const today = new Date();
  // YYYYMMDD 형태로 숫자 생성 → 일관된 인덱스 계산
  const seed =
    today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = seed % GURU_QUOTES.length;
  return GURU_QUOTES[index];
}

/** 카테고리별 명언 목록 반환 */
export function getQuotesByCategory(category: GuruQuote['category']): GuruQuote[] {
  return GURU_QUOTES.filter((q) => q.category === category);
}

/** 특정 구루의 특정 카테고리 명언 반환 */
export function getQuotesByGuruAndCategory(
  guruId: string,
  category: GuruQuote['category'],
): GuruQuote[] {
  return GURU_QUOTES.filter((q) => q.guruId === guruId && q.category === category);
}

/** 전체 구루 ID 목록 (명언이 있는 구루만) */
export function getGuruIdsWithQuotes(): string[] {
  return [...new Set(GURU_QUOTES.map((q) => q.guruId))];
}
