import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../../styles/theme';
import { useTheme } from '../../hooks/useTheme';
import RollingNumber from '../RollingNumber';

// ============================================================================
// 타입 정의
// ============================================================================

interface HeroCardProps {
  totalAssets: number;
  totalPnL: number;
  totalPnLPercent: number;
  totalRealEstate: number;      // 부동산 자산 총액 (0이면 미표시)
  healthGrade: string;          // 'S'|'A'|'B'|'C'|'D'
  healthGradeColor: string;
  healthGradeBgColor: string;
  healthGradeLabel: string;     // '최적'|'양호' 등
  healthScore: number;          // 0~100
  onDiagnosisPress: () => void;
  onRealEstatePress?: () => void;
}

// ============================================================================
// HeroCard — 총자산 히어로 카드 (정문 전광판 역할)
// ============================================================================

export default function HeroCard({
  totalAssets,
  totalPnL,
  totalPnLPercent,
  totalRealEstate,
  healthGrade,
  healthGradeColor,
  healthGradeBgColor,
  healthGradeLabel,
  healthScore,
  onDiagnosisPress,
  onRealEstatePress,
}: HeroCardProps) {
  const { colors } = useTheme();
  const isPositive = totalPnL >= 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* 상단: 총 평가금액 라벨 + 등급 배지 */}
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>총 평가금액</Text>
        <View style={[styles.gradeBadge, { backgroundColor: healthGradeBgColor }]}>
          <Text style={[styles.gradeText, { color: healthGradeColor }]}>
            {healthGrade} {healthGradeLabel}
          </Text>
        </View>
      </View>

      {/* 총자산 금액 (롤링 애니메이션) */}
      <RollingNumber
        value={totalAssets}
        format="currency"
        prefix="₩"
        style={StyleSheet.flatten([styles.totalValue, { color: colors.textPrimary }]) as TextStyle}
        duration={1000}
      />

      {/* 손익 표시 */}
      <View style={styles.pnlRow}>
        <Text style={[styles.pnlText, { color: isPositive ? colors.primary : colors.error }]}>
          {isPositive ? '+' : ''}₩{Math.abs(Math.round(totalPnL)).toLocaleString('ko-KR')}
          {' '}({isPositive ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
          {' '}{isPositive ? '▲' : '▼'}
        </Text>
      </View>

      {/* 부동산 포함 금액 (보유 시에만 표시) */}
      {totalRealEstate > 0 && (
        <TouchableOpacity
          style={styles.realEstateRow}
          onPress={onRealEstatePress}
          activeOpacity={0.7}
          disabled={!onRealEstatePress}
        >
          <Ionicons name="home-outline" size={14} color={colors.warning} />
          <Text style={[styles.realEstateText, { color: colors.warning }]}>
            부동산 ₩{totalRealEstate.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} 포함
          </Text>
          {onRealEstatePress && (
            <Ionicons name="add-circle-outline" size={14} color={colors.textTertiary} />
          )}
        </TouchableOpacity>
      )}

      {/* 하단 버튼 2개: 건강 점수 | AI 진단 받기 */}
      <View style={styles.actions}>
        <View style={[styles.actionBtn, { backgroundColor: colors.background }]}>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>건강 점수</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, { color: healthGradeColor }]}>
              {healthScore}점
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, styles.diagnosisBtn, { backgroundColor: colors.background }]}
          onPress={onDiagnosisPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>AI 진단 받기</Text>
          <View style={styles.diagnosisArrow}>
            <Ionicons name="analytics-outline" size={20} color={colors.primary} />
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.rXl,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 33,
    fontWeight: '800',
  },
  pnlRow: {
    marginTop: 4,
    marginBottom: 6,
  },
  realEstateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SIZES.lg,
    paddingVertical: 4,
  },
  realEstateText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  pnlText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  diagnosisBtn: {},
  actionLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 21,
    fontWeight: '800',
  },
  diagnosisArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
