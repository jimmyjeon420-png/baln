/**
 * ReassuranceCard - 안심 한마디 카드
 *
 * 초보자에게 불안감을 줄이기 위한 안심 메시지.
 * CFO 날씨 정보와 일일 손익에 따라 적절한 메시지를 표시.
 * "안심을 판다, 불안을 팔지 않는다" 원칙 준수.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';

interface CfoWeather {
  emoji: string;
  status: string;
  message: string;
}

interface ReassuranceCardProps {
  totalGainLoss: number;
  cfoWeather: CfoWeather | null;
}

function getDailyMessage(totalGainLoss: number): { text: string; emoji: string } {
  if (totalGainLoss >= 0) {
    return { text: '오늘 자산은 안정적이에요', emoji: '\u2728' };
  }
  if (totalGainLoss > -1) {
    return { text: '소폭 변동은 자연스러운 거예요', emoji: '\uD83C\uDF43' };
  }
  return { text: '일시적 하락이에요. 장기적으로 봐주세요', emoji: '\uD83C\uDF08' };
}

export default function ReassuranceCard({ totalGainLoss, cfoWeather }: ReassuranceCardProps) {
  const { colors, shadows } = useTheme();
  const daily = getDailyMessage(totalGainLoss);

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, ...shadows.md }]}>
      <Text style={[s.cardTitle, { color: colors.text }]}>
        {'\uD83D\uDCAC 안심 한마디'}
      </Text>

      {cfoWeather && (
        <View style={[s.weatherRow, { backgroundColor: colors.surface }]}>
          <Text style={s.weatherEmoji}>{cfoWeather.emoji}</Text>
          <Text style={[s.weatherMessage, { color: colors.text }]}>{cfoWeather.message}</Text>
        </View>
      )}

      <View style={s.dailyRow}>
        <Text style={s.dailyEmoji}>{daily.emoji}</Text>
        <Text style={[s.dailyText, { color: colors.textSecondary }]}>{daily.text}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    // backgroundColor: '#141414', // Now dynamic via colors.card
    borderRadius: 16,
    borderWidth: 1,
    // borderColor: '#1B3A2A', // Now dynamic via colors.border
    padding: 24,
    marginHorizontal: 16,
    marginTop: 12,
    // shadows added dynamically
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    // color: '#FFFFFF', // Now dynamic via colors.text
    marginBottom: 16,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
    // backgroundColor: '#1A2A1F', // Now dynamic via colors.surface
    padding: 14,
    borderRadius: 12,
  },
  weatherEmoji: {
    fontSize: 24,
  },
  weatherMessage: {
    flex: 1,
    fontSize: 16,
    // color: '#FFFFFF', // Now dynamic via colors.text
    lineHeight: 24,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyEmoji: {
    fontSize: 18,
  },
  dailyText: {
    fontSize: 16,
    // color: '#B0B0B0', // Now dynamic via colors.textSecondary
    lineHeight: 22,
  },
});
