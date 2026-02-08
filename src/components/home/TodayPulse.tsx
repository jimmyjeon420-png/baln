import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../../styles/theme';
import { useHaptics } from '../../hooks/useHaptics';
import { useSharedPortfolio } from '../../hooks/useSharedPortfolio';
import { useSharedMarketData } from '../../hooks/useSharedAnalysis';
import { calculateHealthScore } from '../../services/rebalanceScore';

/**
 * 오늘의 Pulse (한 줄 요약 계기판)
 *
 * 역할: 자동차 계기판처럼 핵심 정보를 한눈에 보여주는 부서
 * - 총 자산 (💰): 회사의 총 매출
 * - 건강 등급 (🏥): 회사의 신용등급
 * - 어제 대비 수익률 (📈/📉): 전일 대비 성장률
 *
 * 터치하면 처방전 탭으로 이동하여 상세 분석 확인
 */

interface TodayPulseProps {
  totalAssets: number;
  yesterdayChange: number; // 어제 대비 변화율 (%)
}

export default function TodayPulse({ totalAssets, yesterdayChange }: TodayPulseProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const { assets } = useSharedPortfolio();

  // 건강 점수 계산
  const healthScore = useMemo(
    () => calculateHealthScore(assets, totalAssets),
    [assets, totalAssets]
  );

  // 자산 포맷팅: 1.2억, 5,000만원 등
  const formatAssets = (value: number): string => {
    if (value >= 100_000_000) {
      return `${(value / 100_000_000).toFixed(1)}억`;
    } else if (value >= 10_000_000) {
      return `${Math.round(value / 10_000_000) * 1000}만원`;
    } else if (value >= 10_000) {
      return `${Math.round(value / 10_000)}만원`;
    }
    return `${Math.round(value).toLocaleString()}원`;
  };

  // 수익률 포맷팅: +0.3%, -1.2%
  const formatChange = (percent: number): string => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  // 수익률 색상
  const changeColor = yesterdayChange >= 0 ? COLORS.primary : COLORS.error;

  // 터치 핸들러: 처방전 탭으로 이동
  const handlePress = () => {
    haptics.lightTap();
    router.push('/(tabs)/rebalance');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* 💰 총 자산 */}
        <View style={styles.section}>
          <Text style={styles.emoji}>💰</Text>
          <Text style={styles.value}>{formatAssets(totalAssets)}</Text>
        </View>

        <View style={styles.divider} />

        {/* 🏥 건강 등급 */}
        <View style={styles.section}>
          <Text style={styles.emoji}>🏥</Text>
          <Text style={[styles.value, { color: healthScore.gradeColor }]}>
            {healthScore.grade}등급
          </Text>
        </View>

        <View style={styles.divider} />

        {/* 📈/📉 어제 대비 */}
        <View style={styles.section}>
          <Text style={styles.emoji}>{yesterdayChange >= 0 ? '📈' : '📉'}</Text>
          <Text style={[styles.value, { color: changeColor }]}>
            {formatChange(yesterdayChange)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rMd,
    marginBottom: SIZES.lg,
    // 그림자 효과 (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // 그림자 효과 (Android)
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: SIZES.md,
    paddingVertical: 12,
    minHeight: 48,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 16,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    opacity: 0.3,
  },
});
