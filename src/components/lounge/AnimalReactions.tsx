/**
 * AnimalReactions — 동물 리액션 버튼 4종
 *
 * 역할: "카페 감정 표현 버튼" — 기존 좋아요 대신
 *       동물 테마 리액션 4종으로 게시글에 반응
 * 비유: 카카오톡 이모티콘처럼, 발른 카페만의 동물 리액션 세트
 *
 * 사용처:
 * - 라운지 게시글 카드 하단 (좋아요 버튼 대체)
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ANIMAL_REACTIONS } from '../../data/cafeConfig';

// =============================================================================
// 타입
// =============================================================================

interface AnimalReactionsProps {
  /** 게시글 ID */
  postId: string;
  /** 리액션 집계 { reactionId: count } */
  currentReactions: Record<string, number>;
  /** 현재 사용자가 선택한 리액션 ID (null = 선택 안 함) */
  userReaction: string | null;
  /** 리액션 콜백 */
  onReact: (postId: string, reactionType: string) => void;
}

// =============================================================================
// 개별 리액션 버튼 (바운스 애니메이션 포함)
// =============================================================================

interface ReactionButtonProps {
  reactionId: string;
  emoji: string;
  count: number;
  isSelected: boolean;
  onPress: () => void;
  surfaceColor: string;
  textColor: string;
  selectedBorderColor: string;
}

function ReactionButton({
  reactionId,
  emoji,
  count,
  isSelected,
  onPress,
  surfaceColor,
  textColor,
  selectedBorderColor,
}: ReactionButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    // 바운스 애니메이션
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        useNativeDriver: true,
        tension: 300,
        friction: 5,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
    ]).start();

    onPress();
  }, [onPress, scaleAnim]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.6}
      style={[
        styles.reactionButton,
        {
          backgroundColor: isSelected ? selectedBorderColor + '20' : surfaceColor,
          borderColor: isSelected ? selectedBorderColor : 'transparent',
        },
      ]}
    >
      <Animated.Text
        style={[styles.reactionEmoji, { transform: [{ scale: scaleAnim }] }]}
      >
        {emoji}
      </Animated.Text>
      {count > 0 && (
        <Text
          style={[
            styles.reactionCount,
            { color: isSelected ? selectedBorderColor : textColor },
          ]}
        >
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function AnimalReactions({
  postId,
  currentReactions,
  userReaction,
  onReact,
}: AnimalReactionsProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {ANIMAL_REACTIONS.map((reaction) => (
        <ReactionButton
          key={reaction.id}
          reactionId={reaction.id}
          emoji={reaction.emoji}
          count={currentReactions[reaction.id] ?? 0}
          isSelected={userReaction === reaction.id}
          onPress={() => onReact(postId, reaction.id)}
          surfaceColor={colors.surface}
          textColor={colors.textSecondary}
          selectedBorderColor={colors.primary}
        />
      ))}
    </View>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 12,
    textAlign: 'center',
  },
});

export default AnimalReactions;
