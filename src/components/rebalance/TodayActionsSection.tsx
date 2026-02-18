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
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { SkeletonBlock } from '../SkeletonLoader';
import { estimateTax } from '../../utils/taxEstimator';
import { formatCurrency } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../styles/colors';
import type { PortfolioAction, RebalancePortfolioAsset, LivePriceData } from '../../types/rebalanceTypes';
import type { Asset } from '../../types/asset';
import { classifyAsset, AssetCategory, getNetAssetValue, KostolalyPhase, KOSTOLANY_PHASE_NAMES, KOSTOLANY_PHASE_EMOJIS, KOSTOLANY_PHASE_DESCRIPTIONS, calculateHealthScore } from '../../services/rebalanceScore';
import { useKostolalyPhase } from '../../hooks/useKostolalyPhase';

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

/** 티커 기반 통화 판별 — 6자리 숫자 또는 .KS/.KQ 접미사면 KRW, 아니면 USD */
function getCurrency(ticker: string): 'KRW' | 'USD' {
  return /^\d{6}(\.(KS|KQ))?$/i.test(ticker) ? 'KRW' : 'USD';
}

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
          fontSize: 16,
          fontWeight: '800',
          color: colors.success,
          marginBottom: 4,
        }}>모든 액션 완료!</Text>
        <Text style={{
          fontSize: 13,
          color: colors.success,
          fontWeight: '500',
        }}>오늘도 성실한 투자자네요</Text>
      </View>
    </RNAnimated.View>
  );
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
  isAILoading: boolean;
  /** 코스톨라니/철학 기반 처방전 계산용 */
  allAssets?: Asset[];
  selectedTarget?: Record<AssetCategory, number>;
  /** 처방전 근거 출처 표시용 — 현재 코스톨라니 단계 */
  kostolalyPhase?: KostolalyPhase | null;
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
  isAILoading,
  allAssets,
  selectedTarget,
  kostolalyPhase,
}: TodayActionsSectionProps) {
  const { colors, shadows } = useTheme();

  // 코스톨라니 서문 데이터 (TanStack Query 캐시 공유 — 추가 API 호출 없음)
  const { data: phaseData, phase: hookPhase } = useKostolalyPhase();
  const activePhase = kostolalyPhase ?? hookPhase;
  const router = useRouter();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [completionBannerKey, setCompletionBannerKey] = useState(0);
  const [showAIActions, setShowAIActions] = useState(false);
  const { checked, toggle } = useActionChecklist();

  // ── 카테고리 리밸런싱 계획 계산 ──
  const categoryRebalancePlan = useMemo<CategoryRebalanceAction[]>(() => {
    if (!allAssets || !selectedTarget || totalAssets <= 0) return [];

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

    const LIQUID_CATS: AssetCategory[] = ['cash', 'bond', 'large_cap', 'bitcoin', 'altcoin', 'gold', 'commodity'];
    const result: CategoryRebalanceAction[] = [];

    for (const cat of LIQUID_CATS) {
      const currentAmt = catAmount[cat] || 0;
      const currentPct = (currentAmt / liquidTotal) * 100;
      const targetPct = selectedTarget[cat] || 0;
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
          const currentPrice = matched?.currentPrice || 0;
          const avgPrice = matched?.avgPrice || a.avgPrice || 0;
          let returnPct: number | null = null;
          if (avgPrice > 0 && currentPrice > 0) {
            const raw = ((currentPrice - avgPrice) / avgPrice) * 100;
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
  }, [allAssets, selectedTarget, totalAssets, portfolio]);

  // ── 처방전 실행 시 예상 건강 점수 변화 (P2-B) ──
  const expectedScoreChange = useMemo(() => {
    if (!allAssets || !selectedTarget || categoryRebalancePlan.length === 0) return null;

    const liquidAssets = allAssets.filter(a => classifyAsset(a) !== 'realestate');
    const liquidTotal = liquidAssets.reduce((sum, a) => sum + getNetAssetValue(a), 0);
    if (liquidTotal <= 0) return null;

    // 현재 점수
    const currentScore = calculateHealthScore(liquidAssets, liquidTotal, selectedTarget).totalScore;

    // 카테고리별 현재 순자산 합계
    const catNetTotals: Partial<Record<AssetCategory, number>> = {};
    for (const asset of liquidAssets) {
      const cat = classifyAsset(asset);
      catNetTotals[cat] = (catNetTotals[cat] || 0) + getNetAssetValue(asset);
    }

    // 처방전 실행 후 시뮬레이션: 각 자산을 목표 배분 비중으로 스케일 조정
    const simulatedAssets = liquidAssets.map(asset => {
      const cat = classifyAsset(asset);
      const currentCatNet = catNetTotals[cat] || 0;
      const targetPct = selectedTarget[cat as AssetCategory] || 0;
      const targetNetAmt = liquidTotal * (targetPct / 100);
      if (currentCatNet <= 0) return { ...asset, currentValue: targetNetAmt };
      const scale = targetNetAmt / currentCatNet;
      const newNet = Math.max(0, getNetAssetValue(asset) * scale);
      return { ...asset, currentValue: newNet + (asset.debtAmount || 0) };
    });

    const projectedScore = calculateHealthScore(simulatedAssets, liquidTotal, selectedTarget).totalScore;
    const change = projectedScore - currentScore;

    if (Math.abs(change) < 1) return null; // 변화 미미하면 숨김

    return { currentScore, projectedScore, change };
  }, [allAssets, selectedTarget, categoryRebalancePlan]);

  // 완료 카운트
  const completedCount = sortedActions.filter(a => checked[a.ticker]).length;
  const isAllCompleted = completedCount === sortedActions.length && sortedActions.length > 0;

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
          <Text style={[s.cardLabel, { color: colors.textPrimary }]}>이번 달 처방전</Text>
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
          <View style={s.phaseBasisRow}>
            <Ionicons name="compass-outline" size={10} color={colors.textTertiary} />
            <Text style={[s.phaseBasisText, { color: colors.textTertiary }]}>
              코스톨라니 {activePhase}단계 기준 · 달리오/버핏 합의안 적용
            </Text>
          </View>
        </View>
      ) : (
        <View style={[s.basisRow, { backgroundColor: `${colors.textTertiary}0D`, borderColor: `${colors.textTertiary}20` }]}>
          <Ionicons name="compass-outline" size={11} color={colors.textTertiary} />
          <Text style={[s.basisText, { color: colors.textTertiary }]}>달리오/버핏 합의안 기준</Text>
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
                        <Text style={s.planCatIcon}>{CAT_ICON[item.category]}</Text>
                        <Text style={[s.planCatLabel, { color: colors.textPrimary }]}>{CAT_LABEL[item.category]}</Text>
                        <Text style={[s.planCatDrift, { color: colors.textTertiary }]}>
                          {item.currentPct.toFixed(0)}% → {item.targetPct}%
                        </Text>
                        <View style={[s.planCatAmtBadge, { backgroundColor: `${colors.error}20` }]}>
                          <Text style={[s.planCatAmtText, { color: colors.error }]}>▼ 매도 {amtStr}</Text>
                        </View>
                      </View>
                      {/* 매도 추천 자산 (수익률 높은 순) */}
                      {item.assets.slice(0, 3).map((a, idx) => (
                        <View key={idx} style={[s.planAssetRow, { borderTopColor: colors.border }]}>
                          <Text style={[s.planAssetTicker, { color: colors.textPrimary }]}>{a.ticker || a.name}</Text>
                          {a.returnPct !== null && (
                            <Text style={[s.planAssetReturn, { color: a.returnPct >= 0 ? colors.success : colors.error }]}>
                              {a.returnPct >= 0 ? '+' : ''}{a.returnPct.toFixed(1)}%
                            </Text>
                          )}
                          <Text style={[s.planAssetHint, { color: colors.textTertiary }]}>
                            {idx === 0 ? '수익 실현 우선' : idx === 1 ? '일부 매도 검토' : '참고'}
                          </Text>
                        </View>
                      ))}
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
                        <Text style={s.planCatIcon}>{CAT_ICON[item.category]}</Text>
                        <Text style={[s.planCatLabel, { color: colors.textPrimary }]}>{CAT_LABEL[item.category]}</Text>
                        <Text style={[s.planCatDrift, { color: colors.textTertiary }]}>
                          {item.currentPct.toFixed(0)}% → {item.targetPct}%
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

      {(showAIActions || categoryRebalancePlan.length === 0) && sortedActions.slice(0, 5).map((action, idx) => {
        const ac = ACTION_COLORS[action.action] || ACTION_COLORS.HOLD;
        const isHighPriority = action.priority === 'HIGH';
        const isExpanded = expandedIdx === idx;
        const isDone = !!checked[action.ticker];

        // 포트폴리오에서 해당 종목 찾기
        const matchedAsset = portfolio.find(
          a => a.ticker?.toUpperCase() === action.ticker?.toUpperCase()
        );

        // 실시간 가격
        const liveData = livePrices[action.ticker];
        const displayPrice = liveData?.currentPrice || matchedAsset?.currentPrice || 0;
        const isLive = !!liveData?.currentPrice;

        // 수익률 계산 (방어 로직: 합리적 범위로 필터링)
        let assetGl: number | null = null;
        if (matchedAsset && matchedAsset.avgPrice > 0 && displayPrice > 0) {
          const rawGl = ((displayPrice - matchedAsset.avgPrice) / matchedAsset.avgPrice) * 100;
          // 비정상적인 값 필터링: -90% ~ +500% 범위만 허용
          // -99.9% 같은 값은 avgPrice가 잘못 저장된 것이므로 필터링
          if (rawGl >= -90 && rawGl <= 500) {
            assetGl = rawGl;
          } else {
            console.warn(`[TodayActionsSection] 비정상 수익률 감지: ${action.ticker}, avgPrice=${matchedAsset.avgPrice}, currentPrice=${displayPrice}, gl=${rawGl.toFixed(1)}%`);
            assetGl = null; // 비정상 값은 표시하지 않음
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
                <Text style={[s.priceText, { color: colors.textPrimary }]}>{formatCurrency(displayPrice, getCurrency(action.ticker))}</Text>
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
                        <Text style={[s.portfolioValue, { color: colors.textPrimary }]}>{formatCurrency(displayPrice, getCurrency(action.ticker))}</Text>
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
                            <Text style={[s.taxValue, { color: colors.textTertiary }]}>{'\u20A9'}{Math.floor(tax.transactionTax).toLocaleString()}</Text>
                          </View>
                        )}
                        <View style={s.taxRow}>
                          <Text style={[s.taxLabel, { color: colors.textTertiary }]}>수수료</Text>
                          <Text style={[s.taxValue, { color: colors.textTertiary }]}>{'\u20A9'}{Math.floor(tax.brokerageFee).toLocaleString()}</Text>
                        </View>
                        {tax.capitalGainsTax > 0 && (
                          <View style={s.taxRow}>
                            <Text style={[s.taxLabel, { color: colors.textTertiary }]}>양도소득세</Text>
                            <Text style={[s.taxValue, { color: colors.error }]}>{'\u20A9'}{Math.floor(tax.capitalGainsTax).toLocaleString()}</Text>
                          </View>
                        )}
                        <View style={[s.taxRow, s.taxTotalRow, { borderTopColor: `${colors.info}4D` }]}>
                          <Text style={[s.taxTotalLabel, { color: colors.info }]}>실수령 예상</Text>
                          <Text style={[s.taxTotalValue, { color: colors.textPrimary }]}>{'\u20A9'}{Math.floor(tax.netProceeds).toLocaleString()}</Text>
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
                    pathname: '/marketplace',
                    params: { ticker: action.ticker, feature: 'deep_dive' },
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
  cardLabel: { fontSize: 15, fontWeight: '700' },
  cardLabelEn: { fontSize: 10, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  phasePreviewTagText: { fontSize: 11, fontWeight: '800' },
  phaseConfidence: { fontSize: 10, fontWeight: '500' },
  phasePreviewDesc: { fontSize: 12, lineHeight: 18 },
  phaseBasisRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  phaseBasisText: { fontSize: 10, fontWeight: '500' },

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
    fontSize: 10,
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
    gap: 5,
    marginBottom: 4,
  },
  whyLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  whyText: {
    fontSize: 12,
    lineHeight: 18,
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
    gap: 5,
    marginBottom: 4,
  },
  actionGuideLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionGuideText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // 접힌 상태의 기대 효과 미니 설명
  actionEffectMini: {
    fontSize: 11,
    lineHeight: 16,
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
    gap: 5,
    marginBottom: 3,
  },
  actionEffectLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionEffectText: {
    fontSize: 12,
    lineHeight: 17,
  },

  actionCount: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actionCountText: { fontSize: 11, fontWeight: '600' },
  completedCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  completedCountText: { fontSize: 10, fontWeight: '500' },
  actionItem: { borderRadius: 12, padding: 14, marginBottom: 8 },
  actionItemExpanded: { borderWidth: 1 },
  actionTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  checkBtn: { padding: 2 },
  checkBtnDone: {},
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionBadgeText: { fontSize: 11, fontWeight: '800' },
  actionTicker: { fontSize: 14, fontWeight: '700' },
  actionName: { flex: 1, fontSize: 12 },
  urgentDot: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  urgentDotText: { fontSize: 10, fontWeight: '800' },
  actionReason: { fontSize: 12, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  priceText: { fontSize: 15, fontWeight: '700' },
  changeText: { fontSize: 12, fontWeight: '600' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  liveDotSmall: { width: 5, height: 5, borderRadius: 2.5 },
  liveLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  reasonFull: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10 },
  reasonFullText: { flex: 1, fontSize: 13, lineHeight: 20 },
  portfolioInfo: { borderRadius: 10, padding: 12, borderWidth: 1 },
  portfolioTitle: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  portfolioRow: { flexDirection: 'row', alignItems: 'center' },
  portfolioItem: { flex: 1, alignItems: 'center' },
  portfolioDivider: { width: 1, height: 28 },
  portfolioLabel: { fontSize: 10, marginBottom: 3 },
  portfolioValue: { fontSize: 13, fontWeight: '700' },
  logExecutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  logExecutionText: { fontSize: 12, fontWeight: '600' },
  deepDiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  deepDiveText: { fontSize: 12, fontWeight: '600' },
  suggestBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, gap: 8, borderWidth: 1 },
  suggestText: { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 18 },

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
  planStepNumText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  planStepTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  planCatItem: {
    borderRadius: 10, borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  planCatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  planCatIcon: { fontSize: 14 },
  planCatLabel: { fontSize: 13, fontWeight: '700' },
  planCatDrift: { fontSize: 10, marginLeft: 4 },
  planCatAmtBadge: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  planCatAmtText: { fontSize: 11, fontWeight: '700' },
  planAssetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1,
  },
  planAssetTicker: { fontSize: 12, fontWeight: '700', minWidth: 60 },
  planAssetReturn: { fontSize: 11, fontWeight: '600' },
  planAssetHint: { fontSize: 10, marginLeft: 'auto' },
  etfRec: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1,
  },
  etfRecLabel: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  etfRecTickers: { fontSize: 12, fontWeight: '700' },
  etfRecNote: { fontSize: 10, marginTop: 2 },
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
    fontSize: 11,
    fontWeight: '700',
  },
  scorePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scorePreviewCurrent: {
    fontSize: 13,
    fontWeight: '500',
  },
  scorePreviewProjected: {
    fontSize: 15,
    fontWeight: '800',
  },
  scorePreviewBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scorePreviewBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // AI 액션 토글 버튼
  aiToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  aiToggleBtnText: { fontSize: 12, fontWeight: '600', flex: 1 },

  // 세금/수수료 시뮬레이션
  taxBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  taxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  taxHeaderText: { fontSize: 11, fontWeight: '600' },
  taxAssetType: { fontSize: 10, marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  taxRows: { gap: 6 },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taxLabel: { fontSize: 11 },
  taxValue: { fontSize: 12, fontWeight: '500' },
  taxTotalRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  taxTotalLabel: { fontSize: 12, fontWeight: '700' },
  taxTotalValue: { fontSize: 14, fontWeight: '700' },
  taxNote: { fontSize: 10, marginTop: 8 },
  taxDisclaimer: { fontSize: 9, marginTop: 4 },
});
