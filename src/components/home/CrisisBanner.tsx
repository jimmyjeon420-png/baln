/**
 * CrisisBanner.tsx - 시장 위기 경고 배너 (VIX + 급락 감지)
 *
 * 역할: "오늘 탭 긴급 경보 배너"
 * - 시장 급락(-3%+) 또는 VIX 30+ 감지 시 최상단에 표시
 * - moderate: 주황 배경 + caution 아이콘
 * - severe/extreme: 빨강 배경 + alert 아이콘 + 펄스 애니메이션
 * - 터치하면 맥락 카드(alert sentiment)로 이동
 * - 다크모드 지원 (useTheme)
 *
 * [사용처]
 * - app/(tabs)/index.tsx 오늘 탭 최상단
 * - useCrisisAlert 훅에서 상태 전달
 *
 * [전환 전략]
 * - moderate: 맥락 카드 강조 → Premium 티저
 * - severe/extreme: "기관 행동 보기" → Premium 페이월
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import {
  getCrisisBannerStyle,
  type CrisisLevel,
} from '../../services/crisisDetection';

interface CrisisBannerProps {
  /** 위기 등급 */
  crisisLevel: CrisisLevel;
  /** 사용자 메시지 */
  message: string;
  /** 주요 하락 시장 */
  primaryMarket: string | null;
  /** 변동률 */
  primaryChange: number | null;
  /** VIX 수치 (옵션) */
  vixLevel?: number | null;
  /** 터치 시 스크롤할 ref (옵션) */
  onPress?: () => void;
}

export default function CrisisBanner({
  crisisLevel,
  message,
  primaryMarket,
  primaryChange,
  vixLevel,
  onPress,
}: CrisisBannerProps) {
  const router = useRouter();
  const { mediumTap } = useHaptics();
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 위기 감지 시 슬라이드인 애니메이션
  useEffect(() => {
    if (crisisLevel !== 'none') {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // severe/extreme일 때 아이콘 펄스 애니메이션
      if (crisisLevel === 'severe' || crisisLevel === 'extreme') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [crisisLevel, slideAnim, pulseAnim]);

  // 위기 없으면 렌더링 안 함
  if (crisisLevel === 'none') {
    return null;
  }

  // 스타일 가져오기
  const bannerStyle = getCrisisBannerStyle(crisisLevel);

  // 터치 핸들러
  const handlePress = () => {
    mediumTap();

    if (onPress) {
      onPress();
    } else {
      router.push('/subscription/paywall');
    }
  };

  // VIX 레이블 생성
  const vixLabel = vixLevel != null && vixLevel >= 30
    ? `VIX ${vixLevel.toFixed(1)}`
    : null;

  // 서브텍스트 생성
  const subParts: string[] = [];
  if (primaryMarket && primaryChange !== null) {
    subParts.push(`${primaryMarket} ${primaryChange.toFixed(2)}%`);
  }
  if (vixLabel) {
    subParts.push(vixLabel);
  }
  subParts.push('터치하여 맥락 확인');
  const subText = subParts.join(' \u00B7 ');

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bannerStyle.backgroundColor,
          borderColor: bannerStyle.borderColor,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* 왼쪽: 아이콘 + 메시지 */}
        <View style={styles.content}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons
              name={bannerStyle.iconName}
              size={20}
              color={bannerStyle.iconColor}
            />
          </Animated.View>
          <View style={styles.textContainer}>
            <Text style={[styles.message, { color: bannerStyle.textColor }]}>
              {message}
            </Text>
            <Text style={[styles.subText, { color: colors.textTertiary }]}>
              {subText}
            </Text>
          </View>
        </View>

        {/* 오른쪽: 화살표 */}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={bannerStyle.iconColor}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 2,
  },
  subText: {
    fontSize: 11,
    marginTop: 2,
  },
});
