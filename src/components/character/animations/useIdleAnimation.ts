/**
 * useIdleAnimation — 동물의숲 NPC 스타일 idle 애니메이션
 *
 * 역할: 캐릭터가 가만히 있어도 "살아있는 느낌"을 주는 미세 애니메이션
 * - 숨쉬기: 몸체가 미세하게 위아래 (1.5초 주기)
 * - 깜빡임: 3~5초마다 눈이 한번 감겼다 뜸 (200ms)
 * - 흔들림: 좌우로 아주 살짝 (2초 주기)
 */

import { useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';

interface IdleAnimationResult {
  /** 숨쉬기 스타일 (scale transform) */
  breathingStyle: { transform: { scale: Animated.Value }[] };
  /** 흔들림 스타일 (translateX transform) */
  swayStyle: { transform: { translateX: Animated.Value }[] };
  /** 눈 깜빡임 opacity (0=감김, 1=열림) */
  blinkOpacity: Animated.Value;
  /** 현재 blink phase 값 (0 or 1) — SVG blinkPhase prop에 전달 */
  blinkPhaseRef: React.MutableRefObject<number>;
}

export function useIdleAnimation(): IdleAnimationResult {
  const breathScale = useRef(new Animated.Value(1)).current;
  const swayX = useRef(new Animated.Value(0)).current;
  const blinkOpacity = useRef(new Animated.Value(1)).current;
  const blinkPhaseRef = useRef(0);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 숨쉬기 루프
  useEffect(() => {
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, {
          toValue: 1.02,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(breathScale, {
          toValue: 1.0,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    breathing.start();
    return () => breathing.stop();
  }, [breathScale]);

  // 흔들림 루프
  useEffect(() => {
    const sway = Animated.loop(
      Animated.sequence([
        Animated.timing(swayX, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(swayX, {
          toValue: -1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(swayX, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    sway.start();
    return () => sway.stop();
  }, [swayX]);

  // 깜빡임 (3~5초 랜덤 간격)
  const scheduleBlink = useCallback(() => {
    const delay = 3000 + Math.random() * 2000;
    blinkTimerRef.current = setTimeout(() => {
      blinkPhaseRef.current = 1;
      Animated.sequence([
        Animated.timing(blinkOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(blinkOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        blinkPhaseRef.current = 0;
        scheduleBlink();
      });
    }, delay);
  }, [blinkOpacity]);

  useEffect(() => {
    scheduleBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [scheduleBlink]);

  return {
    breathingStyle: { transform: [{ scale: breathScale }] },
    swayStyle: { transform: [{ translateX: swayX }] },
    blinkOpacity,
    blinkPhaseRef,
  };
}
