/**
 * ScoreBreakdown.tsx — 점수 산출 근거 브레이크다운
 *
 * [비유] "점수 영수증" — 기본점에서 각 항목이 어떻게 가감되었는지 보여주는 상세 내역
 * - 각 항목: 라벨 + 점수 기여도(+15, -10) + 수평 바 + 사유
 * - 양수 초록, 음수 빨강
 * - 상단 기본점, 하단 합계
 * - 다크/라이트 모드 대응
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

// ── 타입 정의 ──

export interface ScoreBreakdownItem {
  /** 항목 이름 (예: "PER (저평가)") */
  label: string;
  /** 가감 점수 (+15 또는 -10) */
  points: number;
  /** 최대 가능 점수 */
  maxPoints: number;
  /** 사유 설명 (예: "업종 평균 15배 대비 10배로 저평가") */
  reason: string;
}

export interface ScoreBreakdownProps {
  /** 섹션 제목 (예: "재무 점수 산출 근거") */
  title: string;
  /** 기본점 (50) */
  baseScore: number;
  /** 가감 항목 목록 */
  items: ScoreBreakdownItem[];
  /** 최종 합계 점수 */
  totalScore: number;
}

// ── 상수 ──

const COLORS = {
  positive: '#10B981',
  negative: '#EF4444',
};

const BAR_MAX_WIDTH = 120;

/** 최종 점수에 따른 색상 */
function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

// ── 서브 컴포넌트 ──

function BreakdownItem({ item }: { item: ScoreBreakdownItem }) {
  const { colors } = useTheme();
  const isPositive = item.points >= 0;
  const barColor = isPositive ? COLORS.positive : COLORS.negative;
  const barWidth = Math.min(
    (Math.abs(item.points) / item.maxPoints) * BAR_MAX_WIDTH,
    BAR_MAX_WIDTH,
  );

  return (
    <View style={[styles.itemRow, { borderBottomColor: colors.border }]}>
      {/* 라벨 + 점수 */}
      <View style={styles.itemHeader}>
        <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>
          {item.label}
        </Text>
        <Text style={[styles.itemPoints, { color: barColor }]}>
          {isPositive ? '+' : ''}
          {item.points}
        </Text>
      </View>

      {/* 수평 바 */}
      <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
        <View
          style={[
            styles.barFill,
            { width: barWidth, backgroundColor: barColor },
          ]}
        />
      </View>

      {/* 사유 */}
      <Text style={[styles.itemReason, { color: colors.textTertiary }]}>
        {item.reason}
      </Text>
    </View>
  );
}

// ── 메인 컴포넌트 ──

export default function ScoreBreakdown({
  title,
  baseScore,
  items,
  totalScore,
}: ScoreBreakdownProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* ── 헤더 ── */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>

      {/* ── 기본점 ── */}
      <View style={[styles.baseRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.baseLabel, { color: colors.textSecondary }]}>
          기본점
        </Text>
        <Text style={[styles.baseScore, { color: colors.textPrimary }]}>
          {baseScore}점
        </Text>
      </View>

      {/* ── 항목 목록 ── */}
      {items.map((item, idx) => (
        <BreakdownItem key={idx} item={item} />
      ))}

      {/* ── 합계 ── */}
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>
          합계
        </Text>
        <Text
          style={[styles.totalScore, { color: getScoreColor(totalScore) }]}
        >
          {totalScore}점
        </Text>
      </View>
    </View>
  );
}

// ── StyleSheet ──

const styles = StyleSheet.create({
  // ── 컨테이너 ──
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },

  // ── 헤더 ──
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },

  // ── 기본점 ──
  baseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  baseLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  baseScore: {
    fontSize: 15,
    fontWeight: '600',
  },

  // ── 항목 ──
  itemRow: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  itemPoints: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  itemReason: {
    fontSize: 12,
    lineHeight: 17,
  },

  // ── 합계 ──
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalScore: {
    fontSize: 21,
    fontWeight: '800',
  },
});
