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

const VILLAGE_CHECKIN_KEY = '@baln:village_checkin_shown';

interface VillageCheckInRewardProps {
  colors: any;
  locale: string;
  /** 오늘의 스트릭 일수 */
  currentStreak?: number;
}

// 요일 기반 배달 구루 (매일 다른 구루가 환영)
const DAILY_GURUS = ['buffett', 'dalio', 'cathie_wood', 'lynch', 'marks', 'rogers', 'musk'];
const DAILY_MESSAGES_KO = [
  '좋은 아침! 오늘도 마을에 오셨군요.',
  '반가워요! 시장 소식을 가져왔어요.',
  '어서 와요! 혁신의 바람이 불고 있어요.',
  '잘 왔어요! 숨은 기회를 찾아봐요.',
  '천천히 둘러봐요. 좋은 소식이 있어요.',
  '오늘도 세계 곳곳의 소식이 있어요!',
  '새로운 아이디어가 떠올랐어요!',
];
const DAILY_MESSAGES_EN = [
  'Good morning! Welcome back to the village.',
  'Great to see you! I brought market news.',
  'Welcome! Innovation winds are blowing.',
  'Hi there! Let\'s find hidden opportunities.',
  'Take your time. Good news awaits.',
  'News from around the world today!',
  'I\'ve got a new idea to share!',
];

function getTodayKey(): string {
  const kstMs = Date.now() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().split('T')[0];
}

export function VillageCheckInReward({
  colors,
  locale,
  currentStreak = 0,
}: VillageCheckInRewardProps) {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isKo = locale === 'ko';

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
  const message = isKo ? DAILY_MESSAGES_KO[dayIndex] : DAILY_MESSAGES_EN[dayIndex];

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
            +2C
          </Text>
          {currentStreak > 1 && (
            <Text style={[styles.streakText, { color: colors.textTertiary }]}>
              {isKo ? `${currentStreak}일 연속` : `${currentStreak}-day streak`}
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
