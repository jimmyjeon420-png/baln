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
  shareCard: 5,       // 인스타 공유: 5크레딧 (₩500)
  welcomeBonus: 10,   // 신규 가입: 10크레딧 (₩1,000)
  referral: 50,       // 친구 추천: 50크레딧 (₩5,000)
} as const;

/** AsyncStorage 키 */
const KEYS = {
  dailyCheckIn: 'reward_daily_checkin',
  dailyShare: 'reward_daily_share',
  welcomeBonus: 'reward_welcome_bonus',
  checkInStreak: 'reward_checkin_streak',
  lastCheckinDate: '@baln:last_checkin_date',
  referralCode: '@baln:my_referral_code',
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
  try {
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'bonus',
      p_metadata: { reward_type: rewardType, ...metadata },
    });

    if (error) {
      console.warn(`[Reward] add_credits RPC 실패 (${rewardType}):`, error.message);
      return { success: false, newBalance: 0 };
    }

    const row = data?.[0];
    return { success: row?.success ?? false, newBalance: row?.new_balance ?? 0 };
  } catch (err) {
    console.warn(`[Reward] grantRewardCredits 예외 (${rewardType}):`, err);
    return { success: false, newBalance: 0 };
  }
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

/** 출석 체크 실행 → daily_checkin_v2 RPC (에스컬레이팅 보상 + XP) */
export async function performDailyCheckIn(): Promise<{
  success: boolean;
  creditsEarned: number;
  newStreak: number;
  newBalance: number;
  // V2 추가 필드 (optional — 기존 호출자 하위 호환)
  xpEarned?: number;
  bonusXp?: number;
  newLevel?: number;
  levelUp?: boolean;
}> {
  try {
    // 로컬 캐시로 빠른 중복 체크
    const { checkedIn } = await getDailyCheckInStatus();
    if (checkedIn) {
      return { success: false, creditsEarned: 0, newStreak: 0, newBalance: 0 };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, creditsEarned: 0, newStreak: 0, newBalance: 0 };

    // daily_checkin_v2 RPC 호출 (원자적 스트릭 + 에스컬레이팅 보상 + XP)
    let data: any = null;
    let rpcFailed = false;

    try {
      const rpcResult = await supabase.rpc('daily_checkin_v2', {
        p_user_id: user.id,
      });

      if (rpcResult.error) {
        console.warn('[Reward] daily_checkin_v2 RPC 실패 (로컬 폴백 사용):', rpcResult.error.message);
        rpcFailed = true;
      } else {
        data = rpcResult.data;
      }
    } catch (rpcErr) {
      console.warn('[Reward] daily_checkin_v2 RPC 예외 (로컬 폴백 사용):', rpcErr);
      rpcFailed = true;
    }

    // RPC 실패 시: AsyncStorage 폴백으로 로컬 체크인 기록 (애니메이션은 보여줌)
    if (rpcFailed) {
      const streakRaw = await AsyncStorage.getItem(KEYS.checkInStreak);
      const prevStreak = streakRaw ? parseInt(streakRaw, 10) : 0;
      const lastDate = await AsyncStorage.getItem(KEYS.lastCheckinDate);
      const isConsecutive = lastDate === getYesterdayKey();
      const newStreak = isConsecutive ? prevStreak + 1 : 1;

      await AsyncStorage.setItem(KEYS.dailyCheckIn, getTodayKey());
      await AsyncStorage.setItem(KEYS.lastCheckinDate, getTodayKey());
      await AsyncStorage.setItem(KEYS.checkInStreak, newStreak.toString());

      return {
        success: true,
        creditsEarned: REWARD_AMOUNTS.dailyCheckIn,
        newStreak,
        newBalance: 0,
      };
    }

    const result = data as any;

    if (!result?.success) {
      // 이미 체크인 한 경우 로컬 캐시도 동기화
      if (result?.reason === 'already_checked_in') {
        await AsyncStorage.setItem(KEYS.dailyCheckIn, getTodayKey());
        await AsyncStorage.setItem(KEYS.lastCheckinDate, getTodayKey());
        await AsyncStorage.setItem(KEYS.checkInStreak, (result.current_streak || 0).toString());
      }
      return { success: false, creditsEarned: 0, newStreak: result?.current_streak || 0, newBalance: 0 };
    }

    // AsyncStorage 로컬 캐시 업데이트 (기존 호환)
    await AsyncStorage.setItem(KEYS.dailyCheckIn, getTodayKey());
    await AsyncStorage.setItem(KEYS.lastCheckinDate, getTodayKey());
    await AsyncStorage.setItem(KEYS.checkInStreak, (result.new_streak || 1).toString());

    return {
      success: true,
      creditsEarned: result.credits_earned || REWARD_AMOUNTS.dailyCheckIn,
      newStreak: result.new_streak || 1,
      newBalance: 0, // V2에서는 별도 잔액 반환 안함
      xpEarned: result.xp_earned,
      bonusXp: result.bonus_xp,
      newLevel: result.new_level,
      levelUp: result.level_up,
    };
  } catch (err) {
    console.warn('[Reward] 출석 체크 실패:', err);
    // 최후의 폴백: 로컬에만 기록하여 사용자 경험 보존
    try {
      await AsyncStorage.setItem(KEYS.dailyCheckIn, getTodayKey());
      await AsyncStorage.setItem(KEYS.lastCheckinDate, getTodayKey());
    } catch { /* AsyncStorage 실패도 무시 */ }
    return { success: true, creditsEarned: REWARD_AMOUNTS.dailyCheckIn, newStreak: 1, newBalance: 0 };
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
    console.warn('[Reward] 공유 보상 실패:', err);
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
    console.warn('[Reward] 웰컴 보너스 실패:', err);
    return { success: false, creditsEarned: 0, newBalance: 0, alreadyReceived: false };
  }
}

// ============================================================================
// 친구 추천 코드 (Referral)
// ============================================================================

/** 내 추천 코드 생성/조회 (userId 기반 6자리) */
export async function getMyReferralCode(): Promise<string> {
  try {
    const cached = await AsyncStorage.getItem(KEYS.referralCode);
    if (cached) return cached;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '';

    // userId 앞 6자리를 대문자 코드로 사용
    const code = user.id.replace(/-/g, '').slice(0, 6).toUpperCase();
    await AsyncStorage.setItem(KEYS.referralCode, code);
    return code;
  } catch {
    return '';
  }
}

/** 추천 코드 입력 → 추천인에게 50크레딧 보상 */
export async function applyReferralCode(code: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: '로그인이 필요합니다.' };

    // 자기 자신 코드 방지
    const myCode = await getMyReferralCode();
    if (code.toUpperCase() === myCode) {
      return { success: false, message: '본인의 추천 코드는 사용할 수 없습니다.' };
    }

    // 이미 추천 코드를 사용했는지 확인
    const alreadyUsed = await AsyncStorage.getItem('@baln:referral_used');
    if (alreadyUsed) {
      return { success: false, message: '이미 추천 코드를 사용했습니다.' };
    }

    // 추천인 찾기 (코드 = userId 앞 6자리)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('id', `${code.toLowerCase()}%`)
      .limit(1);

    if (error || !profiles || profiles.length === 0) {
      return { success: false, message: '유효하지 않은 추천 코드입니다.' };
    }

    const referrerId = profiles[0].id;

    // 추천인에게 50크레딧 지급
    const referrerResult = await grantRewardCredits(referrerId, REWARD_AMOUNTS.referral, 'referral_reward', {
      referred_user_id: user.id,
      code,
    });

    // 피추천인(나)에게도 10크레딧 보너스
    await grantRewardCredits(user.id, 10, 'referral_bonus', {
      referrer_id: referrerId,
      code,
    });

    if (referrerResult.success) {
      await AsyncStorage.setItem('@baln:referral_used', 'true');
    }

    return {
      success: referrerResult.success,
      message: referrerResult.success
        ? '추천 코드가 적용되었습니다! 10크레딧을 받았어요.'
        : '추천 코드 적용에 실패했습니다.',
    };
  } catch (err) {
    console.warn('[Reward] 추천 코드 적용 실패:', err);
    return { success: false, message: '오류가 발생했습니다.' };
  }
}
