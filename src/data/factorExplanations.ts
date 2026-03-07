/**
 * 건강 점수 팩터별 설명 데이터
 * ────────────────────────────────
 * Wave 4: 건강 점수 스토리텔링
 * 각 팩터마다 "왜 중요한지, 실제 사례, 해결법, 역사적 맥락" 제공
 */

export interface FactorExplanation {
  title: string;           // 팩터 이름 (한국어)
  titleEn?: string;        // 팩터 이름 (영어)
  icon: string;            // 이모지 아이콘
  why: string;             // 왜 중요한가?
  whyEn?: string;          // Why is it important?
  example: string;         // 실제 사례
  exampleEn?: string;      // Real case
  solution: string;        // 해결 방법
  solutionEn?: string;     // How to solve
  historicalContext: string; // 역사적 맥락
  historicalContextEn?: string; // Historical context
}

export type FactorType =
  | 'allocation_drift'    // 배분 이탈도
  | 'concentration'       // 자산 집중도
  | 'correlation'         // 상관관계
  | 'volatility'          // 변동성
  | 'downside_risk'       // 하방 리스크
  | 'tax_efficiency'      // 세금 효율
  | 'philosophy_alignment'; // 철학 정합도 (신규)

/** 아이콘 → 팩터 타입 매핑 (언어 독립적, 최우선 사용) */
const ICON_TO_FACTOR_TYPE: Record<string, FactorType> = {
  '🎯': 'allocation_drift',
  '⚖️': 'concentration',
  '🔗': 'correlation',
  '📈': 'volatility',
  '🛡️': 'downside_risk',
  '💰': 'tax_efficiency',
  '💳': 'concentration', // 레버리지는 집중도 설명으로 대응
  '🧭': 'philosophy_alignment',
};

/**
 * 팩터 → 팩터 타입 매핑
 * icon 기반 조회 우선, label fallback
 */
export function getFactorType(labelOrIcon: string, icon?: string): FactorType | null {
  // icon이 명시적으로 전달되면 우선 사용
  if (icon && ICON_TO_FACTOR_TYPE[icon]) return ICON_TO_FACTOR_TYPE[icon];
  // labelOrIcon이 이모지인 경우
  if (ICON_TO_FACTOR_TYPE[labelOrIcon]) return ICON_TO_FACTOR_TYPE[labelOrIcon];
  // label fallback (모든 언어 지원)
  const labelMap: Record<string, FactorType> = {
    '배분 이탈도': 'allocation_drift', '자산 집중도': 'concentration',
    '상관관계': 'correlation', '변동성': 'volatility',
    '하방 리스크': 'downside_risk', '세금 효율': 'tax_efficiency',
    '위험 집중도': 'concentration', '레버리지 건전성': 'concentration',
    '철학 정합도': 'philosophy_alignment',
    'Allocation Drift': 'allocation_drift', 'Concentration': 'concentration',
    'Correlation': 'correlation', 'Volatility': 'volatility',
    'Downside Risk': 'downside_risk', 'Tax Efficiency': 'tax_efficiency',
    'Risk Concentration': 'concentration', 'Leverage Health': 'concentration',
    'Philosophy Alignment': 'philosophy_alignment',
  };
  return labelMap[labelOrIcon] || null;
}

/**
 * 언어에 맞는 팩터 설명 필드를 반환하는 헬퍼
 */
export function getLocalizedFactor(explanation: FactorExplanation, lang: string = 'ko'): {
  title: string;
  why: string;
  example: string;
  solution: string;
  historicalContext: string;
} {
  if (lang === 'en') {
    return {
      title: explanation.titleEn || explanation.title,
      why: explanation.whyEn || explanation.why,
      example: explanation.exampleEn || explanation.example,
      solution: explanation.solutionEn || explanation.solution,
      historicalContext: explanation.historicalContextEn || explanation.historicalContext,
    };
  }
  return {
    title: explanation.title,
    why: explanation.why,
    example: explanation.example,
    solution: explanation.solution,
    historicalContext: explanation.historicalContext,
  };
}

export const FACTOR_EXPLANATIONS: Record<FactorType, FactorExplanation> = {
  allocation_drift: {
    title: '비중 불균형',
    titleEn: 'Allocation Drift',
    icon: '🎯',
    why: '처음 계획한 비중대로 유지해야 리스크가 통제돼요. 주식이 많이 오르면 주식 비중이 자연스럽게 커지고, 이게 생각보다 큰 위험이 될 수 있어요.',
    whyEn: 'You need to maintain your planned allocation to control risk. When stocks rise a lot, their weight naturally grows, which can become a bigger risk than you think.',
    example: '2020년 테슬라가 700% 급등했을 때, 포트폴리오의 40%까지 늘어났어요. 2022년 테슬라가 -65% 폭락하자 전체 손실의 대부분이 테슬라 한 종목에서 나왔죠. 처음 목표 비중 10%를 유지했다면 손실의 절반을 막을 수 있었어요.',
    exampleEn: 'When Tesla surged 700% in 2020, it grew to 40% of portfolios. When Tesla crashed -65% in 2022, most of the total loss came from that single stock. Keeping the original 10% target would have prevented half the loss.',
    solution: '분기마다 한 번, "분석" 탭에서 제안하는 대로 조금씩 조정하면 충분해요. 한꺼번에 다 바꿀 필요 없이, 가장 많이 달라진 종목 하나부터 시작해도 돼요.',
    solutionEn: 'Once a quarter, follow the suggestions in the "Checkup" tab to make small adjustments. No need to change everything at once — start with the asset that drifted the most.',
    historicalContext: '2008년 금융위기 때도, 목표 비중을 지킨 투자자는 그렇지 않은 투자자보다 손실이 절반이었어요. 꾸준한 리밸런싱이 장기적으로 가장 강력한 방어막이에요.',
    historicalContextEn: 'During the 2008 financial crisis, investors who maintained target allocations had half the losses of those who didn\'t. Consistent rebalancing is the strongest long-term defense.',
  },

  concentration: {
    title: '자산 집중도',
    titleEn: 'Concentration',
    icon: '📊',
    why: '한 자산에 너무 많이 투자하면 그 자산이 급락할 때 전체 포트폴리오가 큰 타격을 받아요. 분산 투자의 핵심은 "계란을 한 바구니에 담지 않는 것"이에요.',
    whyEn: 'Investing too much in one asset means a sharp drop can severely damage your entire portfolio. The key to diversification is "don\'t put all your eggs in one basket."',
    example: '2022년 루나 코인이 하루 만에 99.9% 폭락했을 때, 자산의 50% 이상을 루나에 투자한 사람들은 모든 걸 잃었어요. 반면 10% 이하로 분산한 투자자는 전체 손실이 10% 미만이었죠.',
    exampleEn: 'When Luna coin crashed 99.9% in a single day in 2022, people who had over 50% in Luna lost everything. Those who diversified to under 10% had less than 10% total loss.',
    solution: '한 자산이 전체의 30%를 넘지 않도록 하세요. 특히 변동성이 큰 암호화폐나 개별 주식은 20% 이하로 유지하는 게 안전해요. 채권이나 현금으로 균형을 맞추세요.',
    solutionEn: 'Keep any single asset under 30% of your total. Especially volatile crypto or individual stocks should be under 20%. Balance with bonds or cash.',
    historicalContext: '2000년 닷컴 버블 때 나스닥 집중 투자자들은 평균 -78% 손실을 봤어요. 분산 투자자는 -35%에 그쳤죠.',
    historicalContextEn: 'During the 2000 dot-com bubble, Nasdaq-concentrated investors lost an average of -78%. Diversified investors lost only -35%.',
  },

  correlation: {
    title: '상관관계',
    titleEn: 'Correlation',
    icon: '🔗',
    why: '보유한 자산들이 모두 같은 방향으로 움직이면 분산 효과가 없어요. 시장이 폭락할 때 모든 자산이 동시에 떨어지죠. 진짜 분산은 "다른 종류의 자산"을 갖는 거예요.',
    whyEn: 'If all your assets move in the same direction, diversification is useless. When the market crashes, everything drops together. True diversification means owning "different types of assets."',
    example: '2020년 3월 코로나 폭락 때, 주식만 가진 사람은 -30% 손실을 봤어요. 하지만 금과 채권을 함께 가진 사람은 -5%에 그쳤죠. 주식이 떨어질 때 금과 채권이 올라서 손실을 막아줬어요.',
    exampleEn: 'During the March 2020 COVID crash, stock-only investors lost -30%. But those with gold and bonds only lost -5%. Gold and bonds rose when stocks fell, cushioning the loss.',
    solution: '주식, 채권, 금, 부동산, 현금처럼 서로 다르게 움직이는 자산을 섞으세요. 특히 금과 채권은 주식과 반대로 움직이는 경우가 많아서 "안전망" 역할을 해요.',
    solutionEn: 'Mix assets that move differently — stocks, bonds, gold, real estate, cash. Gold and bonds often move opposite to stocks, serving as a "safety net."',
    historicalContext: '1929년 대공황 때 주식 100% 포트폴리오는 -89% 폭락했지만, 채권 50% 섞은 포트폴리오는 -35%에 그쳤어요.',
    historicalContextEn: 'During the 1929 Great Depression, a 100% stock portfolio crashed -89%, but a 50% bond mix portfolio only fell -35%.',
  },

  volatility: {
    title: '변동성',
    titleEn: 'Volatility',
    icon: '📈',
    why: '가격 변동이 크면 마음이 불안해지고 잘못된 타이밍에 팔 가능성이 높아요. 특히 암호화폐처럼 하루에 ±20%씩 움직이는 자산은 심리적 부담이 커요.',
    whyEn: 'High price swings cause anxiety and increase the chance of selling at the wrong time. Assets like crypto that move ±20% daily create significant psychological pressure.',
    example: '2021년 비트코인이 한 달 만에 -50% 폭락했을 때, 많은 투자자들이 공포에 질려 바닥에서 팔았어요. 그 후 6개월 뒤 비트코인은 다시 사상 최고가를 기록했죠.',
    exampleEn: 'When Bitcoin crashed -50% in one month in 2021, many investors panic-sold at the bottom. Six months later, Bitcoin hit a new all-time high.',
    solution: '변동성이 큰 자산(암호화폐, 개별 주식)은 비중을 줄이세요. 대신 채권, ETF, 현금처럼 안정적인 자산을 늘리면 밤에 편하게 잘 수 있어요. 목표: 연간 변동성 25% 이하.',
    solutionEn: 'Reduce allocation to volatile assets (crypto, individual stocks). Instead, add stable assets like bonds, ETFs, or cash so you can sleep well at night. Target: under 25% annual volatility.',
    historicalContext: '2008년 금융위기 때 평균 포트폴리오 변동성은 60%까지 치솟았어요. 25% 이하면 상위 20% 수준이에요.',
    historicalContextEn: 'During the 2008 financial crisis, average portfolio volatility surged to 60%. Below 25% puts you in the top 20%.',
  },

  downside_risk: {
    title: '하방 리스크',
    titleEn: 'Downside Risk',
    icon: '🛡️',
    why: '손실 중인 자산이 많으면 추가 폭락 시 더 큰 타격을 받을 가능성이 높아요. 이미 30% 떨어진 자산이 추가로 30% 더 떨어질 수도 있거든요.',
    whyEn: 'Having many assets at a loss means additional crashes can hurt even more. An asset already down 30% could drop another 30%.',
    example: '2018년 암호화폐 겨울 때, 이미 -50% 손실 중인 알트코인들이 추가로 -80%까지 더 떨어졌어요. 반면 손실이 없던 현금과 채권은 안전하게 지켜졌죠.',
    exampleEn: 'During the 2018 crypto winter, altcoins already at -50% dropped another -80%. Meanwhile, cash and bonds with no losses stayed safe.',
    solution: '손실 중인 자산은 냉정하게 점검하세요. 회복 가능성이 낮다면 손절하고 안정적인 자산으로 바꾸는 게 나을 수 있어요. 혹은 추가 매수로 평균 단가를 낮추세요 (단, 신중하게).',
    solutionEn: 'Review assets at a loss objectively. If recovery looks unlikely, consider cutting losses and switching to stable assets. Or average down by buying more (but carefully).',
    historicalContext: '2000년 닷컴 버블 붕괴 때, 손실 자산을 계속 보유한 투자자는 15년간 손실에서 벗어나지 못했어요.',
    historicalContextEn: 'During the 2000 dot-com crash, investors who held losing assets couldn\'t recover for 15 years.',
  },

  tax_efficiency: {
    title: '세금 효율',
    titleEn: 'Tax Efficiency',
    icon: '💰',
    why: '세금은 투자 수익을 갉아먹는 가장 큰 요인이에요. 손실 자산을 팔아서 세금을 줄이고 (Tax-Loss Harvesting), 비슷한 자산으로 갈아타면 실질 수익이 늘어나요.',
    whyEn: 'Taxes are the biggest drag on investment returns. By selling losing assets to reduce taxes (Tax-Loss Harvesting) and switching to similar assets, you can boost real returns.',
    example: '삼성전자를 1,000만원 어치 사서 800만원으로 떨어졌다고 가정해볼게요. 팔아서 200만원 손실을 확정하면, 다른 수익에서 세금을 22% 줄일 수 있어요. 그리고 비슷한 ETF를 사면 시장 노출은 유지돼요.',
    exampleEn: 'Say you bought Samsung stock for 10M KRW and it dropped to 8M. Selling to lock in the 2M loss lets you reduce taxes on other gains by 22%. Then buy a similar ETF to maintain market exposure.',
    solution: '손실이 5% 이상인 자산이 있으면 연말 전에 팔아서 세금 혜택을 받으세요. 그리고 비슷한 자산(예: 삼성전자 → 한국 ETF)으로 바로 갈아타세요. 주의: 똑같은 자산을 30일 내 재매수하면 세금 혜택이 무효화돼요.',
    solutionEn: 'If you have assets down 5%+, sell before year-end for tax benefits. Then immediately switch to similar assets (e.g., Samsung → Korea ETF). Note: rebuying the same asset within 30 days voids the tax benefit.',
    historicalContext: '미국 투자자들은 TLH로 평균 연 1.5% 추가 수익을 얻어요. 30년 복리로 따지면 60% 차이죠.',
    historicalContextEn: 'US investors gain an average 1.5% extra annual return through TLH. Compounded over 30 years, that\'s a 60% difference.',
  },

  philosophy_alignment: {
    title: '철학 정합도',
    titleEn: 'Philosophy Alignment',
    icon: '🎯',
    why: '선택한 투자 철학(버핏/달리오 등)에 맞는 종목을 보유해야 일관된 원칙으로 투자할 수 있습니다. 철학과 종목이 불일치하면 시장 급락 시 "왜 이 주식을 샀지?"라는 혼란이 생겨 패닉셀 가능성이 높아집니다.',
    whyEn: 'You need to hold assets aligned with your chosen investment philosophy (Buffett/Dalio etc.) to invest with consistent principles. Misalignment leads to confusion during crashes — "why did I buy this?" — increasing panic-sell risk.',
    example: '버핏 철학 선택 후 ARKK·PLTR 위주 보유 → 고변동성 성장주가 떨어질 때 버핏의 "가치주 원칙"으로 버티기 어렵습니다. 일관성 없는 포트폴리오는 공포 상황에서 기준점이 사라집니다.',
    exampleEn: 'Choosing Buffett\'s philosophy but holding ARKK/PLTR — when high-volatility growth stocks drop, it\'s hard to hold using Buffett\'s "value principles." An inconsistent portfolio loses its anchor during fear.',
    solution: '선택 구루의 대표 스타일 종목 비중을 늘리거나, 철학을 재설정하세요. 버핏 → 가치주·배당주 비중 확대, 달리오 → 분산 균형, 캐시우드 → 성장주·비트코인 집중.',
    solutionEn: 'Increase holdings that match your chosen guru\'s style, or reset your philosophy. Buffett → value/dividend stocks, Dalio → balanced diversification, Cathie Wood → growth stocks/Bitcoin focus.',
    historicalContext: '버핏은 1999~2000 닷컴 버블에서 성장주를 외면했지만, 2001~2003년 가치주로 큰 수익을 냈습니다. 일관된 철학이 장기 수익률의 핵심입니다.',
    historicalContextEn: 'Buffett ignored growth stocks during the 1999-2000 dot-com bubble, but earned big returns with value stocks in 2001-2003. Consistent philosophy is the key to long-term returns.',
  },
};
