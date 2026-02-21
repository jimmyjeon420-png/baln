/**
 * SentimentBadge - 맥락 카드 심리 상태 뱃지
 *
 * 역할: calm(안정)/caution(주의)/alert(경계) 시각화
 * 비유: 신호등처럼 현재 시장 분위기를 한눈에 보여주는 표시
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ContextCardSentiment } from '../../types/contextCard';
import { SENTIMENT_COLORS, SENTIMENT_ICONS, SENTIMENT_LABELS } from '../../types/contextCard';

interface SentimentBadgeProps {
  /** 시장 심리 상태 */
  sentiment: ContextCardSentiment;
  /** 크기 (기본: medium) */
  size?: 'small' | 'medium' | 'large';
}

/**
 * 심리 상태 뱃지 컴포넌트
 *
 * @example
 * ```tsx
 * <SentimentBadge sentiment="calm" size="medium" />
 * <SentimentBadge sentiment="alert" size="large" />
 * ```
 */
export function SentimentBadge({ sentiment, size = 'medium' }: SentimentBadgeProps) {
  const color = SENTIMENT_COLORS[sentiment];
  const icon = SENTIMENT_ICONS[sentiment];
  const label = SENTIMENT_LABELS[sentiment];

  // 크기별 스타일
  const sizeConfig = {
    small: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      iconSize: 14,
      fontSize: 13,
    },
    medium: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      iconSize: 16,
      fontSize: 14,
    },
    large: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      iconSize: 20,
      fontSize: 16,
    },
  };

  const config = sizeConfig[size];

  // 배경색 (투명도 적용)
  const bgColorMap = {
    calm: 'rgba(76, 175, 80, 0.1)',
    caution: 'rgba(255, 193, 7, 0.1)',
    alert: 'rgba(207, 102, 121, 0.1)',
  };

  // 텍스트 색상
  const textColorMap = {
    calm: '#4CAF50',
    caution: '#FFC107',
    alert: '#CF6679',
  };

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: bgColorMap[sentiment],
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
        },
      ]}
    >
      <Ionicons name={icon} size={config.iconSize} color={color} />
      <Text
        style={[
          s.label,
          {
            color: textColorMap[sentiment],
            fontSize: config.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * 기본 export (호환성)
 */
export default SentimentBadge;

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
  },
  label: {
    fontWeight: '600',
    marginLeft: 4,
  },
});
