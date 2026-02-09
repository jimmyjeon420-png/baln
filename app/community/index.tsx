/**
 * 커뮤니티 메인 화면 (VIP 라운지)
 *
 * 역할: 뉴스 피드 부서 — 카테고리별 게시물 필터링 + 정렬 + 무한스크롤
 *
 * 기능:
 * - 카테고리 필터 (전체/주식/코인/부동산)
 * - 정렬 옵션 (인기순/최신순)
 * - 무한스크롤 (페이지네이션)
 * - 자격 확인 (100만원 미만 시 잠금 안내)
 * - 글쓰기 버튼 (1.5억+ 전용)
 *
 * 비유: 건물의 게시판 — 여러 카테고리의 글을 한눈에 보고, 원하는 주제만 필터링
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useCommunityPosts,
  useLoungeEligibility,
  useLikePost,
  useMyLikes,
} from '../../src/hooks/useCommunity';
import CommunityPostCard from '../../src/components/CommunityPostCard';
import {
  CommunityCategoryFilter,
  CATEGORY_INFO,
  LOUNGE_VIEW_THRESHOLD,
  LOUNGE_POST_THRESHOLD,
} from '../../src/types/community';
import { COLORS, SIZES } from '../../src/styles/theme';

type SortMode = 'popular' | 'latest';

export default function CommunityMainScreen() {
  const router = useRouter();

  // 자격 확인
  const { eligibility, loading: eligibilityLoading } = useLoungeEligibility();

  // 상태
  const [category, setCategory] = useState<CommunityCategoryFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('popular');

  // 게시물 목록 (무한스크롤)
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useCommunityPosts(category, sortMode);

  // 좋아요
  const likePost = useLikePost();
  const { data: myLikes } = useMyLikes();

  // 새로고침
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // 게시물 상세 이동
  const handlePostPress = (postId: string) => {
    router.push(`/community/${postId}` as any);
  };

  // 작성자 프로필 이동
  const handleAuthorPress = (userId: string) => {
    router.push(`/community/author/${userId}` as any);
  };

  // 좋아요 토글
  const handleLike = (postId: string) => {
    likePost.mutate(postId);
  };

  // 글쓰기 버튼
  const handleCreatePost = () => {
    if (!eligibility.canPost) {
      Alert.alert(
        '글쓰기 제한',
        `글쓰기는 자산 ${(LOUNGE_POST_THRESHOLD / 100000000).toFixed(1)}억원 이상 회원만 가능합니다.\n\n현재 자산: ${(eligibility.totalAssets / 100000000).toFixed(2)}억원`,
      );
      return;
    }
    router.push('/community/create' as any);
  };

  // 카테고리 필터 칩
  const renderCategoryChips = () => {
    const categories: CommunityCategoryFilter[] = ['all', 'stocks', 'crypto', 'realestate'];
    return (
      <View style={styles.chipsRow}>
        {categories.map((cat) => {
          const isActive = category === cat;
          const info = CATEGORY_INFO[cat];
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                isActive && { backgroundColor: info.color + '25', borderColor: info.color },
              ]}
              onPress={() => setCategory(cat)}
            >
              <Ionicons
                name={info.icon as any}
                size={14}
                color={isActive ? info.color : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.chipLabel,
                  isActive && { color: info.color, fontWeight: '700' },
                ]}
              >
                {info.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // 정렬 버튼
  const renderSortButtons = () => (
    <View style={styles.sortRow}>
      <TouchableOpacity
        style={[styles.sortButton, sortMode === 'popular' && styles.sortButtonActive]}
        onPress={() => setSortMode('popular')}
      >
        <Ionicons
          name="flame"
          size={14}
          color={sortMode === 'popular' ? COLORS.primary : COLORS.textSecondary}
        />
        <Text
          style={[
            styles.sortLabel,
            sortMode === 'popular' && { color: COLORS.primary, fontWeight: '700' },
          ]}
        >
          인기순
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sortButton, sortMode === 'latest' && styles.sortButtonActive]}
        onPress={() => setSortMode('latest')}
      >
        <Ionicons
          name="time"
          size={14}
          color={sortMode === 'latest' ? COLORS.primary : COLORS.textSecondary}
        />
        <Text
          style={[
            styles.sortLabel,
            sortMode === 'latest' && { color: COLORS.primary, fontWeight: '700' },
          ]}
        >
          최신순
        </Text>
      </TouchableOpacity>
    </View>
  );

  // 무한스크롤 트리거
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // 게시물 목록 평탄화
  const posts = data?.pages?.flatMap((page) => page) ?? [];

  // ──────────────────────────────────────────────────────────
  // 자격 미달 시 잠금 화면
  // ──────────────────────────────────────────────────────────
  if (!eligibility.isEligible) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VIP 라운지</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.lockedContainer}>
          <View style={styles.lockedIcon}>
            <Ionicons name="lock-closed" size={48} color="#FFC107" />
          </View>
          <Text style={styles.lockedTitle}>VIP 라운지는 잠겨 있습니다</Text>
          <Text style={styles.lockedDescription}>
            VIP 라운지 열람은 자산 {(LOUNGE_VIEW_THRESHOLD / 10000).toFixed(0)}만원 이상 회원만 가능합니다.
          </Text>
          <View style={styles.lockedAssetBox}>
            <Text style={styles.lockedAssetLabel}>현재 자산</Text>
            <Text style={styles.lockedAssetValue}>
              {(eligibility.totalAssets / 10000).toFixed(0)}만원
            </Text>
            <Text style={styles.lockedShortfall}>
              {(eligibility.shortfall / 10000).toFixed(0)}만원 더 필요합니다
            </Text>
          </View>
          <TouchableOpacity style={styles.lockedButton} onPress={() => router.back()}>
            <Text style={styles.lockedButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ──────────────────────────────────────────────────────────
  // 메인 화면
  // ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VIP 라운지</Text>
        <TouchableOpacity onPress={handleCreatePost}>
          <Ionicons name="create-outline" size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* 필터 + 정렬 */}
      <View style={styles.filterSection}>
        {renderCategoryChips()}
        {renderSortButtons()}
      </View>

      {/* 게시물 리스트 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>아직 게시물이 없습니다</Text>
          {eligibility.canPost && (
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreatePost}>
              <Text style={styles.emptyButtonText}>첫 게시물 작성하기</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.postWrapper}>
              <CommunityPostCard
                post={item}
                isLiked={myLikes?.has(item.id) ?? false}
                onLike={handleLike}
                onPress={handlePostPress}
                onAuthorPress={handleAuthorPress}
              />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ── 필터 섹션 ──
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // ── 정렬 버튼 ──
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary + '15',
  },
  sortLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // ── 리스트 ──
  listContent: {
    paddingVertical: 12,
  },
  postWrapper: {
    paddingHorizontal: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  // ── 로딩 ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── 빈 화면 ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },

  // ── 잠금 화면 ──
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  lockedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A1A0E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  lockedDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  lockedAssetBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  lockedAssetLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  lockedAssetValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  lockedShortfall: {
    fontSize: 13,
    color: '#FFC107',
  },
  lockedButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  lockedButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
});
