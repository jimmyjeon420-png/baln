/**
 * Credit Service - 크레딧 "은행" 서비스
 * 잔액 조회, 원자적 차감 (RPC), 충전, 거래 내역, 티어 할인 계산
 */

import supabase from './supabase';
import {
  type AIFeatureType,
  type CreditTransaction,
  type UserCredits,
  FEATURE_COSTS,
  TIER_DISCOUNTS,
  SUBSCRIPTION_MONTHLY_BONUS,
  CREDIT_PACKAGES,
} from '../types/marketplace';
import { UserTier } from '../types/database';

// ============================================================================
// 잔액 조회
// ============================================================================

/** 내 크레딧 잔액 조회 (에러 시 기본값 반환 — 화면 로딩 차단 방지) */
export async function getMyCredits(): Promise<UserCredits | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 레코드 없음 또는 테이블 미존재 → 기본값 반환
    if (error) {
      if (error.code !== 'PGRST116') {
        console.warn('[Credits] 조회 실패 (기본값 사용):', error.message);
      }
      return {
        user_id: user.id,
        balance: 0,
        lifetime_purchased: 0,
        lifetime_spent: 0,
        last_bonus_at: null,
        updated_at: new Date().toISOString(),
      };
    }

    return data as UserCredits;
  } catch (err) {
    console.warn('[Credits] 조회 실패 (기본값 사용):', err);
    return {
      user_id: 'unknown',
      balance: 0,
      lifetime_purchased: 0,
      lifetime_spent: 0,
      last_bonus_at: null,
      updated_at: new Date().toISOString(),
    };
  }
}

// ============================================================================
// 크레딧 차감 (원자적 - Supabase RPC)
// ============================================================================

interface SpendResult {
  success: boolean;
  newBalance: number;
  errorMessage?: string;
}

/** 크레딧 차감 (RPC 호출 → FOR UPDATE 락) */
export async function spendCredits(
  amount: number,
  featureType: AIFeatureType,
  featureRefId?: string
): Promise<SpendResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const { data, error } = await supabase.rpc('spend_credits', {
    p_user_id: user.id,
    p_amount: amount,
    p_feature_type: featureType,
    p_feature_ref_id: featureRefId || null,
  });

  if (error) throw error;

  const row = data?.[0];
  if (!row) throw new Error('크레딧 차감 실패');

  return {
    success: row.success,
    newBalance: row.new_balance,
    errorMessage: row.error_message || undefined,
  };
}

// ============================================================================
// 크레딧 충전
// ============================================================================

interface PurchaseResult {
  success: boolean;
  newBalance: number;
  totalCredits: number; // 패키지 크레딧 + 보너스
}

/** 크레딧 패키지 구매 (현재: 시뮬레이션, 향후: RevenueCat IAP 연동) */
export async function purchaseCredits(
  packageId: string,
  iapReceiptId?: string
): Promise<PurchaseResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) throw new Error('유효하지 않은 패키지입니다');

  const totalCredits = pkg.credits + pkg.bonus;

  const { data, error } = await supabase.rpc('add_credits', {
    p_user_id: user.id,
    p_amount: totalCredits,
    p_type: 'purchase',
    p_metadata: {
      package_id: packageId,
      package_name: pkg.name,
      credits: pkg.credits,
      bonus: pkg.bonus,
      price: pkg.price,
      iap_receipt_id: iapReceiptId || null,
    },
  });

  if (error) throw error;

  const row = data?.[0];
  return {
    success: row?.success ?? false,
    newBalance: row?.new_balance ?? 0,
    totalCredits,
  };
}

// ============================================================================
// 거래 내역
// ============================================================================

/** 크레딧 거래 내역 조회 */
export async function getCreditHistory(
  limit: number = 20
): Promise<CreditTransaction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as CreditTransaction[];
}

// ============================================================================
// 티어 할인 계산
// ============================================================================

/** 티어 할인이 적용된 기능 비용 계산 */
export function getDiscountedCost(
  featureType: AIFeatureType,
  userTier: UserTier
): { originalCost: number; discountedCost: number; discountPercent: number } {
  const originalCost = FEATURE_COSTS[featureType];
  const discountPercent = TIER_DISCOUNTS[userTier];
  const discountedCost = Math.round(originalCost * (1 - discountPercent / 100));

  return { originalCost, discountedCost, discountPercent };
}

// ============================================================================
// 구독자 월 보너스
// ============================================================================

/** 구독자 월 보너스 지급 (앱 시작 시 1회 체크) */
export async function checkAndGrantSubscriptionBonus(): Promise<{
  granted: boolean;
  amount: number;
  newBalance: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { granted: false, amount: 0, newBalance: 0 };

  // 프로필에서 구독 상태 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_type, premium_expires_at')
    .eq('id', user.id)
    .single();

  // 무료 사용자는 보너스 없음
  if (!profile || profile.plan_type === 'free') {
    return { granted: false, amount: 0, newBalance: 0 };
  }

  // 구독 만료 체크
  if (profile.premium_expires_at && new Date(profile.premium_expires_at) < new Date()) {
    return { granted: false, amount: 0, newBalance: 0 };
  }

  // 이번 달 이미 지급했는지 체크
  const { data: credits } = await supabase
    .from('user_credits')
    .select('last_bonus_at')
    .eq('user_id', user.id)
    .single();

  if (credits?.last_bonus_at) {
    const lastBonus = new Date(credits.last_bonus_at);
    const now = new Date();
    // 같은 달이면 이미 지급됨
    if (
      lastBonus.getFullYear() === now.getFullYear() &&
      lastBonus.getMonth() === now.getMonth()
    ) {
      return { granted: false, amount: 0, newBalance: 0 };
    }
  }

  // 보너스 지급
  const { data, error } = await supabase.rpc('add_credits', {
    p_user_id: user.id,
    p_amount: SUBSCRIPTION_MONTHLY_BONUS,
    p_type: 'subscription_bonus',
    p_metadata: {
      month: new Date().toISOString().slice(0, 7), // "2026-02"
      plan_type: profile.plan_type,
    },
  });

  if (error) {
    console.error('구독 보너스 지급 실패:', error);
    return { granted: false, amount: 0, newBalance: 0 };
  }

  const row = data?.[0];
  return {
    granted: true,
    amount: SUBSCRIPTION_MONTHLY_BONUS,
    newBalance: row?.new_balance ?? 0,
  };
}

// ============================================================================
// 크레딧 환불 (AI 실패 시)
// ============================================================================

/** 크레딧 환불 */
export async function refundCredits(
  amount: number,
  featureType: AIFeatureType,
  reason?: string
): Promise<{ success: boolean; newBalance: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const { data, error } = await supabase.rpc('add_credits', {
    p_user_id: user.id,
    p_amount: amount,
    p_type: 'refund',
    p_metadata: {
      feature_type: featureType,
      reason: reason || 'AI 분석 실패',
    },
  });

  if (error) throw error;

  const row = data?.[0];
  return {
    success: row?.success ?? false,
    newBalance: row?.new_balance ?? 0,
  };
}
