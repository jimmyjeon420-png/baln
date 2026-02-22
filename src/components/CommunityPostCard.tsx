/**
 * Community Post Card - VIP 라운지 게시물 카드
 *
 * 기능:
 * - 작성자 티어 배지 + 자산 태그
 * - 보유종목 칩 (상위 5개)
 * - 좋아요 토글 (하트 색상 변경)
 * - 작성자 아바타 탭 → 프로필 페이지
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CommunityPost,
  HoldingSnapshot,
  TIER_COLORS,
  CATEGORY_INFO,
} from '../types/community';
import {
  getTierFromAssets,
  getTierIcon,
  HOLDING_TYPE_COLORS,
  getRelativeTime,
  isBeginnerQuestion,
  stripBeginnerQuestionPrefix,
  formatCommunityDisplayTag,
  buildCommunityAssetMixFromHoldings,
  getCommunityHoldingLabel,
  getCommunityHoldingRatio,
  formatPortfolioRatio,
} from '../utils/communityUtils';
import { useTheme } from '../hooks/useTheme';

interface CommunityPostCardProps {
  post: CommunityPost;
  isLiked?: boolean;
  onLike?: (postId: string) => void;
  onPress?: (postId: string) => void;
  onAuthorPress?: (userId: string) => void;
}

export default function CommunityPostCard({
  post,
  isLiked = false,
  onLike,
  onPress,
  onAuthorPress,
}: CommunityPostCardProps) {
  const { theme, colors } = useTheme();
  const isLightTheme = theme === 'light';
  const tier = getTierFromAssets(post.total_assets_at_post);
  const tierColor = TIER_COLORS[tier] || '#C0C0C0';
  const lightTierTextColors: Record<string, string> = {
    SILVER: '#475569',
    GOLD: '#92400E',
    PLATINUM: '#334155',
    DIAMOND: '#0369A1',
  };
  const tierAccentColor = isLightTheme
    ? (lightTierTextColors[tier] || colors.primaryDark || colors.primary)
    : tierColor;
  const tierBadgeBackground = isLightTheme ? `${tierAccentColor}1A` : tierColor;
  const tierBadgeBorderColor = isLightTheme ? `${tierAccentColor}4D` : 'transparent';
  const tierIconColor = isLightTheme ? tierAccentColor : '#000000';
  const tierIcon = getTierIcon(tier);
  const categoryInfo = post.category ? CATEGORY_INFO[post.category] : null;
  const allHoldings = post.top_holdings || [];
  const holdings = allHoldings.slice(0, 5);
  const displayTag = formatCommunityDisplayTag(post.total_assets_at_post);
  const assetMixText = buildCommunityAssetMixFromHoldings(allHoldings, post.total_assets_at_post);
  const beginnerQuestion = isBeginnerQuestion(post.content);
  const displayContent = stripBeginnerQuestionPrefix(post.content);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.7}
      onPress={() => onPress?.(post.id)}
    >
      {/* 헤더: 티어 아이콘 + 디스플레이 태그 + 카테고리 */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {/* 아바타 (탭하면 프로필 이동) */}
          <TouchableOpacity
            style={[
              styles.tierBadge,
              {
                backgroundColor: tierBadgeBackground,
                borderColor: tierBadgeBorderColor,
              },
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              onAuthorPress?.(post.user_id);
            }}
          >
            <Ionicons name={tierIcon} size={14} color={tierIconColor} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={styles.tagRow}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onAuthorPress?.(post.user_id);
                }}
              >
                <Text style={[styles.displayTag, { color: tierAccentColor }]}>
                  {displayTag}
                </Text>
              </TouchableOpacity>
              {categoryInfo && (
                <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
                  <Ionicons
                    name={categoryInfo.icon as any}
                    size={10}
                    color={categoryInfo.color}
                  />
                  <Text style={[styles.categoryLabel, { color: categoryInfo.color }]}>
                    {categoryInfo.label}
                  </Text>
                </View>
              )}
              {beginnerQuestion && (
                <View style={[styles.beginnerBadge, { backgroundColor: `${colors.success}20` }]}>
                  <Ionicons name="help-circle" size={10} color={colors.primaryDark ?? colors.success} />
                  <Text style={[styles.beginnerBadgeLabel, { color: colors.primaryDark ?? colors.success }]}>초보 질문</Text>
                </View>
              )}
            </View>
            {assetMixText && (
              <Text style={[styles.assetMix, { color: colors.textSecondary }]}>{assetMixText}</Text>
            )}
          </View>
        </View>
        <Text style={[styles.timeText, { color: colors.textTertiary }]}>{getRelativeTime(post.created_at)}</Text>
      </View>

      {/* 보유종목 칩 */}
      {holdings.length > 0 && (
        <View style={styles.holdingsRow}>
          {holdings.map((h: HoldingSnapshot, idx: number) => (
            <View
              key={`${h.ticker}-${idx}`}
              style={[
                styles.holdingChip,
                {
                  backgroundColor: colors.surfaceLight,
                  borderColor: (HOLDING_TYPE_COLORS[h.type] || colors.textTertiary) + '40',
                },
              ]}
            >
              <View style={[
                styles.holdingDot,
                { backgroundColor: HOLDING_TYPE_COLORS[h.type] || colors.textTertiary },
              ]} />
              <Text style={[styles.holdingTicker, { color: colors.textSecondary }]}>
                {getCommunityHoldingLabel(h)}
              </Text>
              <Text style={[styles.holdingRatio, { color: colors.textTertiary }]}>
                {formatPortfolioRatio(getCommunityHoldingRatio(h.value, post.total_assets_at_post, allHoldings))}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 본문 */}
      <Text style={[styles.content, { color: colors.textPrimary }]} numberOfLines={5}>{displayContent}</Text>

      {/* 첨부 이미지 썸네일 (최대 3장 가로 스크롤) */}
      {post.image_urls && post.image_urls.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageGallery}
          contentContainerStyle={styles.imageGalleryContent}
        >
          {post.image_urls.map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={[styles.thumbnailImage, { backgroundColor: colors.surfaceElevated }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      {/* 푸터: 좋아요 토글 + 댓글 수 */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.likeButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onLike?.(post.id);
          }}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={isLiked ? colors.sell : colors.textTertiary}
          />
          <Text style={[styles.likeCount, { color: isLiked ? colors.sell : colors.textSecondary }]}>
            {post.likes_count || 0}
          </Text>
        </TouchableOpacity>

        <View style={styles.commentCount}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.likeCount, { color: colors.textSecondary }]}>{post.comments_count || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  tierBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  displayTag: {
    fontSize: 14,
    fontWeight: '700',
  },
  assetMix: {
    fontSize: 12,
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  beginnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
  },
  beginnerBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── 보유종목 칩 ──
  holdingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  holdingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  holdingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  holdingTicker: {
    fontSize: 12,
    fontWeight: '600',
  },
  holdingRatio: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── 본문 + 푸터 ──
  content: {
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 12,
  },
  // ── 이미지 갤러리 (썸네일) ──
  imageGallery: {
    marginBottom: 12,
    marginHorizontal: -16, // 카드 패딩 무시
  },
  imageGalleryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnailImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  likeCount: {
    fontSize: 14,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
