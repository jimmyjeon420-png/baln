/**
 * 처방전 히어로 섹션 — 총자산 + 투자원금 대비 수익 + CFO 한줄 코멘트
 *
 * [주 지표] 투자원금(평단가×수량) 대비 평가 손익 — 펀드매니저 기준
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CfoWeather } from '../../types/rebalanceTypes';
import BenchmarkChip from './BenchmarkChip';

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
}

export default function HeroSection({
  dateString,
  tierLabel,
  tierColor,
  totalAssets,
  totalGainLoss,
  gainPercent,
  cfoWeather,
}: HeroSectionProps) {
  const isPositive = totalGainLoss >= 0;

  return (
    <View style={s.hero}>
      <View style={s.heroTop}>
        <Text style={s.heroDate}>{dateString}</Text>
        <View style={[s.tierChip, { backgroundColor: tierColor + '20' }]}>
          <Text style={[s.tierChipText, { color: tierColor }]}>{tierLabel}</Text>
        </View>
      </View>

      <Text style={s.heroAmount}>₩{Math.floor(totalAssets).toLocaleString()}</Text>

      {/* 주 지표: 투자원금 대비 수익 */}
      <View style={s.heroChangeRow}>
        <View style={[s.heroChangeBadge, { backgroundColor: isPositive ? 'rgba(76,175,80,0.12)' : 'rgba(207,102,121,0.12)' }]}>
          <Ionicons
            name={isPositive ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={isPositive ? '#4CAF50' : '#CF6679'}
          />
          <Text style={[s.heroChangeText, { color: isPositive ? '#4CAF50' : '#CF6679' }]}>
            {isPositive ? '+' : ''}₩{Math.floor(Math.abs(totalGainLoss)).toLocaleString()}
          </Text>
          <Text style={[s.heroChangePercent, { color: isPositive ? '#4CAF50' : '#CF6679' }]}>
            ({isPositive ? '+' : ''}{gainPercent.toFixed(1)}%)
          </Text>
        </View>
        {/* 벤치마크 비교 칩 (KOSPI/S&P500 대비) */}
        <BenchmarkChip myGainPercent={gainPercent} />
      </View>

      {/* CFO 한줄 코멘트 */}
      {cfoWeather && (
        <View style={s.cfoLine}>
          <Text style={s.cfoEmoji}>{cfoWeather.emoji}</Text>
          <Text style={s.cfoMessage} numberOfLines={2}>{cfoWeather.message}</Text>
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
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tierChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tierChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
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
    fontSize: 14,
    fontWeight: '700',
  },
  heroChangePercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  cfoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76,175,80,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.08)',
  },
  cfoEmoji: {
    fontSize: 20,
    marginTop: -2,
  },
  cfoMessage: {
    flex: 1,
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 20,
    fontWeight: '500',
  },
});
