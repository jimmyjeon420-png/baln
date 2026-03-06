/**
 * ReassuranceBanner - 안심 배너 (전 레벨 공통)
 *
 * 버핏: "안심이 제일 먼저" — 모든 레벨 화면 최상단에 표시되는 슬림 배너.
 * 기존 ReassuranceCard(초급 전용 하단 카드)와 별개로, 전 레벨에 공통 적용.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import type { ThemeColors } from '../../styles/colors';

interface ReassuranceBannerProps {
  totalGainLoss: number;
  cfoWeather: { emoji: string; status: string; message: string } | null;
}

function getDefaultMessage(totalGainLoss: number, t: (key: string) => string): { emoji: string; text: string } {
  if (totalGainLoss >= 0) {
    return { emoji: '✨', text: t('checkup.reassurance.stable') };
  }
  if (totalGainLoss > -3) {
    return { emoji: '🍃', text: t('checkup.reassurance.minor_dip') };
  }
  if (totalGainLoss > -10) {
    return { emoji: '📊', text: t('checkup.reassurance.moderate_dip') };
  }
  return { emoji: '🔍', text: t('checkup.reassurance.major_dip') };
}

export default function ReassuranceBanner({ totalGainLoss, cfoWeather }: ReassuranceBannerProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const defaultMsg = getDefaultMessage(totalGainLoss, t);
  const emoji = cfoWeather?.emoji ?? defaultMsg.emoji;
  const message = cfoWeather?.message ?? defaultMsg.text;

  const styles = createStyles(colors);

  return (
    <View
      style={styles.banner}
      accessibilityLabel={t('checkup.reassurance.banner_a11y', { message })}
      accessibilityRole="text"
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.primary}10`, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 10, minHeight: 44, borderWidth: 1, borderColor: `${colors.primary}15` },
  emoji: { fontSize: 19 },
  message: { flex: 1, fontSize: 14, color: colors.textTertiary, fontWeight: '500' },
});
