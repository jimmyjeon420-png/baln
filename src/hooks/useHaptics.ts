/**
 * useHaptics - 프리미엄 촉각 피드백 훅
 * 모든 터치 인터랙션에 적절한 햅틱 반응 제공
 * 권한 오류 시 자동 fallback (앱 크래시 방지)
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** 햅틱 피드백이 지원되는 환경인지 (웹 제외) */
const isHapticsSupported = Platform.OS !== 'web';

export function useHaptics() {
  /** 가벼운 탭 (일반 버튼, 탭 전환) */
  const lightTap = useCallback(async () => {
    if (!isHapticsSupported) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // 디바이스가 햅틱 미지원 시 무시
    }
  }, []);

  /** 중간 탭 (중요 액션, 카드 선택) */
  const mediumTap = useCallback(async () => {
    if (!isHapticsSupported) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  }, []);

  /** 강한 탭 (저장, 삭제 등 주요 액션) */
  const heavyTap = useCallback(async () => {
    if (!isHapticsSupported) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  }, []);

  /** 성공 피드백 (저장 완료, 분석 완료) */
  const success = useCallback(async () => {
    if (!isHapticsSupported) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }, []);

  /** 경고 피드백 (주의 사항, 확인 필요) */
  const warning = useCallback(async () => {
    if (!isHapticsSupported) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  }, []);

  /** 에러 피드백 (실패, 거부) */
  const error = useCallback(async () => {
    if (!isHapticsSupported) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  }, []);

  /** 선택 피드백 (토글, 체크박스, 피커) */
  const selection = useCallback(async () => {
    if (!isHapticsSupported) return;
    try {
      await Haptics.selectionAsync();
    } catch {}
  }, []);

  return {
    lightTap,
    mediumTap,
    heavyTap,
    success,
    warning,
    error,
    selection,
  };
}
