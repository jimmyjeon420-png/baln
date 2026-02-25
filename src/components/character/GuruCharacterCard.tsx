/**
 * GuruCharacterCard — 아바타 + 말풍선 합성 카드
 *
 * 역할: 캐릭터 아바타와 말풍선을 한 장의 카드로 조합
 * 비유: 동물의숲에서 NPC가 옆에 서서 말풍선으로 이야기하는 장면
 *
 * 사용처: 홈탭 구루 인사이트 요약, 상세 페이지 상단 등
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { CharacterAvatar } from './CharacterAvatar';
import { GuruSpeechBubble } from './GuruSpeechBubble';
import { useEntranceAnimation } from './animations/useEntranceAnimation';
import type { CharacterExpression, CharacterSize } from '../../types/character';

interface GuruCharacterCardProps {
  /** 구루 ID */
  guruId: string;
  /** 말풍선 텍스트 */
  message: string;
  /** 아바타 크기 */
  avatarSize?: CharacterSize;
  /** 표정 */
  expression?: CharacterExpression;
  /** 센티먼트 문자열 (자동 변환) */
  sentiment?: string;
  /** 구루 이름 (말풍선 라벨) */
  guruName?: string;
  /** 강조 색상 */
  accentColor?: string;
  /** 이모지 폴백 */
  fallbackEmoji?: string;
  /** 말풍선 최대 줄 수 */
  maxLines?: number;
}

export function GuruCharacterCard({
  guruId,
  message,
  avatarSize = 'md',
  expression,
  sentiment,
  guruName,
  accentColor = '#4CAF50',
  fallbackEmoji,
  maxLines = 0,
}: GuruCharacterCardProps) {
  const { animatedStyle } = useEntranceAnimation({ delay: 0, duration: 400 });

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.avatarSection}>
        <CharacterAvatar
          guruId={guruId}
          size={avatarSize}
          expression={expression}
          sentiment={sentiment}
          fallbackEmoji={fallbackEmoji}
        />
      </View>
      <View style={styles.bubbleSection}>
        <GuruSpeechBubble
          text={message}
          accentColor={accentColor}
          guruName={guruName}
          maxLines={maxLines}
          animationDelay={150}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  avatarSection: {
    alignItems: 'center',
  },
  bubbleSection: {
    flex: 1,
  },
});
