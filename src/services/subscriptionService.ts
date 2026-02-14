/**
 * subscriptionService.ts - 구독 관리 서비스
 *
 * 역할: "구독 관리 부서"
 * - 1개월 무료 체험 활성화
 * - 구독 상태 조회 (활성/만료/미시작)
 * - 만료 시 자동 다운그레이드
 * - 향후 RevenueCat 유료 결제 연동 placeholder
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabase';
import { DAILY_FREE_ANALYSIS } from '../types/marketplace';
import { isFreePeriod } from '../config/freePeriod';

// 구독 상태 타입
export interface SubscriptionStatus {
  isPremium: boolean;        // 현재 프리미엄 활성 상태인지
  isTrialActive: boolean;    // 무료 체험 기간 중인지
  isTrialExpired: boolean;   // 체험이 만료되었는지 (한번이라도 체험했으면)
  trialDaysLeft: number;     // 남은 체험 일수 (0이면 만료/미시작)
  expiresAt: string | null;  // 만료일 ISO 문자열
  planType: 'free' | 'premium' | 'vip';
}

// 기본 상태 (비로그인 또는 에러 시)
const DEFAULT_STATUS: SubscriptionStatus = {
  isPremium: false,
  isTrialActive: false,
  isTrialExpired: false,
  trialDaysLeft: 0,
  expiresAt: null,
  planType: 'free',
};

/**
 * 무료 체험 활성화
 * - profiles 테이블의 plan_type을 'premium'으로 변경
 * - premium_expires_at을 현재 시점 + 30일로 설정
 * - 이미 premium이면 중복 활성화 방지
 */
export async function activateFreeTrial(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 현재 상태 먼저 확인 (중복 방지)
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('plan_type, premium_expires_at')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return { success: false, error: '프로필 조회 실패' };
    }

    // 이미 활성 프리미엄이면 중복 활성화 방지
    if (profile?.plan_type === 'premium' && profile?.premium_expires_at) {
      const expiresAt = new Date(profile.premium_expires_at);
      if (expiresAt > new Date()) {
        return { success: false, error: '이미 Premium이 활성화되어 있습니다' };
      }
    }

    // 30일 후 만료일 계산
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // profiles 업데이트
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan_type: 'premium',
        premium_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: '체험 활성화 실패' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: '알 수 없는 오류가 발생했습니다' };
  }
}

/**
 * 구독 상태 조회
 * - DB에서 plan_type, premium_expires_at 확인
 * - 만료되었으면 자동으로 'free'로 다운그레이드
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  // 무료 기간: 모든 유저를 프리미엄으로 취급
  if (isFreePeriod()) {
    return {
      isPremium: true,
      isTrialActive: true,
      isTrialExpired: false,
      trialDaysLeft: 999,
      expiresAt: null,
      planType: 'premium',
    };
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan_type, premium_expires_at')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return DEFAULT_STATUS;
    }

    const now = new Date();
    const planType = profile.plan_type as 'free' | 'premium' | 'vip';
    const expiresAt = profile.premium_expires_at;

    // premium이고 만료일이 있는 경우
    if (planType === 'premium' && expiresAt) {
      const expiresDate = new Date(expiresAt);
      const diffMs = expiresDate.getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      if (daysLeft > 0) {
        // 체험 활성 상태
        return {
          isPremium: true,
          isTrialActive: true,
          isTrialExpired: false,
          trialDaysLeft: daysLeft,
          expiresAt,
          planType: 'premium',
        };
      } else {
        // 만료됨 → 자동 다운그레이드
        await supabase
          .from('profiles')
          .update({ plan_type: 'free' })
          .eq('id', userId);

        return {
          isPremium: false,
          isTrialActive: false,
          isTrialExpired: true,
          trialDaysLeft: 0,
          expiresAt,
          planType: 'free',
        };
      }
    }

    // free 사용자인데 만료일이 과거에 있으면 → 체험 만료 상태
    if (planType === 'free' && expiresAt) {
      return {
        isPremium: false,
        isTrialActive: false,
        isTrialExpired: true,
        trialDaysLeft: 0,
        expiresAt,
        planType: 'free',
      };
    }

    // 체험을 한 번도 안 한 신규 사용자
    return DEFAULT_STATUS;
  } catch {
    return DEFAULT_STATUS;
  }
}

/**
 * 유료 구독 전환 (placeholder)
 * - 향후 RevenueCat 또는 인앱결제 연동 시 구현
 * - period: 'monthly' | 'yearly'
 */
export async function upgradeToPaid(
  userId: string,
  period: 'monthly' | 'yearly'
): Promise<{ success: boolean; error?: string }> {
  // TODO: RevenueCat 연동
  if (__DEV__) console.log(`[구독] 유료 전환 요청: userId=${userId}, period=${period}`);
  return { success: false, error: '현재 무료 체험 기간입니다. 모든 기능을 무료로 이용하실 수 있습니다!' };
}

// ============================================================================
// 매일 무료 진단 시스템 (네이버 웹툰 "기다리면 무료" 방식)
// ============================================================================

const FREE_ANALYSIS_KEY = 'daily_free_analysis';

/** 오늘 날짜 키 (YYYY-MM-DD) */
function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 오늘의 무료 진단 사용 현황 조회 */
export async function getDailyFreeStatus(isPremium: boolean): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  // 무료 기간: 무제한 진단
  if (isFreePeriod()) {
    return { used: 0, limit: 999, remaining: 999 };
  }

  const limit = isPremium ? DAILY_FREE_ANALYSIS.subscriber : DAILY_FREE_ANALYSIS.free;

  try {
    const raw = await AsyncStorage.getItem(FREE_ANALYSIS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === getTodayKey()) {
        const used = data.count || 0;
        return { used, limit, remaining: Math.max(0, limit - used) };
      }
    }
  } catch (err) {
    console.warn('[구독] 무료 진단 현황 조회 실패:', err);
  }

  // 새 날이거나 데이터 없으면 0회 사용
  return { used: 0, limit, remaining: limit };
}

/** 무료 진단 1회 사용 처리 (true=성공, false=소진됨) */
export async function useDailyFreeAnalysis(isPremium: boolean): Promise<boolean> {
  const { remaining } = await getDailyFreeStatus(isPremium);
  if (remaining <= 0) return false;

  try {
    const raw = await AsyncStorage.getItem(FREE_ANALYSIS_KEY);
    let count = 0;
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === getTodayKey()) {
        count = data.count || 0;
      }
    }
    await AsyncStorage.setItem(
      FREE_ANALYSIS_KEY,
      JSON.stringify({ date: getTodayKey(), count: count + 1 })
    );
    return true;
  } catch {
    return false;
  }
}
