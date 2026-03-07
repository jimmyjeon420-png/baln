/**
 * 관리자용 라운지 관리 화면
 *
 * 기능:
 * - 게시글 관리: 목록 표시, 삭제, 고정/해제, 필터링 (전체/신고됨/고정됨)
 * - 모임 관리: 목록 표시, 취소, 필터링 (전체/진행중/마감/취소됨)
 * - 일괄 선택 모드: 게시글 다중 선택 후 일괄 삭제/고정
 * - 게시글 본문 더보기/접기
 *
 * 비유: "커뮤니티 운영 관리실" — 게시글과 모임을 한눈에 보고 관리하는 화면
 *
 * 진입점: 관리자 허브 → 라운지 관리
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
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
import { useLocale } from '../../src/context/LocaleContext';

// ─── 세그먼트 타입 ──────────────────────────────────────

type Segment = 'posts' | 'gatherings';
type PostFilter = 'all' | 'reported' | 'pinned';
type GatheringFilter = 'all' | 'open' | 'closed' | 'cancelled';

// ─── 카테고리 라벨 키 ──────────────────────────────────────

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  stocks: 'admin.lounge.category.stocks',
  crypto: 'admin.lounge.category.crypto',
  realestate: 'admin.lounge.category.realestate',
};

const GATHERING_CATEGORY_LABEL_KEYS: Record<string, string> = {
  study: 'admin.lounge.gatheringCategory.study',
  meeting: 'admin.lounge.gatheringCategory.meeting',
  networking: 'admin.lounge.gatheringCategory.networking',
  workshop: 'admin.lounge.gatheringCategory.workshop',
};

const GATHERING_STATUS_KEYS: Record<string, { tKey: string; color: string }> = {
  open: { tKey: 'admin.lounge.gatheringStatus.open', color: COLORS.primary },
  closed: { tKey: 'admin.lounge.gatheringStatus.closed', color: COLORS.warning },
  cancelled: { tKey: 'admin.lounge.gatheringStatus.cancelled', color: COLORS.error },
  completed: { tKey: 'admin.lounge.gatheringStatus.completed', color: COLORS.textTertiary },
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

function getRelativeTime(dateStr: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('common.time.justNow');
  if (mins < 60) return t('common.time.minutesAgo').replace('{{n}}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('common.time.hoursAgo').replace('{{n}}', String(hours));
  const days = Math.floor(hours / 24);
  if (days < 30) return t('common.time.daysAgo').replace('{{n}}', String(days));
  return t('common.time.monthsAgo').replace('{{n}}', String(Math.floor(days / 30)));
}

// ================================================================
// 메인 컴포넌트
// ================================================================

export default function AdminLoungeScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();

  // ── 상태 관리 ──
  const [segment, setSegment] = useState<Segment>('posts');
  const [postFilter, setPostFilter] = useState<PostFilter>('all');
  const [gatheringFilter, setGatheringFilter] = useState<GatheringFilter>('all');

  // ── Enhancement 2: 더보기/접기 상태 ──
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  // ── Enhancement 3: 일괄 선택 모드 상태 ──
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());

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

  // ── Enhancement 4: 신고된 게시글 수 계산 ──
  const reportedPostCount = useMemo(() => {
    if (!postsData?.posts) return 0;
    return postsData.posts.filter((p) => p.report_count > 0).length;
  }, [postsData?.posts]);

  // ================================================================
  // 더보기/접기 토글
  // ================================================================

  const toggleExpandPost = useCallback((postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  // ================================================================
  // 일괄 선택 모드 핸들러
  // ================================================================

  const enterSelectionMode = useCallback(() => {
    setIsSelecting(true);
    setSelectedPostIds(new Set());
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelecting(false);
    setSelectedPostIds(new Set());
  }, []);

  const togglePostSelection = useCallback((postId: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  // ================================================================
  // 일괄 삭제 핸들러
  // ================================================================

  const handleBatchDelete = useCallback(() => {
    const count = selectedPostIds.size;
    if (count === 0) return;

    Alert.alert(
      t('admin.lounge.alert.batchDeleteTitle'),
      t('admin.lounge.alert.batchDeleteMessage').replace('{{count}}', String(count)),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const ids = Array.from(selectedPostIds);
            const results = await Promise.allSettled(
              ids.map((id) => deletePostMutation.mutateAsync(id))
            );
            const successCount = results.filter(
              (r) => r.status === 'fulfilled' && r.value.success
            ).length;
            const failCount = count - successCount;

            exitSelectionMode();

            if (failCount > 0) {
              Alert.alert(t('admin.lounge.alert.resultTitle'), t('admin.lounge.alert.partialResult').replace('{{success}}', String(successCount)).replace('{{fail}}', String(failCount)));
            } else {
              Alert.alert(t('admin.lounge.alert.doneTitle'), t('admin.lounge.alert.processedResult').replace('{{count}}', String(successCount)));
            }
          },
        },
      ]
    );
  }, [selectedPostIds, deletePostMutation, exitSelectionMode, t]);

  // ================================================================
  // 일괄 고정 핸들러
  // ================================================================

  const handleBatchPin = useCallback(() => {
    const count = selectedPostIds.size;
    if (count === 0) return;

    Alert.alert(
      t('admin.lounge.alert.batchPinTitle'),
      t('admin.lounge.alert.batchPinMessage').replace('{{count}}', String(count)),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.lounge.pinToggle'),
          onPress: async () => {
            const ids = Array.from(selectedPostIds);
            const results = await Promise.allSettled(
              ids.map((id) => togglePinMutation.mutateAsync(id))
            );
            const successCount = results.filter(
              (r) => r.status === 'fulfilled' && r.value.success
            ).length;
            const failCount = count - successCount;

            exitSelectionMode();

            if (failCount > 0) {
              Alert.alert(t('admin.lounge.alert.resultTitle'), t('admin.lounge.alert.partialResult').replace('{{success}}', String(successCount)).replace('{{fail}}', String(failCount)));
            } else {
              Alert.alert(t('admin.lounge.alert.doneTitle'), t('admin.lounge.alert.processedResult').replace('{{count}}', String(successCount)));
            }
          },
        },
      ]
    );
  }, [selectedPostIds, togglePinMutation, exitSelectionMode, t]);

  // ================================================================
  // 게시글 액션 핸들러
  // ================================================================

  const handleDeletePost = useCallback((post: AdminLoungePost) => {
    Alert.alert(
      t('admin.lounge.alert.deletePostTitle'),
      `${t('admin.lounge.alert.deletePostMessage')}\n\n"${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            mutatingPostId.current = post.id;
            try {
              const result = await deletePostMutation.mutateAsync(post.id);
              if (result.success) {
                Alert.alert(t('admin.lounge.alert.doneTitle'), t('admin.lounge.alert.postDeleted'));
              } else {
                Alert.alert(t('common.error'), result.error || t('admin.lounge.alert.deleteFailed'));
              }
            } catch (err: unknown) {
              Alert.alert(t('common.error'), err instanceof Error ? err.message : t('admin.lounge.alert.deleteError'));
            } finally {
              mutatingPostId.current = null;
            }
          },
        },
      ]
    );
  }, [deletePostMutation, t]);

  const handleTogglePin = useCallback(async (post: AdminLoungePost) => {
    mutatingPostId.current = post.id;
    try {
      const result = await togglePinMutation.mutateAsync(post.id);
      if (result.success) {
        Alert.alert(
          t('admin.lounge.alert.doneTitle'),
          result.is_pinned ? t('admin.lounge.alert.postPinned') : t('admin.lounge.alert.postUnpinned')
        );
      } else {
        Alert.alert(t('common.error'), result.error || t('admin.lounge.alert.changeFailed'));
      }
    } catch (err: unknown) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('admin.lounge.alert.processError'));
    } finally {
      mutatingPostId.current = null;
    }
  }, [togglePinMutation, t]);

  // ================================================================
  // 모임 액션 핸들러
  // ================================================================

  const handleCancelGathering = useCallback((gathering: AdminGathering) => {
    Alert.alert(
      t('admin.lounge.alert.cancelGatheringTitle'),
      `${t('admin.lounge.alert.cancelGatheringMessage')}\n\n"${gathering.title}"`,
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('admin.lounge.cancelAction'),
          style: 'destructive',
          onPress: async () => {
            mutatingGatheringId.current = gathering.id;
            try {
              const result = await cancelGatheringMutation.mutateAsync(gathering.id);
              if (result.success) {
                Alert.alert(t('admin.lounge.alert.doneTitle'), t('admin.lounge.alert.gatheringCancelled'));
              } else {
                Alert.alert(t('common.error'), result.error || t('admin.lounge.alert.cancelFailed'));
              }
            } catch (err: unknown) {
              Alert.alert(t('common.error'), err instanceof Error ? err.message : t('admin.lounge.alert.processError'));
            } finally {
              mutatingGatheringId.current = null;
            }
          },
        },
      ]
    );
  }, [cancelGatheringMutation, t]);

  // ================================================================
  // 게시글 카드 렌더링
  // ================================================================

  const renderPostItem = useCallback(({ item }: { item: AdminLoungePost }) => {
    const isPinning = togglePinMutation.isPending && mutatingPostId.current === item.id;
    const isDeleting = deletePostMutation.isPending && mutatingPostId.current === item.id;
    const isMutating = isPinning || isDeleting;
    const isExpanded = expandedPosts.has(item.id);
    const isLongContent = item.content.length > 100;
    const isSelected = selectedPostIds.has(item.id);

    return (
      <View style={styles.itemCard}>
        <View style={{ flexDirection: 'row' }}>
          {/* 선택 모드: 체크박스 */}
          {isSelecting && (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => togglePostSelection(item.id)}
              activeOpacity={0.6}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'checkbox-outline'}
                size={22}
                color={isSelected ? COLORS.primary : COLORS.textTertiary}
              />
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }}>
            {/* 헤더: 카테고리 + 고정 뱃지 + 신고 뱃지 */}
            <View style={styles.itemHeader}>
              <View style={styles.itemHeaderLeft}>
                {item.is_pinned && (
                  <View style={[styles.badge, { backgroundColor: COLORS.primary + '20' }]}>
                    <Ionicons name="pin" size={10} color={COLORS.primary} />
                    <Text style={[styles.badgeText, { color: COLORS.primary }]}>{t('admin.lounge.pinned')}</Text>
                  </View>
                )}
                <View style={[styles.badge, { backgroundColor: COLORS.info + '20' }]}>
                  <Text style={[styles.badgeText, { color: COLORS.info }]}>
                    {CATEGORY_LABEL_KEYS[item.category] ? t(CATEGORY_LABEL_KEYS[item.category]) : item.category}
                  </Text>
                </View>
                {item.report_count > 0 && (
                  <View style={[styles.badge, { backgroundColor: COLORS.error + '20' }]}>
                    <Ionicons name="flag" size={10} color={COLORS.error} />
                    <Text style={[styles.badgeText, { color: COLORS.error }]}>
                      {t('admin.lounge.reported')} {item.report_count}{t('common.unitCount')}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemDate}>{getRelativeTime(item.created_at, t)}</Text>
            </View>

            {/* 작성자 이메일 */}
            <Text style={styles.itemAuthor} numberOfLines={1}>
              {item.email || item.display_tag || t('common.unknown')}
            </Text>

            {/* 본문 미리보기 (Enhancement 2: 더보기/접기) */}
            <Text
              style={styles.itemContent}
              numberOfLines={isExpanded ? 10 : 3}
            >
              {item.content}
            </Text>
            {isLongContent && (
              <TouchableOpacity
                onPress={() => toggleExpandPost(item.id)}
                activeOpacity={0.6}
              >
                <Text style={styles.expandToggleText}>
                  {isExpanded ? t('common.collapse') : t('common.showMore')}
                </Text>
              </TouchableOpacity>
            )}

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

            {/* 액션 버튼 — 선택 모드가 아닐 때만 표시 */}
            {!isSelecting && (
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
                        {item.is_pinned ? t('admin.lounge.unpin') : t('admin.lounge.pin')}
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
                      <Text style={[styles.actionBtnText, { color: COLORS.error }]}>{t('common.delete')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [
    handleDeletePost,
    handleTogglePin,
    deletePostMutation.isPending,
    togglePinMutation.isPending,
    expandedPosts,
    isSelecting,
    selectedPostIds,
    togglePostSelection,
    toggleExpandPost,
    t,
  ]);

  // ================================================================
  // 모임 카드 렌더링
  // ================================================================

  const renderGatheringItem = useCallback(({ item }: { item: AdminGathering }) => {
    const statusKeyInfo = GATHERING_STATUS_KEYS[item.status] || {
      tKey: item.status,
      color: COLORS.textTertiary,
    };
    const isCancelling = cancelGatheringMutation.isPending && mutatingGatheringId.current === item.id;

    return (
      <View style={styles.itemCard}>
        {/* 헤더: 카테고리 + 상태 뱃지 */}
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <View style={[styles.badge, { backgroundColor: statusKeyInfo.color + '20' }]}>
              <Text style={[styles.badgeText, { color: statusKeyInfo.color }]}>
                {t(statusKeyInfo.tKey)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: COLORS.info + '20' }]}>
              <Text style={[styles.badgeText, { color: COLORS.info }]}>
                {GATHERING_CATEGORY_LABEL_KEYS[item.category] ? t(GATHERING_CATEGORY_LABEL_KEYS[item.category]) : item.category}
              </Text>
            </View>
          </View>
          <Text style={styles.itemDate}>{getRelativeTime(item.created_at, t)}</Text>
        </View>

        {/* 모임 제목 */}
        <Text style={styles.gatheringTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* 호스트 정보 */}
        <Text style={styles.itemAuthor} numberOfLines={1}>
          {t('admin.lounge.host')}: {item.host_email || item.host_display_name || t('common.unknown')}
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
              {item.current_capacity}/{item.max_capacity}{t('admin.users.countUnit')}
            </Text>
          </View>
          {item.entry_fee > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={13} color={COLORS.textTertiary} />
              <Text style={styles.detailText}>
                {item.entry_fee.toLocaleString()}{t('common.unitWon')}
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
                  <Text style={[styles.actionBtnText, { color: COLORS.error }]}>{t('admin.lounge.cancelGathering')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [handleCancelGathering, cancelGatheringMutation.isPending, t]);

  // ================================================================
  // 게시글 필터 칩 (Enhancement 4: 신고됨 카운트 뱃지)
  // ================================================================

  const postFilters: { key: PostFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'reported', label: reportedPostCount > 0 ? `${t('admin.lounge.filter.reported')} (${reportedPostCount})` : t('admin.lounge.filter.reported') },
    { key: 'pinned', label: t('admin.lounge.filter.pinned') },
  ];

  const gatheringFilters: { key: GatheringFilter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'open', label: t('admin.lounge.gatheringStatus.open') },
    { key: 'closed', label: t('admin.lounge.gatheringStatus.closed') },
    { key: 'cancelled', label: t('admin.lounge.gatheringStatus.cancelled') },
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
          <Text style={styles.headerTitle}>{t('admin.lounge.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('admin.lounge.checkingPermission')}</Text>
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
          <Text style={styles.headerTitle}>{t('admin.lounge.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed" size={64} color={COLORS.textSecondary} />
          <Text style={styles.deniedText}>{t('admin.lounge.noPermission')}</Text>
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
      {/* 헤더 (Enhancement 3: 선택 모드 대응) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (isSelecting) {
              exitSelectionMode();
            } else {
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <Ionicons
            name={isSelecting ? 'close' : 'chevron-back'}
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSelecting
            ? `${selectedPostIds.size}${t('admin.lounge.selectedCount')}`
            : t('admin.lounge.title')}
        </Text>
        {/* Enhancement 3: 선택 모드 진입/취소 버튼 */}
        {isSelecting ? (
          <TouchableOpacity onPress={exitSelectionMode} style={styles.headerRightBtn}>
            <Text style={styles.headerRightBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        ) : segment === 'posts' ? (
          <TouchableOpacity onPress={enterSelectionMode} style={styles.headerRightBtn}>
            <Text style={styles.headerRightBtnText}>{t('admin.lounge.select')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* 세그먼트 컨트롤 (Enhancement 1: 카운트 표시) */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, segment === 'posts' && styles.segmentBtnActive]}
          onPress={() => {
            setSegment('posts');
            if (isSelecting) exitSelectionMode();
          }}
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
            {t('admin.lounge.posts')} ({postsData?.total_count ?? 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, segment === 'gatherings' && styles.segmentBtnActive]}
          onPress={() => {
            setSegment('gatherings');
            if (isSelecting) exitSelectionMode();
          }}
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
            {t('admin.lounge.gatherings')} ({gatheringsData?.total_count ?? 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 필터 칩 (Enhancement 4: 신고됨 카운트 + 빨간 강조) */}
      <View style={styles.filterContainer}>
        {segment === 'posts'
          ? postFilters.map((filter) => {
              const isReportedChipHighlighted =
                filter.key === 'reported' &&
                reportedPostCount > 0 &&
                postFilter !== 'reported';

              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    postFilter === filter.key && styles.filterChipActive,
                    isReportedChipHighlighted && styles.filterChipReportedHighlight,
                  ]}
                  onPress={() => setPostFilter(filter.key)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      postFilter === filter.key && styles.filterChipTextActive,
                      isReportedChipHighlighted && styles.filterChipTextReportedHighlight,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })
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
          {t('admin.lounge.totalCount')} <Text style={styles.countNumber}>{totalCount.toLocaleString()}</Text>{t('common.unitCount')}
        </Text>
      </View>

      {/* 리스트 */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : hasError ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{t('admin.lounge.loadError')}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => (segment === 'posts' ? refetchPosts() : refetchGatherings())}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : segment === 'posts' ? (
        <FlatList
          data={postsData?.posts ?? []}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          contentContainerStyle={[
            styles.listContent,
            isSelecting && { paddingBottom: 100 },
          ]}
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
              <Text style={styles.emptyText}>{t('admin.lounge.noPosts')}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={gatheringsData?.gatherings ?? []}
          renderItem={renderGatheringItem}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
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
              <Text style={styles.emptyText}>{t('admin.lounge.noGatherings')}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Enhancement 3: 일괄 액션 하단 바 */}
      {isSelecting && selectedPostIds.size > 0 && (
        <View style={styles.batchActionBar}>
          <TouchableOpacity
            style={styles.batchDeleteBtn}
            onPress={handleBatchDelete}
          >
            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
            <Text style={styles.batchBtnText}>{t('admin.lounge.batchDelete')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.batchPinBtn}
            onPress={handleBatchPin}
          >
            <Ionicons name="pin" size={16} color="#FFFFFF" />
            <Text style={styles.batchBtnText}>{t('admin.lounge.batchPin')}</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRightBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerRightBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.info,
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
    fontSize: 15,
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
  filterChipReportedHighlight: {
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterChipTextReportedHighlight: {
    color: COLORS.error,
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
    fontSize: 14,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  itemDate: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  itemAuthor: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  itemContent: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 21,
    marginBottom: 4,
  },

  // ── 더보기/접기 버튼 ──
  expandToggleText: {
    fontSize: 13,
    color: COLORS.info,
    marginTop: 4,
    marginBottom: 4,
  },

  // ── 체크박스 (선택 모드) ──
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 10,
    paddingTop: 2,
  },

  // ── 게시글 통계 ──
  itemStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },

  // ── 모임 전용 ──
  gatheringTitle: {
    fontSize: 16,
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
    fontSize: 13,
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
    fontSize: 14,
    fontWeight: '600',
  },

  // ── 일괄 액션 하단 바 ──
  batchActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 34,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  batchDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    gap: 6,
  },
  batchPinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    gap: 6,
  },
  batchBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── 상태 화면 (로딩/에러/빈 상태) ──
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  deniedText: {
    fontSize: 17,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});
