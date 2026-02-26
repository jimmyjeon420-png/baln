/**
 * WanderingGuru — 돌아다니는 NPC 구루
 *
 * 역할: 마을에서 걸어 다니는 동물의숲 NPC
 * - 위치에 따라 부드럽게 이동
 * - idle 애니메이션 (숨쉬기/깜빡임)
 * - 말풍선 표시 (대화 중일 때)
 * - 탭하면 1:1 대화 시작
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { sentimentToExpression } from '../../services/characterService';
import type { GuruPosition } from '../../hooks/useGuruVillage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WanderingGuruProps {
  position: GuruPosition;
  onPress: (guruId: string) => void;
  /** 마을 실제 높이 (px) — GuruVillage에서 전달 */
  villageHeight: number;
}

export function WanderingGuru({ position, onPress, villageHeight }: WanderingGuruProps) {
  const config = GURU_CHARACTER_CONFIGS[position.guruId];
  const animX = useRef(new Animated.Value(position.x * (SCREEN_WIDTH - 60))).current;
  const animY = useRef(new Animated.Value(position.y * villageHeight)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0.8)).current;

  // 위치 이동 애니메이션
  useEffect(() => {
    Animated.parallel([
      Animated.timing(animX, {
        toValue: position.x * (SCREEN_WIDTH - 60),
        duration: 2500,
        useNativeDriver: true,
      }),
      Animated.timing(animY, {
        toValue: position.y * villageHeight,
        duration: 2500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [position.x, position.y, animX, animY]);

  // 말풍선 표시/숨김 애니메이션
  useEffect(() => {
    if (position.bubble) {
      Animated.parallel([
        Animated.timing(bubbleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(bubbleScale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      // 5초 후 자동 숨김
      const timer = setTimeout(() => {
        Animated.timing(bubbleOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      bubbleOpacity.setValue(0);
      bubbleScale.setValue(0.8);
    }
  }, [position.bubble, bubbleOpacity, bubbleScale]);

  const expression = position.bubbleSentiment
    ? sentimentToExpression(position.bubbleSentiment)
    : 'neutral';

  const accentColor = config?.accentColor || '#5DBB63';

  // 캐릭터 x 위치에 따라 말풍선 정렬 방향 결정
  // 왼쪽(0~0.3): 오른쪽으로 펼침, 중간: 가운데, 오른쪽(0.7~1): 왼쪽으로 펼침
  const bubbleTailAlign = position.x < 0.3
    ? 'flex-start' as const
    : position.x > 0.7
      ? 'flex-end' as const
      : 'center' as const;

  const bubbleWidth = Math.min(
    220,
    Math.max(170, SCREEN_WIDTH * (villageHeight < 200 ? 0.56 : 0.62))
  );
  const baseLeft = position.x < 0.3
    ? -10
    : position.x > 0.7
      ? -(bubbleWidth - 50)
      : -(bubbleWidth / 2 - 30);
  const containerLeft = position.x * (SCREEN_WIDTH - 60);
  const minLeft = 8 - containerLeft;
  const maxLeft = SCREEN_WIDTH - bubbleWidth - 8 - containerLeft;
  const clampedBubbleLeft = Math.max(minLeft, Math.min(maxLeft, baseLeft));
  const bubbleAbove = position.y > (villageHeight < 200 ? 0.42 : 0.6);
  const tailPlacementStyle = bubbleTailAlign === 'flex-start'
    ? styles.tailStart
    : bubbleTailAlign === 'flex-end'
      ? styles.tailEnd
      : styles.tailCenter;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: animX },
            { translateY: animY },
          ],
          // ★ 말풍선 있는 구루 → 맨 앞으로
          zIndex: position.bubble ? 100 : 5,
        },
      ]}
    >
      {/* 캐릭터 아바타 (탭 가능) */}
      <TouchableOpacity
        onPress={() => onPress(position.guruId)}
        activeOpacity={0.8}
        style={styles.avatarTouch}
      >
        <CharacterAvatar
          guruId={position.guruId}
          size="sm"
          expression={expression}
          animated
          fallbackEmoji={config?.emoji}
        />
        {/* 이름 라벨 */}
        <Text style={[styles.nameLabel, { color: accentColor }]} numberOfLines={1}>
          {config?.guruName || position.guruId}
        </Text>
      </TouchableOpacity>

      {/* 말풍선 (캐릭터 아래 표시) — 위치 기반 정렬 */}
      {position.bubble && (
        <Animated.View
          style={[
            styles.bubbleWrapper,
            bubbleAbove ? styles.bubbleWrapperAbove : styles.bubbleWrapperBelow,
            {
              left: clampedBubbleLeft,
              width: bubbleWidth,
              alignItems: bubbleTailAlign,
              opacity: bubbleOpacity,
              transform: [{ scale: bubbleScale }],
            },
          ]}
        >
          {bubbleAbove ? (
            <>
              <View style={[styles.bubble, { borderColor: accentColor + '40' }]}>
                <Text style={[styles.bubbleSpeaker, { color: accentColor }]}>
                  {config?.guruName || position.guruId}
                </Text>
                <Text style={styles.bubbleText}>
                  {position.bubble}
                </Text>
              </View>
              <View style={[styles.bubbleTailDown, tailPlacementStyle, { borderTopColor: '#1E2E3E' }]} />
            </>
          ) : (
            <>
              <View style={[styles.bubbleTailUp, tailPlacementStyle, { borderBottomColor: '#1E2E3E' }]} />
              <View style={[styles.bubble, { borderColor: accentColor + '40' }]}>
                <Text style={[styles.bubbleSpeaker, { color: accentColor }]}>
                  {config?.guruName || position.guruId}
                </Text>
                <Text style={styles.bubbleText}>
                  {position.bubble}
                </Text>
              </View>
            </>
          )}
        </Animated.View>
      )}

      {/* 그림자 (바닥에) */}
      <View style={styles.shadow} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    width: 60,
  },
  avatarTouch: {
    alignItems: 'center',
    gap: 2,
  },
  nameLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 56,
  },
  shadow: {
    width: 30,
    height: 6,
    borderRadius: 15,
    backgroundColor: '#00000030',
    marginTop: 2,
  },
  bubbleWrapper: {
    position: 'absolute',
    zIndex: 20,
  },
  bubbleWrapperBelow: {
    top: 54,
  },
  bubbleWrapperAbove: {
    bottom: 56,
  },
  bubble: {
    backgroundColor: '#1E2E3E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 12,
    color: '#E0E0E0',
    lineHeight: 17,
  },
  bubbleSpeaker: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  bubbleTailUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  bubbleTailDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    marginTop: -1,
  },
  tailStart: {
    alignSelf: 'flex-start',
    marginLeft: 20,
  },
  tailCenter: {
    alignSelf: 'center',
  },
  tailEnd: {
    alignSelf: 'flex-end',
    marginRight: 20,
  },
});
