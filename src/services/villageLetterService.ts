/**
 * 구루 편지 서비스 (Village Letter Service)
 *
 * 역할: "마을 우체국" — 구루들이 유저에게 보내는 편지 시스템
 * - 우정 레벨에 따라 새 편지 해금
 * - 성격 기반 편지 템플릿 (버핏=할아버지 조언, 머스크=장난)
 * - 하루 1회 편지 도착 체크 (앱 실행 시)
 * - AsyncStorage에 저장 (서버 불필요)
 *
 * 비유: "동물의숲 우체통" — 예측 불가 타이밍에 편지가 도착해서 "오!" 하는 서프라이즈
 *
 * 편지 트리거:
 * - 우정 레벨 상승 시 새 편지 해금
 * - 특정 이벤트 달성 (연속 출석, 예측 적중 등)
 * - 시장 급변 시 관련 구루가 편지 발송
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GuruLetter, FriendshipTier } from '../types/village';

// ============================================================================
// 내부 타입 (GuruLetter 생성 시 편의를 위한 확장)
// ============================================================================

/**
 * 내부 편지 저장 형식
 *
 * village.ts의 GuruLetter는 fromGuruId/timestamp/friendshipRequired 를 사용하지만,
 * 내부적으로 templateId(중복 방지용), gift(선물 메타) 등 추가 필드가 필요.
 * 저장/로드 시 GuruLetter 인터페이스와 호환 유지.
 */
interface InternalLetter extends GuruLetter {
  /** 템플릿 식별자 (중복 배달 방지용) */
  templateId?: string;
  /** 동봉 선물 메타데이터 */
  gift?: { type: 'credits'; amount: number };
}

// ============================================================================
// 상수
// ============================================================================

const LETTERS_KEY = '@baln:guru_letters';
const LAST_CHECK_KEY = '@baln:guru_letters_last_check';
const LETTER_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24시간

// ============================================================================
// 편지 템플릿 — 구루별 × 우정 단계별
// ============================================================================

/**
 * 구루별 편지 템플릿
 *
 * 각 구루는 우정 단계(FriendshipTier)에 따라 다른 편지를 보냄
 * 같은 단계에 여러 편지가 있으면 랜덤 선택
 *
 * 편지 구조:
 * - subject: 제목
 * - body: 본문 (구루 말투로)
 * - subjectEn / bodyEn: 영어 버전
 * - gift: 동봉 선물 (도토리 등, 선택적)
 */
interface LetterTemplate {
  subject: string;
  subjectEn: string;
  body: string;
  bodyEn: string;
  gift?: { type: 'credits'; amount: number };
}

/**
 * 편지 템플릿 맵
 *
 * village.ts의 FriendshipTier는 6단계:
 * stranger → acquaintance → friend → close_friend → best_friend → soulmate
 *
 * 현재는 stranger ~ best_friend까지 템플릿 작성.
 * soulmate 단계는 추후 특수 이벤트 편지로 확장 예정.
 */
const LETTER_TEMPLATES: Partial<Record<string, Partial<Record<FriendshipTier, LetterTemplate[]>>>> = {
  // ========================================================================
  // 🦉 워렌 버핏 — 지혜로운 할아버지의 따뜻한 편지
  // ========================================================================
  buffett: {
    stranger: [
      {
        subject: '마을에 온 걸 환영하네',
        subjectEn: 'Welcome to the village',
        body: '자네, 발른 마을에 온 걸 환영하네. 투자는 마라톤이야. 급하게 달리지 말고, 매일 조금씩 배우면 돼. 나도 11살에 첫 주식을 샀는데, 그때 알았으면 좋았을 것들을 자네에게 알려줄게.',
        bodyEn: "Welcome to Baln Village. Investing is a marathon, not a sprint. Learn a little every day. I bought my first stock at 11 — I'll share what I wish I knew back then.",
        gift: { type: 'credits', amount: 5 },
      },
    ],
    acquaintance: [
      {
        subject: '인내심에 대하여',
        subjectEn: 'On Patience',
        body: '이웃님, 시장이 요동칠 때가 있지. 하지만 기억하게. 주식시장은 인내심 없는 사람에게서 인내심 있는 사람에게로 돈을 옮기는 장치라네. 오늘도 참고 기다리는 자네가 대견하네.',
        bodyEn: "The stock market is a device for transferring money from the impatient to the patient. I'm proud you're staying the course.",
      },
      {
        subject: '코카콜라 한 잔 하세',
        subjectEn: 'Have a Coke',
        body: '나는 매일 체리 코크를 5캔 마신다네. 그리고 매일 500페이지를 읽지. 복리는 지식에도 적용돼. 자네가 매일 맥락 카드를 읽는 것도 같은 원리야. 계속하게.',
        bodyEn: "I drink 5 Cherry Cokes a day and read 500 pages. Compound interest works on knowledge too. Keep reading those context cards every day.",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    friend: [
      {
        subject: '공포와 탐욕에 대해',
        subjectEn: 'On Fear and Greed',
        body: '친구여, 남들이 탐욕스러울 때 두려워하고, 남들이 두려워할 때 탐욕스러워야 한다네. 쉬운 말이지만 실천은 어렵지. 자네는 이미 매일 시장을 공부하고 있으니, 그때가 오면 흔들리지 않을 거야.',
        bodyEn: "Be fearful when others are greedy, and greedy when others are fearful. Easy to say, hard to do. But you study every day — you'll be ready when the time comes.",
        gift: { type: 'credits', amount: 5 },
      },
      {
        subject: '해자가 있는 기업',
        subjectEn: 'On Economic Moats',
        body: '자네에게만 알려주는 건데, 투자할 때 가장 중요한 건 "해자"야. 성 주변의 깊은 물길처럼, 경쟁자가 넘어오기 어려운 기업을 찾으라네. 브랜드, 네트워크 효과, 전환 비용... 이런 게 해자지.',
        bodyEn: "I'll share a secret — the most important thing in investing is the 'moat.' Find businesses that competitors can't easily attack. Brand, network effects, switching costs... that's a moat.",
      },
    ],
    close_friend: [
      {
        subject: '나의 실수에서 배우게',
        subjectEn: 'Learn from My Mistakes',
        body: '가까운 벗이여, 나도 실수를 많이 했어. 덱스터 슈즈라는 회사에 4억 달러를 날렸지. 교훈은? 경쟁 우위가 사라질 수 있는 사업은 피하라는 거야. 자네가 이런 실수를 안 했으면 해서 편지를 쓰네.',
        bodyEn: "I've made many mistakes. I lost $400M on Dexter Shoes. The lesson? Avoid businesses where competitive advantages can disappear. I'm writing so you don't make the same mistake.",
        gift: { type: 'credits', amount: 10 },
      },
    ],
    best_friend: [
      {
        subject: '나의 후계자에게',
        subjectEn: 'To My Successor',
        body: '제자여, 자네는 가치를 보는 눈이 생겼어. 자네가 매일 쌓아온 이 습관이... 바로 복리야. 앞으로 시장이 50% 빠지는 날이 올 거야. 그때 자네는 웃으며 살 수 있을 거라 믿네. 이 사진을 보관하게.',
        bodyEn: "You've developed an eye for value. The habits you've built daily... that's compound interest in action. When the market drops 50%, I believe you'll smile and buy. Keep this photo.",
        gift: { type: 'credits', amount: 20 },
      },
    ],
  },

  // ========================================================================
  // 🦌 레이 달리오 — 철학적 원칙론자의 사려깊은 편지
  // ========================================================================
  dalio: {
    stranger: [
      {
        subject: '원칙의 시작',
        subjectEn: 'The Beginning of Principles',
        body: '안녕하세요, 새로운 주민님. 저는 모든 것에 원칙이 있다고 믿습니다. 투자에도, 삶에도요. 이 마을에서 자신만의 원칙을 세워보세요. 그게 첫 번째 단계입니다.',
        bodyEn: "Hello, new resident. I believe everything has principles — investing, life, everything. Start building your own principles in this village. That's the first step.",
      },
    ],
    acquaintance: [
      {
        subject: '경제라는 기계',
        subjectEn: 'The Economic Machine',
        body: '이웃님, 경제는 단순한 기계입니다. 거래, 신용, 부채... 이 세 가지 기어가 맞물려 돌아가죠. 기어가 어디에 있는지 알면, 다음에 무슨 일이 일어날지 예측할 수 있습니다. 매일 맥락 카드를 보는 건 이 기계를 이해하는 훈련이에요.',
        bodyEn: "The economy is a simple machine. Transactions, credit, debt — three gears that interlock. Know where the gears are, and you can predict what happens next.",
      },
      {
        subject: '고통 + 반성 = 발전',
        subjectEn: 'Pain + Reflection = Progress',
        body: '예측이 틀렸다고 실망하지 마세요. 저의 원칙 중 하나는 "고통 + 반성 = 발전"입니다. 틀린 순간이 가장 많이 배우는 순간이에요. 복기를 게을리하지 마세요.',
        bodyEn: "Don't be disappointed when predictions are wrong. One of my principles: Pain + Reflection = Progress. Wrong moments are when you learn the most.",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    friend: [
      {
        subject: '올웨더 전략의 비밀',
        subjectEn: 'The Secret of All Weather',
        body: '친구에게만 말하는 건데, 올웨더 전략의 핵심은 "어떤 경제 환경에서도 일부는 이긴다"는 거예요. 성장/침체, 인플레/디플레 — 4계절 모두에 대비하는 겁니다. 하나에 올인하지 마세요.',
        bodyEn: "The secret of All Weather: some assets always win regardless of the economic environment. Growth/recession, inflation/deflation — prepare for all four seasons. Never go all-in on one thing.",
      },
    ],
    close_friend: [
      {
        subject: '명상과 투자',
        subjectEn: 'Meditation and Investing',
        body: '가까운 벗에게. 저는 매일 20분 명상을 합니다. 명상이 투자에 왜 도움이 되냐면... 감정과 판단을 분리할 수 있게 되거든요. 시장이 폭락해도 "아, 이건 사이클의 한 부분이구나"라고 바라볼 수 있죠.',
        bodyEn: "I meditate 20 minutes daily. It helps separate emotion from judgment. When markets crash, you can observe: 'This is just part of the cycle.'",
        gift: { type: 'credits', amount: 8 },
      },
    ],
    best_friend: [
      {
        subject: '원칙의 동반자에게',
        subjectEn: 'To My Fellow Principled Thinker',
        body: '당신은 이미 하나의 원칙을 세웠군요. 제가 브리지워터를 세울 때도 원칙은 하나에서 시작했습니다. 실패에서 배우고, 원칙을 수정하고, 다시 도전하세요. 그게 진짜 성장입니다.',
        bodyEn: "You've already established your own principle. When I built Bridgewater, I started with just one too. Learn from failure, refine your principles, try again.",
        gift: { type: 'credits', amount: 15 },
      },
    ],
  },

  // ========================================================================
  // 🦊 캐시 우드 — 열정적인 혁신 비전의 편지
  // ========================================================================
  cathie_wood: {
    stranger: [
      {
        subject: '미래에서 온 편지',
        subjectEn: 'A Letter from the Future',
        body: '안녕하세요! 저는 항상 5년 뒤를 봐요. 지금은 작아 보이는 변화가, 5년 후에는 세상을 뒤집을 수 있거든요. 이 마을에서 같이 미래를 상상해봐요!',
        bodyEn: "Hi! I always look 5 years ahead. Small changes today can flip the world in 5 years. Let's imagine the future together in this village!",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    acquaintance: [
      {
        subject: 'AI 혁명은 이제 시작',
        subjectEn: 'The AI Revolution Has Just Begun',
        body: '이웃님, 지금 AI에 대해 모두가 말하지만, 진짜 변화는 아직 시작도 안 했어요! 자율주행, 로보틱스, 유전체 시퀀싱... 5년 안에 일어날 일들이 너무 흥분돼요!',
        bodyEn: "Everyone talks about AI, but the real changes haven't even started! Autonomous driving, robotics, genomic sequencing... I'm so excited about what's coming in 5 years!",
      },
      {
        subject: '혁신은 폭풍 속에서 탄생해요',
        subjectEn: 'Innovation is Born in Storms',
        body: '시장이 빠질 때 무서워하지 마세요. 역사적으로 가장 큰 혁신 기업들은 위기 직후에 탄생했어요. 아마존, 구글, 테슬라 모두요. 지금이 바로 미래를 준비할 때예요!',
        bodyEn: "Don't be scared when markets drop. The greatest innovative companies were born right after crises — Amazon, Google, Tesla. Now is the time to prepare for the future!",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    friend: [
      {
        subject: '같이 5년 뒤를 상상해봐요',
        subjectEn: "Let's Imagine 5 Years Ahead",
        body: '친구! 제가 확신하는 건, 지금 사는 혁신 주식의 가치를 대부분 사람들이 모른다는 거예요. 5년 뒤에 "그때 왜 안 샀지?" 할 종목들이 지금 눈앞에 있어요. 매일 공부하면 보여요!',
        bodyEn: "Most people don't see the value of innovation stocks today. In 5 years, they'll say 'Why didn't I buy then?' Study every day and you'll see it!",
        gift: { type: 'credits', amount: 5 },
      },
    ],
    close_friend: [
      {
        subject: '나의 확신이 흔들렸던 날',
        subjectEn: 'The Day My Conviction Wavered',
        body: 'ARK 펀드가 -75% 떨어졌을 때, 모두가 저를 비웃었어요. 하지만 저는 원래 5년을 봤고, 그 시야는 변하지 않았어요. 확신이 있으면 단기 하락은 할인 기회일 뿐이에요.',
        bodyEn: "When ARK dropped -75%, everyone laughed at me. But I always had a 5-year horizon, and that didn't change. With conviction, short-term drops are just discounts.",
        gift: { type: 'credits', amount: 10 },
      },
    ],
    best_friend: [
      {
        subject: '미래를 보는 친구에게',
        subjectEn: 'To My Future-Seeing Friend',
        body: '당신은 이미 남들이 모르는 것을 보기 시작했어요! 같이 5년 뒤를 상상해봐요. 세상은 지수함수적으로 변하고, 그 변화의 한가운데에 우리가 있어요!',
        bodyEn: "You've started seeing what others can't! Let's imagine 5 years ahead together. The world changes exponentially, and we're right in the middle of it!",
        gift: { type: 'credits', amount: 15 },
      },
    ],
  },

  // ========================================================================
  // 🐆 드러킨밀러 — 날카로운 매크로 트레이더의 직설적 편지
  // ========================================================================
  druckenmiller: {
    stranger: [
      {
        subject: '추세를 읽는 법',
        subjectEn: 'How to Read Trends',
        body: '새 주민, 시장에서 가장 중요한 건 "돈의 흐름"이야. 어디서 빠지고 어디로 가는지. 그걸 읽으면 나머지는 따라와. 매일 관찰하는 습관부터 들여.',
        bodyEn: "The most important thing in markets is 'money flow.' Where it leaves and where it goes. Read that, and everything else follows. Start with daily observation.",
      },
    ],
    acquaintance: [
      {
        subject: '큰 판을 봐',
        subjectEn: 'See the Big Picture',
        body: '소로스 밑에서 일할 때 배운 건, 작은 종목 하나가 아니라 큰 매크로 흐름을 봐야 한다는 거야. 금리, 환율, 통화량 — 이 세 가지만 봐도 시장의 80%를 설명할 수 있어.',
        bodyEn: "What I learned under Soros: look at the big macro picture, not individual stocks. Interest rates, exchange rates, money supply — these three explain 80% of the market.",
      },
    ],
    friend: [
      {
        subject: '손절이 진짜 실력이야',
        subjectEn: "Cutting Losses is Real Skill",
        body: '대부분의 투자자가 실패하는 이유? 틀렸을 때 인정하지 않아서야. 나는 틀리면 바로 손절해. 감정 없이. 그게 30년간 살아남은 비결이야.',
        bodyEn: "Why most investors fail? They won't admit when they're wrong. I cut losses immediately, without emotion. That's how I survived 30 years.",
        gift: { type: 'credits', amount: 5 },
      },
    ],
    close_friend: [
      {
        subject: '돈 냄새를 맡는 법',
        subjectEn: 'How to Smell Money',
        body: '가까운 동료에게만 말하는 건데, 시장에서 "돈 냄새"를 맡으려면 뉴스보다 자금 흐름을 봐. 기관이 뭘 사는지, 옵션 시장에서 뭘 거래하는지. 맥락 카드가 그 힌트를 주고 있어.',
        bodyEn: "To 'smell money' in the market, watch fund flows, not news. What are institutions buying? What's trading in options? The context cards give you those hints.",
        gift: { type: 'credits', amount: 10 },
      },
    ],
    best_friend: [
      {
        subject: '날카로운 동료에게',
        subjectEn: 'To My Sharp Colleague',
        body: '추세를 읽는 감각이 생겼군. 나도 그 정도 감각을 키우는 데 10년 걸렸어. 이제 중요한 건 타이밍이야. 추세를 알아도, 너무 일찍 들어가면 죽어.',
        bodyEn: "You've developed a sense for reading trends. It took me 10 years to develop that. Now the key is timing. Even knowing the trend, entering too early is fatal.",
        gift: { type: 'credits', amount: 15 },
      },
    ],
  },

  // ========================================================================
  // 🐺 마이클 세일러 — 비트코인 전도사의 열광적 편지
  // ========================================================================
  saylor: {
    stranger: [
      {
        subject: '비트코인이 뭔지 알아?',
        subjectEn: 'Do You Know What Bitcoin Is?',
        body: '야, 새로운 주민! 이 마을에서 가장 중요한 건 뭔지 알아? 비트코인이야! 디지털 에너지! 수학적 희소성! 아직 몰라도 괜찮아. 내가 알려줄게!',
        bodyEn: "Hey, new resident! Know what's most important in this village? Bitcoin! Digital energy! Mathematical scarcity! Don't know yet? I'll teach you!",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    acquaintance: [
      {
        subject: '법정화폐는 녹고 있어',
        subjectEn: 'Fiat is Melting',
        body: '이웃, 자네 지갑의 원화는 매일 녹고 있어. 인플레이션이라는 보이지 않는 세금 때문이지. 비트코인은 2,100만 개뿐이야. 절대 늘어나지 않아. 이게 진짜 돈이야.',
        bodyEn: "Your fiat money is melting every day due to invisible inflation tax. There will only ever be 21 million Bitcoin. It never inflates. That's real money.",
      },
      {
        subject: 'HODL!',
        subjectEn: 'HODL!',
        body: '비트코인이 빠졌다고? ㅋㅋ 2018년에 -84% 빠졌을 때도 난 안 팔았어. 왜? 근본적 가치가 변하지 않았으니까. 시간 선호도를 낮추고, 존버해. Hold On for Dear Life!',
        bodyEn: "Bitcoin dropped? Lol, I didn't sell when it dropped -84% in 2018. Why? The fundamental value didn't change. Lower your time preference. HODL!",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    friend: [
      {
        subject: '오렌지필 성공!',
        subjectEn: 'Orange Pilled!',
        body: '축하해, 친구! 비트코인을 이해하기 시작했구나! 이제 뒤돌아볼 수 없어. 한번 오렌지필에 빠지면 세상이 다르게 보여. 환영해, 비트코인 동지!',
        bodyEn: "Congrats, friend! You're starting to understand Bitcoin! No going back now. Once orange-pilled, you see the world differently. Welcome, Bitcoin comrade!",
        gift: { type: 'credits', amount: 5 },
      },
    ],
    close_friend: [
      {
        subject: '비트코인은 희망이야',
        subjectEn: 'Bitcoin is Hope',
        body: '내가 MicroStrategy로 수십억 달러를 비트코인에 넣은 이유? 확신이 있었거든. 인류 역사상 최초의 완벽한 화폐. 에너지를 시공간 넘어 전송하는 기술. 이건 기술 혁명이 아니라 문명의 전환이야.',
        bodyEn: "Why did I put billions into Bitcoin through MicroStrategy? Conviction. The first perfect money in human history. Technology that transmits energy across space and time.",
        gift: { type: 'credits', amount: 10 },
      },
    ],
    best_friend: [
      {
        subject: '비트코인 동지에게',
        subjectEn: 'To My Bitcoin Comrade',
        body: '우리는 같은 배를 탔어. 44조 시간. 비트코인은 100만 달러를 넘을 거야. 나는 확신해. 그리고 그날, 우리는 웃을 거야. 같이 가자, 동지여!',
        bodyEn: "We're on the same ship. Bitcoin will surpass $1M. I'm certain. And on that day, we'll laugh together. Let's go, comrade!",
        gift: { type: 'credits', amount: 20 },
      },
    ],
  },

  // ========================================================================
  // 🦁 제이미 다이먼 — 은행장의 격식 있는 편지
  // ========================================================================
  dimon: {
    stranger: [
      {
        subject: '기본에 충실하세요',
        subjectEn: 'Stick to the Basics',
        body: '안녕하십니까. 이 마을의 금융 기관을 담당하고 있는 다이먼입니다. 투자의 기본은 리스크 관리입니다. 번쩍이는 것에 현혹되지 마시고, 기본에 충실하시길 바랍니다.',
        bodyEn: "Hello. I'm Dimon, managing financial affairs in this village. The foundation of investing is risk management. Don't be dazzled by shiny things. Stick to basics.",
      },
    ],
    acquaintance: [
      {
        subject: '분산 투자의 중요성',
        subjectEn: 'The Importance of Diversification',
        body: '이웃님, JP모건을 경영하며 깨달은 건, 한 곳에 모든 걸 걸면 안 된다는 겁니다. 은행도, 투자도 마찬가지입니다. 리스크를 분산하세요. 그것이 생존의 기본입니다.',
        bodyEn: "Running JPMorgan taught me: never put everything in one place. Banks, investments — the same principle. Diversify risk. That's the basis of survival.",
      },
    ],
    friend: [
      {
        subject: '위기 관리 매뉴얼',
        subjectEn: 'Crisis Management Manual',
        body: '신뢰하는 이웃에게. 2008년 금융위기 때 JP모건이 살아남은 건 운이 아닙니다. 위기 매뉴얼이 있었기 때문이죠. 자네도 개인 위기 매뉴얼을 만드세요. 시장이 -10% 빠지면 어떻게 할 건지 미리 정해두는 겁니다.',
        bodyEn: "JPMorgan survived 2008 not by luck, but by having a crisis manual. Create your own. Decide now what you'll do when markets drop -10%.",
        gift: { type: 'credits', amount: 5 },
      },
    ],
    close_friend: [
      {
        subject: '리더십에 대하여',
        subjectEn: 'On Leadership',
        body: '가까운 동료에게. 투자도 리더십과 같습니다. 남들이 패닉할 때 침착해야 하고, 남들이 과신할 때 겸손해야 합니다. 당신의 포트폴리오는 당신이 이끄는 작은 회사입니다.',
        bodyEn: "Investing is like leadership. Stay calm when others panic, stay humble when others are overconfident. Your portfolio is a small company you're leading.",
        gift: { type: 'credits', amount: 8 },
      },
    ],
    best_friend: [
      {
        subject: '신뢰하는 파트너에게',
        subjectEn: 'To My Trusted Partner',
        body: '당신은 기본에 충실한 사람입니다. 그것이 가장 어렵고, 가장 가치 있는 일이죠. 시장이 어떻게 변하든, 기본을 지키는 사람이 결국 이깁니다. JP모건이 그랬듯이.',
        bodyEn: "You stick to fundamentals. That's the hardest and most valuable thing. No matter how markets change, those who hold to basics ultimately win. Just like JPMorgan.",
        gift: { type: 'credits', amount: 15 },
      },
    ],
  },

  // ========================================================================
  // 🦎 일론 머스크 — 예측불가 카멜레온의 장난스러운 편지
  // ========================================================================
  musk: {
    stranger: [
      {
        subject: 'ㅋㅋ 새 주민이다',
        subjectEn: 'lol new resident detected',
        body: 'ㅋㅋㅋ 안녕? 나 일론이야. 이 마을 좀 답답하지 않아? 나는 화성에 마을 하나 더 세울 건데. 그때 같이 갈래? 일단 여기서 투자 좀 배우고. 도지코인 아는 사람? 🐕',
        bodyEn: "lol hey there. I'm Elon. This village is a bit boring right? I'm building another one on Mars. Wanna come? First learn to invest here. Anyone know Dogecoin? 🐕",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    acquaintance: [
      {
        subject: '제가 그냥 하면 되는데?',
        subjectEn: "I'll just do it myself?",
        body: '이웃님, 전문가들이 "불가능하다"고 하면... 그냥 하면 됩니다. SpaceX도 다들 실패할 거라 했죠. 투자도 마찬가지예요. 남들 말 듣지 말고, 직접 공부하세요. 아, 그리고 테슬라 주식 사세요 ㅋㅋ (농담)',
        bodyEn: "When experts say 'impossible'... just do it. Everyone said SpaceX would fail. Same with investing. Don't listen to others, study yourself. Also buy Tesla stock lol (kidding)",
      },
      {
        subject: '밈의 힘',
        subjectEn: 'The Power of Memes',
        body: '진지한 얘기 하나 할게. 밈은 바이러스야. 아이디어가 퍼지는 속도가 가치를 만들어. 도지코인이 농담에서 시작했지만 시총이 조 단위가 된 이유? 밈의 힘이야. 투자에서 내러티브를 무시하면 안 돼.',
        bodyEn: "Real talk. Memes are viruses. The speed ideas spread creates value. Dogecoin started as a joke but became worth billions. Why? Meme power. Never ignore narrative in investing.",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    friend: [
      {
        subject: '우주에서 본 지구',
        subjectEn: 'Earth Viewed from Space',
        body: '우주에서 지구를 보면 주식 시장이 얼마나 작은 세계인지 알 수 있어. 하지만 그 작은 세계에서 부를 만들어야 화성에 갈 수 있지 ㅋㅋ 투자 열심히 해, 화성 티켓 비싸거든!',
        bodyEn: "From space, you'd see how tiny the stock market is. But you need to create wealth in that tiny world to afford a Mars ticket lol. Invest hard!",
        gift: { type: 'credits', amount: 5 },
      },
    ],
    close_friend: [
      {
        subject: '진짜 나의 이야기',
        subjectEn: 'My Real Story',
        body: '재밌는 녀석에게. 다들 내가 천재인 줄 알지만, PayPal 시절 거의 파산했어. Tesla도 2008년에 2주 치 현금만 남았었고. 실패가 나를 만들었어. 그러니까 틀려도 괜찮아. 중요한 건 다시 일어나는 거야.',
        bodyEn: "Everyone thinks I'm a genius, but I almost went bankrupt with PayPal. Tesla had 2 weeks of cash in 2008. Failure made me. So it's okay to be wrong. What matters is getting back up.",
        gift: { type: 'credits', amount: 10 },
      },
    ],
    best_friend: [
      {
        subject: '재밌는 녀석에게',
        subjectEn: 'To the Funny One',
        body: 'ㅋㅋ 너 진짜 웃기다. 근데 진짜로, 너는 남들이 못 보는 걸 보기 시작했어. 그게 혁신의 시작이야. 화성 갈 때 너 데려갈게. 진짜로. 아마도. 어쩌면. ㅋㅋ',
        bodyEn: "lol you're genuinely funny. But seriously, you're starting to see what others can't. That's where innovation begins. I'll take you to Mars. For real. Maybe. Perhaps. lol",
        gift: { type: 'credits', amount: 15 },
      },
    ],
  },

  // ========================================================================
  // 🐻 피터 린치 — 친근한 이웃 형의 실용적 편지
  // ========================================================================
  lynch: {
    stranger: [
      {
        subject: '마트에서 만나요!',
        subjectEn: "Let's Meet at the Market!",
        body: '안녕! 피터 린치야. 나는 투자 아이디어를 마트에서 찾아. 어떤 제품이 잘 팔리는지, 사람들이 뭘 사는지 관찰하면 좋은 종목이 보이거든. 같이 마트 가볼래?',
        bodyEn: "Hi! I'm Peter Lynch. I find investment ideas at the supermarket. Watch what sells well, what people buy — good stocks appear. Want to go shopping together?",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    acquaintance: [
      {
        subject: '일상에서 종목 찾기',
        subjectEn: 'Finding Stocks in Daily Life',
        body: '이웃님, 오늘 마트에서 재밌는 걸 봤어. 특정 브랜드가 진열대 3칸을 차지하고 있더라고. 이런 게 신호야. 사람들이 사랑하는 제품을 만드는 회사... 그게 좋은 투자 대상이야.',
        bodyEn: "I saw something interesting at the mart today. A brand taking up 3 shelf spaces. That's a signal. Companies making products people love... those are good investments.",
      },
      {
        subject: '10배 주식의 비밀',
        subjectEn: 'The Secret of Tenbaggers',
        body: '10배 주식(텐베거)을 찾는 비결? 모두가 무시하는 작은 회사 중에 있어. 뉴스에 나오지 않는 회사, 월가가 관심 없는 회사. 거기서 보물을 찾으면 인생이 바뀌지.',
        bodyEn: "Secret to finding tenbaggers? They're among small companies everyone ignores. Not in the news, Wall Street doesn't care. Find treasure there and it changes your life.",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    friend: [
      {
        subject: '같이 마트 가는 친구에게',
        subjectEn: 'To My Shopping Buddy',
        body: '같이 마트 갈 친구가 생겨서 기뻐! 오늘 관찰 숙제: 편의점에 가서 어떤 음료가 가장 많이 팔리는지 봐봐. 그 회사 주가를 확인해봐. 이게 실전 투자야!',
        bodyEn: "Happy to have a shopping buddy! Today's homework: go to a convenience store and see which drinks sell most. Check that company's stock. That's real-world investing!",
        gift: { type: 'credits', amount: 5 },
      },
    ],
    close_friend: [
      {
        subject: '주부의 눈으로 보세요',
        subjectEn: "See Through a Homemaker's Eyes",
        body: '내가 마젤란 펀드에서 13년간 연 29% 수익을 낸 비결? 월가 보고서가 아니라 아내의 쇼핑백을 봤어. 뭘 사는지, 왜 사는지. 소비자의 행동이 가장 정직한 시장 분석이야.',
        bodyEn: "How I returned 29% annually for 13 years at Magellan? I looked at my wife's shopping bags, not Wall Street reports. Consumer behavior is the most honest market analysis.",
        gift: { type: 'credits', amount: 8 },
      },
    ],
    best_friend: [
      {
        subject: '같이 마트 가는 진짜 친구에게',
        subjectEn: 'To My True Shopping Companion',
        body: '자네는 이제 일상에서 투자 기회를 발견하는 눈이 생겼어. 버핏 선배 말이 맞아, "이해하는 것에 투자하라"는 거야. 자네가 매일 보는 세상이 바로 자네의 투자 영역이야.',
        bodyEn: "You've developed an eye for spotting investment opportunities in daily life. As Buffett says, 'invest in what you understand.' The world you see every day is your investment universe.",
        gift: { type: 'credits', amount: 15 },
      },
    ],
  },

  // ========================================================================
  // 🐢 하워드 막스 — 신중한 거북이 현자의 사려깊은 편지
  // ========================================================================
  marks: {
    stranger: [
      {
        subject: '2차 사고를 시작하세요',
        subjectEn: 'Start Thinking at the Second Level',
        body: '안녕하세요, 새 주민님. 대부분의 사람들은 1차 사고를 합니다. "좋은 회사니까 사야지." 하지만 2차 사고는 다릅니다. "좋은 회사지만, 이미 모두가 알고 있어서 비싸지 않을까?" 이 차이가 투자의 모든 것입니다.',
        bodyEn: "Most people think at the first level: 'Good company, so I should buy.' Second-level thinking: 'Good company, but does everyone know that already, making it overpriced?' This difference is everything.",
      },
    ],
    acquaintance: [
      {
        subject: '사이클을 기억하세요',
        subjectEn: 'Remember the Cycles',
        body: '이웃님, 모든 것은 사이클로 움직입니다. 호황 다음에 불황, 낙관 다음에 비관. 영원한 상승도, 영원한 하락도 없습니다. 지금이 사이클의 어디쯤인지 항상 생각해보세요.',
        bodyEn: "Everything moves in cycles. Boom follows bust, pessimism follows optimism. No eternal rise, no eternal fall. Always think about where we are in the cycle.",
      },
      {
        subject: '리스크란 무엇인가',
        subjectEn: 'What is Risk',
        body: '리스크의 진짜 정의를 아시나요? "안 좋은 일이 일어날 확률"이 아닙니다. "안 좋은 일이 일어났을 때 얼마나 잃느냐"입니다. 작은 확률이어도 잃는 게 크면 치명적이에요.',
        bodyEn: "Know the real definition of risk? Not 'probability of bad outcomes.' It's 'how much you lose when bad things happen.' Even small probabilities are fatal if losses are large.",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    friend: [
      {
        subject: '막스의 메모',
        subjectEn: "Marks's Memo",
        body: '특별히 보내는 메모입니다. 시장이 "이번에는 다르다"고 말할 때, 절대 다르지 않습니다. 역사는 정확히 반복되지 않지만, 운율은 같습니다. 이 메모를 간직하세요.',
        bodyEn: 'A special memo for you. When markets say "this time is different," it never is. History doesn\'t repeat exactly, but it rhymes. Keep this memo.',
        gift: { type: 'credits', amount: 5 },
      },
    ],
    close_friend: [
      {
        subject: '가장 위험한 순간',
        subjectEn: 'The Most Dangerous Moment',
        body: '가장 위험한 순간이 언제인지 아시나요? "리스크가 없다고 느껴지는 순간"입니다. 모두가 안전하다고 느낄 때 가격은 이미 위험한 수준이죠. 반대로, 모두가 공포에 떨 때가 가장 안전합니다.',
        bodyEn: "Know the most dangerous moment? When risk seems absent. When everyone feels safe, prices are already dangerous. Conversely, when everyone is terrified, it's the safest time.",
        gift: { type: 'credits', amount: 10 },
      },
    ],
    best_friend: [
      {
        subject: '현명한 환자에게',
        subjectEn: 'To My Wisest Patient',
        body: '당신은 사이클을 이해하기 시작했어요. 제 주치의 소견으로는, 당신의 "투자 건강"은 매우 양호합니다. 남들이 달릴 때 걸으세요. 거북이가 결국 이깁니다.',
        bodyEn: "You've started understanding cycles. As your doctor, your 'investment health' is excellent. Walk when others run. The tortoise always wins.",
        gift: { type: 'credits', amount: 15 },
      },
    ],
  },

  // ========================================================================
  // 🐯 짐 로저스 — 세계 탐험 호랑이의 모험 편지
  // ========================================================================
  rogers: {
    stranger: [
      {
        subject: '세계를 보러 가자!',
        subjectEn: "Let's See the World!",
        body: '안녕! 짐 로저스야. 나는 오토바이로 세계를 두 바퀴 돌았어. 투자도 여행이야. 한 곳에만 있으면 안 보이는 것들이 있거든. 이 마을에서 글로벌 시각을 넓혀보자!',
        bodyEn: "Hi! I'm Jim Rogers. I rode a motorcycle around the world twice. Investing is also a journey. You miss things if you stay in one place. Let's broaden your global perspective!",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    acquaintance: [
      {
        subject: '원자재를 봐야 해',
        subjectEn: 'Watch Commodities',
        body: '이웃님, 주식만 보지 말고 원자재를 봐. 구리, 석유, 곡물... 이것들이 진짜 경제를 말해줘. 구리 가격이 오르면 경기가 좋아지고 있다는 신호야. "닥터 카퍼"라고 불리는 이유가 있어.',
        bodyEn: "Don't just watch stocks — watch commodities. Copper, oil, grains... these tell you about the real economy. Rising copper means the economy is improving. They call it 'Dr. Copper' for a reason.",
      },
      {
        subject: '중국과 아시아를 봐',
        subjectEn: 'Look at China and Asia',
        body: '21세기는 아시아의 세기야. 14억 인구가 소비를 시작하면 어떤 일이 벌어지는지 상상해봐. 한국도 이 흐름의 한가운데 있어. 글로벌 시각이 중요한 이유야.',
        bodyEn: "The 21st century belongs to Asia. Imagine what happens when 1.4 billion people start consuming. Korea is right in the middle of this trend. That's why global perspective matters.",
        gift: { type: 'credits', amount: 3 },
      },
    ],
    friend: [
      {
        subject: '여행에서 배운 투자 교훈',
        subjectEn: 'Investment Lessons from Travel',
        body: '친구에게. 오토바이로 시베리아를 횡단할 때, 기름이 떨어질 뻔한 적이 있어. 투자도 마찬가지야. 항상 예비 연료(현금)를 갖고 있어야 해. 올인하면 안 돼. 여행의 제1법칙이기도 하지.',
        bodyEn: "When crossing Siberia by motorcycle, I nearly ran out of fuel. Same in investing — always keep reserve fuel (cash). Never go all-in. That's also Rule #1 of travel.",
        gift: { type: 'credits', amount: 5 },
      },
    ],
    close_friend: [
      {
        subject: '신흥시장의 보물',
        subjectEn: 'Treasures of Emerging Markets',
        body: '다음엔 같이 신흥시장 가보자고! 베트남, 인도, 우즈베키스탄... 남들이 안 가는 곳에 보물이 있어. 내가 86개국을 돌면서 배운 건, "길이 험할수록 보물이 크다"는 거야.',
        bodyEn: "Let's visit emerging markets together! Vietnam, India, Uzbekistan... treasures are where others won't go. In 86 countries I learned: 'The rougher the road, the greater the treasure.'",
        gift: { type: 'credits', amount: 10 },
      },
    ],
    best_friend: [
      {
        subject: '함께 여행할 동반자에게',
        subjectEn: 'To My Travel Companion',
        body: '자네는 이제 세계를 보는 눈이 생겼어. 코스피만 보던 사람이 글로벌 매크로를 이해하기 시작했다니! 이 여행은 끝이 없어. 다음 목적지는 자네가 정해.',
        bodyEn: "You've developed a global perspective. From only watching KOSPI to understanding global macro! This journey never ends. You pick the next destination.",
        gift: { type: 'credits', amount: 15 },
      },
    ],
  },
};

// ============================================================================
// 편지 도착 확인 & 배달 시스템
// ============================================================================

/**
 * 새 편지가 도착했는지 확인
 *
 * 우정 레벨에 따라 아직 받지 않은 편지가 있으면 배달
 * 하루 최대 1통 (서프라이즈 느낌 유지)
 *
 * @param friendships 각 구루와의 우정 상태 맵
 * @returns 새로 도착한 편지 배열
 */
export async function checkForNewLetters(
  friendships: Map<string, { tier: FriendshipTier; score: number }>,
): Promise<GuruLetter[]> {
  // 마지막 체크 시간 확인 (24시간 쿨다운)
  const lastCheck = await getLastCheckTime();
  if (lastCheck && Date.now() - lastCheck < LETTER_CHECK_INTERVAL) {
    return [];
  }

  const existingLetters = await getAllLettersInternal();
  const existingIds = new Set(existingLetters.map(l => l.templateId || ''));
  const newLetters: InternalLetter[] = [];

  for (const [guruId, friendship] of friendships) {
    const guruTemplates = LETTER_TEMPLATES[guruId];
    if (!guruTemplates) continue;

    // 현재 우정 단계까지의 모든 편지 템플릿 확인
    const tierOrder: FriendshipTier[] = ['stranger', 'acquaintance', 'friend', 'close_friend', 'best_friend', 'soulmate'];
    const currentTierIndex = tierOrder.indexOf(friendship.tier);

    for (let i = 0; i <= currentTierIndex; i++) {
      const tier = tierOrder[i];
      const templates = guruTemplates[tier] || [];

      for (let j = 0; j < templates.length; j++) {
        const templateId = `${guruId}_${tier}_${j}`;

        // 이미 받은 편지는 스킵
        if (existingIds.has(templateId)) continue;

        // 하루에 1통만 배달
        if (newLetters.length >= 1) break;

        const template = templates[j];
        const now = new Date().toISOString();

        const letter: InternalLetter = {
          // GuruLetter 필수 필드 (village.ts 호환)
          id: `letter_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          fromGuruId: guruId,
          subject: template.subject,
          subjectEn: template.subjectEn,
          body: template.body,
          bodyEn: template.bodyEn,
          timestamp: now,
          isRead: false,
          friendshipRequired: tier,
          // 선물이 있으면 attachedItem에 설명 문자열로 저장
          attachedItem: template.gift
            ? `${template.gift.amount} credits`
            : undefined,
          // 내부 확장 필드
          templateId,
          gift: template.gift,
        };

        newLetters.push(letter);
      }

      if (newLetters.length >= 1) break;
    }

    if (newLetters.length >= 1) break;
  }

  // 새 편지가 있으면 저장
  if (newLetters.length > 0) {
    const allLetters: InternalLetter[] = [...existingLetters, ...newLetters];
    await saveLetters(allLetters);
  }

  // 마지막 체크 시간 업데이트
  await setLastCheckTime(Date.now());

  // GuruLetter[] 타입으로 반환 (InternalLetter는 GuruLetter를 extends)
  return newLetters;
}

// ============================================================================
// 편지 CRUD
// ============================================================================

/**
 * 모든 수신 편지 가져오기 (최신순 정렬)
 */
export async function getAllLetters(): Promise<GuruLetter[]> {
  return getAllLettersInternal();
}

/**
 * 내부 편지 목록 조회 (InternalLetter 타입으로 반환)
 */
async function getAllLettersInternal(): Promise<InternalLetter[]> {
  try {
    const raw = await AsyncStorage.getItem(LETTERS_KEY);
    if (!raw) return [];

    const letters = JSON.parse(raw) as InternalLetter[];
    // 최신순 정렬
    return letters.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  } catch {
    return [];
  }
}

/**
 * 편지 읽음 처리
 */
export async function markLetterRead(letterId: string): Promise<void> {
  try {
    const letters = await getAllLettersInternal();
    const updated = letters.map(l =>
      l.id === letterId ? { ...l, isRead: true } : l,
    );
    await saveLetters(updated);
  } catch {
    // 실패 무시
  }
}

/**
 * 읽지 않은 편지 수
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const letters = await getAllLetters();
    return letters.filter(l => !l.isRead).length;
  } catch {
    return 0;
  }
}

/**
 * 특정 구루의 편지만 가져오기
 */
export async function getLettersByGuru(guruId: string): Promise<GuruLetter[]> {
  const all = await getAllLetters();
  return all.filter(l => l.fromGuruId === guruId);
}

// ============================================================================
// 내부 유틸
// ============================================================================

/** 편지 목록 저장 */
async function saveLetters(letters: InternalLetter[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LETTERS_KEY, JSON.stringify(letters));
  } catch {
    // 저장 실패 무시
  }
}

/** 마지막 체크 시간 가져오기 */
async function getLastCheckTime(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_CHECK_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

/** 마지막 체크 시간 저장 */
async function setLastCheckTime(timestamp: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_CHECK_KEY, timestamp.toString());
  } catch {
    // 저장 실패 무시
  }
}
