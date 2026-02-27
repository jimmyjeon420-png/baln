/**
 * 구루 토론 주제 & 상호작용 패턴 데이터
 *
 * 역할: 마을에서 구루들이 자연스럽게 토론하는 대사와 주제를 관리
 * 비유: "토론 대본집" — 10명 구루가 어떤 주제로 부딪히고, 서로 만나면 뭐라고 하는지 정리
 *
 * 모든 대사는 실제 역사적 발언/사건 기반
 * 대사 스타일: 각 캐릭터 고유 말투 반영 (존댓말/반말/장난 등)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuruDebate {
  /** 고유 ID */
  id: string;
  /** 토론 주제 (한국어) */
  topic: string;
  /** 토론 주제 (영어) */
  topicEn: string;
  /** 관련 주제 태그 */
  tags: DebateTag[];
  /** 토론 참여자 (2~4명) */
  participants: DebateParticipant[];
  /** 실제 사건 기반인지 */
  realEvent?: boolean;
  /** 사건 연도 */
  year?: number;
}

export type DebateTag =
  | 'bitcoin'
  | 'ai'
  | 'value_investing'
  | 'growth'
  | 'macro'
  | 'risk'
  | 'crypto'
  | 'banks'
  | 'innovation'
  | 'china'
  | 'commodities'
  | 'bubble';

export interface DebateParticipant {
  guruId: string;
  /** 이 주제에 대한 입장 */
  stance: 'for' | 'against' | 'neutral';
  /** 대표 발언 (한국어) */
  line: string;
  /** 대표 발언 (영어) */
  lineEn: string;
}

export interface GuruInteractionPattern {
  /** 두 구루 사이 관계 */
  guru1: string;
  guru2: string;
  /** 관계 유형 */
  relationship: 'rivalry' | 'alliance' | 'respect' | 'teasing';
  /** 상호작용 대사 패턴들 (guru1 -> guru2 방향) */
  interactions: InteractionLine[];
}

export interface InteractionLine {
  /** 어떤 상황에서 발생하는지 */
  trigger: string;
  /** guru1이 하는 말 */
  guru1Says: string;
  /** guru2가 답하는 말 */
  guru2Replies: string;
}

// ---------------------------------------------------------------------------
// Debate Topics (25개)
// ---------------------------------------------------------------------------

export const GURU_DEBATES: GuruDebate[] = [
  // =========================================================================
  // 비트코인 논쟁 (7개)
  // =========================================================================
  {
    id: 'btc-rat-poison',
    topic: '비트코인은 쥐약인가, 디지털 에너지인가',
    topicEn: 'Bitcoin: Rat Poison or Digital Energy?',
    tags: ['bitcoin', 'crypto', 'value_investing'],
    realEvent: true,
    year: 2018,
    participants: [
      {
        guruId: 'buffett',
        stance: 'against',
        line: '비트코인은 쥐약의 제곱이야. 아무것도 생산하지 않는 걸 왜 사는 건지, 난 도저히 이해를 못 하겠어.',
        lineEn: "Bitcoin is rat poison squared. I cannot understand why anyone buys something that produces nothing.",
      },
      {
        guruId: 'saylor',
        stance: 'for',
        line: '버핏 선생님, 존경하지만 비트코인은 디지털 에너지입니다. 우주에서 가장 순수한 에너지 저장소예요.',
        lineEn: "With all respect Mr. Buffett, Bitcoin is digital energy. It's the purest form of energy storage in the universe.",
      },
    ],
  },
  {
    id: 'btc-fraud-or-revolution',
    topic: '비트코인은 사기인가, 혁명인가',
    topicEn: 'Bitcoin: Fraud or Revolution?',
    tags: ['bitcoin', 'crypto', 'banks'],
    realEvent: true,
    year: 2017,
    participants: [
      {
        guruId: 'dimon',
        stance: 'against',
        line: '비트코인은 사기야. 우리 JP모건 직원이 비트코인 거래하면 즉시 해고할 거야. 바보짓이니까.',
        lineEn: "Bitcoin is a fraud. I'd fire any JPMorgan trader trading Bitcoin in a second — for being stupid.",
      },
      {
        guruId: 'saylor',
        stance: 'for',
        line: '다이먼, 네 은행이 만드는 돈은 매년 8%씩 녹아내리잖아. 비트코인은 절대 그렇지 않아.',
        lineEn: "Dimon, your bank's money depreciates 8% a year. Bitcoin will never do that.",
      },
    ],
  },
  {
    id: 'btc-doge-vs-banks',
    topic: '도지코인/비트코인 vs 전통 금융',
    topicEn: 'Crypto Culture vs Traditional Banking',
    tags: ['bitcoin', 'crypto', 'banks', 'innovation'],
    realEvent: true,
    year: 2021,
    participants: [
      {
        guruId: 'musk',
        stance: 'for',
        line: '도지코인은 국민의 화폐야! 은행은 너무 느려. 우리는 화성에서도 쓸 수 있는 돈이 필요해.',
        lineEn: "Doge is the people's currency! Banks are too slow. We need money that works on Mars too.",
      },
      {
        guruId: 'dimon',
        stance: 'against',
        line: '밈으로 금융 시스템을 흔들 수 있다고? 재밌는 농담이군. 규제가 다 정리해줄 거야.',
        lineEn: "You think memes can shake the financial system? Amusing joke. Regulation will sort it out.",
      },
    ],
  },
  {
    id: 'btc-dalio-pivot',
    topic: '달리오의 비트코인 전향: "현금보다는 낫다"',
    topicEn: "Dalio's Bitcoin Pivot: Better Than Cash",
    tags: ['bitcoin', 'crypto', 'macro'],
    realEvent: true,
    year: 2021,
    participants: [
      {
        guruId: 'dalio',
        stance: 'neutral',
        line: '원래 비트코인에 회의적이었지만, 현금이 쓰레기인 세상에서 비트코인은 고려할 가치가 있어. 다만, 포트폴리오의 극히 일부만.',
        lineEn: "I was skeptical of Bitcoin, but in a world where cash is trash, Bitcoin deserves consideration. Just a small allocation though.",
      },
      {
        guruId: 'saylor',
        stance: 'for',
        line: '달리오, 자네가 드디어 깨달은 거야! 근데 "극히 일부"라니... 올인해야지, 뭘 망설여!',
        lineEn: "Dalio, you finally get it! But 'small allocation'? You should go all-in, what are you hesitating for!",
      },
      {
        guruId: 'buffett',
        stance: 'against',
        line: '레이, 자네마저 그러나. 현금이 쓰레기라고? 보험 청구할 때 비트코인으로 받을 건가?',
        lineEn: "Et tu, Ray? Cash is trash? Will you pay insurance claims in Bitcoin?",
      },
    ],
  },
  {
    id: 'btc-500k-vs-zero',
    topic: '비트코인 50만 달러 vs 가치 없음',
    topicEn: 'Bitcoin to $500K vs Worthless',
    tags: ['bitcoin', 'crypto', 'growth'],
    realEvent: true,
    year: 2024,
    participants: [
      {
        guruId: 'cathie_wood',
        stance: 'for',
        line: '비트코인은 2030년까지 50만 달러 갑니다. 기관 자금이 아직 1%도 안 들어왔어요. 이건 인터넷 1997년이에요.',
        lineEn: "Bitcoin is going to $500K by 2030. Institutional money hasn't even reached 1%. This is the internet in 1997.",
      },
      {
        guruId: 'dimon',
        stance: 'against',
        line: '50만 달러? 난 비트코인에 관심 없어. 개인적으로는 절대 안 사. 고객이 원하면... 그건 고객 자유지.',
        lineEn: "$500K? I don't care about Bitcoin. I'd never buy it personally. If clients want it... that's their freedom.",
      },
    ],
  },
  {
    id: 'btc-sell-brk-buy-btc',
    topic: '세일러 "BRK 팔고 BTC 사라" 트윗 사건',
    topicEn: 'Saylor Tells Buffett to Sell BRK for BTC',
    tags: ['bitcoin', 'crypto', 'value_investing'],
    realEvent: true,
    year: 2021,
    participants: [
      {
        guruId: 'saylor',
        stance: 'for',
        line: '버핏이 1,440억 달러 현금을 쥐고 있다고? 그걸 비트코인으로 바꾸면 버크셔 시총이 2배로 뛸 텐데!',
        lineEn: "Buffett is sitting on $144B cash? Convert that to Bitcoin and Berkshire's market cap doubles!",
      },
      {
        guruId: 'buffett',
        stance: 'against',
        line: '허허, 세상의 모든 비트코인을 25달러에 줘도 안 살 거야. 아무것도 생산하지 않는 걸 뭘 하겠나.',
        lineEn: "Heh, I wouldn't buy all the Bitcoin in the world for $25. It doesn't produce anything.",
      },
    ],
  },
  {
    id: 'btc-diversify-vs-allin',
    topic: '다각화 vs 올인: 비트코인 배분 논쟁',
    topicEn: 'Diversification vs All-In: Bitcoin Allocation',
    tags: ['bitcoin', 'crypto', 'risk', 'macro'],
    participants: [
      {
        guruId: 'dalio',
        stance: 'against',
        line: '어떤 자산이든 올인은 미친 짓이야. 성배는 15개 이상의 비상관 자산 스트림이지, 하나에 몰빵하는 게 아니라.',
        lineEn: "Going all-in on anything is crazy. The holy grail is 15+ uncorrelated return streams, not betting everything on one.",
      },
      {
        guruId: 'saylor',
        stance: 'for',
        line: '다각화는 무지의 방어야. 최고의 자산을 찾았으면 전부 넣어야지. 비트코인이 바로 그 자산이야.',
        lineEn: "Diversification is protection against ignorance. When you find the best asset, you go all-in. Bitcoin is that asset.",
      },
    ],
  },

  // =========================================================================
  // AI/혁신 논쟁 (5개)
  // =========================================================================
  {
    id: 'ai-disruption-vs-moat',
    topic: '파괴적 혁신 vs 경제적 해자',
    topicEn: 'Disruptive Innovation vs Economic Moats',
    tags: ['ai', 'innovation', 'value_investing', 'growth'],
    participants: [
      {
        guruId: 'cathie_wood',
        stance: 'for',
        line: '코카콜라 해자요? AI와 로봇이 모든 해자를 무너뜨릴 겁니다. 5년 뒤엔 테슬라가 코카콜라 시총 10배예요.',
        lineEn: "Coca-Cola's moat? AI and robotics will destroy every moat. In 5 years Tesla will be 10x Coca-Cola's market cap.",
      },
      {
        guruId: 'buffett',
        stance: 'against',
        line: '50년째 코카콜라 배당 받고 있는데, 그 동안 "파괴적 혁신"이 몇 개나 사라졌는지 세어봤나?',
        lineEn: "I've been collecting Coca-Cola dividends for 50 years. How many 'disruptive innovations' have died in that time?",
      },
    ],
  },
  {
    id: 'ai-everything-vs-bubble',
    topic: 'AI가 모든 것을 바꾼다 vs AI 거품 경고',
    topicEn: 'AI Changes Everything vs AI Bubble Warning',
    tags: ['ai', 'innovation', 'bubble', 'risk'],
    participants: [
      {
        guruId: 'musk',
        stance: 'for',
        line: 'AI는 인류 역사상 가장 강력한 기술이야. 핵보다 위험할 수도 있지만, 잘 쓰면 문명이 도약해.',
        lineEn: "AI is the most powerful technology in human history. Potentially more dangerous than nukes, but used well, civilization leaps.",
      },
      {
        guruId: 'marks',
        stance: 'against',
        line: '"이번엔 달라"는 투자에서 가장 위험한 네 글자야. AI도 결국 밸류에이션의 법칙을 피할 수 없어.',
        lineEn: '"This time is different" are the four most dangerous words in investing. AI won\'t escape valuation laws.',
      },
    ],
  },
  {
    id: 'ai-bubble-vs-5year',
    topic: 'AI 버블인가, 5년 후를 봐야 하는가',
    topicEn: 'AI Bubble Now vs Look 5 Years Out',
    tags: ['ai', 'bubble', 'growth', 'innovation'],
    participants: [
      {
        guruId: 'druckenmiller',
        stance: 'against',
        line: 'AI 관련주 멀티플이 말이 안 돼. 2000년 닷컴 냄새가 나. 난 엔비디아 익절했어.',
        lineEn: "AI stock multiples make no sense. It smells like 2000 dot-com to me. I already took profits on NVIDIA.",
      },
      {
        guruId: 'cathie_wood',
        stance: 'for',
        line: '드러킨밀러, 5년 후를 보세요. AI는 닷컴이 아니라 전기에요. 모든 산업의 기본 인프라가 됩니다.',
        lineEn: "Druckenmiller, look 5 years out. AI isn't dot-com, it's electricity. It becomes base infrastructure for every industry.",
      },
    ],
  },
  {
    id: 'ai-btc-bigger-innovation',
    topic: 'BTC가 더 큰 혁신인가, AI가 더 큰 혁신인가',
    topicEn: 'BTC vs AI: Which Is the Bigger Revolution?',
    tags: ['bitcoin', 'ai', 'innovation', 'crypto'],
    participants: [
      {
        guruId: 'saylor',
        stance: 'for',
        line: 'AI가 대단하긴 하지, 근데 AI 회사도 결국 자산을 보관할 곳이 필요하잖아. 그게 비트코인이야.',
        lineEn: "AI is great, but AI companies still need a place to store their wealth. That's Bitcoin.",
      },
      {
        guruId: 'cathie_wood',
        stance: 'against',
        line: '세일러, AI는 연간 25조 달러 생산성을 만들어요. 비트코인은 가치 저장이지, 가치 창출이 아니잖아요.',
        lineEn: "Saylor, AI creates $25T in annual productivity. Bitcoin stores value, it doesn't create it.",
      },
    ],
  },
  {
    id: 'ai-understand-vs-create',
    topic: '이해하는 것에만 투자 vs 미래를 만든다',
    topicEn: 'Invest in What You Know vs Build the Future',
    tags: ['ai', 'innovation', 'value_investing'],
    participants: [
      {
        guruId: 'lynch',
        stance: 'against',
        line: '내가 말하는 "아는 것에 투자하라"는 뜻은, 슈퍼마켓에서 확인할 수 있는 걸 사라는 거야. AI 칩? 만져볼 수나 있나?',
        lineEn: 'My "invest in what you know" means buy what you can verify at the supermarket. AI chips? Can you even touch them?',
      },
      {
        guruId: 'musk',
        stance: 'for',
        line: '린치 선생님, 슈퍼마켓은 곧 AI 로봇이 운영할 건데요. 미래를 이해하려면 미래를 만들어야 해요.',
        lineEn: "Mr. Lynch, supermarkets will soon be run by AI robots. To understand the future, you have to build it.",
      },
    ],
  },

  // =========================================================================
  // 가치투자 vs 성장투자 (4개)
  // =========================================================================
  {
    id: 'value-coke-vs-tesla',
    topic: '코카콜라 vs 테슬라: 어디에 투자할 것인가',
    topicEn: 'Coca-Cola vs Tesla: Where to Invest?',
    tags: ['value_investing', 'growth', 'innovation'],
    participants: [
      {
        guruId: 'buffett',
        stance: 'for',
        line: '코카콜라는 100년 뒤에도 팔릴 거야. 테슬라가 100년 뒤에도 있을까? 난 잘 모르겠는데.',
        lineEn: "Coca-Cola will still be selling in 100 years. Will Tesla exist in 100 years? I'm not so sure.",
      },
      {
        guruId: 'cathie_wood',
        stance: 'against',
        line: '코카콜라 연 성장률 3%에 만족하실 건가요? 테슬라는 로보택시만으로 10조 달러 기업이 됩니다.',
        lineEn: "Satisfied with Coca-Cola's 3% annual growth? Tesla becomes a $10T company with robotaxi alone.",
      },
    ],
  },
  {
    id: 'value-secondorder-vs-optimism',
    topic: '2차적 사고 vs 1차원 낙관',
    topicEn: 'Second-Level Thinking vs First-Order Optimism',
    tags: ['value_investing', 'growth', 'risk', 'bubble'],
    participants: [
      {
        guruId: 'marks',
        stance: 'against',
        line: '1차적 사고는 "좋은 회사니까 산다"야. 2차적 사고는 "좋은 회사지만 이미 다 반영됐나?"를 묻는 거야.',
        lineEn: 'First-level thinking says "great company, buy." Second-level asks "great company, but is it already priced in?"',
      },
      {
        guruId: 'cathie_wood',
        stance: 'for',
        line: '막스, 그 2차적 사고로 테슬라 100달러에서 팔았죠? 지금 몇 배인지 아세요?',
        lineEn: "Marks, that second-level thinking made you sell Tesla at $100, right? Know what it's worth now?",
      },
    ],
  },
  {
    id: 'value-legwork-vs-rocket',
    topic: '발로 뛰는 투자 vs 로켓 투자',
    topicEn: 'Shoe-Leather Investing vs Rocket Investing',
    tags: ['value_investing', 'innovation', 'growth'],
    participants: [
      {
        guruId: 'lynch',
        stance: 'for',
        line: '투자는 발로 뛰는 거야. 주차장에 차가 많으면 그 가게 주식을 사. 이게 진짜 리서치야.',
        lineEn: "Investing is done on foot. If the parking lot's full, buy that store's stock. That's real research.",
      },
      {
        guruId: 'musk',
        stance: 'against',
        line: '린치 교수님, 저는 화성에 주차장을 만들 건데요. 거기까지 걸어가실 건가요?',
        lineEn: "Professor Lynch, I'm building a parking lot on Mars. Will you walk there to check it out?",
      },
    ],
  },
  {
    id: 'value-coalition-vs-innovation',
    topic: '가치투자 연합 vs 혁신파 연합',
    topicEn: 'Value Coalition vs Innovation Alliance',
    tags: ['value_investing', 'growth', 'innovation', 'bitcoin'],
    participants: [
      {
        guruId: 'buffett',
        stance: 'for',
        line: '피터, 하워드, 우리 셋이 옳다는 건 시간이 증명해줄 거야. 조급해하지 말자고.',
        lineEn: "Peter, Howard, time will prove us three right. Let's not be in a hurry.",
      },
      {
        guruId: 'lynch',
        stance: 'for',
        line: '동의해요, 워렌. 역사적으로 밸류에이션 무시한 투자가 잘 끝난 적이 없어요.',
        lineEn: "Agreed, Warren. Historically, investing while ignoring valuation has never ended well.",
      },
      {
        guruId: 'cathie_wood',
        stance: 'against',
        line: '역사? 역사에 AI도, 유전체 혁명도, 비트코인도 없었잖아요. 이번엔 진짜 달라요.',
        lineEn: "History? History had no AI, no genomic revolution, no Bitcoin. This time it really is different.",
      },
      {
        guruId: 'saylor',
        stance: 'against',
        line: '가치투자 3인방이 코카콜라 배당 세는 동안, 비트코인은 10년에 200배 올랐어.',
        lineEn: "While the value trio counted Coca-Cola dividends, Bitcoin went up 200x in a decade.",
      },
    ],
  },

  // =========================================================================
  // 매크로/글로벌 논쟁 (5개)
  // =========================================================================
  {
    id: 'macro-debt-crisis-vs-optimism',
    topic: '부채 위기가 온다 vs 시스템은 견딘다',
    topicEn: 'Debt Crisis Coming vs System Will Hold',
    tags: ['macro', 'risk', 'banks'],
    realEvent: true,
    year: 2022,
    participants: [
      {
        guruId: 'dalio',
        stance: 'for',
        line: '장기 부채 사이클 끝에 와있어. 미국 부채가 GDP의 130%야. 이건 구조적 문제지, 경기순환이 아니야.',
        lineEn: "We're at the end of a long-term debt cycle. US debt is 130% of GDP. This is structural, not cyclical.",
      },
      {
        guruId: 'dimon',
        stance: 'against',
        line: '미국 경제 근본은 튼튼해. 소비자 건강하고, 은행은 자본 충분하고. 위기론은 매년 나와.',
        lineEn: "US economic fundamentals are solid. Consumers are healthy, banks well-capitalized. Crisis theories come every year.",
      },
    ],
  },
  {
    id: 'macro-dollar-collapse-vs-defend',
    topic: '달러 붕괴론 vs 달러 패권 수호',
    topicEn: 'Dollar Collapse vs Dollar Hegemony',
    tags: ['macro', 'commodities', 'china'],
    realEvent: true,
    year: 2020,
    participants: [
      {
        guruId: 'rogers',
        stance: 'for',
        line: '미국이 찍어내는 달러가 얼마인지 알아? 역사상 이렇게 돈 풀고 무사했던 제국은 없어. 난 금과 은을 사고 있어.',
        lineEn: "Know how many dollars the US is printing? No empire in history printed this much and survived. I'm buying gold and silver.",
      },
      {
        guruId: 'dimon',
        stance: 'against',
        line: '달러를 대체할 게 뭔데? 위안화? 유로? 비트코인? 다 웃기지. 달러는 100년 더 간다.',
        lineEn: "What replaces the dollar? Yuan? Euro? Bitcoin? All laughable. The dollar lasts another 100 years.",
      },
    ],
  },
  {
    id: 'macro-concentrated-vs-diversified',
    topic: '집중투자 vs 다각화: 매크로 트레이더의 선택',
    topicEn: 'Concentrated vs Diversified: Macro Trader Edition',
    tags: ['macro', 'risk'],
    participants: [
      {
        guruId: 'druckenmiller',
        stance: 'for',
        line: '확신이 있으면 몰아넣어. 소로스한테 배운 최고의 교훈은 "맞으면 크게 가라"야.',
        lineEn: "When you have conviction, go big. The best lesson from Soros: when you're right, size up.",
      },
      {
        guruId: 'dalio',
        stance: 'against',
        line: '스탠, 자네 실력은 인정하지만 그건 자네니까 되는 거야. 보통 투자자에겐 올웨더가 답이야.',
        lineEn: "Stan, I respect your skill, but that works because you're you. For normal investors, All Weather is the answer.",
      },
    ],
  },
  {
    id: 'macro-china-bull-vs-usa-bull',
    topic: '중국 낙관론 vs 미국 낙관론',
    topicEn: 'Bull on China vs Bull on America',
    tags: ['china', 'macro', 'growth'],
    realEvent: true,
    year: 2019,
    participants: [
      {
        guruId: 'rogers',
        stance: 'for',
        line: '21세기는 중국 세기야. 내 딸한테 중국어 가르치는 이유가 있어. 아시아에 돈이 몰릴 거야.',
        lineEn: "The 21st century is China's century. There's a reason I teach my daughter Chinese. Money will flow to Asia.",
      },
      {
        guruId: 'buffett',
        stance: 'against',
        line: '중국도 좋지만, 미국에 반대로 베팅해서 돈 번 사람은 한 명도 없었어. 절대로.',
        lineEn: "China is fine, but nobody has ever made money betting against America. Never.",
      },
    ],
  },
  {
    id: 'macro-cash-trash-vs-king',
    topic: '"현금은 쓰레기" vs "현금은 왕"',
    topicEn: 'Cash Is Trash vs Cash Is King',
    tags: ['macro', 'risk', 'banks'],
    realEvent: true,
    year: 2020,
    participants: [
      {
        guruId: 'dalio',
        stance: 'for',
        line: '현금은 쓰레기야. 인플레이션이 매년 현금 가치를 갉아먹고 있어. 실물자산과 주식을 들어야 해.',
        lineEn: "Cash is trash. Inflation eats cash value every year. You need real assets and equities.",
      },
      {
        guruId: 'dimon',
        stance: 'against',
        line: '레이, 2008년에 현금 없던 회사들이 어떻게 됐는지 기억 안 나? 현금은 위기 때 왕이야.',
        lineEn: "Ray, remember what happened to companies without cash in 2008? Cash is king in a crisis.",
      },
      {
        guruId: 'buffett',
        stance: 'neutral',
        line: '현금이 쓰레기인 건 맞지만, 기회가 올 때 현금이 없으면 구경만 해야 해. 나는 항상 총알을 남겨둬.',
        lineEn: "Cash is trash, true, but without cash when opportunity knocks, you just watch. I always keep ammo.",
      },
    ],
  },

  // =========================================================================
  // 재미/가벼운 논쟁 (4개)
  // =========================================================================
  {
    id: 'fun-boring-portfolio',
    topic: '"할아버지 포트폴리오 너무 심심해요"',
    topicEn: '"Grandpa, Your Portfolio Is So Boring"',
    tags: ['value_investing', 'innovation'],
    participants: [
      {
        guruId: 'musk',
        stance: 'for',
        line: '버핏 할아버지, 포트폴리오에 코카콜라, 보험, 철도밖에 없어요? 로켓 한 대라도 넣어보세요!',
        lineEn: "Grandpa Buffett, your portfolio is just Coca-Cola, insurance, and railroads? At least add one rocket!",
      },
      {
        guruId: 'buffett',
        stance: 'against',
        line: '일론, "심심한" 포트폴리오가 63년간 연 20% 복리를 찍었단다. 자네 테슬라 변동성은 내 심장에 안 좋아.',
        lineEn: 'Elon, this "boring" portfolio compounded at 20% for 63 years. Your Tesla volatility isn\'t good for my heart.',
      },
    ],
  },
  {
    id: 'fun-supermarket-atm',
    topic: '"슈퍼마켓? 비트코인 ATM이나 찾으세요"',
    topicEn: '"Supermarket? Go Find a Bitcoin ATM"',
    tags: ['bitcoin', 'value_investing', 'crypto'],
    participants: [
      {
        guruId: 'saylor',
        stance: 'for',
        line: '린치, 아직도 슈퍼마켓에서 투자 아이디어 찾아? 시대가 변했어. 비트코인 ATM이 바로 옆에 있다고!',
        lineEn: "Lynch, still finding investment ideas at the supermarket? Times have changed. There's a Bitcoin ATM right next door!",
      },
      {
        guruId: 'lynch',
        stance: 'against',
        line: '세일러, 비트코인 ATM에서 뭘 사? 물건이라도 나와? 슈퍼마켓에선 적어도 쇼핑백이 나오지.',
        lineEn: "Saylor, what do you buy at a Bitcoin ATM? Does anything come out? At least you get a shopping bag at the supermarket.",
      },
    ],
  },
  {
    id: 'fun-mars-vs-vietnam',
    topic: '"화성보다 베트남이 투자처"',
    topicEn: '"Vietnam Over Mars for Investment"',
    tags: ['innovation', 'macro', 'china'],
    participants: [
      {
        guruId: 'rogers',
        stance: 'for',
        line: '일론, 화성에 뭐가 있어? 베트남에 오토바이 타고 다녀봐. 진짜 기회는 땅 위에 있다고.',
        lineEn: "Elon, what's on Mars? Ride a motorcycle through Vietnam. Real opportunities are on the ground.",
      },
      {
        guruId: 'musk',
        stance: 'against',
        line: '로저스, 베트남 오토바이여행 재밌었겠지만, 화성 식민지가 수조 달러 시장을 열어. 지구에만 갇혀 있을 건가?',
        lineEn: "Rogers, your Vietnam motorcycle trip was fun, but Mars colonization opens a trillion-dollar market. Staying on Earth?",
      },
    ],
  },
  {
    id: 'fun-memo-vs-btc',
    topic: '"메모를 읽어봐, 그게 진짜 자산이야"',
    topicEn: '"Read My Memo, That\'s the Real Asset"',
    tags: ['value_investing', 'bitcoin', 'risk'],
    participants: [
      {
        guruId: 'marks',
        stance: 'for',
        line: '세일러, 내 오크트리 메모 30년치 읽어봤어? 거기에 진짜 자산이 있어. 비트코인 말고.',
        lineEn: "Saylor, have you read 30 years of my Oaktree memos? That's where real assets are. Not Bitcoin.",
      },
      {
        guruId: 'saylor',
        stance: 'against',
        line: '막스 형, 메모 좋죠. 근데 그 메모 30년치 수익률이 비트코인 3년치를 못 이기잖아요?',
        lineEn: "Marks, love the memos. But 30 years of memo returns can't beat 3 years of Bitcoin, right?",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Interaction Patterns (15쌍)
// ---------------------------------------------------------------------------

export const GURU_INTERACTION_PATTERNS: GuruInteractionPattern[] = [
  // 1. 버핏 <-> 세일러 (rivalry)
  {
    guru1: 'buffett',
    guru2: 'saylor',
    relationship: 'rivalry',
    interactions: [
      {
        trigger: '비트코인 급등 시',
        guru1Says: '세일러, 자네 또 BTC 샀나? 그건 쥐약의 제곱이라니까.',
        guru2Replies: '버핏 선생님, 존경하지만 디지털 에너지를 이해해주세요. BRK보다 수익률이...',
      },
      {
        trigger: '비트코인 급락 시',
        guru1Says: '세일러, 자네 MicroStrategy 장부가 좀 아프겠구먼. 내가 뭐랬어.',
        guru2Replies: '일시적 변동이에요. 4년 주기를 보세요. 장기적으론 우리가 이깁니다.',
      },
      {
        trigger: '버크셔 실적 발표 후',
        guru1Says: '올해도 보험 플로트로 300억 벌었어. 이게 진짜 복리의 힘이야.',
        guru2Replies: '300억요? 비트코인은 지난 10년간 200배 올랐는데요.',
      },
      {
        trigger: '현금 보유 논쟁',
        guru1Says: '1,440억 달러 현금이 있으면 기회가 올 때 잡을 수 있어. 인내의 미학이지.',
        guru2Replies: '그 현금이 매년 8%씩 녹아내리는 건 괜찮으세요? 비트코인에 넣으시면...',
      },
      {
        trigger: '주주총회 시즌',
        guru1Says: '매년 5만 명이 오마하에 모여. 이게 주주가치야. 비트코인엔 주주총회가 있나?',
        guru2Replies: '5만 명이요? 비트코인 커뮤니티는 수억 명인데요. 매일이 총회입니다.',
      },
    ],
  },

  // 2. 버핏 <-> 캐시우드 (teasing)
  {
    guru1: 'buffett',
    guru2: 'cathie_wood',
    relationship: 'teasing',
    interactions: [
      {
        trigger: 'ARKK 급등 시',
        guru1Says: '캐시, 요즘 잘되나 보구먼. 근데 나무가 하늘까지 자라진 않는다고...',
        guru2Replies: '버핏 선생님, 전기차 나무는 우주까지 자라요. 올드 이코노미와는 달라요.',
      },
      {
        trigger: 'ARKK 급락 시',
        guru1Says: '캐시, 괜찮나? 투자는 마라톤이야. 조급해하지 말고.',
        guru2Replies: '걱정 감사해요. 하지만 우리 분석 모델은 5년을 봅니다. 단기 변동은 소음이에요.',
      },
      {
        trigger: '테슬라 실적 발표',
        guru1Says: '테슬라 PE가 몇 배야? 코카콜라를 10개 살 수 있겠구먼.',
        guru2Replies: '코카콜라 10개 사봤자 설탕물 10배죠. 테슬라 1개가 모빌리티 혁명이에요.',
      },
      {
        trigger: '혁신 기업 IPO 시즌',
        guru1Says: 'IPO 날 사는 건 결혼식 날 배우자를 처음 만나는 것과 같아. 좀 알고 사야지.',
        guru2Replies: '선생님, 우리는 IPO 전부터 2년씩 분석해요. ARK 리서치를 한번 읽어보세요.',
      },
    ],
  },

  // 3. 다이먼 <-> 세일러 (rivalry)
  {
    guru1: 'dimon',
    guru2: 'saylor',
    relationship: 'rivalry',
    interactions: [
      {
        trigger: '비트코인 규제 뉴스',
        guru1Says: '드디어 규제가 들어오는군. 이게 정상이야. 금융은 규칙 안에서 해야 해.',
        guru2Replies: '규제요? 비트코인은 수학이야. 수학을 규제할 수 있으면 해보시지.',
      },
      {
        trigger: 'JP모건 실적 발표',
        guru1Says: '우리 JP모건이 분기 140억 달러 벌었어. 이게 진짜 비즈니스야.',
        guru2Replies: '140억? MicroStrategy 비트코인 보유분 미실현 이익이 그 이상인데.',
      },
      {
        trigger: 'CBDC(중앙은행 디지털 화폐) 논쟁',
        guru1Says: '디지털 달러가 올 거야. 중앙은행이 통제하는 건전한 디지털 통화.',
        guru2Replies: '중앙은행이 통제하는 디지털 화폐? 그냥 감시 시스템 아닌가. 비트코인만이 자유야.',
      },
      {
        trigger: '은행 위기 발생 시',
        guru1Says: '이건 시스템 리스크가 아니야. 개별 은행의 리스크 관리 문제야.',
        guru2Replies: '다이먼, SVB 터졌을 때 비트코인은 올랐어. 누가 진짜 안전자산인지 보여준 거야.',
      },
    ],
  },

  // 4. 머스크 <-> 버핏 (teasing)
  {
    guru1: 'musk',
    guru2: 'buffett',
    relationship: 'teasing',
    interactions: [
      {
        trigger: '테슬라 신차 발표',
        guru1Says: '할아버지, 새 테슬라 나왔어요! 가솔린 차 버리고 한 대 타보세요.',
        guru2Replies: '일론, 나는 아직 2014년형 캐딜락 타고 있어. 잘 굴러가는데 뭘 바꿔.',
      },
      {
        trigger: '주식 시장 폭락',
        guru1Says: '할아버지는 폭락 때 주식 사잖아요? 저도 테슬라 주식 사려고요.',
        guru2Replies: '일론, 자기 회사 주식 사는 건 좋은데, 트위터에 그만 올려. 변동성이 심해져.',
      },
      {
        trigger: '우주 관련 뉴스',
        guru1Says: '스페이스X가 화성 진출하면, 거기서도 보험 팔 수 있죠? 버크셔 화성 지사 어때요?',
        guru2Replies: '화성에서 보험 클레임이 들어오면 처리가 좀 오래 걸리겠구먼. 빛의 속도 문제로.',
      },
      {
        trigger: 'SNS 논란',
        guru1Says: '트위터 하나로 시총 몇 조를 움직이는 건 저뿐이에요. 이것도 능력이죠.',
        guru2Replies: '일론, 입이 가벼운 건 투자자에게 가장 위험한 습관이야. SEC한테 또 걸리지 말고.',
      },
    ],
  },

  // 5. 머스크 <-> 세일러 (alliance)
  {
    guru1: 'musk',
    guru2: 'saylor',
    relationship: 'alliance',
    interactions: [
      {
        trigger: '비트코인 상승',
        guru1Says: '세일러, 우리 비트코인 형제! 오늘도 좋은 날이야.',
        guru2Replies: '일론, 테슬라도 더 사야 해. 비트코인은 멈추지 않아!',
      },
      {
        trigger: '비트코인 에너지 논쟁',
        guru1Says: '비트코인 채굴은 재생에너지로 전환 중이야. 태양광 + 배터리 + 채굴 = 완벽.',
        guru2Replies: '맞아! 비트코인은 좌초 에너지를 화폐화하는 유일한 방법이야.',
      },
      {
        trigger: '전통 금융 비판',
        guru1Says: '은행 시스템이 너무 느려. 돈 보내는 데 3일이 걸리다니, 21세기에!',
        guru2Replies: '비트코인은 10분이면 돼. 전 세계 어디로든. 은행은 공룡이야.',
      },
    ],
  },

  // 6. 달리오 <-> 드러킨밀러 (respect)
  {
    guru1: 'dalio',
    guru2: 'druckenmiller',
    relationship: 'respect',
    interactions: [
      {
        trigger: '연준 금리 결정',
        guru1Says: '스탠, 이번 금리 결정 어떻게 봐? 내 매크로 머신은 경기 둔화 신호를 잡고 있어.',
        guru2Replies: '레이, 동의해. 채권 쪽에서 기회가 보여. 근데 나는 좀 더 공격적으로 갈 생각이야.',
      },
      {
        trigger: '매크로 데이터 발표',
        guru1Says: '고용 데이터가 예상보다 강해. 이건 인플레이션 2차 파동 가능성이 있어.',
        guru2Replies: '나도 같은 생각이야. 근데 레이, 올웨더는 이럴 때 좀 느려. 내가 먼저 움직일게.',
      },
      {
        trigger: '경기 침체 우려',
        guru1Says: '지금이 장기 부채 사이클 전환점이야. 자산배분을 재검토해야 해.',
        guru2Replies: '레이, 자네의 빅 픽처는 항상 존경해. 근데 타이밍은 내가 더 잘 맞출 자신 있어.',
      },
      {
        trigger: '서로의 실적 비교',
        guru1Says: '순수 알파 기준으로는 자네가 역사상 최고의 트레이더야, 스탠.',
        guru2Replies: '고마워, 레이. 하지만 시스템을 만든 건 자네가 한 수 위야. 브리지워터는 예술이야.',
      },
    ],
  },

  // 7. 린치 <-> 막스 (alliance)
  {
    guru1: 'lynch',
    guru2: 'marks',
    relationship: 'alliance',
    interactions: [
      {
        trigger: '성장주 버블 논의',
        guru1Says: '하워드, 요즘 PE 100배짜리가 너무 많아. 이러다가 또 한 번 터질 거야.',
        guru2Replies: '피터, 맞아. 내 최신 메모에도 썼는데, 사람들이 "이번엔 달라"고 또 말하기 시작했어.',
      },
      {
        trigger: '가치주 반등',
        guru1Says: '하워드, 드디어 가치주가 빛을 보는구먼! 역사는 반복돼.',
        guru2Replies: '피터, "진자는 항상 돌아온다"고 내 메모에 썼지. 끝까지 인내한 사람이 웃어.',
      },
      {
        trigger: '일반인 투자 조언 요청 시',
        guru1Says: '슈퍼마켓에서 좋은 물건 보면 그 회사 조사해. 이게 시작이야.',
        guru2Replies: '그리고 그 회사가 좋다고 해서 아무 가격에나 사면 안 돼. 가격이 가치보다 낮을 때만.',
      },
      {
        trigger: '리스크 관리 토론',
        guru1Says: '분산이 핵심이야. 한 종목에 5% 이상은 위험해.',
        guru2Replies: '동의해, 피터. 리스크는 "잘못될 수 있는 확률 x 잘못됐을 때의 손실"로 봐야 해.',
      },
    ],
  },

  // 8. 캐시우드 <-> 머스크 (alliance)
  {
    guru1: 'cathie_wood',
    guru2: 'musk',
    relationship: 'alliance',
    interactions: [
      {
        trigger: '테슬라 목표가 발표',
        guru1Says: '테슬라 목표가 2,000달러로 상향합니다. 로보택시가 게임체인저예요.',
        guru2Replies: '캐시, 역시 비전이 있어! 로보택시 수익만으로도 애플 시총을 넘을 거야.',
      },
      {
        trigger: 'AI 관련 뉴스',
        guru1Says: 'AI가 5대 플랫폼 모두를 재편할 겁니다. 이건 산업혁명 이후 최대 변화예요.',
        guru2Replies: '동의해. xAI가 그 중심에 설 거야. AGI가 오면 세상은 완전히 달라져.',
      },
      {
        trigger: '혁신 기업 투자 비판에 대해',
        guru1Says: '사람들이 ARK를 비웃었죠. 2014년에도, 2022년에도. 하지만 5년 단위로 보면 우리가 맞아요.',
        guru2Replies: '맞아, 캐시. 처음엔 무시하고, 그다음엔 비웃고, 그다음엔 싸우다가, 결국 우리가 이겨.',
      },
    ],
  },

  // 9. 로저스 <-> 달리오 (respect)
  {
    guru1: 'rogers',
    guru2: 'dalio',
    relationship: 'respect',
    interactions: [
      {
        trigger: '신흥국 시장 논의',
        guru1Says: '레이, 자네 올웨더에 신흥국 비중 좀 늘려야 해. 아시아가 세계 경제의 중심이 될 거야.',
        guru2Replies: '짐, 부분적으로 동의해. 브리지워터도 중국 비중을 늘리고 있어. 다만 속도는 조절하고 있지.',
      },
      {
        trigger: '원자재 급등',
        guru1Says: '내가 20년 전부터 원자재 슈퍼사이클 말했잖아. 드디어 시작이야.',
        guru2Replies: '짐의 원자재 통찰은 인정해. 하지만 원자재만으로 포트폴리오를 채우면 위험해. 균형이 필요해.',
      },
      {
        trigger: '달러 약세 논의',
        guru1Says: '달러는 결국 추락해. 역사가 증명해. 모든 기축통화는 수명이 있어.',
        guru2Replies: '동의해, 짐. 장기적으로 달러 헤게모니는 약화될 거야. 질문은 타이밍이지.',
      },
    ],
  },

  // 10. 다이먼 <-> 머스크 (rivalry)
  {
    guru1: 'dimon',
    guru2: 'musk',
    relationship: 'rivalry',
    interactions: [
      {
        trigger: '핀테크 vs 전통 금융',
        guru1Says: 'JP모건은 테크 회사보다 개발자가 더 많아. 우리가 진짜 핀테크야.',
        guru2Replies: '다이먼, 개발자가 많다고 핀테크인 건 아니지. X(트위터)에 결제 넣으면 그게 진짜 핀테크야.',
      },
      {
        trigger: '규제 관련 뉴스',
        guru1Says: '규제는 소비자를 보호하기 위해 존재해. 파괴적 혁신이란 명목으로 규제를 무시하면 안 돼.',
        guru2Replies: '규제가 소비자를 보호한다고? 규제는 기존 사업자를 보호하는 거야. 혁신을 막으면서.',
      },
      {
        trigger: '기업 경영 스타일',
        guru1Says: '은행은 신뢰로 운영돼. 트위터에 밈 올리면서 기업을 경영할 수는 없어.',
        guru2Replies: '밈이 뭐 어때서? 사람들이 좋아하잖아. 기업문화도 재밌어야 해. 지루한 건 죽은 거야.',
      },
    ],
  },

  // 11. 막스 <-> 캐시우드 (rivalry)
  {
    guru1: 'marks',
    guru2: 'cathie_wood',
    relationship: 'rivalry',
    interactions: [
      {
        trigger: '시장 고점 논쟁',
        guru1Says: '내 메모 "바다의 변화" 읽었나? 지금은 신중해야 할 때야. 낙관이 과도해.',
        guru2Replies: '막스, 메모는 항상 잘 읽어요. 하지만 혁신 기업은 전통적 밸류에이션으로 못 봐요.',
      },
      {
        trigger: '고평가 기술주 논쟁',
        guru1Says: '캐시, PE 200배짜리 주식을 사는 건 "이번엔 달라"는 믿음이야. 역사적으로 그건 항상...',
        guru2Replies: '이번엔 진짜 달라요, 막스. AI, 유전체, 블록체인이 동시에 수렴하는 건 역사상 처음이에요.',
      },
      {
        trigger: '포트폴리오 리뷰',
        guru1Says: '좋은 자산을 비싸게 사면 나쁜 투자야. 가격을 잊지 마.',
        guru2Replies: '위대한 자산을 "적정가"에 사면 보통 수익이에요. 우리는 위대한 수익을 원해요.',
      },
    ],
  },

  // 12. 드러킨밀러 <-> 세일러 (teasing)
  {
    guru1: 'druckenmiller',
    guru2: 'saylor',
    relationship: 'teasing',
    interactions: [
      {
        trigger: '비트코인 포지션 공개',
        guru1Says: '세일러, 나도 비트코인 좀 샀어. 근데 자네처럼 회사 빚까지 내서 사진 않아.',
        guru2Replies: '드러킨밀러, 소로스 밑에서 "크게 가라" 배웠잖아! 왜 비트코인엔 조심해?',
      },
      {
        trigger: '포트폴리오 다각화 논의',
        guru1Says: '자네 회사가 사실상 비트코인 ETF야. 소프트웨어 회사 아니었나?',
        guru2Replies: '소프트웨어는 현금 창출기고, 그 현금으로 비트코인을 사는 거야. 완벽한 전략이지.',
      },
      {
        trigger: '매크로 전망 토론',
        guru1Says: '세일러, 금리가 오르면 자네 레버리지 BTC 전략이 좀 아플 텐데?',
        guru2Replies: '금리? 비트코인의 4년 주기 앞에서 금리는 소음이야.',
      },
    ],
  },

  // 13. 로저스 <-> 머스크 (teasing)
  {
    guru1: 'rogers',
    guru2: 'musk',
    relationship: 'teasing',
    interactions: [
      {
        trigger: '우주 개발 뉴스',
        guru1Says: '일론, 화성 가기 전에 미얀마 한번 가봐. 진짜 프론티어 마켓은 지구에 있어.',
        guru2Replies: '로저스 아저씨, 오토바이로 세계일주는 멋졌지만, 로켓이 더 빨라요.',
      },
      {
        trigger: '신흥국 투자 기회',
        guru1Says: '캄보디아 부동산이 10년 내 5배 갈 거야. 화성 부동산보다 확실하지.',
        guru2Replies: '캄보디아요? 스타링크로 인터넷부터 깔아드릴게요. 그게 진짜 인프라 투자.',
      },
      {
        trigger: '농업/원자재 토론',
        guru1Says: '농부가 앞으로 슈퍼스타가 될 거야. 먹을 게 없으면 아이폰도 소용없어.',
        guru2Replies: '동의해요! 그래서 우리가 수직 농장에 AI를 붙이는 거예요. 농업도 혁신이 필요해.',
      },
    ],
  },

  // 14. 린치 <-> 캐시우드 (teasing)
  {
    guru1: 'lynch',
    guru2: 'cathie_wood',
    relationship: 'teasing',
    interactions: [
      {
        trigger: '성장주 vs 가치주 논쟁',
        guru1Says: '캐시, 테슬라 PE가 몇 배야? 내가 마젤란 펀드 때 그런 주식 샀으면 해고됐어.',
        guru2Replies: '린치 선생님, 마젤란 때는 테슬라 같은 회사가 없었잖아요. 시대가 다르다고요.',
      },
      {
        trigger: '리서치 방법론 토론',
        guru1Says: 'ARK 리서치가 슈퍼마켓 걸어다니면서 하는 리서치보다 나을까? 난 의문이야.',
        guru2Replies: '선생님, 우리 오픈소스 리서치 모델 한번 보세요. 슈퍼마켓보다 데이터가 100배 많아요.',
      },
      {
        trigger: '일반인 투자 교육',
        guru1Says: '내 책 "전설로 떠나는 월가의 영웅"이 30년 동안 베스트셀러야. 기본이 중요해.',
        guru2Replies: '좋은 책이에요. 하지만 이제 유튜브와 팟캐스트가 책보다 빨리 교육하는 시대예요.',
      },
    ],
  },

  // 15. 버핏 <-> 린치 (alliance)
  {
    guru1: 'buffett',
    guru2: 'lynch',
    relationship: 'alliance',
    interactions: [
      {
        trigger: '가치투자 원칙 토론',
        guru1Says: '피터, 우리 둘 다 아는 거야. 좋은 기업을 합리적 가격에 사면 시간이 알아서 해줘.',
        guru2Replies: '맞아요, 워렌. 복잡하게 생각할 것 없어요. 실적 좋고, PE 낮고, 성장하면 끝.',
      },
      {
        trigger: '버블 경고 시',
        guru1Says: '피터, 지금 시장이 탐욕에 빠져 있어. 이럴 때 현금 들고 기다리는 게 답이야.',
        guru2Replies: '동의해요. 주변에서 주식 얘기하면 팔 때가 됐다는 거예요. 택시기사 지표.',
      },
      {
        trigger: '장기 투자 토론',
        guru1Says: '내 가장 좋은 주식 보유 기간은 "영원히"야.',
        guru2Replies: '저는 "꽃이 피기 전에 뽑지 말라"고 해요. 같은 말인데 표현이 다르죠.',
      },
      {
        trigger: '젊은 투자자 조언',
        guru1Says: '젊었을 때 실수해도 돼. 중요한 건 원칙을 세우는 거야. 피터도 그렇게 시작했잖아.',
        guru2Replies: '맞아요. 처음엔 누구나 틀려요. 하지만 분석 습관을 들이면 결국 이기게 돼 있어요.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** 특정 주제 태그의 토론 반환 */
export function getDebatesByTag(tag: DebateTag): GuruDebate[] {
  return GURU_DEBATES.filter((d) => d.tags.includes(tag));
}

/** 특정 구루가 참여하는 토론 반환 */
export function getDebatesForGuru(guruId: string): GuruDebate[] {
  return GURU_DEBATES.filter((d) =>
    d.participants.some((p) => p.guruId === guruId),
  );
}

/** 두 구루 사이 상호작용 패턴 반환 */
export function getInteractionPatterns(
  guru1: string,
  guru2: string,
): GuruInteractionPattern | null {
  return (
    GURU_INTERACTION_PATTERNS.find(
      (p) =>
        (p.guru1 === guru1 && p.guru2 === guru2) ||
        (p.guru1 === guru2 && p.guru2 === guru1),
    ) ?? null
  );
}

/** 랜덤 토론 주제 반환 */
export function getRandomDebate(): GuruDebate {
  return GURU_DEBATES[Math.floor(Math.random() * GURU_DEBATES.length)];
}

/**
 * 시장 상황에 맞는 토론 주제 반환
 *
 * - bull: 성장/혁신/낙관 관련 토론
 * - bear: 리스크/가치투자/위기 관련 토론
 * - volatile: 비트코인/버블/매크로 토론
 * - calm: 가벼운/재미 토론 + 연합 토론
 */
export function getDebateForMarketCondition(
  condition: 'bull' | 'bear' | 'volatile' | 'calm',
): GuruDebate {
  const tagMap: Record<typeof condition, DebateTag[]> = {
    bull: ['growth', 'innovation', 'ai'],
    bear: ['risk', 'value_investing', 'macro'],
    volatile: ['bitcoin', 'crypto', 'bubble'],
    calm: ['value_investing', 'commodities', 'china'],
  };

  const relevantTags = tagMap[condition];
  const candidates = GURU_DEBATES.filter((d) =>
    d.tags.some((t) => relevantTags.includes(t)),
  );

  if (candidates.length === 0) {
    return getRandomDebate();
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}
