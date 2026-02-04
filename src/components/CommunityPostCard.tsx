/**
 * Community Post Card - VIP 라운지 게시물 카드
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommunityPost, TIER_COLORS } from '../types/community';

interface CommunityPostCardProps {
  post: CommunityPost;
  onLike?: (postId: string) => void;
}

// 자산 금액에 따른 티어 결정
const getTierFromAssets = (assets: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' => {
  if (assets >= 5000000000) return 'DIAMOND';
  if (assets >= 1000000000) return 'PLATINUM';
  if (assets >= 500000000) return 'GOLD';
  if (assets >= 100000000) return 'SILVER';
  return 'BRONZE';
};

// 티어 아이콘
const getTierIcon = (tier: string): keyof typeof Ionicons.glyphMap => {
  switch (tier) {
    case 'DIAMOND': return 'diamond';
    case 'PLATINUM': return 'star';
    case 'GOLD': return 'trophy';
    case 'SILVER': return 'medal';
    default: return 'ribbon';
  }
};

// 상대적 시간 표시
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
};

export default function CommunityPostCard({ post, onLike }: CommunityPostCardProps) {
  const tier = getTierFromAssets(post.total_assets_at_post);
  const tierColor = TIER_COLORS[tier];
  const tierIcon = getTierIcon(tier);

  return (
    <View style={styles.container}>
      {/* 헤더: 티어 아이콘 + 디스플레이 태그 */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <Ionicons name={tierIcon} size={14} color="#000000" />
          </View>
          <View>
            <Text style={[styles.displayTag, { color: tierColor }]}>
              {post.display_tag}
            </Text>
            {post.asset_mix && (
              <Text style={styles.assetMix}>{post.asset_mix}</Text>
            )}
          </View>
        </View>
        <Text style={styles.timeText}>{getRelativeTime(post.created_at)}</Text>
      </View>

      {/* 본문 */}
      <Text style={styles.content}>{post.content}</Text>

      {/* 푸터: 좋아요 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => onLike?.(post.id)}
        >
          <Ionicons name="heart-outline" size={18} color="#888888" />
          <Text style={styles.likeCount}>{post.likes_count || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    marginBottom: 12,
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
  content: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 12,
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
});
