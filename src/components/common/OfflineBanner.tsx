/**
 * OfflineBanner.tsx - 네트워크 상태 감지 배너
 *
 * 역할: "인터넷 연결 감시탑" — 와이파이/데이터가 끊기면 빨간 배너로 경고하고,
 *       다시 연결되면 초록 배너로 안심시킨 뒤 3초 후 자동으로 사라집니다.
 *
 * 비유: 비행기 안전벨트 표시등과 같습니다.
 *       난기류(오프라인)가 오면 빨간불이 켜지고,
 *       안정(온라인 복귀)되면 초록불이 켜졌다가 꺼집니다.
 *
 * 동작:
 * 1. 오프라인 감지 → 빨간 배너 슬라이드 다운: "인터넷 연결 없음 — 오프라인 모드"
 * 2. 온라인 복귀 → 초록 배너: "다시 연결되었습니다" → 3초 후 슬라이드 업으로 사라짐
 *
 * 사용처:
 * - 전체 앱 최상위 (_layout.tsx)에서 한 번만 배치
 * - 모든 화면에서 네트워크 끊김 시 자동 표시
 *
 * 기술:
 * - @react-native-community/netinfo (package.json에 이미 설치됨)
 * - react-native Animated API (SlideDown 애니메이션)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

// ──────────────────────────────────────────────
// 상수 정의
// ──────────────────────────────────────────────

/** 오프라인 배너 색상 (Error Red) */
const OFFLINE_COLOR = '#CF6679';

/** 온라인 복귀 배너 색상 (Primary Green) */
const ONLINE_COLOR = '#4CAF50';

/** 배너 높이 */
const BANNER_HEIGHT = 36;

/** 슬라이드 애니메이션 속도 (ms) */
const SLIDE_DURATION = 300;

/** 온라인 복귀 배너가 사라지기까지 대기 시간 (ms) */
const ONLINE_BANNER_DISMISS_DELAY = 3000;

// ──────────────────────────────────────────────
// 배너 상태 타입
// ──────────────────────────────────────────────

type BannerState =
  | 'hidden'    // 배너 숨김 (정상 상태)
  | 'offline'   // 오프라인 — 빨간 배너 표시 중
  | 'reconnected'; // 온라인 복귀 — 초록 배너 표시 중 (3초 후 사라짐)

// ──────────────────────────────────────────────
// 컴포넌트
// ──────────────────────────────────────────────

export default function OfflineBanner() {
  // 배너 상태 관리
  const [bannerState, setBannerState] = useState<BannerState>('hidden');

  // 슬라이드 애니메이션 값 (-BANNER_HEIGHT = 완전히 숨김, 0 = 완전히 표시)
  const slideAnim = useRef(new Animated.Value(-BANNER_HEIGHT)).current;

  // 이전 연결 상태를 추적 (오프라인→온라인 전환 감지용)
  const wasOffline = useRef(false);

  // 타이머 참조 (컴포넌트 언마운트 시 정리용)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 첫 번째 이벤트인지 추적 (앱 시작 시 false positive 방지)
  const isFirstEvent = useRef(true);

  /**
   * 배너를 슬라이드 다운하여 표시
   */
  const showBanner = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: SLIDE_DURATION,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  /**
   * 배너를 슬라이드 업하여 숨김
   */
  const hideBanner = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -BANNER_HEIGHT,
      duration: SLIDE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      // 애니메이션 완료 후 상태를 hidden으로 변경
      setBannerState('hidden');
    });
  }, [slideAnim]);

  /**
   * 네트워크 상태 변경 핸들러
   *
   * NetInfo가 감지한 네트워크 변화에 따라:
   * - 오프라인이면 → 빨간 배너 표시
   * - 오프라인에서 복귀하면 → 초록 배너 3초 표시 후 사라짐
   */
  const handleNetworkChange = useCallback(
    (state: NetInfoState) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;

      // 첫 번째 이벤트는 앱 시작 시 발생 — 온라인이면 무시
      if (isFirstEvent.current) {
        isFirstEvent.current = false;
        if (!isOffline) {
          // 앱 시작 시 이미 온라인이면 배너 표시 안 함
          wasOffline.current = false;
          return;
        }
      }

      if (isOffline) {
        // ── 오프라인 감지 ──
        // 기존 복귀 타이머가 있으면 취소
        if (dismissTimer.current) {
          clearTimeout(dismissTimer.current);
          dismissTimer.current = null;
        }

        wasOffline.current = true;
        setBannerState('offline');
        showBanner();
      } else if (wasOffline.current) {
        // ── 온라인 복귀 (이전에 오프라인이었을 때만) ──
        wasOffline.current = false;
        setBannerState('reconnected');
        showBanner();

        // 3초 후 배너 자동 숨김
        dismissTimer.current = setTimeout(() => {
          hideBanner();
          dismissTimer.current = null;
        }, ONLINE_BANNER_DISMISS_DELAY);
      }
    },
    [showBanner, hideBanner]
  );

  useEffect(() => {
    // NetInfo 네트워크 상태 구독
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // 클린업: 구독 해제 + 타이머 정리
    return () => {
      unsubscribe();
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [handleNetworkChange]);

  // 배너가 숨김 상태이면 렌더링하지 않음 (성능 최적화)
  if (bannerState === 'hidden') {
    return null;
  }

  // 상태에 따른 색상과 텍스트 결정
  const isOfflineState = bannerState === 'offline';
  const backgroundColor = isOfflineState ? OFFLINE_COLOR : ONLINE_COLOR;
  const iconName = isOfflineState ? 'cloud-offline-outline' : 'checkmark-circle-outline';
  const message = isOfflineState
    ? '인터넷 연결 없음 — 오프라인 모드'
    : '다시 연결되었습니다';

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      // 접근성: 스크린리더에서 네트워크 상태 안내
      accessibilityRole="alert"
      accessibilityLabel={message}
      accessibilityLiveRegion="assertive"
    >
      <Ionicons name={iconName} size={16} color="#FFFFFF" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 9999, // 다른 모든 요소 위에 표시
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
