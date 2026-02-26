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

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: animX },
            { translateY: animY },
          ],
        },
      ]}
    >
      {/* 말풍선 (위에 표시) */}
      {position.bubble && (
        <Animated.View
          style={[
            styles.bubbleWrapper,
            {
              opacity: bubbleOpacity,
              transform: [{ scale: bubbleScale }],
            },
          ]}
        >
          <View style={[styles.bubble, { borderColor: accentColor + '40' }]}>
            <Text style={styles.bubbleText} numberOfLines={3}>
              {position.bubble}
            </Text>
          </View>
          {/* 말풍선 꼬리 */}
          <View style={[styles.bubbleTail, { borderTopColor: '#1E2E3E' }]} />
        </Animated.View>
      )}

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
    bottom: '100%',
    left: -40,
    width: 140,
    marginBottom: 4,
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: '#1E2E3E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    maxWidth: 140,
  },
  bubbleText: {
    fontSize: 11,
    color: '#E0E0E0',
    lineHeight: 15,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
