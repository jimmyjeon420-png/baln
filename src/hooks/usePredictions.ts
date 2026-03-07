/**
 * usePredictions.ts - 투자 예측 게임 데이터 훅
 *
 * 역할: "예측 경기장의 데이터 관리 부서"
 * - 활성 투표 조회, 종료된 투표 조회
 * - 내 투표 기록, 투표 제출 (RPC)
 * - 리더보드, 내 통계
 * - 투표 + 내 투표 병합 편의 훅
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import supabase, { getCurrentUser } from '../services/supabase';
import { getCurrentDisplayLanguage } from '../context/LocaleContext';
import { showErrorToast } from '../utils/toast';
import { t } from '../locales';
import type {
  PredictionPoll,
  PredictionVote,
  PredictionUserStats,
  PollWithMyVote,
  LeaderboardEntry,
  VoteChoice,
  PollCategory,
  PollStatus,
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

/** Date/ISO 값을 로컬 날짜키(YYYY-MM-DD)로 변환 */
function toLocalDateKey(input: Date | string): string {
  const dt = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(dt.getTime())) return '';
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** n일 오프셋 기준 로컬 날짜키 */
function getLocalDateKey(offsetDays: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  return toLocalDateKey(dt);
}

/** KST(UTC+9) 기준 날짜키 (prediction 일일 세트 식별용) */
function toKstDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * 전체 폴백 투표 풀 (18개)
 * - 카테고리: stocks / crypto / macro / event 골고루 배분
 * - 날짜 기반으로 매일 3개씩 선택 (getDailyFallbackPolls)
 * - 각 질문에 context_hint(왜 중요한지)와 description(YES/NO 근거) 포함
 */
/** Bilingual fallback poll — stores both ko and en text for each translatable field */
interface BilingualFallbackPoll {
  id: string;
  ko: { question: string; description: string; yes_label: string; no_label: string; context_hint: string };
  en: { question: string; description: string; yes_label: string; no_label: string; context_hint: string };
  category: PollCategory;
  yes_count: number;
  no_count: number;
  status: PollStatus;
  correct_answer: null;
  reward_credits: number;
  source: string;
  resolved_at: null;
}

const ALL_FALLBACK_POLLS_BILINGUAL: BilingualFallbackPoll[] = [
  // ── stocks (5) ──────────────────────────────────────────────
  {
    id: 'fallback-1',
    ko: {
      question: '삼성전자가 이번 분기 HBM3E 양산에 성공할까요?',
      description: 'YES 근거: SK하이닉스 독점 구도를 삼성이 깨야 하는 절박함 + 대규모 설비 투자 완료.\nNO 근거: 수율 문제가 반복되고 있으며 NVIDIA 퀄 테스트 통과가 아직 미확인.',
      yes_label: '성공한다',
      no_label: '어렵다',
      context_hint: 'AI 반도체 경쟁 구도의 핵심 — HBM 양산 여부가 삼성전자 주가 방향을 결정합니다.',
    },
    en: {
      question: 'Will Samsung succeed in mass-producing HBM3E this quarter?',
      description: 'YES case: Samsung\'s urgency to break SK Hynix monopoly + massive capex already deployed.\nNO case: Persistent yield issues + NVIDIA qualification test still unconfirmed.',
      yes_label: 'Yes',
      no_label: 'Unlikely',
      context_hint: 'The core of the AI chip race — HBM production will determine Samsung\'s stock direction.',
    },
    category: 'stocks', yes_count: 184, no_count: 142, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-2',
    ko: {
      question: '테슬라 주가가 이번 달 $300을 돌파할까요?',
      description: 'YES 근거: FSD(완전자율주행) 업데이트 기대감 + 에너지 사업 고성장.\nNO 근거: 차량 판매 둔화 + 일론 머스크 정치 리스크 + 중국 경쟁 심화.',
      yes_label: '돌파한다',
      no_label: '못한다',
      context_hint: '테슬라는 자동차 회사인가 AI 회사인가 — 시장의 내러티브 전환이 주가를 좌우합니다.',
    },
    en: {
      question: 'Will Tesla\'s stock break $300 this month?',
      description: 'YES case: FSD update expectations + high-growth energy business.\nNO case: Vehicle sales slowdown + Elon Musk political risk + intensifying China competition.',
      yes_label: 'Breaks through',
      no_label: 'No',
      context_hint: 'Is Tesla a car company or an AI company? The narrative shift drives the stock.',
    },
    category: 'stocks', yes_count: 156, no_count: 198, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-3',
    ko: {
      question: 'NVIDIA의 다음 분기 실적이 월가 예상치를 상회할까요?',
      description: 'YES 근거: AI 인프라 투자 사이클이 아직 초기 단계 + 데이터센터 매출 폭증 지속.\nNO 근거: 이미 높은 기대치 반영 + 중국 수출 규제 + 경쟁사(AMD, 자체칩) 부상.',
      yes_label: '상회한다',
      no_label: '하회한다',
      context_hint: 'AI 투자 사이클의 바로미터 — NVIDIA 실적은 글로벌 기술주 전체 방향을 가늠하는 지표입니다.',
    },
    en: {
      question: 'Will NVIDIA\'s next quarterly earnings beat Wall Street estimates?',
      description: 'YES case: AI infrastructure investment cycle still in early stages + data center revenue surge continues.\nNO case: Already high expectations priced in + China export controls + competitors (AMD, custom chips) rising.',
      yes_label: 'Beat',
      no_label: 'Miss',
      context_hint: 'The barometer of the AI investment cycle — NVIDIA earnings gauge the direction of global tech stocks.',
    },
    category: 'stocks', yes_count: 221, no_count: 134, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-4',
    ko: {
      question: '현대차그룹이 올해 글로벌 EV 판매 TOP 3에 진입할까요?',
      description: 'YES 근거: 아이오닉/EV6 라인업 확대 + 미국 조지아 공장 가동 개시.\nNO 근거: 테슬라·BYD 격차 + IRA 보조금 불확실성 + 가격 경쟁력 열위.',
      yes_label: '진입한다',
      no_label: '어렵다',
      context_hint: '한국 자동차 산업의 미래 — 전기차 전환 속도가 현대차 밸류에이션을 결정합니다.',
    },
    en: {
      question: 'Will Hyundai Motor Group enter the global EV sales TOP 3 this year?',
      description: 'YES case: IONIQ/EV6 lineup expansion + US Georgia plant now operational.\nNO case: Tesla/BYD gap + IRA subsidy uncertainty + price competitiveness disadvantage.',
      yes_label: 'Yes',
      no_label: 'Unlikely',
      context_hint: 'The future of Korean auto industry — EV transition speed determines Hyundai\'s valuation.',
    },
    category: 'stocks', yes_count: 145, no_count: 167, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-5',
    ko: {
      question: '애플이 올해 자체 AI 칩으로 서버를 운영할까요?',
      description: 'YES 근거: Apple Intelligence 확대에 자체 인프라 필수 + M시리즈 칩 서버 전환 보도.\nNO 근거: 클라우드 파트너(구글, AWS) 의존이 더 효율적 + 초기 투자비 부담.',
      yes_label: '운영한다',
      no_label: '아직이다',
      context_hint: '빅테크 AI 내재화 경쟁 — 자체 칩 전략은 마진과 차별화의 핵심입니다.',
    },
    en: {
      question: 'Will Apple run servers on its own AI chips this year?',
      description: 'YES case: Apple Intelligence expansion requires own infrastructure + M-series chip server transition reports.\nNO case: Cloud partners (Google, AWS) are more efficient + high initial capex.',
      yes_label: 'Yes',
      no_label: 'Not yet',
      context_hint: 'Big Tech AI internalization race — custom chip strategy is key to margin and differentiation.',
    },
    category: 'stocks', yes_count: 163, no_count: 148, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },

  // ── crypto (4) ──────────────────────────────────────────────
  {
    id: 'fallback-6',
    ko: {
      question: '비트코인이 이번 주 내로 신고점을 경신할까요?',
      description: 'YES 근거: 비트코인 ETF 자금 순유입 지속 + 반감기 이후 공급 감소 효과.\nNO 근거: 단기 과열 지표(RSI 70+) + 차익 실현 매물 출회 가능성.',
      yes_label: '경신한다',
      no_label: '못한다',
      context_hint: 'ETF 자금 유입 추세가 비트코인 가격의 새로운 구조적 지지대 역할을 합니다.',
    },
    en: {
      question: 'Will Bitcoin hit a new all-time high this week?',
      description: 'YES case: Sustained Bitcoin ETF inflows + post-halving supply reduction.\nNO case: Short-term overheating (RSI 70+) + potential profit-taking.',
      yes_label: 'Yes',
      no_label: 'No',
      context_hint: 'ETF inflow trends serve as a new structural support level for Bitcoin prices.',
    },
    category: 'crypto', yes_count: 203, no_count: 156, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-7',
    ko: {
      question: '이더리움이 이번 달 비트코인 대비 상승률을 앞설까요?',
      description: 'YES 근거: ETH ETF 승인 기대 + DeFi/L2 활성화로 실사용 수요 증가.\nNO 근거: 비트코인 도미넌스 상승 추세 + 솔라나 등 경쟁 L1에 유동성 분산.',
      yes_label: '앞선다',
      no_label: 'BTC가 낫다',
      context_hint: 'ETH/BTC 비율은 알트코인 시즌의 선행지표 — 이더리움 강세는 알트 랠리의 신호입니다.',
    },
    en: {
      question: 'Will Ethereum outperform Bitcoin this month?',
      description: 'YES case: ETH ETF approval expectations + growing real usage from DeFi/L2.\nNO case: Bitcoin dominance rising + liquidity dispersing to Solana and other L1s.',
      yes_label: 'ETH wins',
      no_label: 'BTC wins',
      context_hint: 'The ETH/BTC ratio is a leading indicator for alt season — ETH strength signals an alt rally.',
    },
    category: 'crypto', yes_count: 132, no_count: 189, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-8',
    ko: {
      question: '올해 안에 비트코인 현물 ETF의 총 운용자산(AUM)이 금 ETF를 추월할까요?',
      description: 'YES 근거: 출시 1년 만에 금 ETF 20년 유입량 근접 + 기관 채택 가속.\nNO 근거: 금은 수천 년 된 안전자산 + 중앙은행 매수 지속 + 규모 차이 아직 큼.',
      yes_label: '추월한다',
      no_label: '아직 멀다',
      context_hint: '디지털 금 vs 실물 금 — 세대교체의 속도를 가늠하는 핵심 지표입니다.',
    },
    en: {
      question: 'Will Bitcoin spot ETF AUM surpass Gold ETF AUM this year?',
      description: 'YES case: Near 20-year Gold ETF inflows in just 1 year + accelerating institutional adoption.\nNO case: Gold is a millennia-old safe haven + central bank buying continues + size gap still large.',
      yes_label: 'Surpasses',
      no_label: 'Not yet',
      context_hint: 'Digital gold vs physical gold — a key indicator measuring the speed of generational shift.',
    },
    category: 'crypto', yes_count: 97, no_count: 214, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-9',
    ko: {
      question: '스테이블코인 시가총액이 올해 $200B(약 270조원)를 돌파할까요?',
      description: 'YES 근거: USDT/USDC 발행량 사상 최고 + 신흥국 달러 대체 수요 + DeFi 성장.\nNO 근거: 미국 스테이블코인 규제법 지연 + 은행권 자체 토큰 경쟁.',
      yes_label: '돌파한다',
      no_label: '어렵다',
      context_hint: '스테이블코인은 크립토 시장의 혈액 — 유통량 증가는 전체 시장 확장의 전조입니다.',
    },
    en: {
      question: 'Will stablecoin market cap break $200B this year?',
      description: 'YES case: USDT/USDC issuance at all-time highs + emerging market dollar substitute demand + DeFi growth.\nNO case: US stablecoin regulation delays + banking sector competing with own tokens.',
      yes_label: 'Breaks through',
      no_label: 'Unlikely',
      context_hint: 'Stablecoins are the lifeblood of the crypto market — growing supply signals overall market expansion.',
    },
    category: 'crypto', yes_count: 178, no_count: 123, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },

  // ── macro (5) ──────────────────────────────────────────────
  {
    id: 'fallback-10',
    ko: {
      question: '이번 달 미국 CPI가 시장 예상치를 하회할까요?',
      description: 'YES 근거: 에너지 가격 안정 + 주거비 둔화 조짐 + 기저효과.\nNO 근거: 서비스 인플레이션 고착화 + 임금 상승 압력 지속.',
      yes_label: '하회한다',
      no_label: '상회한다',
      context_hint: 'Fed 금리 정책의 핵심 데이터 — CPI 결과가 올해 금리 인하 횟수를 결정합니다.',
    },
    en: {
      question: 'Will this month\'s US CPI come in below market expectations?',
      description: 'YES case: Stabilizing energy prices + housing cost deceleration signs + base effect.\nNO case: Sticky services inflation + persistent wage growth pressure.',
      yes_label: 'Below',
      no_label: 'Above',
      context_hint: 'Core data for Fed rate policy — CPI results determine the number of rate cuts this year.',
    },
    category: 'macro', yes_count: 145, no_count: 167, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-11',
    ko: {
      question: '일본은행(BOJ)이 추가 금리 인상을 발표할까요?',
      description: 'YES 근거: 엔화 약세 방어 필요 + 임금 인상 2년 연속 달성 + 인플레이션 목표 초과.\nNO 근거: 경기 침체 리스크 + 수출 기업 부담 + 글로벌 불확실성.',
      yes_label: '인상한다',
      no_label: '동결한다',
      context_hint: '엔화와 엔캐리 트레이드 — BOJ 정책 변화는 글로벌 자금 흐름을 뒤흔듭니다.',
    },
    en: {
      question: 'Will the Bank of Japan (BOJ) announce another rate hike?',
      description: 'YES case: Need to defend weak yen + 2 consecutive years of wage increases + inflation above target.\nNO case: Recession risk + export sector burden + global uncertainty.',
      yes_label: 'Hike',
      no_label: 'Hold',
      context_hint: 'Yen and carry trades — BOJ policy changes shake global capital flows.',
    },
    category: 'macro', yes_count: 156, no_count: 178, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-12',
    ko: {
      question: '올해 미국 연준(Fed)이 금리를 3회 이상 인하할까요?',
      description: 'YES 근거: 고용시장 냉각 + 인플레이션 하향 추세 + 경기 연착륙 시나리오.\nNO 근거: 인플레이션 재반등 리스크 + 강달러 유지 필요 + 연준 점도표 상향.',
      yes_label: '3회 이상',
      no_label: '2회 이하',
      context_hint: '금리 경로는 모든 자산 가격의 기준 — 인하 속도가 주식·채권·부동산을 동시에 움직입니다.',
    },
    en: {
      question: 'Will the Fed cut rates 3 or more times this year?',
      description: 'YES case: Cooling labor market + downward inflation trend + soft landing scenario.\nNO case: Inflation rebound risk + need to maintain strong dollar + Fed dot plot revision upward.',
      yes_label: '3+ cuts',
      no_label: '2 or fewer',
      context_hint: 'The rate path is the benchmark for all asset prices — cut speed moves stocks, bonds, and real estate simultaneously.',
    },
    category: 'macro', yes_count: 134, no_count: 198, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-13',
    ko: {
      question: '이번 달 한국은행이 기준금리를 동결할까요?',
      description: 'YES 근거: 가계부채 관리 필요 + 환율 방어 위해 한미 금리차 축소 부담.\nNO 근거: 내수 경기 부진 + 수출 의존 경제에 경기부양 시급.',
      yes_label: '동결',
      no_label: '인하/인상',
      context_hint: '한국은행 금리 결정은 부동산·대출·환율에 직접 영향 — 내 자산과 가장 가까운 매크로 이벤트입니다.',
    },
    en: {
      question: 'Will the Bank of Korea hold its base rate this month?',
      description: 'YES case: Need to manage household debt + pressure to narrow US-Korea rate gap for FX defense.\nNO case: Sluggish domestic economy + urgent need for stimulus in export-dependent economy.',
      yes_label: 'Hold',
      no_label: 'Cut/Hike',
      context_hint: 'BOK rate decisions directly affect real estate, loans, and FX — the macro event closest to your assets.',
    },
    category: 'macro', yes_count: 174, no_count: 93, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-14',
    ko: {
      question: '중국 경기부양책이 이번 분기 GDP 5% 성장을 이끌어낼까요?',
      description: 'YES 근거: 대규모 재정 지출 + 부동산 규제 완화 + 소비 진작 정책.\nNO 근거: 부동산 디레버리징 장기화 + 청년 실업 + 디플레이션 리스크.',
      yes_label: '달성한다',
      no_label: '미달한다',
      context_hint: '중국은 한국 수출의 25% — 중국 경기 회복 여부가 코스피 방향성을 좌우합니다.',
    },
    en: {
      question: 'Will China\'s stimulus achieve 5% GDP growth this quarter?',
      description: 'YES case: Massive fiscal spending + real estate deregulation + consumer stimulus policies.\nNO case: Prolonged property deleveraging + youth unemployment + deflation risk.',
      yes_label: 'Achieves',
      no_label: 'Falls short',
      context_hint: 'China is 25% of Korean exports — China\'s recovery determines the KOSPI direction.',
    },
    category: 'macro', yes_count: 112, no_count: 201, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },

  // ── event (4) ──────────────────────────────────────────────
  {
    id: 'fallback-15',
    ko: {
      question: '올해 미국에서 AI 규제 법안이 통과될까요?',
      description: 'YES 근거: EU AI Act 시행으로 미국도 압박 + 대선 이슈로 부각 + 딥페이크 사고 증가.\nNO 근거: 실리콘밸리 로비 + 혁신 저해 우려 + 의회 분열로 합의 어려움.',
      yes_label: '통과한다',
      no_label: '안 된다',
      context_hint: 'AI 규제는 빅테크 밸류에이션의 천장 — 규제 수준에 따라 AI 투자 판도가 바뀝니다.',
    },
    en: {
      question: 'Will the US pass an AI regulation bill this year?',
      description: 'YES case: EU AI Act pressure + election issue spotlight + rising deepfake incidents.\nNO case: Silicon Valley lobbying + innovation concerns + congressional gridlock.',
      yes_label: 'Passes',
      no_label: 'No',
      context_hint: 'AI regulation sets the ceiling for Big Tech valuations — the level of regulation reshapes the AI investment landscape.',
    },
    category: 'event', yes_count: 123, no_count: 189, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-16',
    ko: {
      question: '한국 증시(코스피)가 올해 3,000을 돌파할까요?',
      description: 'YES 근거: 반도체 업사이클 + 밸류업 프로그램 + 외국인 수급 회복.\nNO 근거: 원화 약세 + 지정학 리스크 + 내수 부진 + 코리아 디스카운트.',
      yes_label: '돌파한다',
      no_label: '못한다',
      context_hint: '코스피 3,000은 심리적 저항선 — 밸류업 정책이 코리아 디스카운트를 해소할 수 있을지가 관건입니다.',
    },
    en: {
      question: 'Will the KOSPI break 3,000 this year?',
      description: 'YES case: Semiconductor upcycle + Value-up program + foreign investor flow recovery.\nNO case: Weak KRW + geopolitical risk + sluggish domestic demand + Korea discount.',
      yes_label: 'Breaks through',
      no_label: 'No',
      context_hint: 'KOSPI 3,000 is a psychological resistance level — whether the Value-up policy resolves the Korea discount is key.',
    },
    category: 'event', yes_count: 167, no_count: 201, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-17',
    ko: {
      question: '올해 글로벌 IPO 시장이 작년 대비 50% 이상 성장할까요?',
      description: 'YES 근거: 금리 인하 기대 + AI 유니콘 상장 러시(Databricks, Stripe 등) + 투심 회복.\nNO 근거: 지정학 불확실성 + 기존 상장 AI주 변동성 + 규제 강화.',
      yes_label: '성장한다',
      no_label: '부진하다',
      context_hint: 'IPO 시장은 투자 심리의 온도계 — 대형 상장이 줄줄이 나오면 시장이 과열 신호일 수 있습니다.',
    },
    en: {
      question: 'Will the global IPO market grow 50%+ vs last year?',
      description: 'YES case: Rate cut expectations + AI unicorn IPO rush (Databricks, Stripe, etc.) + investor sentiment recovery.\nNO case: Geopolitical uncertainty + existing AI stock volatility + tighter regulation.',
      yes_label: 'Grows',
      no_label: 'Sluggish',
      context_hint: 'The IPO market is a thermometer for investor sentiment — a string of big listings may signal market overheating.',
    },
    category: 'event', yes_count: 134, no_count: 178, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
  {
    id: 'fallback-18',
    ko: {
      question: '유가(WTI)가 이번 분기 배럴당 $90을 돌파할까요?',
      description: 'YES 근거: OPEC+ 감산 연장 + 중동 지정학 리스크 + 여름 드라이빙 시즌.\nNO 근거: 미국 셰일 증산 + 글로벌 수요 둔화 + 전기차 보급 확대.',
      yes_label: '돌파한다',
      no_label: '못한다',
      context_hint: '유가는 인플레이션의 핵심 변수 — $90 돌파 시 금리 인하 기대가 후퇴할 수 있습니다.',
    },
    en: {
      question: 'Will WTI oil prices break $90/barrel this quarter?',
      description: 'YES case: OPEC+ production cut extension + Middle East geopolitical risk + summer driving season.\nNO case: US shale production increase + slowing global demand + EV adoption growth.',
      yes_label: 'Breaks through',
      no_label: 'No',
      context_hint: 'Oil prices are a key inflation variable — breaking $90 could push back rate cut expectations.',
    },
    category: 'event', yes_count: 109, no_count: 203, status: 'active', correct_answer: null, reward_credits: 3, source: 'fallback', resolved_at: null,
  },
];

/** Resolve bilingual fallback polls to current locale */
function getLocalizedFallbackPolls(): Omit<PredictionPoll, 'deadline' | 'created_at'>[] {
  const lang = getCurrentDisplayLanguage() === 'ko' ? 'ko' : 'en';
  return ALL_FALLBACK_POLLS_BILINGUAL.map(({ id, ko, en, ...rest }) => {
    const loc = lang === 'ko' ? ko : en;
    return {
      id,
      question: loc.question,
      description: loc.description,
      yes_label: loc.yes_label,
      no_label: loc.no_label,
      context_hint: loc.context_hint,
      ...rest,
    };
  });
}

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
  const localizedPolls = getLocalizedFallbackPolls();

  const selected: PredictionPoll[] = [];
  for (let i = 0; i < 3; i++) {
    const poll = localizedPolls[(dayIndex + i * 5) % localizedPolls.length];
    selected.push({
      ...poll,
      deadline,
      created_at: now,
    });
  }
  return selected;
}

/**
 * 오늘의 폴백 투표 3개 (날짜 기반 선택)
 * ⚠️ 함수 호출로 변경: 모듈 상수로 하면 앱이 다음 날까지 살아있을 때
 *    같은 질문이 반복됨. 매번 호출해야 현재 날짜 기준으로 올바르게 선택.
 */
function getFallbackPolls(): PredictionPoll[] {
  return getDailyFallbackPolls();
}

// ============================================================================
// 쿼리 키 상수
// ============================================================================

/** 현재 언어 기준 쿼리 키 (언어 전환 시 자동 리페치) */
export const PREDICTION_KEYS = {
  activePolls: (lang?: string) => ['prediction', 'active', lang || getCurrentDisplayLanguage()] as const,
  resolvedPolls: (limit: number, lang?: string) => ['prediction', 'resolved', limit, lang || getCurrentDisplayLanguage()] as const,
  myVotes: (pollIds: string[]) => ['prediction', 'myVotes', pollIds] as const,
  leaderboard: (lang?: string) => ['prediction', 'leaderboard', lang || getCurrentDisplayLanguage()] as const,
  myStats: ['prediction', 'myStats'] as const,
};

// ============================================================================
// 포트폴리오 관련성 정렬 유틸리티
// ============================================================================

/**
 * 포트폴리오 자산 정보 (정렬 함수에 필요한 최소 필드)
 * Asset 타입 전체를 import하지 않고 필요한 필드만 인라인 타입으로 정의합니다.
 */
interface PortfolioAssetForSort {
  ticker?: string;
  name: string;
  assetType?: string; // 'liquid' | 'illiquid'
}

/**
 * 카테고리 매핑: 포트폴리오 자산 유형 → 관련 poll 카테고리
 * 예: BTC/ETH 보유 → 'crypto' 카테고리 투표 우선 노출
 */
const CRYPTO_TICKERS = new Set([
  'BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'MATIC', 'DOT',
  'AVAX', 'LINK', 'UNI', 'ATOM', 'LTC', 'BCH', 'ETC',
  '비트코인', '이더리움', '리플', '솔라나', '에이다',
]);

/**
 * 투표 1개의 포트폴리오 관련성 점수를 계산합니다.
 *
 * 점수 체계:
 * - 10점: 투표 질문 또는 related_ticker에 사용자 보유 티커가 직접 언급됨 (최우선)
 * - 5점:  투표 카테고리가 사용자 자산 유형과 일치 (crypto 보유 → crypto 투표)
 * - 0점:  관련성 없음 (기존 순서 유지)
 */
function getPollRelevanceScore(
  poll: PredictionPoll,
  assets: PortfolioAssetForSort[],
): number {
  if (assets.length === 0) return 0;

  const questionLower = poll.question.toLowerCase();
  const relatedTicker = poll.related_ticker?.toUpperCase() ?? '';

  // -- Priority 1: 질문 텍스트 또는 related_ticker에 보유 자산이 직접 언급 ----------
  for (const asset of assets) {
    // ticker 직접 비교 (대소문자 무관)
    if (asset.ticker) {
      const ticker = asset.ticker.toUpperCase();
      if (relatedTicker === ticker) return 10;
      if (questionLower.includes(asset.ticker.toLowerCase())) return 10;
    }

    // 자산 이름 포함 여부 (한국어 이름 등 — "삼성전자", "비트코인" 등)
    if (asset.name && asset.name.length >= 2) {
      if (questionLower.includes(asset.name.toLowerCase())) return 10;
    }
  }

  // -- Priority 2: 카테고리 일치 --------------------------------------------------
  const hasCrypto = assets.some(
    a => a.ticker && CRYPTO_TICKERS.has(a.ticker.toUpperCase()),
  );
  const hasStocks = assets.some(
    a => a.ticker && !a.ticker.startsWith('RE_') && !CRYPTO_TICKERS.has(a.ticker.toUpperCase()),
  );

  if (poll.category === 'crypto' && hasCrypto) return 5;
  if ((poll.category === 'stocks' || poll.category === 'macro') && hasStocks) return 5;

  return 0;
}

/**
 * 투표 목록을 포트폴리오 관련성 기준으로 정렬합니다.
 * 같은 점수끼리는 원래 순서(DB deadline 오름차순)를 유지합니다.
 *
 * 사용법:
 *   const sorted = sortPollsByPortfolioRelevance(polls, myAssets);
 */
export function sortPollsByPortfolioRelevance(
  polls: PredictionPoll[],
  assets: PortfolioAssetForSort[],
): PredictionPoll[] {
  if (!polls.length || !assets.length) return polls;

  // 원래 인덱스를 보존해 stable sort 구현 (Array.sort는 V8에서 stable하지만 명시적으로 보장)
  return polls
    .map((poll, originalIndex) => ({
      poll,
      score: getPollRelevanceScore(poll, assets),
      originalIndex,
    }))
    .sort((a, b) => {
      // 높은 점수 먼저
      if (b.score !== a.score) return b.score - a.score;
      // 같은 점수면 원래 순서 유지
      return a.originalIndex - b.originalIndex;
    })
    .map(item => item.poll);
}

// ============================================================================
// 활성 투표 조회 (staleTime 60초)
// ============================================================================

export const useActivePolls = () => {
  const lang = getCurrentDisplayLanguage();
  return useQuery({
    queryKey: PREDICTION_KEYS.activePolls(lang),
    queryFn: async () => {
      try {
        const nowIso = new Date().toISOString();
        let query = supabase
          .from('prediction_polls')
          .select('*')
          .eq('status', 'active')
          .gte('deadline', nowIso)
          .order('created_at', { ascending: false })
          .order('deadline', { ascending: true });

        // 언어별 독립 서버: 해당 언어의 폴만 조회
        query = query.eq('language', lang);

        const { data, error } = await query;

        if (error) throw error;

        // DB가 비어있으면 폴백 사용
        if (!data || data.length === 0) {
          return getFallbackPolls();
        }

        // "하루 1세트" 보장: KST 기준 가장 최근 생성일의 최대 3개만 노출
        const latestBatchDate = toKstDateKey(data[0]?.created_at);
        const todayKst = toKstDateKey(nowIso);
        if (latestBatchDate && todayKst && latestBatchDate !== todayKst) {
          return getFallbackPolls();
        }

        const latestBatch = latestBatchDate
          ? data.filter((poll) => toKstDateKey(poll.created_at) === latestBatchDate)
          : data;

        const latestThree = [...latestBatch]
          .sort((a, b) => {
            const aCreated = new Date(a.created_at).getTime();
            const bCreated = new Date(b.created_at).getTime();
            return bCreated - aCreated;
          })
          .slice(0, 3)
          .sort((a, b) => {
            const aDeadline = new Date(a.deadline).getTime();
            const bDeadline = new Date(b.deadline).getTime();
            return aDeadline - bDeadline;
          });

        return (latestThree.length > 0 ? latestThree : data.slice(0, 3)) as PredictionPoll[];
      } catch {
        // 쿼리 실패 시 (테이블 없음 등) 폴백 사용
        return getFallbackPolls();
      }
    },
    staleTime: 60000, // 60초
    retry: 1,          // 예측 게임은 중요 — 1회 재시도
    retryDelay: 2000,
  });
};

// ============================================================================
// 포트폴리오 맞춤 활성 투표 (정렬 추가)
// ============================================================================

/**
 * usePersonalizedPolls — 포트폴리오 보유 자산 기준으로 투표를 정렬하여 반환합니다.
 *
 * useActivePolls의 래퍼로, 동일한 쿼리 캐시를 사용하기 때문에 추가 네트워크 요청이 없습니다.
 * 정렬은 클라이언트에서만 일어나며 기존 데이터를 변경하지 않습니다.
 *
 * @param assets - useSharedPortfolio().assets (Asset[]) 또는 빈 배열
 *
 * 정렬 우선순위:
 * 1. 질문 텍스트 또는 related_ticker가 사용자 보유 티커/이름과 일치 (+10점)
 * 2. 투표 카테고리가 사용자 자산 유형과 일치 — crypto 보유 → crypto 투표 (+5점)
 * 3. 원래 순서 (deadline 오름차순)
 */
export const usePersonalizedPolls = (assets: PortfolioAssetForSort[]) => {
  const result = useActivePolls();

  const sortedData = React.useMemo(() => {
    if (!result.data) return result.data;
    return sortPollsByPortfolioRelevance(result.data, assets);
  }, [result.data, assets]);

  return { ...result, data: sortedData };
};

// ============================================================================
// 종료된 투표 조회 (staleTime 5분)
// ============================================================================

export const useResolvedPolls = (limit: number = 10) => {
  const lang = getCurrentDisplayLanguage();
  return useQuery({
    queryKey: PREDICTION_KEYS.resolvedPolls(limit, lang),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('prediction_polls')
          .select('*')
          .eq('status', 'resolved')
          .eq('language', lang)
          .order('resolved_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return (data || []) as PredictionPoll[];
      } catch {
        // 테이블 없음 등 → 빈 배열 반환
        return [] as PredictionPoll[];
      }
    },
    staleTime: 300000, // 5분
    retry: 1,
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
        const user = await getCurrentUser();
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
    onError: (error) => {
      showErrorToast(t('common.mutation_error'));
      Sentry.captureException(error, { tags: { hook: 'useSubmitVote' } });
    },
  });
};

// ============================================================================
// 리더보드 (상위 10명 + 내 순위, staleTime 5분)
// ============================================================================

export const useLeaderboard = () => {
  const lang = getCurrentDisplayLanguage();
  return useQuery({
    queryKey: PREDICTION_KEYS.leaderboard(lang),
    queryFn: async () => {
      try {
        const user = await getCurrentUser();

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
        const user = await getCurrentUser();
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

  // 어제 날짜 계산 (로컬 타임존 기준)
  const yesterdayDateString = getLocalDateKey(-1);

  // 어제 resolved + 내가 투표한 것만 필터링
  const yesterdayPolls: PollWithMyVote[] = (resolvedPolls || [])
    .filter(poll => {
      // resolved_at이 어제인지 확인
      if (!poll.resolved_at) return false;
      const resolvedDate = toLocalDateKey(poll.resolved_at);
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
// 전체 커뮤니티 예측 통계 (AI 트랙레코드 배너용)
// ============================================================================

/**
 * 지난 30일간 종료된 투표의 커뮤니티 전체 예측 적중률
 * - 신뢰도 배너("지난 30일 커뮤니티 적중률 N%")에 사용
 * - 정답 선택 투표 수 / 전체 투표 수 집계
 * - 데이터 없으면 null 반환 (초기 단계 무의미한 수치 방지)
 */
export const useGlobalPredictionStats = () => {
  return useQuery({
    queryKey: ['prediction', 'global_stats'] as const,
    queryFn: async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from('prediction_polls')
          .select('yes_count, no_count, correct_answer, resolved_at')
          .eq('status', 'resolved')
          .not('correct_answer', 'is', null)
          .gte('resolved_at', thirtyDaysAgo.toISOString());

        if (error || !data || data.length === 0) return null;

        let totalVotes = 0;
        let correctVotes = 0;

        for (const poll of data) {
          const yesCount = Number(poll.yes_count) || 0;
          const noCount = Number(poll.no_count) || 0;
          const total = yesCount + noCount;
          if (total === 0) continue;

          totalVotes += total;
          if (poll.correct_answer === 'YES') correctVotes += yesCount;
          else if (poll.correct_answer === 'NO') correctVotes += noCount;
        }

        return {
          resolvedCount: data.length,
          accuracy: totalVotes > 0 ? Math.round((correctVotes / totalVotes) * 100) : null,
          totalVotes,
        };
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
};

// ============================================================================
// 유틸리티
// ============================================================================

/** 유저 ID 마스킹 (프라이버시) */
function maskUserId(userId: string): string {
  if (!userId || userId.length < 8) return '***';
  return userId.substring(0, 4) + '****' + userId.substring(userId.length - 4);
}

// ============================================================================
// P1.2: 예측 결과 알림 훅
// ============================================================================

// AsyncStorage 키: 마지막으로 예측 결과 알림을 보낸 날짜
const LAST_REVIEW_NOTIFY_KEY = '@baln:last_review_date';

/**
 * 예측 결과 알림 훅 (P1.2)
 *
 * [역할]
 * - 사용자가 투표한 예측 중 어제 결과가 나온 것이 있으면 로컬 알림 발송
 * - 하루에 한 번만, 투표한 내역이 있는 경우에만 발송
 *
 * [동작 순서]
 * 1. 종료된 투표 + 내 투표 기록 조회 (TanStack Query)
 * 2. 오늘 이미 알림을 보냈는지 확인 (@baln:last_review_date)
 * 3. 어제 결과가 나온 것 중 내가 투표한 것이 있는지 확인
 * 4. 있으면 즉시 로컬 알림 발송
 *
 * [호출 방법]
 * 홈 탭 컴포넌트 상단에 한 번 호출하면 됩니다.
 * 이 훅 내부에서 중복 발송 방지 처리를 합니다.
 *
 * @example
 * // app/(tabs)/index.tsx 에서
 * import { useResolvedPollNotification } from '../../src/hooks/usePredictions';
 * // 컴포넌트 안에서:
 * useResolvedPollNotification();
 */
export function useResolvedPollNotification(): void {
  const { data: resolvedPolls } = useResolvedPolls(20);
  const pollIds = (resolvedPolls || []).map(p => p.id);
  const { data: myVotes } = useMyVotes(pollIds);

  React.useEffect(() => {
    if (!resolvedPolls || resolvedPolls.length === 0) return;
    if (!myVotes) return;

    const checkAndNotify = async () => {
      try {
        // 1. 오늘 이미 알림을 보냈는지 확인
        const today = getLocalDateKey(0); // "YYYY-MM-DD" (local)
        const lastNotifyDate = await AsyncStorage.getItem(LAST_REVIEW_NOTIFY_KEY);
        if (lastNotifyDate === today) {
          // 오늘 이미 알림 발송 완료 → 중복 방지
          return;
        }

        // 2. 어제 날짜 계산
        const yesterdayStr = getLocalDateKey(-1); // "YYYY-MM-DD" (local)

        // 3. 어제 결과가 나온 투표 중 내가 투표한 것 찾기
        const myVotedPollIds = new Set((myVotes || []).map(v => v.poll_id));
        const newResults = (resolvedPolls || []).filter(poll => {
          if (!poll.resolved_at) return false;
          const resolvedDate = toLocalDateKey(poll.resolved_at);
          return resolvedDate === yesterdayStr && myVotedPollIds.has(poll.id);
        });

        if (newResults.length === 0) {
          // 어제 결과 나온 내 투표 없음 → 알림 불필요
          return;
        }

        // 4. 즉시 로컬 알림 발송
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '예측 결과가 나왔어요!',
            body: `어제 예측하신 ${newResults.length}개 질문의 결과가 나왔어요! 확인해보세요 🎯`,
            data: { type: 'prediction-result', count: newResults.length },
            sound: true,
          },
          trigger: null, // 즉시 발송
        });

        // 5. 오늘 날짜 기록 (하루 한 번 제한)
        await AsyncStorage.setItem(LAST_REVIEW_NOTIFY_KEY, today);

        if (__DEV__) {
          if (__DEV__) console.log(`[PredictionNotify] 예측 결과 알림 발송 완료 (${newResults.length}개)`);
        }
      } catch (e) {
        // 알림 실패해도 앱 동작에 영향 없음
        console.warn('[PredictionNotify] 알림 처리 실패:', e);
      }
    };

    checkAndNotify();
  // resolvedPolls와 myVotes가 로드 완료된 시점에 한 번 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPolls, myVotes]);
}
