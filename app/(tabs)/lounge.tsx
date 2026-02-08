/**
 * VIP 라운지 - 커뮤니티 + 모임 통합 화면
 *
 * 세그먼트 컨트롤로 두 섹션 전환:
 *   커뮤니티(기본): 게시글/댓글/좋아요 (100만+ 열람, 1000만+ 댓글, 1.5억+ 글쓰기)
 *   모임: 스터디/정기모임/네트워킹/워크샵 (100만+ 열람, 1억+ 모임 생성)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useLoungeEligibility,
  useCommunityPosts,
  useCreatePost,
  useLikePost,
  useMyLikes,
  PostSortBy,
} from '../../src/hooks/useCommunity';
import {
  useGatherings,
  useHostingEligibility,
  formatAssetInBillion,
  TIER_COLORS,
} from '../../src/hooks/useGatherings';
import CommunityPostCard from '../../src/components/CommunityPostCard';
import GatheringCard from '../../src/components/GatheringCard';
import { LoungeSkeleton } from '../../src/components/SkeletonLoader';
import {
  CATEGORY_INFO,
  CommunityCategory,
  CommunityCategoryFilter,
  LOUNGE_VIEW_THRESHOLD,
  LOUNGE_COMMENT_THRESHOLD,
  LOUNGE_POST_THRESHOLD,
} from '../../src/types/community';
import { formatAssetAmount } from '../../src/utils/communityUtils';
import { Gathering, GATHERING_CATEGORY_LABELS } from '../../src/types/database';

// ══════════════════════════════════════════
// 상수
// ══════════════════════════════════════════

const COLORS = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  primary: '#4CAF50',
  error: '#CF6679',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#888888',
  border: '#333333',
};

type Segment = 'community' | 'gatherings';

// 커뮤니티 정렬 옵션
const SORT_OPTIONS: { key: PostSortBy; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'latest', label: '최신', icon: 'time-outline' },
  { key: 'popular', label: '인기', icon: 'heart-outline' },
  { key: 'hot', label: '댓글순', icon: 'chatbubble-outline' },
];

// 모임 카테고리 필터
const GATHERING_CATEGORY_FILTERS: { key: Gathering['category'] | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'study', label: '스터디' },
  { key: 'meeting', label: '정기 모임' },
  { key: 'networking', label: '네트워킹' },
  { key: 'workshop', label: '워크샵' },
];

// ══════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════

export default function LoungeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 세그먼트 상태
  const [activeSegment, setActiveSegment] = useState<Segment>('community');

  // 커뮤니티 상태
  const [communityCategory, setCommunityCategory] = useState<CommunityCategoryFilter>('all');
  const [sortBy, setSortBy] = useState<PostSortBy>('latest');
  const [newPostContent, setNewPostContent] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [postCategory, setPostCategory] = useState<CommunityCategory>('stocks');

  // 모임 상태
  const [gatheringCategory, setGatheringCategory] = useState<Gathering['category'] | 'all'>('all');

  // 공통 상태
  const [refreshing, setRefreshing] = useState(false);

  // ── 훅 ──
  const { eligibility, loading: eligibilityLoading, refetch: refetchEligibility } = useLoungeEligibility();
  const {
    data: postsData,
    isLoading: postsLoading,
    refetch: refetchPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityPosts(communityCategory, sortBy);
  const { data: myLikes } = useMyLikes();
  const createPost = useCreatePost();
  const likePost = useLikePost();
  const { data: hostingEligibility } = useHostingEligibility();
  const { data: gatherings, isLoading: gatheringsLoading, refetch: refetchGatherings } = useGatherings(
    gatheringCategory === 'all' ? undefined : gatheringCategory
  );

  // 무한 스크롤 페이지 플래트닝
  const posts = useMemo(
    () => postsData?.pages?.flat() ?? [],
    [postsData],
  );

  // ── 새로고침 (세그먼트별 분기) ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeSegment === 'community') {
      await Promise.all([refetchEligibility(), refetchPosts()]);
    } else {
      await Promise.all([refetchEligibility(), refetchGatherings()]);
    }
    setRefreshing(false);
  }, [activeSegment, refetchEligibility, refetchPosts, refetchGatherings]);

  // ── 핸들러: 커뮤니티 ──
  const handleSubmitPost = async () => {
    if (!newPostContent.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }
    if (newPostContent.length > 500) {
      Alert.alert('알림', '500자 이내로 작성해주세요.');
      return;
    }
    try {
      await createPost.mutateAsync({
        content: newPostContent.trim(),
        category: postCategory,
        displayTag: `[자산: ${(eligibility.totalAssets / 100000000).toFixed(1)}억]`,
        assetMix: '주식 70%, 현금 30%',
        totalAssets: eligibility.totalAssets,
      });
      setNewPostContent('');
      setPostCategory('stocks');
      setIsComposing(false);
      Alert.alert('성공', '게시물이 등록되었습니다.');
    } catch (error: any) {
      const msg = error?.message || '알 수 없는 오류';
      Alert.alert('게시물 등록 실패', `사유: ${msg}`);
    }
  };

  const handleLike = (postId: string) => likePost.mutate(postId);
  const handlePostPress = (postId: string) => router.push(`/community/${postId}` as any);
  const handleAuthorPress = (userId: string) => router.push(`/community/author/${userId}` as any);

  const handleComposePress = () => {
    if (!eligibility.canPost) {
      Alert.alert(
        '글쓰기 제한',
        `게시물 작성은 자산 1.5억 이상 회원만 가능합니다.\n\n현재 자산: ${formatAssetAmount(eligibility.totalAssets)}\n필요 자산: 1.5억`,
        [{ text: '확인' }]
      );
      return;
    }
    setIsComposing(true);
  };

  // ── 핸들러: 모임 ──
  const handleGatheringPress = (gathering: Gathering) => router.push(`/gatherings/${gathering.id}`);
  const handleCreateGathering = () => router.push('/gatherings/create');

  // formatAssetAmount는 communityUtils에서 import

  // ══════════════════════════════════════════
  // 로딩 상태
  // ══════════════════════════════════════════
  if (eligibilityLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>VIP 라운지</Text>
            <View style={styles.vipBadge}>
              <Ionicons name="diamond" size={14} color="#B9F2FF" />
              <Text style={styles.vipBadgeText}>PRIVATE</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>자격 확인 중...</Text>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════
  // 잠금 화면: 100만원 미만
  // ══════════════════════════════════════════
  if (!eligibility.isEligible) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>VIP 라운지</Text>
            <View style={styles.vipBadge}>
              <Ionicons name="diamond" size={14} color="#B9F2FF" />
              <Text style={styles.vipBadgeText}>PRIVATE</Text>
            </View>
          </View>
        </View>

        {/* 잠금 본문 */}
        <View style={styles.lockedContainer}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={64} color="#FFC107" />
          </View>

          <Text style={styles.lockedTitle}>VIP 전용 공간입니다</Text>
          <Text style={styles.lockedSubtitle}>
            자산 인증 후 100만원 이상의 자산을 보유한{'\n'}
            회원만 입장할 수 있습니다
          </Text>

          {/* 등급 안내 */}
          <View style={styles.accessGuide}>
            <Text style={styles.accessGuideTitle}>접근 등급 안내</Text>

            <View style={styles.accessTier}>
              <View style={[styles.accessDot, { backgroundColor: '#4CAF50' }]} />
              <View style={styles.accessTierContent}>
                <Text style={styles.accessTierLabel}>열람 가능</Text>
                <Text style={styles.accessTierReq}>자산 100만원 이상</Text>
              </View>
              <Ionicons
                name={eligibility.totalAssets >= LOUNGE_VIEW_THRESHOLD ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={eligibility.totalAssets >= LOUNGE_VIEW_THRESHOLD ? '#4CAF50' : '#555'}
              />
            </View>

            <View style={styles.accessTier}>
              <View style={[styles.accessDot, { backgroundColor: '#2196F3' }]} />
              <View style={styles.accessTierContent}>
                <Text style={styles.accessTierLabel}>댓글 작성</Text>
                <Text style={styles.accessTierReq}>자산 1,000만원 이상</Text>
              </View>
              <Ionicons
                name={eligibility.totalAssets >= LOUNGE_COMMENT_THRESHOLD ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={eligibility.totalAssets >= LOUNGE_COMMENT_THRESHOLD ? '#4CAF50' : '#555'}
              />
            </View>

            <View style={styles.accessTier}>
              <View style={[styles.accessDot, { backgroundColor: '#FFD700' }]} />
              <View style={styles.accessTierContent}>
                <Text style={styles.accessTierLabel}>게시물 작성</Text>
                <Text style={styles.accessTierReq}>자산 1.5억 이상</Text>
              </View>
              <Ionicons
                name={eligibility.totalAssets >= LOUNGE_POST_THRESHOLD ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={eligibility.totalAssets >= LOUNGE_POST_THRESHOLD ? '#4CAF50' : '#555'}
              />
            </View>
          </View>

          {/* 현재 자산 진행률 */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>현재 자산</Text>
              <Text style={styles.progressValue}>
                {formatAssetAmount(eligibility.totalAssets)}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min((eligibility.totalAssets / LOUNGE_VIEW_THRESHOLD) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressShortfall}>
              {eligibility.shortfall > 0
                ? `입장까지 ${formatAssetAmount(eligibility.shortfall)} 더 필요`
                : '조건 충족!'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.investButton}
            onPress={() => router.push('/add-asset')}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.investButtonText}>자산 등록하기</Text>
          </TouchableOpacity>

          <Text style={styles.verificationNote}>
            * 자산을 등록하면 자동으로 등급이 부여됩니다
          </Text>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════
  // 메인 화면 (100만원 이상 — 입장 완료)
  // ══════════════════════════════════════════
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>VIP 라운지</Text>
            <View style={styles.vipBadge}>
              <Ionicons name="diamond" size={14} color="#B9F2FF" />
              <Text style={styles.vipBadgeText}>PRIVATE</Text>
            </View>
          </View>
        </View>

        {/* 세그먼트 컨트롤 (토스 스타일 pill) */}
        <View style={styles.segmentContainer}>
          <View style={styles.segmentControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeSegment === 'community' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveSegment('community')}
            >
              <Ionicons
                name="chatbubbles"
                size={14}
                color={activeSegment === 'community' ? '#000' : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'community' && styles.segmentTextActive,
                ]}
              >
                커뮤니티
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeSegment === 'gatherings' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveSegment('gatherings')}
            >
              <Ionicons
                name="calendar"
                size={14}
                color={activeSegment === 'gatherings' ? '#000' : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'gatherings' && styles.segmentTextActive,
                ]}
              >
                모임
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ════════════ 커뮤니티 세그먼트 ════════════ */}
        {activeSegment === 'community' && (
          <>
            {/* 카테고리 필터 */}
            <View style={styles.categoryTabContainer}>
              {(Object.keys(CATEGORY_INFO) as CommunityCategoryFilter[]).map((key) => {
                const info = CATEGORY_INFO[key];
                const isActive = communityCategory === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryTab,
                      isActive && { backgroundColor: info.color + '20', borderColor: info.color },
                    ]}
                    onPress={() => setCommunityCategory(key)}
                  >
                    <Ionicons
                      name={info.icon as any}
                      size={14}
                      color={isActive ? info.color : COLORS.textMuted}
                    />
                    <Text style={[
                      styles.categoryTabText,
                      isActive && { color: info.color, fontWeight: '700' },
                    ]}>
                      {info.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 정렬 칩 */}
            <View style={styles.sortChipContainer}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.sortChip,
                    sortBy === opt.key && styles.sortChipActive,
                  ]}
                  onPress={() => setSortBy(opt.key)}
                >
                  <Ionicons
                    name={opt.icon}
                    size={12}
                    color={sortBy === opt.key ? '#000' : COLORS.textMuted}
                  />
                  <Text style={[
                    styles.sortChipText,
                    sortBy === opt.key && styles.sortChipTextActive,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 글쓰기 영역 */}
            {isComposing && (
              <View style={styles.composeContainer}>
                <View style={styles.composeHeader}>
                  <Text style={styles.composeTitle}>새 게시물</Text>
                  <TouchableOpacity onPress={() => setIsComposing(false)}>
                    <Ionicons name="close" size={24} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.composeCategoryRow}>
                  {(['stocks', 'crypto', 'realestate'] as CommunityCategory[]).map((key) => {
                    const info = CATEGORY_INFO[key];
                    const isActive = postCategory === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.composeCategoryChip,
                          isActive && { backgroundColor: info.color + '20', borderColor: info.color },
                        ]}
                        onPress={() => setPostCategory(key)}
                      >
                        <Ionicons name={info.icon as any} size={12} color={isActive ? info.color : COLORS.textMuted} />
                        <Text style={[styles.composeCategoryText, isActive && { color: info.color }]}>
                          {info.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.composeInput}
                  placeholder="투자 인사이트를 공유해주세요..."
                  placeholderTextColor="#666666"
                  multiline
                  maxLength={500}
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                />
                <View style={styles.composeFooter}>
                  <Text style={styles.charCount}>{newPostContent.length}/500</Text>
                  <TouchableOpacity
                    style={[styles.submitButton, { opacity: newPostContent.trim() ? 1 : 0.5 }]}
                    onPress={handleSubmitPost}
                    disabled={!newPostContent.trim() || createPost.isPending}
                  >
                    {createPost.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitButtonText}>게시</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.holdingsNotice}>
                  게시물에 상위 보유종목이 자동으로 공개됩니다
                </Text>
              </View>
            )}

            {/* 게시물 목록 (FlatList + 무한 스크롤) */}
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <CommunityPostCard
                  post={item}
                  isLiked={myLikes?.has(item.id) ?? false}
                  onLike={handleLike}
                  onPress={handlePostPress}
                  onAuthorPress={handleAuthorPress}
                />
              )}
              ListHeaderComponent={
                <View style={styles.welcomeBanner}>
                  <View style={styles.welcomeTop}>
                    <Text style={styles.welcomeIcon}>{'🏦'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.welcomeText}>VIP 회원님, 환영합니다!</Text>
                      <Text style={styles.welcomeSubtext}>
                        현재 자산: {formatAssetAmount(eligibility.totalAssets)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.accessBadgeRow}>
                    <View style={[styles.accessBadgeItem, { backgroundColor: 'rgba(76,175,80,0.15)' }]}>
                      <Ionicons name="eye" size={12} color="#4CAF50" />
                      <Text style={[styles.accessBadgeLabel, { color: '#4CAF50' }]}>열람</Text>
                    </View>
                    <View style={[
                      styles.accessBadgeItem,
                      { backgroundColor: eligibility.canComment ? 'rgba(33,150,243,0.15)' : 'rgba(100,100,100,0.15)' },
                    ]}>
                      <Ionicons
                        name={eligibility.canComment ? 'chatbubble' : 'lock-closed'}
                        size={12}
                        color={eligibility.canComment ? '#2196F3' : '#666'}
                      />
                      <Text style={[
                        styles.accessBadgeLabel,
                        { color: eligibility.canComment ? '#2196F3' : '#666' },
                      ]}>
                        댓글 {eligibility.canComment ? '' : '(1,000만+)'}
                      </Text>
                    </View>
                    <View style={[
                      styles.accessBadgeItem,
                      { backgroundColor: eligibility.canPost ? 'rgba(255,215,0,0.15)' : 'rgba(100,100,100,0.15)' },
                    ]}>
                      <Ionicons
                        name={eligibility.canPost ? 'create' : 'lock-closed'}
                        size={12}
                        color={eligibility.canPost ? '#FFD700' : '#666'}
                      />
                      <Text style={[
                        styles.accessBadgeLabel,
                        { color: eligibility.canPost ? '#FFD700' : '#666' },
                      ]}>
                        글쓰기 {eligibility.canPost ? '' : '(1.5억+)'}
                      </Text>
                    </View>
                  </View>
                </View>
              }
              ListEmptyComponent={
                postsLoading ? (
                  <View style={styles.postsLoading}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>아직 게시물이 없습니다</Text>
                    <Text style={styles.emptyDescription}>
                      {eligibility.canPost
                        ? '첫 번째 게시물을 작성해보세요!'
                        : '자산 1.5억 이상 회원이 게시물을 작성할 수 있습니다'}
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={styles.postsLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : <View style={{ height: 100 }} />
              }
              onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
              onEndReachedThreshold={0.5}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={COLORS.primary}
                  colors={[COLORS.primary]}
                />
              }
            />

            {/* 글쓰기 FAB (1.5억+ 전용) */}
            {eligibility.canPost && !isComposing && (
              <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 80 }]}
                onPress={handleComposePress}
                activeOpacity={0.8}
              >
                <Ionicons name="create" size={22} color="#000000" />
                <Text style={styles.fabText}>글쓰기</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ════════════ 모임 세그먼트 ════════════ */}
        {activeSegment === 'gatherings' && (
          <>
            {/* 카테고리 필터 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {GATHERING_CATEGORY_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.categoryChip,
                    gatheringCategory === filter.key && styles.categoryChipActive,
                  ]}
                  onPress={() => setGatheringCategory(filter.key)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      gatheringCategory === filter.key && styles.categoryChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 모임 목록 (FlatList) */}
            <FlatList
              data={gatherings ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <GatheringCard
                  gathering={item}
                  onPress={() => handleGatheringPress(item)}
                  userTier={hostingEligibility?.tier}
                />
              )}
              ListHeaderComponent={
                <View style={styles.gatheringWelcome}>
                  <View style={styles.gatheringWelcomeContent}>
                    <Text style={styles.gatheringWelcomeTitle}>안녕하세요, VIP 멤버님 {'👑'}</Text>
                    <Text style={styles.gatheringWelcomeSubtitle}>
                      인증된 자산가들과 함께하는 프라이빗 모임에 참여하세요.
                    </Text>
                  </View>
                  {hostingEligibility?.tier && (
                    <View style={[
                      styles.tierIndicator,
                      { backgroundColor: TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS] + '30' },
                    ]}>
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color={TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS]}
                      />
                      <Text style={[
                        styles.tierText,
                        { color: TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS] },
                      ]}>
                        {formatAssetInBillion(hostingEligibility.verifiedAssets)} 인증
                      </Text>
                    </View>
                  )}
                </View>
              }
              ListEmptyComponent={
                gatheringsLoading ? (
                  <LoungeSkeleton />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={64} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>아직 등록된 모임이 없습니다</Text>
                    <Text style={styles.emptyDescription}>
                      첫 번째 모임을 만들어보세요!
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={<View style={{ height: 100 }} />}
              contentContainerStyle={styles.gatheringsContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={COLORS.primary}
                  colors={[COLORS.primary]}
                />
              }
            />

            {/* 모임 만들기 FAB (1억+ 전용) */}
            {hostingEligibility?.canHost && (
              <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 80 }]}
                onPress={handleCreateGathering}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={28} color="#000000" />
                <Text style={styles.fabText}>모임 만들기</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── 헤더 ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 242, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  vipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B9F2FF',
  },

  // ── 세그먼트 컨트롤 (토스 pill) ──
  segmentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 3,
    height: 36,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  segmentTextActive: {
    color: '#000',
  },

  // ── 로딩 ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },

  // ── 잠금 화면 ──
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  lockIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2A2A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  accessGuide: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  accessGuideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },
  accessTier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  accessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accessTierContent: {
    flex: 1,
  },
  accessTierLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DDD',
  },
  accessTierReq: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  progressSection: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressShortfall: {
    fontSize: 13,
    color: '#FFC107',
  },
  investButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  investButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  verificationNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },

  // ── 커뮤니티: 카테고리 탭 ──
  categoryTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  categoryTabText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // ── 커뮤니티: 정렬 칩 ──
  sortChipContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  sortChipTextActive: {
    color: '#000',
  },

  // ── 커뮤니티: 환영 배너 ──
  welcomeBanner: {
    backgroundColor: '#1A2E1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  welcomeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  welcomeIcon: {
    fontSize: 32,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  welcomeSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  accessBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accessBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  accessBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── 커뮤니티: 글쓰기 ──
  composeContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  composeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  composeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  composeCategoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  composeCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  composeCategoryText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  composeInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  composeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  charCount: {
    fontSize: 13,
    color: '#666666',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  holdingsNotice: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ── 커뮤니티: 게시물 로딩 / 비어있음 ──
  postsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // ── 모임: 카테고리 ──
  categoryScroll: {
    maxHeight: 50,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: '#000000',
  },

  // ── 모임: 환영 배너 ──
  gatheringWelcome: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  gatheringWelcomeContent: {
    marginBottom: 12,
  },
  gatheringWelcomeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  gatheringWelcomeSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  tierIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gatheringsContent: {
    padding: 20,
    paddingTop: 8,
  },

  // ── 공통: 빈 상태 ──
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // ── 공통: FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
});
