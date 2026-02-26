/**
 * GuruReactionBanner — 오늘 탭 구루 반응 배너
 *
 * 역할: "구루의 한마디 리본" — 맥락카드를 읽거나 예측에 적중했을 때
 *       구루가 은은하게 칭찬/응원 한 줄을 보여주는 배너
 *
 * 비유: 동물의숲에서 주민과 마주치면 말풍선이 뜨는 것처럼
 *       오늘 탭 상단에 구루의 짧은 리액션이 나타났다 사라짐
 *
 * 사용처:
 * - app/(tabs)/index.tsx 오늘 탭 상단
 * - 맥락카드 읽기 완료 시 "달리오: 잘 봤어 🦌"
 * - 예측 적중 시 "캐시우드: 센스 있네! 🦊"
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';

// =============================================================================
// 타입 정의
// =============================================================================

interface GuruReactionBannerProps {
  /** 현재 활성 리액션. null이면 아무것도 표시하지 않음 */
  reaction: {
    guruId: string;
    message: string;
    emoji: string;
  } | null;
  /** 테마 색상 */
  colors: any;
  /** 로케일 (ko/en) */
  locale: string;
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function GuruReactionBanner({
  reaction,
  colors,
  locale,
}: GuruReactionBannerProps): React.ReactElement | null {
  const isKo = locale === 'ko';

  // 슬라이드 다운 + 페이드 인 애니메이션
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 이전 타이머 정리
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (reaction) {
      // 초기 위치로 리셋
      translateY.setValue(-40);
      opacity.setValue(0);

      // 슬라이드 다운 + 페이드 인 (400ms)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // 5초 후 자동으로 사라짐
      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -40,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 5000);
    } else {
      // reaction이 null이면 즉시 숨김
      translateY.setValue(-40);
      opacity.setValue(0);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [reaction, translateY, opacity]);

  // reaction이 null이면 렌더링하지 않음
  if (!reaction) return null;

  // 구루 설정 조회
  const guruConfig = GURU_CHARACTER_CONFIGS[reaction.guruId];
  const guruName = guruConfig
    ? (isKo ? guruConfig.guruName : guruConfig.guruNameEn)
    : reaction.guruId;
  const guruEmoji = guruConfig?.emoji ?? reaction.emoji;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface + 'CC',
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {/* 왼쪽: 구루 이모지 */}
      <Text style={styles.emoji}>{guruEmoji}</Text>

      {/* 중앙: 메시지 */}
      <Text
        style={[styles.message, { color: colors.textSecondary }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {reaction.message}
      </Text>

      {/* 오른쪽: 구루 이름 라벨 */}
      <Text style={[styles.nameLabel, { color: colors.textTertiary }]}>
        {guruName}
      </Text>
    </Animated.View>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    gap: 8,
  },
  emoji: {
    fontSize: 16,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: 12,
  },
  nameLabel: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 0,
  },
});

export default GuruReactionBanner;
