import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SIZES } from '../../styles/theme';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useSharedPortfolio } from '../../hooks/useSharedPortfolio';
import { useSharedMarketData } from '../../hooks/useSharedAnalysis';
import { calculateHealthScore } from '../../services/rebalanceScore';
import { formatLocalAmount } from '../../utils/formatters';
import { useLocale } from '../../context/LocaleContext';

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
  const { t } = useLocale();
  const { colors, shadows } = useTheme();
  const { assets } = useSharedPortfolio();

  // 건강 점수 계산
  const healthScore = useMemo(
    () => calculateHealthScore(assets, totalAssets),
    [assets, totalAssets]
  );

  // 자산 포맷팅: 1.2억, 5,000만원 등
  const formatAssets = (value: number): string => {
    if (value >= 100_000_000) {
      return t('format.amount_eok', { n: (value / 100_000_000).toFixed(1) });
    } else if (value >= 10_000_000) {
      return t('format.amount_manwon', { n: Math.round(value / 10_000_000) * 1000 });
    } else if (value >= 10_000) {
      return t('format.amount_manwon', { n: Math.round(value / 10_000) });
    }
    return formatLocalAmount(Math.round(value));
  };

  // 수익률 포맷팅: +0.3%, -1.2%
  const formatChange = (percent: number): string => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  // 수익률 색상
  const changeColor = yesterdayChange >= 0 ? colors.primary : colors.error;

  // 터치 핸들러: 처방전 탭으로 이동
  const handlePress = () => {
    haptics.lightTap();
    router.push('/(tabs)/rebalance');
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }, shadows.sm]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* 💰 총 자산 */}
        <View style={styles.section}>
          <Text style={styles.emoji}>💰</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatAssets(totalAssets)}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* 🏥 건강 등급 */}
        <View style={styles.section}>
          <Text style={styles.emoji}>🏥</Text>
          <Text style={[styles.value, { color: healthScore.gradeColor }]}>
            {t('format.grade_label', { grade: healthScore.grade })}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
    borderRadius: SIZES.rMd,
    marginBottom: SIZES.lg,
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
    fontSize: 17,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 20,
    opacity: 0.3,
  },
});
