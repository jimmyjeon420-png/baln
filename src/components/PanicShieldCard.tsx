/**
 * Panic Shield Card - 포트폴리오 안정성 게이지
 * 행동재무학 기반 공포 지수 시각화
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

interface StopLossGuideline {
  ticker: string;
  name: string;
  suggestedStopLoss: number;
  currentLoss: number;
  action: 'HOLD' | 'WATCH' | 'CONSIDER_SELL';
}

interface PanicShieldCardProps {
  index: number; // 0-100 (높을수록 안전)
  level: 'SAFE' | 'CAUTION' | 'DANGER';
  stopLossGuidelines: StopLossGuideline[];
}

export default function PanicShieldCard({
  index,
  level,
  stopLossGuidelines,
}: PanicShieldCardProps) {
  // 레벨별 색상 및 메시지
  const levelConfig = {
    SAFE: {
      color: '#4CAF50',
      bgColor: '#1A2E1A',
      label: '안전',
      message: '포트폴리오가 안정적입니다',
      icon: 'shield-checkmark' as const,
    },
    CAUTION: {
      color: '#FFC107',
      bgColor: '#2E2A1A',
      label: '주의',
      message: '일부 자산 모니터링 필요',
      icon: 'alert-circle' as const,
    },
    DANGER: {
      color: '#CF6679',
      bgColor: '#2E1A1A',
      label: '위험',
      message: '포트폴리오 점검이 필요합니다',
      icon: 'warning' as const,
    },
  };

  const config = levelConfig[level];

  // 원형 게이지 설정
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (index / 100) * circumference;

  // 손절 가이드라인에서 주의/위험 항목만 필터링
  const alertItems = stopLossGuidelines.filter(
    (item) => item.action !== 'HOLD'
  );

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield" size={24} color={config.color} />
          <Text style={styles.title}>Panic Shield</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: config.color }]}>
          <Text style={styles.levelText}>{config.label}</Text>
        </View>
      </View>

      {/* 원형 게이지 */}
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* 배경 원 */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#333333"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* 진행 원 */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={config.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${progress} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        {/* 중앙 텍스트 */}
        <View style={styles.gaugeCenter}>
          <Text style={[styles.indexNumber, { color: config.color }]}>
            {index}
          </Text>
          <Text style={styles.indexLabel}>/ 100</Text>
        </View>
      </View>

      {/* 상태 메시지 */}
      <View style={styles.statusContainer}>
        <Ionicons name={config.icon} size={20} color={config.color} />
        <Text style={[styles.statusMessage, { color: config.color }]}>
          {config.message}
        </Text>
      </View>

      {/* 손절 가이드라인 */}
      {alertItems.length > 0 && (
        <View style={styles.guidelinesContainer}>
          <Text style={styles.guidelinesTitle}>📉 손절 가이드라인</Text>
          {alertItems.slice(0, 3).map((item, idx) => (
            <View key={idx} style={styles.guidelineItem}>
              <View style={styles.guidelineLeft}>
                <Text style={styles.guidelineTicker}>{item.ticker}</Text>
                <Text style={styles.guidelineName}>{item.name}</Text>
              </View>
              <View style={styles.guidelineRight}>
                <Text
                  style={[
                    styles.guidelineLoss,
                    { color: item.currentLoss < 0 ? '#CF6679' : '#4CAF50' },
                  ]}
                >
                  {item.currentLoss >= 0 ? '+' : ''}{item.currentLoss.toFixed(1)}%
                </Text>
                <View
                  style={[
                    styles.actionBadge,
                    {
                      backgroundColor:
                        item.action === 'CONSIDER_SELL' ? '#CF6679' : '#FFC107',
                    },
                  ]}
                >
                  <Text style={styles.actionText}>
                    {item.action === 'WATCH' ? '주시' : '검토'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  indexNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  indexLabel: {
    fontSize: 14,
    color: '#888888',
    marginTop: -4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  statusMessage: {
    fontSize: 14,
    fontWeight: '500',
  },
  guidelinesContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAAAAA',
    marginBottom: 12,
  },
  guidelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  guidelineLeft: {
    flex: 1,
  },
  guidelineTicker: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  guidelineName: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  guidelineRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidelineLoss: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
  },
});
