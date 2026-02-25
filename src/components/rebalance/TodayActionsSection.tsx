/**
 * 오늘의 액션 섹션 — BUY/SELL/WATCH 종목별 액션 + 실시간 가격 + AI 딥다이브
 *
 * UX 개선 (2026-02-10):
 * - "왜 이 액션들이 나왔는가" 전체 요약 (헤더 하단, 액션 목록 상단)
 * - "어떤 순서로 실행하면 좋은가" 우선순위 가이드
 * - 각 액션 아이템에 "이 액션을 하면 어떤 효과가 있는가" 미니 설명
 * - 동적 테마 기반 설명 텍스트 레이어
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { SkeletonBlock } from '../SkeletonLoader';
import { estimateTax } from '../../utils/taxEstimator';
import { formatCurrency, getLocaleCode } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../styles/colors';
import type { PortfolioAction, RebalancePortfolioAsset, LivePriceData } from '../../types/rebalanceTypes';
import type { Asset } from '../../types/asset';
import { classifyAsset, AssetCategory, getNetAssetValue, KostolalyPhase, KOSTOLANY_PHASE_NAMES, KOSTOLANY_PHASE_EMOJIS, KOSTOLANY_PHASE_DESCRIPTIONS, calculateHealthScore, LIQUID_ASSET_CATEGORIES, normalizeLiquidTarget } from '../../services/rebalanceScore';
import { getTickerProfile, getCachedTickerProfile } from '../../data/tickerProfile';
import { useKostolalyPhase } from '../../hooks/useKostolalyPhase';
import { usePrescriptionResults } from '../../hooks/usePrescriptionResults';
import TermTooltip from '../common/TermTooltip';
import { CAT_ICONS } from '../../constants/categoryIcons';

// ── ETF 추천 맵 (없는 카테고리에 ETF 제안) ──
const ETF_RECOMMENDATIONS: Partial<Record<AssetCategory, { tickers: string[]; note: string }>> = {
  bond:      { tickers: ['TLT', 'AGG'],                     note: '미국 국채/종합채권 ETF' },
  gold:      { tickers: ['GLD', 'IAU', 'KODEX골드선물'],    note: '금 현물 ETF (한국: KODEX 골드선물)' },
  commodity: { tickers: ['DJP', 'PDBC'],                    note: '광범위 원자재 ETF' },
  large_cap: { tickers: ['SPY', 'QQQ', 'KODEX200'],        note: 'S&P500 / 나스닥100 / 코스피200' },
};

// ── 카테고리 한국어 라벨 ──
const CAT_LABEL: Record<AssetCategory, string> = {
  large_cap: '주식', bond: '채권', bitcoin: '비트코인',
  gold: '금/귀금속', commodity: '원자재', altcoin: '알트코인',
  cash: '현금', realestate: '부동산',
};

const CAT_ICON: Record<AssetCategory, string> = {
  large_cap: '📈', bond: '🏛️', bitcoin: '₿',
  gold: '🥇', commodity: '🛢️', altcoin: '🪙',
  cash: '💵', realestate: '🏠',
};

function roundToOneDecimal(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function formatCategoryPct(category: AssetCategory, pct: number): string {
  const safePct = Number.isFinite(pct) ? pct : 0;
  if (category === 'commodity') {
    return roundToOneDecimal(safePct).toFixed(1);
  }
  return Math.round(safePct).toString();
}

// ── getCurrency 제거됨 ──
// liveData?.currency 를 직접 사용 (CoinGecko→KRW, Yahoo 한국주식→KRW, Yahoo 미국주식→USD)

// ── 완료 축하 배너 ──

function CompletionBanner({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.spring(scale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();

      // 3초 후 페이드아웃
      setTimeout(() => {
        RNAnimated.parallel([
          RNAnimated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          RNAnimated.timing(scale, { toValue: 0.9, duration: 400, useNativeDriver: true }),
        ]).start();
      }, 3000);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <RNAnimated.View style={[
      {
        marginTop: 12,
        marginBottom: 8,
        backgroundColor: `${colors.success}1F`,
        borderRadius: 16,
        padding: 18,
        borderWidth: 2,
        borderColor: `${colors.success}4D`,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 14,
      },
      { opacity, transform: [{ scale }] },
    ]}>
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${colors.success}33`,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Ionicons name="checkmark-circle" size={28} color={colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 17,
          fontWeight: '800',
          color: colors.success,
          marginBottom: 4,
        }}>모든 액션 완료!</Text>
        <Text style={{
          fontSize: 15,
          color: colors.success,
          fontWeight: '500',
        }}>오늘도 성실한 투자자네요</Text>
      </View>
    </RNAnimated.View>
  );
}

// ── 투자 일지 (월별 메모, AsyncStorage) ──

const JOURNAL_KEY = '@investment_journal';

function getMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function useJournalMemo() {
  const [memo, setMemo] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(JOURNAL_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const key = getMonthKey();
          if (parsed[key]) {
            setMemo(parsed[key]);
            setIsSaved(true);
          }
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const saveMemo = useCallback(async (text: string) => {
    try {
      const raw = await AsyncStorage.getItem(JOURNAL_KEY) || '{}';
      const parsed = JSON.parse(raw);
      parsed[getMonthKey()] = text;
      await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(parsed));
      setIsSaved(true);
    } catch { /* ignore */ }
  }, []);

  return { memo, setMemo, saveMemo, isSaved };
}

// ── 액션 체크리스트 (오늘 날짜 기준 AsyncStorage) ──

const CHECKLIST_KEY = '@action_checklist';

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function useActionChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHECKLIST_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // 오늘 날짜 데이터만 로드 (하루 지나면 자동 리셋)
          if (parsed.date === getTodayKey()) {
            setChecked(parsed.items || {});
          }
        }
      } catch (err) {
        console.warn('[오늘의 액션] 체크리스트 로드 실패:', err);
      }
    })();
  }, []);

  const toggle = useCallback(async (ticker: string) => {
    // 햅틱 피드백 (성공/에러 구분)
    try {
      setChecked(prev => {
        const willBeChecked = !prev[ticker];
        // 체크 시: 성공 햅틱, 해제 시: 경고 햅틱
        Haptics.impactAsync(
          willBeChecked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
        ).catch(() => {}); // 미지원 디바이스 대응

        const next = { ...prev, [ticker]: willBeChecked };
        AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify({
          date: getTodayKey(),
          items: next,
        })).catch(() => {});
        return next;
      });
    } catch (e) {
      // 햅틱 실패해도 체크 동작은 정상 진행
      console.warn('Haptic feedback failed:', e);
    }
  }, []);

  return { checked, toggle };
}

/**
 * "왜 이 액션들이 나왔는가" 전체 요약 생성
 */
function generateActionsSummary(actions: PortfolioAction[]): string {
  if (actions.length === 0) return '';

  const buyCount = actions.filter(a => a.action === 'BUY').length;
  const sellCount = actions.filter(a => a.action === 'SELL').length;
  const watchCount = actions.filter(a => a.action === 'WATCH').length;
  const holdCount = actions.filter(a => a.action === 'HOLD').length;
  const highPriorityCount = actions.filter(a => a.priority === 'HIGH').length;

  const parts: string[] = [];

  if (sellCount > 0) parts.push(`비중 조정을 위한 매도 ${sellCount}건`);
  if (buyCount > 0) parts.push(`포트폴리오 보강을 위한 매수 ${buyCount}건`);
  if (watchCount > 0) parts.push(`모니터링 대상 ${watchCount}건`);
  if (holdCount > 0) parts.push(`현상 유지 ${holdCount}건`);

  let summary = parts.join(', ') + '이 제안되었어요.';

  if (highPriorityCount > 0) {
    summary += ` 이 중 ${highPriorityCount}건은 긴급(HIGH) 우선순위입니다.`;
  }

  return summary;
}

/**
 * "어떤 순서로 실행하면 좋은가" 가이드 생성
 */
function generatePriorityGuidance(actions: PortfolioAction[]): string | null {
  if (actions.length <= 1) return null;

  const highActions = actions.filter(a => a.priority === 'HIGH');
  const sellFirst = actions.filter(a => a.action === 'SELL' && a.priority !== 'LOW');
  const buyActions = actions.filter(a => a.action === 'BUY');

  if (highActions.length > 0 && (sellFirst.length > 0 || buyActions.length > 0)) {
    if (sellFirst.length > 0 && buyActions.length > 0) {
      return '매도를 먼저 실행해 현금을 확보한 후, 매수를 진행하면 추가 입금 없이 리밸런싱할 수 있어요.';
    }
    return `긴급 표시(!)된 ${highActions.length}건을 먼저 처리하는 것을 추천합니다.`;
  }

  if (sellFirst.length > 0 && buyActions.length > 0) {
    return '매도 후 매수 순서로 진행하면 자금 효율이 좋아요.';
  }

  return null;
}

/**
 * 각 액션의 "이 액션을 하면 어떤 효과가 있는가" 미니 설명 생성
 */
function generateActionEffect(action: PortfolioAction, assetWeight: string | null): string {
  const { action: act, priority } = action;

  if (act === 'SELL') {
    if (assetWeight && parseFloat(assetWeight) > 20) {
      return `현재 비중(${assetWeight}%)이 높아 매도 시 집중도 위험이 줄어듭니다.`;
    }
    return '매도하면 포트폴리오 균형이 개선되고, 다른 자산 매수 여력이 생겨요.';
  }

  if (act === 'BUY') {
    return '매수하면 부족한 비중이 채워져 목표 배분에 가까워져요.';
  }

  if (act === 'WATCH') {
    return '지금은 관망하되, 가격 변동에 따라 매매 타이밍을 잡아보세요.';
  }

  // HOLD
  return '현재 적정 비중이므로 유지하는 것이 좋습니다.';
}

// ── 카테고리별 리밸런싱 액션 ──
interface CategoryRebalanceAction {
  category: AssetCategory;
  currentPct: number;
  targetPct: number;
  drift: number;        // currentPct - targetPct (양수: 초과 → 매도, 음수: 부족 → 매수)
  driftAmount: number;  // 금액 (원)
  assets: (RebalancePortfolioAsset & { returnPct: number | null })[]; // 보유 자산 (수익률 기준 정렬)
}

interface TodayActionsSectionProps {
  sortedActions: PortfolioAction[];
  portfolio: RebalancePortfolioAsset[];
  livePrices: Record<string, LivePriceData | undefined>;
  totalAssets: number;
  /** HealthScoreSection과 동일한 현재 건강 점수 (단일 소스) */
  currentHealthScore: number;
  isAILoading: boolean;
  /** 코스톨라니/철학 기반 처방전 계산용 */
  allAssets?: Asset[];
  selectedTarget?: Record<AssetCategory, number>;
  /** 처방전 근거 출처 표시용 — 현재 코스톨라니 단계 */
  kostolalyPhase?: KostolalyPhase | null;
  /** 선택된 투자 철학 — 처방전 카드 정렬 + 불일치 경고용 */
  guruStyle?: string;
  /** 맥락 카드 센티먼트 (홈 탭 연동) */
  contextSentiment?: 'calm' | 'caution' | 'alert' | null;
  /** 맥락 카드 헤드라인 (홈 탭 연동) */
  contextHeadline?: string | null;
}

// 국면별 색상 (KostolalyPhaseCard와 동일)
const PHASE_COLORS: Record<KostolalyPhase, string> = {
  A: '#4CAF50', B: '#66BB6A', C: '#FF5722', D: '#FF8A65', E: '#CF6679', F: '#78909C',
};

export default function TodayActionsSection({
  sortedActions,
  portfolio,
  livePrices,
  totalAssets,
  currentHealthScore,
  isAILoading,
  allAssets,
  selectedTarget,
  kostolalyPhase,
  guruStyle,
  contextSentiment,
  contextHeadline,
}: TodayActionsSectionProps) {
  const { colors, shadows } = useTheme();

  // USD/KRW 환율 — USDT KRW 가격으로 추정 (미국 주식 수익률 계산용)
  // rebalance.tsx에서 priceTargets에 USDT를 항상 포함시켜 이 값을 보장함
  const usdToKrw = (livePrices['USDT']?.currentPrice ?? 1450) as number;

  // 코스톨라니 서문 데이터 (TanStack Query 캐시 공유 — 추가 API 호출 없음)
  const { data: phaseData, phase: hookPhase } = useKostolalyPhase();
  const activePhase = kostolalyPhase ?? hookPhase;
  const router = useRouter();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [completionBannerKey, setCompletionBannerKey] = useState(0);
  const [showAIActions, setShowAIActions] = useState(false);
  const { checked, toggle } = useActionChecklist();

  // 투자 철학 정합 여부 판단 (guruStyle × 티커 스타일)
  const isPhilosophyMismatch = useMemo(() => {
    if (!guruStyle || guruStyle === 'dalio') return (_ticker: string) => false;
    return (ticker: string): boolean => {
      const profile = getCachedTickerProfile(ticker);
      if (!profile) return false; // 미분류 종목은 경고 없음
      const { style } = profile;
      if (guruStyle === 'buffett') return style === 'speculative' || style === 'growth';
      if (guruStyle === 'cathie_wood') return style === 'value' || style === 'dividend';
      return false;
    };
  }, [guruStyle]);

  // 구루 철학 기반 정렬: 철학 부합 종목(BUY/HOLD) → 나머지 → 불일치 종목 순
  const philosophySortedActions = useMemo(() => {
    if (!guruStyle || guruStyle === 'dalio') return sortedActions;
    return [...sortedActions].sort((a, b) => {
      const aMismatch = isPhilosophyMismatch(a.ticker) ? 1 : 0;
      const bMismatch = isPhilosophyMismatch(b.ticker) ? 1 : 0;
      return aMismatch - bMismatch;
    });
  }, [sortedActions, guruStyle, isPhilosophyMismatch]);

  // 완료 카운트 (처방전 결과 동기화에 사용)
  const completedCount = philosophySortedActions.filter(a => checked[a.ticker]).length;
  const isAllCompleted = completedCount === philosophySortedActions.length && philosophySortedActions.length > 0;

  // P1-1: 처방전 월별 결과 추적
  const {
    lastMonthResult,
    lastMonthRate,
    lastMonthScoreChange,
    syncCompleted,
  } = usePrescriptionResults({
    currentPhase: activePhase,
    actionsCount: sortedActions.length,
    completedCount,
    currentScore: Math.round(currentHealthScore),
  });

  // P3-A: completedCount 변경 시 처방전 완료 수 자동 동기화
  useEffect(() => {
    if (sortedActions.length > 0 && completedCount >= 0) {
      syncCompleted();
    }
  }, [completedCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // P3-B: 투자 일지 메모
  const { memo, setMemo, saveMemo, isSaved } = useJournalMemo();

  // ── 카테고리 리밸런싱 계획 계산 ──
  const normalizedTarget = useMemo(
    () => normalizeLiquidTarget(selectedTarget),
    [selectedTarget],
  );

  const categoryRebalancePlan = useMemo<CategoryRebalanceAction[]>(() => {
    if (!allAssets || totalAssets <= 0) return [];

    // 유동 자산만 (부동산 제외)
    const liquidAssets = allAssets.filter(a => classifyAsset(a) !== 'realestate');
    const liquidTotal = liquidAssets.reduce((sum, a) => sum + getNetAssetValue(a), 0);
    if (liquidTotal <= 0) return [];

    // 카테고리별 현재 금액/비중 계산
    const catAmount: Record<AssetCategory, number> = {
      cash: 0, bond: 0, large_cap: 0, realestate: 0,
      bitcoin: 0, altcoin: 0, gold: 0, commodity: 0,
    };
    for (const asset of liquidAssets) {
      const cat = classifyAsset(asset);
      catAmount[cat] += getNetAssetValue(asset);
    }

    const result: CategoryRebalanceAction[] = [];

    for (const cat of LIQUID_ASSET_CATEGORIES) {
      const currentAmt = catAmount[cat] || 0;
      const currentPct = (currentAmt / liquidTotal) * 100;
      const targetPct = normalizedTarget[cat] || 0;
      const drift = currentPct - targetPct;
      const driftAmount = (drift / 100) * liquidTotal; // 양수: 초과(매도), 음수: 부족(매수)

      // 이탈도 3%p 미만은 무시
      if (Math.abs(drift) < 3) continue;

      // 해당 카테고리의 보유 자산 찾기 (포트폴리오 match)
      const catAssets = liquidAssets
        .filter(a => classifyAsset(a) === cat)
        .map(a => {
          const matched = portfolio.find(p =>
            p.ticker?.toUpperCase() === a.ticker?.toUpperCase()
          );
          // DB currentPrice = avg_price 이므로 반드시 라이브 가격 우선 사용
          // 라이브 가격 없으면 returnPct = null (0% 오표시 방지)
          // USD 자산(미국 주식): live USD 가격 × usdToKrw → KRW 환산 후 avgPrice(KRW)와 비교
          const liveEntry = livePrices[a.ticker || ''];
          const currentPrice = liveEntry?.currentPrice || matched?.currentPrice || 0;
          const avgPrice = matched?.avgPrice || a.avgPrice || 0;
          let returnPct: number | null = null;
          if (liveEntry && avgPrice > 0 && currentPrice > 0) {
            const entCurrency = (liveEntry?.currency ?? 'KRW') as string;
            const currentPriceKRW = entCurrency === 'USD' ? currentPrice * usdToKrw : currentPrice;
            const raw = ((currentPriceKRW - avgPrice) / avgPrice) * 100;
            if (raw >= -90 && raw <= 500) returnPct = raw;
          }
          return {
            ticker: a.ticker || '',
            name: a.name || '',
            quantity: matched?.quantity,
            currentPrice,
            avgPrice,
            currentValue: getNetAssetValue(a),
            returnPct,
          };
        })
        .sort((a, b) => {
          // 매도 순서: 수익률 높은 순 (수익 실현 우선)
          if (drift > 0) return (b.returnPct ?? 0) - (a.returnPct ?? 0);
          // 매수 순서: 수익률 낮은 순 (추가 매수)
          return (a.returnPct ?? 0) - (b.returnPct ?? 0);
        });

      result.push({ category: cat, currentPct, targetPct, drift, driftAmount, assets: catAssets });
    }

    // 매도 먼저, 매수 나중
    return result.sort((a, b) => b.drift - a.drift);
  }, [allAssets, normalizedTarget, totalAssets, portfolio]);

  // ── 처방전 실행 시 예상 건강 점수 변화 (P2-B) ──
  const expectedScoreChange = useMemo(() => {
    if (!allAssets || categoryRebalancePlan.length === 0) return null;

    const liquidAssets = allAssets.filter(a => classifyAsset(a) !== 'realestate');
    const liquidTotal = liquidAssets.reduce((sum, a) => sum + getNetAssetValue(a), 0);
    if (liquidTotal <= 0) return null;

    // 현재 점수: HealthScoreSection과 동일한 단일 소스 사용
    const currentScore = Math.round(currentHealthScore);

    // 카테고리별 현재 순자산 합계
    const catNetTotals: Partial<Record<AssetCategory, number>> = {};
    for (const asset of liquidAssets) {
      const cat = classifyAsset(asset);
      catNetTotals[cat] = (catNetTotals[cat] || 0) + getNetAssetValue(asset);
    }

    // ── 시뮬레이션: 유동 자산 비중을 목표로 조정 ──
    const simulatedLiquidAssets: typeof liquidAssets = liquidAssets.map(asset => {
      const cat = classifyAsset(asset);
      const currentCatNet = catNetTotals[cat] || 0;
      const targetPct = normalizedTarget[cat as AssetCategory] || 0;
      const targetNetAmt = liquidTotal * (targetPct / 100);
      const scale = currentCatNet > 0 ? targetNetAmt / currentCatNet : 0;
      const newNet = Math.max(0, getNetAssetValue(asset) * scale);
      return {
        ...asset,
        currentValue: newNet + (asset.debtAmount || 0),
        quantity: undefined,     // ← getAssetValue가 currentValue를 쓰도록
        currentPrice: undefined, // ← getAssetValue가 currentValue를 쓰도록
      };
    });

    // 보유 자산 없는 카테고리 → 가상 자산 추가 (처방전 매수 시뮬레이션)
    // 예: 채권 0% → 40% 처방이면 채권 ETF 구매 효과를 가상 자산으로 반영
    const CAT_TICKER: Partial<Record<AssetCategory, string>> = {
      bond: 'TLT', gold: 'GLD', commodity: 'DJP',
      large_cap: 'SPY', cash: 'CASH_KRW', altcoin: 'ETH', bitcoin: 'BTC',
    };
    const templateAsset = liquidAssets[0];
    if (templateAsset) {
      for (const cat of LIQUID_ASSET_CATEGORIES) {
        const targetPct = normalizedTarget[cat] || 0;
        if (targetPct > 0 && (catNetTotals[cat] || 0) === 0) {
          // 해당 카테고리에 보유 자산이 없을 때 가상 포지션 추가
          simulatedLiquidAssets.push({
            ...templateAsset,
            id: `virtual_${cat}`,
            name: `Virtual ${cat}`,
            ticker: CAT_TICKER[cat] ?? 'SPY',
            currentValue: liquidTotal * (targetPct / 100),
            quantity: undefined,
            currentPrice: undefined,
            debtAmount: 0,
            avgPrice: undefined,
            costBasis: undefined,
          });
        }
      }
    }

    // 전체 자산 스코어 체계 유지: 비유동 자산(부동산)은 그대로 두고 유동만 교체
    const simulatedById = new Map(simulatedLiquidAssets.map(asset => [asset.id, asset]));
    const simulatedAllAssets = allAssets.map(asset => simulatedById.get(asset.id) ?? asset);
    const originalIds = new Set(allAssets.map(asset => asset.id));
    for (const asset of simulatedLiquidAssets) {
      if (!originalIds.has(asset.id)) {
        simulatedAllAssets.push(asset);
      }
    }

    const projectedScore = Math.round(calculateHealthScore(
      simulatedAllAssets,
      totalAssets,
      normalizedTarget,
      { guruStyle },
    ).totalScore);
    const change = projectedScore - currentScore;

    if (Math.abs(change) < 1) return null; // 변화 미미하면 숨김

    return { currentScore, projectedScore, change };
  }, [allAssets, normalizedTarget, categoryRebalancePlan, currentHealthScore, totalAssets, guruStyle]);

  // 전체 요약 + 우선순위 가이드 계산
  const actionsSummary = useMemo(() => generateActionsSummary(sortedActions), [sortedActions]);
  const priorityGuidance = useMemo(() => generatePriorityGuidance(sortedActions), [sortedActions]);

  // 전체 완료 시 축하 배너 표시 (한 번만)
  useEffect(() => {
    if (isAllCompleted && !showCompletionBanner) {
      setShowCompletionBanner(true);
      setCompletionBannerKey(prev => prev + 1);
      // 4초 후 배너 숨김 (애니메이션 종료 대기)
      setTimeout(() => setShowCompletionBanner(false), 4000);
    }
    // 완료 해제 시 배너 리셋
    if (!isAllCompleted && showCompletionBanner) {
      setShowCompletionBanner(false);
    }
  }, [isAllCompleted]);

  const s = createStyles(colors);

  // 액션 색상 매핑 (테마 반응형)
  const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    BUY:   { bg: `${colors.success}26`, text: colors.success, label: '매수' },
    SELL:  { bg: `${colors.error}26`, text: colors.error, label: '매도' },
    HOLD:  { bg: `${colors.textTertiary}26`, text: colors.textTertiary, label: '보유' },
    WATCH: { bg: `${colors.warning}26`, text: colors.warning, label: '주시' },
  };

  // 티커 스타일 뱃지 (tickerProfile 연동)
  const STYLE_BADGE: Record<string, { label: string; color: string }> = {
    growth:     { label: '성장주', color: '#4CAF50' },
    value:      { label: '가치주', color: '#2196F3' },
    dividend:   { label: '배당주', color: '#9C27B0' },
    speculative:{ label: '투기주', color: '#FF5722' },
    index:      { label: '인덱스', color: '#607D8B' },
  };

  // AI 로딩 중 스켈레톤
  if (isAILoading && sortedActions.length === 0) {
    return (
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SkeletonBlock width={120} height={16} />
        <View style={{ marginTop: 12, gap: 8 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{ backgroundColor: colors.surfaceElevated, borderRadius: 12, padding: 14 }}>
              <SkeletonBlock width={60} height={14} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="85%" height={12} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (sortedActions.length === 0) return null;

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.headerRow}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.cardLabel, { color: colors.textPrimary }]}>이번 달 처방전</Text>
            <TermTooltip term="처방전" style={{ color: colors.textTertiary, fontSize: 14 }}>ⓘ</TermTooltip>
          </View>
          <Text style={[s.cardLabelEn, { color: colors.textSecondary }]}>Monthly Prescription</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {completedCount > 0 && (
            <View style={s.completedCount}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={[s.completedCountText, { color: colors.success }]}>{completedCount}완료</Text>
            </View>
          )}
          <View style={[s.actionCount, { backgroundColor: `${colors.success}1A` }]}>
            <Text style={[s.actionCountText, { color: colors.primaryDark ?? colors.primary }]}>{sortedActions.length}건</Text>
          </View>
        </View>
      </View>

      {/* P1-1: 지난달 처방전 결과 카드 */}
      {lastMonthResult && lastMonthResult.actions_recommended > 0 && (
        <View style={[s.lastMonthCard, {
          backgroundColor: `${colors.textTertiary}0A`,
          borderColor: `${colors.textTertiary}20`,
        }]}>
          <View style={s.lastMonthHeader}>
            <Ionicons name="calendar-outline" size={11} color={colors.textTertiary} />
            <Text style={[s.lastMonthTitle, { color: colors.textTertiary }]}>
              지난달 처방전 결과 ({lastMonthResult.month})
            </Text>
          </View>
          <View style={s.lastMonthStats}>
            {/* 실행률 */}
            <View style={s.lastMonthStat}>
              <Text style={[s.lastMonthStatValue, {
                color: lastMonthRate != null && lastMonthRate >= 60 ? colors.success : colors.warning,
              }]}>
                {lastMonthRate != null ? `${lastMonthRate}%` : '-'}
              </Text>
              <Text style={[s.lastMonthStatLabel, { color: colors.textTertiary }]}>
                {lastMonthResult.actions_completed}/{lastMonthResult.actions_recommended}건 실행
              </Text>
            </View>
            {/* 건강 점수 변화 */}
            {lastMonthScoreChange != null && (
              <View style={[s.lastMonthDivider, { backgroundColor: colors.border }]} />
            )}
            {lastMonthScoreChange != null && (
              <View style={s.lastMonthStat}>
                <Text style={[s.lastMonthStatValue, {
                  color: lastMonthScoreChange >= 0 ? colors.success : colors.error,
                }]}>
                  {lastMonthScoreChange >= 0 ? '+' : ''}{lastMonthScoreChange}점
                </Text>
                <Text style={[s.lastMonthStatLabel, { color: colors.textTertiary }]}>건강 점수 변화</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 코스톨라니 서문 카드 — 처방전의 시장 맥락 */}
      {activePhase ? (
        <View style={[s.phasePreview, {
          backgroundColor: `${PHASE_COLORS[activePhase]}12`,
          borderColor: `${PHASE_COLORS[activePhase]}30`,
        }]}>
          <View style={s.phasePreviewHeader}>
            <View style={[s.phasePreviewTag, {
              backgroundColor: `${PHASE_COLORS[activePhase]}20`,
              borderColor: `${PHASE_COLORS[activePhase]}50`,
            }]}>
              <Text style={[s.phasePreviewTagText, { color: PHASE_COLORS[activePhase] }]}>
                {KOSTOLANY_PHASE_EMOJIS[activePhase]} {activePhase}단계 · {KOSTOLANY_PHASE_NAMES[activePhase]}
              </Text>
            </View>
            {phaseData?.confidence != null && (
              <Text style={[s.phaseConfidence, { color: colors.textTertiary }]}>
                신뢰도 {phaseData.confidence}%
              </Text>
            )}
          </View>
          <Text style={[s.phasePreviewDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {KOSTOLANY_PHASE_DESCRIPTIONS[activePhase]}
          </Text>

          {/* P0-1: 코스톨라니 판정 근거 지표 (최대 3개) */}
          {phaseData?.reasoning && phaseData.reasoning.length > 0 && (
            <View style={s.phaseReasoningList}>
              {phaseData.reasoning.slice(0, 3).map((reason, i) => (
                <View key={i} style={s.phaseReasoningItem}>
                  <Text style={[s.phaseReasoningDot, { color: PHASE_COLORS[activePhase] }]}>•</Text>
                  <Text style={[s.phaseReasoningText, { color: colors.textSecondary }]}>{reason}</Text>
                </View>
              ))}
            </View>
          )}

          {/* P0-3: 낮은 신뢰도 경고 (80% 미만) */}
          {phaseData?.confidence != null && phaseData.confidence < 80 && (
            <View style={[s.phaseNuanceRow, {
              backgroundColor: `${colors.warning}0F`,
              borderColor: `${colors.warning}30`,
            }]}>
              <Ionicons name="alert-circle-outline" size={10} color={colors.warning} />
              <Text style={[s.phaseNuanceText, { color: colors.warning }]}>
                {phaseData.confidence >= 70 ? '시장 해석이 다소 엇갈려요' : '시장 신호가 불분명해요'}
              </Text>
            </View>
          )}

          <View style={s.phaseBasisRow}>
            <Ionicons name="compass-outline" size={10} color={colors.textTertiary} />
            <Text style={[s.phaseBasisText, { color: colors.textTertiary }]}>
              코스톨라니 {activePhase}단계 기준 · 달리오 All Weather 적용
            </Text>
            {/* P0-2: 데이터 신선도 타임스탬프 */}
            {phaseData?.updated_at && (
              <Text style={[s.phaseBasisText, { color: colors.textTertiary }]}>
                {' '}· 판정: {new Date(phaseData.updated_at).toLocaleDateString(getLocaleCode(), { month: 'numeric', day: 'numeric' })}
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View style={[s.basisRow, { backgroundColor: `${colors.textTertiary}0D`, borderColor: `${colors.textTertiary}20` }]}>
          <Ionicons name="compass-outline" size={11} color={colors.textTertiary} />
          <Text style={[s.basisText, { color: colors.textTertiary }]}>달리오 All Weather 기준</Text>
        </View>
      )}

      {/* ── NEW: 카테고리 기반 실행 계획서 ── */}
      {categoryRebalancePlan.length > 0 && (
        <View style={s.rebalancePlan}>
          {/* STEP 1: 매도 */}
          {categoryRebalancePlan.filter(a => a.drift > 0).length > 0 && (
            <View style={s.planStep}>
              <View style={[s.planStepHeader, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
                <View style={[s.planStepNum, { backgroundColor: colors.error }]}>
                  <Text style={s.planStepNumText}>1</Text>
                </View>
                <Text style={[s.planStepTitle, { color: colors.error }]}>초과 자산 매도 (현금 확보)</Text>
              </View>
              {categoryRebalancePlan
                .filter(a => a.drift > 0)
                .map(item => {
                  const amtStr = Math.abs(item.driftAmount) >= 100000000
                    ? `${(Math.abs(item.driftAmount) / 100000000).toFixed(1)}억`
                    : `${Math.round(Math.abs(item.driftAmount) / 10000)}만원`;
                  return (
                    <View key={item.category} style={[s.planCatItem, { borderColor: `${colors.error}20` }]}>
                      <View style={s.planCatHeader}>
                        <Text style={[s.planCatIcon, item.category === 'bitcoin' && { color: '#F5A623' }]}>{CAT_ICON[item.category]}</Text>
                        <Text style={[s.planCatLabel, { color: colors.textPrimary }]}>{CAT_LABEL[item.category]}</Text>
                        <Text style={[s.planCatDrift, { color: colors.textTertiary }]}>
                          {formatCategoryPct(item.category, item.currentPct)}% → {formatCategoryPct(item.category, item.targetPct)}%
                        </Text>
                        <View style={[s.planCatAmtBadge, { backgroundColor: `${colors.error}20` }]}>
                          <Text style={[s.planCatAmtText, { color: colors.error }]}>▼ 매도 {amtStr}</Text>
                        </View>
                      </View>
                      {/* 매도 추천 자산 (수익률 높은 순) */}
                      {item.assets.slice(0, 3).map((a, idx) => {
                        // 수익률 기반 힌트 — 손실 중인 자산에 "수익 실현 우선" 방지
                        const sellHint = a.returnPct === null
                          ? '매도 검토'
                          : a.returnPct > 0
                            ? (idx === 0 ? '수익 실현 우선' : '일부 매도 검토')
                            : '비중 조정 매도';  // 손실이어도 비중 초과 → 리밸런싱 매도
                        return (
                          <View key={idx} style={[s.planAssetRow, { borderTopColor: colors.border }]}>
                            <Text style={[s.planAssetTicker, { color: colors.textPrimary }]}>{a.ticker || a.name}</Text>
                            {a.returnPct !== null && (
                              <Text style={[s.planAssetReturn, { color: a.returnPct >= 0 ? colors.success : colors.error }]}>
                                {a.returnPct >= 0 ? '+' : ''}{a.returnPct.toFixed(1)}%
                              </Text>
                            )}
                            <Text style={[s.planAssetHint, { color: colors.textTertiary }]}>
                              {sellHint}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
            </View>
          )}

          {/* STEP 2: 매수 */}
          {categoryRebalancePlan.filter(a => a.drift < 0).length > 0 && (
            <View style={s.planStep}>
              <View style={[s.planStepHeader, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}>
                <View style={[s.planStepNum, { backgroundColor: colors.success }]}>
                  <Text style={s.planStepNumText}>2</Text>
                </View>
                <Text style={[s.planStepTitle, { color: colors.success }]}>부족 자산 매수 (비중 보강)</Text>
              </View>
              {categoryRebalancePlan
                .filter(a => a.drift < 0)
                .map(item => {
                  const amtStr = Math.abs(item.driftAmount) >= 100000000
                    ? `${(Math.abs(item.driftAmount) / 100000000).toFixed(1)}억`
                    : `${Math.round(Math.abs(item.driftAmount) / 10000)}만원`;
                  const etfRec = ETF_RECOMMENDATIONS[item.category];
                  const hasHolding = item.assets.length > 0;
                  return (
                    <View key={item.category} style={[s.planCatItem, { borderColor: `${colors.success}20` }]}>
                      <View style={s.planCatHeader}>
                        <Text style={[s.planCatIcon, item.category === 'bitcoin' && { color: '#F5A623' }]}>{CAT_ICON[item.category]}</Text>
                        <Text style={[s.planCatLabel, { color: colors.textPrimary }]}>{CAT_LABEL[item.category]}</Text>
                        <Text style={[s.planCatDrift, { color: colors.textTertiary }]}>
                          {formatCategoryPct(item.category, item.currentPct)}% → {formatCategoryPct(item.category, item.targetPct)}%
                        </Text>
                        <View style={[s.planCatAmtBadge, { backgroundColor: `${colors.success}20` }]}>
                          <Text style={[s.planCatAmtText, { color: colors.success }]}>▲ 매수 {amtStr}</Text>
                        </View>
                      </View>
                      {/* 기존 보유 자산이 있으면 추가 매수 */}
                      {hasHolding && item.assets.slice(0, 2).map((a, idx) => (
                        <View key={idx} style={[s.planAssetRow, { borderTopColor: colors.border }]}>
                          <Text style={[s.planAssetTicker, { color: colors.textPrimary }]}>{a.ticker || a.name}</Text>
                          {a.returnPct !== null && (
                            <Text style={[s.planAssetReturn, { color: a.returnPct >= 0 ? colors.success : colors.error }]}>
                              {a.returnPct >= 0 ? '+' : ''}{a.returnPct.toFixed(1)}%
                            </Text>
                          )}
                          <Text style={[s.planAssetHint, { color: colors.textTertiary }]}>추가 매수</Text>
                        </View>
                      ))}
                      {/* 없는 카테고리 → ETF 추천 */}
                      {!hasHolding && etfRec && (
                        <View style={[s.etfRec, { borderTopColor: colors.border, backgroundColor: `${colors.warning}0A` }]}>
                          <Ionicons name="information-circle-outline" size={12} color={colors.warning} />
                          <View style={{ flex: 1 }}>
                            <Text style={[s.etfRecLabel, { color: colors.warning }]}>ETF 추천</Text>
                            <Text style={[s.etfRecTickers, { color: colors.textPrimary }]}>
                              {etfRec.tickers.join(' · ')}
                            </Text>
                            <Text style={[s.etfRecNote, { color: colors.textTertiary }]}>{etfRec.note}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      )}

      {/* ── P2-B: 처방전 실행 시 예상 건강 점수 변화 ── */}
      {expectedScoreChange && (
        <View style={[s.scorePreview, {
          backgroundColor: expectedScoreChange.change > 0
            ? `${colors.success}12`
            : `${colors.warning}12`,
          borderColor: expectedScoreChange.change > 0
            ? `${colors.success}30`
            : `${colors.warning}30`,
        }]}>
          <View style={s.scorePreviewHeader}>
            <Ionicons
              name="trending-up-outline"
              size={13}
              color={expectedScoreChange.change > 0 ? colors.success : colors.warning}
            />
            <Text style={[s.scorePreviewLabel, {
              color: expectedScoreChange.change > 0 ? colors.success : colors.warning,
            }]}>
              처방전 전체 실행 시 예상 변화
            </Text>
          </View>
          <View style={s.scorePreviewRow}>
            <Text style={[s.scorePreviewCurrent, { color: colors.textSecondary }]}>
              현재 {expectedScoreChange.currentScore}점
            </Text>
            <Ionicons name="arrow-forward" size={12} color={colors.textTertiary} />
            <Text style={[s.scorePreviewProjected, {
              color: expectedScoreChange.change > 0 ? colors.success : colors.warning,
            }]}>
              {expectedScoreChange.projectedScore}점 예상
            </Text>
            <View style={[s.scorePreviewBadge, {
              backgroundColor: expectedScoreChange.change > 0
                ? `${colors.success}20`
                : `${colors.warning}20`,
            }]}>
              <Text style={[s.scorePreviewBadgeText, {
                color: expectedScoreChange.change > 0 ? colors.success : colors.warning,
              }]}>
                {expectedScoreChange.change > 0 ? '+' : ''}{expectedScoreChange.change}점
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── AI 맞춤 추천 (접기/펼치기) ── */}
      {sortedActions.length > 0 && (
        <TouchableOpacity
          style={[s.aiToggleBtn, { borderColor: colors.border }]}
          onPress={() => setShowAIActions(!showAIActions)}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles-outline" size={13} color={colors.premium ? colors.premium.purple : colors.textSecondary} />
          <Text style={[s.aiToggleBtnText, { color: colors.textSecondary }]}>
            AI 맞춤 추천 ({sortedActions.length}건)
          </Text>
          <Ionicons
            name={showAIActions ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={colors.textTertiary}
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>
      )}

      {showAIActions && (
        <>
          {/* "왜 이 액션들이 나왔는가" 전체 요약 */}
          <View style={[s.whySection, { backgroundColor: colors.surfaceElevated }]}>
            <View style={s.whyRow}>
              <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
              <Text style={[s.whyLabel, { color: colors.textSecondary }]}>왜 이 액션들이 나왔나요?</Text>
            </View>
            <Text style={[s.whyText, { color: colors.textSecondary }]}>{actionsSummary}</Text>
          </View>

          {/* "어떤 순서로 실행할까" 우선순위 가이드 */}
          {priorityGuidance && (
            <View style={[s.actionGuideSection, { backgroundColor: `${colors.success}1A`, borderLeftColor: `${colors.success}4D` }]}>
              <View style={s.actionGuideRow}>
                <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.success} />
                <Text style={[s.actionGuideLabel, { color: colors.primaryDark ?? colors.primary }]}>실행 순서 가이드</Text>
              </View>
              <Text style={[s.actionGuideText, { color: colors.textSecondary }]}>{priorityGuidance}</Text>
            </View>
          )}

          {/* 전체 완료 축하 배너 */}
          <CompletionBanner key={completionBannerKey} visible={showCompletionBanner} />
        </>
      )}

      {/* categoryRebalancePlan 없을 때 기존 요약 표시 */}
      {categoryRebalancePlan.length === 0 && (
        <>
          <View style={[s.whySection, { backgroundColor: colors.surfaceElevated }]}>
            <View style={s.whyRow}>
              <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
              <Text style={[s.whyLabel, { color: colors.textSecondary }]}>왜 이 액션들이 나왔나요?</Text>
            </View>
            <Text style={[s.whyText, { color: colors.textSecondary }]}>{actionsSummary}</Text>
          </View>
          {priorityGuidance && (
            <View style={[s.actionGuideSection, { backgroundColor: `${colors.success}1A`, borderLeftColor: `${colors.success}4D` }]}>
              <View style={s.actionGuideRow}>
                <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.success} />
                <Text style={[s.actionGuideLabel, { color: colors.primaryDark ?? colors.primary }]}>실행 순서 가이드</Text>
              </View>
              <Text style={[s.actionGuideText, { color: colors.textSecondary }]}>{priorityGuidance}</Text>
            </View>
          )}
          <CompletionBanner key={completionBannerKey} visible={showCompletionBanner} />
        </>
      )}

      {/* P3-B: 투자 일지 — 모든 액션 완료 시 표시 */}
      {isAllCompleted && (
        <View style={[s.journalCard, { backgroundColor: colors.surfaceElevated, borderColor: `${colors.success}30` }]}>
          <View style={s.journalHeader}>
            <Ionicons name="journal-outline" size={13} color={colors.success} />
            <Text style={[s.journalTitle, { color: colors.success }]}>이번 달 투자 일지</Text>
            {isSaved && (
              <View style={[s.journalSavedBadge, { backgroundColor: `${colors.success}20` }]}>
                <Text style={[s.journalSavedText, { color: colors.success }]}>저장됨</Text>
              </View>
            )}
          </View>
          <TextInput
            style={[s.journalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
            multiline
            numberOfLines={3}
            placeholder="이번 달 처방전을 실행하며 느낀 점을 짧게 남겨보세요 (선택)"
            placeholderTextColor={colors.textTertiary}
            value={memo}
            onChangeText={setMemo}
            onBlur={() => { if (memo.trim()) saveMemo(memo); }}
          />
          {memo.trim().length > 0 && !isSaved && (
            <TouchableOpacity
              style={[s.journalSaveBtn, { backgroundColor: `${colors.success}20`, borderColor: `${colors.success}40` }]}
              onPress={() => saveMemo(memo)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-outline" size={13} color={colors.success} />
              <Text style={[s.journalSaveBtnText, { color: colors.success }]}>저장</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 오늘 맥락 연동 (홈 탭 맥락 카드 요약) */}
      {contextHeadline && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: contextSentiment === 'alert' ? `${colors.error}15` : contextSentiment === 'caution' ? `${colors.warning}15` : `${colors.success}15`,
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
        }}>
          <Ionicons
            name={contextSentiment === 'alert' ? 'warning' : contextSentiment === 'caution' ? 'alert-circle' : 'checkmark-circle'}
            size={16}
            color={contextSentiment === 'alert' ? colors.error : contextSentiment === 'caution' ? colors.warning : colors.success}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginBottom: 2 }}>오늘의 시장 맥락</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }} numberOfLines={2}>
              {contextHeadline}
            </Text>
          </View>
        </View>
      )}

      {(showAIActions || categoryRebalancePlan.length === 0) && philosophySortedActions.slice(0, 5).map((action, idx) => {
        const ac = ACTION_COLORS[action.action] || ACTION_COLORS.HOLD;
        const isHighPriority = action.priority === 'HIGH';
        const isExpanded = expandedIdx === idx;
        const isDone = !!checked[action.ticker];
        const hasMismatch = isPhilosophyMismatch(action.ticker);

        // 포트폴리오에서 해당 종목 찾기
        const matchedAsset = portfolio.find(
          a => a.ticker?.toUpperCase() === action.ticker?.toUpperCase()
        );

        // 실시간 가격
        const liveData = livePrices[action.ticker];
        const displayPrice = liveData?.currentPrice || matchedAsset?.currentPrice || 0;
        const isLive = !!liveData?.currentPrice;

        // 수익률 계산 — 라이브 가격이 있을 때만 계산 (DB fallback 시 0% 오표시 방지)
        // USD 자산: displayPrice(USD) × usdToKrw → KRW 환산 후 avgPrice(KRW)와 비교
        let assetGl: number | null = null;
        if (isLive && matchedAsset && matchedAsset.avgPrice > 0 && displayPrice > 0) {
          const liveCurrency = (liveData?.currency ?? 'KRW') as string;
          const displayPriceKRW = liveCurrency === 'USD' ? displayPrice * usdToKrw : displayPrice;
          const rawGl = ((displayPriceKRW - matchedAsset.avgPrice) / matchedAsset.avgPrice) * 100;
          if (rawGl >= -90 && rawGl <= 500) {
            assetGl = rawGl;
          }
        }
        const assetWeight = matchedAsset && totalAssets > 0
          ? ((matchedAsset.currentValue / totalAssets) * 100).toFixed(1)
          : null;

        // 우선순위 설정
        const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
          HIGH:   { label: '긴급', color: colors.error, bg: `${colors.error}1F` },
          MEDIUM: { label: '보통', color: colors.warning, bg: `${colors.warning}1F` },
          LOW:    { label: '참고', color: colors.textTertiary, bg: `${colors.textTertiary}1F` },
        };
        const pc = priorityConfig[action.priority] || priorityConfig.LOW;

        // 이 액션의 기대 효과
        const actionEffect = generateActionEffect(action, assetWeight);

        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.7}
            onPress={() => setExpandedIdx(isExpanded ? null : idx)}
            style={[
              s.actionItem,
              { backgroundColor: colors.surfaceElevated },
              isHighPriority && { borderLeftWidth: 3, borderLeftColor: ac.text },
              isExpanded && [s.actionItemExpanded, { backgroundColor: colors.surface, borderColor: `${colors.success}4D` }],
              isDone && { opacity: 0.5 },
            ]}
          >
            {/* 상단: 액션 뱃지 + 종목명 + 체크박스 */}
            <View style={s.actionTop}>
              <View style={[s.actionBadge, { backgroundColor: ac.bg }]}>
                <Text style={[s.actionBadgeText, { color: ac.text }]}>{ac.label}</Text>
              </View>
              <Text style={[s.actionTicker, { color: colors.textPrimary }]}>{isDone ? '✓ ' : ''}{action.ticker}</Text>
              {(() => {
                const profile = getCachedTickerProfile(action.ticker);
                const badge = profile ? STYLE_BADGE[profile.style] : null;
                if (!badge) return null;
                return (
                  <View style={[s.styleBadge, { backgroundColor: badge.color + '22', borderColor: badge.color + '55' }]}>
                    <Text style={[s.styleBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                );
              })()}
              {hasMismatch && !isDone && (
                <View style={[s.mismatchBadge]}>
                  <Text style={s.mismatchBadgeText}>철학 불일치</Text>
                </View>
              )}
              <Text style={[s.actionName, { color: colors.textTertiary }]} numberOfLines={1}>{action.name}</Text>
              {isHighPriority && !isDone && (
                <View style={[s.urgentDot, { backgroundColor: colors.error }]}>
                  <Text style={[s.urgentDotText, { color: colors.inverseText }]}>!</Text>
                </View>
              )}
              {/* 실행 완료 체크 버튼 */}
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); toggle(action.ticker); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[s.checkBtn, isDone && s.checkBtnDone]}
              >
                <Ionicons
                  name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={isDone ? colors.success : colors.textQuaternary}
                />
              </TouchableOpacity>
            </View>

            {/* 현재가 + 등락률 (접힌 상태) */}
            {!isExpanded && displayPrice > 0 && (
              <View style={s.priceRow}>
                <Text style={[s.priceText, { color: colors.textPrimary }]}>{formatCurrency(displayPrice, (liveData?.currency as 'KRW' | 'USD' | undefined) ?? 'KRW')}</Text>
                {assetGl !== null && (
                  <Text style={[s.changeText, { color: (assetGl ?? 0) >= 0 ? colors.success : colors.error }]}>
                    {(assetGl ?? 0) >= 0 ? '+' : ''}{(assetGl ?? 0).toFixed(1)}%
                  </Text>
                )}
                {isLive && (
                  <View style={s.liveIndicator}>
                    <View style={[s.liveDotSmall, { backgroundColor: colors.success }]} />
                    <Text style={[s.liveLabel, { color: colors.success }]}>LIVE</Text>
                  </View>
                )}
              </View>
            )}

            {/* 접힌 상태: 사유 2줄 */}
            {!isExpanded && (
              <Text style={[s.actionReason, { color: colors.textTertiary }]} numberOfLines={2}>
                {action.reason?.includes('분석 데이터를 불러오지 못했습니다')
                  ? '현재 적정 비중으로 유지하는 것이 좋습니다. AI 분석이 업데이트되면 구체적인 제안을 받으실 수 있어요.'
                  : action.reason}
              </Text>
            )}

            {/* 접힌 상태: 기대 효과 미니 설명 */}
            {!isExpanded && (
              <Text style={[s.actionEffectMini, { color: colors.textSecondary }]}>{actionEffect}</Text>
            )}

            {/* 펼친 상태: 상세 정보 */}
            {isExpanded && (
              <View style={[s.detail, { borderTopColor: colors.border }]}>
                {/* 우선순위 뱃지 */}
                <View style={[s.priorityBadge, { backgroundColor: pc.bg }]}>
                  <View style={[s.priorityDot, { backgroundColor: pc.color }]} />
                  <Text style={[s.priorityText, { color: pc.color }]}>우선순위: {pc.label}</Text>
                </View>

                {/* 전체 사유 */}
                <View style={[s.reasonFull, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="chatbubble-outline" size={13} color={colors.textTertiary} />
                  <Text style={[s.reasonFullText, { color: colors.textTertiary }]}>
                    {action.reason?.includes('분석 데이터를 불러오지 못했습니다')
                      ? '현재 적정 비중으로 유지하는 것이 좋습니다. AI 분석이 업데이트되면 구체적인 제안을 받으실 수 있어요.'
                      : action.reason}
                  </Text>
                </View>

                {/* 기대 효과 (펼친 상태에서 더 잘 보이도록) */}
                <View style={[s.actionEffectExpanded, { backgroundColor: `${colors.success}1A`, borderLeftColor: `${colors.success}4D` }]}>
                  <View style={s.actionEffectRow}>
                    <Ionicons name="trending-up-outline" size={13} color={colors.success} />
                    <Text style={[s.actionEffectLabel, { color: colors.primaryDark ?? colors.primary }]}>이 액션의 기대 효과</Text>
                  </View>
                  <Text style={[s.actionEffectText, { color: colors.textSecondary }]}>{actionEffect}</Text>
                </View>

                {/* 내 보유 현황 */}
                {matchedAsset && (
                  <View style={[s.portfolioInfo, { backgroundColor: `${colors.success}1A`, borderColor: `${colors.success}4D` }]}>
                    <Text style={[s.portfolioTitle, { color: colors.textTertiary }]}>내 보유 현황</Text>
                    <View style={s.portfolioRow}>
                      <View style={s.portfolioItem}>
                        <Text style={[s.portfolioLabel, { color: colors.textTertiary }]}>현재가{isLive ? ' (실시간)' : ''}</Text>
                        <Text style={[s.portfolioValue, { color: colors.textPrimary }]}>{formatCurrency(displayPrice, (liveData?.currency as 'KRW' | 'USD' | undefined) ?? 'KRW')}</Text>
                      </View>
                      <View style={[s.portfolioDivider, { backgroundColor: `${colors.success}4D` }]} />
                      <View style={s.portfolioItem}>
                        <Text style={[s.portfolioLabel, { color: colors.textTertiary }]}>수익률</Text>
                        <Text style={[s.portfolioValue, { color: (assetGl ?? 0) >= 0 ? colors.success : colors.error }]}>
                          {(assetGl ?? 0) >= 0 ? '+' : ''}{(assetGl ?? 0).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={[s.portfolioDivider, { backgroundColor: `${colors.success}4D` }]} />
                      <View style={s.portfolioItem}>
                        <Text style={[s.portfolioLabel, { color: colors.textTertiary }]}>비중</Text>
                        <Text style={[s.portfolioValue, { color: colors.textPrimary }]}>{assetWeight}%</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 제안 금액/수량 */}
                {displayPrice > 0 && (action.action === 'BUY' || action.action === 'SELL') && (
                  <View style={[s.suggestBox, { backgroundColor: `${colors.warning}1A`, borderColor: `${colors.warning}4D` }]}>
                    <Ionicons name="calculator-outline" size={13} color={colors.warning} />
                    <Text style={[s.suggestText, { color: colors.warning }]}>
                      {action.action === 'BUY'
                        ? `제안: ${displayPrice > 0 ? Math.floor(totalAssets * 0.02 / displayPrice) : 0}주 (${formatCurrency(Math.floor(totalAssets * 0.02), 'KRW')}, 총자산 2%)`
                        : matchedAsset
                          ? `보유 ${matchedAsset.quantity ?? 0}주 중 일부 매도 검토`
                          : '매도 수량은 보유량에 따라 결정'
                      }
                    </Text>
                  </View>
                )}

                {/* 세금/수수료 시뮬레이션 (SELL 액션만) */}
                {action.action === 'SELL' && matchedAsset && displayPrice > 0 && (() => {
                  const qty = matchedAsset.quantity ?? 0;
                  if (qty <= 0) return null;
                  const sellAmt = displayPrice * qty;
                  const tax = estimateTax(action.ticker, sellAmt, matchedAsset.avgPrice, displayPrice, qty);
                  return (
                    <View style={[s.taxBox, { backgroundColor: `${colors.info}1A`, borderColor: `${colors.info}4D` }]}>
                      <View style={s.taxHeader}>
                        <Ionicons name="receipt-outline" size={13} color={colors.info} />
                        <Text style={[s.taxHeaderText, { color: colors.info }]}>전량 매도 시 예상 비용</Text>
                        <Text style={[s.taxAssetType, { color: colors.textTertiary, backgroundColor: colors.surfaceElevated }]}>{tax.assetTypeLabel}</Text>
                      </View>
                      <View style={s.taxRows}>
                        {tax.transactionTax > 0 && (
                          <View style={s.taxRow}>
                            <Text style={[s.taxLabel, { color: colors.textTertiary }]}>거래세</Text>
                            <Text style={[s.taxValue, { color: colors.textTertiary }]}>{'\u20A9'}{Math.floor(tax.transactionTax).toLocaleString(getLocaleCode())}</Text>
                          </View>
                        )}
                        <View style={s.taxRow}>
                          <Text style={[s.taxLabel, { color: colors.textTertiary }]}>수수료</Text>
                          <Text style={[s.taxValue, { color: colors.textTertiary }]}>{'\u20A9'}{Math.floor(tax.brokerageFee).toLocaleString(getLocaleCode())}</Text>
                        </View>
                        {tax.capitalGainsTax > 0 && (
                          <View style={s.taxRow}>
                            <Text style={[s.taxLabel, { color: colors.textTertiary }]}>양도소득세</Text>
                            <Text style={[s.taxValue, { color: colors.error }]}>{'\u20A9'}{Math.floor(tax.capitalGainsTax).toLocaleString(getLocaleCode())}</Text>
                          </View>
                        )}
                        <View style={[s.taxRow, s.taxTotalRow, { borderTopColor: `${colors.info}4D` }]}>
                          <Text style={[s.taxTotalLabel, { color: colors.info }]}>실수령 예상</Text>
                          <Text style={[s.taxTotalValue, { color: colors.textPrimary }]}>{'\u20A9'}{Math.floor(tax.netProceeds).toLocaleString(getLocaleCode())}</Text>
                        </View>
                      </View>
                      {tax.note ? <Text style={[s.taxNote, { color: colors.info }]}>{tax.note}</Text> : null}
                      <Text style={[s.taxDisclaimer, { color: colors.textTertiary }]}>* 참고용이며 실제 세금은 개인 상황에 따라 다릅니다</Text>
                    </View>
                  );
                })()}

                {/* 실행 완료 기록 (BUY/SELL만) */}
                {(action.action === 'BUY' || action.action === 'SELL') && displayPrice > 0 && (
                  <TouchableOpacity
                    style={[s.logExecutionBtn, { backgroundColor: `${colors.success}1A`, borderColor: `${colors.success}4D` }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      const suggestedQty = action.action === 'BUY'
                        ? Math.floor(totalAssets * 0.02 / displayPrice)
                        : matchedAsset?.quantity ?? 0;
                      router.push({
                        pathname: '/log-trade',
                        params: {
                          ticker: action.ticker,
                          name: action.name,
                          action: action.action,
                          suggestedPrice: displayPrice.toString(),
                          suggestedQty: suggestedQty.toString(),
                        },
                      });
                    }}
                  >
                    <Ionicons name="checkbox-outline" size={14} color={colors.success} />
                    <Text style={[s.logExecutionText, { color: colors.success }]}>실행 완료 기록</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.success} />
                  </TouchableOpacity>
                )}

                {/* AI 딥다이브 */}
                <TouchableOpacity
                  style={[s.deepDiveBtn, { backgroundColor: `${colors.premium.purple}1A`, borderColor: `${colors.premium.purple}4D` }]}
                  activeOpacity={0.7}
                  onPress={() => router.push({
                    pathname: '/analysis/deep-dive',
                    params: { ticker: action.ticker, name: action.name },
                  })}
                >
                  <Ionicons name="sparkles" size={14} color={colors.premium.purple} />
                  <Text style={[s.deepDiveText, { color: colors.premium.purple }]}>AI 딥다이브 분석 보기</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.premium.purple} />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  cardLabel: { fontSize: 17, fontWeight: '700' },
  cardLabelEn: { fontSize: 12, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  // P1-1: 지난달 처방전 결과 카드
  lastMonthCard: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  lastMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  lastMonthTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  lastMonthStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lastMonthStat: {
    alignItems: 'center',
    flex: 1,
  },
  lastMonthStatValue: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 2,
  },
  lastMonthStatLabel: {
    fontSize: 12,
  },
  lastMonthDivider: {
    width: 1,
    height: 32,
  },

  // 코스톨라니 서문 카드
  phasePreview: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 6,
  },
  phasePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phasePreviewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  phasePreviewTagText: { fontSize: 14, fontWeight: '800' },
  phaseConfidence: { fontSize: 13, fontWeight: '500' },
  phasePreviewDesc: { fontSize: 15, lineHeight: 22 },
  phaseBasisRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  phaseBasisText: { fontSize: 13, fontWeight: '500' },
  // P0-1: 근거 지표 목록
  phaseReasoningList: { gap: 3, marginTop: 2 },
  phaseReasoningItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  phaseReasoningDot: { fontSize: 13, fontWeight: '800', marginTop: 0 },
  phaseReasoningText: { flex: 1, fontSize: 14, lineHeight: 20 },
  // P0-3: 낮은 신뢰도 경고
  phaseNuanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1, marginTop: 2,
  },
  phaseNuanceText: { fontSize: 13, fontWeight: '600' },

  // 근거 출처 한 줄 (코스톨라니 없을 때 fallback)
  basisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  basisText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // "왜 이 액션들이 나왔는가" 섹션
  whySection: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  whyLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  whyText: {
    fontSize: 15,
    lineHeight: 22,
  },

  // "어떤 순서로 실행할까" 가이드 섹션
  actionGuideSection: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 2,
  },
  actionGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  actionGuideLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionGuideText: {
    fontSize: 15,
    lineHeight: 22,
  },

  // 접힌 상태의 기대 효과 미니 설명
  actionEffectMini: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // 펼친 상태의 기대 효과 섹션
  actionEffectExpanded: {
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 2,
  },
  actionEffectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  actionEffectLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionEffectText: {
    fontSize: 15,
    lineHeight: 22,
  },

  actionCount: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actionCountText: { fontSize: 14, fontWeight: '600' },
  completedCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  completedCountText: { fontSize: 13, fontWeight: '500' },
  actionItem: { borderRadius: 12, padding: 14, marginBottom: 8 },
  actionItemExpanded: { borderWidth: 1 },
  actionTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  checkBtn: { padding: 2 },
  checkBtnDone: {},
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionBadgeText: { fontSize: 14, fontWeight: '800' },
  actionTicker: { fontSize: 16, fontWeight: '700' },
  styleBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  styleBadgeText: { fontSize: 12, fontWeight: '700' },
  mismatchBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, backgroundColor: '#FF572222', borderWidth: 1, borderColor: '#FF572255' },
  mismatchBadgeText: { fontSize: 12, fontWeight: '700', color: '#FF5722' },
  actionName: { flex: 1, fontSize: 15, lineHeight: 22 },
  urgentDot: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  urgentDotText: { fontSize: 12, fontWeight: '800' },
  actionReason: { fontSize: 14, lineHeight: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  priceText: { fontSize: 17, fontWeight: '700' },
  changeText: { fontSize: 14, fontWeight: '600' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  liveDotSmall: { width: 5, height: 5, borderRadius: 2.5 },
  liveLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: 14, fontWeight: '700' },
  reasonFull: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10 },
  reasonFullText: { flex: 1, fontSize: 15, lineHeight: 22 },
  portfolioInfo: { borderRadius: 10, padding: 12, borderWidth: 1 },
  portfolioTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  portfolioRow: { flexDirection: 'row', alignItems: 'center' },
  portfolioItem: { flex: 1, alignItems: 'center' },
  portfolioDivider: { width: 1, height: 28 },
  portfolioLabel: { fontSize: 13, marginBottom: 4, lineHeight: 18 },
  portfolioValue: { fontSize: 15, fontWeight: '700' },
  logExecutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  logExecutionText: { fontSize: 14, fontWeight: '600' },
  deepDiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  deepDiveText: { fontSize: 14, fontWeight: '600' },
  suggestBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, gap: 8, borderWidth: 1 },
  suggestText: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },

  // ── 카테고리 리밸런싱 계획 ──
  rebalancePlan: { gap: 10, marginBottom: 4 },
  planStep: { gap: 6 },
  planStepHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  planStepNum: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  planStepNumText: { fontSize: 14, fontWeight: '900', color: '#fff' },
  planStepTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  planCatItem: {
    borderRadius: 10, borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  planCatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  planCatIcon: { fontSize: 16 },
  planCatLabel: { fontSize: 15, fontWeight: '700' },
  planCatDrift: { fontSize: 13, marginLeft: 4 },
  planCatAmtBadge: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  planCatAmtText: { fontSize: 14, fontWeight: '700' },
  planAssetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1,
  },
  planAssetTicker: { fontSize: 14, fontWeight: '700', minWidth: 60 },
  planAssetReturn: { fontSize: 14, fontWeight: '600' },
  planAssetHint: { fontSize: 13, marginLeft: 'auto' },
  etfRec: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1,
  },
  etfRecLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  etfRecTickers: { fontSize: 14, fontWeight: '700' },
  etfRecNote: { fontSize: 13, marginTop: 2 },
  // P2-B: 처방전 실행 예상 점수 카드
  scorePreview: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
  },
  scorePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  scorePreviewLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  scorePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scorePreviewCurrent: {
    fontSize: 15,
    fontWeight: '500',
  },
  scorePreviewProjected: {
    fontSize: 17,
    fontWeight: '800',
  },
  scorePreviewBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scorePreviewBadgeText: {
    fontSize: 15,
    fontWeight: '800',
  },

  // P3-B: 투자 일지 카드
  journalCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 8,
  },
  journalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journalTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  journalSavedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  journalSavedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  journalInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 72,
    textAlignVertical: 'top' as const,
  },
  journalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  journalSaveBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // AI 액션 토글 버튼
  aiToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  aiToggleBtnText: { fontSize: 14, fontWeight: '600', flex: 1 },

  // 세금/수수료 시뮬레이션
  taxBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  taxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  taxHeaderText: { fontSize: 14, fontWeight: '600' },
  taxAssetType: { fontSize: 12, marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  taxRows: { gap: 6 },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taxLabel: { fontSize: 14, lineHeight: 20 },
  taxValue: { fontSize: 14, fontWeight: '500' },
  taxTotalRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  taxTotalLabel: { fontSize: 14, fontWeight: '700' },
  taxTotalValue: { fontSize: 16, fontWeight: '700' },
  taxNote: { fontSize: 13, marginTop: 8 },
  taxDisclaimer: { fontSize: 11, marginTop: 4 },
});
