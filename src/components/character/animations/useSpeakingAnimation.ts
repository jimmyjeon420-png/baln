/**
 * useSpeakingAnimation — 발언 중 캐릭터 바운스 + glow 애니메이션
 *
 * 역할: 라운드테이블에서 현재 발언 중인 구루가 위아래로 바운스하며 살짝 커지는 효과
 * - 바운스: scale 1.0 → 1.08 → 1.0 (300ms, 반복)
 * - glow: 말풍선 accentColor 후광 opacity 0 → 0.3 → 0 (반복)
 */

import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

interface SpeakingAnimationResult {
  /** 발언 바운스 스타일 (scale transform) */
  speakingStyle: { transform: { scale: Animated.Value }[] };
  /** glow 효과 opacity */
  glowOpacity: Animated.Value;
  /** 발언 시작 */
  startSpeaking: () => void;
  /** 발언 종료 */
  stopSpeaking: () => void;
}

export function useSpeakingAnimation(): SpeakingAnimationResult {
  const bounceScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const startSpeaking = useCallback(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceScale, {
          toValue: 1.08,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bounceScale, {
          toValue: 1.0,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );

    const combined = Animated.parallel([bounce, glow]);
    animRef.current = combined;
    combined.start();
  }, [bounceScale, glowOpacity]);

  const stopSpeaking = useCallback(() => {
    animRef.current?.stop();
    bounceScale.setValue(1);
    glowOpacity.setValue(0);
  }, [bounceScale, glowOpacity]);

  return {
    speakingStyle: { transform: [{ scale: bounceScale }] },
    glowOpacity,
    startSpeaking,
    stopSpeaking,
  };
}
