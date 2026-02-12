/**
 * 벤치마크 비교 칩 — 내 수익률 vs 시장 지수
 *
 * 역할: "내 포트폴리오가 시장 대비 어떤지" 한눈에 표시
 * 데이터: 내 수익률(props) vs KOSPI/S&P500 수익률(usePrices)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { priceService } from '../../services/PriceService';
import { AssetClass } from '../../types/price';
import { useTheme } from '../../hooks/useTheme';
import type { ThemeColors } from '../../styles/colors';

// -- 벤치마크 지수 --

interface BenchmarkConfig {
  ticker: string;
  label: string;
  assetClass: AssetClass;
}

const BENCHMARKS: BenchmarkConfig[] = [
  { ticker: '^KS11', label: 'KOSPI', assetClass: AssetClass.STOCK },
  { ticker: '^GSPC', label: 'S&P', assetClass: AssetClass.STOCK },
];

// -- Props --

interface BenchmarkChipProps {
  myGainPercent: number; // 내 포트폴리오 수익률 (%)
}

const BenchmarkChip = ({ myGainPercent }: BenchmarkChipProps) => {
  const { colors } = useTheme();

  // 벤치마크 지수 가격 조회 (10분 캐시 — 지수는 빈번히 바뀌지 않아도 됨)
  const { data: benchmarkPrices } = useQuery({
    queryKey: ['benchmark-prices'],
    queryFn: async () => {
      const results: Record<string, number> = {};
      await Promise.allSettled(
        BENCHMARKS.map(async (bm) => {
          try {
            const price = await priceService.fetchPrice(bm.ticker, bm.assetClass, 'KRW');
            if (price.percentChange24h != null) {
              results[bm.label] = price.percentChange24h;
            }
          } catch {}
        })
      );
      return results;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  // 비교 결과
  const comparison = useMemo(() => {
    if (!benchmarkPrices || Object.keys(benchmarkPrices).length === 0) return null;

    // KOSPI 우선, 없으면 S&P
    const bmLabel = benchmarkPrices['KOSPI'] != null ? 'KOSPI' : benchmarkPrices['S&P'] != null ? 'S&P' : null;
    if (!bmLabel) return null;

    const bmReturn = benchmarkPrices[bmLabel];
    const diff = myGainPercent - bmReturn;

    return {
      label: bmLabel,
      bmReturn,
      diff,
      isBeating: diff >= 0,
    };
  }, [benchmarkPrices, myGainPercent]);

  if (!comparison) return null;

  const chipColor = comparison.isBeating
    ? (colors.primaryDark ?? colors.primary)
    : colors.error;

  return (
    <View style={[s.chip, { backgroundColor: `${chipColor}20` }]}>
      <Text style={[s.chipLabel, { color: chipColor }]}>
        vs {comparison.label}
      </Text>
      <Text style={[s.chipValue, { color: chipColor }]}>
        {comparison.isBeating ? '+' : ''}{comparison.diff.toFixed(1)}%p
      </Text>
    </View>
  );
};

// React.memo 최적화: myGainPercent가 같으면 리렌더링 방지
export default React.memo(BenchmarkChip, (prev, next) => {
  // 수익률이 0.01%p 이내로 같으면 리렌더링 방지 (소수점 2자리까지만 표시하므로)
  return Math.abs(prev.myGainPercent - next.myGainPercent) < 0.01;
});

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginLeft: 6,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  chipValue: {
    fontSize: 11,
    fontWeight: '700',
  },
});
