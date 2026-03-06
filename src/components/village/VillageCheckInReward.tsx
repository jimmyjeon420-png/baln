/**
 * VillageCheckInReward — 마을 출석 보상 팝업
 *
 * 역할: 마을 탭에 처음 들어왔을 때 오늘의 출석 보상을 시각적으로 보여줌
 * - 구루 캐릭터가 크레딧 코인을 건네는 느낌
 * - 2초 후 자동으로 사라짐
 * - 이미 출석한 날은 표시 안 함
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { useLocale } from '../../context/LocaleContext';
import type { ThemeColors } from '../../styles/colors';

const VILLAGE_CHECKIN_KEY = '@baln:village_checkin_shown';

interface VillageCheckInRewardProps {
  colors: ThemeColors;
  /** 오늘의 스트릭 일수 */
  currentStreak?: number;
}

// 요일 기반 배달 구루 (매일 다른 구루가 환영)
const DAILY_GURUS = ['buffett', 'dalio', 'cathie_wood', 'lynch', 'marks', 'rogers', 'musk'];
const DAILY_MESSAGE_KEYS = [
  'village_ui.checkin.msg_0',
  'village_ui.checkin.msg_1',
  'village_ui.checkin.msg_2',
  'village_ui.checkin.msg_3',
  'village_ui.checkin.msg_4',
  'village_ui.checkin.msg_5',
  'village_ui.checkin.msg_6',
];

function getTodayKey(): string {
  const kstMs = Date.now() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().split('T')[0];
}

export function VillageCheckInReward({
  colors,
  currentStreak = 0,
}: VillageCheckInRewardProps) {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const { t } = useLocale();

  useEffect(() => {
    (async () => {
      const lastShown = await AsyncStorage.getItem(VILLAGE_CHECKIN_KEY);
      const today = getTodayKey();

      if (lastShown === today) return; // 오늘 이미 보여줌

      // 표시 기록
      await AsyncStorage.setItem(VILLAGE_CHECKIN_KEY, today);
      setVisible(true);

      // 슬라이드 인
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 4초 후 자동 숨김
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -120,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => setVisible(false));
      }, 4000);
    })();
  }, [slideAnim, opacityAnim]);

  if (!visible) return null;

  const dayIndex = new Date().getDay() % DAILY_GURUS.length;
  const guruId = DAILY_GURUS[dayIndex];
  const message = t(DAILY_MESSAGE_KEYS[dayIndex] ?? 'village_ui.checkin.msg_0');

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary + '40',
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <CharacterAvatar guruId={guruId} size="sm" expression="bullish" animated />
      <View style={styles.textBlock}>
        <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
          {message}
        </Text>
        <View style={styles.rewardRow}>
          <Text style={[styles.creditText, { color: colors.primary }]}>
            {t('village_ui.checkin.credit_reward')}
          </Text>
          {currentStreak > 1 && (
            <Text style={[styles.streakText, { color: colors.textTertiary }]}>
              {t('village_ui.checkin.streak_label', { count: currentStreak })}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditText: {
    fontSize: 15,
    fontWeight: '800',
  },
  streakText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
