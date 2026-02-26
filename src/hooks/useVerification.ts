/**
 * useVerification — 자산 인증 상태 조회 훅
 *
 * 역할: profiles 테이블에서 is_verified, verified_at 조회
 * staleTime 5분
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVerificationStatus, type VerificationStatus } from '../services/verificationService';

/**
 * 현재 사용자의 자산 인증 상태 조회
 */
export function useVerificationStatus() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['verificationStatus'],
    queryFn: getVerificationStatus,
    staleTime: 5 * 60 * 1000, // 5분
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['verificationStatus'] });
  };

  return {
    ...query,
    data: query.data || {
      isVerified: false,
      verifiedAt: null,
      verificationMethod: null,
      isExpired: false,
    } as VerificationStatus,
    invalidate,
  };
}
