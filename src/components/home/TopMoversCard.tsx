import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../styles/theme';

// ============================================================================
// 타입 정의
// ============================================================================

export interface MoverItem {
  ticker: string;
  name: string;
  gainLossPercent: number;
  currentValue: number;
}

interface TopMoversCardProps {
  gainers: MoverItem[];
  losers: MoverItem[];
}

// ============================================================================
// TopMoversCard — 등락률 Top/Bottom 3 (주식 시황판 역할)
// ============================================================================

const TopMoversCard = ({ gainers, losers }: TopMoversCardProps) => {
  // 데이터 부족 시 렌더링 안 함
  if (gainers.length + losers.length < 2) return null;

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <Text style={styles.title}>등락률 Top</Text>
      <Text style={styles.subtitle}>Top Movers</Text>

      {/* 2열 레이아웃 */}
      <View style={styles.columns}>
        {/* 왼쪽: 상승 */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>상승 ▲</Text>
          {gainers.map((item) => (
            <View key={item.ticker} style={styles.moverRow}>
              <View style={styles.tickerIcon}>
                <Text style={styles.tickerIconText}>
                  {item.ticker[0]}
                </Text>
              </View>
              <View style={styles.moverInfo}>
                <Text style={styles.moverName} numberOfLines={1}>
                  {item.name || item.ticker}
                </Text>
                <Text style={[styles.moverPercent, { color: COLORS.primary }]}>
                  +{item.gainLossPercent.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
          {gainers.length === 0 && (
            <Text style={styles.emptyText}>-</Text>
          )}
        </View>

        {/* 오른쪽: 하락 */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>하락 ▼</Text>
          {losers.map((item) => (
            <View key={item.ticker} style={styles.moverRow}>
              <View style={styles.tickerIcon}>
                <Text style={styles.tickerIconText}>
                  {item.ticker[0]}
                </Text>
              </View>
              <View style={styles.moverInfo}>
                <Text style={styles.moverName} numberOfLines={1}>
                  {item.name || item.ticker}
                </Text>
                <Text style={[styles.moverPercent, { color: COLORS.error }]}>
                  {item.gainLossPercent.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
          {losers.length === 0 && (
            <Text style={styles.emptyText}>-</Text>
          )}
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// React.memo 최적화: gainers와 losers 배열 비교
// ============================================================================

export default React.memo(TopMoversCard, (prev, next) => {
  // gainers와 losers 배열의 길이와 각 항목 비교
  if (prev.gainers.length !== next.gainers.length) return false;
  if (prev.losers.length !== next.losers.length) return false;

  const gainersEqual = prev.gainers.every((item, i) => {
    const nextItem = next.gainers[i];
    return (
      item.ticker === nextItem.ticker &&
      item.gainLossPercent === nextItem.gainLossPercent &&
      item.currentValue === nextItem.currentValue
    );
  });

  const losersEqual = prev.losers.every((item, i) => {
    const nextItem = next.losers[i];
    return (
      item.ticker === nextItem.ticker &&
      item.gainLossPercent === nextItem.gainLossPercent &&
      item.currentValue === nextItem.currentValue
    );
  });

  return gainersEqual && losersEqual;
});

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rXl,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
    marginBottom: 14,
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  columnHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  moverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  tickerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickerIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  moverInfo: {
    flex: 1,
  },
  moverName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  moverPercent: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
