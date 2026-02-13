/**
 * useAdminDashboard.ts - 관리자 대시보드 React Query 훅
 *
 * 역할: adminService의 API 호출을 React 컴포넌트에서
 *       쉽게 사용할 수 있도록 TanStack Query로 감싼 훅입니다.
 *
 * 비유: "비서실(adminService)에서 받은 보고서를 경영진 책상(화면) 위에 올려놓는 배달부"
 *       - 자동 갱신 (1분마다 대시보드 새로고침)
 *       - 캐싱 (같은 데이터 중복 요청 방지)
 *       - 로딩/에러 상태 자동 관리
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  checkIsAdmin,
  fetchAdminOverview,
  fetchAdminUserList,
  fetchAdminRetention,
  fetchRecentActivity,
  grantBonusCredits,
} from '../services/adminService';

/** 현재 유저가 관리자인지 확인 */
export function useIsAdmin() {
  return useQuery({
    queryKey: ['admin', 'check'],
    queryFn: checkIsAdmin,
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
}

/** 대시보드 핵심 KPI (1분마다 자동 갱신) */
export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: fetchAdminOverview,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/** 유저 목록 (검색 + 페이지네이션) */
export function useAdminUserList(params: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => fetchAdminUserList(params),
    staleTime: 30 * 1000,
  });
}

/** 리텐션율 + 유저 분포 (5분 캐시) */
export function useAdminRetention() {
  return useQuery({
    queryKey: ['admin', 'retention'],
    queryFn: fetchAdminRetention,
    staleTime: 5 * 60 * 1000,
  });
}

/** 최근 활동 피드 (30초 캐시) */
export function useRecentActivity(limit: number = 20) {
  return useQuery({
    queryKey: ['admin', 'activity', limit],
    queryFn: () => fetchRecentActivity(limit),
    staleTime: 30 * 1000,
  });
}

/** 관리자 보너스 크레딧 지급 (Mutation) */
export function useGrantBonusCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: grantBonusCredits,
    onSuccess: () => {
      // 지급 후 유저 목록 & 대시보드 캐시 갱신
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}
