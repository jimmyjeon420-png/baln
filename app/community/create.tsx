/**
 * 게시글 작성 화면 (VIP 라운지)
 *
 * 역할: 글쓰기 부서 — 카테고리 선택 + 본문 입력 + 자동 보유종목 스냅샷
 *
 * 기능:
 * - 카테고리 선택 (주식/코인/부동산) — 필수
 * - 본문 입력 (500자 제한)
 * - 자산 정보 자동 표시 (현재 자산, 티어)
 * - 보유종목 자동 스냅샷 (상위 10개)
 * - 자격 확인 (자산 기준 미달 시 차단)
 *
 * 비유: 편지지에 글을 쓰는 것 — 주제를 정하고, 내용을 작성하면 자동으로 서명(자산 정보)이 붙음
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useCreatePost,
  useLoungeEligibility,
  useUserDisplayInfo,
  generateAssetMix,
} from '../../src/hooks/useCommunity';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import {
  CommunityCategory,
  CATEGORY_INFO,
  LOUNGE_POST_THRESHOLD,
} from '../../src/types/community';
import { useTheme } from '../../src/hooks/useTheme';
import {
  formatAssetAmount,
  getTierFromAssets,
  TIER_COLORS,
  TIER_LABELS,
  BEGINNER_QUESTION_PREFIX,
} from '../../src/utils/communityUtils';
import { validateContent, getViolationMessage } from '../../src/services/contentFilter';
import {
  pickImages,
  validateImages,
  uploadMultipleImages,
  formatFileSize,
  MAX_IMAGES,
  PickedImage,
} from '../../src/services/imageUpload';
import { getCurrentUser } from '../../src/services/supabase';

const MAX_CONTENT_LENGTH = 500;

// assetType → 한국어 카테고리 매핑 (컴포넌트 외부에 상수로 선언)
const ASSET_TYPE_KR: Record<string, string> = {
  liquid: '금융자산',
  LIQUID: '금융자산',
  illiquid: '부동산',
  ILLIQUID: '부동산',
  other: '기타',
};

export default function CreatePostScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const postRequirementLabel = formatAssetAmount(LOUNGE_POST_THRESHOLD);

  // 자격 확인
  const { eligibility, loading: eligibilityLoading } = useLoungeEligibility();

  // 포트폴리오 정보 (자산 믹스 계산용)
  const { totalAssets, assets } = useSharedPortfolio();

  // 게시글 작성 mutation
  const createPost = useCreatePost();

  // 상태
  const [category, setCategory] = useState<CommunityCategory | null>(null);
  const [content, setContent] = useState('');
  const [isBeginnerQuestion, setIsBeginnerQuestion] = useState(false);
  const [selectedImages, setSelectedImages] = useState<PickedImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // 총 평가손익 계산 (costBasis 있는 자산만)
  const totalGain = React.useMemo(() => {
    return assets.reduce((sum, a) => {
      const cost = a.costBasis ?? a.currentValue;
      return sum + (a.currentValue - cost);
    }, 0);
  }, [assets]);

  // 사용자 표시 정보 (실제 손익 반영)
  const displayInfo = useUserDisplayInfo(eligibility.totalAssets, totalGain);

  // 자산 믹스 계산 (한국어 카테고리명)
  const assetMix = React.useMemo(() => {
    const categories: { category: string; percentage: number }[] = [];
    const total = totalAssets;
    if (total === 0) return '';

    // 포트폴리오에서 카테고리별 합산
    const byCategory: Record<string, number> = {};
    assets.forEach((asset) => {
      const raw = (asset.assetType as string) || 'other';
      const cat = ASSET_TYPE_KR[raw] ?? raw;
      byCategory[cat] = (byCategory[cat] || 0) + asset.currentValue;
    });

    // 비율 계산
    Object.entries(byCategory).forEach(([cat, value]) => {
      const percentage = Math.round((value / total) * 100);
      if (percentage > 0) {
        categories.push({ category: cat, percentage });
      }
    });

    return generateAssetMix(categories);
  }, [assets, totalAssets]);

  // 이미지 선택 핸들러
  const handlePickImages = async () => {
    try {
      const images = await pickImages(MAX_IMAGES - selectedImages.length);

      if (images.length === 0) {
        return; // 취소됨
      }

      // 유효성 검사
      const validation = validateImages([...selectedImages, ...images]);
      if (!validation.isValid) {
        Alert.alert('이미지 선택 실패', validation.error);
        return;
      }

      setSelectedImages([...selectedImages, ...images]);
    } catch (error: any) {
      Alert.alert('이미지 선택 실패', error.message || '이미지를 선택할 수 없습니다.');
    }
  };

  // 이미지 삭제 핸들러
  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 작성 버튼 핸들러
  const handleSubmit = async () => {
    // 유효성 검사
    if (!category) {
      Alert.alert('카테고리 선택', '게시글 카테고리를 선택해주세요.');
      return;
    }

    if (content.trim().length === 0) {
      Alert.alert('내용 입력', '게시글 내용을 입력해주세요.');
      return;
    }

    if (content.trim().length < 10) {
      Alert.alert('내용이 너무 짧습니다', '최소 10자 이상 입력해주세요.');
      return;
    }

    // 콘텐츠 필터링 (금지어, 전화번호, URL 등)
    const filterResult = validateContent(content.trim());
    if (!filterResult.isValid) {
      Alert.alert(
        '부적절한 콘텐츠 감지',
        getViolationMessage(filterResult) + '\n\n자본시장법에 따라 투자 리딩, 불법 광고 등은 금지됩니다.',
      );
      return;
    }

    if (!eligibility.canPost) {
      Alert.alert(
        '글쓰기 제한',
        `글쓰기는 자산 ${postRequirementLabel} 이상 회원만 가능합니다.\n\n현재 자산: ${formatAssetAmount(eligibility.totalAssets)}`,
      );
      return;
    }

    try {
      setIsUploadingImages(true);

      // 1. 이미지 업로드 (있는 경우)
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error('로그인이 필요합니다.');
        }

        // 임시 postId 생성 (실제 게시글 ID는 생성 후에 알 수 있음)
        const tempPostId = Date.now().toString();

        imageUrls = await uploadMultipleImages(selectedImages, user.id, tempPostId);

        if (imageUrls.length === 0) {
          throw new Error('이미지 업로드에 실패했습니다.');
        }
      }

      setIsUploadingImages(false);

      const normalizedContent = content.trim();
      const finalContent = isBeginnerQuestion
        ? `${BEGINNER_QUESTION_PREFIX} ${normalizedContent}`
        : normalizedContent;

      // 2. 게시글 생성 (이미지 URL 포함)
      await createPost.mutateAsync({
        content: finalContent,
        category,
        displayTag: displayInfo.displayTag,
        assetMix: assetMix || '다양한 자산',
        totalAssets: eligibility.totalAssets,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      Alert.alert('작성 완료', '게시글이 성공적으로 작성되었습니다.', [
        {
          text: '확인',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Post creation error:', error);
      setIsUploadingImages(false);
      Alert.alert('오류', '게시글 작성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 자격 미달 시 차단 화면
  if (eligibilityLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>글쓰기</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!eligibility.canPost) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>글쓰기</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.lockedContainer}>
          <View style={[styles.lockedIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="lock-closed" size={48} color="#FFC107" />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>글쓰기는 잠겨 있습니다</Text>
          <Text style={[styles.lockedDescription, { color: colors.textSecondary }]}>
            글쓰기는 자산 {postRequirementLabel} 이상 회원만 가능합니다.
          </Text>
          <View style={[styles.lockedAssetBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.lockedAssetLabel, { color: colors.textSecondary }]}>현재 자산</Text>
            <Text style={[styles.lockedAssetValue, { color: colors.textPrimary }]}>
              {formatAssetAmount(eligibility.totalAssets)}
            </Text>
            <Text style={styles.lockedShortfall}>
              {formatAssetAmount(Math.max(0, LOUNGE_POST_THRESHOLD - eligibility.totalAssets))} 더 필요합니다
            </Text>
          </View>
          <TouchableOpacity style={[styles.lockedButton, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={styles.lockedButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 티어 정보
  const tier = getTierFromAssets(eligibility.totalAssets);
  const tierColor = TIER_COLORS[tier] || '#C0C0C0';
  const tierLabel = TIER_LABELS[tier] || tier;

  // 메인 화면
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>글쓰기</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={createPost.isPending}
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              (!category || content.trim().length === 0) && [styles.submitButtonDisabled, { backgroundColor: colors.surface }],
            ]}
          >
            {createPost.isPending ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text
                style={[
                  styles.submitButtonText,
                  (!category || content.trim().length === 0) && { color: colors.textSecondary },
                ]}
              >
                작성
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* 작성자 정보 카드 */}
          <View style={[styles.authorCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
              <Ionicons
                name={tier === 'DIAMOND' ? 'diamond' : tier === 'PLATINUM' ? 'star' : tier === 'GOLD' ? 'medal' : 'shield'}
                size={16}
                color="#000000"
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={[styles.tierChip, { backgroundColor: tierColor + '25' }]}>
                <Text style={[styles.tierChipText, { color: tierColor }]}>{tierLabel}</Text>
              </View>
              <Text style={[styles.authorAssets, { color: colors.textPrimary }]}>
                자산: {(eligibility.totalAssets / 100000000).toFixed(2)}억원
              </Text>
              {assetMix && (
                <Text style={[styles.authorAssetMix, { color: colors.textSecondary }]}>{assetMix}</Text>
              )}
            </View>
          </View>

          {/* 카테고리 선택 */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              카테고리 선택 <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <View style={styles.categoryRow}>
              {(['stocks', 'crypto', 'realestate'] as CommunityCategory[]).map((cat) => {
                const info = CATEGORY_INFO[cat];
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelected && { backgroundColor: info.color + '25', borderColor: info.color },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Ionicons
                      name={info.icon as any}
                      size={18}
                      color={isSelected ? info.color : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: colors.textSecondary },
                        isSelected && { color: info.color, fontWeight: '700' },
                      ]}
                    >
                      {info.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 본문 입력 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                내용 <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <Text
                style={[
                  styles.charCount,
                  { color: colors.textSecondary },
                  content.length > MAX_CONTENT_LENGTH && { color: colors.error },
                ]}
              >
                {content.length} / {MAX_CONTENT_LENGTH}
              </Text>
            </View>
            <TextInput
              style={[styles.contentInput, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              placeholder="투자 경험, 전략, 또는 시장 관점을 공유해보세요..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={MAX_CONTENT_LENGTH}
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
            />
          </View>

          {/* 초보 질문 태그 */}
          <TouchableOpacity
            style={[styles.beginnerQuestionRow, { backgroundColor: colors.surface }]}
            onPress={() => setIsBeginnerQuestion((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.beginnerQuestionLeft}>
              <View style={[styles.beginnerQuestionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="help-circle" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.beginnerQuestionTitle, { color: colors.textPrimary }]}>
                  초보 질문 태그
                </Text>
                <Text style={[styles.beginnerQuestionDesc, { color: colors.textSecondary }]}>
                  체크하면 게시글에 "초보 질문" 배지가 표시됩니다.
                </Text>
              </View>
            </View>
            <Ionicons
              name={isBeginnerQuestion ? 'checkbox' : 'square-outline'}
              size={22}
              color={isBeginnerQuestion ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>

          {/* 이미지 첨부 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>이미지 첨부 (선택)</Text>
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {selectedImages.length} / {MAX_IMAGES}
              </Text>
            </View>

            {/* 이미지 선택 버튼 */}
            {selectedImages.length < MAX_IMAGES && (
              <TouchableOpacity
                style={[styles.imagePickButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handlePickImages}
                disabled={isUploadingImages}
              >
                <Ionicons name="camera" size={24} color={colors.primary} />
                <Text style={[styles.imagePickButtonText, { color: colors.textSecondary }]}>
                  이미지 선택 (최대 {MAX_IMAGES}장, 각 5MB 이하)
                </Text>
              </TouchableOpacity>
            )}

            {/* 선택된 이미지 썸네일 */}
            {selectedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imagePreviewItem}>
                    <Image source={{ uri: image.uri }} style={[styles.imagePreview, { backgroundColor: colors.surface }]} />
                    <TouchableOpacity
                      style={[styles.imageRemoveButton, { backgroundColor: colors.background }]}
                      onPress={() => handleRemoveImage(index)}
                      disabled={isUploadingImages}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </TouchableOpacity>
                    {image.fileSize && (
                      <Text style={[styles.imageFileSize, { color: colors.textSecondary }]}>{formatFileSize(image.fileSize)}</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            {/* 업로드 진행 표시 */}
            {isUploadingImages && (
              <View style={[styles.uploadingIndicator, { backgroundColor: colors.primary + '15' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.uploadingText, { color: colors.primary }]}>이미지 업로드 중...</Text>
              </View>
            )}
          </View>

          {/* 안내 문구 */}
          <View style={[styles.infoBox, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="information-circle" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textPrimary }]}>
              게시글 작성 시 보유종목 상위 10개가 자동으로 표시됩니다.
            </Text>
          </View>

          {/* 법률 안내 */}
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle" size={16} color="#FFC107" />
            <Text style={styles.warningText}>
              자본시장법에 따라 투자 리딩, 종목 추천, 수익률 보장 등의 행위는 금지됩니다.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    fontSize: 19,
    fontWeight: '700',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  submitButtonTextDisabled: {},
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedTitle: {
    fontSize: 21,
    fontWeight: '700',
  },
  lockedDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  lockedAssetBox: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  lockedAssetLabel: {
    fontSize: 13,
  },
  lockedAssetValue: {
    fontSize: 25,
    fontWeight: '700',
  },
  lockedShortfall: {
    fontSize: 14,
    color: '#FFC107',
  },
  lockedButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  lockedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  authorCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  tierChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  authorAssets: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  authorAssetMix: {
    fontSize: 13,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  contentInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 200,
    lineHeight: 25,
  },
  beginnerQuestionRow: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  beginnerQuestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  beginnerQuestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beginnerQuestionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  beginnerQuestionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 193, 7, 0.06)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FFC107',
    lineHeight: 19,
  },
  imagePickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  imagePickButtonText: {
    fontSize: 15,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
  },
  imageFileSize: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
