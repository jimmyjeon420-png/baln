/**
 * ReassuranceBanner - 안심 배너 (전 레벨 공통)
 *
 * 버핏: "안심이 제일 먼저" — 모든 레벨 화면 최상단에 표시되는 슬림 배너.
 * 기존 ReassuranceCard(초급 전용 하단 카드)와 별개로, 전 레벨에 공통 적용.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ReassuranceBannerProps {
  totalGainLoss: number;
  cfoWeather: { emoji: string; status: string; message: string } | null;
}

function getDefaultMessage(totalGainLoss: number): { emoji: string; text: string } {
  if (totalGainLoss >= 0) {
    return { emoji: '✨', text: '오늘 자산은 안정적이에요' };
  }
  if (totalGainLoss > -1) {
    return { emoji: '🍃', text: '소폭 변동은 자연스러운 거예요' };
  }
  return { emoji: '🌈', text: '일시적 하락이에요. 장기적으로 봐주세요' };
}

export default function ReassuranceBanner({ totalGainLoss, cfoWeather }: ReassuranceBannerProps) {
  const defaultMsg = getDefaultMessage(totalGainLoss);
  const emoji = cfoWeather?.emoji ?? defaultMsg.emoji;
  const message = cfoWeather?.message ?? defaultMsg.text;

  return (
    <View style={s.banner}>
      <Text style={s.emoji}>{emoji}</Text>
      <Text style={s.message} numberOfLines={1}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.06)',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.08)',
  },
  emoji: {
    fontSize: 18,
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: '#CCCCCC',
    fontWeight: '500',
  },
});
