/**
 * PremiumUpsellBanner.tsx - 프리미엄 업셀 배너 (인앱 삽입형)
 *
 * 역할: "맥락에 맞는 프리미엄 유도 배너"
 * - 4가지 variant별 다른 메시지 표시
 * - 높이 약 80px, 인라인 삽입형
 * - 터치 시 paywall 화면으로 이동
 *
 * useTheme()으로 다크/라이트 모드 대응
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// Props 인터페이스
// ============================================================================

export interface PremiumUpsellBannerProps {
  variant: 'context' | 'analysis' | 'prediction' | 'crisis';
  onPress: () => void;
}

// ============================================================================
// Variant 설정
// ============================================================================

interface VariantConfig {
  emoji: string;
  messageKey: string;
  ctaKey: string;
  icon: string;
  accentKey: 'gold' | 'purple';
}

const VARIANT_CONFIG: Record<string, VariantConfig> = {
  context: {
    emoji: '🔍',
    messageKey: 'premium.upsell.institutional',
    ctaKey: 'premium.upsell.ctaContext',
    icon: 'layers-outline',
    accentKey: 'gold',
  },
  analysis: {
    emoji: '🤖',
    messageKey: 'premium.upsell.analysis',
    ctaKey: 'premium.upsell.ctaAnalysis',
    icon: 'analytics-outline',
    accentKey: 'gold',
  },
  prediction: {
    emoji: '🎯',
    messageKey: 'premium.upsell.prediction',
    ctaKey: 'premium.upsell.ctaPrediction',
    icon: 'bulb-outline',
    accentKey: 'purple',
  },
  crisis: {
    emoji: '🚨',
    messageKey: 'premium.upsell.crisis',
    ctaKey: 'premium.upsell.ctaContext',
    icon: 'shield-checkmark-outline',
    accentKey: 'gold',
  },
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PremiumUpsellBanner({
  variant,
  onPress,
}: PremiumUpsellBannerProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const config = VARIANT_CONFIG[variant];
  const accentColor = colors.premium[config.accentKey];

  // 터치 스케일 애니메이션
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  // crisis variant는 특별 강조 스타일
  const isCrisis = variant === 'crisis';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.banner,
          {
            backgroundColor: isCrisis
              ? colors.error + '10'
              : accentColor + '08',
            borderColor: isCrisis
              ? colors.error + '30'
              : accentColor + '25',
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        {/* 좌측: 아이콘 + 메시지 */}
        <View style={styles.leftSection}>
          {/* 아이콘 원 */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isCrisis
                  ? colors.error + '20'
                  : accentColor + '15',
              },
            ]}
          >
            <Text style={styles.emoji}>{config.emoji}</Text>
          </View>

          {/* 메시지 */}
          <View style={styles.textSection}>
            <Text
              style={[styles.message, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {t(config.messageKey)}
            </Text>
          </View>
        </View>

        {/* 우측: CTA */}
        <View
          style={[
            styles.ctaBadge,
            {
              backgroundColor: isCrisis ? colors.error : accentColor,
            },
          ]}
        >
          <Text style={styles.ctaText}>{t(config.ctaKey)}</Text>
          <Ionicons name="arrow-forward" size={12} color="#1A1A1A" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 72,
  },

  // 좌측
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 21,
  },
  textSection: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },

  // 우측 CTA
  ctaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
});
