/**
 * hapticService.ts - 햅틱 피드백 중앙 관리
 *
 * 역할: "촉각 피드백 부서" — 앱 전체의 햅틱을 일관되게 관리
 *
 * 사용처:
 * - 버튼 탭
 * - 스와이프 완료
 * - 성공/실패 알림
 * - 중요한 액션
 */

import * as Haptics from 'expo-haptics';

/**
 * 가벼운 탭 (버튼 클릭)
 */
export async function lightTap() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // 디바이스가 햅틱을 지원하지 않으면 무시
    console.log('[hapticService] lightTap 지원 안됨');
  }
}

/**
 * 중간 탭 (중요한 버튼)
 */
export async function mediumTap() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.log('[hapticService] mediumTap 지원 안됨');
  }
}

/**
 * 강한 탭 (매우 중요한 액션)
 */
export async function heavyTap() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.log('[hapticService] heavyTap 지원 안됨');
  }
}

/**
 * 성공 피드백 (적중, 완료 등)
 */
export async function success() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.log('[hapticService] success 지원 안됨');
  }
}

/**
 * 경고 피드백 (주의 필요)
 */
export async function warning() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.log('[hapticService] warning 지원 안됨');
  }
}

/**
 * 에러 피드백 (실패, 오류)
 */
export async function error() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.log('[hapticService] error 지원 안됨');
  }
}

/**
 * 선택 변경 피드백 (스위치, 슬라이더 등)
 */
export async function selection() {
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.log('[hapticService] selection 지원 안됨');
  }
}
