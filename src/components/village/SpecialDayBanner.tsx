/**
 * SpecialDayBanner — 구루 특별한 날 이벤트 배너
 *
 * 역할: "마을 축하 현수막" — 오늘이 구루 생일이나 기념일이면
 *       축제 분위기의 배너를 보여줌
 *
 * 비유: 동물의숲에서 주민 생일에 집 앞에 파티 장식이 걸리는 것처럼
 *       마을 화면에 "오늘은 버핏 할아버지 생일!" 배너가 나타남
 *
 * 데이터: guruSpecialDays.ts의 GURU_SPECIAL_DAYS 활용
 * - month/day 매칭으로 오늘의 특별일 확인
 * - 여러 구루 특별일이 겹치면 첫 번째만 표시
 *
 * 사용처:
 * - app/(tabs)/village.tsx 마을 씬 상단
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import { getTodaySpecialDays } from '../../data/guruSpecialDays';
import type { ThemeColors } from '../../styles/colors';
import { useLocale } from '../../context/LocaleContext';

// =============================================================================
// 타입 정의
// =============================================================================

interface SpecialDayBannerProps {
  /** 테마 색상 */
  colors: ThemeColors;
}

// =============================================================================
// 특별일 유형 → 한/영 라벨
// =============================================================================

const _TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  birthday:    { ko: '생일', en: 'Birthday' },
  anniversary: { ko: '기념일', en: 'Anniversary' },
  memorable:   { ko: '기념일', en: 'Milestone' },
};

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function SpecialDayBanner({
  colors,
}: SpecialDayBannerProps): React.ReactElement | null {
  const { t, language } = useLocale();
  const isKo = language === 'ko';

  // 스케일 펄스 애니메이션 (1 → 1.02 → 1 반복, 2초)
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [scaleAnim]);

  // 오늘의 특별일 조회
  const todaySpecial = useMemo(() => {
    const specials = getTodaySpecialDays();
    if (specials.length === 0) return null;
    return specials[0]; // 첫 번째 특별일만 표시
  }, []);

  // 오늘 특별일이 없으면 렌더링하지 않음
  if (!todaySpecial) return null;

  // 구루 정보
  const guruConfig = GURU_CHARACTER_CONFIGS[todaySpecial.guruId];
  const guruName = getGuruDisplayName(todaySpecial.guruId);
  const guruEmoji = guruConfig?.emoji ?? '';

  // 유형 라벨
  const typeName = t(`specialDay.type_${todaySpecial.type}`) || t('specialDay.type_memorable');

  // 설명 텍스트
  const description = isKo ? todaySpecial.description : todaySpecial.descriptionEn;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* 왼쪽: 축하 이모지 */}
      <Text style={styles.celebrationEmoji}>{'\uD83C\uDF89'}</Text>

      {/* 중앙: 제목 + 설명 */}
      <View style={styles.textBlock}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {t('specialDay.title', { name: guruName, type: typeName })}
        </Text>
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {description}
        </Text>
      </View>

      {/* 오른쪽: 구루 이모지 */}
      <Text style={styles.guruEmoji}>{guruEmoji}</Text>
    </Animated.View>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700' + '20',
    borderColor: '#FFD700' + '40',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  celebrationEmoji: {
    fontSize: 20,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    fontSize: 11,
    lineHeight: 16,
  },
  guruEmoji: {
    fontSize: 22,
    flexShrink: 0,
  },
});

export default SpecialDayBanner;
