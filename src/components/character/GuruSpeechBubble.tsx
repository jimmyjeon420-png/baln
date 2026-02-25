/**
 * GuruSpeechBubble — 말풍선 UI
 *
 * 역할: 캐릭터가 말하는 내용을 동물의숲 스타일 말풍선으로 표시
 * 비유: NPC가 "안녕!" 하고 말풍선을 띄우는 그 느낌
 *
 * 특징:
 * - 둥근 말풍선 + 왼쪽 꼬리
 * - 부드러운 입장 애니메이션
 * - 다크모드 최적화
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEntranceAnimation } from './animations/useEntranceAnimation';

interface GuruSpeechBubbleProps {
  /** 말풍선 내용 */
  text: string;
  /** 강조 색상 (구루 accentColor) */
  accentColor?: string;
  /** 구루 이름 라벨 (선택) */
  guruName?: string;
  /** 최대 줄 수 (0이면 무제한) */
  maxLines?: number;
  /** 애니메이션 지연 시간 (ms) */
  animationDelay?: number;
}

export function GuruSpeechBubble({
  text,
  accentColor = '#4CAF50',
  guruName,
  maxLines = 0,
  animationDelay = 100,
}: GuruSpeechBubbleProps) {
  const { animatedStyle } = useEntranceAnimation({ delay: animationDelay, duration: 350 });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* 말풍선 본체 */}
      <View style={[styles.bubble, { borderColor: accentColor + '30' }]}>
        {guruName && (
          <Text style={[styles.nameLabel, { color: accentColor }]}>{guruName}</Text>
        )}
        <Text
          style={styles.text}
          numberOfLines={maxLines || undefined}
        >
          {text}
        </Text>
      </View>

      {/* 말풍선 꼬리 (왼쪽 아래) */}
      <View style={styles.tailContainer}>
        <View style={[styles.tail, { borderTopColor: '#252525' }]} />
        <View style={[styles.tailBorder, { borderTopColor: accentColor + '30' }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bubble: {
    backgroundColor: '#252525',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
  },
  nameLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  text: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  tailContainer: {
    marginLeft: 16,
    height: 8,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#252525',
  },
  tailBorder: {
    position: 'absolute',
    top: -1,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    zIndex: -1,
  },
});
