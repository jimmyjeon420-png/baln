/**
 * 배분 이탈도 섹션 — 목표 vs 현재 배분 비교 + 이탈도 바 차트 + 파이 차트
 *
 * 역할: 리밸런싱의 핵심 가치 — "어디서 얼마나 벗어났는지"를 시각화
 * 데이터: rebalanceScore.ts의 classifyAsset으로 현재 배분 계산
 *         AsyncStorage에서 목표 배분 로드 (설정 안 했으면 기본값)
 *
 * [개선] 텍스트(바 차트) + 파이 차트 토글 뷰 추가
 *
 * UX 개선 (2026-02-10):
 * - "왜 이탈이 생겼는가" 요약 (가장 큰 이탈 카테고리 기반 설명)
 * - "어떻게 해야 하는가" 액션 가이드 (구체적 매매 방향 제시)
 * - 설명 텍스트 레이어 (동적 테마 적용)
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from '../../types/asset';
import { classifyAsset, AssetCategory, getNetAssetValue, calculateLTV, calcRealEstateDiversificationBonus, DEFAULT_TARGET, DALIO_TARGET, BUFFETT_TARGET, CATHIE_WOOD_TARGET, KostolalyPhase, KOSTOLANY_PHASE_NAMES, KOSTOLANY_PHASE_EMOJIS, getPhaseAdjustedTarget, normalizeLiquidTarget } from '../../services/rebalanceScore';
import AllocationPieChart, { PieSlice } from '../charts/AllocationPieChart';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../styles/colors';
import TermTooltip from '../common/TermTooltip';
import { CAT_ICONS } from '../../constants/categoryIcons';
import { useLocale } from '../../context/LocaleContext';

// ── 카테고리 설정 ──

interface CategoryConfig {
  key: AssetCategory;
  label: string;
  icon: string;
  color: string;
}

// ── 자산군별 상세 정보 키 매핑 (ⓘ 버튼 탭 시 표시) ──
// locale allocation_drift.category_details.X 경로에서 모든 필드를 t()로 조회
const VALID_CATEGORY_DETAIL_KEYS: Record<string, boolean> = {
  large_cap: true,
  bond: true,
  bitcoin: true,
  altcoin: true,
  gold: true,
  commodity: true,
  cash: true,
  realestate: true,
};

// 유동 자산 7개 카테고리 (부동산은 비유동 → 별도 표시)
// 달리오 All Weather 철학 기반 분류
// label은 locale에서 동적으로 가져오므로 placeholder로만 사용
const CATEGORIES: CategoryConfig[] = [
  { key: 'large_cap', label: 'large_cap', icon: '📈', color: '#4CAF50' },
  { key: 'bond',      label: 'bond',      icon: '🏛️', color: '#64B5F6' },
  { key: 'bitcoin',   label: 'bitcoin',   icon: '₿',  color: '#F7931A' },
  { key: 'gold',      label: 'gold',      icon: '🥇', color: '#FFD700' },
  { key: 'commodity', label: 'commodity', icon: '🛢️', color: '#FF8A65' },
  { key: 'altcoin',   label: 'altcoin',   icon: '🪙', color: '#9C27B0' },
  { key: 'cash',      label: 'cash',      icon: '💵', color: '#78909C' },
];

// DEFAULT_TARGET은 rebalanceScore.ts에서 import (건강 점수 엔진과 동일한 기준 사용)
// 달리오 All Weather × 버핏 Berkshire 합성 최종안: 주식40 채권15 BTC10 금12 원자재8 알트5 현금10

const STORAGE_KEY = '@target_allocation';
const PHILOSOPHY_STORAGE_KEY = '@investment_philosophy';

export type InvestmentPhilosophy = 'dalio' | 'cathie_wood' | 'buffett' | 'custom';

const PHILOSOPHY_CONFIG: Record<InvestmentPhilosophy, { labelKey: string; emoji: string; target: Record<AssetCategory, number>; descKey: string }> = {
  dalio:       { labelKey: 'philosophy_label_dalio',   emoji: '🌊', target: DALIO_TARGET,       descKey: 'philosophy_desc_dalio' },
  buffett:     { labelKey: 'philosophy_label_buffett', emoji: '🔴', target: BUFFETT_TARGET,     descKey: 'philosophy_desc_buffett' },
  cathie_wood: { labelKey: 'philosophy_label_cathie',  emoji: '🚀', target: CATHIE_WOOD_TARGET, descKey: 'philosophy_desc_cathie' },
  custom:      { labelKey: 'philosophy_label_custom',  emoji: '✏️', target: DEFAULT_TARGET,     descKey: 'philosophy_desc_custom' },
};

// ── 이탈도 계산 ──

interface DriftItem {
  category: CategoryConfig;
  currentPct: number;
  targetPct: number;
  drift: number; // 현재 - 목표 (양수: 초과, 음수: 부족)
}

function calculateDrift(
  assets: Asset[],
  totalAssets: number,
  target: Record<AssetCategory, number>,
): DriftItem[] {
  const liquidTarget = normalizeLiquidTarget(target);

  // 현재 배분 계산
  const currentMap: Record<AssetCategory, number> = {
    cash: 0, bond: 0, large_cap: 0, realestate: 0, bitcoin: 0, altcoin: 0, gold: 0, commodity: 0,
  };

  assets.forEach(asset => {
    const cat = classifyAsset(asset);
    currentMap[cat] += getNetAssetValue(asset);
  });

  return CATEGORIES.map(cat => {
    const currentPct = totalAssets > 0 ? (currentMap[cat.key] / totalAssets) * 100 : 0;
    const targetPct = liquidTarget[cat.key] ?? 0;
    return {
      category: cat,
      currentPct,
      targetPct,
      drift: currentPct - targetPct,
    };
  });
}

// ── Props ──

interface AllocationDriftSectionProps {
  assets: Asset[];
  totalAssets: number;
  onTargetChange?: (target: Record<AssetCategory, number>) => void;
  /** 현재 코스톨라니 국면 (3구루 목표에 25% 자동 반영) */
  kostolalyPhase?: KostolalyPhase | null;
}

// ── 뷰 모드: 텍스트(바 차트) vs 파이 차트 ──
type ViewMode = 'bar' | 'pie';

/**
 * "왜 이탈이 생겼는가" — locale key + params 반환
 */
interface WhyResult {
  key: string;
  params: Record<string, string>;
}

function getDriftWhyLocaleData(driftItems: DriftItem[], totalDrift: number): WhyResult {
  if (totalDrift <= 3) {
    return { key: 'allocation_drift.why_balanced', params: {} };
  }

  const sorted = [...driftItems]
    .filter(d => d.currentPct > 0 || d.targetPct > 0)
    .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));

  const biggest = sorted[0];
  if (!biggest) return { key: 'allocation_drift.why_balanced', params: {} };

  const isOver = biggest.drift > 0;
  const driftAbs = Math.abs(biggest.drift).toFixed(1);

  if (isOver && sorted.length >= 2 && Math.abs(sorted[1].drift) > 5) {
    const second = sorted[1];
    const dir2 = second.drift > 0 ? 'over' : 'under';
    return {
      key: 'allocation_drift.why_over_two',
      params: {
        cat1: biggest.category.key,
        drift1: driftAbs,
        cat2: second.category.key,
        drift2: Math.abs(second.drift).toFixed(1),
        dir2,
      },
    };
  }

  if (isOver) {
    return {
      key: 'allocation_drift.why_over_one',
      params: { cat: biggest.category.key, drift: driftAbs },
    };
  }

  return {
    key: 'allocation_drift.why_under_one',
    params: { cat: biggest.category.key, drift: driftAbs },
  };
}

/**
 * "어떻게 해야 하는가" — locale key + params 반환
 */
interface ActionResult {
  key: string;
  params: Record<string, string>;
}

function getDriftActionLocaleData(driftItems: DriftItem[], totalDrift: number): ActionResult | null {
  if (totalDrift <= 3) return null;

  const overItems = driftItems.filter(d => d.drift > 5).sort((a, b) => b.drift - a.drift);
  const underItems = driftItems.filter(d => d.drift < -5).sort((a, b) => a.drift - b.drift);

  if (overItems.length === 0 && underItems.length === 0) {
    return { key: 'allocation_drift.action_minor', params: {} };
  }

  if (overItems.length > 0 && underItems.length > 0) {
    const over = overItems.slice(0, 2).map(d => d.category.key).join(', ');
    const under = underItems.slice(0, 2).map(d => d.category.key).join(', ');
    return { key: 'allocation_drift.action_over_under', params: { over, under } };
  }

  if (overItems.length > 0) {
    const over = overItems.slice(0, 2).map(d => d.category.key).join(', ');
    return { key: 'allocation_drift.action_reduce', params: { over } };
  }

  const under = underItems.slice(0, 2).map(d => d.category.key).join(', ');
  return { key: 'allocation_drift.action_increase', params: { under } };
}

export default function AllocationDriftSection({
  assets,
  totalAssets,
  onTargetChange,
  kostolalyPhase,
}: AllocationDriftSectionProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [showDetail, setShowDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const [philosophy, setPhilosophy] = useState<InvestmentPhilosophy>('dalio');
  const [target, setTarget] = useState<Record<AssetCategory, number>>(DEFAULT_TARGET);
  const [editValues, setEditValues] = useState<Record<AssetCategory, string>>({} as any);

  // ── ⓘ 카테고리 상세 정보 모달 ──
  const [infoKey, setInfoKey] = useState<AssetCategory | null>(null);
  const infoDetail = infoKey ? VALID_CATEGORY_DETAIL_KEYS[infoKey] : false;

  // 로드된 철학을 ref로 추적 (kostolalyTarget useEffect에서 참조)
  const storedPhilRef = useRef<InvestmentPhilosophy>('dalio');

  // AsyncStorage에서 철학 + 목표 배분 로드 (초기 마운트 + 탭 포커스 시 재실행)
  const loadFromStorage = useCallback(() => {
    Promise.all([
      AsyncStorage.getItem(PHILOSOPHY_STORAGE_KEY),
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem('@baln:guru_style'),
    ]).then(([storedPhil, storedTarget, guruStyle]) => {
      const validPhils: InvestmentPhilosophy[] = ['dalio', 'buffett', 'cathie_wood', 'custom'];
      const guruPhils = ['dalio', 'buffett', 'cathie_wood'];

      // 우선순위: @baln:guru_style (설정 화면 변경) > @investment_philosophy (탭 수동 선택) > 'dalio' 기본값
      // → 두 키가 항상 동기화되므로(useGuruStyle + handlePhilosophyChange) 실질적으로 동일 값을 읽음
      let phil: InvestmentPhilosophy | null = null;

      // 1) guru_style이 유효한 구루 값이면 우선 사용 (설정화면 변경 즉시 반영)
      if (guruStyle && guruPhils.includes(guruStyle)) {
        phil = guruStyle as InvestmentPhilosophy;
      }

      // 2) guru_style 없거나 커스텀 처리 필요 → @investment_philosophy 사용
      if (!phil) {
        const normalized = storedPhil === 'consensus' ? 'dalio' : storedPhil;
        if (normalized && validPhils.includes(normalized as InvestmentPhilosophy)) {
          phil = normalized as InvestmentPhilosophy;
        }
      }

      // 3) 아무것도 없으면 기본값
      if (!phil) phil = 'dalio';

      storedPhilRef.current = phil;
      setPhilosophy(phil);

      if (phil !== 'custom') {
        const t = PHILOSOPHY_CONFIG[phil].target;
        setTarget(t);
        onTargetChange?.(t);
      }

      if (storedTarget) {
        try {
          const parsed = JSON.parse(storedTarget);
          if (phil === 'custom') {
            setTarget(parsed);
            onTargetChange?.(parsed);
          }
        } catch (err) { console.warn('[배분이탈] 목표 배분 파싱 실패:', err); }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 초기 마운트 시 로드
  useEffect(() => { loadFromStorage(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 분석 탭 포커스 시 재로드 — 전체 탭에서 구루 변경 후 돌아왔을 때 반영
  useFocusEffect(useCallback(() => { loadFromStorage(); }, [loadFromStorage]));

  // 국면 변경 시 구루 목표에 25% 자동 반영 (직접설정은 영향 없음)
  useEffect(() => {
    if (philosophy === 'custom') return;
    const baseCfg = PHILOSOPHY_CONFIG[philosophy];
    if (!baseCfg) return;
    const adjusted = getPhaseAdjustedTarget(baseCfg.target, kostolalyPhase);
    setTarget(adjusted);
    onTargetChange?.(adjusted);
  }, [kostolalyPhase, philosophy]); // eslint-disable-line react-hooks/exhaustive-deps

  // 철학 선택 핸들러
  const handlePhilosophyChange = useCallback(async (phil: InvestmentPhilosophy) => {
    setPhilosophy(phil);
    // @investment_philosophy + @baln:guru_style 동시 동기화
    const guruKeys: InvestmentPhilosophy[] = ['dalio', 'buffett', 'cathie_wood'];
    const storePairs: [string, string][] = [[PHILOSOPHY_STORAGE_KEY, phil]];
    if (guruKeys.includes(phil)) storePairs.push(['@baln:guru_style', phil]);
    await AsyncStorage.multiSet(storePairs);

    if (phil !== 'custom') {
      // 국면 반영된 목표 적용
      const adjusted = getPhaseAdjustedTarget(PHILOSOPHY_CONFIG[phil].target, kostolalyPhase);
      setTarget(adjusted);
      onTargetChange?.(adjusted);
    } else {
      setIsEditing(true);
    }
  }, [onTargetChange, kostolalyPhase]);

  // ── 부동산(비유동) 분리 ──
  const realEstateInfo = useMemo(() => {
    const reAssets = assets.filter(a => classifyAsset(a) === 'realestate');
    const grossValue = reAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
    const totalDebt = reAssets.reduce((sum, a) => sum + (a.debtAmount || 0), 0);
    const netValue = grossValue - totalDebt;
    const avgLtv = reAssets.length > 0
      ? reAssets.reduce((sum, a) => sum + calculateLTV(a), 0) / reAssets.length
      : 0;
    return { assets: reAssets, grossValue, totalDebt, netValue, avgLtv, count: reAssets.length };
  }, [assets]);

  // 유동 자산 총액 — 부동산 직접 제외 후 합산 (totalAssets에서 빼면 순자산 기준 불일치로 음수 발생)
  const liquidTotal = useMemo(
    () => assets
      .filter(a => classifyAsset(a) !== 'realestate')
      .reduce((sum, a) => sum + getNetAssetValue(a), 0),
    [assets],
  );
  const realEstateRatio = totalAssets > 0 ? (realEstateInfo.grossValue / totalAssets) * 100 : 0;

  // 부동산 분산 보너스 계산 (달리오 All Weather 원칙)
  const totalNetAssets = useMemo(
    () => assets.reduce((sum, a) => sum + getNetAssetValue(a), 0),
    [assets],
  );
  const realEstateBonus = useMemo(
    () => calcRealEstateDiversificationBonus(realEstateInfo.assets, totalNetAssets),
    [realEstateInfo.assets, totalNetAssets],
  );

  // 이탈도 계산 — 유동 자산 기준
  const driftItems = useMemo(
    () => calculateDrift(assets, liquidTotal, target),
    [assets, liquidTotal, target],
  );

  // 총 이탈도 (절대값 합/2 → 한쪽 방향)
  const totalDrift = useMemo(
    () => driftItems.reduce((sum, d) => sum + Math.abs(d.drift), 0) / 2,
    [driftItems],
  );

  const driftColor = totalDrift <= 5 ? colors.success : totalDrift <= 15 ? colors.warning : colors.error;
  const driftLabel = totalDrift <= 5
    ? t('allocation_drift.drift_balanced')
    : totalDrift <= 15
    ? t('allocation_drift.drift_minor')
    : t('allocation_drift.drift_adjust');

  // "왜" + "어떻게" 설명 계산 (locale 적용)
  const whyLocaleData = useMemo(
    () => getDriftWhyLocaleData(driftItems, totalDrift),
    [driftItems, totalDrift],
  );
  const actionLocaleData = useMemo(
    () => getDriftActionLocaleData(driftItems, totalDrift),
    [driftItems, totalDrift],
  );

  // locale key → translated string (cat key placeholders replaced with labels)
  const whyExplanation = useMemo(() => {
    const resolveParams = (params: Record<string, string>) => {
      const resolved: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        if (['cat', 'cat1', 'cat2', 'over', 'under'].includes(k)) {
          resolved[k] = t(`allocation_drift.cat_labels.${v}`);
        } else if (k === 'dir2') {
          resolved[k] = v === 'over' ? t('allocation_drift.detail_over') : t('allocation_drift.detail_under');
        } else {
          resolved[k] = v;
        }
      }
      return resolved;
    };
    return t(whyLocaleData.key, resolveParams(whyLocaleData.params));
  }, [whyLocaleData, t]);

  const actionGuidance = useMemo(() => {
    if (!actionLocaleData) return null;
    const resolveParams = (params: Record<string, string>) => {
      const resolved: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        if (['over', 'under'].includes(k)) {
          // could be comma-separated keys
          resolved[k] = v.split(', ').map(key => t(`allocation_drift.cat_labels.${key.trim()}`)).join(', ');
        } else {
          resolved[k] = v;
        }
      }
      return resolved;
    };
    return t(actionLocaleData.key, resolveParams(actionLocaleData.params));
  }, [actionLocaleData, t]);

  // 파이 차트 슬라이스 데이터 (유동 자산만)
  const pieSlices: PieSlice[] = useMemo(() => {
    const currentMap: Record<AssetCategory, number> = {
      cash: 0, bond: 0, large_cap: 0, realestate: 0, bitcoin: 0, altcoin: 0, gold: 0, commodity: 0,
    };
    assets.forEach(asset => {
      const cat = classifyAsset(asset);
      currentMap[cat] += asset.currentValue;
    });

    return CATEGORIES  // CATEGORIES에 realestate 없으므로 자동 제외
      .filter(cat => currentMap[cat.key] > 0)
      .map(cat => ({
        key: cat.key,
        label: cat.key, // will be resolved by t() at render
        value: currentMap[cat.key],
        color: cat.color,
        icon: cat.icon,
      }));
  }, [assets]);

  // 편집 모드 시작
  const startEditing = useCallback(() => {
    const vals: Record<string, string> = {};
    CATEGORIES.forEach(c => { vals[c.key] = String(target[c.key] ?? 0); });
    setEditValues(vals as any);
    setIsEditing(true);
  }, [target]);

  // 편집 저장
  const saveTarget = useCallback(async () => {
    const newTarget = { ...DEFAULT_TARGET };
    let sum = 0;
    CATEGORIES.forEach(c => {
      const val = parseInt(editValues[c.key] || '0', 10);
      newTarget[c.key] = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
      sum += newTarget[c.key];
    });

    if (sum !== 100) {
      Alert.alert(t('allocation_drift.alert_sum_title'), t('allocation_drift.alert_sum_msg', { sum: String(sum) }));
      return;
    }

    setTarget(newTarget);
    onTargetChange?.(newTarget);
    setPhilosophy('custom');
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTarget));
    await AsyncStorage.setItem(PHILOSOPHY_STORAGE_KEY, 'custom');
    setIsEditing(false);
  }, [editValues, onTargetChange]);

  // 편집 합계
  const editSum = useMemo(() => {
    return CATEGORIES.reduce((sum, c) => {
      const val = parseInt(editValues[c.key] || '0', 10);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [editValues]);

  if (totalAssets === 0) return null;

  const s = createStyles(colors);
  const { height: SCREEN_H } = Dimensions.get('window');

  return (
    <>
    {/* ── ⓘ 자산군 상세 정보 모달 ── */}
    <Modal
      visible={infoKey !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setInfoKey(null)}
    >
      <TouchableOpacity
        style={s.modalOverlay}
        activeOpacity={1}
        onPress={() => setInfoKey(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[s.infoModal, { maxHeight: SCREEN_H * 0.78 }]}
          onPress={() => {}}
        >
          {infoDetail && infoKey && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {(() => {
                const dk = `allocation_drift.category_details.${infoKey}`;
                return (
                  <>
                    {/* 제목 */}
                    <Text style={[s.infoModalTitle, { color: colors.textPrimary }]}>{t(`${dk}.title`)}</Text>

                    {/* 역할 */}
                    <View style={[s.infoSection, { backgroundColor: colors.surfaceLight }]}>
                      <Text style={[s.infoSectionLabel, { color: colors.textTertiary }]}>{t('allocation_drift.info_role_label')}</Text>
                      <Text style={[s.infoSectionText, { color: colors.textPrimary }]}>{t(`${dk}.role`)}</Text>
                    </View>

                    {/* 달리오 관점 */}
                    <View style={[s.infoSection, { backgroundColor: '#4CAF5015' }]}>
                      <Text style={[s.infoSectionLabel, { color: '#4CAF50' }]}>{t('allocation_drift.info_dalio_label')}</Text>
                      <Text style={[s.infoSectionText, { color: colors.textSecondary }]}>{t(`${dk}.dalio`)}</Text>
                    </View>

                    {/* 버핏 관점 */}
                    <View style={[s.infoSection, { backgroundColor: '#FFB74D15' }]}>
                      <Text style={[s.infoSectionLabel, { color: '#FFB74D' }]}>{t('allocation_drift.info_buffett_label')}</Text>
                      <Text style={[s.infoSectionText, { color: colors.textSecondary }]}>{t(`${dk}.buffett`)}</Text>
                    </View>

                    {/* 좋을 때 */}
                    <View style={[s.infoSection, { backgroundColor: '#66BB6A15' }]}>
                      <Text style={[s.infoSectionLabel, { color: '#66BB6A' }]}>{t('allocation_drift.info_good_label')}</Text>
                      <Text style={[s.infoSectionText, { color: colors.textSecondary }]}>{t(`${dk}.when_good`)}</Text>
                    </View>

                    {/* 나쁠 때 */}
                    <View style={[s.infoSection, { backgroundColor: '#FF8A6515' }]}>
                      <Text style={[s.infoSectionLabel, { color: '#FF8A65' }]}>{t('allocation_drift.info_bad_label')}</Text>
                      <Text style={[s.infoSectionText, { color: colors.textSecondary }]}>{t(`${dk}.when_bad`)}</Text>
                    </View>

                    {/* 실용 팁 */}
                    <View style={[s.infoSection, { backgroundColor: '#64B5F615' }]}>
                      <Text style={[s.infoSectionLabel, { color: '#64B5F6' }]}>{t('allocation_drift.info_tip_label')}</Text>
                      <Text style={[s.infoSectionText, { color: colors.textSecondary }]}>{t(`${dk}.tip`)}</Text>
                    </View>

                    <TouchableOpacity
                      style={[s.infoCloseBtn, { backgroundColor: colors.surfaceElevated }]}
                      onPress={() => setInfoKey(null)}
                    >
                      <Text style={[s.infoCloseBtnText, { color: colors.textSecondary }]}>{t('allocation_drift.info_modal_close')}</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>

    <View style={[s.card, { backgroundColor: colors.inverseSurface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <TouchableOpacity
        style={s.headerRow}
        onPress={() => setShowDetail(!showDetail)}
        activeOpacity={0.7}
      >
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.cardLabel, { color: colors.inverseText }]}>{t('allocation_drift.card_label')}</Text>
            <TermTooltip term="배분 이탈도" style={{ color: colors.textTertiary, fontSize: 14 }}>ⓘ</TermTooltip>
          </View>
          <Text style={[s.cardLabelEn, { color: colors.textTertiary }]}>{t('allocation_drift.card_label_en')}</Text>
        </View>
        <View style={s.headerRight}>
          <View style={[s.driftBadge, { backgroundColor: driftColor + '20' }]}>
            <View style={[s.driftDot, { backgroundColor: driftColor }]} />
            <Text style={[s.driftText, { color: driftColor }]}>
              {totalDrift.toFixed(1)}% {driftLabel}
            </Text>
          </View>
          <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>

      {/* 철학 선택 탭: 달리오 → 버핏 → 캐시우드 → 코스톨라니 → 직접설정 */}
      <View style={s.philosophyRow}>
        {/* 고정 탭 3개: 달리오, 버핏, 캐시우드 */}
        {(['dalio', 'buffett', 'cathie_wood'] as const).map(phil => {
          const cfg = PHILOSOPHY_CONFIG[phil];
          const isActive = philosophy === phil;
          return (
            <TouchableOpacity
              key={phil}
              style={[s.philosophyBtn, isActive && { backgroundColor: colors.success + '30', borderColor: colors.success }]}
              onPress={() => handlePhilosophyChange(phil)}
              activeOpacity={0.7}
            >
              <Text style={s.philosophyEmoji}>{cfg.emoji}</Text>
              <Text style={[s.philosophyBtnText, isActive && { color: colors.success, fontWeight: '700' }]}>
                {t(`allocation_drift.${cfg.labelKey}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
        {/* 코스톨라니 국면 탭 제거 — DB 자동 로드로 적용, UI에서 별도 탭 불필요 */}
        {/* 직접설정: 항상 맨 오른쪽 */}
        <TouchableOpacity
          key="custom"
          style={[s.philosophyBtn, philosophy === 'custom' && { backgroundColor: colors.success + '30', borderColor: colors.success }]}
          onPress={() => handlePhilosophyChange('custom')}
          activeOpacity={0.7}
        >
          <Text style={s.philosophyEmoji}>{PHILOSOPHY_CONFIG.custom.emoji}</Text>
          <Text style={[s.philosophyBtnText, philosophy === 'custom' && { color: colors.success, fontWeight: '700' }]}>
            {t(`allocation_drift.${PHILOSOPHY_CONFIG.custom.labelKey}`)}
          </Text>
        </TouchableOpacity>
      </View>
      {/* 선택된 철학 설명 */}
      <Text style={[s.philosophyDesc, { color: colors.textTertiary }]}>
        {PHILOSOPHY_CONFIG[philosophy] ? t(`allocation_drift.${PHILOSOPHY_CONFIG[philosophy].descKey}`) : ''}
      </Text>

      {/* 국면 배지 — 구루 선택 시 코스톨라니 국면 반영 상태 표시 */}
      {philosophy !== 'custom' && kostolalyPhase && (
        <View style={s.phaseBadgeRow}>
          <Text style={s.phaseBadgeText}>
            {t('allocation_drift.phase_badge', { emoji: KOSTOLANY_PHASE_EMOJIS[kostolalyPhase], name: KOSTOLANY_PHASE_NAMES[kostolalyPhase], phase: kostolalyPhase })}
          </Text>
        </View>
      )}

      {/* "왜 이탈이 생겼는가" 설명 */}
      <View style={s.whySection}>
        <View style={s.whyRow}>
          <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
          <Text style={s.whyLabel}>{t('allocation_drift.why_label')}</Text>
        </View>
        <Text style={s.whyText}>{whyExplanation}</Text>
      </View>

      {/* "어떻게 해야 하는가" 액션 가이드 */}
      {actionGuidance && (
        <View style={s.actionGuideSection}>
          <View style={s.actionGuideRow}>
            <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.primaryDark ?? colors.primary} />
            <Text style={s.actionGuideLabel}>{t('allocation_drift.action_guide_label')}</Text>
          </View>
          <Text style={s.actionGuideText}>{actionGuidance}</Text>
        </View>
      )}

      {/* 뷰 모드 토글 */}
      <View style={s.viewToggle}>
        <TouchableOpacity
          style={[s.toggleBtn, viewMode === 'bar' && s.toggleBtnActive]}
          onPress={() => setViewMode('bar')}
          activeOpacity={0.7}
        >
          <Ionicons name="bar-chart-outline" size={14} color={viewMode === 'bar' ? colors.inverseText : colors.textTertiary} />
          <Text style={[s.toggleText, viewMode === 'bar' && s.toggleTextActive]}>{t('allocation_drift.view_bar')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, viewMode === 'pie' && s.toggleBtnActive]}
          onPress={() => setViewMode('pie')}
          activeOpacity={0.7}
        >
          <Ionicons name="pie-chart-outline" size={14} color={viewMode === 'pie' ? colors.inverseText : colors.textTertiary} />
          <Text style={[s.toggleText, viewMode === 'pie' && s.toggleTextActive]}>{t('allocation_drift.view_pie')}</Text>
        </TouchableOpacity>
      </View>

      {/* 파이 차트 모드 */}
      {viewMode === 'pie' && (
        <View style={s.pieContainer}>
          <AllocationPieChart
            slices={pieSlices}
            totalValue={liquidTotal}
            size={180}
            strokeWidth={28}
            showLegend={true}
          />
        </View>
      )}

      {/* 이탈도 바 차트 (바 모드에서만 표시) */}
      {viewMode === 'bar' && (
        <>
          <View style={s.driftChart}>
            {driftItems.map((item) => {
              if (item.currentPct === 0 && item.targetPct === 0) return null;
              const maxPct = Math.max(item.currentPct, item.targetPct, 1);
              const currentWidth = Math.min((item.currentPct / maxPct) * 100, 100);
              const targetWidth = Math.min((item.targetPct / maxPct) * 100, 100);

              return (
                <View key={item.category.key} style={s.driftRow}>
                  {/* 이모티콘 + 자산 이름 + ⓘ 버튼 */}
                  <View style={s.driftLabelGroup}>
                    <Text style={[s.driftIcon, item.category.key === 'bitcoin' && { color: '#F5A623' }]}>{item.category.icon}</Text>
                    <Text style={[s.driftLabel, { color: colors.textSecondary }]} numberOfLines={1}>{t(`allocation_drift.cat_labels.${item.category.key}`)}</Text>
                    <TouchableOpacity
                      onPress={() => setInfoKey(item.category.key)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={[s.infoBtn, { color: colors.textTertiary }]}>ⓘ</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.driftBarContainer}>
                    {/* 목표 바 (배경) */}
                    <View style={[s.driftBarTarget, { width: `${targetWidth}%`, borderColor: item.category.color + '40' }]} />
                    {/* 현재 바 (전경) */}
                    <View style={[s.driftBarCurrent, { width: `${currentWidth}%`, backgroundColor: item.category.color }]} />
                  </View>
                  <View style={s.driftNumbers}>
                    <Text style={[s.driftCurrent, { color: item.category.color }]}>
                      {item.currentPct.toFixed(0)}%
                    </Text>
                    <Text style={s.driftSeparator}>/</Text>
                    <Text style={s.driftTargetNum}>{item.targetPct}%</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* 범례 */}
          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendBar, { backgroundColor: colors.success }]} />
              <Text style={s.legendText}>{t('allocation_drift.legend_current')}</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendBar, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.textTertiary }]} />
              <Text style={s.legendText}>{t('allocation_drift.legend_target')}</Text>
            </View>
          </View>
        </>
      )}

      {/* 상세 (펼침) */}
      {showDetail && !isEditing && (
        <View style={s.detailContainer}>
          {driftItems.filter(d => d.currentPct > 0 || d.targetPct > 0).map((item) => {
            const driftAbs = Math.abs(item.drift);
            const isOver = item.drift > 0;
            const needsAction = driftAbs > 5;
            return (
              <View key={item.category.key} style={s.detailRow}>
                <Text style={s.detailIcon}>{item.category.icon}</Text>
                <Text style={s.detailLabel}>{t(`allocation_drift.cat_labels.${item.category.key}`)}</Text>
                <Text style={s.detailCurrent}>{item.currentPct.toFixed(1)}%</Text>
                <Ionicons name="arrow-forward" size={10} color={colors.textTertiary} />
                <Text style={s.detailTarget}>{item.targetPct}%</Text>
                {needsAction && (
                  <View style={[s.detailDriftBadge, { backgroundColor: isOver ? `${colors.error}1F` : `${colors.success}1F` }]}>
                    <Text style={[s.detailDriftText, { color: isOver ? colors.error : colors.success }]}>
                      {isOver ? t('allocation_drift.detail_over') : t('allocation_drift.detail_under')} {driftAbs.toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

        </View>
      )}

      {/* 편집 모드 */}
      {isEditing && (
        <View style={s.editContainer}>
          <Text style={s.editTitle}>{t('allocation_drift.edit_title')}</Text>
          {CATEGORIES.map(cat => (
            <View key={cat.key} style={s.editRow}>
              <Text style={[s.editIcon, cat.key === 'bitcoin' && { color: '#F5A623' }]}>{cat.icon}</Text>
              <Text style={s.editLabel}>{t(`allocation_drift.cat_labels.${cat.key}`)}</Text>
              <TextInput
                style={s.editInput}
                value={editValues[cat.key]}
                onChangeText={(text) => setEditValues(prev => ({ ...prev, [cat.key]: text.replace(/[^0-9]/g, '') }))}
                keyboardType="number-pad"
                maxLength={3}
                selectTextOnFocus
              />
              <Text style={s.editPercent}>%</Text>
            </View>
          ))}
          <View style={s.editFooter}>
            <Text style={[s.editSum, { color: editSum === 100 ? colors.success : colors.error }]}>
              {t('allocation_drift.edit_sum_label', { sum: String(editSum) })}
            </Text>
            <View style={s.editButtons}>
              <TouchableOpacity style={s.editCancel} onPress={() => setIsEditing(false)}>
                <Text style={s.editCancelText}>{t('allocation_drift.edit_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.editSave, editSum !== 100 && { opacity: 0.4 }]}
                onPress={saveTarget}
                disabled={editSum !== 100}
              >
                <Text style={s.editSaveText}>{t('allocation_drift.edit_save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── 안정 자산 기반 (부동산) ── */}
      {realEstateInfo.count > 0 && (
        <View style={s.realEstateCard}>
          <View style={s.realEstateHeader}>
            <Text style={s.realEstateIcon}>🏠</Text>
            <Text style={[s.realEstateTitle, { color: colors.inverseText }]}>{t('allocation_drift.realestate_title')}</Text>
            <Text style={[s.realEstateSubtitle, { color: colors.textTertiary }]}>{t('allocation_drift.realestate_subtitle')}</Text>
            {/* 부동산도 ⓘ 버튼 */}
            <TouchableOpacity
              onPress={() => setInfoKey('realestate')}
              style={{ marginLeft: 'auto' }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={[s.infoBtn, { color: colors.textTertiary, fontSize: 17 }]}>ⓘ</Text>
            </TouchableOpacity>
          </View>
          <View style={s.realEstateBody}>
            <Text style={[s.realEstateValue, { color: colors.inverseText }]}>
              {t('allocation_drift.realestate_value', { amount: String(Math.round(realEstateInfo.grossValue / 100000000)) })}
              <Text style={[s.realEstateRatio, { color: colors.textSecondary }]}>
                {t('allocation_drift.realestate_ratio', { pct: realEstateRatio.toFixed(0) })}
              </Text>
            </Text>
            {realEstateInfo.totalDebt > 0 && (
              <Text style={[s.realEstateDebt, { color: colors.textTertiary }]}>
                {t('allocation_drift.realestate_debt', { amount: (realEstateInfo.totalDebt / 100000000).toFixed(1), ltv: realEstateInfo.avgLtv.toFixed(0) })}
              </Text>
            )}

            {/* 달리오 보너스: 건강 점수 기여 표시 */}
            {realEstateBonus.bonus > 0 ? (
              <View style={s.realEstateBonusRow}>
                <View style={[s.realEstateBonusBadge, { backgroundColor: colors.success + '22' }]}>
                  <Text style={[s.realEstateBonusText, { color: colors.success }]}>
                    {t('allocation_drift.realestate_bonus', { bonus: String(realEstateBonus.bonus) })}
                  </Text>
                </View>
                <Text style={[s.realEstateBonusReason, { color: colors.textSecondary }]}>
                  {realEstateBonus.reason}
                </Text>
              </View>
            ) : (
              <Text style={[s.realEstateMessage, { color: colors.textTertiary }]}>
                {realEstateBonus.reason || t('allocation_drift.realestate_no_bonus')}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
    </>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { fontSize: 18, fontWeight: '700' },
  cardLabelEn: { fontSize: 13, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  driftBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 6 },
  driftDot: { width: 6, height: 6, borderRadius: 3 },
  driftText: { fontSize: 14, fontWeight: '700' },

  // 철학 선택
  philosophyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  philosophyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: `${colors.textTertiary}0A`,
  },
  philosophyEmoji: { fontSize: 13 },
  philosophyBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  philosophyDesc: { fontSize: 13, textAlign: 'center', marginBottom: 4 },
  phaseBadgeRow: {
    alignSelf: 'center',
    backgroundColor: `${colors.warning}15`,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 10,
  },
  phaseBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
    textAlign: 'center',
  },

  // "왜 이탈이 생겼는가" 섹션
  whySection: {
    backgroundColor: `${colors.textTertiary}10`,
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
    color: colors.textSecondary,
  },
  whyText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // "어떻게 해야 하는가" 액션 가이드 섹션
  actionGuideSection: {
    backgroundColor: `${colors.success}10`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 2,
    borderLeftColor: `${colors.success}4D`,
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
    color: colors.primaryDark ?? colors.primary,
  },
  actionGuideText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // 이탈도 바 차트
  driftChart: { gap: 10 },
  driftRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driftLabelGroup: { flexDirection: 'row', alignItems: 'center', width: 105, gap: 4, flexShrink: 0 },
  driftIcon: { fontSize: 15 },
  driftLabel: { fontSize: 14, flex: 1, lineHeight: 20 },
  driftBarContainer: { flex: 1, height: 14, backgroundColor: colors.surfaceElevated, borderRadius: 7, overflow: 'hidden', justifyContent: 'center' },
  driftBarTarget: { position: 'absolute', height: 14, borderRadius: 7, borderWidth: 1, borderStyle: 'dashed' },
  driftBarCurrent: { height: 8, borderRadius: 4, marginHorizontal: 3 },
  driftNumbers: { flexDirection: 'row', alignItems: 'baseline', width: 65 },
  driftCurrent: { fontSize: 14, fontWeight: '700' },
  driftSeparator: { fontSize: 12, color: colors.textQuaternary, marginHorizontal: 2 },
  driftTargetNum: { fontSize: 13, color: colors.textTertiary },

  // 범례
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendBar: { width: 12, height: 4, borderRadius: 2 },
  legendText: { fontSize: 13, color: colors.textTertiary },

  // 상세
  detailContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 15, width: 20, textAlign: 'center' },
  detailLabel: { fontSize: 15, color: colors.textSecondary, width: 55 },
  detailCurrent: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, width: 42, textAlign: 'right' },
  detailTarget: { fontSize: 15, color: colors.textTertiary, width: 35 },
  detailDriftBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' },
  detailDriftText: { fontSize: 13, fontWeight: '700' },

  // 편집 버튼
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: `${colors.textTertiary}0A` },
  editButtonText: { fontSize: 14, color: colors.textTertiary },

  // 편집 모드
  editContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  editTitle: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  editIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  editLabel: { fontSize: 15, color: colors.textSecondary, width: 60 },
  editInput: { width: 50, height: 34, backgroundColor: colors.surfaceElevated, borderRadius: 8, color: colors.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  editPercent: { fontSize: 14, color: colors.textTertiary },
  editFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  editSum: { fontSize: 15, fontWeight: '700' },
  editButtons: { flexDirection: 'row', gap: 8 },
  editCancel: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: `${colors.textTertiary}0F` },
  editCancelText: { fontSize: 14, color: colors.textTertiary, fontWeight: '600' },
  editSave: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: `${colors.success}26` },
  editSaveText: { fontSize: 14, color: colors.primaryDark ?? colors.primary, fontWeight: '700' },

  // 뷰 모드 토글
  viewToggle: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 14 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: `${colors.textTertiary}0A` },
  toggleBtnActive: { backgroundColor: `${colors.success}26` },
  toggleText: { fontSize: 14, color: colors.textTertiary, fontWeight: '600' },
  toggleTextActive: { color: colors.textPrimary },

  // 파이 차트 컨테이너
  pieContainer: { alignItems: 'center', paddingVertical: 8 },

  // ── 안정 자산 기반 (부동산) ──
  realEstateCard: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  realEstateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  realEstateIcon: { fontSize: 17 },
  realEstateTitle: { fontSize: 16, fontWeight: '700' },
  realEstateSubtitle: { fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  realEstateBody: { gap: 4 },
  realEstateValue: { fontSize: 16, fontWeight: '600' },
  realEstateRatio: { fontSize: 14, fontWeight: '400' },
  realEstateDebt: { fontSize: 14 },
  realEstateMessage: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  realEstateBonusRow: { marginTop: 8, gap: 4 },
  realEstateBonusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  realEstateBonusText: { fontSize: 14, fontWeight: '700' },
  realEstateBonusReason: { fontSize: 14, lineHeight: 20 },

  // ── ⓘ 버튼 & 모달 ──
  infoBtn: { fontSize: 13, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  infoModal: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  infoSection: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  infoSectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  infoSectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoCloseBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
