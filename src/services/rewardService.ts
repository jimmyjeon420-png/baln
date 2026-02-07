/**
 * rewardService.ts - 보상 관리 서비스
 *
 * 역할: "보상 관리 부서"
 * - 매일 출석 체크 → 2 크레딧
 * - 인스타 공유 보상 → 3 크레딧 (1일 1회)
 * - 신규 가입 웰컴 보너스 → 10 크레딧
 * - AsyncStorage로 로컬 추적 + add_credits RPC로 실제 지급
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabase';

// ============================================================================
// 상수 정의
// ============================================================================

/** 보상 크레딧 금액 */
export const REWARD_AMOUNTS = {
  dailyCheckIn: 2,    // 매일 출석: 2크레딧 (₩200)
  shareCard: 3,       // 인스타 공유: 3크레딧 (₩300)
  welcomeBonus: 10,   // 신규 가입: 10크레딧 (₩1,000)
} as const;

/** AsyncStorage 키 */
const KEYS = {
  dailyCheckIn: 'reward_daily_checkin',
  dailyShare: 'reward_daily_share',
  welcomeBonus: 'reward_welcome_bonus',
  checkInStreak: 'reward_checkin_streak',
} as const;

// ============================================================================
// 유틸리티
// ============================================================================

/** 오늘 날짜 키 (YYYY-MM-DD) */
function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 어제 날짜 키 */
function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** add_credits RPC 호출 (보상 타입) */
async function grantRewardCredits(
  userId: string,
  amount: number,
  rewardType: string,
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; newBalance: number }> {
  const { data, error } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_type: 'bonus',
    p_metadata: { reward_type: rewardType, ...metadata },
  });

  if (error) {
    console.error(`[Reward] ${rewardType} 지급 실패:`, error);
    return { success: false, newBalance: 0 };
  }

  const row = data?.[0];
  return { success: row?.success ?? false, newBalance: row?.new_balance ?? 0 };
}

// ============================================================================
// 매일 출석 체크 (Daily Check-in)
// ============================================================================

/** 오늘 출석 체크 했는지 확인 */
export async function getDailyCheckInStatus(): Promise<{
  checkedIn: boolean;
  streak: number;
}> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.dailyCheckIn);
    const streakRaw = await AsyncStorage.getItem(KEYS.checkInStreak);
    const streak = streakRaw ? parseInt(streakRaw, 10) : 0;

    if (raw === getTodayKey()) {
      return { checkedIn: true, streak };
    }
    return { checkedIn: false, streak };
  } catch {
    return { checkedIn: false, streak: 0 };
  }
}

/** 출석 체크 실행 → 크레딧 지급 */
export async function performDailyCheckIn(): Promise<{
  success: boolean;
  creditsEarned: number;
  newStreak: number;
  newBalance: number;
}> {
  try {
    // 이미 체크인 했는지 확인
    const { checkedIn } = await getDailyCheckInStatus();
    if (checkedIn) {
      return { success: false, creditsEarned: 0, newStreak: 0, newBalance: 0 };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, creditsEarned: 0, newStreak: 0, newBalance: 0 };

    // 연속 출석 계산
    const prevDate = await AsyncStorage.getItem(KEYS.dailyCheckIn);
    const prevStreak = await AsyncStorage.getItem(KEYS.checkInStreak);
    let streak = prevStreak ? parseInt(prevStreak, 10) : 0;

    if (prevDate === getYesterdayKey()) {
      streak += 1; // 어제 체크인 → 연속 +1
    } else {
      streak = 1; // 처음이거나 연속 끊김
    }

    // 크레딧 지급
    const result = await grantRewardCredits(user.id, REWARD_AMOUNTS.dailyCheckIn, 'daily_checkin', {
      streak,
      date: getTodayKey(),
    });

    if (result.success) {
      // AsyncStorage 업데이트
      await AsyncStorage.setItem(KEYS.dailyCheckIn, getTodayKey());
      await AsyncStorage.setItem(KEYS.checkInStreak, streak.toString());
    }

    return {
      success: result.success,
      creditsEarned: result.success ? REWARD_AMOUNTS.dailyCheckIn : 0,
      newStreak: streak,
      newBalance: result.newBalance,
    };
  } catch (err) {
    console.error('[Reward] 출석 체크 실패:', err);
    return { success: false, creditsEarned: 0, newStreak: 0, newBalance: 0 };
  }
}

// ============================================================================
// 인스타그램 공유 보상
// ============================================================================

/** 오늘 공유 보상 받았는지 확인 */
export async function getShareRewardStatus(): Promise<{
  rewarded: boolean;
}> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.dailyShare);
    return { rewarded: raw === getTodayKey() };
  } catch {
    return { rewarded: false };
  }
}

/** 공유 완료 후 보상 지급 (1일 1회) */
export async function grantShareReward(): Promise<{
  success: boolean;
  creditsEarned: number;
  newBalance: number;
  alreadyRewarded: boolean;
}> {
  try {
    // 오늘 이미 받았는지 확인
    const { rewarded } = await getShareRewardStatus();
    if (rewarded) {
      return { success: false, creditsEarned: 0, newBalance: 0, alreadyRewarded: true };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, creditsEarned: 0, newBalance: 0, alreadyRewarded: false };

    // 크레딧 지급
    const result = await grantRewardCredits(user.id, REWARD_AMOUNTS.shareCard, 'share_card', {
      date: getTodayKey(),
    });

    if (result.success) {
      await AsyncStorage.setItem(KEYS.dailyShare, getTodayKey());
    }

    return {
      success: result.success,
      creditsEarned: result.success ? REWARD_AMOUNTS.shareCard : 0,
      newBalance: result.newBalance,
      alreadyRewarded: false,
    };
  } catch (err) {
    console.error('[Reward] 공유 보상 실패:', err);
    return { success: false, creditsEarned: 0, newBalance: 0, alreadyRewarded: false };
  }
}

// ============================================================================
// 웰컴 보너스 (신규 가입 시 1회)
// ============================================================================

/** 웰컴 보너스 지급 여부 확인 */
export async function getWelcomeBonusStatus(): Promise<{
  received: boolean;
}> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.welcomeBonus);
    return { received: raw === 'granted' };
  } catch {
    return { received: false };
  }
}

/** 웰컴 보너스 지급 (앱 첫 실행 시 1회) */
export async function grantWelcomeBonus(): Promise<{
  success: boolean;
  creditsEarned: number;
  newBalance: number;
  alreadyReceived: boolean;
}> {
  try {
    const { received } = await getWelcomeBonusStatus();
    if (received) {
      return { success: false, creditsEarned: 0, newBalance: 0, alreadyReceived: true };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, creditsEarned: 0, newBalance: 0, alreadyReceived: false };

    const result = await grantRewardCredits(user.id, REWARD_AMOUNTS.welcomeBonus, 'welcome_bonus');

    if (result.success) {
      await AsyncStorage.setItem(KEYS.welcomeBonus, 'granted');
    }

    return {
      success: result.success,
      creditsEarned: result.success ? REWARD_AMOUNTS.welcomeBonus : 0,
      newBalance: result.newBalance,
      alreadyReceived: false,
    };
  } catch (err) {
    console.error('[Reward] 웰컴 보너스 실패:', err);
    return { success: false, creditsEarned: 0, newBalance: 0, alreadyReceived: false };
  }
}
