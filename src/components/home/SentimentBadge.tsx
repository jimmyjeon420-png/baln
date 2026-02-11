/**
 * SentimentBadge - 맥락 카드 심리 상태 뱃지
 *
 * 역할: calm(안정)/caution(주의)/alert(경계) 시각화
 * 비유: 신호등처럼 현재 시장 분위기를 한눈에 보여주는 표시
 */

import React from 'react';
import { View, Text } from 'react-native';
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
  const sizeStyles = {
    small: {
      containerClass: 'px-2 py-0.5',
      iconSize: 14,
      textClass: 'text-xs',
    },
    medium: {
      containerClass: 'px-3 py-1',
      iconSize: 16,
      textClass: 'text-sm',
    },
    large: {
      containerClass: 'px-4 py-1.5',
      iconSize: 20,
      textClass: 'text-base',
    },
  };

  const style = sizeStyles[size];

  // 배경색 (투명도 적용)
  const bgColorMap = {
    calm: 'bg-green-50 dark:bg-green-900/20',
    caution: 'bg-yellow-50 dark:bg-yellow-900/20',
    alert: 'bg-red-50 dark:bg-red-900/20',
  };

  // 텍스트 색상
  const textColorMap = {
    calm: 'text-green-700 dark:text-green-400',
    caution: 'text-yellow-700 dark:text-yellow-400',
    alert: 'text-red-700 dark:text-red-400',
  };

  return (
    <View
      className={`flex-row items-center rounded-full ${bgColorMap[sentiment]} ${style.containerClass}`}
    >
      <Ionicons name={icon} size={style.iconSize} color={color} />
      <Text className={`font-semibold ml-1 ${textColorMap[sentiment]} ${style.textClass}`}>
        {label}
      </Text>
    </View>
  );
}

/**
 * 기본 export (호환성)
 */
export default SentimentBadge;
