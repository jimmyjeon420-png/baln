/**
 * AcornJar — 크레딧(도토리) 시각화 컴포넌트
 *
 * 역할: "마을 도토리 항아리" — 보유 크레딧을 도토리 항아리로 시각화
 * 비유: 동물의숲에서 벨(종) 주머니가 통통해지는 느낌
 *
 * 기능:
 * - 항아리(jar) 이모지 + 채움 레벨 표시
 * - 도토리 이모지 흩뿌림
 * - "32 도토리 (3,200)" 텍스트
 * - 크레딧 변동 시 채움 애니메이션
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

// ============================================================================
// i18n
// ============================================================================

const TEXT = {
  ko: {
    unit: '도토리',
    wonPrefix: '₩',
  },
  en: {
    unit: 'acorns',
    wonPrefix: '₩',
  },
};

// ============================================================================
// Props
// ============================================================================

interface AcornJarProps {
  credits: number;
  locale?: string;
  colors?: {
    textPrimary?: string;
    textSecondary?: string;
    primary?: string;
    surface?: string;
    border?: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

const MAX_DISPLAY_CREDITS = 500; // Full jar at 500 credits
const CREDIT_TO_KRW = 100;

// ============================================================================
// Component
// ============================================================================

export function AcornJar({ credits, locale = 'ko', colors }: AcornJarProps) {
  const isKo = locale === 'ko';
  const t = isKo ? TEXT.ko : TEXT.en;

  const fillAnim = useRef(new Animated.Value(0)).current;

  const fillPercent = Math.min(1, credits / MAX_DISPLAY_CREDITS);

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: fillPercent,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [fillPercent, fillAnim]);

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Scatter acorns based on credit level
  const acornCount = Math.min(8, Math.ceil(credits / 20));
  const acorns = Array.from({ length: acornCount }).map((_, i) => {
    const left = 15 + ((i * 37) % 60);
    const bottom = 8 + ((i * 23) % 40);
    return (
      <Text
        key={i}
        style={[
          styles.acorn,
          { left: `${left}%`, bottom: `${bottom}%` },
        ]}
      >
        🌰
      </Text>
    );
  });

  const wonValue = (credits * CREDIT_TO_KRW).toLocaleString();

  return (
    <View style={[styles.container, { backgroundColor: colors?.surface || '#1A2535' }]}>
      {/* Jar visual */}
      <View style={[styles.jar, { borderColor: colors?.border || '#2A3F55' }]}>
        <Animated.View
          style={[
            styles.jarFill,
            {
              height: fillHeight,
              backgroundColor: (colors?.primary || '#4CAF50') + '40',
            },
          ]}
        />
        {acorns}
        <Text style={styles.jarEmoji}>🏺</Text>
      </View>

      {/* Text */}
      <View style={styles.textCol}>
        <Text style={[styles.creditText, { color: colors?.textPrimary || '#FFFFFF' }]}>
          {credits} {t.unit}
        </Text>
        <Text style={[styles.wonText, { color: colors?.textSecondary || '#A0AEC0' }]}>
          ({t.wonPrefix}{wonValue})
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  jar: {
    width: 64,
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  jarFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 10,
  },
  jarEmoji: {
    fontSize: 28,
    marginBottom: 4,
    zIndex: 2,
  },
  acorn: {
    position: 'absolute',
    fontSize: 12,
    zIndex: 1,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  creditText: {
    fontSize: 18,
    fontWeight: '800',
  },
  wonText: {
    fontSize: 13,
  },
});
