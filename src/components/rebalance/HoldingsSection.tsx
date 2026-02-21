/**
 * 유동자산 (주식·ETF·크립토) 섹션 — 접기/펼치기 + 포트폴리오 스냅샷 + 종목 리스트
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../styles/colors';
import type { RebalancePortfolioAsset } from '../../types/rebalanceTypes';

interface PortfolioSnapshot {
  totalGainLoss: number;
  gainLossPercent: number;
  diversificationScore: number;
}

interface HoldingsSectionProps {
  portfolio: RebalancePortfolioAsset[];
  totalAssets: number;
  snapshot?: PortfolioSnapshot | null;
}

export default function HoldingsSection({
  portfolio,
  totalAssets,
  snapshot,
}: HoldingsSectionProps) {
  const { colors } = useTheme();
  const [showAssets, setShowAssets] = useState(false);
  const isPositive = (snapshot?.totalGainLoss ?? 0) >= 0;

  const styles = createStyles(colors);

  return (
    <>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => setShowAssets(!showAssets)}
        activeOpacity={0.7}
      >
        <View style={styles.collapsibleLeft}>
          <Ionicons name="pie-chart-outline" size={16} color={colors.primary} />
          <Text style={[styles.collapsibleTitle, { color: colors.textPrimary }]}>유동자산 (주식·ETF·크립토)</Text>
          <Text style={[styles.collapsibleCount, { color: colors.textTertiary }]}>{portfolio.length}개</Text>
        </View>
        <Ionicons name={showAssets ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
      </TouchableOpacity>

      {showAssets && (
        <View style={styles.collapsibleBody}>
          {/* 포트폴리오 스냅샷 */}
          {snapshot && (
            <View style={[styles.snapshotRow, { borderBottomColor: colors.border }]}>
              <View style={styles.snapshotItem}>
                <Text style={[styles.snapshotLabel, { color: colors.textTertiary }]}>총 손익</Text>
                <Text style={[styles.snapshotValue, { color: isPositive ? colors.buy : colors.sell }]}>
                  {isPositive ? '+' : ''}₩{Math.floor(Math.abs(snapshot.totalGainLoss ?? 0)).toLocaleString()}
                </Text>
              </View>
              <View style={[styles.snapshotDivider, { backgroundColor: colors.border }]} />
              <View style={styles.snapshotItem}>
                <Text style={[styles.snapshotLabel, { color: colors.textTertiary }]}>분산 점수</Text>
                <Text style={[styles.snapshotValue, { color: colors.textPrimary }]}>{snapshot.diversificationScore}/100</Text>
              </View>
            </View>
          )}

          {/* 종목 리스트 */}
          {portfolio.map((asset, idx) => {
            const gl = asset.avgPrice > 0 ? ((asset.currentPrice - asset.avgPrice) / asset.avgPrice) * 100 : 0;
            const glPositive = gl >= 0;
            const weight = totalAssets > 0 ? ((asset.currentValue / totalAssets) * 100).toFixed(1) : '0';
            return (
              <View key={idx} style={[styles.assetItem, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.assetLeft}>
                  <View style={[styles.assetIcon, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.assetIconText, { color: colors.primaryDark ?? colors.primary }]}>{asset.ticker[0]}</Text>
                  </View>
                  <View>
                    <Text style={[styles.assetTicker, { color: colors.textPrimary }]}>{asset.ticker}</Text>
                    <Text style={[styles.assetName, { color: colors.textTertiary }]}>{asset.name}</Text>
                  </View>
                </View>
                <View style={styles.assetRight}>
                  <Text style={[styles.assetWeight, { color: colors.textSecondary }]}>{weight}%</Text>
                  <Text style={[styles.assetGain, { color: glPositive ? colors.buy : colors.sell }]}>
                    {glPositive ? '+' : ''}{gl.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  collapsibleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collapsibleTitle: { fontSize: 15, fontWeight: '600' },
  collapsibleCount: { fontSize: 13 },
  collapsibleBody: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    marginTop: -4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  snapshotRow: { flexDirection: 'row', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1 },
  snapshotItem: { flex: 1, alignItems: 'center' },
  snapshotDivider: { width: 1 },
  snapshotLabel: { fontSize: 12, marginBottom: 4 },
  snapshotValue: { fontSize: 16, fontWeight: '700' },
  assetItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  assetLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  assetIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  assetIconText: { fontSize: 15, fontWeight: '700' },
  assetTicker: { fontSize: 14, fontWeight: '600' },
  assetName: { fontSize: 12, marginTop: 1 },
  assetRight: { alignItems: 'flex-end' },
  assetWeight: { fontSize: 14, fontWeight: '600' },
  assetGain: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
