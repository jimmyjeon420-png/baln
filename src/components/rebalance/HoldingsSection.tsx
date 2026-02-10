/**
 * 보유 자산 섹션 — 접기/펼치기 + 포트폴리오 스냅샷 + 종목 리스트
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [showAssets, setShowAssets] = useState(false);
  const isPositive = (snapshot?.totalGainLoss ?? 0) >= 0;

  return (
    <>
      <TouchableOpacity
        style={s.collapsibleHeader}
        onPress={() => setShowAssets(!showAssets)}
        activeOpacity={0.7}
      >
        <View style={s.collapsibleLeft}>
          <Ionicons name="pie-chart-outline" size={16} color="#4CAF50" />
          <Text style={s.collapsibleTitle}>보유 자산</Text>
          <Text style={s.collapsibleCount}>{portfolio.length}개</Text>
        </View>
        <Ionicons name={showAssets ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
      </TouchableOpacity>

      {showAssets && (
        <View style={s.collapsibleBody}>
          {/* 포트폴리오 스냅샷 */}
          {snapshot && (
            <View style={s.snapshotRow}>
              <View style={s.snapshotItem}>
                <Text style={s.snapshotLabel}>총 손익</Text>
                <Text style={[s.snapshotValue, { color: isPositive ? '#4CAF50' : '#CF6679' }]}>
                  {isPositive ? '+' : ''}₩{Math.floor(Math.abs(snapshot.totalGainLoss ?? 0)).toLocaleString()}
                </Text>
              </View>
              <View style={s.snapshotDivider} />
              <View style={s.snapshotItem}>
                <Text style={s.snapshotLabel}>분산 점수</Text>
                <Text style={s.snapshotValue}>{snapshot.diversificationScore}/100</Text>
              </View>
            </View>
          )}

          {/* 종목 리스트 */}
          {portfolio.map((asset, idx) => {
            const gl = asset.avgPrice > 0 ? ((asset.currentPrice - asset.avgPrice) / asset.avgPrice) * 100 : 0;
            const glPositive = gl >= 0;
            const weight = totalAssets > 0 ? ((asset.currentValue / totalAssets) * 100).toFixed(1) : '0';
            return (
              <View key={idx} style={s.assetItem}>
                <View style={s.assetLeft}>
                  <View style={s.assetIcon}>
                    <Text style={s.assetIconText}>{asset.ticker[0]}</Text>
                  </View>
                  <View>
                    <Text style={s.assetTicker}>{asset.ticker}</Text>
                    <Text style={s.assetName}>{asset.name}</Text>
                  </View>
                </View>
                <View style={s.assetRight}>
                  <Text style={s.assetWeight}>{weight}%</Text>
                  <Text style={[s.assetGain, { color: glPositive ? '#4CAF50' : '#CF6679' }]}>
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

const s = StyleSheet.create({
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#141414',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  collapsibleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collapsibleTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  collapsibleCount: { fontSize: 12, color: '#666' },
  collapsibleBody: {
    marginHorizontal: 16,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    marginTop: -4,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  snapshotRow: { flexDirection: 'row', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  snapshotItem: { flex: 1, alignItems: 'center' },
  snapshotDivider: { width: 1, backgroundColor: '#222' },
  snapshotLabel: { fontSize: 11, color: '#666', marginBottom: 4 },
  snapshotValue: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  assetItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  assetLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  assetIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center' },
  assetIconText: { fontSize: 14, fontWeight: '700', color: '#4CAF50' },
  assetTicker: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  assetName: { fontSize: 11, color: '#666', marginTop: 1 },
  assetRight: { alignItems: 'flex-end' },
  assetWeight: { fontSize: 13, fontWeight: '600', color: '#AAA' },
  assetGain: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
