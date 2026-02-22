/**
 * 관리자 신고 처리 훅
 *
 * 제공 기능:
 * - useReports(status): 신고 목록 조회 (필터링)
 * - useUpdateReportStatus(): 신고 상태 변경
 * - useDeleteReportedContent(): 신고된 콘텐츠 삭제 + 신고 해결
 *
 * 사용처: app/admin/reports.tsx
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../services/supabase';
import {
  CommunityReport,
  ReportWithContent,
  ReportStatus,
  ReportTargetType
} from '../types/community';

// ================================================================
// 1. 신고 목록 조회 (필터링 가능)
// ================================================================

interface UseReportsOptions {
  status?: ReportStatus;
}

export function useReports(options: UseReportsOptions = {}) {
  const { status } = options;

  return useQuery<ReportWithContent[], Error>({
    queryKey: ['reports', status],
    queryFn: async () => {
      // 운영 스키마 편차 대응:
      // 1) FK 명시 조인 제거 (환경마다 FK 이름이 다를 수 있음)
      // 2) created_at 미존재 시 updated_at 정렬로 자동 폴백
      let query = supabase
        .from('community_reports')
        .select('*')
        .order('created_at', { ascending: false });

      // 상태 필터
      if (status) {
        query = query.eq('status', status);
      }

      let { data, error } = await query;

      if (error && /created_at/i.test(error.message || '')) {
        let fallbackQuery = supabase
          .from('community_reports')
          .select('*')
          .order('updated_at', { ascending: false });

        if (status) {
          fallbackQuery = fallbackQuery.eq('status', status);
        }

        const fallbackResult = await fallbackQuery;
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;

      const reports = (data || []) as CommunityReport[];

      // reporter display_tag 일괄 조회 (FK 이름 의존 제거)
      const reporterIds = Array.from(
        new Set(
          reports
            .map((r) => r.reporter_id)
            .filter((id): id is string => !!id)
        )
      );

      const reporterTagMap = new Map<string, string>();
      if (reporterIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, display_tag')
          .in('id', reporterIds);

        (profileRows || []).forEach((row: { id: string; display_tag: string | null }) => {
          if (row?.id) {
            reporterTagMap.set(row.id, row.display_tag || '알 수 없음');
          }
        });
      }

      // 각 신고에 대해 대상 콘텐츠 조회
      const reportsWithContent: ReportWithContent[] = await Promise.all(
        reports.map(async (report) => {
          let targetContent;

          // 게시글 신고인 경우
          if (report.target_type === 'post') {
            const { data: post } = await supabase
              .from('community_posts')
              .select('*')
              .eq('id', report.target_id)
              .single();
            targetContent = post;
          }
          // 댓글 신고인 경우
          else if (report.target_type === 'comment') {
            const { data: comment } = await supabase
              .from('community_comments')
              .select('*')
              .eq('id', report.target_id)
              .single();
            targetContent = comment;
          }

          // 같은 대상 중복 신고 카운트
          const { count } = await supabase
            .from('community_reports')
            .select('*', { count: 'exact', head: true })
            .eq('target_type', report.target_type)
            .eq('target_id', report.target_id);

          return {
            ...report,
            target_content: targetContent,
            reporter_display_tag: reporterTagMap.get(report.reporter_id) || '알 수 없음',
            duplicate_count: count || 1,
          } as ReportWithContent;
        })
      );

      return reportsWithContent;
    },
    staleTime: 1000 * 60, // 1분 (관리자 화면이므로 자주 갱신)
  });
}

// ================================================================
// 2. 신고 상태 변경
// ================================================================

interface UpdateReportStatusParams {
  reportId: string;
  status: ReportStatus;
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateReportStatusParams>({
    mutationFn: async ({ reportId, status }) => {
      const { error } = await supabase
        .from('community_reports')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      // 신고 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ================================================================
// 3. 신고된 콘텐츠 삭제 (게시글/댓글)
// ================================================================

interface DeleteReportedContentParams {
  reportId: string;
  targetType: ReportTargetType;
  targetId: string;
}

export function useDeleteReportedContent() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteReportedContentParams>({
    mutationFn: async ({ reportId, targetType, targetId }) => {
      // 1. 콘텐츠 삭제
      if (targetType === 'post') {
        // 게시글 삭제 (댓글은 CASCADE로 자동 삭제됨)
        const { error: deleteError } = await supabase
          .from('community_posts')
          .delete()
          .eq('id', targetId);

        if (deleteError) throw deleteError;
      } else if (targetType === 'comment') {
        // 댓글 삭제
        const { error: deleteError } = await supabase
          .from('community_comments')
          .delete()
          .eq('id', targetId);

        if (deleteError) throw deleteError;
      }

      // 2. 신고 상태 'resolved'로 변경
      const { error: updateError } = await supabase
        .from('community_reports')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      // 신고 목록 + 커뮤니티 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['loungePosts'] });
      queryClient.invalidateQueries({ queryKey: ['postComments'] });
    },
  });
}
