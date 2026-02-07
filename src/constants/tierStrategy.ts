/**
 * tierStrategy.ts - 4티어 맞춤 전략 상세 데이터
 *
 * 비유: "투자 전략 백과사전" — 각 티어(등급)별로 어떤 전략이 좋은지,
 * 이번 분기에 뭘 해야 하는지, 내 포트폴리오가 기준에 얼마나 맞는지를 담은 파일
 *
 * 기존 rebalance.tsx / diagnosis.tsx의 TIER_STRATEGIES를 여기로 통합하고,
 * 상세 페이지(tier-strategy.tsx)용 풍부한 데이터도 함께 제공
 */

import { UserTier } from '../types/database';

// ══════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════

/** 핵심 전략 1개 (아코디언 카드용) */
export interface StrategyItem {
  icon: string;          // Ionicons 이름
  title: string;         // 전략 제목
  subtitle: string;      // 감정 터치 서브타이틀
  highlight: string;     // 핵심 수치 뱃지 (예: "60:30:10")
  description: string;   // 상세 설명 3-4줄
  tips: string[];        // 실천 팁 3개
}

/** 이번 분기 할 일 (체크리스트용) */
export interface QuarterlyAction {
  text: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

/** 포트폴리오 적합도 기준 (게이지 바용) */
export interface FitCriterion {
  label: string;         // 기준 이름 (예: "주식 비중")
  idealMin: number;      // 이상 범위 최소값 (%)
  idealMax: number;      // 이상 범위 최대값 (%)
  icon: string;          // Ionicons 이름
}

/** 다음 티어 미리보기 */
export interface NextTierPreview {
  tierName: string;      // 다음 티어 라벨
  tierColor: string;     // 다음 티어 색상
  requiredAssets: number; // 필요 자산액
  benefits: string[];    // 혜택 3개
}

/** 티어별 전체 전략 상세 */
export interface TierStrategyDetail {
  // 히어로 영역
  hero: {
    tagline: string;     // 감정 카피 ("이제 지키면서 불릴 때입니다")
    subtitle: string;    // 보조 설명
  };
  // 핵심 전략 4개
  strategies: StrategyItem[];
  // 이번 분기 할 일 6개
  quarterlyActions: QuarterlyAction[];
  // 포트폴리오 적합도 기준 4개
  fitCriteria: FitCriterion[];
  // 다음 티어 미리보기 (DIAMOND는 null)
  nextTierPreview: NextTierPreview | null;
}

// ══════════════════════════════════════════
// 기존 호환용 (rebalance.tsx / diagnosis.tsx에서 import 교체만 하면 됨)
// ══════════════════════════════════════════

export const TIER_STRATEGIES: Record<UserTier, { title: string; focus: string[]; color: string }> = {
  SILVER: {
    title: '공격적 시드머니 확대 전략',
    focus: [
      '고성장 ETF 중심 포트폴리오 구성',
      '월급의 30% 이상 적극적 저축',
      '분산 투자보다 집중 투자 고려',
      '소액으로 시작하는 우량주 적립식 매수',
    ],
    color: '#C0C0C0',
  },
  GOLD: {
    title: '포트폴리오 리밸런싱 & 세금 전략',
    focus: [
      '자산 배분 최적화 (주식 60% / 채권 30% / 현금 10%)',
      '양도세 절세를 위한 손익통산 전략',
      'ISA, 연금저축 한도 활용 극대화',
      '분기별 정기 리밸런싱 실행',
    ],
    color: '#FFD700',
  },
  PLATINUM: {
    title: '자산 보존 & 현금흐름 최적화',
    focus: [
      '배당주 중심 안정적 현금흐름 구축',
      '부동산 간접투자(REITs) 편입 검토',
      '채권 비중 확대로 변동성 관리',
      '세대 간 자산 이전 전략 수립',
    ],
    color: '#E5E4E2',
  },
  DIAMOND: {
    title: '패밀리 오피스 수준 자산 관리',
    focus: [
      '대체투자 (PE, VC, 헤지펀드) 편입',
      '해외 자산 분산으로 환 리스크 관리',
      '가족 재단/신탁 설립 검토',
      '전문 자산관리사 위임 검토',
    ],
    color: '#B9F2FF',
  },
};

// ══════════════════════════════════════════
// 상세 전략 데이터 (tier-strategy.tsx 전용)
// ══════════════════════════════════════════

export const TIER_STRATEGY_DETAILS: Record<UserTier, TierStrategyDetail> = {
  // ── SILVER (1억 미만) ──
  SILVER: {
    hero: {
      tagline: '씨앗을 심을 최고의 타이밍입니다',
      subtitle: '소액이라도 꾸준한 습관이 1억을 만듭니다',
    },
    strategies: [
      {
        icon: 'rocket-outline',
        title: '고성장 ETF 집중 투자',
        subtitle: '작은 돈으로 큰 시장을 품으세요',
        highlight: 'S&P500·나스닥',
        description: '소액으로도 미국 시장 전체에 투자할 수 있는 ETF가 최적의 선택입니다. 개별 종목 리스크 없이 시장 성장의 혜택을 누리세요. VOO, QQQ 같은 검증된 ETF로 시작하면 됩니다.',
        tips: [
          'VOO (S&P500) 또는 QQQ (나스닥) 정기 매수 설정',
          '월 50만원 이상 적립식 투자 시작하기',
          '개별 종목은 전체의 20% 이내로 제한',
        ],
      },
      {
        icon: 'wallet-outline',
        title: '저축률 30% 도전',
        subtitle: '수입보다 습관이 부를 만듭니다',
        highlight: '월급 30%+',
        description: '자산 형성 초기에는 투자 수익률보다 저축률이 훨씬 중요합니다. 월급의 최소 30%를 투자에 배정하세요. 자동이체를 설정해두면 의지력 없이도 실행됩니다.',
        tips: [
          '월급일에 자동이체로 투자금 먼저 빼놓기',
          '생활비 통장과 투자 통장을 분리하기',
          '비상금 3개월치를 먼저 확보한 후 투자 시작',
        ],
      },
      {
        icon: 'trending-up-outline',
        title: '집중 투자로 돌파',
        subtitle: '분산은 지키는 것, 집중은 키우는 것',
        highlight: '3~5종목',
        description: '1억 미만에서는 과도한 분산이 오히려 성장을 늦춥니다. 확신 있는 3~5개 종목에 집중하되, ETF를 활용해 기본 분산은 유지하세요.',
        tips: [
          '확신 종목 3~5개 + ETF 1~2개로 구성',
          '한 종목 비중이 40%를 넘지 않도록 관리',
          '분기마다 종목 수를 점검하고 정리',
        ],
      },
      {
        icon: 'school-outline',
        title: '투자 역량 강화',
        subtitle: '공부한 만큼 수익이 따라옵니다',
        highlight: '주 3시간+',
        description: '초기 자산 규모에서는 투자 지식이 가장 큰 자산입니다. 재무제표 읽기, 매크로 경제 이해, 기본적 분석을 배워두면 자산이 커졌을 때 큰 도움이 됩니다.',
        tips: [
          '매주 기업 분석 리포트 1개 이상 읽기',
          '투자 일지를 작성하며 매매 근거 기록',
          '과거 실수에서 배우기 — 감정 매매 패턴 파악',
        ],
      },
    ],
    quarterlyActions: [
      { text: '정기 적립식 투자 금액 점검 및 조정', priority: 'HIGH' },
      { text: '포트폴리오 수익률 확인 및 리뷰', priority: 'HIGH' },
      { text: '비상금 3개월치 확보 여부 체크', priority: 'MEDIUM' },
      { text: '불필요한 구독 서비스 정리 (월 절감액 확인)', priority: 'MEDIUM' },
      { text: '투자 관련 도서 또는 강의 1개 완료', priority: 'LOW' },
      { text: '차기 분기 투자 목표 금액 설정', priority: 'LOW' },
    ],
    fitCriteria: [
      { label: '주식 비중', idealMin: 70, idealMax: 90, icon: 'stats-chart-outline' },
      { label: '채권 비중', idealMin: 0, idealMax: 15, icon: 'shield-outline' },
      { label: '현금 비중', idealMin: 5, idealMax: 20, icon: 'cash-outline' },
      { label: '분산도', idealMin: 30, idealMax: 60, icon: 'pie-chart-outline' },
    ],
    nextTierPreview: {
      tierName: '골드',
      tierColor: '#FFD700',
      requiredAssets: 100000000,
      benefits: [
        'AI 세금 최적화 리밸런싱 전략',
        '부동산 인사이트 잠금 해제',
        '커뮤니티 라운지 입장 자격',
      ],
    },
  },

  // ── GOLD (1억~5억) ──
  GOLD: {
    hero: {
      tagline: '이제 지키면서 불릴 때입니다',
      subtitle: '체계적인 관리가 자산을 2배로 키웁니다',
    },
    strategies: [
      {
        icon: 'pie-chart-outline',
        title: '자산 배분 최적화',
        subtitle: '비율이 수익률을 결정합니다',
        highlight: '60:30:10',
        description: '주식 60%, 채권 30%, 현금 10%의 황금 비율을 기준으로 자산을 배분하세요. 시장 상황에 따라 ±10% 범위에서 조절하되, 근본적인 구조는 유지합니다. 이 비율이 장기적으로 가장 안정적인 수익을 만들어냅니다.',
        tips: [
          '매 분기 자산 배분 비율 점검 (목표 대비 ±5% 이내)',
          '주식 내에서도 성장주/가치주/배당주 밸런스 유지',
          '해외 자산 비중 30% 이상으로 환 분산',
        ],
      },
      {
        icon: 'calculator-outline',
        title: '양도세 손익통산',
        subtitle: '세금 한 푼이 수익률을 바꿉니다',
        highlight: '연 250만원',
        description: '해외 주식 양도소득 기본 공제액(250만원)을 최대한 활용하세요. 수익이 난 종목과 손실이 난 종목을 같은 해에 매도하면 세금을 크게 줄일 수 있습니다. 12월이 아닌 11월에 미리 점검하세요.',
        tips: [
          '11월에 손익 확인 → 손실 종목 정리 매도',
          '양도소득 250만원 초과 시 22% 과세 발생',
          '가족 간 증여(10년 5천만원)로 세금 분산 검토',
        ],
      },
      {
        icon: 'business-outline',
        title: '절세 계좌 한도 극대화',
        subtitle: '같은 수익, 다른 세금',
        highlight: 'ISA+연금',
        description: 'ISA 계좌(연 2천만원)와 연금저축(연 900만원)의 한도를 매년 꽉 채우세요. 동일한 투자를 해도 일반 계좌 대비 세금이 9.9%~15.4%만 부과됩니다. 이것만으로도 연간 수십~수백만원 절세 효과가 있습니다.',
        tips: [
          'ISA 계좌 연간 2,000만원 납입 한도 채우기',
          '연금저축 세액공제 한도(900만원) 달성 여부 확인',
          'IRP 추가 납입으로 세액공제 극대화',
        ],
      },
      {
        icon: 'sync-outline',
        title: '분기별 정기 리밸런싱',
        subtitle: '규칙이 감정을 이깁니다',
        highlight: '연 4회',
        description: '3개월마다 한 번, 정해진 날짜에 포트폴리오를 리밸런싱하세요. 오른 자산은 일부 익절하고, 빠진 자산은 추가 매수합니다. 감정을 배제하고 기계적으로 실행하는 것이 핵심입니다.',
        tips: [
          '매 분기 첫째 주를 리밸런싱 데이로 지정',
          '5% 이상 벗어난 자산군만 조정 (소폭 차이는 무시)',
          '리밸런싱 전후 스크린샷으로 기록 남기기',
        ],
      },
    ],
    quarterlyActions: [
      { text: '자산 배분 비율 점검 (주식:채권:현금)', priority: 'HIGH' },
      { text: '양도소득세 손익통산 시뮬레이션 실행', priority: 'HIGH' },
      { text: 'ISA·연금저축 납입 진도 확인', priority: 'HIGH' },
      { text: '리밸런싱 실행 (±5% 이상 이탈 자산)', priority: 'MEDIUM' },
      { text: '해외 주식 환율 영향도 점검', priority: 'MEDIUM' },
      { text: '다음 분기 투자 전략 노트 작성', priority: 'LOW' },
    ],
    fitCriteria: [
      { label: '주식 비중', idealMin: 50, idealMax: 70, icon: 'stats-chart-outline' },
      { label: '채권 비중', idealMin: 20, idealMax: 35, icon: 'shield-outline' },
      { label: '현금 비중', idealMin: 5, idealMax: 15, icon: 'cash-outline' },
      { label: '분산도', idealMin: 50, idealMax: 80, icon: 'pie-chart-outline' },
    ],
    nextTierPreview: {
      tierName: '플래티넘',
      tierColor: '#E5E4E2',
      requiredAssets: 500000000,
      benefits: [
        '배당 현금흐름 최적화 전략',
        'REITs·대체투자 편입 가이드',
        '세대 간 자산 이전 플랜',
      ],
    },
  },

  // ── PLATINUM (5억~10억) ──
  PLATINUM: {
    hero: {
      tagline: '자산이 일하게 하세요',
      subtitle: '안정적 현금흐름이 진짜 부의 시작입니다',
    },
    strategies: [
      {
        icon: 'cash-outline',
        title: '배당 현금흐름 구축',
        subtitle: '매달 월급처럼 들어오는 배당금',
        highlight: '월 배당',
        description: '배당 성장 ETF와 고배당 개별주를 조합하여 매월 안정적인 현금흐름을 만드세요. SCHD, VIG 같은 미국 배당 성장 ETF는 꾸준히 배당을 늘려왔습니다. 배당을 재투자하면 복리 효과가 극대화됩니다.',
        tips: [
          'SCHD + VIG + 국내 고배당 ETF로 월 배당 포트폴리오 구성',
          '배당 성장률 5% 이상인 종목 위주로 편입',
          '배당금 자동 재투자 설정으로 복리 효과 극대화',
        ],
      },
      {
        icon: 'home-outline',
        title: 'REITs 간접 부동산',
        subtitle: '부동산의 수익, 유동성의 편리함',
        highlight: '비중 10~15%',
        description: '직접 부동산 매입 없이 REITs(부동산투자신탁)로 부동산 수익을 얻을 수 있습니다. 미국 REITs(VNQ, O), 국내 REITs(맥쿼리인프라 등)를 편입하여 자산군 분산과 인플레이션 헷지 효과를 동시에 누리세요.',
        tips: [
          'VNQ (미국 REITs ETF) 또는 Realty Income(O) 검토',
          '전체 포트폴리오의 10~15%를 부동산 자산으로 배분',
          '금리 인하 시기에 REITs 비중 확대 고려',
        ],
      },
      {
        icon: 'shield-checkmark-outline',
        title: '채권 방어막 강화',
        subtitle: '하락장에서 빛나는 안전판',
        highlight: '채권 30~40%',
        description: '5억 이상 자산에서는 변동성 관리가 수익 극대화보다 중요합니다. 미국 국채(TLT), 투자등급 회사채(LQD), 물가연동채(TIPS)를 혼합하여 채권 포트폴리오를 구축하세요.',
        tips: [
          'TLT(장기 국채) + LQD(회사채) + TIPS(물가연동) 분산',
          '금리 하락 기대 시 장기채 비중 확대',
          '채권 듀레이션(만기)을 분산하여 금리 리스크 관리',
        ],
      },
      {
        icon: 'people-outline',
        title: '세대 간 자산 이전',
        subtitle: '가족의 미래를 함께 설계합니다',
        highlight: '10년 5천만',
        description: '자녀에게 10년마다 5천만원(미성년 2천만원)을 비과세 증여할 수 있습니다. 일찍 시작할수록 복리 효과가 커지므로 체계적인 증여 계획을 세우세요. 증여 후 자녀 명의 계좌에서 투자하면 양도소득세도 절감됩니다.',
        tips: [
          '자녀 명의 증권 계좌 개설 + 증여 신고 (국세청 홈택스)',
          '10년 주기 증여 계획표 작성 및 실행',
          '증여 후 투자수익은 자녀 소득 — 별도 과세 없음',
        ],
      },
    ],
    quarterlyActions: [
      { text: '배당 수익률 점검 및 배당 캘린더 업데이트', priority: 'HIGH' },
      { text: '채권 비중 적정성 확인 (목표 30~40%)', priority: 'HIGH' },
      { text: '증여 일정 확인 및 증여세 신고 여부 체크', priority: 'MEDIUM' },
      { text: 'REITs 편입 비중 및 수익률 리뷰', priority: 'MEDIUM' },
      { text: '전문 세무사/회계사 상담 예약', priority: 'MEDIUM' },
      { text: '자산관리 보고서 작성 및 가족 공유', priority: 'LOW' },
    ],
    fitCriteria: [
      { label: '주식 비중', idealMin: 35, idealMax: 55, icon: 'stats-chart-outline' },
      { label: '채권 비중', idealMin: 30, idealMax: 40, icon: 'shield-outline' },
      { label: '현금 비중', idealMin: 5, idealMax: 15, icon: 'cash-outline' },
      { label: '분산도', idealMin: 65, idealMax: 90, icon: 'pie-chart-outline' },
    ],
    nextTierPreview: {
      tierName: '다이아몬드',
      tierColor: '#B9F2FF',
      requiredAssets: 1000000000,
      benefits: [
        '패밀리 오피스 수준 자산 관리 전략',
        'PE·VC·헤지펀드 편입 가이드',
        '가족 재단/신탁 설립 로드맵',
      ],
    },
  },

  // ── DIAMOND (10억 이상) ──
  DIAMOND: {
    hero: {
      tagline: '자산을 넘어, 유산을 설계합니다',
      subtitle: '패밀리 오피스 수준의 전략적 자산 관리',
    },
    strategies: [
      {
        icon: 'diamond-outline',
        title: '대체투자 편입',
        subtitle: '상위 1%의 포트폴리오',
        highlight: 'PE·VC·헤지',
        description: '10억 이상 자산에서는 주식·채권 외 대체투자를 편입하여 비상관 수익원을 확보하세요. 사모펀드(PE), 벤처캐피탈(VC), 헤지펀드는 전통 자산과 상관관계가 낮아 포트폴리오 안정성을 높여줍니다.',
        tips: [
          '전체 포트폴리오의 10~20%를 대체투자에 배분',
          '유동성 제약(Lock-up)을 감안한 자금 계획 수립',
          '신뢰할 수 있는 운용사 실적 최소 5년 트랙레코드 확인',
        ],
      },
      {
        icon: 'globe-outline',
        title: '글로벌 환 분산',
        subtitle: '원화 리스크를 넘어서다',
        highlight: 'USD·EUR·JPY',
        description: '자산의 50% 이상을 해외 통화로 분산하여 원화 가치 하락 리스크를 관리하세요. 달러(USD), 유로(EUR), 엔(JPY) 등 주요 기축통화에 분산하면 환율 변동에 따른 자산 가치 변동을 완화할 수 있습니다.',
        tips: [
          '해외 자산 비중 50% 이상 유지 (환헷지 비중 조절)',
          '달러 예금/채권으로 기본 달러 포지션 확보',
          '환율 ±5% 변동 시 리밸런싱 트리거 설정',
        ],
      },
      {
        icon: 'document-text-outline',
        title: '가족 재단 설립',
        subtitle: '세대를 넘는 자산 보전',
        highlight: '재단·신탁',
        description: '공익법인 또는 가족 신탁을 통해 세대 간 자산 이전을 체계적으로 계획하세요. 상속세 최고세율(50%)을 고려하면 사전 계획 없이는 자산의 절반이 세금으로 나갑니다. 전문가와 함께 최적의 구조를 설계하세요.',
        tips: [
          '공익법인 설립 시 출연재산 상속세 비과세 혜택 활용',
          '유언대용신탁으로 자산 승계 계획 구체화',
          '매년 세법 변경사항 모니터링 (상속세 개정 대비)',
        ],
      },
      {
        icon: 'briefcase-outline',
        title: '전문가 위임 관리',
        subtitle: '당신의 시간이 가장 소중합니다',
        highlight: 'PB·세무사',
        description: '10억 이상 자산 관리에는 WM(Wealth Management) 전문가의 도움이 필수입니다. PB(Private Banker), 세무사, 변호사로 구성된 자문팀을 구성하세요. 연 0.5~1% 수수료가 들더라도 절세·구조화 효과가 훨씬 큽니다.',
        tips: [
          '증권사 WM센터 또는 독립 자산관리사(IFA) 상담 진행',
          '세무사·변호사 포함 자문팀 구성 (연 1~2회 정기 미팅)',
          '자문 비용 대비 절세 효과를 수치로 비교 검증',
        ],
      },
    ],
    quarterlyActions: [
      { text: '대체투자 편입 비중 및 성과 리뷰', priority: 'HIGH' },
      { text: '환 포지션 점검 (달러·유로·엔 비중)', priority: 'HIGH' },
      { text: '상속·증여 세무 플랜 업데이트', priority: 'HIGH' },
      { text: 'PB/세무사 정기 미팅 진행', priority: 'MEDIUM' },
      { text: '가족 재단/신탁 구조 점검', priority: 'MEDIUM' },
      { text: '차기 분기 대체투자 기회 탐색', priority: 'LOW' },
    ],
    fitCriteria: [
      { label: '주식 비중', idealMin: 25, idealMax: 45, icon: 'stats-chart-outline' },
      { label: '채권 비중', idealMin: 25, idealMax: 40, icon: 'shield-outline' },
      { label: '현금 비중', idealMin: 5, idealMax: 15, icon: 'cash-outline' },
      { label: '분산도', idealMin: 75, idealMax: 100, icon: 'pie-chart-outline' },
    ],
    nextTierPreview: null, // 최고 등급
  },
};
