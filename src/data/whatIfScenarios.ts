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
  category: 'geopolitical' | 'natural_disaster' | 'economic' | 'tech';
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

  // ── 5. 수도권 대지진 ──
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
];

/** 카테고리별 색상 */
export const CATEGORY_COLORS: Record<ExtremeScenario['category'], string> = {
  geopolitical: '#F59E0B',
  natural_disaster: '#EF4444',
  economic: '#3B82F6',
  tech: '#8B5CF6',
};
