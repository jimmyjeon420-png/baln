/**
 * VIP 라운지 - 자산 기반 3단계 접근 커뮤니티
 *
 * 열람: 100만원+ (자산인증 필수)
 * 댓글: 1,000만원+
 * 글쓰기: 1.5억+
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useLoungeEligibility,
  useCommunityPosts,
  useCreatePost,
  useLikePost,
  useMyLikes,
  generateAssetMix,
} from '../../src/hooks/useCommunity';
import CommunityPostCard from '../../src/components/CommunityPostCard';
import {
  TIER_COLORS,
  CATEGORY_INFO,
  CommunityCategory,
  CommunityCategoryFilter,
  LOUNGE_VIEW_THRESHOLD,
  LOUNGE_COMMENT_THRESHOLD,
  LOUNGE_POST_THRESHOLD,
} from '../../src/types/community';

export default function LoungeScreen() {
  const router = useRouter();
  const [newPostContent, setNewPostContent] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategoryFilter>('all');
  const [postCategory, setPostCategory] = useState<CommunityCategory>('stocks');

  // 라운지 자격 확인
  const { eligibility, loading: eligibilityLoading, refetch: refetchEligibility } = useLoungeEligibility();

  // 게시물 목록
  const {
    data: posts,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useCommunityPosts(selectedCategory);

  // 좋아요 상태
  const { data: myLikes } = useMyLikes();

  // 게시물 작성
  const createPost = useCreatePost();

  // 좋아요
  const likePost = useLikePost();

  // 새로고침
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEligibility(), refetchPosts()]);
    setRefreshing(false);
  }, [refetchEligibility, refetchPosts]);

  // 게시물 작성 핸들러
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
      const assetMix = '주식 70%, 현금 30%';

      await createPost.mutateAsync({
        content: newPostContent.trim(),
        category: postCategory,
        displayTag: `[자산: ${(eligibility.totalAssets / 100000000).toFixed(1)}억]`,
        assetMix,
        totalAssets: eligibility.totalAssets,
      });

      setNewPostContent('');
      setPostCategory('stocks');
      setIsComposing(false);
      Alert.alert('성공', '게시물이 등록되었습니다.');
    } catch (error) {
      console.error('Post creation error:', error);
      Alert.alert('오류', '게시물 등록에 실패했습니다.');
    }
  };

  // 좋아요 핸들러
  const handleLike = (postId: string) => {
    likePost.mutate(postId);
  };

  // 게시물 클릭 → 상세 페이지
  const handlePostPress = (postId: string) => {
    router.push(`/community/${postId}` as any);
  };

  // 작성자 프로필 클릭
  const handleAuthorPress = (userId: string) => {
    router.push(`/community/author/${userId}` as any);
  };

  // 자산을 억/만 단위로 포맷
  const formatAmount = (amount: number) => {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`;
    return `${(amount / 10000).toFixed(0)}만원`;
  };

  // 글쓰기 버튼 클릭 시 자격 확인
  const handleComposePress = () => {
    if (!eligibility.canPost) {
      Alert.alert(
        '글쓰기 제한',
        `게시물 작성은 자산 1.5억 이상 회원만 가능합니다.\n\n현재 자산: ${formatAmount(eligibility.totalAssets)}\n필요 자산: 1.5억`,
        [{ text: '확인' }]
      );
      return;
    }
    setIsComposing(true);
  };

  // 로딩 상태
  if (eligibilityLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>자격 확인 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════
  // 잠금 화면: 100만원 미만 또는 자산 미등록
  // ══════════════════════════════════════════
  if (!eligibility.isEligible) {
    return (
      <SafeAreaView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VIP 라운지</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* 잠금 화면 */}
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

          {/* 현재 자산 */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>현재 자산</Text>
              <Text style={styles.progressValue}>
                {formatAmount(eligibility.totalAssets)}
              </Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min((eligibility.totalAssets / LOUNGE_VIEW_THRESHOLD) * 100, 100)}%`,
                  },
                ]}
              />
            </View>

            <Text style={styles.progressShortfall}>
              {eligibility.shortfall > 0
                ? `입장까지 ${formatAmount(eligibility.shortfall)} 더 필요`
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
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════
  // VIP 라운지 (100만원 이상 — 입장 완료)
  // ══════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>VIP 라운지</Text>
            <View style={[styles.vipBadge, { backgroundColor: TIER_COLORS.SILVER }]}>
              <Ionicons name="diamond" size={12} color="#000000" />
              <Text style={styles.vipBadgeText}>VIP</Text>
            </View>
          </View>
          {/* 글쓰기 버튼: 1.5억 미만이면 잠금 아이콘 */}
          <TouchableOpacity onPress={handleComposePress}>
            <Ionicons
              name={eligibility.canPost ? 'create-outline' : 'lock-closed-outline'}
              size={24}
              color={eligibility.canPost ? '#4CAF50' : '#666'}
            />
          </TouchableOpacity>
        </View>

        {/* 카테고리 탭 */}
        <View style={styles.categoryTabContainer}>
          {(Object.keys(CATEGORY_INFO) as CommunityCategoryFilter[]).map((key) => {
            const info = CATEGORY_INFO[key];
            const isActive = selectedCategory === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryTab,
                  isActive && { backgroundColor: info.color + '20', borderColor: info.color },
                ]}
                onPress={() => setSelectedCategory(key)}
              >
                <Ionicons
                  name={info.icon as any}
                  size={14}
                  color={isActive ? info.color : '#888888'}
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

        {/* 게시물 작성 영역 (1.5억+ 전용) */}
        {isComposing && (
          <View style={styles.composeContainer}>
            <View style={styles.composeHeader}>
              <Text style={styles.composeTitle}>새 게시물</Text>
              <TouchableOpacity onPress={() => setIsComposing(false)}>
                <Ionicons name="close" size={24} color="#888888" />
              </TouchableOpacity>
            </View>

            {/* 카테고리 선택 */}
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
                    <Ionicons
                      name={info.icon as any}
                      size={12}
                      color={isActive ? info.color : '#888888'}
                    />
                    <Text style={[
                      styles.composeCategoryText,
                      isActive && { color: info.color },
                    ]}>
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
              <Text style={styles.charCount}>
                {newPostContent.length}/500
              </Text>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { opacity: newPostContent.trim() ? 1 : 0.5 },
                ]}
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

            {/* 보유종목 공개 안내 */}
            <Text style={styles.holdingsNotice}>
              게시물에 상위 보유종목이 자동으로 공개됩니다
            </Text>
          </View>
        )}

        {/* 게시물 목록 */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4CAF50"
            />
          }
        >
          {/* 환영 배너 + 등급 안내 */}
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeTop}>
              <Text style={styles.welcomeIcon}>🏦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeText}>VIP 회원님, 환영합니다!</Text>
                <Text style={styles.welcomeSubtext}>
                  현재 자산: {formatAmount(eligibility.totalAssets)}
                </Text>
              </View>
            </View>

            {/* 접근 등급 표시 */}
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

          {/* 게시물 리스트 */}
          {postsLoading ? (
            <View style={styles.postsLoading}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : posts && posts.length > 0 ? (
            posts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                isLiked={myLikes?.has(post.id) ?? false}
                onLike={handleLike}
                onPress={handlePostPress}
                onAuthorPress={handleAuthorPress}
              />
            ))
          ) : (
            <View style={styles.emptyPosts}>
              <Ionicons name="chatbubbles-outline" size={48} color="#444444" />
              <Text style={styles.emptyPostsText}>
                아직 게시물이 없습니다
              </Text>
              <Text style={styles.emptyPostsSubtext}>
                {eligibility.canPost
                  ? '첫 번째 게시물을 작성해보세요!'
                  : '자산 1.5억 이상 회원이 게시물을 작성할 수 있습니다'}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 12,
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  vipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
    color: '#FFFFFF',
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },

  // ── 접근 등급 안내 ──
  accessGuide: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  accessGuideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#888',
    marginTop: 1,
  },

  // ── 프로그레스 ──
  progressSection: {
    width: '100%',
    backgroundColor: '#1E1E1E',
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
    color: '#888888',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#4CAF50',
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

  // ── 환영 배너 ──
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
    color: '#4CAF50',
  },
  welcomeSubtext: {
    fontSize: 13,
    color: '#888888',
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

  // ── 게시물 작성 ──
  composeContainer: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
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
    color: '#FFFFFF',
  },
  composeInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#FFFFFF',
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
    backgroundColor: '#4CAF50',
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

  // ── 게시물 목록 ──
  postsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPostsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyPostsSubtext: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
    textAlign: 'center',
  },

  // ── 카테고리 탭 ──
  categoryTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1E1E1E',
  },
  categoryTabText: {
    fontSize: 12,
    color: '#888888',
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
    borderColor: '#333333',
    backgroundColor: '#1E1E1E',
  },
  composeCategoryText: {
    fontSize: 12,
    color: '#888888',
  },
});
