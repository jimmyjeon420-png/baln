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
} from '../utils/communityUtils';

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
  const tier = getTierFromAssets(post.total_assets_at_post);
  const tierColor = TIER_COLORS[tier] || '#C0C0C0';
  const tierIcon = getTierIcon(tier);
  const categoryInfo = post.category ? CATEGORY_INFO[post.category] : null;
  const holdings = (post.top_holdings || []).slice(0, 5);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => onPress?.(post.id)}
    >
      {/* 헤더: 티어 아이콘 + 디스플레이 태그 + 카테고리 */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {/* 아바타 (탭하면 프로필 이동) */}
          <TouchableOpacity
            style={[styles.tierBadge, { backgroundColor: tierColor }]}
            onPress={(e) => {
              e.stopPropagation?.();
              onAuthorPress?.(post.user_id);
            }}
          >
            <Ionicons name={tierIcon} size={14} color="#000000" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={styles.tagRow}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onAuthorPress?.(post.user_id);
                }}
              >
                <Text style={[styles.displayTag, { color: tierColor }]}>
                  {post.display_tag}
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
            </View>
            {post.asset_mix && (
              <Text style={styles.assetMix}>{post.asset_mix}</Text>
            )}
          </View>
        </View>
        <Text style={styles.timeText}>{getRelativeTime(post.created_at)}</Text>
      </View>

      {/* 보유종목 칩 */}
      {holdings.length > 0 && (
        <View style={styles.holdingsRow}>
          {holdings.map((h: HoldingSnapshot, idx: number) => (
            <View
              key={`${h.ticker}-${idx}`}
              style={[
                styles.holdingChip,
                { borderColor: (HOLDING_TYPE_COLORS[h.type] || '#888') + '40' },
              ]}
            >
              <View style={[
                styles.holdingDot,
                { backgroundColor: HOLDING_TYPE_COLORS[h.type] || '#888' },
              ]} />
              <Text style={styles.holdingTicker}>
                {h.ticker.startsWith('RE_') ? '부동산' : h.ticker}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 본문 */}
      <Text style={styles.content} numberOfLines={5}>{post.content}</Text>

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
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      {/* 푸터: 좋아요 토글 + 댓글 수 */}
      <View style={styles.footer}>
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
            color={isLiked ? '#CF6679' : '#888888'}
          />
          <Text style={[styles.likeCount, isLiked && { color: '#CF6679' }]}>
            {post.likes_count || 0}
          </Text>
        </TouchableOpacity>

        <View style={styles.commentCount}>
          <Ionicons name="chatbubble-outline" size={16} color="#888888" />
          <Text style={styles.likeCount}>{post.comments_count || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  },
  displayTag: {
    fontSize: 13,
    fontWeight: '700',
  },
  assetMix: {
    fontSize: 11,
    color: '#888888',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: '#666666',
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
    fontSize: 10,
    fontWeight: '600',
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
    backgroundColor: '#161616',
  },
  holdingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  holdingTicker: {
    fontSize: 11,
    fontWeight: '600',
    color: '#AAA',
  },

  // ── 본문 + 푸터 ──
  content: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 24,
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
    backgroundColor: '#1E1E1E',
    marginRight: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  likeCount: {
    fontSize: 13,
    color: '#888888',
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
