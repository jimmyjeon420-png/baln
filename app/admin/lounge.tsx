/**
 * 관리자용 라운지 관리 화면
 *
 * 기능:
 * - 게시글 관리: 목록 표시, 삭제, 고정/해제, 필터링 (전체/신고됨/고정됨)
 * - 모임 관리: 목록 표시, 취소, 필터링 (전체/진행중/마감/취소됨)
 *
 * 비유: "커뮤니티 운영 관리실" — 게시글과 모임을 한눈에 보고 관리하는 화면
 *
 * 진입점: 관리자 허브 → 라운지 관리
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useIsAdmin,
  useAdminLoungePosts,
  useAdminDeletePost,
  useAdminTogglePinPost,
  useAdminGatherings,
  useAdminCancelGathering,
} from '../../src/hooks/useAdminDashboard';
import type { AdminLoungePost, AdminGathering } from '../../src/services/adminService';
import { COLORS } from '../../src/styles/theme';

// ─── 세그먼트 타입 ──────────────────────────────────────

type Segment = 'posts' | 'gatherings';
type PostFilter = 'all' | 'reported' | 'pinned';
type GatheringFilter = 'all' | 'open' | 'closed' | 'cancelled';

// ─── 카테고리 라벨 ──────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  stocks: '주식방',
  crypto: '코인방',
  realestate: '부동산방',
};

const GATHERING_CATEGORY_LABELS: Record<string, string> = {
  study: '스터디',
  meeting: '정기 모임',
  networking: '네트워킹',
  workshop: '워크샵',
};

const GATHERING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: '진행중', color: COLORS.primary },
  closed: { label: '마감', color: COLORS.warning },
  cancelled: { label: '취소됨', color: COLORS.error },
  completed: { label: '완료', color: COLORS.textTertiary },
};

// ─── 헬퍼 함수 ─────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${h}:${min}`;
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

// ================================================================
// 메인 컴포넌트
// ================================================================

export default function AdminLoungeScreen() {
  const router = useRouter();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();

  // ── 상태 관리 ──
  const [segment, setSegment] = useState<Segment>('posts');
  const [postFilter, setPostFilter] = useState<PostFilter>('all');
  const [gatheringFilter, setGatheringFilter] = useState<GatheringFilter>('all');

  // ── 게시글 쿼리 & 뮤테이션 ──
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useAdminLoungePosts({
    limit: 50,
    offset: 0,
    filter: postFilter,
    enabled: isAdmin === true,
  });

  const deletePostMutation = useAdminDeletePost();
  const togglePinMutation = useAdminTogglePinPost();

  // 현재 작업 중인 아이템 ID 추적 (모든 카드에 스피너가 뜨는 버그 방지)
  const mutatingPostId = useRef<string | null>(null);
  const mutatingGatheringId = useRef<string | null>(null);

  // ── 모임 쿼리 & 뮤테이션 ──
  const {
    data: gatheringsData,
    isLoading: gatheringsLoading,
    error: gatheringsError,
    refetch: refetchGatherings,
  } = useAdminGatherings({
    limit: 50,
    offset: 0,
    filter: gatheringFilter,
    enabled: isAdmin === true,
  });

  const cancelGatheringMutation = useAdminCancelGathering();

  // ================================================================
  // 게시글 액션 핸들러
  // ================================================================

  const handleDeletePost = useCallback((post: AdminLoungePost) => {
    Alert.alert(
      '게시글 삭제',
      `이 게시글을 삭제하시겠습니까?\n\n"${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            mutatingPostId.current = post.id;
            try {
              const result = await deletePostMutation.mutateAsync(post.id);
              if (result.success) {
                Alert.alert('완료', '게시글이 삭제되었습니다.');
              } else {
                Alert.alert('오류', result.error || '삭제에 실패했습니다.');
              }
            } catch (err: any) {
              Alert.alert('오류', err.message || '삭제 중 오류가 발생했습니다.');
            } finally {
              mutatingPostId.current = null;
            }
          },
        },
      ]
    );
  }, [deletePostMutation]);

  const handleTogglePin = useCallback(async (post: AdminLoungePost) => {
    mutatingPostId.current = post.id;
    try {
      const result = await togglePinMutation.mutateAsync(post.id);
      if (result.success) {
        Alert.alert(
          '완료',
          result.is_pinned ? '게시글이 고정되었습니다.' : '게시글 고정이 해제되었습니다.'
        );
      } else {
        Alert.alert('오류', result.error || '변경에 실패했습니다.');
      }
    } catch (err: any) {
      Alert.alert('오류', err.message || '처리 중 오류가 발생했습니다.');
    } finally {
      mutatingPostId.current = null;
    }
  }, [togglePinMutation]);

  // ================================================================
  // 모임 액션 핸들러
  // ================================================================

  const handleCancelGathering = useCallback((gathering: AdminGathering) => {
    Alert.alert(
      '모임 취소',
      `이 모임을 취소하시겠습니까?\n\n"${gathering.title}"`,
      [
        { text: '아니요', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: async () => {
            mutatingGatheringId.current = gathering.id;
            try {
              const result = await cancelGatheringMutation.mutateAsync(gathering.id);
              if (result.success) {
                Alert.alert('완료', '모임이 취소되었습니다.');
              } else {
                Alert.alert('오류', result.error || '취소에 실패했습니다.');
              }
            } catch (err: any) {
              Alert.alert('오류', err.message || '처리 중 오류가 발생했습니다.');
            } finally {
              mutatingGatheringId.current = null;
            }
          },
        },
      ]
    );
  }, [cancelGatheringMutation]);

  // ================================================================
  // 게시글 카드 렌더링
  // ================================================================

  const renderPostItem = useCallback(({ item }: { item: AdminLoungePost }) => {
    const isPinning = togglePinMutation.isPending && mutatingPostId.current === item.id;
    const isDeleting = deletePostMutation.isPending && mutatingPostId.current === item.id;
    const isMutating = isPinning || isDeleting;

    return (
      <View style={styles.itemCard}>
        {/* 헤더: 카테고리 + 고정 뱃지 + 신고 뱃지 */}
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            {item.is_pinned && (
              <View style={[styles.badge, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="pin" size={10} color={COLORS.primary} />
                <Text style={[styles.badgeText, { color: COLORS.primary }]}>고정</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: COLORS.info + '20' }]}>
              <Text style={[styles.badgeText, { color: COLORS.info }]}>
                {CATEGORY_LABELS[item.category] || item.category}
              </Text>
            </View>
            {item.report_count > 0 && (
              <View style={[styles.badge, { backgroundColor: COLORS.error + '20' }]}>
                <Ionicons name="flag" size={10} color={COLORS.error} />
                <Text style={[styles.badgeText, { color: COLORS.error }]}>
                  신고 {item.report_count}건
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.itemDate}>{getRelativeTime(item.created_at)}</Text>
        </View>

        {/* 작성자 이메일 */}
        <Text style={styles.itemAuthor} numberOfLines={1}>
          {item.email || item.display_tag || '알 수 없음'}
        </Text>

        {/* 본문 미리보기 */}
        <Text style={styles.itemContent} numberOfLines={3}>
          {item.content}
        </Text>

        {/* 통계 */}
        <View style={styles.itemStats}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={12} color={COLORS.textTertiary} />
            <Text style={styles.statText}>{item.likes_count}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={12} color={COLORS.textTertiary} />
            <Text style={styles.statText}>{item.comments_count}</Text>
          </View>
        </View>

        {/* 액션 버튼 */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.pinBtn]}
            onPress={() => handleTogglePin(item)}
            disabled={isMutating}
          >
            {isPinning ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons
                  name={item.is_pinned ? 'pin-outline' : 'pin'}
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>
                  {item.is_pinned ? '고정 해제' : '고정'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeletePost(item)}
            disabled={isMutating}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                <Text style={[styles.actionBtnText, { color: COLORS.error }]}>삭제</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleDeletePost, handleTogglePin, deletePostMutation.isPending, togglePinMutation.isPending]);

  // ================================================================
  // 모임 카드 렌더링
  // ================================================================

  const renderGatheringItem = useCallback(({ item }: { item: AdminGathering }) => {
    const statusInfo = GATHERING_STATUS_LABELS[item.status] || {
      label: item.status,
      color: COLORS.textTertiary,
    };
    const isCancelling = cancelGatheringMutation.isPending && mutatingGatheringId.current === item.id;

    return (
      <View style={styles.itemCard}>
        {/* 헤더: 카테고리 + 상태 뱃지 */}
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <View style={[styles.badge, { backgroundColor: statusInfo.color + '20' }]}>
              <Text style={[styles.badgeText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: COLORS.info + '20' }]}>
              <Text style={[styles.badgeText, { color: COLORS.info }]}>
                {GATHERING_CATEGORY_LABELS[item.category] || item.category}
              </Text>
            </View>
          </View>
          <Text style={styles.itemDate}>{getRelativeTime(item.created_at)}</Text>
        </View>

        {/* 모임 제목 */}
        <Text style={styles.gatheringTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* 호스트 정보 */}
        <Text style={styles.itemAuthor} numberOfLines={1}>
          호스트: {item.host_email || item.host_display_name || '알 수 없음'}
          {item.host_tier ? ` (${item.host_tier})` : ''}
        </Text>

        {/* 모임 상세 정보 */}
        <View style={styles.gatheringDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textTertiary} />
            <Text style={styles.detailText}>{formatDate(item.event_date)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={13} color={COLORS.textTertiary} />
            <Text style={styles.detailText}>
              {item.current_capacity}/{item.max_capacity}명
            </Text>
          </View>
          {item.entry_fee > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={13} color={COLORS.textTertiary} />
              <Text style={styles.detailText}>
                {item.entry_fee.toLocaleString()}원
              </Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Ionicons
              name={item.location_type === 'online' ? 'videocam-outline' : 'location-outline'}
              size={13}
              color={COLORS.textTertiary}
            />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        </View>

        {/* 액션 버튼 — 취소 가능한 상태일 때만 표시 */}
        {item.status !== 'cancelled' && item.status !== 'completed' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn, { flex: 1 }]}
              onPress={() => handleCancelGathering(item)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={14} color={COLORS.error} />
                  <Text style={[styles.actionBtnText, { color: COLORS.error }]}>모임 취소</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [handleCancelGathering, cancelGatheringMutation.isPending]);

  // ================================================================
  // 게시글 필터 칩
  // ================================================================

  const postFilters: { key: PostFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'reported', label: '신고됨' },
    { key: 'pinned', label: '고정됨' },
  ];

  const gatheringFilters: { key: GatheringFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'open', label: '진행중' },
    { key: 'closed', label: '마감' },
    { key: 'cancelled', label: '취소됨' },
  ];

  // ================================================================
  // 로딩 & 권한 체크
  // ================================================================

  if (isAdminLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>라운지 관리</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>권한 확인 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>라운지 관리</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed" size={64} color={COLORS.textSecondary} />
          <Text style={styles.deniedText}>접근 권한이 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ================================================================
  // 현재 세그먼트에 따른 데이터 선택
  // ================================================================

  const isLoading = segment === 'posts' ? postsLoading : gatheringsLoading;
  const hasError = segment === 'posts' ? postsError : gatheringsError;
  const totalCount =
    segment === 'posts'
      ? postsData?.total_count ?? 0
      : gatheringsData?.total_count ?? 0;

  // ================================================================
  // 메인 UI
  // ================================================================

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>라운지 관리</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 세그먼트 컨트롤 */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, segment === 'posts' && styles.segmentBtnActive]}
          onPress={() => setSegment('posts')}
        >
          <Ionicons
            name="document-text"
            size={16}
            color={segment === 'posts' ? '#FFFFFF' : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              segment === 'posts' && styles.segmentBtnTextActive,
            ]}
          >
            게시글
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, segment === 'gatherings' && styles.segmentBtnActive]}
          onPress={() => setSegment('gatherings')}
        >
          <Ionicons
            name="people"
            size={16}
            color={segment === 'gatherings' ? '#FFFFFF' : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              segment === 'gatherings' && styles.segmentBtnTextActive,
            ]}
          >
            모임
          </Text>
        </TouchableOpacity>
      </View>

      {/* 필터 칩 */}
      <View style={styles.filterContainer}>
        {segment === 'posts'
          ? postFilters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  postFilter === filter.key && styles.filterChipActive,
                ]}
                onPress={() => setPostFilter(filter.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    postFilter === filter.key && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))
          : gatheringFilters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  gatheringFilter === filter.key && styles.filterChipActive,
                ]}
                onPress={() => setGatheringFilter(filter.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    gatheringFilter === filter.key && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
      </View>

      {/* 전체 카운트 */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          전체 <Text style={styles.countNumber}>{totalCount.toLocaleString()}</Text>건
        </Text>
      </View>

      {/* 리스트 */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      ) : hasError ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>데이터를 불러올 수 없습니다.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => (segment === 'posts' ? refetchPosts() : refetchGatherings())}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : segment === 'posts' ? (
        <FlatList
          data={postsData?.posts ?? []}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={postsLoading}
              onRefresh={refetchPosts}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>게시글이 없습니다.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={gatheringsData?.gatherings ?? []}
          renderItem={renderGatheringItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={gatheringsLoading}
              onRefresh={refetchGatherings}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>모임이 없습니다.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ================================================================
// 스타일
// ================================================================

const styles = StyleSheet.create({
  // ── 레이아웃 ──
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── 헤더 ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // ── 세그먼트 컨트롤 ──
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },

  // ── 필터 칩 ──
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ── 카운트 바 ──
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  countNumber: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ── 리스트 ──
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // ── 아이템 카드 (공통) ──
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  itemDate: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  itemAuthor: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  itemContent: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },

  // ── 게시글 통계 ──
  itemStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },

  // ── 모임 전용 ──
  gatheringTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  gatheringDetails: {
    gap: 4,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // ── 액션 버튼 ──
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 5,
  },
  pinBtn: {
    flex: 1,
    backgroundColor: COLORS.primary + '15',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: COLORS.error + '15',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── 상태 화면 (로딩/에러/빈 상태) ──
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  deniedText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});
