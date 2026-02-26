/**
 * CafeRankBadge — 카페 등급 배지
 *
 * 역할: "카페 등급 이름표" — 사용자 이름 옆에 카페 등급을 표시
 * 비유: 스타벅스 골드/그린 등급 뱃지처럼, 사용자 활동량을 시각화
 *
 * 사용처:
 * - 라운지 게시글 작성자 정보 옆
 * - 라운지 프로필 영역
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocale } from '../../context/LocaleContext';
import type { CafeRank } from '../../data/cafeConfig';

// =============================================================================
// 타입
// =============================================================================

interface CafeRankBadgeProps {
  /** 카페 등급 객체 (calculateCafeRank 결과) */
  rank: CafeRank;
  /** 컴팩트 모드 (이모지만 표시) */
  compact?: boolean;
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function CafeRankBadge({ rank, compact = false }: CafeRankBadgeProps): React.ReactElement {
  const { language } = useLocale();
  const isKo = language === 'ko';
  const displayName = isKo ? rank.nameKo : rank.nameEn;

  if (compact) {
    return (
      <Text style={styles.compactEmoji} accessibilityLabel={displayName}>
        {rank.emoji}
      </Text>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: rank.color + '20', borderColor: rank.color + '50' }]}>
      <Text style={styles.badgeEmoji}>{rank.emoji}</Text>
      <Text style={[styles.badgeName, { color: rank.color }]}>
        {displayName}
      </Text>
    </View>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactEmoji: {
    fontSize: 14,
  },
});

export default CafeRankBadge;
