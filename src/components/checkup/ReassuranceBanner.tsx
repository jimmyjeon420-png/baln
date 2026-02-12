/**
 * ReassuranceBanner - 안심 배너 (전 레벨 공통)
 *
 * 버핏: "안심이 제일 먼저" — 모든 레벨 화면 최상단에 표시되는 슬림 배너.
 * 기존 ReassuranceCard(초급 전용 하단 카드)와 별개로, 전 레벨에 공통 적용.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { ThemeColors } from '../../styles/colors';

interface ReassuranceBannerProps {
  totalGainLoss: number;
  cfoWeather: { emoji: string; status: string; message: string } | null;
}

function getDefaultMessage(totalGainLoss: number): { emoji: string; text: string } {
  if (totalGainLoss >= 0) {
    return { emoji: '✨', text: '오늘 자산은 안정적이에요' };
  }
  if (totalGainLoss > -3) {
    // 소폭 하락 (-3% 미만): 기존 안심 톤 유지
    return { emoji: '🍃', text: '소폭 변동은 자연스러운 거예요' };
  }
  if (totalGainLoss > -10) {
    // 중간 하락 (-3% ~ -10%): 차분한 안내 톤
    return { emoji: '📊', text: '단기 변동은 자연스럽습니다. 맥락을 살펴보세요.' };
  }
  // 큰 하락 (-10% 이상): 공감 + 맥락 확인 유도 톤
  return { emoji: '🔍', text: '큰 변동이 있었습니다. 맥락을 확인해보세요.' };
}

export default function ReassuranceBanner({ totalGainLoss, cfoWeather }: ReassuranceBannerProps) {
  const { colors } = useTheme();
  const defaultMsg = getDefaultMessage(totalGainLoss);
  const emoji = cfoWeather?.emoji ?? defaultMsg.emoji;
  const message = cfoWeather?.message ?? defaultMsg.text;

  const styles = createStyles(colors);

  return (
    <View
      style={styles.banner}
      accessibilityLabel={`안심 배너: ${message}`}
      accessibilityRole="text"
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
    minHeight: 44,
    borderWidth: 1,
    borderColor: `${colors.primary}15`,
  },
  emoji: {
    fontSize: 18,
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '500',
  },
});
