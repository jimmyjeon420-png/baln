/**
 * useCrisisAlert.ts - 위기 감지 자동 알림 훅
 *
 * 역할: "시장 위기 자동 경보 발령 부서"
 * - 시장 데이터 실시간 감시 (useSharedBitcoinPrice + useSharedMarketData)
 * - 위기 감지 시 자동 푸시 알림 발송
 * - 하루 1회만 알림 (AsyncStorage 중복 방지)
 * - 위기 배너 표시 상태 관리
 *
 * [사용처]
 * - 오늘 탭 (index.tsx)에서 useEffect로 자동 실행
 * - CrisisBanner 컴포넌트에 상태 전달
 *
 * [알림 조건]
 * - BTC 24시간 변동률 -3% 이상
 * - 또는 sentiment = 'BEARISH' + BTC -2% 이상
 * - 마지막 알림 발송 후 24시간 경과
 */

import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSharedBitcoinPrice } from './useSharedAnalysis';
import {
  detectCrisis,
  type CrisisLevel,
  type CrisisDetectionResult,
} from '../services/crisisDetection';

// ============================================================================
// 스토리지 키
// ============================================================================

const CRISIS_ALERT_KEY = '@baln:crisis_last_alert_date';

// ============================================================================
// 훅 인터페이스
// ============================================================================

export interface CrisisAlertState {
  /** 위기 등급 */
  crisisLevel: CrisisLevel;
  /** 사용자 메시지 */
  crisisMessage: string;
  /** 위기 상황 여부 */
  isInCrisis: boolean;
  /** 주요 하락 시장 */
  primaryMarket: string | null;
  /** 변동률 */
  primaryChange: number | null;
  /** 로딩 상태 */
  isLoading: boolean;
}

// ============================================================================
// 훅
// ============================================================================

/**
 * 위기 감지 + 자동 알림 훅
 *
 * [흐름]
 * 1. 비트코인 가격 데이터 구독 (useSharedBitcoinPrice)
 * 2. 위기 감지 (detectCrisis)
 * 3. 위기 감지 시 → 오늘 첫 알림인지 확인 (AsyncStorage)
 * 4. 첫 알림이면 → 푸시 알림 스케줄 + AsyncStorage 저장
 * 5. 위기 상태 반환 (CrisisBanner에서 사용)
 */
export function useCrisisAlert(): CrisisAlertState {
  const [crisisState, setCrisisState] = useState<CrisisAlertState>({
    crisisLevel: 'none',
    crisisMessage: '',
    isInCrisis: false,
    primaryMarket: null,
    primaryChange: null,
    isLoading: true,
  });

  // 비트코인 가격 데이터 구독 (24시간 변동률 포함)
  const { data: btcPrice, isLoading: btcLoading } = useSharedBitcoinPrice();

  useEffect(() => {
    if (btcLoading) return;

    // 데이터 없으면 위기 없음
    if (!btcPrice) {
      setCrisisState({
        crisisLevel: 'none',
        crisisMessage: '',
        isInCrisis: false,
        primaryMarket: null,
        primaryChange: null,
        isLoading: false,
      });
      return;
    }

    // 위기 감지
    const result = detectCrisis({
      btcChange: btcPrice.priceChange24h,
      // TODO: KOSPI/NASDAQ API 통합 시 추가
      // kospiChange: kospiData?.change,
      // nasdaqChange: nasdaqData?.change,
      // sentiment: marketSentiment,
    });

    // 상태 업데이트
    setCrisisState({
      crisisLevel: result.level,
      crisisMessage: result.message,
      isInCrisis: result.isInCrisis,
      primaryMarket: result.primaryMarket,
      primaryChange: result.primaryChange,
      isLoading: false,
    });

    // 위기 감지 시 알림 발송 (하루 1회)
    if (result.isInCrisis) {
      sendCrisisNotificationOnce(result).catch((err) => {
        console.error('[위기 알림] 발송 실패:', err);
      });
    }
  }, [btcPrice, btcLoading]);

  return crisisState;
}

// ============================================================================
// 알림 발송 로직
// ============================================================================

/**
 * 위기 알림 발송 (하루 1회 제한)
 * @param crisis - 위기 감지 결과
 *
 * [중복 방지 로직]
 * 1. AsyncStorage에서 마지막 알림 날짜 조회
 * 2. 오늘 날짜와 비교
 * 3. 다른 날짜이면 → 알림 발송 + 날짜 저장
 * 4. 같은 날짜이면 → skip
 */
async function sendCrisisNotificationOnce(
  crisis: CrisisDetectionResult
): Promise<void> {
  try {
    // 1) 마지막 알림 날짜 조회
    const lastAlertDate = await AsyncStorage.getItem(CRISIS_ALERT_KEY);
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

    // 2) 오늘 이미 알림 발송했으면 skip
    if (lastAlertDate === today) {
      console.log('[위기 알림] 오늘 이미 발송됨, skip');
      return;
    }

    // 3) 알림 권한 확인
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('[위기 알림] 권한 없음, skip');
      return;
    }

    // 4) 로컬 알림 스케줄 (즉시 발송)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 시장 위기 감지',
        body: crisis.message,
        data: {
          type: 'crisis_alert',
          level: crisis.level,
          market: crisis.primaryMarket,
          change: crisis.primaryChange,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // 즉시 발송
    });

    // 5) 오늘 날짜 저장 (중복 방지)
    await AsyncStorage.setItem(CRISIS_ALERT_KEY, today);

    console.log('[위기 알림] 발송 완료:', crisis.level, crisis.primaryMarket);
  } catch (err) {
    console.error('[위기 알림] 발송 에러:', err);
    throw err;
  }
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 마지막 위기 알림 날짜 초기화 (테스트용)
 */
export async function resetCrisisAlertDate(): Promise<void> {
  await AsyncStorage.removeItem(CRISIS_ALERT_KEY);
}
