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
import { SIZES } from '../../src/styles/theme';
import { useTheme } from '../../src/hooks/useTheme';

type SortMode = 'popular' | 'latest';

export default function CommunityMainScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // 자격 확인
  const { eligibility, loading: eligibilityLoading, error: eligibilityError } = useLoungeEligibility();

  // 상태
  const [category, setCategory] = useState<CommunityCategoryFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('popular');

  // 게시물 목록 (무한스크롤)
  const {
    data,
    isLoading,
    isError: postsError,
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
    if (!eligibility?.canPost) {
      Alert.alert(
        '글쓰기 제한',
        `글쓰기는 자산 ${(LOUNGE_POST_THRESHOLD / 100000000).toFixed(1)}억원 이상 회원만 가능합니다.\n\n현재 자산: ${((eligibility?.totalAssets ?? 0) / 100000000).toFixed(2)}억원`,
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
                styles.chip, { backgroundColor: colors.surface, borderColor: colors.border },
                isActive && { backgroundColor: info.color + '25', borderColor: info.color },
              ]}
              onPress={() => setCategory(cat)}
            >
              <Ionicons
                name={info.icon as any}
                size={14}
                color={isActive ? info.color : colors.textSecondary}
              />
              <Text
                style={[
                  styles.chipLabel, { color: colors.textSecondary },
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
        style={[styles.sortButton, { backgroundColor: colors.surface }, sortMode === 'popular' && styles.sortButtonActive]}
        onPress={() => setSortMode('popular')}
      >
        <Ionicons
          name="flame"
          size={14}
          color={sortMode === 'popular' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.sortLabel, { color: colors.textSecondary },
            sortMode === 'popular' && { color: colors.primary, fontWeight: '700' },
          ]}
        >
          인기순
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sortButton, { backgroundColor: colors.surface }, sortMode === 'latest' && styles.sortButtonActive]}
        onPress={() => setSortMode('latest')}
      >
        <Ionicons
          name="time"
          size={14}
          color={sortMode === 'latest' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.sortLabel, { color: colors.textSecondary },
            sortMode === 'latest' && { color: colors.primary, fontWeight: '700' },
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
  // 로딩 중일 때 대기 화면 (자격 확인이 끝나기 전에 잠금 화면이 뜨는 것 방지)
  // ──────────────────────────────────────────────────────────
  if (eligibilityLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>VIP 라운지</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ──────────────────────────────────────────────────────────
  // 에러 발생 시 또는 데이터 조회 실패 시 준비 중 안내
  // ──────────────────────────────────────────────────────────
  if (eligibilityError || postsError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>VIP 라운지</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.comingSoonContainer}>
          <Ionicons name="wifi-outline" size={48} color="#555" />
          <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>연결에 실패했습니다</Text>
          <Text style={[styles.comingSoonDescription, { color: colors.textSecondary }]}>
            네트워크 상태를 확인하고 다시 시도해주세요.
          </Text>
          <TouchableOpacity style={styles.comingSoonButton} onPress={() => router.back()}>
            <Text style={styles.comingSoonButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ──────────────────────────────────────────────────────────
  // 자격 미달 시 잠금 화면
  // ──────────────────────────────────────────────────────────
  if (!eligibility.isEligible) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>VIP 라운지</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.lockedContainer}>
          <View style={styles.lockedIcon}>
            <Ionicons name="lock-closed" size={48} color="#FFC107" />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>VIP 라운지는 잠겨 있습니다</Text>
          <Text style={[styles.lockedDescription, { color: colors.textSecondary }]}>
            VIP 라운지 열람은 자산 {(LOUNGE_VIEW_THRESHOLD / 10000).toFixed(0)}만원 이상 회원만 가능합니다.
          </Text>
          <View style={[styles.lockedAssetBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.lockedAssetLabel, { color: colors.textSecondary }]}>현재 자산</Text>
            <Text style={[styles.lockedAssetValue, { color: colors.textPrimary }]}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>VIP 라운지</Text>
        <TouchableOpacity onPress={handleCreatePost}>
          <Ionicons name="create-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 필터 + 정렬 */}
      <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
        {renderCategoryChips()}
        {renderSortButtons()}
      </View>

      {/* 게시물 리스트 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.comingSoonContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color="#555" />
          <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>아직 게시물이 없습니다</Text>
          <Text style={[styles.comingSoonDescription, { color: colors.textSecondary }]}>
            첫 번째 투자 인사이트를 공유해보세요!
          </Text>
          {eligibility?.canPost && (
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreatePost}>
              <Text style={styles.emptyButtonText}>첫 게시물 작성하기</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item, index) => `${item?.id ?? index}-${index}`}
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
          // 성능 최적화: 페이지당 5개씩 로드 (더 빠른 트리거)
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // ── 필터 섹션 ──
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
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
  },
  sortButtonActive: {},
  sortLabel: {
    fontSize: 13,
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
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },

  // ── 준비 중 / 에러 안내 화면 ──
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  comingSoonDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  comingSoonHint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  comingSoonButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  comingSoonButtonText: {
    fontSize: 15,
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
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  lockedDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  lockedAssetBox: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  lockedAssetLabel: {
    fontSize: 12,
  },
  lockedAssetValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  lockedShortfall: {
    fontSize: 13,
    color: '#FFC107',
  },
  lockedButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  lockedButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
});
