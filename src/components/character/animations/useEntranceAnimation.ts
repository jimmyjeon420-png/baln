/**
 * 캐릭터 입장 애니메이션 훅
 *
 * 역할: 캐릭터가 화면에 나타날 때 부드러운 슬라이드인 + 페이드 효과
 * 비유: 동물의숲에서 NPC가 "톡!" 하고 등장하는 그 느낌
 */

import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface UseEntranceAnimationOptions {
  /** 애니메이션 시작 전 지연 시간 (ms) */
  delay?: number;
  /** 애니메이션 지속 시간 (ms) */
  duration?: number;
  /** 아래에서 올라오는 거리 (px) */
  slideDistance?: number;
}

export function useEntranceAnimation(options: UseEntranceAnimationOptions = {}) {
  const {
    delay = 0,
    duration = 400,
    slideDistance = 20,
  } = options;

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(slideDistance)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity, translateY, delay, duration]);

  return {
    animatedStyle: {
      opacity,
      transform: [{ translateY }],
    },
  };
}
