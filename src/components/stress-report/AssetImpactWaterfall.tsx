/**
 * AssetImpactWaterfall — Beat 3b: 자산별 영향
 *
 * 역할: 상위 3개 자산만 기본 표시, "나머지 N개 보기" 접기/펼치기
 * 각 자산: 티커 배지 + 현재가→예상가 + 민감도 수준
 * LayoutAnimation으로 부드러운 펼침
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import type { WhatIfResult } from '../../types/marketplace';

// Android LayoutAnimation 활성화
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const INITIAL_SHOW = 3;

interface AssetImpactWaterfallProps {
  result: WhatIfResult;
}

export const AssetImpactWaterfall: React.FC<AssetImpactWaterfallProps> = ({
  result,
}) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const impacts = result.assetImpacts ?? [];
  const sorted = [...impacts].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  );

  const visibleAssets = isExpanded ? sorted : sorted.slice(0, INITIAL_SHOW);
  const hiddenCount = sorted.length - INITIAL_SHOW;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return colors.warning;
      case 'MEDIUM':
        return `${colors.warning}B0`;
      default:
        return colors.textTertiary;
    }
  };

  const getImpactLabel = (level: string) => {
    switch (level) {
      case 'HIGH':
        return '높음';
      case 'MEDIUM':
        return '보통';
      default:
        return '낮음';
    }
  };

  if (impacts.length === 0) return null;

  return (
    <View style={[s.container, { backgroundColor: colors.surface }]}>
      <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
        자산별 영향 분석
      </Text>

      <View style={s.assetList}>
        {visibleAssets.map((asset, i) => (
          <View
            key={asset.ticker}
            style={[
              s.assetRow,
              i < visibleAssets.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={s.assetLeft}>
              <View style={[s.tickerBadge, { backgroundColor: `${colors.primary}15` }]}>
                <Text style={[s.tickerText, { color: colors.primary }]}>
                  {asset.ticker}
                </Text>
              </View>
              <View style={s.assetInfo}>
                <Text
                  style={[s.assetName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {asset.name}
                </Text>
                <Text style={[s.assetPrice, { color: colors.textTertiary }]}>
                  ₩{asset.currentValue.toLocaleString()} → ₩
                  {asset.projectedValue.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={s.assetRight}>
              <Text style={[s.changePercent, { color: getImpactColor(asset.impactLevel) }]}>
                {asset.changePercent > 0 ? '+' : ''}
                {asset.changePercent.toFixed(1)}%
              </Text>
              <View style={[s.levelBadge, { backgroundColor: `${getImpactColor(asset.impactLevel)}15` }]}>
                <Text style={[s.levelText, { color: getImpactColor(asset.impactLevel) }]}>
                  {getImpactLabel(asset.impactLevel)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {hiddenCount > 0 && (
        <TouchableOpacity
          onPress={toggleExpand}
          style={s.expandButton}
          activeOpacity={0.7}
        >
          <Text style={[s.expandText, { color: colors.primary }]}>
            {isExpanded
              ? '접기'
              : `나머지 ${hiddenCount}개 보기`}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  assetList: {
    gap: 0,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  tickerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tickerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  assetPrice: {
    fontSize: 13,
  },
  assetRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  changePercent: {
    fontSize: 17,
    fontWeight: '700',
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    marginTop: 4,
  },
  expandText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
