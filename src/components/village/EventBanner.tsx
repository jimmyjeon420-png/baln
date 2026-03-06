/**
 * EventBanner — 마을 이벤트 활성 시 상단 배너
 *
 * 역할: "마을 방송 현수막" — 축제·시장·긴급 이벤트가 시작되면
 *       화면 상단에서 슬라이드 다운으로 나타나 참여를 유도
 *
 * 비유: "마을 스피커 방송" — 동물의숲에서 탐탐이가 방송하는 것처럼
 *       마을에 뭔가 일어났다는 것을 즉각적으로 알려줌
 *
 * 이벤트 타입별 색상:
 * - festival: 핑크 (🎉 축제)
 * - market: 그린 (🛍️ 장터)
 * - competition: 파랑 (🏆 대회)
 * - celebration: 골드 (✨ 축하)
 * - emergency: 레드 (⚠️ 긴급) — 맥박 글로우 애니메이션
 * - seasonal: 틸 (🍂 계절)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import type { VillageEvent, VillageEventType } from '../../types/village';
import type { ThemeColors } from '../../styles/colors';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

interface EventBannerProps {
  /** 현재 활성 이벤트. null이면 배너 렌더링하지 않음 */
  event: VillageEvent | null;
  /** 참여하기 버튼 탭 콜백 */
  onPress: () => void;
  /** X 버튼으로 배너 닫기 콜백 */
  onDismiss: () => void;
  /** 테마 색상 */
  colors: ThemeColors;
}

// ============================================================================
// 이벤트 타입별 색상 & 이모지
// ============================================================================

interface EventTypeStyle {
  color: string;       // 메인 테마 색
  bgAlpha: string;    // 배경 투명도 suffix (hex 2자리)
  borderAlpha: string; // 테두리 투명도 suffix
  emoji: string;       // 대표 이모지
}

const EVENT_TYPE_STYLES: Record<VillageEventType, EventTypeStyle> = {
  festival:    { color: '#F06292', bgAlpha: '18', borderAlpha: '50', emoji: '🎉' },
  market:      { color: '#5DBB63', bgAlpha: '18', borderAlpha: '50', emoji: '🛍️' },
  competition: { color: '#5DADE2', bgAlpha: '18', borderAlpha: '50', emoji: '🏆' },
  celebration: { color: '#F0C060', bgAlpha: '18', borderAlpha: '50', emoji: '✨' },
  emergency:   { color: '#E88B96', bgAlpha: '20', borderAlpha: '70', emoji: '⚠️' },
  seasonal:    { color: '#26A69A', bgAlpha: '18', borderAlpha: '50', emoji: '🍂' },
};

// ============================================================================
// 남은 시간 포맷 헬퍼
// ============================================================================

/**
 * 이벤트 남은 시간을 사람이 읽기 좋은 문자열로 변환
 * duration(분)과 startTime(ISO) 조합으로 계산
 */
function formatTimeRemaining(
  duration: number,
  startTime: string | undefined,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (!startTime) {
    // startTime 없으면 duration만 표시
    if (duration < 60) {
      return t('village_ui.event_banner.minutes', { m: duration });
    }
    const h = Math.floor(duration / 60);
    const m = duration % 60;
    return m > 0
      ? t('village_ui.event_banner.hours_minutes', { h, m })
      : t('village_ui.event_banner.hours', { h });
  }

  const startMs = new Date(startTime).getTime();
  const endMs = startMs + duration * 60 * 1000;
  const remainMs = endMs - Date.now();

  if (remainMs <= 0) {
    return t('village_ui.event_banner.ended');
  }

  const remainMin = Math.ceil(remainMs / 60_000);
  if (remainMin < 60) {
    return t('village_ui.event_banner.minutes_left', { m: remainMin });
  }
  const h = Math.floor(remainMin / 60);
  const m = remainMin % 60;
  return m > 0
    ? t('village_ui.event_banner.hours_minutes_left', { h, m })
    : t('village_ui.event_banner.hours_left', { h });
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

const EventBanner = React.memo(({
  event,
  onPress,
  onDismiss,
  colors,
}: EventBannerProps) => {
  const { t, language } = useLocale();
  const isKo = language === 'ko';

  // 슬라이드 다운 애니메이션 값 (-80 = 위 화면 밖)
  const slideAnim = useRef(new Animated.Value(-80)).current;
  // 응급 글로우 펄스 애니메이션 값
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  // 현재 활성 루프 참조 (클린업용)
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // event가 바뀔 때 슬라이드 인/아웃
  useEffect(() => {
    if (event) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 9,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [event, slideAnim]);

  // emergency 이벤트 시 글로우 펄스 시작
  useEffect(() => {
    if (event?.type === 'emergency') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(0.4);
    }

    return () => {
      pulseLoop.current?.stop();
    };
  }, [event?.type, pulseAnim]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  if (__DEV__) {
    // console.log('[EventBanner] event=%s', event?.id ?? 'null');
  }

  // 이벤트 없으면 아무것도 렌더링 안 함
  if (!event) return null;

  const typeStyle = EVENT_TYPE_STYLES[event.type] ?? EVENT_TYPE_STYLES.festival;
  const title = isKo ? event.title : event.titleEn;
  const timeLeft = formatTimeRemaining(event.duration, event.startTime, t);
  const typeEmoji = typeStyle.emoji;
  const isEmergency = event.type === 'emergency';

  return (
    <Animated.View
      style={[
        styles.bannerWrapper,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* 긴급 이벤트 글로우 오버레이 */}
      {isEmergency && (
        <Animated.View
          style={[
            styles.emergencyGlow,
            {
              backgroundColor: typeStyle.color,
              opacity: pulseAnim,
            },
          ]}
          pointerEvents="none"
        />
      )}

      <TouchableOpacity
        style={[
          styles.banner,
          {
            backgroundColor: colors.surface,
            borderColor: typeStyle.color + typeStyle.borderAlpha,
            borderLeftColor: typeStyle.color,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {/* 왼쪽: 이벤트 타입 이모지 */}
        <View
          style={[
            styles.eventIconWrapper,
            { backgroundColor: typeStyle.color + typeStyle.bgAlpha },
          ]}
        >
          <Text style={styles.eventIcon}>{typeEmoji}</Text>
        </View>

        {/* 중앙: 제목 + 남은 시간 */}
        <View style={styles.textBlock}>
          <Text
            style={[styles.eventTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[styles.timeRemaining, { color: typeStyle.color }]}>
            {timeLeft}
          </Text>
        </View>

        {/* 참여 버튼 */}
        <TouchableOpacity
          style={[
            styles.joinBtn,
            { backgroundColor: typeStyle.color, borderColor: typeStyle.color },
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.joinBtnText}>
            {t('village_ui.event_banner.join')}
          </Text>
        </TouchableOpacity>

        {/* 닫기(X) 버튼 */}
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={[styles.dismissIcon, { color: colors.textTertiary }]}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
});

EventBanner.displayName = 'EventBanner';

export default EventBanner;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  bannerWrapper: {
    // 절대 위치는 사용처(마을 화면)에서 잡음
    // 여기서는 translateY 애니메이션만 담당
    zIndex: 100,
  },

  // 긴급 배경 글로우 (banner 위에 오버레이)
  emergencyGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },

  eventIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  eventIcon: {
    fontSize: 18,
  },

  textBlock: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  timeRemaining: {
    fontSize: 12,
    fontWeight: '600',
  },

  joinBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  dismissBtn: {
    paddingLeft: 4,
    flexShrink: 0,
  },
  dismissIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
});
