/**
 * verificationService.ts - 스크린샷 자산 인증 서비스
 *
 * 역할: "자산 감사팀" — 증권사 스크린샷을 Gemini Vision으로 파싱하여
 *       자기 신고 자산과 비교 → ±30% 이내면 인증 완료
 *
 * - gemini-proxy 'parse-screenshot' 타입 재활용
 * - 인증 유효기간: 30일
 * - verify_user_assets RPC로 profiles 업데이트
 */

import supabase, { getCurrentUser } from './supabase';

// ============================================================================
// 상수
// ============================================================================

/** 인증 오차 허용 범위 (±30%) */
const TOLERANCE = 0.3;

/** 인증 유효기간 (30일, ms) */
const VERIFICATION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// ============================================================================
// 타입
// ============================================================================

export interface VerificationResult {
  success: boolean;
  parsedTotal: number;
  portfolioTotal: number;
  diffPercent: number;
  message: string;
}

export interface VerificationStatus {
  isVerified: boolean;
  verifiedAt: string | null;
  verificationMethod: string | null;
  isExpired: boolean;
}

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * 스크린샷 기반 자산 인증
 *
 * 1. Gemini Vision으로 스크린샷 파싱
 * 2. 파싱된 자산 합산
 * 3. useSharedPortfolio의 totalAssets와 비교
 * 4. 오차 ≤30%면 verify_user_assets RPC 호출 → profiles.is_verified = true
 */
export async function requestVerification(
  imageBase64: string,
  mimeType: string,
  portfolioTotal: number,
): Promise<VerificationResult> {
  try {
    // 1. Gemini 호출 (parse-screenshot)
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: {
        type: 'parse-screenshot',
        data: {
          imageBase64,
          mimeType,
        },
      },
    });

    if (error) {
      return {
        success: false,
        parsedTotal: 0,
        portfolioTotal,
        diffPercent: 0,
        message: '스크린샷 분석에 실패했습니다. 다시 시도해주세요.',
      };
    }

    // 2. 파싱 결과에서 자산 합산
    const result = data?.data?.result ?? data?.result;
    let parsed: { assets?: { currentValueKRW?: number; totalCostKRW?: number }[] };

    if (typeof result === 'string') {
      const cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } else {
      parsed = result || {};
    }

    const assets = parsed.assets || [];
    const parsedTotal = assets.reduce((sum, asset) => {
      return sum + (asset.currentValueKRW || asset.totalCostKRW || 0);
    }, 0);

    if (parsedTotal <= 0) {
      return {
        success: false,
        parsedTotal: 0,
        portfolioTotal,
        diffPercent: 0,
        message: '스크린샷에서 자산을 인식할 수 없습니다. 증권사 앱의 자산 현황 화면을 촬영해주세요.',
      };
    }

    // 3. 오차 계산
    const diff = Math.abs(parsedTotal - portfolioTotal);
    const baseAmount = Math.max(parsedTotal, portfolioTotal, 1);
    const diffPercent = (diff / baseAmount) * 100;
    const withinTolerance = diffPercent <= TOLERANCE * 100;

    if (!withinTolerance) {
      return {
        success: false,
        parsedTotal,
        portfolioTotal,
        diffPercent: Math.round(diffPercent),
        message: `등록된 자산과 ${Math.round(diffPercent)}% 차이가 있습니다. 자산을 업데이트한 후 다시 시도해주세요.`,
      };
    }

    // 4. 인증 성공 → verify_user_assets RPC 호출
    const { error: rpcError } = await supabase.rpc('verify_user_assets', {
      p_verified_total: parsedTotal,
      p_method: 'screenshot',
    });

    if (rpcError) {
      console.warn('[Verification] verify_user_assets RPC 실패:', rpcError.message);
      return {
        success: false,
        parsedTotal,
        portfolioTotal,
        diffPercent: Math.round(diffPercent),
        message: '인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
      };
    }

    return {
      success: true,
      parsedTotal,
      portfolioTotal,
      diffPercent: Math.round(diffPercent),
      message: '자산 인증이 완료되었습니다!',
    };
  } catch (err) {
    console.warn('[Verification] requestVerification 실패:', err);
    return {
      success: false,
      parsedTotal: 0,
      portfolioTotal,
      diffPercent: 0,
      message: '인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
    };
  }
}

/**
 * 인증 상태 조회
 */
export async function getVerificationStatus(): Promise<VerificationStatus> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { isVerified: false, verifiedAt: null, verificationMethod: null, isExpired: false };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('is_verified, verified_at, verification_method')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return { isVerified: false, verifiedAt: null, verificationMethod: null, isExpired: false };
    }

    const isExpired = data.verified_at
      ? (Date.now() - new Date(data.verified_at).getTime()) > VERIFICATION_EXPIRY_MS
      : false;

    return {
      isVerified: !!data.is_verified && !isExpired,
      verifiedAt: data.verified_at || null,
      verificationMethod: data.verification_method || null,
      isExpired,
    };
  } catch {
    return { isVerified: false, verifiedAt: null, verificationMethod: null, isExpired: false };
  }
}
