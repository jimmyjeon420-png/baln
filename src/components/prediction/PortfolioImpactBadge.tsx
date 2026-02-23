/**
 * PortfolioImpactBadge — 포트폴리오 영향 배지 컴포넌트
 *
 * 역할: "이 예측이 내 자산에 어떤 영향인지" 보여주는 부서
 * - 내 포트폴리오 티커와 관련 종목 교차 매칭
 * - 방향별 색상 (상승=초록, 하락=빨강, 중립=회색)
 * - 예상 변동 금액 계산 및 표시
 * - 매칭 없으면 "직접 관련 없음" 표시
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useNewsPortfolioMatch } from '../../hooks/useNewsPortfolioMatch';
import { useSharedPortfolio } from '../../hooks/useSharedPortfolio';
import type { ImpactDetail } from '../../hooks/usePredictionFeed';

// ============================================================================
// Props
// ============================================================================

interface PortfolioImpactBadgeProps {
  relatedTickers: string[];
  impactAnalysis: Record<string, ImpactDetail> | null;
}

// ============================================================================
// 헬퍼: magnitude 문자열에서 중간값(midpoint) 파싱
// "+8~12%" → 0.10, "-5~8%" → -0.065, "+5%" → 0.05
// ============================================================================

function parseMagnitudeMidpoint(magnitude: string): number {
  if (!magnitude) return 0;
  const clean = magnitude.replace(/[%\s]/g, '');
  const rangeMatch = clean.match(/([+-]?\d+(?:\.\d+)?)~(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    const sign = low < 0 ? -1 : 1;
    return (Math.abs(low) + Math.abs(high)) / 2 / 100 * sign;
  }
  const singleMatch = clean.match(/([+-]?\d+(?:\.\d+)?)/);
  if (singleMatch) {
    return parseFloat(singleMatch[1]) / 100;
  }
  return 0;
}

// ============================================================================
// 방향별 설정
// ============================================================================

function getDirectionConfig(direction: 'up' | 'down' | 'neutral') {
  if (direction === 'up') return { color: '#4CAF50', icon: 'trending-up' as const };
  if (direction === 'down') return { color: '#F44336', icon: 'trending-down' as const };
  return { color: '#9E9E9E', icon: 'remove-outline' as const };
}

// ============================================================================
// 금액 포맷 (KRW)
// ============================================================================

function formatKRW(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount >= 0 ? '+' : '-';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억원`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000)}만원`;
  return `${sign}${Math.round(abs).toLocaleString()}원`;
}

// ============================================================================
// 컴포넌트
// ============================================================================

export default function PortfolioImpactBadge({
  relatedTickers,
  impactAnalysis,
}: PortfolioImpactBadgeProps) {
  const { colors } = useTheme();
  const { matchedAssets, hasMatch } = useNewsPortfolioMatch(relatedTickers);
  const { liquidTotal } = useSharedPortfolio();

  // 예상 총 변동 금액 계산
  const estimatedChange = useMemo(() => {
    if (!hasMatch || !impactAnalysis || liquidTotal <= 0) return 0;
    return matchedAssets.reduce((sum, asset) => {
      const rawTicker = asset.ticker.replace(/\.KS$/i, '').toUpperCase();
      const impact = impactAnalysis[rawTicker] || impactAnalysis[asset.ticker];
      if (!impact) return sum;
      const midpoint = parseMagnitudeMidpoint(impact.magnitude);
      const assetValue = (asset.weight / 100) * liquidTotal;
      return sum + assetValue * midpoint;
    }, 0);
  }, [matchedAssets, impactAnalysis, liquidTotal, hasMatch]);

  // 매칭 없으면 간단 메시지
  if (!hasMatch) {
    return (
      <View style={[styles.noMatchContainer, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name="wallet-outline" size={13} color={colors.textTertiary} />
        <Text style={[styles.noMatchText, { color: colors.textTertiary }]}>
          내 보유 자산과 직접 관련 없음
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceLight }]}>
      {/* 섹션 타이틀 */}
      <View style={styles.titleRow}>
        <Ionicons name="wallet-outline" size={13} color={colors.textSecondary} />
        <Text style={[styles.title, { color: colors.textSecondary }]}>내 포트폴리오 영향</Text>
      </View>

      {/* 관련 종목 칩 + 이유 */}
      {matchedAssets.slice(0, 3).map((asset) => {
        const rawTicker = asset.ticker.replace(/\.KS$/i, '').toUpperCase();
        const impact = impactAnalysis
          ? (impactAnalysis[rawTicker] || impactAnalysis[asset.ticker])
          : null;
        const config = impact
          ? getDirectionConfig(impact.direction)
          : { color: '#9E9E9E', icon: 'remove-outline' as const };
        const magnitudeLabel = impact ? impact.magnitude : '';
        const reason = impact?.reason_ko || '';

        return (
          <View key={asset.ticker} style={styles.impactItem}>
            <View style={styles.impactTopRow}>
              <View style={[styles.tickerChip, { backgroundColor: config.color + '20' }]}>
                <Text style={[styles.tickerText, { color: config.color }]}>
                  {rawTicker}
                </Text>
                {magnitudeLabel.length > 0 && (
                  <Text style={[styles.magnitudeText, { color: config.color }]}>
                    {' '}{magnitudeLabel}
                  </Text>
                )}
                <Ionicons name={config.icon} size={12} color={config.color} />
              </View>
            </View>
            {reason.length > 0 && (
              <Text style={[styles.reasonText, { color: colors.textTertiary }]}>
                {reason}
              </Text>
            )}
          </View>
        );
      })}

      {/* 예상 변동 금액 (유의미한 경우만) */}
      {Math.abs(estimatedChange) >= 1000 && (
        <Text style={[
          styles.estimatedChange,
          { color: estimatedChange >= 0 ? '#4CAF50' : '#F44336' },
        ]}>
          예상 변동: {formatKRW(estimatedChange)}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  noMatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noMatchText: {
    fontSize: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
  },
  impactItem: {
    gap: 3,
  },
  impactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonText: {
    fontSize: 11,
    lineHeight: 15,
    paddingLeft: 4,
  },
  tickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  tickerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  magnitudeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  estimatedChange: {
    fontSize: 12,
    fontWeight: '700',
  },
});
