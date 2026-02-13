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
  emotionCheck: 5,    // 감정 기록: 5크레딧 (₩500)
  welcomeBonus: 10,   // 신규 가입: 10크레딧 (₩1,000)
  assetRegistration: 20, // 자산 3개+ 등록: 20크레딧 (₩2,000)
  referral: 20,       // 친구 추천: 20크레딧 (₩2,000) — 이승건 결재: 어뷰징 방지로 50→20 하향
} as const;

/**
 * 성취 배지별 보상 크레딧 (이승건 원칙: 습관 단계에 맞춰 에스컬레이팅)
 * 총합: 128C (₩12,800) — 모든 배지 수집 시
 */
export const ACHIEVEMENT_REWARDS: Record<string, number> = {
  first_visit: 3,       // 첫 출석: 3C (₩300) — 첫 시작의 작은 기쁨
  streak_7: 10,         // 7일 연속: 10C (₩1,000) — 습관 시작 격려
  streak_30: 30,        // 30일 연속: 30C (₩3,000) — 한 달 습관 대성공
  first_correct: 5,     // 첫 적중: 5C (₩500) — 예측 게임 입문
  streak_correct_5: 15, // 5연속 적중: 15C (₩1,500) — 분석력 인정
  accuracy_80: 30,      // 적중률 80%: 30C (₩3,000) — 상위 1% 보상
  first_diagnosis: 5,   // 첫 AI 진단: 5C (₩500) — AI 기능 체험 유도
  assets_100m: 20,      // 1억 달성: 20C (₩2,000) — 자산 관리 의지
  first_share: 5,       // 첫 공유: 5C (₩500) — 바이럴 유도
  first_post: 5,        // 첫 게시글: 5C (₩500) — 커뮤니티 참여
} as const;

/** AsyncStorage 키 */
const KEYS = {
  dailyCheckIn: 'reward_daily_checkin',
  dailyShare: 'reward_daily_share',
  dailyEmotion: 'reward_daily_emotion',
  assetRegistration: 'reward_asset_registration',
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
// 성취 배지 보상 (Achievement Reward)
// ============================================================================

/** 성취 배지 해금 시 크레딧 보상 지급 (1회) */
export async function grantAchievementReward(achievementId: string): Promise<{
  success: boolean;
  creditsEarned: number;
  newBalance: number;
}> {
  try {
    const reward = ACHIEVEMENT_REWARDS[achievementId];
    if (!reward || reward <= 0) {
      return { success: false, creditsEarned: 0, newBalance: 0 };
    }

    // 이미 이 배지 보상을 받았는지 확인
    const key = `@baln:achievement_reward_${achievementId}`;
    const already = await AsyncStorage.getItem(key);
    if (already === 'granted') {
      return { success: false, creditsEarned: 0, newBalance: 0 };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, creditsEarned: 0, newBalance: 0 };

    const result = await grantRewardCredits(user.id, reward, 'achievement_reward', {
      achievement_id: achievementId,
    });

    if (result.success) {
      await AsyncStorage.setItem(key, 'granted');
    }

    return {
      success: result.success,
      creditsEarned: result.success ? reward : 0,
      newBalance: result.newBalance,
    };
  } catch (err) {
    console.warn(`[Reward] 성취 보상 실패 (${achievementId}):`, err);
    return { success: false, creditsEarned: 0, newBalance: 0 };
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
// 자산 등록 보상 (Asset Registration — 3개 이상 등록 시 1회)
// ============================================================================

/** 자산 등록 보상을 이미 받았는지 확인 */
export async function getAssetRegistrationRewardStatus(): Promise<{
  received: boolean;
}> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.assetRegistration);
    return { received: raw === 'granted' };
  } catch {
    return { received: false };
  }
}

/** 자산 3개 이상 등록 시 보상 지급 (1회) */
export async function grantAssetRegistrationReward(assetCount: number): Promise<{
  success: boolean;
  creditsEarned: number;
  newBalance: number;
}> {
  try {
    if (assetCount < 3) {
      return { success: false, creditsEarned: 0, newBalance: 0 };
    }

    const { received } = await getAssetRegistrationRewardStatus();
    if (received) {
      return { success: false, creditsEarned: 0, newBalance: 0 };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, creditsEarned: 0, newBalance: 0 };

    const result = await grantRewardCredits(user.id, REWARD_AMOUNTS.assetRegistration, 'asset_registration', {
      asset_count: assetCount,
    });

    if (result.success) {
      await AsyncStorage.setItem(KEYS.assetRegistration, 'granted');
    }

    return {
      success: result.success,
      creditsEarned: result.success ? REWARD_AMOUNTS.assetRegistration : 0,
      newBalance: result.newBalance,
    };
  } catch (err) {
    console.warn('[Reward] 자산 등록 보상 실패:', err);
    return { success: false, creditsEarned: 0, newBalance: 0 };
  }
}

// ============================================================================
// 투자 감정 기록 보상 (Emotion Check)
// ============================================================================

/** 오늘 감정 기록 보상 받았는지 확인 */
export async function getEmotionRewardStatus(): Promise<{
  rewarded: boolean;
}> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.dailyEmotion);
    return { rewarded: raw === getTodayKey() };
  } catch {
    return { rewarded: false };
  }
}

/** 감정 기록 완료 후 보상 지급 (1일 1회) */
export async function grantEmotionReward(): Promise<{
  success: boolean;
  creditsEarned: number;
  newBalance: number;
  alreadyRewarded: boolean;
}> {
  try {
    const { rewarded } = await getEmotionRewardStatus();
    if (rewarded) {
      return { success: false, creditsEarned: 0, newBalance: 0, alreadyRewarded: true };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, creditsEarned: 0, newBalance: 0, alreadyRewarded: false };

    const result = await grantRewardCredits(user.id, REWARD_AMOUNTS.emotionCheck, 'emotion_check', {
      date: getTodayKey(),
    });

    if (result.success) {
      await AsyncStorage.setItem(KEYS.dailyEmotion, getTodayKey());
    }

    return {
      success: result.success,
      creditsEarned: result.success ? REWARD_AMOUNTS.emotionCheck : 0,
      newBalance: result.newBalance,
      alreadyRewarded: false,
    };
  } catch (err) {
    console.warn('[Reward] 감정 기록 보상 실패:', err);
    return { success: false, creditsEarned: 0, newBalance: 0, alreadyRewarded: false };
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

/** 추천 코드 입력 → 추천인에게 20크레딧 보상 (조건: 피추천인 3일 연속 접속 후 지급) */
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

    // 피추천인(나)에게 즉시 10크레딧 보너스
    await grantRewardCredits(user.id, 10, 'referral_bonus', {
      referrer_id: referrerId,
      code,
    });

    // 추천인 보상은 피추천인 3일 연속 접속 후 지급 (pending으로 기록)
    // → 실제 지급은 daily-briefing Edge Function에서 streak 3일 확인 후 처리
    await AsyncStorage.setItem('@baln:referral_used', 'true');
    await AsyncStorage.setItem('@baln:referral_pending', JSON.stringify({
      referrerId,
      referredUserId: user.id,
      code,
      registeredAt: new Date().toISOString(),
      streakRequired: 3,
    }));

    return {
      success: true,
      message: '추천 코드가 적용되었습니다! 10크레딧을 받았어요.\n추천인에게는 3일 연속 접속 후 보상이 지급됩니다.',
    };
  } catch (err) {
    console.warn('[Reward] 추천 코드 적용 실패:', err);
    return { success: false, message: '오류가 발생했습니다.' };
  }
}
