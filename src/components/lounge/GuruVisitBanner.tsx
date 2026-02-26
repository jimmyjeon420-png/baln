/**
 * GuruVisitBanner — 구루 카페 방문 배너
 *
 * 역할: "카페 입구 알림판" — 지금 어떤 구루가 카페에 와 있는지,
 *       혹은 오늘 몇 시에 오는지를 알려주는 배너
 * 비유: 카페 문 앞에 걸린 "오늘의 게스트: 버핏 (14:00~16:00)" 현수막
 *
 * 사용처:
 * - app/(tabs)/lounge.tsx 라운지 탭 상단
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import type { VisitingGuru } from '../../services/cafeGuruVisitService';

// =============================================================================
// 타입
// =============================================================================

interface GuruVisitBannerProps {
  /** 오늘 방문 예정/진행 중인 구루 목록 */
  visitingGurus: VisitingGuru[];
  /** "대화하기" 버튼 콜백 */
  onTalkToGuru?: (guruId: string) => void;
}

// =============================================================================
// 시간 포맷 유틸
// =============================================================================

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function GuruVisitBanner({ visitingGurus, onTalkToGuru }: GuruVisitBannerProps): React.ReactElement | null {
  const { colors } = useTheme();
  const { language } = useLocale();
  const isKo = language === 'ko';
  const slideAnim = useRef(new Animated.Value(-80)).current;

  // 방문 구루가 있으면 슬라이드 다운 애니메이션
  useEffect(() => {
    if (visitingGurus.length > 0) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [visitingGurus.length, slideAnim]);

  // 방문 구루가 없으면 표시하지 않음
  if (visitingGurus.length === 0) {
    return null;
  }

  // 현재 카페에 있는 구루와 예정된 구루 분리
  const presentGurus = visitingGurus.filter((g) => g.isPresent);
  const upcomingGurus = visitingGurus.filter((g) => !g.isPresent);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.surface, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* 현재 방문 중인 구루 */}
      {presentGurus.map((guru) => (
        <View
          key={guru.guruId}
          style={[styles.guruRow, { borderLeftColor: guru.accentColor }]}
        >
          <View style={styles.guruInfo}>
            <Text style={[styles.guruEmoji]}>{guru.emoji}</Text>
            <View style={styles.guruTextWrap}>
              <Text style={[styles.guruName, { color: colors.textPrimary }]}>
                {isKo
                  ? `${guru.guruName}이 카페에 방문 중!`
                  : `${guru.guruNameEn} is visiting the cafe!`}
              </Text>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatHour(guru.startHour)}~{formatHour(guru.endHour)}
              </Text>
            </View>
          </View>
          {onTalkToGuru && (
            <TouchableOpacity
              style={[styles.talkButton, { backgroundColor: guru.accentColor }]}
              onPress={() => onTalkToGuru(guru.guruId)}
              activeOpacity={0.7}
            >
              <Text style={styles.talkButtonText}>
                {isKo ? '대화하기' : 'Talk'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* 오늘 예정된 구루 (아직 안 온 경우) */}
      {upcomingGurus.length > 0 && presentGurus.length === 0 && (
        <View style={styles.upcomingWrap}>
          <Text style={[styles.upcomingLabel, { color: colors.textSecondary }]}>
            {isKo ? '오늘 방문 예정' : 'Visiting Today'}
          </Text>
          {upcomingGurus.map((guru) => (
            <View key={guru.guruId} style={styles.upcomingRow}>
              <Text style={[styles.upcomingText, { color: colors.textPrimary }]}>
                {guru.emoji} {isKo ? guru.guruName : guru.guruNameEn}{' '}
                <Text style={{ color: colors.textSecondary }}>
                  ({formatHour(guru.startHour)}~{formatHour(guru.endHour)})
                </Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  guruRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  guruInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  guruEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  guruTextWrap: {
    flex: 1,
  },
  guruName: {
    fontSize: 14,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    marginTop: 2,
  },
  talkButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginLeft: 8,
  },
  talkButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  upcomingWrap: {
    paddingVertical: 4,
  },
  upcomingLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upcomingRow: {
    paddingVertical: 3,
  },
  upcomingText: {
    fontSize: 13,
  },
});

export default GuruVisitBanner;
