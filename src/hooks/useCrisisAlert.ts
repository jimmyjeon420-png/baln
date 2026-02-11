/**
 * useCrisisAlert.ts - 위기 감지 자동 알림 훅
 *
 * 역할: "시장 위기 자동 경보 발령 부서"
 * - 시장 데이터 실시간 감시 (useSharedBitcoinPrice + useSharedMarketData)
 * - 위기 감지 시 자동 푸시 알림 발송
 * - 레벨별 알림 빈도 분기:
 *   - moderate (주의): 하루 1회, 일반 알림
 *   - severe (심각): 하루 2회, "시장 급락 중! 맥락 카드를 확인하세요"
 *   - extreme (위기): 하루 4회, "긴급! 시장 -5% 이상 급락"
 * - 위기 배너 표시 상태 관리
 *
 * [사용처]
 * - 오늘 탭 (index.tsx)에서 useEffect로 자동 실행
 * - CrisisBanner 컴포넌트에 상태 전달
 *
 * [알림 조건]
 * - BTC 24시간 변동률 -3% 이상
 * - 또는 sentiment = 'BEARISH' + BTC -2% 이상
 * - 레벨별 최대 알림 횟수 제한 (AsyncStorage)
 */

import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSharedBitcoin } from './useSharedAnalysis';
import {
  detectCrisis,
  type CrisisLevel,
  type CrisisDetectionResult,
} from '../services/crisisDetection';

// ============================================================================
// 스토리지 키
// ============================================================================

const CRISIS_ALERT_KEY = '@baln:crisis_alert_data';

// ============================================================================
// 레벨별 알림 템플릿 (Gemini 없이 로컬)
// ============================================================================

const CRISIS_TEMPLATES: Record<string, { title: string; body: string }> = {
  moderate: {
    title: '📉 시장 변동 알림',
    body: '비트코인이 {change}% 하락했어요. 맥락 카드에서 자세한 분석을 확인하세요.',
  },
  severe: {
    title: '⚠️ 시장 급락 경고',
    body: '비트코인 {change}% 급락! 당신의 포트폴리오에 약 {impact}% 영향. 침착하게 맥락을 확인하세요.',
  },
  extreme: {
    title: '🚨 시장 위기 알림',
    body: '비트코인 {change}% 폭락 중! 2008년 금융위기 수준. 패닉셀 하지 마세요 — 맥락 카드를 먼저 확인하세요.',
  },
};

// 레벨별 하루 최대 알림 횟수
const MAX_ALERTS_PER_DAY: Record<string, number> = {
  moderate: 1,
  severe: 2,
  extreme: 4,
};

// ============================================================================
// 알림 추적 데이터 (AsyncStorage 저장용)
// ============================================================================

interface CrisisAlertData {
  /** 마지막 알림 날짜 (YYYY-MM-DD) */
  date: string;
  /** 오늘 발송한 알림 횟수 */
  alertCount: number;
  /** 마지막 알림 시간 (ISO) */
  lastAlertTime: string;
}

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
 * 위기 감지 + 레벨별 자동 알림 훅
 *
 * [흐름]
 * 1. 비트코인 가격 데이터 구독 (useSharedBitcoinPrice)
 * 2. 위기 감지 (detectCrisis)
 * 3. 위기 감지 시 → 레벨별 알림 횟수 확인
 * 4. 횟수 여유 있으면 → 레벨별 템플릿 알림 발송
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
  const { data: btcPrice, isLoading: btcLoading } = useSharedBitcoin();

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

    // 위기 감지 시 레벨별 알림 발송
    if (result.isInCrisis) {
      sendCrisisNotificationByLevel(result).catch((err) => {
        console.error('[위기 알림] 발송 실패:', err);
      });
    }
  }, [btcPrice, btcLoading]);

  return crisisState;
}

// ============================================================================
// 레벨별 알림 발송 로직
// ============================================================================

/**
 * 위기 알림 발송 (레벨별 빈도 제한)
 * @param crisis - 위기 감지 결과
 *
 * [레벨별 분기 로직]
 * - moderate: 하루 1회만
 * - severe: 하루 2회까지
 * - extreme: 하루 4회까지
 *
 * [중복 방지]
 * 1. AsyncStorage에서 오늘 알림 데이터 조회
 * 2. 날짜가 다르면 → 카운트 리셋
 * 3. 레벨별 최대 횟수 미만이면 → 알림 발송 + 카운트 증가
 */
async function sendCrisisNotificationByLevel(
  crisis: CrisisDetectionResult
): Promise<void> {
  try {
    // 1) 현재 알림 데이터 조회
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const stored = await AsyncStorage.getItem(CRISIS_ALERT_KEY);
    let alertData: CrisisAlertData = stored
      ? JSON.parse(stored)
      : { date: '', alertCount: 0, lastAlertTime: '' };

    // 2) 날짜가 다르면 카운트 리셋
    if (alertData.date !== today) {
      alertData = { date: today, alertCount: 0, lastAlertTime: '' };
    }

    // 3) 레벨별 최대 횟수 확인
    const maxAlerts = MAX_ALERTS_PER_DAY[crisis.level] || 1;
    if (alertData.alertCount >= maxAlerts) {
      if (__DEV__) console.log(
        `[위기 알림] ${crisis.level} 레벨 오늘 최대 ${maxAlerts}회 초과, skip (현재 ${alertData.alertCount}회)`
      );
      return;
    }

    // 4) 마지막 알림 후 최소 간격 확인 (최소 1시간)
    if (alertData.lastAlertTime) {
      const lastTime = new Date(alertData.lastAlertTime).getTime();
      const now = Date.now();
      const hoursSinceLast = (now - lastTime) / (1000 * 60 * 60);
      if (hoursSinceLast < 1) {
        if (__DEV__) console.log('[위기 알림] 마지막 알림 후 1시간 미경과, skip');
        return;
      }
    }

    // 5) 알림 권한 확인
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      if (__DEV__) console.log('[위기 알림] 권한 없음, skip');
      return;
    }

    // 6) 템플릿 기반 알림 생성
    const template = CRISIS_TEMPLATES[crisis.level];
    if (!template) {
      if (__DEV__) console.log('[위기 알림] 템플릿 없음:', crisis.level);
      return;
    }

    // 변수 치환
    const changeStr = crisis.primaryChange
      ? Math.abs(crisis.primaryChange).toFixed(1)
      : '?';
    // 포트폴리오 영향도 추정 (BTC 변동의 20~30% 가정)
    const impactStr = crisis.primaryChange
      ? (Math.abs(crisis.primaryChange) * 0.25).toFixed(1)
      : '?';

    const title = template.title;
    const body = template.body
      .replace('{change}', changeStr)
      .replace('{impact}', impactStr);

    // 7) 로컬 알림 스케줄 (즉시 발송)
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
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

    // 8) 알림 데이터 업데이트
    alertData.alertCount += 1;
    alertData.lastAlertTime = new Date().toISOString();
    await AsyncStorage.setItem(CRISIS_ALERT_KEY, JSON.stringify(alertData));

    if (__DEV__) console.log(
      `[위기 알림] ${crisis.level} 발송 완료 (오늘 ${alertData.alertCount}/${maxAlerts}회)`,
      crisis.primaryMarket
    );
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
