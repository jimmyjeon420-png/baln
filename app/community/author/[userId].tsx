/**
 * 작성자 프로필 페이지 (SNS형)
 *
 * 표시 내용:
 * - 티어 배지 + 자산 규모
 * - 보유종목 (가장 최근 게시물의 스냅샷)
 * - 이전 게시물 타임라인
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuthorPosts,
  useLikePost,
  useMyLikes,
} from '../../../src/hooks/useCommunity';
import CommunityPostCard from '../../../src/components/CommunityPostCard';
import {
  HoldingSnapshot,
  TIER_COLORS,
  TIER_LABELS,
} from '../../../src/types/community';
import {
  getTierFromAssets,
  getTierIcon,
  formatCommunityDisplayTag,
  getCommunityHoldingLabel,
  getCommunityHoldingRatio,
  formatPortfolioRatio,
} from '../../../src/utils/communityUtils';
import { useTheme } from '../../../src/hooks/useTheme';

export default function AuthorProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  // 작성자 게시물 목록
  const { data: posts, isLoading, refetch } = useAuthorPosts(userId || '');

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

  const handleLike = (postId: string) => {
    likePost.mutate(postId);
  };

  const handlePostPress = (postId: string) => {
    router.push(`/community/${postId}` as any);
  };

  // 로딩
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  // 게시물 없음
  if (!posts || posts.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="person-outline" size={48} color="#444" />
          <Text style={styles.emptyText}>게시물이 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 가장 최근 게시물에서 프로필 정보 추출
  const latestPost = posts[0];
  const tier = getTierFromAssets(latestPost.total_assets_at_post);
  const tierColor = TIER_COLORS[tier] || '#C0C0C0';
  const tierIcon = getTierIcon(tier);
  const tierLabel = TIER_LABELS[tier] || tier;

  // 보유종목 합산 (가장 최근 게시물 기준)
  const holdings = (latestPost.top_holdings || []).slice(0, 10);

  // 종목 타입별 분류
  const stockHoldings = holdings.filter((h: HoldingSnapshot) => h.type === 'stock');
  const cryptoHoldings = holdings.filter((h: HoldingSnapshot) => h.type === 'crypto');
  const otherHoldings = holdings.filter((h: HoldingSnapshot) => h.type !== 'stock' && h.type !== 'crypto');

  // 프로필 헤더 렌더링
  const renderProfileHeader = () => (
    <View>
      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        {/* 아바타 + 티어 */}
        <View style={styles.profileTop}>
          <View style={[styles.profileAvatar, { backgroundColor: tierColor }]}>
            <Ionicons name={tierIcon} size={28} color="#000" />
          </View>
          <View style={styles.profileInfo}>
            <View style={[styles.tierBadge, { backgroundColor: tierColor + '25' }]}>
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>
                {tierLabel}
              </Text>
            </View>
            <Text style={styles.profileAssets}>
              {formatCommunityDisplayTag(latestPost.total_assets_at_post)}
            </Text>
          </View>
        </View>

        {/* 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>게시물</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {posts.reduce((sum, p) => sum + (p.likes_count || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>받은 좋아요</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {posts.reduce((sum, p) => sum + (p.comments_count || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>받은 댓글</Text>
          </View>
        </View>
      </View>

      {/* 보유종목 섹션 */}
      {holdings.length > 0 && (
        <View style={styles.holdingsCard}>
          <Text style={styles.sectionTitle}>투자 포트폴리오</Text>

          {/* 주식 */}
          {stockHoldings.length > 0 && (
            <View style={styles.holdingGroup}>
              <View style={styles.holdingGroupHeader}>
                <View style={[styles.holdingGroupDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.holdingGroupLabel}>주식</Text>
              </View>
              <View style={styles.holdingChipsRow}>
                {stockHoldings.map((h: HoldingSnapshot, idx: number) => (
                  <View key={`s-${idx}`} style={[styles.holdingChip, { borderColor: '#4CAF5040' }]}>
                    <Text style={styles.holdingChipTicker}>{getCommunityHoldingLabel(h)}</Text>
                    <Text style={styles.holdingChipRatio}>
                      {formatPortfolioRatio(getCommunityHoldingRatio(h.value, latestPost.total_assets_at_post, holdings))}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 암호화폐 */}
          {cryptoHoldings.length > 0 && (
            <View style={styles.holdingGroup}>
              <View style={styles.holdingGroupHeader}>
                <View style={[styles.holdingGroupDot, { backgroundColor: '#F7931A' }]} />
                <Text style={styles.holdingGroupLabel}>암호화폐</Text>
              </View>
              <View style={styles.holdingChipsRow}>
                {cryptoHoldings.map((h: HoldingSnapshot, idx: number) => (
                  <View key={`c-${idx}`} style={[styles.holdingChip, { borderColor: '#F7931A40' }]}>
                    <Text style={styles.holdingChipTicker}>{getCommunityHoldingLabel(h)}</Text>
                    <Text style={styles.holdingChipRatio}>
                      {formatPortfolioRatio(getCommunityHoldingRatio(h.value, latestPost.total_assets_at_post, holdings))}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 기타 */}
          {otherHoldings.length > 0 && (
            <View style={styles.holdingGroup}>
              <View style={styles.holdingGroupHeader}>
                <View style={[styles.holdingGroupDot, { backgroundColor: '#888' }]} />
                <Text style={styles.holdingGroupLabel}>기타</Text>
              </View>
              <View style={styles.holdingChipsRow}>
                {otherHoldings.map((h: HoldingSnapshot, idx: number) => (
                  <View key={`o-${idx}`} style={[styles.holdingChip, { borderColor: '#88888840' }]}>
                    <Text style={styles.holdingChipTicker}>{getCommunityHoldingLabel(h)}</Text>
                    <Text style={styles.holdingChipRatio}>
                      {formatPortfolioRatio(getCommunityHoldingRatio(h.value, latestPost.total_assets_at_post, holdings))}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* 게시물 타임라인 헤더 */}
      <View style={styles.timelineHeader}>
        <Text style={styles.sectionTitle}>게시물</Text>
        <Text style={styles.timelineCount}>{posts.length}개</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 게시물 타임라인 */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postCardWrapper}>
            <CommunityPostCard
              post={item}
              isLiked={myLikes?.has(item.id) ?? false}
              onLike={handleLike}
              onPress={handlePostPress}
            />
          </View>
        )}
        ListHeaderComponent={renderProfileHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
  },
  listContent: {
    paddingBottom: 40,
  },

  // ── 프로필 카드 ──
  profileCard: {
    backgroundColor: '#1E1E1E',
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 20,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  profileAssets: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DDD',
  },

  // ── 통계 ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#161616',
    borderRadius: 12,
    paddingVertical: 14,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#333',
  },

  // ── 보유종목 카드 ──
  holdingsCard: {
    backgroundColor: '#1E1E1E',
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  holdingGroup: {
    marginBottom: 12,
  },
  holdingGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  holdingGroupDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  holdingGroupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAA',
  },
  holdingChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 12,
  },
  holdingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#161616',
  },
  holdingChipTicker: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DDD',
  },
  holdingChipRatio: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
  },

  // ── 타임라인 ──
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  timelineCount: {
    fontSize: 14,
    color: '#888',
  },
  postCardWrapper: {
    paddingHorizontal: 16,
  },
});
