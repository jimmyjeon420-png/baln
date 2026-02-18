/**
 * KostolalyPhaseCard — 코스톨라니 달걀 모형 현재 국면 카드
 *
 * [역할]
 * 분석 탭 최상단에 표시. 현재 시장 국면(A~F)을 달걀 모형 시각화로 보여줌.
 * AI 근거 3~5개 + 달리오/버핏 관점 + "이 국면에 맞는 배분 적용" 버튼
 *
 * [시각화 방식]
 * SVG 없이 텍스트 기반 달걀 모형:
 * ╔═══════════════╗
 * ║  C(과열)      ║  ← 달걀 상단 (거품)
 * ║ B     D       ║  ← 달걀 중간 (상승/하락)
 * ║  A(바닥)     ║  ← 달걀 하단 (바닥)
 * ╚═══════════════╝
 * F와 E는 하단 좌우에 배치
 *
 * [연동]
 * "배분 적용" 버튼 클릭 → onApplyPhase(target) 콜백 → AllocationDriftSection 업데이트
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../styles/colors';
import { useKostolalyPhase } from '../../hooks/useKostolalyPhase';
import {
  KostolalyPhase,
  KOSTOLANY_PHASE_NAMES,
  KOSTOLANY_PHASE_EMOJIS,
  KOSTOLANY_PHASE_DESCRIPTIONS,
  KOSTOLANY_TARGETS,
  AssetCategory,
} from '../../services/rebalanceScore';

// ── 달걀 모형 레이아웃 (좌→우, 위→아래 사이클)
// 코스톨라니: A=바닥, B=상승, C=과열, D=하락초, E=패닉, F=극비관
const EGG_LAYOUT: {
  phase: KostolalyPhase;
  row: number; // 0=상단, 1=중상단, 2=중하단, 3=하단
  col: number; // 0=왼쪽, 1=중앙, 2=오른쪽
}[] = [
  { phase: 'C', row: 0, col: 1 },  // 과열 — 최상단 중앙
  { phase: 'B', row: 1, col: 0 },  // 상승 — 왼쪽 상단
  { phase: 'D', row: 1, col: 2 },  // 하락초 — 오른쪽 상단
  { phase: 'A', row: 2, col: 1 },  // 바닥 — 하단 중앙
  { phase: 'F', row: 3, col: 0 },  // 극비관 — 왼쪽 하단
  { phase: 'E', row: 3, col: 2 },  // 패닉 — 오른쪽 하단
];

// 국면별 색상
const PHASE_COLORS: Record<KostolalyPhase, string> = {
  A: '#4CAF50',   // 초록 — 바닥에서 매수
  B: '#66BB6A',   // 연두 — 상승 중
  C: '#FF5722',   // 빨강 — 과열 매도
  D: '#FF8A65',   // 주황 — 하락 경계
  E: '#CF6679',   // 분홍빨강 — 패닉
  F: '#78909C',   // 회색 — 극비관
};

// 자산 카테고리 한국어 라벨
const CAT_LABEL: Record<AssetCategory, string> = {
  large_cap: '주식', bond: '채권', bitcoin: 'BTC',
  gold: '금', commodity: '원자재', altcoin: '알트', cash: '현금', realestate: '부동산',
};

interface KostolalyPhaseCardProps {
  /** "이 국면에 맞는 배분 적용" 버튼 클릭 시 → AllocationDriftSection으로 전달 */
  onApplyPhase?: (target: Record<AssetCategory, number>, phase: KostolalyPhase) => void;
}

export default function KostolalyPhaseCard({ onApplyPhase }: KostolalyPhaseCardProps) {
  const { colors } = useTheme();
  const { data, phase, target, isLoading, isError } = useKostolalyPhase();
  const [showDetail, setShowDetail] = useState(false);
  const s = createStyles(colors);

  // ── 로딩 ──
  if (isLoading) {
    return (
      <View style={[s.card, { borderColor: colors.border }]}>
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color={colors.success} />
          <Text style={[s.loadingText, { color: colors.textTertiary }]}>
            코스톨라니 국면 분석 중...
          </Text>
        </View>
      </View>
    );
  }

  // ── 에러 / 데이터 없음 ──
  if (isError || !data || !phase) {
    return (
      <View style={[s.card, { borderColor: colors.border }]}>
        <View style={s.errorRow}>
          <Ionicons name="analytics-outline" size={18} color={colors.textTertiary} />
          <Text style={[s.errorText, { color: colors.textTertiary }]}>
            국면 분석 데이터를 불러오는 중이에요
          </Text>
        </View>
      </View>
    );
  }

  const phaseColor = PHASE_COLORS[phase];
  const phaseName = KOSTOLANY_PHASE_NAMES[phase];
  const phaseEmoji = KOSTOLANY_PHASE_EMOJIS[phase];
  const phaseDesc = KOSTOLANY_PHASE_DESCRIPTIONS[phase];
  const phaseTarget = target ?? KOSTOLANY_TARGETS[phase];

  // 달걀 모형 렌더링 (3열 그리드)
  const renderEggModel = () => {
    // row별로 그룹핑
    const rows: (typeof EGG_LAYOUT[0] | null)[][] = [[], [], [], []];
    EGG_LAYOUT.forEach(item => {
      const row = rows[item.row];
      if (row && !row[item.col]) {
        row[item.col] = item;
      }
    });

    return (
      <View style={s.eggContainer}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={s.eggRow}>
            {[0, 1, 2].map(colIdx => {
              const cell = row[colIdx] ?? null;
              if (!cell) {
                // 빈 셀
                return <View key={colIdx} style={s.eggCellEmpty} />;
              }
              const cellPhase = cell.phase as KostolalyPhase;
              const isActive = cellPhase === phase;
              const cellColor = PHASE_COLORS[cellPhase];
              return (
                <View
                  key={colIdx}
                  style={[
                    s.eggCell,
                    isActive && { backgroundColor: cellColor, borderColor: cellColor },
                    !isActive && { borderColor: cellColor + '60' },
                  ]}
                >
                  <Text style={[s.eggCellEmoji, isActive && { opacity: 1 }]}>
                    {KOSTOLANY_PHASE_EMOJIS[cellPhase]}
                  </Text>
                  <Text style={[
                    s.eggCellPhase,
                    { color: isActive ? '#fff' : cellColor },
                    isActive && { fontWeight: '800' },
                  ]}>
                    {cellPhase}
                  </Text>
                  <Text style={[
                    s.eggCellName,
                    { color: isActive ? 'rgba(255,255,255,0.9)' : cellColor + 'AA' },
                  ]} numberOfLines={1}>
                    {KOSTOLANY_PHASE_NAMES[cellPhase].replace(' 국면', '').replace(' 초기', '초')}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
        {/* 달걀 사이클 화살표 */}
        <Text style={[s.eggCycle, { color: colors.textTertiary }]}>
          A → B → C → D → E → F → A (순환)
        </Text>
      </View>
    );
  };

  return (
    <View style={[s.card, { borderColor: phaseColor + '60' }]}>
      {/* 헤더 */}
      <TouchableOpacity
        style={s.headerRow}
        onPress={() => setShowDetail(!showDetail)}
        activeOpacity={0.7}
      >
        <View style={s.headerLeft}>
          <View style={[s.phaseTag, { backgroundColor: phaseColor + '20', borderColor: phaseColor + '40' }]}>
            <Text style={[s.phaseTagText, { color: phaseColor }]}>
              {phaseEmoji} {phase}국면
            </Text>
          </View>
          <View>
            <Text style={[s.phaseName, { color: colors.textPrimary }]}>{phaseName}</Text>
            <Text style={[s.phaseNameEn, { color: colors.textTertiary }]}>
              Kostolany Egg Model · 신뢰도 {data.confidence}%
            </Text>
          </View>
        </View>
        <Ionicons
          name={showDetail ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {/* 국면 설명 */}
      <View style={[s.descCard, { backgroundColor: phaseColor + '12', borderLeftColor: phaseColor + '80' }]}>
        <Text style={[s.descText, { color: colors.textSecondary }]}>{phaseDesc}</Text>
      </View>

      {/* 달걀 모형 시각화 */}
      {showDetail && renderEggModel()}

      {/* AI 근거 */}
      {showDetail && data.reasoning && data.reasoning.length > 0 && (
        <View style={[s.reasonSection, { backgroundColor: colors.surfaceElevated }]}>
          <View style={s.reasonHeader}>
            <Ionicons name="sparkles-outline" size={13} color={colors.textSecondary} />
            <Text style={[s.reasonTitle, { color: colors.textSecondary }]}>AI 분석 근거</Text>
          </View>
          {data.reasoning.map((reason: string, idx: number) => (
            <View key={idx} style={s.reasonRow}>
              <Text style={[s.reasonBullet, { color: phaseColor }]}>•</Text>
              <Text style={[s.reasonText, { color: colors.textSecondary }]}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 달리오/버핏 관점 */}
      {showDetail && (data.dalio_view || data.buffett_view) && (
        <View style={s.expertsRow}>
          {data.dalio_view && (
            <View style={[s.expertCard, { backgroundColor: '#4CAF5012', borderColor: '#4CAF5030' }]}>
              <Text style={[s.expertLabel, { color: '#4CAF50' }]}>🌊 달리오</Text>
              <Text style={[s.expertText, { color: colors.textSecondary }]}>{data.dalio_view}</Text>
            </View>
          )}
          {data.buffett_view && (
            <View style={[s.expertCard, { backgroundColor: '#FFB74D12', borderColor: '#FFB74D30' }]}>
              <Text style={[s.expertLabel, { color: '#FFB74D' }]}>🔴 버핏</Text>
              <Text style={[s.expertText, { color: colors.textSecondary }]}>{data.buffett_view}</Text>
            </View>
          )}
        </View>
      )}

      {/* 추천 배분 미리보기 */}
      {showDetail && (
        <View style={[s.targetPreview, { backgroundColor: colors.surfaceElevated }]}>
          <Text style={[s.targetPreviewTitle, { color: colors.textSecondary }]}>
            {phase}국면 추천 배분
          </Text>
          <View style={s.targetGrid}>
            {(Object.entries(phaseTarget) as [AssetCategory, number][])
              .filter(([cat, pct]) => cat !== 'realestate' && pct > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, pct]) => (
                <View key={cat} style={s.targetItem}>
                  <Text style={[s.targetCat, { color: colors.textTertiary }]}>{CAT_LABEL[cat]}</Text>
                  <Text style={[s.targetPct, { color: colors.textPrimary }]}>{pct}%</Text>
                </View>
              ))
            }
          </View>
        </View>
      )}

      {/* "이 국면에 맞는 배분 적용" 버튼 */}
      {onApplyPhase && (
        <TouchableOpacity
          style={[s.applyButton, { backgroundColor: phaseColor }]}
          onPress={() => onApplyPhase(phaseTarget, phase)}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={s.applyButtonText}>
            {phase}국면 배분을 목표로 적용하기
          </Text>
        </TouchableOpacity>
      )}

      {/* 업데이트 시각 */}
      <Text style={[s.updatedAt, { color: colors.textTertiary }]}>
        국면 업데이트: {new Date(data.updated_at).toLocaleDateString('ko-KR', {
          month: 'long', day: 'numeric',
        })}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    backgroundColor: colors.inverseSurface,
    borderWidth: 1,
    gap: 12,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 13 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  errorText: { fontSize: 13 },

  // 헤더
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  phaseTag: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
  },
  phaseTagText: { fontSize: 13, fontWeight: '800' },
  phaseName: { fontSize: 16, fontWeight: '800' },
  phaseNameEn: { fontSize: 10, marginTop: 2, letterSpacing: 0.3 },

  // 설명 카드
  descCard: {
    borderRadius: 10, padding: 12,
    borderLeftWidth: 3,
  },
  descText: { fontSize: 13, lineHeight: 20 },

  // 달걀 모형
  eggContainer: { alignItems: 'center', paddingVertical: 8, gap: 6 },
  eggRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  eggCell: {
    width: 82, height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: 'transparent',
  },
  eggCellEmpty: { width: 82, height: 72 },
  eggCellEmoji: { fontSize: 18, opacity: 0.8 },
  eggCellPhase: { fontSize: 16, fontWeight: '700' },
  eggCellName: { fontSize: 9, fontWeight: '500' },
  eggCycle: { fontSize: 10, marginTop: 6, letterSpacing: 0.3 },

  // AI 근거
  reasonSection: { borderRadius: 10, padding: 12, gap: 6 },
  reasonHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  reasonTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonRow: { flexDirection: 'row', gap: 6 },
  reasonBullet: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  reasonText: { fontSize: 12, lineHeight: 20, flex: 1 },

  // 달리오/버핏
  expertsRow: { gap: 8 },
  expertCard: { borderRadius: 10, padding: 12, borderWidth: 1 },
  expertLabel: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  expertText: { fontSize: 12, lineHeight: 18 },

  // 추천 배분 미리보기
  targetPreview: { borderRadius: 10, padding: 12 },
  targetPreviewTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8 },
  targetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  targetItem: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8, alignItems: 'center',
  },
  targetCat: { fontSize: 9, fontWeight: '600' },
  targetPct: { fontSize: 13, fontWeight: '800' },

  // 배분 적용 버튼
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // 업데이트 시각
  updatedAt: { fontSize: 10, textAlign: 'center', marginTop: -4 },
});
