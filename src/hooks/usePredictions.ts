/**
 * usePredictions.ts - 투자 예측 게임 데이터 훅
 *
 * 역할: "예측 경기장의 데이터 관리 부서"
 * - 활성 투표 조회, 종료된 투표 조회
 * - 내 투표 기록, 투표 제출 (RPC)
 * - 리더보드, 내 통계
 * - 투표 + 내 투표 병합 편의 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../services/supabase';
import type {
  PredictionPoll,
  PredictionVote,
  PredictionUserStats,
  PollWithMyVote,
  LeaderboardEntry,
  VoteChoice,
} from '../types/prediction';

// ============================================================================
// 폴백 투표 데이터 (DB가 비어있거나 연결 실패 시 사용)
// ============================================================================

const LOCAL_VOTES_KEY = '@baln:local_votes';

/** 오늘 마감 시간 (24시간 후) ISO string */
const getTodayDeadline = (): string => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

/**
 * 전체 폴백 투표 풀 (18개)
 * - 카테고리: stocks / crypto / macro / event 골고루 배분
 * - 날짜 기반으로 매일 3개씩 선택 (getDailyFallbackPolls)
 * - 각 질문에 context_hint(왜 중요한지)와 description(YES/NO 근거) 포함
 */
const ALL_FALLBACK_POLLS: Omit<PredictionPoll, 'deadline' | 'created_at'>[] = [
  // ── stocks (5개) ──────────────────────────────────────────────
  {
    id: 'fallback-1',
    question: '삼성전자가 이번 분기 HBM3E 양산에 성공할까요?',
    description: 'YES 근거: SK하이닉스 독점 구도를 삼성이 깨야 하는 절박함 + 대규모 설비 투자 완료.\nNO 근거: 수율 문제가 반복되고 있으며 NVIDIA 퀄 테스트 통과가 아직 미확인.',
    category: 'stocks',
    yes_label: '성공한다',
    no_label: '어렵다',
    yes_count: 184,
    no_count: 142,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: 'AI 반도체 경쟁 구도의 핵심 — HBM 양산 여부가 삼성전자 주가 방향을 결정합니다.',
  },
  {
    id: 'fallback-2',
    question: '테슬라 주가가 이번 달 $300을 돌파할까요?',
    description: 'YES 근거: FSD(완전자율주행) 업데이트 기대감 + 에너지 사업 고성장.\nNO 근거: 차량 판매 둔화 + 일론 머스크 정치 리스크 + 중국 경쟁 심화.',
    category: 'stocks',
    yes_label: '돌파한다',
    no_label: '못한다',
    yes_count: 156,
    no_count: 198,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '테슬라는 자동차 회사인가 AI 회사인가 — 시장의 내러티브 전환이 주가를 좌우합니다.',
  },
  {
    id: 'fallback-3',
    question: 'NVIDIA의 다음 분기 실적이 월가 예상치를 상회할까요?',
    description: 'YES 근거: AI 인프라 투자 사이클이 아직 초기 단계 + 데이터센터 매출 폭증 지속.\nNO 근거: 이미 높은 기대치 반영 + 중국 수출 규제 + 경쟁사(AMD, 자체칩) 부상.',
    category: 'stocks',
    yes_label: '상회한다',
    no_label: '하회한다',
    yes_count: 221,
    no_count: 134,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: 'AI 투자 사이클의 바로미터 — NVIDIA 실적은 글로벌 기술주 전체 방향을 가늠하는 지표입니다.',
  },
  {
    id: 'fallback-4',
    question: '현대차그룹이 올해 글로벌 EV 판매 TOP 3에 진입할까요?',
    description: 'YES 근거: 아이오닉/EV6 라인업 확대 + 미국 조지아 공장 가동 개시.\nNO 근거: 테슬라·BYD 격차 + IRA 보조금 불확실성 + 가격 경쟁력 열위.',
    category: 'stocks',
    yes_label: '진입한다',
    no_label: '어렵다',
    yes_count: 145,
    no_count: 167,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '한국 자동차 산업의 미래 — 전기차 전환 속도가 현대차 밸류에이션을 결정합니다.',
  },
  {
    id: 'fallback-5',
    question: '애플이 올해 자체 AI 칩으로 서버를 운영할까요?',
    description: 'YES 근거: Apple Intelligence 확대에 자체 인프라 필수 + M시리즈 칩 서버 전환 보도.\nNO 근거: 클라우드 파트너(구글, AWS) 의존이 더 효율적 + 초기 투자비 부담.',
    category: 'stocks',
    yes_label: '운영한다',
    no_label: '아직이다',
    yes_count: 163,
    no_count: 148,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '빅테크 AI 내재화 경쟁 — 자체 칩 전략은 마진과 차별화의 핵심입니다.',
  },

  // ── crypto (4개) ──────────────────────────────────────────────
  {
    id: 'fallback-6',
    question: '비트코인이 이번 주 내로 신고점을 경신할까요?',
    description: 'YES 근거: 비트코인 ETF 자금 순유입 지속 + 반감기 이후 공급 감소 효과.\nNO 근거: 단기 과열 지표(RSI 70+) + 차익 실현 매물 출회 가능성.',
    category: 'crypto',
    yes_label: '경신한다',
    no_label: '못한다',
    yes_count: 203,
    no_count: 156,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: 'ETF 자금 유입 추세가 비트코인 가격의 새로운 구조적 지지대 역할을 합니다.',
  },
  {
    id: 'fallback-7',
    question: '이더리움이 이번 달 비트코인 대비 상승률을 앞설까요?',
    description: 'YES 근거: ETH ETF 승인 기대 + DeFi/L2 활성화로 실사용 수요 증가.\nNO 근거: 비트코인 도미넌스 상승 추세 + 솔라나 등 경쟁 L1에 유동성 분산.',
    category: 'crypto',
    yes_label: '앞선다',
    no_label: 'BTC가 낫다',
    yes_count: 132,
    no_count: 189,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: 'ETH/BTC 비율은 알트코인 시즌의 선행지표 — 이더리움 강세는 알트 랠리의 신호입니다.',
  },
  {
    id: 'fallback-8',
    question: '올해 안에 비트코인 현물 ETF의 총 운용자산(AUM)이 금 ETF를 추월할까요?',
    description: 'YES 근거: 출시 1년 만에 금 ETF 20년 유입량 근접 + 기관 채택 가속.\nNO 근거: 금은 수천 년 된 안전자산 + 중앙은행 매수 지속 + 규모 차이 아직 큼.',
    category: 'crypto',
    yes_label: '추월한다',
    no_label: '아직 멀다',
    yes_count: 97,
    no_count: 214,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '디지털 금 vs 실물 금 — 세대교체의 속도를 가늠하는 핵심 지표입니다.',
  },
  {
    id: 'fallback-9',
    question: '스테이블코인 시가총액이 올해 $200B(약 270조원)를 돌파할까요?',
    description: 'YES 근거: USDT/USDC 발행량 사상 최고 + 신흥국 달러 대체 수요 + DeFi 성장.\nNO 근거: 미국 스테이블코인 규제법 지연 + 은행권 자체 토큰 경쟁.',
    category: 'crypto',
    yes_label: '돌파한다',
    no_label: '어렵다',
    yes_count: 178,
    no_count: 123,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '스테이블코인은 크립토 시장의 혈액 — 유통량 증가는 전체 시장 확장의 전조입니다.',
  },

  // ── macro (5개) ──────────────────────────────────────────────
  {
    id: 'fallback-10',
    question: '이번 달 미국 CPI가 시장 예상치를 하회할까요?',
    description: 'YES 근거: 에너지 가격 안정 + 주거비 둔화 조짐 + 기저효과.\nNO 근거: 서비스 인플레이션 고착화 + 임금 상승 압력 지속.',
    category: 'macro',
    yes_label: '하회한다',
    no_label: '상회한다',
    yes_count: 145,
    no_count: 167,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: 'Fed 금리 정책의 핵심 데이터 — CPI 결과가 올해 금리 인하 횟수를 결정합니다.',
  },
  {
    id: 'fallback-11',
    question: '일본은행(BOJ)이 추가 금리 인상을 발표할까요?',
    description: 'YES 근거: 엔화 약세 방어 필요 + 임금 인상 2년 연속 달성 + 인플레이션 목표 초과.\nNO 근거: 경기 침체 리스크 + 수출 기업 부담 + 글로벌 불확실성.',
    category: 'macro',
    yes_label: '인상한다',
    no_label: '동결한다',
    yes_count: 156,
    no_count: 178,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '엔화와 엔캐리 트레이드 — BOJ 정책 변화는 글로벌 자금 흐름을 뒤흔듭니다.',
  },
  {
    id: 'fallback-12',
    question: '올해 미국 연준(Fed)이 금리를 3회 이상 인하할까요?',
    description: 'YES 근거: 고용시장 냉각 + 인플레이션 하향 추세 + 경기 연착륙 시나리오.\nNO 근거: 인플레이션 재반등 리스크 + 강달러 유지 필요 + 연준 점도표 상향.',
    category: 'macro',
    yes_label: '3회 이상',
    no_label: '2회 이하',
    yes_count: 134,
    no_count: 198,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '금리 경로는 모든 자산 가격의 기준 — 인하 속도가 주식·채권·부동산을 동시에 움직입니다.',
  },
  {
    id: 'fallback-13',
    question: '이번 달 한국은행이 기준금리를 동결할까요?',
    description: 'YES 근거: 가계부채 관리 필요 + 환율 방어 위해 한미 금리차 축소 부담.\nNO 근거: 내수 경기 부진 + 수출 의존 경제에 경기부양 시급.',
    category: 'macro',
    yes_label: '동결',
    no_label: '인하/인상',
    yes_count: 174,
    no_count: 93,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '한국은행 금리 결정은 부동산·대출·환율에 직접 영향 — 내 자산과 가장 가까운 매크로 이벤트입니다.',
  },
  {
    id: 'fallback-14',
    question: '중국 경기부양책이 이번 분기 GDP 5% 성장을 이끌어낼까요?',
    description: 'YES 근거: 대규모 재정 지출 + 부동산 규제 완화 + 소비 진작 정책.\nNO 근거: 부동산 디레버리징 장기화 + 청년 실업 + 디플레이션 리스크.',
    category: 'macro',
    yes_label: '달성한다',
    no_label: '미달한다',
    yes_count: 112,
    no_count: 201,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '중국은 한국 수출의 25% — 중국 경기 회복 여부가 코스피 방향성을 좌우합니다.',
  },

  // ── event (4개) ──────────────────────────────────────────────
  {
    id: 'fallback-15',
    question: '올해 미국에서 AI 규제 법안이 통과될까요?',
    description: 'YES 근거: EU AI Act 시행으로 미국도 압박 + 대선 이슈로 부각 + 딥페이크 사고 증가.\nNO 근거: 실리콘밸리 로비 + 혁신 저해 우려 + 의회 분열로 합의 어려움.',
    category: 'event',
    yes_label: '통과한다',
    no_label: '안 된다',
    yes_count: 123,
    no_count: 189,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: 'AI 규제는 빅테크 밸류에이션의 천장 — 규제 수준에 따라 AI 투자 판도가 바뀝니다.',
  },
  {
    id: 'fallback-16',
    question: '한국 증시(코스피)가 올해 3,000을 돌파할까요?',
    description: 'YES 근거: 반도체 업사이클 + 밸류업 프로그램 + 외국인 수급 회복.\nNO 근거: 원화 약세 + 지정학 리스크 + 내수 부진 + 코리아 디스카운트.',
    category: 'event',
    yes_label: '돌파한다',
    no_label: '못한다',
    yes_count: 167,
    no_count: 201,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '코스피 3,000은 심리적 저항선 — 밸류업 정책이 코리아 디스카운트를 해소할 수 있을지가 관건입니다.',
  },
  {
    id: 'fallback-17',
    question: '올해 글로벌 IPO 시장이 작년 대비 50% 이상 성장할까요?',
    description: 'YES 근거: 금리 인하 기대 + AI 유니콘 상장 러시(Databricks, Stripe 등) + 투심 회복.\nNO 근거: 지정학 불확실성 + 기존 상장 AI주 변동성 + 규제 강화.',
    category: 'event',
    yes_label: '성장한다',
    no_label: '부진하다',
    yes_count: 134,
    no_count: 178,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: 'IPO 시장은 투자 심리의 온도계 — 대형 상장이 줄줄이 나오면 시장이 과열 신호일 수 있습니다.',
  },
  {
    id: 'fallback-18',
    question: '유가(WTI)가 이번 분기 배럴당 $90을 돌파할까요?',
    description: 'YES 근거: OPEC+ 감산 연장 + 중동 지정학 리스크 + 여름 드라이빙 시즌.\nNO 근거: 미국 셰일 증산 + 글로벌 수요 둔화 + 전기차 보급 확대.',
    category: 'event',
    yes_label: '돌파한다',
    no_label: '못한다',
    yes_count: 109,
    no_count: 203,
    status: 'active',
    correct_answer: null,
    reward_credits: 2,
    source: 'fallback',
    resolved_at: null,
    context_hint: '유가는 인플레이션의 핵심 변수 — $90 돌파 시 금리 인하 기대가 후퇴할 수 있습니다.',
  },
];

/**
 * 날짜 기반으로 매일 다른 3개의 폴백 투표를 선택합니다.
 * - dayIndex(1~31)를 시드로 사용하여 매일 다른 조합 제공
 * - 같은 날에는 항상 같은 3개가 선택됨 (일관성)
 */
function getDailyFallbackPolls(): PredictionPoll[] {
  const today = new Date();
  const dayIndex = today.getDate(); // 1~31
  const now = new Date().toISOString();
  const deadline = getTodayDeadline();

  const selected: PredictionPoll[] = [];
  for (let i = 0; i < 3; i++) {
    const poll = ALL_FALLBACK_POLLS[(dayIndex + i * 5) % ALL_FALLBACK_POLLS.length];
    selected.push({
      ...poll,
      deadline,
      created_at: now,
    });
  }
  return selected;
}

/** 오늘의 폴백 투표 3개 (날짜 기반 선택) */
const FALLBACK_POLLS: PredictionPoll[] = getDailyFallbackPolls();

// ============================================================================
// 쿼리 키 상수
// ============================================================================

export const PREDICTION_KEYS = {
  activePolls: ['prediction', 'active'] as const,
  resolvedPolls: (limit: number) => ['prediction', 'resolved', limit] as const,
  myVotes: (pollIds: string[]) => ['prediction', 'myVotes', pollIds] as const,
  leaderboard: ['prediction', 'leaderboard'] as const,
  myStats: ['prediction', 'myStats'] as const,
};

// ============================================================================
// 활성 투표 조회 (staleTime 60초)
// ============================================================================

export const useActivePolls = () => {
  return useQuery({
    queryKey: PREDICTION_KEYS.activePolls,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('prediction_polls')
          .select('*')
          .eq('status', 'active')
          .gte('deadline', new Date().toISOString())
          .order('deadline', { ascending: true });

        if (error) throw error;

        // DB가 비어있으면 폴백 사용
        if (!data || data.length === 0) {
          return FALLBACK_POLLS;
        }

        return data as PredictionPoll[];
      } catch {
        // 쿼리 실패 시 (테이블 없음 등) 폴백 사용
        return FALLBACK_POLLS;
      }
    },
    staleTime: 60000, // 60초
  });
};

// ============================================================================
// 종료된 투표 조회 (staleTime 5분)
// ============================================================================

export const useResolvedPolls = (limit: number = 10) => {
  return useQuery({
    queryKey: PREDICTION_KEYS.resolvedPolls(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prediction_polls')
        .select('*')
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as PredictionPoll[];
    },
    staleTime: 300000, // 5분
  });
};

// ============================================================================
// 내 투표 기록 조회 (IN 쿼리로 N+1 방지)
// ============================================================================

export const useMyVotes = (pollIds: string[]) => {
  return useQuery({
    queryKey: PREDICTION_KEYS.myVotes(pollIds),
    queryFn: async () => {
      if (pollIds.length === 0) return [] as PredictionVote[];

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return await getLocalVotes(pollIds);

        const { data, error } = await supabase
          .from('prediction_votes')
          .select('*')
          .eq('user_id', user.id)
          .in('poll_id', pollIds);

        if (error) throw error;

        // DB 결과가 없으면 로컬 투표 기록 확인
        if (!data || data.length === 0) {
          return await getLocalVotes(pollIds);
        }

        return data as PredictionVote[];
      } catch {
        // 쿼리 실패 시 로컬 투표 기록에서 조회
        return await getLocalVotes(pollIds);
      }
    },
    enabled: pollIds.length > 0,
    staleTime: 60000,
  });
};

// ============================================================================
// 투표 제출 Mutation (submit_poll_vote RPC)
// ============================================================================

export const useSubmitVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, vote }: { pollId: string; vote: VoteChoice }) => {
      try {
        const { data, error } = await supabase.rpc('submit_poll_vote', {
          p_poll_id: pollId,
          p_vote: vote,
        });

        if (error) throw error;

        const result = data?.[0];
        if (!result?.success) {
          throw new Error(result?.error_message || '투표에 실패했습니다');
        }

        return result;
      } catch {
        // RPC 실패 시 (함수 없음 등) 로컬에 투표 저장
        await saveLocalVote(pollId, vote);

        return {
          success: true,
          new_yes_count: vote === 'YES' ? 1 : 0,
          new_no_count: vote === 'NO' ? 1 : 0,
        };
      }
    },
    onSuccess: () => {
      // 관련 쿼리 무효화 → 자동 리페치
      queryClient.invalidateQueries({ queryKey: ['prediction'] });
    },
  });
};

// ============================================================================
// 리더보드 (상위 10명 + 내 순위, staleTime 5분)
// ============================================================================

export const useLeaderboard = () => {
  return useQuery({
    queryKey: PREDICTION_KEYS.leaderboard,
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // 상위 10명 조회 (최소 5회 투표한 유저만)
        const { data: topData, error: topError } = await supabase
          .from('prediction_user_stats')
          .select('*')
          .gte('total_votes', 5)
          .order('accuracy_rate', { ascending: false })
          .order('total_votes', { ascending: false })
          .limit(10);

        if (topError) throw topError;

        const entries: LeaderboardEntry[] = (topData || []).map((row, index) => ({
          rank: index + 1,
          user_id: row.user_id,
          display_name: maskUserId(row.user_id),
          total_votes: row.total_votes,
          correct_votes: row.correct_votes,
          accuracy_rate: Number(row.accuracy_rate),
          current_streak: row.current_streak,
          best_streak: row.best_streak,
          total_credits_earned: row.total_credits_earned,
          isMe: row.user_id === user?.id,
        }));

        // 내 순위가 TOP 10 안에 없으면 별도 조회
        if (user && !entries.some(e => e.isMe)) {
          const { data: myData } = await supabase
            .from('prediction_user_stats')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (myData && myData.total_votes >= 5) {
            // 내 순위 계산 (나보다 적중률 높은 유저 수 + 1)
            const { count } = await supabase
              .from('prediction_user_stats')
              .select('*', { count: 'exact', head: true })
              .gte('total_votes', 5)
              .gt('accuracy_rate', myData.accuracy_rate);

            entries.push({
              rank: (count || 0) + 1,
              user_id: myData.user_id,
              display_name: '나',
              total_votes: myData.total_votes,
              correct_votes: myData.correct_votes,
              accuracy_rate: Number(myData.accuracy_rate),
              current_streak: myData.current_streak,
              best_streak: myData.best_streak,
              total_credits_earned: myData.total_credits_earned,
              isMe: true,
            });
          }
        }

        return entries;
      } catch {
        // 쿼리 실패 시 (테이블 없음 등) 빈 배열 반환
        return [] as LeaderboardEntry[];
      }
    },
    staleTime: 300000, // 5분
  });
};

// ============================================================================
// 내 예측 통계 (staleTime 60초)
// ============================================================================

export const useMyPredictionStats = () => {
  return useQuery({
    queryKey: PREDICTION_KEYS.myStats,
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
          .from('prediction_user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // 아직 통계 없음 (첫 투표 전)
          if (error.code === 'PGRST116') return null;
          throw error;
        }

        return data as PredictionUserStats;
      } catch {
        // 쿼리 실패 시 (테이블 없음 등) null 반환
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
};

// ============================================================================
// 편의 훅: 활성 투표 + 내 투표 병합
// ============================================================================

export const usePollsWithMyVotes = () => {
  const { data: polls, isLoading: pollsLoading, ...pollsRest } = useActivePolls();
  const pollIds = (polls || []).map(p => p.id);
  const { data: myVotes, isLoading: votesLoading } = useMyVotes(pollIds);

  // 병합
  const pollsWithVotes: PollWithMyVote[] = (polls || []).map(poll => {
    const vote = (myVotes || []).find(v => v.poll_id === poll.id);
    return {
      ...poll,
      myVote: vote?.vote || null,
      myIsCorrect: vote?.is_correct ?? null,
      myCreditsEarned: vote?.credits_earned || 0,
    };
  });

  return {
    data: pollsWithVotes,
    isLoading: pollsLoading || votesLoading,
    ...pollsRest,
  };
};

// ============================================================================
// 편의 훅: 종료 투표 + 내 투표 병합
// ============================================================================

export const useResolvedPollsWithMyVotes = (limit: number = 10) => {
  const { data: polls, isLoading: pollsLoading, ...pollsRest } = useResolvedPolls(limit);
  const pollIds = (polls || []).map(p => p.id);
  const { data: myVotes, isLoading: votesLoading } = useMyVotes(pollIds);

  const pollsWithVotes: PollWithMyVote[] = (polls || []).map(poll => {
    const vote = (myVotes || []).find(v => v.poll_id === poll.id);
    return {
      ...poll,
      myVote: vote?.vote || null,
      myIsCorrect: vote?.is_correct ?? null,
      myCreditsEarned: vote?.credits_earned || 0,
    };
  });

  return {
    data: pollsWithVotes,
    isLoading: pollsLoading || votesLoading,
    ...pollsRest,
  };
};

// ============================================================================
// 어제의 복기 (Yesterday Review) - 습관 루프 강화
// ============================================================================

export const useYesterdayReview = () => {
  const { data: resolvedPolls, isLoading: resolvedLoading } = useResolvedPolls(20);
  const pollIds = (resolvedPolls || []).map(p => p.id);
  const { data: myVotes, isLoading: votesLoading } = useMyVotes(pollIds);

  // 어제 날짜 계산 (로컬 타임존)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateString = yesterday.toISOString().split('T')[0]; // "YYYY-MM-DD"

  // 어제 resolved + 내가 투표한 것만 필터링
  const yesterdayPolls: PollWithMyVote[] = (resolvedPolls || [])
    .filter(poll => {
      // resolved_at이 어제인지 확인
      if (!poll.resolved_at) return false;
      const resolvedDate = new Date(poll.resolved_at).toISOString().split('T')[0];
      return resolvedDate === yesterdayDateString;
    })
    .map(poll => {
      const vote = (myVotes || []).find(v => v.poll_id === poll.id);
      return {
        ...poll,
        myVote: vote?.vote || null,
        myIsCorrect: vote?.is_correct ?? null,
        myCreditsEarned: vote?.credits_earned || 0,
      };
    })
    .filter(poll => poll.myVote !== null); // 내가 투표한 것만

  // 통계 계산
  const totalVoted = yesterdayPolls.length;
  const totalCorrect = yesterdayPolls.filter(p => p.myIsCorrect === true).length;
  const accuracyRate = totalVoted > 0 ? Math.round((totalCorrect / totalVoted) * 100) : 0;

  return {
    data: yesterdayPolls,
    isLoading: resolvedLoading || votesLoading,
    summary: {
      totalVoted,
      totalCorrect,
      accuracyRate,
    },
  };
};

// ============================================================================
// 로컬 투표 저장/조회 (AsyncStorage 폴백)
// ============================================================================

/** 로컬에 투표 저장 (RPC 실패 시 폴백) */
async function saveLocalVote(pollId: string, vote: VoteChoice): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_VOTES_KEY);
    const votes: PredictionVote[] = raw ? JSON.parse(raw) : [];

    // 이미 투표했으면 덮어쓰기
    const existingIndex = votes.findIndex(v => v.poll_id === pollId);
    const newVote: PredictionVote = {
      id: `local-${pollId}-${Date.now()}`,
      poll_id: pollId,
      user_id: 'local',
      vote,
      is_correct: null,
      credits_earned: 0,
      created_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      votes[existingIndex] = newVote;
    } else {
      votes.push(newVote);
    }

    await AsyncStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(votes));
  } catch {
    // AsyncStorage 실패 시 무시 (최악의 경우 투표 기록만 소실)
  }
}

/** 로컬 투표 기록 조회 */
async function getLocalVotes(pollIds: string[]): Promise<PredictionVote[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_VOTES_KEY);
    if (!raw) return [];

    const votes: PredictionVote[] = JSON.parse(raw);
    return votes.filter(v => pollIds.includes(v.poll_id));
  } catch {
    return [];
  }
}

// ============================================================================
// 유틸리티
// ============================================================================

/** 유저 ID 마스킹 (프라이버시) */
function maskUserId(userId: string): string {
  if (!userId || userId.length < 8) return '***';
  return userId.substring(0, 4) + '****' + userId.substring(userId.length - 4);
}
