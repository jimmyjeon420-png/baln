/**
 * RollingNumber - 프리미엄 숫자 롤링 애니메이션
 * 0에서 목표값까지 부드럽게 카운트업
 * Reanimated useSharedValue 기반 (프레임 드롭 방지)
 */

import React, { useEffect } from 'react';
import { TextStyle, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';

// Reanimated AnimatedProps를 위한 TextInput 래핑
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface RollingNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: TextStyle;
  /** 소수점 자릿수 (기본 0) */
  decimals?: number;
  /** 포맷 타입: 'currency'(원화) | 'percent' | 'plain' */
  format?: 'currency' | 'percent' | 'plain';
}

export default function RollingNumber({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  style,
  decimals = 0,
  format = 'plain',
}: RollingNumberProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedValue, duration, value]);

  // 포맷팅 함수를 derivedValue로 처리 (UI 스레드)
  const displayText = useDerivedValue(() => {
    const current = animatedValue.value;

    let formatted: string;
    if (format === 'currency') {
      // 원화 포맷: 1,234,567
      formatted = Math.round(current).toLocaleString('ko-KR');
    } else if (format === 'percent') {
      formatted = current.toFixed(decimals);
    } else {
      if (decimals > 0) {
        formatted = current.toFixed(decimals);
      } else {
        formatted = Math.round(current).toLocaleString('ko-KR');
      }
    }

    return `${prefix}${formatted}${suffix}`;
  });

  const animatedProps = useAnimatedProps(() => ({
    text: displayText.value,
    defaultValue: displayText.value,
  }));

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      style={[
        {
          padding: 0,
          margin: 0,
          color: '#FFFFFF',
          fontSize: 29,
          fontWeight: '700',
        },
        style,
      ]}
      animatedProps={animatedProps}
    />
  );
}
