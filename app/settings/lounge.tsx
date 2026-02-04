/**
 * VIP 라운지 - 1억 이상 회원 전용 커뮤니티
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
  generateAssetMix,
} from '../../src/hooks/useCommunity';
import CommunityPostCard from '../../src/components/CommunityPostCard';
import { TIER_COLORS } from '../../src/types/community';

export default function LoungeScreen() {
  const router = useRouter();
  const [newPostContent, setNewPostContent] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  // 라운지 자격 확인
  const { eligibility, loading: eligibilityLoading, refetch: refetchEligibility } = useLoungeEligibility();

  // 게시물 목록
  const {
    data: posts,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useCommunityPosts();

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
      // 자산 믹스 계산 (간단하게 처리)
      const assetMix = '주식 70%, 현금 30%'; // 실제로는 포트폴리오에서 계산

      await createPost.mutateAsync({
        content: newPostContent.trim(),
        displayTag: `[자산: ${(eligibility.totalAssets / 100000000).toFixed(1)}억]`,
        assetMix,
        totalAssets: eligibility.totalAssets,
      });

      setNewPostContent('');
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

  // 자산을 억 단위로 포맷
  const formatInBillion = (amount: number) => {
    return (amount / 100000000).toFixed(1);
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

  // 자격 미달 (1억 미만 또는 미검증)
  if (!eligibility.isEligible) {
    // 자산은 충분하지만 검증이 필요한 경우
    const needsVerification = eligibility.isVerificationRequired;

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
            <Ionicons
              name={needsVerification ? 'shield-checkmark' : 'lock-closed'}
              size={64}
              color={needsVerification ? '#4CAF50' : '#FFC107'}
            />
          </View>

          <Text style={styles.lockedTitle}>
            {needsVerification ? '자산 검증이 필요합니다' : 'VIP 전용 공간입니다'}
          </Text>
          <Text style={styles.lockedSubtitle}>
            {needsVerification
              ? 'OCR 인증으로 자산을 검증해주세요'
              : '검증된 자산 1억 이상 회원만 입장 가능합니다'}
          </Text>

          {/* 조건 체크리스트 */}
          <View style={styles.requirementsList}>
            <View style={styles.requirementItem}>
              <Ionicons
                name={eligibility.totalAssets >= eligibility.requiredAssets ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={eligibility.totalAssets >= eligibility.requiredAssets ? '#4CAF50' : '#666666'}
              />
              <Text style={[
                styles.requirementText,
                eligibility.totalAssets >= eligibility.requiredAssets && styles.requirementMet
              ]}>
                총 자산 1억 이상 ({formatInBillion(eligibility.totalAssets)}억)
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons
                name={eligibility.hasVerifiedAssets && eligibility.verifiedAssetsTotal >= eligibility.requiredAssets ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={eligibility.hasVerifiedAssets && eligibility.verifiedAssetsTotal >= eligibility.requiredAssets ? '#4CAF50' : '#666666'}
              />
              <Text style={[
                styles.requirementText,
                eligibility.hasVerifiedAssets && eligibility.verifiedAssetsTotal >= eligibility.requiredAssets && styles.requirementMet
              ]}>
                OCR 검증 완료 ({formatInBillion(eligibility.verifiedAssetsTotal)}억 인증됨)
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>검증된 자산</Text>
              <Text style={styles.progressValue}>
                {formatInBillion(eligibility.verifiedAssetsTotal)}억
              </Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min((eligibility.verifiedAssetsTotal / eligibility.requiredAssets) * 100, 100)}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.progressFooter}>
              <Text style={styles.progressShortfall}>
                {eligibility.shortfall > 0 ? `${formatInBillion(eligibility.shortfall)}억 더 필요` : '조건 충족!'}
              </Text>
              <Text style={styles.progressTarget}>목표: 검증 1억</Text>
            </View>
          </View>

          {needsVerification ? (
            <TouchableOpacity
              style={[styles.investButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => router.push('/add-asset')}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.investButtonText}>자산 OCR 인증하기</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.investButton}
              onPress={() => router.push('/add-asset')}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.investButtonText}>자산 추가하기</Text>
            </TouchableOpacity>
          )}

          {/* 안내 문구 */}
          <Text style={styles.verificationNote}>
            * 수동 입력 자산은 라운지 입장 조건에 포함되지 않습니다
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // VIP 라운지 (자격 충족)
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
          <TouchableOpacity onPress={() => setIsComposing(true)}>
            <Ionicons name="create-outline" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* 게시물 작성 영역 */}
        {isComposing && (
          <View style={styles.composeContainer}>
            <View style={styles.composeHeader}>
              <Text style={styles.composeTitle}>새 게시물</Text>
              <TouchableOpacity onPress={() => setIsComposing(false)}>
                <Ionicons name="close" size={24} color="#888888" />
              </TouchableOpacity>
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
          {/* 환영 배너 */}
          <View style={styles.welcomeBanner}>
            <Text style={styles.welcomeIcon}>🎉</Text>
            <View>
              <Text style={styles.welcomeText}>VIP 회원님, 환영합니다!</Text>
              <Text style={styles.welcomeSubtext}>
                현재 자산: {formatInBillion(eligibility.totalAssets)}억
              </Text>
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
                onLike={handleLike}
              />
            ))
          ) : (
            <View style={styles.emptyPosts}>
              <Ionicons name="chatbubbles-outline" size={48} color="#444444" />
              <Text style={styles.emptyPostsText}>
                아직 게시물이 없습니다
              </Text>
              <Text style={styles.emptyPostsSubtext}>
                첫 번째 게시물을 작성해보세요!
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

  // 잠금 화면 스타일
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
    marginBottom: 32,
  },
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
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressShortfall: {
    fontSize: 13,
    color: '#FFC107',
  },
  progressTarget: {
    fontSize: 13,
    color: '#888888',
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
  requirementsList: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requirementText: {
    fontSize: 14,
    color: '#888888',
  },
  requirementMet: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  verificationNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },

  // 환영 배너
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A2E1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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

  // 게시물 작성
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

  // 게시물 목록
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
  },
});
