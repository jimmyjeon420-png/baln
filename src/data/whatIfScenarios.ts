/**
 * whatIfScenarios.ts - 극한 시나리오 정의
 *
 * 역할: "What If 시뮬레이터"의 시나리오 데이터 (하드코딩)
 * - 시나리오 열람은 무료, 포트폴리오 시뮬레이션만 2크레딧
 * - 화제성 + 교육 목적: "안심을 판다, 불안을 팔지 않는다"
 */

import type { WhatIfScenario } from '../types/marketplace';

// ============================================================================
// 타입 정의
// ============================================================================

export interface SectorImpact {
  name: string;
  change: string;
}

export interface HistoricalParallel {
  event: string;
  year: string;
  initialDrop: string;
  recoveryTime: string;
  lesson: string;
}

export interface ExtremeScenario {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  category: 'geopolitical' | 'natural_disaster' | 'economic' | 'tech' | 'corporate' | 'policy';
  categoryLabel: string;
  shareTitle: string;
  impactChain: string[];
  marketImpact: {
    kospi: string;
    usdkrw: string;
    upSectors: SectorImpact[];
    downSectors: SectorImpact[];
  };
  historicalParallel: HistoricalParallel;
  actionGuide: string[];
  /** generateWhatIf에 전달할 입력값 */
  whatIfInput: {
    scenario: WhatIfScenario;
    description: string;
    magnitude: number;
  };
}

// ============================================================================
// 시나리오 데이터
// ============================================================================

export const EXTREME_SCENARIOS: ExtremeScenario[] = [
  // ── 1. 백두산 폭발 ──
  {
    id: 'baekdu_eruption',
    emoji: '🌋',
    title: '백두산이 터지면?',
    subtitle: '화산재가 반도체 물류를 마비시킨다',
    category: 'natural_disaster',
    categoryLabel: '자연재해',
    shareTitle: '백두산 폭발 시 내 포트폴리오는 어떻게 될까?',
    impactChain: [
      '백두산 대규모 분화 (VEI 6~7)',
      '화산재 확산 → 한반도·일본 상공 덮음',
      '인천/김포 항공 운항 중단',
      '반도체 물류 마비 (삼성·SK)',
      '보험사 대규모 보상 청구',
      '농업 피해 → 식량 가격 급등',
    ],
    marketImpact: {
      kospi: '-15~25%',
      usdkrw: '+150~200원',
      upSectors: [
        { name: '방재·건설', change: '+15~30%' },
        { name: '식량·농업', change: '+10~20%' },
        { name: '대체 물류', change: '+10~15%' },
      ],
      downSectors: [
        { name: '항공·여행', change: '-30~50%' },
        { name: '보험', change: '-20~35%' },
        { name: '반도체 (단기)', change: '-15~25%' },
      ],
    },
    historicalParallel: {
      event: '일본 대지진 + 후쿠시마 (2011)',
      year: '2011',
      initialDrop: '닛케이 -17.5%',
      recoveryTime: '6개월 후 절반 회복, 2년 후 완전 회복',
      lesson: '자연재해는 무섭지만 영구적이지 않습니다. 물류 대체 경로 확보 시 반도체는 오히려 반사이익을 볼 수 있습니다.',
    },
    actionGuide: [
      '항공·여행주 비중이 높다면 분산 필요',
      '반도체는 단기 하락 후 대체 수혜 가능성',
      '달러·금 비중 10~15% 확보가 보험 역할',
      '방재·건설주는 복구 특수 수혜 가능',
    ],
    whatIfInput: {
      scenario: 'custom',
      description:
        '백두산 대규모 화산 분화 시나리오: VEI 6~7급 폭발로 화산재가 한반도 전역과 일본에 확산. 항공 운항 중단, 반도체 물류 마비, 보험사 대규모 보상, 농업 피해. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -20,
    },
  },

  // ── 2. 북한 남침 ──
  {
    id: 'nk_invasion',
    emoji: '⚔️',
    title: '전쟁 나면 주식은?',
    subtitle: '한반도 전쟁 시나리오',
    category: 'geopolitical',
    categoryLabel: '지정학',
    shareTitle: '한반도 전쟁 시 내 자산은 어떻게 될까?',
    impactChain: [
      '북한 기습 도발 / 전면전 선언',
      '원화 폭락 (1,800원+ 돌파)',
      '외국인 대규모 순매도',
      'KOSPI 장중 서킷브레이커 발동',
      '국채·금 가격 급등',
      '미국 개입 시그널 → 저점 반등 시작',
    ],
    marketImpact: {
      kospi: '-30~50%',
      usdkrw: '+400~600원',
      upSectors: [
        { name: '방산 (한화에어로, LIG넥스원)', change: '+30~50%' },
        { name: '금·안전자산', change: '+20~40%' },
        { name: '달러 자산', change: '+30~45%' },
      ],
      downSectors: [
        { name: 'KOSPI 전체', change: '-30~50%' },
        { name: '건설·부동산', change: '-40~60%' },
        { name: '내수·소비', change: '-30~50%' },
      ],
    },
    historicalParallel: {
      event: '연평도 포격 (2010) + 북핵 위기 (2017)',
      year: '2010/2017',
      initialDrop: 'KOSPI -2.8% (연평도), -4.2% (북핵)',
      recoveryTime: '3거래일 만에 회복 → 한 달 내 사상최고치',
      lesson: '한반도 지정학 위기는 역사적으로 매수 기회였습니다. 다만 실제 전면전은 다른 차원 — 현금+달러+금 30% 확보가 보험입니다.',
    },
    actionGuide: [
      '한국 주식 100% 집중은 극단적 리스크',
      '달러·금·미국 국채 30% 이상 보유가 보험',
      '방산주는 위기 시 확실한 수혜 섹터',
      '과거 모든 지정학 위기 후 시장은 회복했음을 기억',
    ],
    whatIfInput: {
      scenario: 'custom',
      description:
        '한반도 전쟁/남침 시나리오: 북한의 전면전 도발로 원화 폭락, 외국인 대량 매도, 서킷브레이커 발동. 방산주 급등, 내수주 급락 예상. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -40,
    },
  },

  // ── 3. 대만 해협 봉쇄 ──
  {
    id: 'taiwan_blockade',
    emoji: '🚢',
    title: 'TSMC가 멈추면?',
    subtitle: '대만 해협 봉쇄 시나리오',
    category: 'geopolitical',
    categoryLabel: '지정학',
    shareTitle: '대만 봉쇄 시 반도체 포트폴리오는?',
    impactChain: [
      '중국, 대만 해상 봉쇄 선언',
      'TSMC 가동 중단 → 글로벌 반도체 대란',
      '애플·엔비디아 생산 중단 → 나스닥 폭락',
      '삼성 반사이익? vs 글로벌 수요 자체 감소',
      '유가 $120+ 급등 (해상 운송 마비)',
      '미·중 군사 긴장 → 안전자산 폭등',
    ],
    marketImpact: {
      kospi: '-15~25%',
      usdkrw: '+200~300원',
      upSectors: [
        { name: '삼성전자 (대체 수혜)', change: '+10~20%' },
        { name: '에너지·정유', change: '+15~30%' },
        { name: '금·안전자산', change: '+20~35%' },
      ],
      downSectors: [
        { name: '나스닥·빅테크', change: '-20~30%' },
        { name: '자동차 (칩 부족)', change: '-20~35%' },
        { name: '가전·전자제품', change: '-15~25%' },
      ],
    },
    historicalParallel: {
      event: '2차 석유파동 (1979) — 공급 충격 비교',
      year: '1979',
      initialDrop: 'S&P 500 -17%',
      recoveryTime: '공급 대체 경로 확보 후 18개월 내 안정',
      lesson: '삼성·SK가 대체 수혜를 볼 수 있지만, 글로벌 수요 자체가 꺼지는 양날의 검입니다. 전례 없는 시나리오라 분산이 핵심.',
    },
    actionGuide: [
      'TSMC 의존도 높은 종목 점검 필요',
      '삼성전자는 대체 수혜 가능하나 글로벌 침체 리스크 공존',
      '에너지·원자재 비중 확대 고려',
      '미국 국채·금으로 안전자산 확보',
    ],
    whatIfInput: {
      scenario: 'custom',
      description:
        '대만 해협 봉쇄 시나리오: 중국이 대만을 해상 봉쇄, TSMC 가동 중단. 글로벌 반도체 공급 차질, 삼성 대체 수혜 가능성, 유가 급등. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -20,
    },
  },

  // ── 4. AI 버블 붕괴 ──
  {
    id: 'ai_bubble_burst',
    emoji: '🤖',
    title: '엔비디아 -70%면?',
    subtitle: 'AI 버블 붕괴 시나리오',
    category: 'tech',
    categoryLabel: '기술',
    shareTitle: 'AI 버블이 꺼지면 내 포트폴리오는?',
    impactChain: [
      'AI 기업 실적 컨센서스 대규모 미달',
      '엔비디아 가이던스 쇼크 (-70%)',
      'AI 관련주 연쇄 폭락 (매그니피센트 7)',
      '한국 AI 테마주 동반 하락',
      '자금 이동: AI → 가치주·배당주',
      '실사용 AI (클라우드·자율주행)는 건재',
    ],
    marketImpact: {
      kospi: '-10~20%',
      usdkrw: '+100~150원',
      upSectors: [
        { name: '배당주·가치주', change: '+10~20%' },
        { name: '필수소비재', change: '+5~15%' },
        { name: '금·채권', change: '+10~15%' },
      ],
      downSectors: [
        { name: '나스닥·AI 테마', change: '-30~50%' },
        { name: '한국 AI 관련주', change: '-40~60%' },
        { name: '반도체 장비', change: '-25~40%' },
      ],
    },
    historicalParallel: {
      event: '닷컴 버블 (2000)',
      year: '2000',
      initialDrop: '나스닥 -78%, 아마존 -94%',
      recoveryTime: '진짜 기술기업은 5~7년 후 사상최고치 경신',
      lesson: '거품이 꺼질 때 "진짜"와 "가짜"가 구분됩니다. 아마존은 -94% 후 시총 1위가 됐습니다. 매출 있는 AI 기업은 오히려 매수 기회.',
    },
    actionGuide: [
      'AI 테마주 비중이 30% 이상이면 분산 필요',
      '"매출 있는 AI"와 "테마만 AI"를 구분',
      '배당주·가치주로 방어 포지션 확보',
      '버블 붕괴 = 진짜 기업의 할인 매수 기회',
    ],
    whatIfInput: {
      scenario: 'market_crash',
      description:
        'AI 버블 붕괴 시나리오: 엔비디아 -70%, 나스닥 -30~40%, AI 관련주 전반 급락. 자금이 가치주·배당주로 이동. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -35,
    },
  },

  // ── 5. AGI 도래 ──
  {
    id: 'agi_mass_unemployment',
    emoji: '🧠',
    title: '2년 안에 AGI가 온다면?',
    subtitle: 'AI가 대부분의 일자리를 대체하는 세상',
    category: 'tech',
    categoryLabel: '기술',
    shareTitle: 'AGI 시대, 내 포트폴리오는 살아남을까?',
    impactChain: [
      'AI가 AGI 수준 달성 선언 (범용 인공지능)',
      '화이트칼라 직종 대규모 자동화 시작',
      '실업률 급등 → 소비 위축 → 경기 침체 우려',
      'AI 기업 시총 폭등 vs 전통 기업 대규모 구조조정',
      '각국 정부 기본소득(UBI) 논의 가속',
      'AI 인프라(전력·데이터센터·반도체) 수요 폭발',
    ],
    marketImpact: {
      kospi: '-10~20% (전통 업종 중심)',
      usdkrw: '+100~200원',
      upSectors: [
        { name: 'AI 플랫폼 (NVDA, MSFT, GOOG)', change: '+50~100%' },
        { name: '전력·에너지 인프라', change: '+30~50%' },
        { name: '로봇·자동화', change: '+40~80%' },
      ],
      downSectors: [
        { name: '금융·회계·법률 서비스', change: '-30~50%' },
        { name: '콜센터·BPO', change: '-50~70%' },
        { name: '전통 미디어·콘텐츠', change: '-20~40%' },
      ],
    },
    historicalParallel: {
      event: '산업혁명 (1760~1840)',
      year: '1760-1840',
      initialDrop: '수공업자 대규모 실직, 러다이트 운동',
      recoveryTime: '20~30년 후 새로운 직종 창출, 생활수준 2배 향상',
      lesson: '기술 혁명은 단기적으로 고통스럽지만, 역사적으로 항상 더 많은 부와 새로운 직업을 창출했습니다. 핵심은 "대체되는 쪽"이 아닌 "활용하는 쪽"에 투자하는 것.',
    },
    actionGuide: [
      'AI 수혜주(인프라·플랫폼·반도체) 비중 확대 검토',
      '순수 인력 의존 기업 비중 축소 고려',
      '로봇·자동화·전력 인프라는 AGI 시대 필수 인프라',
      'AI를 활용하는 기업 vs AI에 대체되는 기업을 구분',
      '본인의 커리어도 AI 활용 방향으로 전환 준비',
    ],
    whatIfInput: {
      scenario: 'custom',
      description:
        'AGI(범용 인공지능) 2년 내 도래 시나리오: AI가 인간 수준의 범용 지능을 달성하여 화이트칼라 직종 대부분이 자동화됨. 대규모 실업, 소비 위축, 경기 침체 우려. 반면 AI 인프라·플랫폼·로봇 기업은 폭등. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -15,
    },
  },

  // ── 6. 수도권 대지진 ──
  {
    id: 'seoul_earthquake',
    emoji: '🏚️',
    title: '서울에 규모 7 지진이?',
    subtitle: '수도권 대지진 시나리오',
    category: 'natural_disaster',
    categoryLabel: '자연재해',
    shareTitle: '수도권 대지진 시 내 자산은 안전할까?',
    impactChain: [
      '수도권 규모 7.0 강진 발생',
      '인프라 파괴 → 금융시장 일시 마비',
      '건물 붕괴 → 보험사 대규모 보상',
      '복구 투자 → 건설·시멘트·철강 특수',
      '해외 자본 일시 이탈',
      '정부 대규모 재정 투입 → 국채 발행 급증',
    ],
    marketImpact: {
      kospi: '-20~30%',
      usdkrw: '+200~300원',
      upSectors: [
        { name: '건설·시멘트', change: '+30~50%' },
        { name: '철강·소재', change: '+20~35%' },
        { name: '방재·안전장비', change: '+25~40%' },
      ],
      downSectors: [
        { name: '보험', change: '-30~50%' },
        { name: '부동산·리츠', change: '-25~40%' },
        { name: '유통·서비스', change: '-20~35%' },
      ],
    },
    historicalParallel: {
      event: '동일본 대지진 (2011)',
      year: '2011',
      initialDrop: '닛케이 -17.5%',
      recoveryTime: '복구 투자 붐으로 건설·인프라주 2배, 전체 시장 2년 내 회복',
      lesson: '대지진 직후는 공포지만, 복구 과정에서 막대한 투자가 일어납니다. 건설·인프라는 확실한 수혜 섹터.',
    },
    actionGuide: [
      '부동산 집중 투자자는 지역 분산 필요',
      '보험주 비중이 높다면 리스크 점검',
      '건설·인프라주는 복구 특수 수혜',
      '해외 자산 20% 이상 보유가 안전장치',
    ],
    whatIfInput: {
      scenario: 'custom',
      description:
        '수도권 규모 7.0 대지진 시나리오: 서울·경기 인프라 파괴, 금융시장 일시 마비, 보험사 대규모 보상, 건설·복구 특수. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -25,
    },
  },
  // ── 7. 트럼프 관세 전쟁 2.0 ──
  {
    id: 'trump_tariff_war',
    emoji: '🇺🇸',
    title: '미국이 관세 60% 때리면?',
    subtitle: '중국산 전품목 관세 + 한국 반도체 규제',
    category: 'policy',
    categoryLabel: '통상정책',
    shareTitle: '미국 관세 폭탄 시 내 포트폴리오는?',
    impactChain: [
      '트럼프, 중국산 전품목 관세 60% 발동',
      '중국 보복 관세 → 미·중 무역 단절 심화',
      '한국 반도체 대중 수출 규제 확대',
      '글로벌 공급망 재편 가속 → 리쇼어링 수혜',
      '물가 상승 → 연준 금리 인하 중단',
      '달러 강세 → 원화 약세 → 수출주 양날의 검',
    ],
    marketImpact: {
      kospi: '-8~15%',
      usdkrw: '+100~180원',
      upSectors: [
        { name: '미국 리쇼어링 (인텔, 건설)', change: '+15~25%' },
        { name: '방산 (한화에어로, LMT)', change: '+10~20%' },
        { name: '인도/베트남 제조 ETF', change: '+10~15%' },
      ],
      downSectors: [
        { name: '중국 의존 수출주', change: '-20~35%' },
        { name: '삼성전자 (대중 수출 비중)', change: '-10~20%' },
        { name: '자동차 (관세 직격)', change: '-15~25%' },
      ],
    },
    historicalParallel: {
      event: '미·중 무역전쟁 1.0 (2018)',
      year: '2018',
      initialDrop: 'KOSPI -17%, S&P -20%',
      recoveryTime: '1단계 합의 후 6개월 내 회복, 이후 사상최고치',
      lesson: '2018년 관세전쟁도 무섭게 느껴졌지만, 기업들은 공급망을 재편하며 적응했습니다. 핵심은 "대체 불가능한 기술"을 가진 기업을 찾는 것.',
    },
    actionGuide: [
      '중국 매출 비중 30% 이상 종목은 리스크 점검',
      '미국 내수 중심 기업 + 리쇼어링 수혜주 주목',
      '인도·베트남 등 대체 수혜국 ETF 분산 검토',
      '달러 자산 비중을 20% 이상으로 확보',
    ],
    whatIfInput: {
      scenario: 'custom',
      description:
        '트럼프 관세 전쟁 2.0: 중국산 60% 관세, 한국 반도체 대중 수출 규제 강화. 글로벌 공급망 대혼란, 물가 상승, 원화 약세. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -15,
    },
  },

  // ── 8. 일본 BOJ 금리 정상화 쇼크 ──
  {
    id: 'boj_rate_shock',
    emoji: '🇯🇵',
    title: '일본 금리 2%면?',
    subtitle: '엔캐리 트레이드 청산 + 글로벌 자금 대이동',
    category: 'policy',
    categoryLabel: '통화정책',
    shareTitle: '일본 금리 쇼크 시 글로벌 시장은?',
    impactChain: [
      'BOJ, 기준금리 2.0%로 급격 인상',
      '엔캐리 트레이드 대규모 청산 시작',
      '글로벌 위험자산에서 자금 유출 (주식·암호화폐)',
      '일본 국채 금리 급등 → 은행주 급등',
      '엔화 초강세 → 달러/원 하락 → 한국 수출주 혼재',
      'VIX 급등 → 세계 증시 동반 조정',
    ],
    marketImpact: {
      kospi: '-10~18%',
      usdkrw: '-50~+80원 (불확실)',
      upSectors: [
        { name: '일본 은행주 (미쓰비시, 미쓰이)', change: '+20~35%' },
        { name: '일본 부동산 (역발상)', change: '+10~15%' },
        { name: '채권 ETF (TLT, AGG)', change: '+5~12%' },
      ],
      downSectors: [
        { name: '신흥국 주식 전반', change: '-12~25%' },
        { name: '고변동 기술주', change: '-15~25%' },
        { name: '암호화폐', change: '-20~40%' },
      ],
    },
    historicalParallel: {
      event: '2024년 8월 엔캐리 쇼크',
      year: '2024',
      initialDrop: '닛케이 -12.4% (단일 최대 낙폭), 나스닥 -3.4%',
      recoveryTime: '3주 만에 낙폭 80% 회복, 2개월 후 완전 회복',
      lesson: '2024년 8월 쇼크도 "세상 끝" 같았지만 3주 만에 회복했습니다. 엔캐리 청산은 일시적 충격이지 구조적 위기가 아닙니다.',
    },
    actionGuide: [
      '엔캐리 쇼크는 매수 기회였던 역사를 기억',
      '변동성 확대 시 금/채권으로 방어',
      '일본 은행주는 금리 인상의 확실한 수혜',
      '공포에 패닉셀하지 않는 것이 가장 중요',
    ],
    whatIfInput: {
      scenario: 'interest_rate_change',
      description:
        '일본 BOJ 금리 정상화 쇼크: 기준금리 2%로 급격 인상, 엔캐리 트레이드 대규모 청산, 글로벌 위험자산 급락. VIX 급등. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -18,
    },
  },

  // ── 9. 연준 긴급 금리 인상 ──
  {
    id: 'fed_emergency_hike',
    emoji: '🏦',
    title: '연준이 다시 금리를 올리면?',
    subtitle: '인플레 재발 → 긴급 인상 시나리오',
    category: 'economic',
    categoryLabel: '금리',
    shareTitle: '연준 긴급 금리 인상 시 내 자산은?',
    impactChain: [
      '미국 CPI 8% 재돌파 (에너지·주거비)',
      '연준 긴급 FOMC → 기준금리 6% 인상',
      '모기지 금리 9%+ → 부동산 동결',
      '나스닥 -20%+ (성장주 밸류에이션 폭락)',
      '하이일드 채권 스프레드 급등 → 신용경색 우려',
      '달러 초강세 → 신흥국 자금 이탈',
    ],
    marketImpact: {
      kospi: '-15~25%',
      usdkrw: '+200~300원',
      upSectors: [
        { name: '미국 은행주 (JPM, GS)', change: '+15~25%' },
        { name: '단기 국채 ETF (SHY)', change: '+3~5%' },
        { name: '달러 현금', change: '+8~15% (환차익)' },
      ],
      downSectors: [
        { name: '나스닥/성장주', change: '-20~35%' },
        { name: '부동산/리츠 (VNQ, O)', change: '-25~40%' },
        { name: '암호화폐', change: '-30~50%' },
      ],
    },
    historicalParallel: {
      event: '볼커 쇼크 (1980-82)',
      year: '1980',
      initialDrop: 'S&P 500 -27%, 실업률 10.8%',
      recoveryTime: '금리 인하 시작 후 18개월 내 사상최고치',
      lesson: '볼커 의장의 금리 인상(20%!)은 단기적으로 극심한 고통이었지만, 인플레를 잡고 이후 20년 대호황의 기반이 됐습니다.',
    },
    actionGuide: [
      '성장주 비중 50% 이상이면 분산 시급',
      '단기 채권(SHY)이나 머니마켓에 현금 확보',
      '금리 정점은 항상 최고의 매수 구간이었음을 기억',
      '고금리에서 살아남는 기업 = 무차입 + 높은 마진',
    ],
    whatIfInput: {
      scenario: 'interest_rate_change',
      description:
        '연준 긴급 금리 인상: CPI 8% 재돌파로 기준금리 6%까지 인상, 모기지 9%, 신용경색 우려. 성장주·부동산 직격, 은행주 수혜. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -22,
    },
  },

  // ── 10. 삼성전자 회계 스캔들 ──
  {
    id: 'samsung_scandal',
    emoji: '📱',
    title: '삼성전자에 회계 스캔들이?',
    subtitle: '한국 시총 1위 기업의 신뢰도 붕괴',
    category: 'corporate',
    categoryLabel: '기업리스크',
    shareTitle: '삼성전자 스캔들 시 내 포트폴리오는?',
    impactChain: [
      '삼성전자 반도체 부문 회계 부정 적발',
      '주가 -30%+ 급락, 외국인 대규모 매도',
      'KOSPI 시총 20% 차지 → 지수 동반 하락',
      'SK하이닉스 반사 수혜 vs 한국 반도체 신뢰도 위기',
      '국민연금 손실 → 정치 이슈화',
      '글로벌 반도체 공급망 재편 논의 가속',
    ],
    marketImpact: {
      kospi: '-12~20% (삼성 비중 효과)',
      usdkrw: '+150~200원',
      upSectors: [
        { name: 'SK하이닉스 (대체 수혜)', change: '+10~20%' },
        { name: '글로벌 반도체 (TSMC, 인텔)', change: '+5~15%' },
        { name: '금·안전자산', change: '+8~12%' },
      ],
      downSectors: [
        { name: '삼성전자', change: '-30~50%' },
        { name: '삼성 계열사 전체', change: '-15~30%' },
        { name: 'KOSPI ETF', change: '-10~18%' },
      ],
    },
    historicalParallel: {
      event: 'VW 디젤 스캔들 (2015)',
      year: '2015',
      initialDrop: 'VW -40%, 독일 자동차 섹터 -15%',
      recoveryTime: '구조조정 후 3년 만에 주가 회복, EV 전환 계기',
      lesson: '대기업 스캔들은 단기적 충격이 크지만, 구조조정을 통해 오히려 체질 개선 계기가 됩니다. VW는 스캔들 이후 세계 최대 EV 투자자가 되었습니다.',
    },
    actionGuide: [
      '삼성전자 비중이 전체의 20% 이상이면 분산 필요',
      'KOSPI ETF 보유 시 삼성 비중(20%) 인지 필요',
      '스캔들 직후 과매도 구간은 역사적으로 매수 기회',
      '한국 주식 올인보다 글로벌 분산이 근본적 해결책',
    ],
    whatIfInput: {
      scenario: 'stock_crash',
      description:
        '삼성전자 회계 스캔들 시나리오: 반도체 부문 회계 부정 적발, 주가 -30%+ 급락, KOSPI 동반 하락, 외국인 대규모 이탈. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -25,
    },
  },

  // ── 11. 중국 부동산 연쇄 디폴트 ──
  {
    id: 'china_property_collapse',
    emoji: '🇨🇳',
    title: '중국이 진짜 무너지면?',
    subtitle: '부동산 연쇄 디폴트 → 금융위기 전이',
    category: 'economic',
    categoryLabel: '금융위기',
    shareTitle: '중국 부동산 붕괴 시 글로벌 시장은?',
    impactChain: [
      '중국 대형 부동산 5개사 동시 디폴트',
      '중국 은행 부실 채권 폭증 → 금융위기',
      '위안화 폭락 → 글로벌 디플레이션 우려',
      '원자재 수요 급감 → 호주·브라질·한국 직격',
      '한국 대중 수출 급감 (수출의 25%)',
      '글로벌 안전자산 쏠림 → 미국 국채·금 급등',
    ],
    marketImpact: {
      kospi: '-15~25%',
      usdkrw: '+200~300원',
      upSectors: [
        { name: '미국 국채 (TLT)', change: '+15~25%' },
        { name: '금 (GLD)', change: '+20~30%' },
        { name: '미국 내수주 (WMT, PG)', change: '+5~10%' },
      ],
      downSectors: [
        { name: '한국 수출주 (현대차, 포스코)', change: '-20~35%' },
        { name: '원자재 (철광석, 구리)', change: '-25~40%' },
        { name: '호주/브라질 ETF', change: '-15~30%' },
      ],
    },
    historicalParallel: {
      event: '일본 잃어버린 30년 (1990~)',
      year: '1990',
      initialDrop: '닛케이 -60% (3년간), 부동산 -80%',
      recoveryTime: '닛케이 고점 회복까지 34년 (2024년)',
      lesson: '일본의 전례를 보면 부동산 버블 붕괴는 10년 이상 지속될 수 있습니다. 하지만 일본 시장에만 투자한 사람이 문제지, 글로벌 분산 투자자는 큰 영향이 없었습니다.',
    },
    actionGuide: [
      '중국 관련 매출 비중 높은 종목 점검',
      '원자재 의존 국가(호주, 브라질) ETF 비중 축소 검토',
      '미국 내수주 + 채권으로 방어 포지션 구축',
      '장기적으로 인도가 중국 대체 성장 엔진 가능성',
    ],
    whatIfInput: {
      scenario: 'market_crash',
      description:
        '중국 부동산 연쇄 디폴트 시나리오: 대형 부동산 5개사 동시 파산, 중국 금융위기, 위안화 폭락, 글로벌 원자재 수요 급감, 한국 대중 수출 직격. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -22,
    },
  },

  // ── 12. 테슬라/엔비디아 CEO 돌연 사임 ──
  {
    id: 'ceo_sudden_exit',
    emoji: '👔',
    title: '머스크가 갑자기 떠나면?',
    subtitle: '카리스마 CEO 부재 → 시총 증발 시나리오',
    category: 'corporate',
    categoryLabel: '경영리스크',
    shareTitle: '카리스마 CEO 사임 시 해당 주식은?',
    impactChain: [
      '일론 머스크 / 젠슨 황 건강 문제로 돌연 사임',
      '해당 기업 주가 -25~40% 급락',
      '후임자 불확실성 → 전략 방향 혼란',
      '기관 투자자 대규모 비중 축소',
      '경쟁사 반사 수혜 (BYD, AMD 등)',
      '6개월~1년 후 "CEO ≠ 기업" 인식 확산 시 회복',
    ],
    marketImpact: {
      kospi: '-2~5% (간접 영향)',
      usdkrw: '+30~50원',
      upSectors: [
        { name: '경쟁사 (AMD, BYD, 리비안)', change: '+10~20%' },
        { name: '배당주·가치주', change: '+3~8%' },
        { name: '금·채권 (위험 회피)', change: '+5~10%' },
      ],
      downSectors: [
        { name: '해당 기업 (TSLA/NVDA)', change: '-25~40%' },
        { name: '관련 생태계 기업', change: '-10~20%' },
        { name: '나스닥 지수', change: '-5~10%' },
      ],
    },
    historicalParallel: {
      event: '스티브 잡스 사망 (2011)',
      year: '2011',
      initialDrop: 'AAPL -5% (당일), 이후 1달 보합',
      recoveryTime: '팀 쿡 체제에서 6개월 내 사상최고치, 이후 시총 세계 1위',
      lesson: '잡스 없는 애플은 끝이라고 했지만, 시스템이 견고한 기업은 CEO를 넘어 성장합니다. 핵심은 "사람"이 아니라 "시스템과 기술".',
    },
    actionGuide: [
      '"원맨 기업" 비중이 높다면 리스크 인지 필요',
      '경쟁사 분산으로 섹터 노출은 유지하되 리스크 분산',
      'CEO 사임 직후 과매도는 역사적으로 매수 기회',
      '경영 시스템이 견고한 기업이 장기적으로 더 안전',
    ],
    whatIfInput: {
      scenario: 'stock_crash',
      description:
        '카리스마 CEO(머스크/젠슨 황) 돌연 사임 시나리오: 해당 기업 주가 -30%+, 전략 방향 불확실성, 기관 투자자 이탈. 경쟁사 반사 수혜. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -20,
    },
  },

  // ── 13. 비트코인 규제 전면 금지 ──
  {
    id: 'crypto_global_ban',
    emoji: '₿',
    title: '모든 나라가 비트코인을 금지하면?',
    subtitle: 'G20 합의 → 암호화폐 전면 불법화',
    category: 'policy',
    categoryLabel: '규제',
    shareTitle: '암호화폐 전면 금지 시 내 자산은?',
    impactChain: [
      'G20, 기후 + 범죄 방지 명목 암호화폐 전면 금지 합의',
      '비트코인 -70%, 알트코인 -90%+',
      '코인베이스(COIN) -80%, 마이닝 기업 파산',
      '블록체인 기술 ≠ 암호화폐 투자 → 기술은 존속',
      '대체 투자처로 금·은 급등',
      '비공식 시장(OTC)에서 프리미엄 거래 시작',
    ],
    marketImpact: {
      kospi: '-3~5% (간접)',
      usdkrw: '+20~50원',
      upSectors: [
        { name: '금·은 (GLD, SLV)', change: '+25~40%' },
        { name: '전통 금융 (JPM, GS)', change: '+10~15%' },
        { name: '국채 ETF', change: '+5~8%' },
      ],
      downSectors: [
        { name: '비트코인', change: '-60~80%' },
        { name: '알트코인', change: '-80~95%' },
        { name: '암호화폐 관련주 (COIN, MSTR)', change: '-70~90%' },
      ],
    },
    historicalParallel: {
      event: '중국 암호화폐 금지 (2021)',
      year: '2021',
      initialDrop: 'BTC -53% (64K→29K)',
      recoveryTime: '5개월 후 신고가 69K, 채굴은 미국·카자흐로 이동',
      lesson: '중국이 전면 금지해도 비트코인은 살아남았습니다. 다만 G20 합의는 차원이 다른 리스크입니다. 암호화폐 100% 올인은 절대 금물.',
    },
    actionGuide: [
      '암호화폐 비중은 전체 자산의 5~10% 이내 권장',
      '금지되어도 "기술"은 살아남으므로 블록체인 기업 구분',
      '금·은이 대체 안전자산으로 수혜',
      '규제 리스크가 0인 자산은 없다는 점 인식',
    ],
    whatIfInput: {
      scenario: 'custom',
      description:
        'G20 암호화폐 전면 금지 시나리오: 비트코인 -70%, 알트코인 -90%, 암호화폐 관련 기업 파산. 금·은 급등, 전통 금융 수혜. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -30,
    },
  },

  // ── 14. 한국 외환위기 재발 ──
  {
    id: 'korea_fx_crisis',
    emoji: '🇰🇷',
    title: '97년 외환위기가 다시 온다면?',
    subtitle: '원화 폭락 + 외채 위기 시나리오',
    category: 'economic',
    categoryLabel: '금융위기',
    shareTitle: '한국 외환위기 재발 시 내 자산 방어법은?',
    impactChain: [
      '대기업 연쇄 부도 + 가계부채 폭발',
      '외국인 대규모 자금 이탈',
      '원/달러 2,000원 돌파',
      'KOSPI -50%+, 부동산 -30%+',
      'IMF 구제금융 재요청',
      '수출 기업은 역설적으로 환차익 수혜',
    ],
    marketImpact: {
      kospi: '-40~60%',
      usdkrw: '+800~1000원',
      upSectors: [
        { name: '달러 자산 (미국 주식/채권)', change: '+60~80% (환차익)' },
        { name: '금 (GLD)', change: '+30~50%' },
        { name: '수출 대기업 (원화 수익 환산)', change: '+10~20% (환차익)' },
      ],
      downSectors: [
        { name: 'KOSPI 전체', change: '-40~60%' },
        { name: '부동산', change: '-30~50%' },
        { name: '금융주 (은행, 증권)', change: '-50~70%' },
      ],
    },
    historicalParallel: {
      event: '1997 IMF 외환위기',
      year: '1997',
      initialDrop: 'KOSPI -70%, 원/달러 800→1,960원',
      recoveryTime: 'IMF 졸업 후 3년 만에 고점 회복, 이후 IT 호황',
      lesson: '외환위기에서 가장 잘한 투자는 "달러 현금 보유 + 폭락 시 한국 우량주 매수"였습니다. 삼성전자를 외환위기 때 샀으면 100배입니다.',
    },
    actionGuide: [
      '한국 자산 100% 집중은 최악의 시나리오에서 치명적',
      '달러·금·해외자산 30% 이상 보유가 "보험"',
      '위기 = 우량주를 싸게 사는 기회 (충분한 현금 확보가 전제)',
      '가계부채 관리 (대출이자 비용 급등 대비)',
    ],
    whatIfInput: {
      scenario: 'currency_change',
      description:
        '한국 외환위기 재발 시나리오: 원/달러 2,000원 돌파, KOSPI -50%, 대기업 연쇄 부도, 외국인 대규모 이탈. IMF 구제금융 재요청. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -45,
    },
  },

  // ── 15. 글로벌 팬데믹 2.0 ──
  {
    id: 'pandemic_2',
    emoji: '🦠',
    title: '코로나보다 센 바이러스가?',
    subtitle: '신종 팬데믹 → 글로벌 봉쇄 재발',
    category: 'natural_disaster',
    categoryLabel: '팬데믹',
    shareTitle: '팬데믹 2.0에서 내 포트폴리오는?',
    impactChain: [
      '신종 바이러스 발생 (치사율 5%+, 전파력 오미크론급)',
      'WHO 팬데믹 선언 → 글로벌 봉쇄 재개',
      '여행·항공·외식 즉사, 재택·배달·바이오 폭등',
      '각국 중앙은행 긴급 금리 인하 + 양적완화',
      '유동성 폭발 → 주식·부동산 V자 반등',
      '백신 개발 6개월 내 → 완전 회복 가속',
    ],
    marketImpact: {
      kospi: '-20~35% (초기) → V자 반등',
      usdkrw: '+150~250원 (초기)',
      upSectors: [
        { name: '바이오·제약 (모더나, 셀트리온)', change: '+50~200%' },
        { name: '재택·클라우드 (MSFT, ZM)', change: '+30~60%' },
        { name: '온라인 커머스 (쿠팡, AMZN)', change: '+25~50%' },
      ],
      downSectors: [
        { name: '항공 (대한항공, UAL)', change: '-40~70%' },
        { name: '호텔·여행 (MAR, 하나투어)', change: '-50~70%' },
        { name: '오프라인 유통', change: '-30~50%' },
      ],
    },
    historicalParallel: {
      event: 'COVID-19 (2020)',
      year: '2020',
      initialDrop: 'S&P 500 -34%, KOSPI -35%',
      recoveryTime: 'S&P 5개월 만에 완전 회복, 이후 사상최고치 연속 갱신',
      lesson: '코로나 최저점에서 주식을 산 사람이 가장 큰 수익을 얻었습니다. 팬데믹은 무섭지만, 중앙은행의 유동성 폭탄이 시장을 살립니다.',
    },
    actionGuide: [
      '팬데믹 초기 공포에 매도하면 최악의 결과',
      '현금 20% 확보 → 폭락 시 분할 매수 전략',
      '바이오·재택 수혜주는 초기에만 유효 (이후 과열)',
      '코로나 경험: "가장 무서울 때가 가장 좋은 매수 타이밍"',
    ],
    whatIfInput: {
      scenario: 'market_crash',
      description:
        '글로벌 팬데믹 2.0: 치사율 5% 신종 바이러스, 글로벌 봉쇄, 항공·여행 마비, 중앙은행 긴급 완화. 바이오·재택 수혜, 오프라인 직격. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -30,
    },
  },

  // ── 17. 트럼프 탄핵 ──
  {
    id: 'trump_impeachment',
    emoji: '🏛️',
    title: '트럼프가 탄핵된다면?',
    subtitle: '미국 대통령 파면 → 정책 대혼란 시나리오',
    category: 'policy',
    categoryLabel: '정치리스크',
    shareTitle: '트럼프 탄핵 시 내 포트폴리오는?',
    impactChain: [
      '미 하원 탄핵소추 가결 → 상원 심판 시작',
      '미국 최초 현직 대통령 파면 → 달러 급락',
      'VIX(공포 지수) 40+ 폭등 → 글로벌 위험자산 급락',
      '관세·무역 정책 전면 재검토 → 한국 수출 불확실성 해소?',
      '부통령 대통령 승계 → 정책 연속성 불확실성 심화',
      '연준 긴급 유동성 공급 시사 → 시장 반등 트리거',
    ],
    marketImpact: {
      kospi: '-5~12% (단기) → 빠른 회복 기대',
      usdkrw: '-50~120원 (달러 약세, 원화 강세)',
      upSectors: [
        { name: '금·안전자산 (GLD)', change: '+10~20%' },
        { name: '한국 수출주 (관세 완화 기대)', change: '+5~15%' },
        { name: '유럽·신흥국 주식', change: '+5~10%' },
      ],
      downSectors: [
        { name: 'DJT·트럼프 관련주', change: '-40~70%' },
        { name: '미국 방산 (정책 공백)', change: '-10~20%' },
        { name: '에너지 (규제 완화 기대 소멸)', change: '-10~15%' },
      ],
    },
    historicalParallel: {
      event: '닉슨 대통령 사임 (1974)',
      year: '1974',
      initialDrop: 'S&P 500 -5% (사임 당일), 이후 1개월 내 안정',
      recoveryTime: '불확실성 해소 후 6개월 내 반등. 워터게이트 스캔들 기간 하락이 더 컸음',
      lesson: '탄핵 자체보다 과정의 불확실성이 더 큰 리스크입니다. 닉슨 사임 후 시장은 오히려 "불확실성 종료"로 안도 랠리를 펼쳤습니다.',
    },
    actionGuide: [
      '탄핵 진행 과정(수개월)의 불확실성이 핵심 리스크',
      '달러 약세 → 달러 자산 비중 줄이고 원화 자산·금 확대 고려',
      '관세 완화 기대로 한국 수출주 단기 반사 수혜 가능',
      '역사적으로 정치 충격 후 3~6개월 내 시장 회복',
      '"역대 가장 불확실할 때가 매수 기회"— 닉슨 사임 직후 S&P 500은 2년 뒤 40% 상승',
    ],
    whatIfInput: {
      scenario: 'custom',
      description:
        '트럼프 대통령 탄핵·파면 시나리오: 미국 최초 현직 대통령 파면으로 달러 급락, VIX 폭등, 관세·무역 정책 공백. 금·원화 강세, 트럼프 관련주 급락, 방산·에너지 불확실성. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -10,
    },
  },

  // ── 16. 유럽 에너지 위기 (러시아 가스 완전 차단) ──
  {
    id: 'eu_energy_crisis',
    emoji: '⛽',
    title: '유럽이 에너지 위기에 빠지면?',
    subtitle: '러시아 가스 완전 차단 + 유가 $200',
    category: 'geopolitical',
    categoryLabel: '에너지',
    shareTitle: '유럽 에너지 위기 시 글로벌 시장은?',
    impactChain: [
      '러시아, 유럽행 가스·석유 100% 차단',
      '유가 $200 돌파 → 글로벌 인플레이션 폭발',
      '유럽 제조업 마비 → 독일 경기침체',
      '원유 수입국(한국, 일본) 무역수지 악화',
      '에너지 관련주·원자재 폭등',
      '재생에너지·원전 투자 가속',
    ],
    marketImpact: {
      kospi: '-10~18%',
      usdkrw: '+100~180원',
      upSectors: [
        { name: '에너지 (XOM, CVX, 에쓰오일)', change: '+30~60%' },
        { name: '원전 (두산에너빌리티, CEG)', change: '+25~45%' },
        { name: '재생에너지 (ENPH, FSLR)', change: '+15~30%' },
      ],
      downSectors: [
        { name: '유럽 주식 전반', change: '-20~35%' },
        { name: '항공·운송', change: '-25~40%' },
        { name: '화학·소재 (유가 원가 부담)', change: '-15~25%' },
      ],
    },
    historicalParallel: {
      event: '2022 러시아-우크라이나 에너지 위기',
      year: '2022',
      initialDrop: '유럽 STOXX -22%, 천연가스 10배 폭등',
      recoveryTime: '대체 에너지원 확보 후 12개월 내 안정, 가스비 정상화',
      lesson: '2022년 "유럽이 겨울을 못 넘길 것"이라는 공포가 있었지만, 에너지 전환으로 적응했습니다. 위기는 항상 새로운 산업의 기회입니다.',
    },
    actionGuide: [
      '에너지 관련주는 확실한 수혜 (단기 + 중기)',
      '원전주는 에너지 위기 시 정치적으로도 수혜',
      '유럽 주식 비중이 높다면 일시적 축소 검토',
      '한국은 에너지 수입국 — 원화 약세 리스크 대비',
    ],
    whatIfInput: {
      scenario: 'custom',
      description:
        '유럽 에너지 위기: 러시아 가스 완전 차단, 유가 $200, 유럽 제조업 마비, 글로벌 인플레이션 폭발. 에너지·원전 수혜, 수입국(한국) 직격. 각 보유 종목별 영향을 분석해주세요.',
      magnitude: -18,
    },
  },
];

/** 카테고리별 색상 */
export const CATEGORY_COLORS: Record<ExtremeScenario['category'], string> = {
  geopolitical: '#F59E0B',
  natural_disaster: '#EF4444',
  economic: '#3B82F6',
  tech: '#8B5CF6',
  corporate: '#10B981',
  policy: '#EC4899',
};
