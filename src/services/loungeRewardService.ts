/**
 * loungeRewardService.ts - 라운지 게시물 보상 서비스
 *
 * 역할: "라운지 보상 자판기" — 게시물 작성, 베스트 답변, 좋아요 달성 시 크레딧 지급
 * - rewardService.ts 패턴 복제 (AsyncStorage dedup + add_credits RPC)
 * - 모든 보상은 fire-and-forget (실패해도 게시물/댓글에 영향 없음)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { getCurrentUser } from './supabase';

// ============================================================================
// 상수
// ============================================================================

/** 보상 크레딧 금액 */
export const LOUNGE_REWARD_AMOUNTS = {
  postWrite: 3,       // 게시물 작성: 3C (₩300)
  bestAnswer: 5,      // 베스트 답변 채택: 5C (₩500)
  tenLikes: 3,        // 10 좋아요 달성: 3C (₩300)
} as const;

/** 일일 제한 */
const DAILY_LIMITS = {
  postWrite: 3,       // 하루 3회까지
} as const;

/** AsyncStorage 키 */
const KEYS = {
  postWriteCount: '@baln:lounge_post_write_',     // + YYYY-MM-DD
  bestAnswerGranted: '@baln:lounge_best_answer_',  // + commentId
  tenLikesGranted: '@baln:lounge_ten_likes_',      // + postId
} as const;

// ============================================================================
// 유틸리티
// ============================================================================

/** 오늘 날짜 키 (KST) */
function getTodayKey(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** add_credits RPC 호출 (최대 2회 재시도) */
async function grantCredits(
  userId: string,
  amount: number,
  rewardType: string,
  metadata: Record<string, unknown> = {},
): Promise<{ success: boolean; newBalance: number }> {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.rpc('add_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_type: 'bonus',
        p_metadata: { reward_type: rewardType, ...metadata },
      });

      if (error) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        console.warn(`[LoungeReward] add_credits 최종 실패 (${rewardType}):`, error.message);
        return { success: false, newBalance: 0 };
      }

      const row = data?.[0];
      return { success: row?.success ?? false, newBalance: row?.new_balance ?? 0 };
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      console.warn(`[LoungeReward] grantCredits 예외 (${rewardType}):`, err);
      return { success: false, newBalance: 0 };
    }
  }
  return { success: false, newBalance: 0 };
}

// ============================================================================
// 게시물 작성 보상 (3C, 일 3회)
// ============================================================================

export async function grantPostWriteReward(): Promise<{
  success: boolean;
  creditsEarned: number;
}> {
  const today = getTodayKey();
  const countKey = `${KEYS.postWriteCount}${today}`;

  try {
    // 일일 횟수 체크
    const raw = await AsyncStorage.getItem(countKey);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= DAILY_LIMITS.postWrite) {
      return { success: false, creditsEarned: 0 };
    }

    const user = await getCurrentUser();
    if (!user) return { success: false, creditsEarned: 0 };

    // 횟수 선증가 (동시 호출 방어)
    await AsyncStorage.setItem(countKey, (count + 1).toString());

    const result = await grantCredits(user.id, LOUNGE_REWARD_AMOUNTS.postWrite, 'lounge_post_write', {
      date: today,
    });

    if (!result.success) {
      // RPC 실패 시 롤백
      await AsyncStorage.setItem(countKey, count.toString());
    }

    return {
      success: result.success,
      creditsEarned: result.success ? LOUNGE_REWARD_AMOUNTS.postWrite : 0,
    };
  } catch (err) {
    console.warn('[LoungeReward] 게시물 작성 보상 실패:', err);
    return { success: false, creditsEarned: 0 };
  }
}

// ============================================================================
// 베스트 답변 보상 (5C, 댓글당 1회)
// ============================================================================

export async function grantBestAnswerReward(commentUserId: string): Promise<{
  success: boolean;
  creditsEarned: number;
}> {
  try {
    const key = `${KEYS.bestAnswerGranted}${commentUserId}_${getTodayKey()}`;

    // 이미 지급 확인
    const already = await AsyncStorage.getItem(key);
    if (already === 'granted' || already === 'pending') {
      return { success: false, creditsEarned: 0 };
    }

    // pending 마킹
    await AsyncStorage.setItem(key, 'pending');

    const result = await grantCredits(commentUserId, LOUNGE_REWARD_AMOUNTS.bestAnswer, 'lounge_best_answer');

    if (result.success) {
      await AsyncStorage.setItem(key, 'granted');
    } else {
      await AsyncStorage.removeItem(key);
    }

    return {
      success: result.success,
      creditsEarned: result.success ? LOUNGE_REWARD_AMOUNTS.bestAnswer : 0,
    };
  } catch (err) {
    console.warn('[LoungeReward] 베스트 답변 보상 실패:', err);
    return { success: false, creditsEarned: 0 };
  }
}

// ============================================================================
// 10 좋아요 달성 보상 (3C, 게시물당 1회)
// ============================================================================

export async function grantLikeMilestoneReward(postId: string): Promise<{
  success: boolean;
  creditsEarned: number;
}> {
  try {
    const key = `${KEYS.tenLikesGranted}${postId}`;

    // 이미 지급 확인
    const already = await AsyncStorage.getItem(key);
    if (already === 'granted' || already === 'pending') {
      return { success: false, creditsEarned: 0 };
    }

    // pending 마킹
    await AsyncStorage.setItem(key, 'pending');

    const user = await getCurrentUser();
    if (!user) {
      await AsyncStorage.removeItem(key);
      return { success: false, creditsEarned: 0 };
    }

    const result = await grantCredits(user.id, LOUNGE_REWARD_AMOUNTS.tenLikes, 'lounge_ten_likes', {
      post_id: postId,
    });

    if (result.success) {
      await AsyncStorage.setItem(key, 'granted');
    } else {
      await AsyncStorage.removeItem(key);
    }

    return {
      success: result.success,
      creditsEarned: result.success ? LOUNGE_REWARD_AMOUNTS.tenLikes : 0,
    };
  } catch (err) {
    console.warn('[LoungeReward] 10좋아요 보상 실패:', err);
    return { success: false, creditsEarned: 0 };
  }
}
