/**
 * ActivityBubble — 구루 활동 말풍선 컴포넌트
 *
 * 역할: "구루 실시간 상태판" — 캐릭터 머리 위에 떠있는 작은 말풍선
 * - 구루가 지금 뭘 하고 있는지 이모지 + 텍스트로 표시
 * - 기분에 따라 테두리 색이 달라짐 (기쁨=초록, 걱정=노랑, 분노=빨강, 평온=파랑)
 * - 살짝 위아래로 둥실거리는 애니메이션 (동물의숲 느낌)
 *
 * 비유: "NPC 머리 위 상태 아이콘" — RPG 게임의 캐릭터 활동 표시와 동일
 *
 * 사용처:
 * - 마을 탭: 각 구루 캐릭터 위에 오버레이
 * - 구루 디테일 화면: 현재 활동 상태 표시
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { GuruActivity, GuruMood } from '../../types/village';
import { getActivityEmoji, getActivityDescription } from '../../services/activityService';
import { getMoodColor } from '../../services/moodEngine';
import type { ThemeColors } from '../../styles/colors';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

interface ActivityBubbleProps {
  /** 구루가 현재 하고 있는 활동 */
  activity: GuruActivity;
  /** 구루의 현재 기분 (테두리 색상에 영향) */
  mood: GuruMood;
  /** 테마 색상 */
  colors: ThemeColors;
}

// ============================================================================
// 컴포넌트
// ============================================================================

const ActivityBubble = React.memo(({
  activity,
  mood,
  colors,
}: ActivityBubbleProps) => {
  const { language } = useLocale();
  // 둥실거리는 float 애니메이션 값
  const floatAnim = useRef(new Animated.Value(0)).current;

  // 컴포넌트 마운트 시 무한 반복 float 애니메이션 시작
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        // 위로 살짝 (3px)
        Animated.timing(floatAnim, {
          toValue: -3,
          duration: 900,
          useNativeDriver: true,
        }),
        // 제자리로
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
        // 아래로 살짝 (1px)
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // 다시 제자리
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );

    floatLoop.start();

    return () => {
      floatLoop.stop();
    };
  }, [floatAnim]);

  // 활동 이모지 & 텍스트
  const emoji = getActivityEmoji(activity);
  const description = getActivityDescription(activity);
  const label = language === 'ko' ? description.ko : description.en;

  // 기분에 따른 테두리 색상 (getMoodColor에서 가져온 색상 사용)
  const moodBorderColor = getMoodColor(mood);

  if (__DEV__) {
    // console.log('[ActivityBubble] activity=%s mood=%s', activity, mood);
  }

  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        {
          transform: [{ translateY: floatAnim }],
        },
      ]}
    >
      {/* 말풍선 본체 */}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.surface + 'E8',  // 약간 투명 (88%)
            borderColor: moodBorderColor,
          },
        ]}
      >
        {/* 이모지 */}
        <Text style={styles.emojiText}>{emoji}</Text>

        {/* 활동 레이블 */}
        <Text
          style={[styles.labelText, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      {/* 말풍선 꼬리 (아래 삼각형) */}
      <View
        style={[
          styles.bubbleTail,
          { borderTopColor: moodBorderColor },
        ]}
      />
    </Animated.View>
  );
});

ActivityBubble.displayName = 'ActivityBubble';

export default ActivityBubble;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  bubbleContainer: {
    alignItems: 'center',
    // 캐릭터 위에 절대 위치로 배치할 때 부모에서 position: 'absolute' 사용
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    // 그림자 (동물의숲 느낌의 부드러운 그림자)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 140,
  },
  emojiText: {
    fontSize: 13,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  // 말풍선 꼬리 삼각형 (아래 방향)
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
