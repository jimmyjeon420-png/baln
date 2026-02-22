/**
 * useGatherings Hook - 모임/스터디 마켓플레이스 기능
 * VIP 라운지 내 티어 기반 접근 제어(TBAC) 시스템
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase, { getCurrentUser } from '../services/supabase';
import {
  Gathering,
  GatheringInsert,
  GatheringParticipant,
  GatheringParticipantInsert,
  UserTier,
} from '../types/database';
import { TIER_THRESHOLDS, TIER_LABELS, TIER_LEVELS, TIER_DESCRIPTIONS } from '../types/community';

// 모임 생성 최소 자산 (1억 = Gold 티어)
const MINIMUM_ASSETS_FOR_HOSTING = 100000000;

/**
 * 자산을 "X.X억" 형식으로 변환
 */
export const formatAssetInBillion = (amount: number | null): string => {
  if (!amount) return '비공개';
  const billion = amount / 100000000;
  if (billion >= 1) {
    return `${billion.toFixed(1)}억`;
  }
  const million = amount / 10000;
  return `${million.toFixed(0)}만`;
};

/**
 * 4단계 전략적 티어 결정
 * SILVER: < 1억 (기본)
 * GOLD: 1억 ~ 5억
 * PLATINUM: 5억 ~ 10억
 * DIAMOND: 10억+
 */
export const determineTier = (totalAssets: number): UserTier => {
  if (totalAssets >= TIER_THRESHOLDS.DIAMOND) return 'DIAMOND';
  if (totalAssets >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (totalAssets >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  return 'SILVER';
};

/**
 * 티어 레벨 비교 (접근 제어용)
 * 참가자 티어가 요구 티어보다 높거나 같으면 true
 */
export const canAccessTier = (userTier: UserTier, requiredTier: UserTier): boolean => {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
};

/**
 * 호스트가 설정 가능한 최소 티어 목록 반환
 * 호스트는 자신의 티어 이하만 설정 가능
 */
export const getAvailableMinTiers = (hostTier: UserTier): UserTier[] => {
  const hostLevel = TIER_LEVELS[hostTier];
  return (['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'] as UserTier[]).filter(
    tier => TIER_LEVELS[tier] <= hostLevel
  );
};

/**
 * 티어 색상
 */
export const TIER_COLORS: Record<UserTier, string> = {
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#B9F2FF',
};

// TIER_LABELS와 TIER_DESCRIPTIONS re-export
export { TIER_LABELS, TIER_DESCRIPTIONS, TIER_LEVELS };

/**
 * 모임 목록 조회 훅
 */
export const useGatherings = (category?: Gathering['category']) => {
  return useQuery({
    queryKey: ['gatherings', category],
    queryFn: async () => {
      let query = supabase
        .from('gatherings')
        .select('*')
        .in('status', ['open', 'closed']) // 취소/완료 제외
        .order('event_date', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message || '모임 목록 조회에 실패했습니다.');
      }

      return data as Gathering[];
    },
    staleTime: 30000, // 30초 캐시
  });
};

/**
 * 단일 모임 조회 훅
 */
export const useGathering = (gatheringId: string | undefined) => {
  return useQuery({
    queryKey: ['gathering', gatheringId],
    queryFn: async () => {
      if (!gatheringId) return null;

      try {
        const { data, error } = await supabase
          .from('gatherings')
          .select('*')
          .eq('id', gatheringId)
          .single();

        if (error) {
          console.warn('[Gatherings] 모임 상세 조회 실패:', error.message);
          return null;
        }
        return data as Gathering;
      } catch (err) {
        console.warn('[Gatherings] 모임 상세 조회 예외:', err);
        return null;
      }
    },
    enabled: !!gatheringId,
  });
};

/**
 * 모임 참가자 목록 조회 훅
 */
export const useGatheringParticipants = (gatheringId: string | undefined) => {
  return useQuery({
    queryKey: ['gatheringParticipants', gatheringId],
    queryFn: async () => {
      if (!gatheringId) return [];

      try {
        const { data, error } = await supabase
          .from('gathering_participants')
          .select('*')
          .eq('gathering_id', gatheringId)
          .in('status', ['pending', 'approved'])
          .order('applied_at', { ascending: true });

        if (error) {
          console.warn('[Gatherings] 참가자 목록 조회 실패:', error.message);
          return [] as GatheringParticipant[];
        }
        return data as GatheringParticipant[];
      } catch (err) {
        console.warn('[Gatherings] 참가자 목록 조회 예외:', err);
        return [] as GatheringParticipant[];
      }
    },
    enabled: !!gatheringId,
  });
};

/**
 * 내 모임 참가 여부 확인 훅
 */
export const useMyParticipation = (gatheringId: string | undefined) => {
  return useQuery({
    queryKey: ['myParticipation', gatheringId],
    queryFn: async () => {
      if (!gatheringId) return null;

      try {
        const user = await getCurrentUser();
        if (!user) return null;

        const { data, error } = await supabase
          .from('gathering_participants')
          .select('*')
          .eq('gathering_id', gatheringId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('[Gatherings] 참가 여부 조회 실패:', error.message);
          return null;
        }
        return data as GatheringParticipant | null;
      } catch (err) {
        console.warn('[Gatherings] 참가 여부 조회 예외:', err);
        return null;
      }
    },
    enabled: !!gatheringId,
  });
};

/**
 * 호스팅 자격 확인 훅
 * Gold 티어(1억+) 이상만 모임 생성 가능
 */
export const useHostingEligibility = () => {
  return useQuery({
    queryKey: ['hostingEligibility'],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          canHost: false,
          totalAssets: 0,
          verifiedAssets: 0,
          requiredAssets: MINIMUM_ASSETS_FOR_HOSTING,
          tier: 'SILVER' as UserTier,
          displayName: null,
          availableMinTiers: [] as UserTier[],
        };
      }

      // 프로필에서 자산 및 티어 확인 (tier 컬럼이 없을 수 있으므로 에러 무시)
      let profile: any = null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_verified, verified_total_assets, total_assets, tier, full_name, email')
          .eq('id', user.id)
          .single();

        if (!error) {
          profile = data;
        } else if (error.code === 'PGRST204') {
          // 컬럼이 없는 경우 - 기본 필드만 조회
          const { data: basicProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();
          profile = basicProfile;
        }
      } catch (err) {
        console.warn('Profile fetch warning:', err);
      }

      // total_assets가 없으면 portfolios에서 계산
      let totalAssets = profile?.total_assets || 0;
      if (totalAssets === 0) {
        const { data: portfolios } = await supabase
          .from('portfolios')
          .select('current_value, quantity, current_price')
          .eq('user_id', user.id);

        totalAssets = (portfolios || []).reduce((sum, item) => {
          const value = item.quantity && item.current_price
            ? item.quantity * item.current_price
            : item.current_value || 0;
          return sum + value;
        }, 0);
      }

      const verifiedAssets = profile?.verified_total_assets || 0;
      const tier = profile?.tier || determineTier(totalAssets);

      // Gold(1억+) 이상만 호스팅 가능
      const canHost = totalAssets >= MINIMUM_ASSETS_FOR_HOSTING;
      const displayName = profile?.full_name || profile?.email?.split('@')[0] || '익명';
      const availableMinTiers = canHost ? getAvailableMinTiers(tier) : [];

      return {
        canHost,
        totalAssets,
        verifiedAssets,
        requiredAssets: MINIMUM_ASSETS_FOR_HOSTING,
        tier,
        displayName,
        availableMinTiers,
      };
    },
    staleTime: 60000, // 1분 캐시
  });
};

/**
 * 현재 사용자 정보 (모임 참가용)
 * 프로필의 total_assets와 tier를 사용
 */
export const useCurrentUserInfo = () => {
  return useQuery({
    queryKey: ['currentUserInfo'],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) return null;

      // 프로필 조회 (tier 컬럼이 없을 수 있으므로 에러 핸들링)
      let profile: any = null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, email, verified_total_assets, total_assets, tier')
          .eq('id', user.id)
          .single();

        if (!error) {
          profile = data;
        } else if (error.code === 'PGRST204') {
          const { data: basicProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();
          profile = basicProfile;
        }
      } catch (err) {
        console.warn('Profile fetch warning:', err);
      }

      // total_assets가 없으면 portfolios에서 계산
      let totalAssets = profile?.total_assets || 0;
      if (totalAssets === 0) {
        const { data: portfolios } = await supabase
          .from('portfolios')
          .select('current_value, quantity, current_price')
          .eq('user_id', user.id);

        totalAssets = (portfolios || []).reduce((sum, item) => {
          const value = item.quantity && item.current_price
            ? item.quantity * item.current_price
            : item.current_value || 0;
          return sum + value;
        }, 0);
      }

      const tier = profile?.tier || determineTier(totalAssets);

      return {
        userId: user.id,
        displayName: profile?.full_name || profile?.email?.split('@')[0] || '익명',
        totalAssets,
        verifiedAssets: profile?.verified_total_assets || 0,
        tier,
      };
    },
  });
};

/**
 * 모임 생성 훅 (티어 기반 접근 제어 포함)
 */
export const useCreateGathering = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<GatheringInsert, 'host_id' | 'host_display_name' | 'host_verified_assets' | 'host_tier'>) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 호스팅 자격 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('verified_total_assets, total_assets, tier, full_name, email')
        .eq('id', user.id)
        .single();

      // total_assets가 없으면 portfolios에서 계산
      let totalAssets = profile?.total_assets || 0;
      if (totalAssets === 0) {
        const { data: portfolios } = await supabase
          .from('portfolios')
          .select('current_value, quantity, current_price')
          .eq('user_id', user.id);

        totalAssets = (portfolios || []).reduce((sum, item) => {
          const value = item.quantity && item.current_price
            ? item.quantity * item.current_price
            : item.current_value || 0;
          return sum + value;
        }, 0);
      }

      if (totalAssets < MINIMUM_ASSETS_FOR_HOSTING) {
        throw new Error('골드 등급(1억 이상) 자산이 필요합니다.');
      }

      const hostDisplayName = profile?.full_name || profile?.email?.split('@')[0] || '익명';
      const hostTier = profile?.tier || determineTier(totalAssets);

      // 최소 입장 티어 검증: 호스트 티어 이하만 설정 가능
      const minTierRequired = input.min_tier_required || 'SILVER';
      if (!canAccessTier(hostTier, minTierRequired)) {
        throw new Error('최소 입장 조건은 본인 등급 이하로만 설정할 수 있습니다.');
      }

      const insertPayload = {
        ...input,
        host_id: user.id,
        host_display_name: hostDisplayName,
        host_verified_assets: totalAssets,
        host_tier: hostTier,
        min_tier_required: minTierRequired,
        current_capacity: 0,
        status: 'open',
      };

      // insert만 실행 (.select().single() 제거 → 스키마 캐시 불일치 방지)
      const { error } = await supabase
        .from('gatherings')
        .insert(insertPayload);

      if (error) throw error;

      // 생성된 모임을 별도 조회
      const { data: created } = await supabase
        .from('gatherings')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return (created || { id: 'new', ...insertPayload }) as Gathering;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gatherings'] });
    },
  });
};

/**
 * 모임 참가 신청 훅 (결제 시뮬레이션 + 티어 기반 접근 제어)
 * CRITICAL: 원자적 RPC 함수 사용으로 Race Condition 방지
 * - 동시 참가 신청 시 정원 초과 불가
 * - 서버사이드 TBAC 검증으로 티어 스푸핑 방지
 */
export const useJoinGathering = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gatheringId: string) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 1. 서버사이드 티어 검증 (스푸핑 방지)
      // get_verified_user_tier RPC가 없으면 클라이언트 계산 fallback
      let totalAssets = 0;
      let userTier: UserTier = 'SILVER';
      let displayName = '익명';

      try {
        const { data: verifiedTier, error: tierError } = await supabase
          .rpc('get_verified_user_tier', { p_user_id: user.id });

        if (!tierError && verifiedTier && verifiedTier.length > 0) {
          totalAssets = verifiedTier[0].total_assets;
          userTier = verifiedTier[0].tier as UserTier;
        } else {
          throw new Error('RPC not available');
        }
      } catch {
        // Fallback: 클라이언트 계산 (RPC 함수가 아직 배포 안 된 경우)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, verified_total_assets, total_assets, tier')
          .eq('id', user.id)
          .single();

        totalAssets = profile?.total_assets || 0;
        if (totalAssets === 0) {
          const { data: portfolios } = await supabase
            .from('portfolios')
            .select('current_value, quantity, current_price')
            .eq('user_id', user.id);

          totalAssets = (portfolios || []).reduce((sum, item) => {
            const value = item.quantity && item.current_price
              ? item.quantity * item.current_price
              : item.current_value || 0;
            return sum + value;
          }, 0);
        }

        userTier = profile?.tier || determineTier(totalAssets);
        displayName = profile?.full_name || profile?.email?.split('@')[0] || '익명';
      }

      // 2. 원자적 참가 처리 시도 (Race Condition 방지)
      try {
        const { data: result, error: rpcError } = await supabase
          .rpc('join_gathering_atomic', {
            p_gathering_id: gatheringId,
            p_user_id: user.id,
            p_display_name: displayName,
            p_verified_assets: totalAssets,
            p_tier: userTier,
          });

        if (rpcError) {
          throw new Error(`RPC error: ${rpcError.message}`);
        }

        if (!result.success) {
          throw new Error(result.error || '참가 신청에 실패했습니다.');
        }

        return result.participation as GatheringParticipant;
      } catch (rpcError: any) {
        // Fallback: RPC 함수가 없는 경우 기존 로직 사용
        console.warn('join_gathering_atomic RPC 사용 불가, fallback 로직 실행:', rpcError.message);

        // === FALLBACK: 기존 비원자적 로직 (마이그레이션 전 호환성) ===

        // 1. 모임 정보 확인
        const { data: gathering, error: gatheringError } = await supabase
          .from('gatherings')
          .select('*')
          .eq('id', gatheringId)
          .single();

        if (gatheringError || !gathering) throw new Error('모임을 찾을 수 없습니다.');
        if (gathering.status !== 'open') throw new Error('모집이 마감된 모임입니다.');
        if (gathering.current_capacity >= gathering.max_capacity) throw new Error('정원이 가득 찼습니다.');

        const requiredTier = gathering.min_tier_required || 'SILVER';

        // 3. 티어 기반 접근 제어 (TBAC) - 클라이언트 검증
        if (!canAccessTier(userTier, requiredTier)) {
          const requiredLabel = TIER_LABELS[requiredTier] || requiredTier;
          throw new Error(`이 모임은 ${requiredLabel} 등급 이상만 참가할 수 있습니다.`);
        }

        // 4. 중복 참가 확인
        const { data: existingParticipation } = await supabase
          .from('gathering_participants')
          .select('id, status')
          .eq('gathering_id', gatheringId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingParticipation && existingParticipation.status !== 'cancelled') {
          throw new Error('이미 참가 신청한 모임입니다.');
        }

        // 5. 참가 기록 생성
        const { data: participation, error: participationError } = await supabase
          .from('gathering_participants')
          .insert({
            gathering_id: gatheringId,
            user_id: user.id,
            status: 'approved',
            paid_amount: gathering.entry_fee,
            payment_status: 'completed',
            participant_display_name: displayName,
            participant_verified_assets: totalAssets,
            participant_tier: userTier,
            applied_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (participationError) throw participationError;

        // 6. 현재 인원 증가
        const { error: updateError } = await supabase
          .from('gatherings')
          .update({
            current_capacity: gathering.current_capacity + 1,
            status: gathering.current_capacity + 1 >= gathering.max_capacity ? 'closed' : 'open',
          })
          .eq('id', gatheringId);

        if (updateError) throw updateError;

        return participation as GatheringParticipant;
      }
    },
    onSuccess: (_, gatheringId) => {
      queryClient.invalidateQueries({ queryKey: ['gatherings'] });
      queryClient.invalidateQueries({ queryKey: ['gathering', gatheringId] });
      queryClient.invalidateQueries({ queryKey: ['gatheringParticipants', gatheringId] });
      queryClient.invalidateQueries({ queryKey: ['myParticipation', gatheringId] });
    },
  });
};

/**
 * 참가 취소 훅
 */
export const useCancelParticipation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gatheringId: string) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 1. 기존 참가 기록 확인
      const { data: participation } = await supabase
        .from('gathering_participants')
        .select('id, status')
        .eq('gathering_id', gatheringId)
        .eq('user_id', user.id)
        .single();

      if (!participation || participation.status === 'cancelled') {
        throw new Error('참가 기록을 찾을 수 없습니다.');
      }

      // 2. 참가 취소로 상태 변경
      const { error: updateParticipationError } = await supabase
        .from('gathering_participants')
        .update({
          status: 'cancelled',
          payment_status: 'refunded', // 시뮬레이션
        })
        .eq('id', participation.id);

      if (updateParticipationError) throw updateParticipationError;

      // 3. 모임 인원 감소
      const { data: gathering } = await supabase
        .from('gatherings')
        .select('current_capacity, status')
        .eq('id', gatheringId)
        .single();

      if (gathering) {
        await supabase
          .from('gatherings')
          .update({
            current_capacity: Math.max(0, gathering.current_capacity - 1),
            // 마감이었던 경우 다시 오픈
            status: gathering.status === 'closed' ? 'open' : gathering.status,
          })
          .eq('id', gatheringId);
      }

      return true;
    },
    onSuccess: (_, gatheringId) => {
      queryClient.invalidateQueries({ queryKey: ['gatherings'] });
      queryClient.invalidateQueries({ queryKey: ['gathering', gatheringId] });
      queryClient.invalidateQueries({ queryKey: ['gatheringParticipants', gatheringId] });
      queryClient.invalidateQueries({ queryKey: ['myParticipation', gatheringId] });
    },
  });
};

/**
 * 내가 호스팅하는 모임 목록
 */
export const useMyHostedGatherings = () => {
  return useQuery({
    queryKey: ['myHostedGatherings'],
    queryFn: async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
          .from('gatherings')
          .select('*')
          .eq('host_id', user.id)
          .order('event_date', { ascending: true });

        if (error) {
          console.warn('[Gatherings] 내 모임 조회 실패:', error.message);
          return [] as Gathering[];
        }
        return data as Gathering[];
      } catch (err) {
        console.warn('[Gatherings] 내 모임 조회 예외:', err);
        return [] as Gathering[];
      }
    },
  });
};

/**
 * 내가 참가한 모임 목록
 */
export const useMyJoinedGatherings = () => {
  return useQuery({
    queryKey: ['myJoinedGatherings'],
    queryFn: async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return [];

        const { data: participations, error } = await supabase
          .from('gathering_participants')
          .select('gathering_id')
          .eq('user_id', user.id)
          .in('status', ['pending', 'approved']);

        if (error) {
          console.warn('[Gatherings] 참가 모임 조회 실패:', error.message);
          return [] as Gathering[];
        }
        if (!participations || participations.length === 0) return [];

        const gatheringIds = participations.map(p => p.gathering_id);

        const { data: gatherings, error: gatheringsError } = await supabase
          .from('gatherings')
          .select('*')
          .in('id', gatheringIds)
          .order('event_date', { ascending: true });

        if (gatheringsError) {
          console.warn('[Gatherings] 참가 모임 상세 조회 실패:', gatheringsError.message);
          return [] as Gathering[];
        }
        return gatherings as Gathering[];
      } catch (err) {
        console.warn('[Gatherings] 참가 모임 조회 예외:', err);
        return [] as Gathering[];
      }
    },
  });
};

/**
 * 사용자 프로필의 총 자산과 티어를 동기화
 * portfolios 데이터가 변경될 때 호출
 * NOTE: profiles 테이블에 tier 컬럼이 없으면 업데이트 스킵
 */
export const syncUserProfileTier = async (userId: string): Promise<{ totalAssets: number; tier: UserTier }> => {
  // 1. portfolios에서 총 자산 계산
  const { data: portfolios, error: portfolioError } = await supabase
    .from('portfolios')
    .select('current_value, quantity, current_price')
    .eq('user_id', userId);

  if (portfolioError) throw portfolioError;

  const totalAssets = (portfolios || []).reduce((sum, item) => {
    const value = item.quantity && item.current_price
      ? item.quantity * item.current_price
      : item.current_value || 0;
    return sum + value;
  }, 0);

  // 2. 티어 결정
  const tier = determineTier(totalAssets);

  // 3. 프로필 업데이트 (tier 컬럼이 없으면 무시)
  try {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        total_assets: totalAssets,
        tier,
        tier_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // PGRST204 에러 (컬럼 없음)는 무시
    if (updateError && updateError.code !== 'PGRST204') {
      console.warn('Profile tier sync warning:', updateError);
    }
  } catch (err) {
    console.warn('Profile tier sync failed (schema may not be updated yet):', err);
  }

  return { totalAssets, tier };
};

/**
 * 프로필 티어 동기화 훅
 * 자산 변경 후 호출하여 프로필 업데이트
 */
export const useSyncProfileTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      return syncUserProfileTier(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserInfo'] });
      queryClient.invalidateQueries({ queryKey: ['hostingEligibility'] });
    },
  });
};

export default useGatherings;
