import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../styles/theme';
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
  const isPositive = totalPnL >= 0;

  return (
    <View style={styles.card}>
      {/* 상단: 총 평가금액 라벨 + 등급 배지 */}
      <View style={styles.topRow}>
        <Text style={styles.label}>총 평가금액</Text>
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
        style={styles.totalValue}
        duration={1000}
      />

      {/* 손익 표시 */}
      <View style={styles.pnlRow}>
        <Text style={[styles.pnlText, { color: isPositive ? COLORS.primary : COLORS.error }]}>
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
          <Ionicons name="home-outline" size={14} color="#FF9800" />
          <Text style={styles.realEstateText}>
            부동산 ₩{totalRealEstate.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} 포함
          </Text>
          {onRealEstatePress && (
            <Ionicons name="add-circle-outline" size={14} color={COLORS.textTertiary} />
          )}
        </TouchableOpacity>
      )}

      {/* 하단 버튼 2개: 건강 점수 | AI 진단 받기 */}
      <View style={styles.actions}>
        <View style={styles.actionBtn}>
          <Text style={styles.actionLabel}>건강 점수</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, { color: healthGradeColor }]}>
              {healthScore}점
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, styles.diagnosisBtn]}
          onPress={onDiagnosisPress}
          activeOpacity={0.7}
        >
          <Text style={styles.actionLabel}>AI 진단 받기</Text>
          <View style={styles.diagnosisArrow}>
            <Ionicons name="analytics-outline" size={20} color={COLORS.primary} />
            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
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
    backgroundColor: COLORS.surface,
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
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
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
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
    flex: 1,
  },
  pnlText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
  },
  diagnosisBtn: {},
  actionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  diagnosisArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
