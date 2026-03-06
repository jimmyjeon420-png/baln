/**
 * ReassuranceCard - 안심 한마디 카드
 *
 * 초보자에게 불안감을 줄이기 위한 안심 메시지.
 * 투자 날씨 정보와 일일 손익에 따라 적절한 메시지를 표시.
 * "안심을 판다, 불안을 팔지 않는다" 원칙 준수.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useLocale } from '../../../context/LocaleContext';
import type { ThemeColors } from '../../../styles/colors';

interface CfoWeather {
  emoji: string;
  status: string;
  message: string;
}

interface ReassuranceCardProps {
  totalGainLoss: number;
  cfoWeather: CfoWeather | null;
}

function getDailyMessage(totalGainLoss: number, t: (key: string) => string): { text: string; emoji: string } {
  if (totalGainLoss >= 0) {
    return { text: t('checkup.reassuranceCard.stable'), emoji: '\u2728' };
  }
  if (totalGainLoss > -1) {
    return { text: t('checkup.reassuranceCard.minor_dip'), emoji: '\uD83C\uDF43' };
  }
  return { text: t('checkup.reassuranceCard.major_dip'), emoji: '\uD83C\uDF08' };
}

export default function ReassuranceCard({ totalGainLoss, cfoWeather }: ReassuranceCardProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const daily = getDailyMessage(totalGainLoss, t);

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {'\uD83D\uDCAC ' + t('checkup.reassuranceCard.title')}
      </Text>

      {cfoWeather && (
        <View style={styles.weatherRow}>
          <Text style={styles.weatherEmoji}>{cfoWeather.emoji}</Text>
          <Text style={styles.weatherMessage}>{cfoWeather.message}</Text>
        </View>
      )}

      <View style={styles.dailyRow}>
        <Text style={styles.dailyEmoji}>{daily.emoji}</Text>
        <Text style={styles.dailyText}>{daily.text}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
    backgroundColor: colors.surfaceElevated,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weatherEmoji: {
    fontSize: 25,
  },
  weatherMessage: {
    flex: 1,
    fontSize: 17,
    color: colors.textPrimary,
    lineHeight: 25,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyEmoji: {
    fontSize: 19,
  },
  dailyText: {
    fontSize: 17,
    color: colors.textSecondary,
    lineHeight: 23,
  },
});
