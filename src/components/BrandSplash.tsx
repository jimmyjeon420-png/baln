/**
 * BrandSplash - 앱 시작 시 'baln.logic' 브랜드명을 보여주는 스플래시 화면
 *
 * 역할: 앱의 "간판" 역할. 가게 문 열면 제일 먼저 보이는 로고 같은 것.
 * - 페이드인 → 잠시 표시 → 페이드아웃 후 메인 화면으로 전환
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface BrandSplashProps {
  onFinish: () => void; // 스플래시 끝나면 호출 (메인 화면 표시)
}

export default function BrandSplash({ onFinish }: BrandSplashProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1단계: 'baln' 페이드인 (0 → 1, 600ms)
    // 2단계: '.logic' 페이드인 (0 → 1, 400ms)
    // 3단계: 1200ms 대기
    // 4단계: 전체 페이드아웃 (1 → 0, 500ms)
    Animated.sequence([
      // 브랜드명 페이드인
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // '.logic' 부분 살짝 딜레이 후 등장
      Animated.timing(dotFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 대기
      Animated.delay(1200),
      // 전체 페이드아웃
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(dotFade, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        {/* 'baln' 부분 */}
        <Animated.Text style={[styles.brandText, { opacity: fadeAnim }]}>
          bal<Text style={{ color: '#4CAF50' }}>n</Text>
        </Animated.Text>
        {/* '.logic' 부분 - 살짝 늦게 등장 */}
        <Animated.Text style={[styles.dotText, { opacity: dotFade }]}>
          .logic
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  dotText: {
    fontSize: 36,
    fontWeight: '300',
    color: '#4CAF50',
    letterSpacing: 1,
  },
});
