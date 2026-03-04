/**
 * NewsReactionCard — 오늘 탭용 뉴스 반응 카드
 *
 * 역할: "마을 광장 속보판" — 주요 뉴스 1건 + 구루 미니 반응을 컴팩트하게 표시
 * - 카테고리 이모지 + 헤드라인 (1줄)
 * - 구루 3~4명 미니 아바타 + 감정 표시
 * - "더보기" 버튼으로 VillageNewspaper 모달 열기
 *
 * 비유: 동물의숲 마을 게시판의 "오늘의 소식" 한 줄 — 탭하면 상세
 *
 * 사용처:
 * - 오늘 탭 (index.tsx): 맥락 카드 아래, 예측 투표 위에 배치
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { NewspaperArticle } from '../../types/village';
import type { ThemeColors } from '../../styles/colors';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getMoodEmoji } from '../../services/moodEngine';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

interface NewsReactionCardProps {
  /** 뉴스 기사 */
  article: NewspaperArticle;
  /** 카드 탭 콜백 (상세 모달 열기) */
  onPress: () => void;
  /** 구루 아바타 탭 콜백 */
  onGuruPress: (guruId: string) => void;
  /** 테마 색상 */
  colors: ThemeColors;
}

// ============================================================================
// 상수
// ============================================================================

/** 카테고리 이모지 */
const CATEGORY_EMOJI: Record<string, string> = {
  market: '\uD83D\uDCC8',       // 📈
  crypto: '\uD83D\uDCB0',       // 💰
  politics: '\uD83C\uDFDB\uFE0F', // 🏛️
  economy: '\uD83D\uDCCA',      // 📊
  village: '\uD83C\uDFE0',      // 🏠
};

/** 표시할 최대 구루 반응 수 */
const MAX_VISIBLE_REACTIONS = 4;

// ============================================================================
// 컴포넌트
// ============================================================================

const NewsReactionCard = React.memo(({
  article,
  onPress,
  onGuruPress,
  colors,
}: NewsReactionCardProps) => {
  const { t, language } = useLocale();
  const categoryEmoji = CATEGORY_EMOJI[article.category] || '\uD83D\uDCF0';
  const headline = language === 'ko' ? article.headline : article.headlineEn;
  const reactions = article.guruReactions || [];
  const visibleReactions = reactions.slice(0, MAX_VISIBLE_REACTIONS);
  const remainingCount = Math.max(0, reactions.length - MAX_VISIBLE_REACTIONS);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${t('newsReaction.news')}: ${headline}`}
    >
      {/* 상단: 카테고리 + 헤드라인 */}
      <View style={styles.headerRow}>
        <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
        <Text
          style={[styles.headline, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {headline}
        </Text>
      </View>

      {/* 하단: 구루 미니 반응 + 더보기 */}
      <View style={styles.bottomRow}>
        {/* 구루 아바타 행 */}
        <View style={styles.reactionsRow}>
          {visibleReactions.map((reaction) => {
            const config = GURU_CHARACTER_CONFIGS[reaction.guruId];
            if (!config) return null;

            const expression = reaction.sentiment === 'BULLISH' ? 'bullish'
              : reaction.sentiment === 'BEARISH' ? 'bearish'
              : reaction.sentiment === 'CAUTIOUS' ? 'cautious'
              : 'neutral';
            const moodEmoji = getMoodEmoji(reaction.mood ?? 'calm');

            return (
              <TouchableOpacity
                key={reaction.guruId}
                style={styles.guruReactionItem}
                onPress={() => onGuruPress(reaction.guruId)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View style={styles.miniAvatarWrapper}>
                  <CharacterAvatar
                    guruId={reaction.guruId}
                    size="sm"
                    expression={expression}
                    fallbackEmoji={config.emoji}
                  />
                  {/* 미니 감정 인디케이터 */}
                  <Text style={styles.miniMoodEmoji}>{moodEmoji}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* 추가 구루 수 배지 */}
          {remainingCount > 0 && (
            <View style={[styles.moreCountBadge, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.moreCountText, { color: colors.textSecondary }]}>
                +{remainingCount}
              </Text>
            </View>
          )}
        </View>

        {/* 더보기 버튼 */}
        <TouchableOpacity
          style={[styles.moreButton, { backgroundColor: colors.surfaceLight }]}
          onPress={onPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.moreButtonText, { color: colors.textSecondary }]}>
            {t('common.more')}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

NewsReactionCard.displayName = 'NewsReactionCard';

export default NewsReactionCard;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    // 그림자 (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // 그림자 (Android)
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryEmoji: {
    fontSize: 16,
    flexShrink: 0,
  },
  headline: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  guruReactionItem: {
    position: 'relative',
  },
  miniAvatarWrapper: {
    position: 'relative',
    // sm size (44px) 스케일 다운해서 32px로 표시
    transform: [{ scale: 0.73 }],
  },
  miniMoodEmoji: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 12,
  },
  moreCountBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreButton: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
