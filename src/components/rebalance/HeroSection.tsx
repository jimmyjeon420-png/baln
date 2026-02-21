/**
 * 처방전 히어로 섹션 — 총자산 + 투자원금 대비 수익 + 투자 날씨 한줄 코멘트
 *
 * [주 지표] 투자원금(평단가×수량) 대비 평가 손익 — 펀드매니저 기준
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CfoWeather } from '../../types/rebalanceTypes';
import BenchmarkChip from './BenchmarkChip';
import { useTheme } from '../../hooks/useTheme';

interface HeroSectionProps {
  dateString: string;
  tierLabel: string;
  tierColor: string;
  totalAssets: number;
  /** 투자원금 대비 총 손익 (현재 평가금액 - 투자원금) */
  totalGainLoss: number;
  /** 투자원금 대비 수익률 (%) */
  gainPercent: number;
  cfoWeather?: CfoWeather | null;
  holdingLabel?: string;
}

export default function HeroSection({
  dateString,
  tierLabel,
  tierColor,
  totalAssets,
  totalGainLoss,
  gainPercent,
  cfoWeather,
  holdingLabel,
}: HeroSectionProps) {
  const { colors } = useTheme();
  const isPositive = totalGainLoss >= 0;
  const changeColor = isPositive ? colors.success : colors.error;

  return (
    <View style={s.hero}>
      <View style={s.heroTop}>
        <Text style={[s.heroDate, { color: colors.textTertiary }]}>{dateString}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={[s.tierChip, { backgroundColor: tierColor + '20' }]}>
            <Text style={[s.tierChipText, { color: tierColor }]}>{tierLabel}</Text>
          </View>
          {holdingLabel && (
            <View style={[s.tierChip, { backgroundColor: colors.premium.purple + '33' }]}>
              <Text style={[s.tierChipText, { color: colors.premium.purple }]}>{holdingLabel}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[s.heroAmount, { color: colors.textPrimary }]}>₩{Math.floor(totalAssets).toLocaleString()}</Text>

      {/* 주 지표: 투자원금 대비 수익 */}
      <View style={s.heroChangeRow}>
        <View style={[s.heroChangeBadge, { backgroundColor: changeColor + '1F' }]}>
          <Ionicons
            name={isPositive ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={changeColor}
          />
          <Text style={[s.heroChangeText, { color: changeColor }]}>
            {isPositive ? '+' : ''}₩{Math.floor(Math.abs(totalGainLoss)).toLocaleString()}
          </Text>
          <Text style={[s.heroChangePercent, { color: changeColor }]}>
            ({isPositive ? '+' : ''}{gainPercent.toFixed(1)}%)
          </Text>
        </View>
        {/* 벤치마크 비교 칩 (KOSPI/S&P500 대비) */}
        <BenchmarkChip myGainPercent={gainPercent} />
      </View>

      {/* 투자 날씨 한줄 코멘트 */}
      {cfoWeather && (
        <View style={[s.cfoLine, { backgroundColor: colors.success + '0F', borderColor: colors.success + '14' }]}>
          <Text style={s.cfoEmoji}>{cfoWeather.emoji}</Text>
          <Text style={[s.cfoMessage, { color: colors.textSecondary }]}>{cfoWeather.message}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroDate: {
    fontSize: 16,
    fontWeight: '500',
  },
  tierChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tierChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 6,
  },
  heroChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  heroChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  heroChangeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  heroChangePercent: {
    fontSize: 15,
    fontWeight: '500',
  },
  cfoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  cfoEmoji: {
    fontSize: 21,
    marginTop: -2,
  },
  cfoMessage: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
