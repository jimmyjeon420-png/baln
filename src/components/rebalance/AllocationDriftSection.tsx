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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from '../../types/asset';
import { classifyAsset, AssetCategory, getNetAssetValue, calculateLTV } from '../../services/rebalanceScore';
import AllocationPieChart, { PieSlice } from '../charts/AllocationPieChart';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../styles/colors';

// ── 카테고리 설정 ──

interface CategoryConfig {
  key: AssetCategory;
  label: string;
  icon: string;
  color: string;
}

// 유동 자산 5개 카테고리 (부동산은 비유동 → 별도 표시)
const CATEGORIES: CategoryConfig[] = [
  { key: 'large_cap', label: '주식', icon: '📈', color: '#4CAF50' },
  { key: 'bond',      label: '채권', icon: '🏛️', color: '#64B5F6' },
  { key: 'bitcoin',   label: '비트코인', icon: '₿', color: '#F7931A' },
  { key: 'altcoin',   label: '알트코인', icon: '🪙', color: '#9C27B0' },
  { key: 'cash',      label: '현금', icon: '💵', color: '#78909C' },
];

// 기본 목표 배분 — 유동 자산만 (부동산 제외, 합계 100%)
// 달리오: "비유동 자산은 리밸런싱 대상이 아니라 기준점"
const DEFAULT_TARGET: Record<AssetCategory, number> = {
  large_cap: 55,
  bond: 20,
  bitcoin: 10,
  altcoin: 5,
  realestate: 0,  // 비유동 → 리밸런싱 제외
  cash: 10,
};

const STORAGE_KEY = '@target_allocation';

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
  // 현재 배분 계산
  const currentMap: Record<AssetCategory, number> = {
    cash: 0, bond: 0, large_cap: 0, realestate: 0, bitcoin: 0, altcoin: 0,
  };

  assets.forEach(asset => {
    const cat = classifyAsset(asset);
    currentMap[cat] += asset.currentValue;
  });

  return CATEGORIES.map(cat => {
    const currentPct = totalAssets > 0 ? (currentMap[cat.key] / totalAssets) * 100 : 0;
    const targetPct = target[cat.key] ?? 0;
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
}

// ── 뷰 모드: 텍스트(바 차트) vs 파이 차트 ──
type ViewMode = 'bar' | 'pie';

/**
 * "왜 이탈이 생겼는가" 요약 생성
 */
function generateDriftWhyExplanation(driftItems: DriftItem[], totalDrift: number): string {
  if (totalDrift <= 3) {
    return '목표 배분과 거의 일치합니다. 현재 균형이 잘 유지되고 있어요.';
  }

  const sorted = [...driftItems]
    .filter(d => d.currentPct > 0 || d.targetPct > 0)
    .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));

  const biggest = sorted[0];
  if (!biggest) return '';

  const isOver = biggest.drift > 0;
  const driftAbs = Math.abs(biggest.drift).toFixed(1);
  const direction = isOver ? '초과' : '부족';

  if (isOver) {
    if (sorted.length >= 2 && Math.abs(sorted[1].drift) > 5) {
      const second = sorted[1];
      const secondDir = second.drift > 0 ? '초과' : '부족';
      return `${biggest.category.label} 비중이 목표 대비 ${driftAbs}%p ${direction}하고, ${second.category.label}이(가) ${Math.abs(second.drift).toFixed(1)}%p ${secondDir}한 상태예요.`;
    }
    return `${biggest.category.label} 비중이 목표 대비 ${driftAbs}%p ${direction}한 상태예요. 해당 자산의 가치 상승이 원인일 수 있습니다.`;
  } else {
    return `${biggest.category.label} 비중이 목표 대비 ${driftAbs}%p ${direction}해요. 다른 자산이 상대적으로 많이 늘어난 것이 원인일 수 있습니다.`;
  }
}

/**
 * "어떻게 해야 하는가" 액션 가이드 생성
 */
function generateDriftActionGuidance(driftItems: DriftItem[], totalDrift: number): string | null {
  if (totalDrift <= 3) return null;

  const overItems = driftItems
    .filter(d => d.drift > 5)
    .sort((a, b) => b.drift - a.drift);
  const underItems = driftItems
    .filter(d => d.drift < -5)
    .sort((a, b) => a.drift - b.drift);

  const parts: string[] = [];

  if (overItems.length > 0) {
    const names = overItems.slice(0, 2).map(d => d.category.label).join(', ');
    parts.push(`${names} 비중을 줄이고`);
  }

  if (underItems.length > 0) {
    const names = underItems.slice(0, 2).map(d => d.category.label).join(', ');
    parts.push(`${names} 비중을 늘리는 것`);
  }

  if (parts.length === 0) {
    return '소폭 이탈이므로 급하지 않지만, 다음 매매 시 목표 배분을 참고해보세요.';
  }

  return `${parts.join(' ')}을 고려해보세요. 아래 "오늘의 액션"에서 구체적인 매매 제안을 확인할 수 있어요.`;
}

export default function AllocationDriftSection({
  assets,
  totalAssets,
}: AllocationDriftSectionProps) {
  const { colors } = useTheme();
  const [showDetail, setShowDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const [target, setTarget] = useState<Record<AssetCategory, number>>(DEFAULT_TARGET);
  const [editValues, setEditValues] = useState<Record<AssetCategory, string>>({} as any);

  // AsyncStorage에서 목표 배분 로드
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored) {
        try { setTarget(JSON.parse(stored)); } catch (err) { console.warn('[배분이탈] 목표 배분 파싱 실패:', err); }
      }
    });
  }, []);

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

  // 유동 자산 총액 (부동산 제외 — 비중 계산 기준)
  const liquidTotal = useMemo(() => totalAssets - realEstateInfo.grossValue, [totalAssets, realEstateInfo.grossValue]);
  const realEstateRatio = totalAssets > 0 ? (realEstateInfo.grossValue / totalAssets) * 100 : 0;

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
  const driftLabel = totalDrift <= 5 ? '균형' : totalDrift <= 15 ? '소폭 이탈' : '조정 필요';

  // "왜" + "어떻게" 설명 계산
  const whyExplanation = useMemo(
    () => generateDriftWhyExplanation(driftItems, totalDrift),
    [driftItems, totalDrift],
  );
  const actionGuidance = useMemo(
    () => generateDriftActionGuidance(driftItems, totalDrift),
    [driftItems, totalDrift],
  );

  // 파이 차트 슬라이스 데이터 (유동 자산만)
  const pieSlices: PieSlice[] = useMemo(() => {
    const currentMap: Record<AssetCategory, number> = {
      cash: 0, bond: 0, large_cap: 0, realestate: 0, bitcoin: 0, altcoin: 0,
    };
    assets.forEach(asset => {
      const cat = classifyAsset(asset);
      currentMap[cat] += asset.currentValue;
    });

    return CATEGORIES  // CATEGORIES에 realestate 없으므로 자동 제외
      .filter(cat => currentMap[cat.key] > 0)
      .map(cat => ({
        key: cat.key,
        label: cat.label,
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
      Alert.alert('합계 오류', `목표 배분의 합이 100%여야 합니다. (현재: ${sum}%)`);
      return;
    }

    setTarget(newTarget);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTarget));
    setIsEditing(false);
  }, [editValues]);

  // 편집 합계
  const editSum = useMemo(() => {
    return CATEGORIES.reduce((sum, c) => {
      const val = parseInt(editValues[c.key] || '0', 10);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [editValues]);

  if (totalAssets === 0) return null;

  const s = createStyles(colors);

  return (
    <View style={[s.card, { backgroundColor: colors.inverseSurface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <TouchableOpacity
        style={s.headerRow}
        onPress={() => setShowDetail(!showDetail)}
        activeOpacity={0.7}
      >
        <View>
          <Text style={[s.cardLabel, { color: colors.inverseText }]}>배분 이탈도</Text>
          <Text style={[s.cardLabelEn, { color: colors.textTertiary }]}>Allocation Drift</Text>
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

      {/* "왜 이탈이 생겼는가" 설명 */}
      <View style={s.whySection}>
        <View style={s.whyRow}>
          <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
          <Text style={s.whyLabel}>왜 이탈이 생겼나요?</Text>
        </View>
        <Text style={s.whyText}>{whyExplanation}</Text>
      </View>

      {/* "어떻게 해야 하는가" 액션 가이드 */}
      {actionGuidance && (
        <View style={s.actionGuideSection}>
          <View style={s.actionGuideRow}>
            <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.primaryDark ?? colors.primary} />
            <Text style={s.actionGuideLabel}>어떻게 조정하나요?</Text>
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
          <Text style={[s.toggleText, viewMode === 'bar' && s.toggleTextActive]}>바 차트</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, viewMode === 'pie' && s.toggleBtnActive]}
          onPress={() => setViewMode('pie')}
          activeOpacity={0.7}
        >
          <Ionicons name="pie-chart-outline" size={14} color={viewMode === 'pie' ? colors.inverseText : colors.textTertiary} />
          <Text style={[s.toggleText, viewMode === 'pie' && s.toggleTextActive]}>파이 차트</Text>
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
                  <Text style={s.driftIcon}>{item.category.icon}</Text>
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
              <Text style={s.legendText}>현재</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendBar, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.textTertiary }]} />
              <Text style={s.legendText}>목표</Text>
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
                <Text style={s.detailLabel}>{item.category.label}</Text>
                <Text style={s.detailCurrent}>{item.currentPct.toFixed(1)}%</Text>
                <Ionicons name="arrow-forward" size={10} color={colors.textTertiary} />
                <Text style={s.detailTarget}>{item.targetPct}%</Text>
                {needsAction && (
                  <View style={[s.detailDriftBadge, { backgroundColor: isOver ? `${colors.error}1F` : `${colors.success}1F` }]}>
                    <Text style={[s.detailDriftText, { color: isOver ? colors.error : colors.success }]}>
                      {isOver ? '초과' : '부족'} {driftAbs.toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* 목표 수정 버튼 */}
          <TouchableOpacity style={s.editButton} onPress={startEditing} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={14} color={colors.textTertiary} />
            <Text style={s.editButtonText}>목표 배분 수정</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 편집 모드 */}
      {isEditing && (
        <View style={s.editContainer}>
          <Text style={s.editTitle}>목표 배분 설정 (합계 100%)</Text>
          {CATEGORIES.map(cat => (
            <View key={cat.key} style={s.editRow}>
              <Text style={s.editIcon}>{cat.icon}</Text>
              <Text style={s.editLabel}>{cat.label}</Text>
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
              합계: {editSum}%
            </Text>
            <View style={s.editButtons}>
              <TouchableOpacity style={s.editCancel} onPress={() => setIsEditing(false)}>
                <Text style={s.editCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.editSave, editSum !== 100 && { opacity: 0.4 }]}
                onPress={saveTarget}
                disabled={editSum !== 100}
              >
                <Text style={s.editSaveText}>저장</Text>
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
            <Text style={[s.realEstateTitle, { color: colors.inverseText }]}>안정 자산 기반</Text>
            <Text style={[s.realEstateSubtitle, { color: colors.textTertiary }]}>Stable Foundation</Text>
          </View>
          <View style={s.realEstateBody}>
            <Text style={[s.realEstateValue, { color: colors.inverseText }]}>
              부동산 ₩{(realEstateInfo.grossValue / 100000000).toFixed(1)}억
              <Text style={[s.realEstateRatio, { color: colors.textSecondary }]}>
                {' '}(전체 자산의 {realEstateRatio.toFixed(1)}%)
              </Text>
            </Text>
            {realEstateInfo.totalDebt > 0 && (
              <Text style={[s.realEstateDebt, { color: colors.textTertiary }]}>
                대출 ₩{(realEstateInfo.totalDebt / 100000000).toFixed(1)}억 (LTV {realEstateInfo.avgLtv.toFixed(0)}%)
              </Text>
            )}
            <Text style={[s.realEstateMessage, { color: colors.success }]}>
              장기 자산이 포트폴리오의 기반을 잡아줍니다
            </Text>
          </View>
        </View>
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { fontSize: 15, fontWeight: '700' },
  cardLabelEn: { fontSize: 10, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  driftBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 6 },
  driftDot: { width: 6, height: 6, borderRadius: 3 },
  driftText: { fontSize: 12, fontWeight: '700' },

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
    gap: 5,
    marginBottom: 4,
  },
  whyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  whyText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
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
    gap: 5,
    marginBottom: 4,
  },
  actionGuideLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryDark ?? colors.primary,
  },
  actionGuideText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // 이탈도 바 차트
  driftChart: { gap: 8 },
  driftRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driftIcon: { fontSize: 14, width: 22, textAlign: 'center' },
  driftBarContainer: { flex: 1, height: 14, backgroundColor: colors.surfaceElevated, borderRadius: 7, overflow: 'hidden', justifyContent: 'center' },
  driftBarTarget: { position: 'absolute', height: 14, borderRadius: 7, borderWidth: 1, borderStyle: 'dashed' },
  driftBarCurrent: { height: 8, borderRadius: 4, marginHorizontal: 3 },
  driftNumbers: { flexDirection: 'row', alignItems: 'baseline', width: 65 },
  driftCurrent: { fontSize: 12, fontWeight: '700' },
  driftSeparator: { fontSize: 10, color: colors.textQuaternary, marginHorizontal: 2 },
  driftTargetNum: { fontSize: 10, color: colors.textTertiary },

  // 범례
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendBar: { width: 12, height: 4, borderRadius: 2 },
  legendText: { fontSize: 10, color: colors.textTertiary },

  // 상세
  detailContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 13, width: 20, textAlign: 'center' },
  detailLabel: { fontSize: 13, color: colors.textSecondary, width: 55 },
  detailCurrent: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, width: 42, textAlign: 'right' },
  detailTarget: { fontSize: 13, color: colors.textTertiary, width: 35 },
  detailDriftBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' },
  detailDriftText: { fontSize: 10, fontWeight: '700' },

  // 편집 버튼
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: `${colors.textTertiary}0A` },
  editButtonText: { fontSize: 12, color: colors.textTertiary },

  // 편집 모드
  editContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  editTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  editIcon: { fontSize: 14, width: 22, textAlign: 'center' },
  editLabel: { fontSize: 13, color: colors.textSecondary, width: 60 },
  editInput: { width: 50, height: 34, backgroundColor: colors.surfaceElevated, borderRadius: 8, color: colors.textPrimary, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  editPercent: { fontSize: 12, color: colors.textTertiary },
  editFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  editSum: { fontSize: 13, fontWeight: '700' },
  editButtons: { flexDirection: 'row', gap: 8 },
  editCancel: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: `${colors.textTertiary}0F` },
  editCancelText: { fontSize: 12, color: colors.textTertiary, fontWeight: '600' },
  editSave: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: `${colors.success}26` },
  editSaveText: { fontSize: 12, color: colors.primaryDark ?? colors.primary, fontWeight: '700' },

  // 뷰 모드 토글
  viewToggle: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 14 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: `${colors.textTertiary}0A` },
  toggleBtnActive: { backgroundColor: `${colors.success}26` },
  toggleText: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
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
  realEstateIcon: { fontSize: 16 },
  realEstateTitle: { fontSize: 14, fontWeight: '700' },
  realEstateSubtitle: { fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  realEstateBody: { gap: 4 },
  realEstateValue: { fontSize: 14, fontWeight: '600' },
  realEstateRatio: { fontSize: 12, fontWeight: '400' },
  realEstateDebt: { fontSize: 12 },
  realEstateMessage: { fontSize: 12, fontWeight: '500', marginTop: 4 },
});
