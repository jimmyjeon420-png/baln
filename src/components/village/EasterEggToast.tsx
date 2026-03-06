/**
 * EasterEggToast — 이스터에그 발견 알림 토스트
 *
 * 역할: "깜짝 선물 상자" — 이스터에그 발견 시 상단에서 슬라이드 인
 * - 이모지 + 이름 + 설명 표시
 * - 5초 후 자동 사라짐
 * - 황금빛 테두리 글로우 효과
 *
 * 비유: 동물의숲에서 화석/메시지 병 발견 시 뜨는 알림 팝업
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import type { EasterEgg } from '../../data/easterEggConfig';
import type { ThemeColors } from '../../styles/colors';
import { useLocale } from '../../context/LocaleContext';

interface EasterEggToastProps {
  egg: EasterEgg | null;
  visible: boolean;
  onDismiss: () => void;
  colors: ThemeColors;
}

export function EasterEggToast({
  egg,
  visible,
  onDismiss,
  colors,
}: EasterEggToastProps) {
  const slideAnim = useRef(new Animated.Value(-140)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible && egg) {
      // Slide in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulsing golden glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -140,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, egg, slideAnim, opacityAnim, glowAnim]);

  const { t, language } = useLocale();
  const isKo = language === 'ko';

  if (!egg) return null;
  const name = isKo ? egg.nameKo : egg.nameEn;
  const description = isKo ? egg.descriptionKo : egg.descriptionEn;
  const headerText = t('easterEgg.found');

  return (
    <Animated.View
      style={[
        styles.outerContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Golden glow background */}
      <Animated.View
        style={[
          styles.glowLayer,
          { opacity: glowAnim },
        ]}
      />

      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: '#FFD700',
          },
        ]}
        activeOpacity={0.85}
        onPress={onDismiss}
      >
        {/* Emoji */}
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{egg.emoji}</Text>
        </View>

        {/* Text content */}
        <View style={styles.textBlock}>
          <Text style={[styles.header, { color: '#FFD700' }]}>
            {headerText}
          </Text>
          <Text
            style={[styles.name, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>

        {/* Credits reward */}
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardText}>{t('easterEgg.reward', { count: egg.rewardCredits })}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 12,
    right: 12,
    zIndex: 200,
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
    }),
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFD70018',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  header: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  description: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  rewardBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A1A',
  },
});
