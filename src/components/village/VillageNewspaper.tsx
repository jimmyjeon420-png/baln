/**
 * VillageNewspaper — 마을 신문 모달 컴포넌트
 *
 * 역할: "발른 마을 타임즈" — 오늘의 뉴스를 마을 신문 형태로 보여줌
 * - 신문 스타일 헤더 (발른 마을 신문 / Baln Village Times)
 * - 카테고리별 뉴스 기사 목록
 * - 각 기사에 구루 반응 (아바타 + 말풍선)
 * - "관련 예측 보기" 연결
 *
 * 비유: 동물의숲의 게시판 — 마을 뉴스를 읽고 구루들의 의견을 듣는 곳
 *
 * 사용처:
 * - 오늘 탭: "마을 신문 보기" 버튼으로 열기
 * - 마을 탭: 광장 게시판 탭으로 열기
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import type { NewspaperArticle, GuruNewsReaction } from '../../types/village';
import type { ThemeColors } from '../../styles/colors';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import { getMoodEmoji } from '../../services/moodEngine';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

interface VillageNewspaperProps {
  /** 뉴스 기사 목록 */
  articles: NewspaperArticle[];
  /** 모달 표시 여부 */
  isVisible: boolean;
  /** 모달 닫기 */
  onClose: () => void;
  /** 테마 색상 */
  colors: ThemeColors;
  /** 로케일 (ko/en) */
  locale?: string;
  /** 관련 예측으로 이동 */
  onPredictionPress?: (predictionId: string) => void;
  /** 구루 프로필로 이동 */
  onGuruPress?: (guruId: string) => void;
}

// ============================================================================
// 상수
// ============================================================================

/** 카테고리 이모지 + 라벨 */
const CATEGORY_CONFIG: Record<string, { emoji: string; labelKo: string; labelEn: string; color: string }> = {
  market: { emoji: '\uD83D\uDCC8', labelKo: '시장', labelEn: 'Market', color: '#4CAF50' },
  crypto: { emoji: '\uD83D\uDCB0', labelKo: '암호화폐', labelEn: 'Crypto', color: '#F7931A' },
  politics: { emoji: '\uD83C\uDFDB\uFE0F', labelKo: '정치', labelEn: 'Politics', color: '#1565C0' },
  economy: { emoji: '\uD83D\uDCCA', labelKo: '경제', labelEn: 'Economy', color: '#9C27B0' },
  village: { emoji: '\uD83C\uDFE0', labelKo: '마을 소식', labelEn: 'Village', color: '#FF8F00' },
};

/** 오늘 날짜 포맷 */
function formatNewspaperDate(locale: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = locale === 'ko'
    ? ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekday = weekdays[now.getDay()];

  if (locale === 'ko') {
    return `${year}년 ${month}월 ${day}일 ${weekday}`;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${weekday}, ${months[month - 1]} ${day}, ${year}`;
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/** 구루 반응 행 */
function GuruReactionRow({
  reactions,
  colors,
  locale,
  onGuruPress,
}: {
  reactions: GuruNewsReaction[];
  colors: ThemeColors;
  locale: string;
  onGuruPress?: (guruId: string) => void;
}) {
  const { t } = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!reactions || reactions.length === 0) return null;

  return (
    <View style={reactionStyles.container}>
      <Text style={[reactionStyles.label, { color: colors.textTertiary }]}>
        {t('village_ui.newspaper.guru_reactions')}
      </Text>
      <View style={reactionStyles.row}>
        {reactions.map((reaction) => {
          const config = GURU_CHARACTER_CONFIGS[reaction.guruId];
          if (!config) return null;

          const isExpanded = expandedId === reaction.guruId;
          const isKo = locale === 'ko';
          const moodEmoji = getMoodEmoji(reaction.mood ?? 'calm');
          const expression = reaction.sentiment === 'BULLISH' ? 'bullish'
            : reaction.sentiment === 'BEARISH' ? 'bearish'
            : reaction.sentiment === 'CAUTIOUS' ? 'cautious'
            : 'neutral';

          return (
            <View key={reaction.guruId} style={reactionStyles.reactionItem}>
              <TouchableOpacity
                style={reactionStyles.avatarButton}
                onPress={() => {
                  if (isExpanded) {
                    setExpandedId(null);
                  } else {
                    setExpandedId(reaction.guruId);
                  }
                }}
                onLongPress={() => onGuruPress?.(reaction.guruId)}
                activeOpacity={0.7}
              >
                <CharacterAvatar
                  guruId={reaction.guruId}
                  size="sm"
                  expression={expression}
                  fallbackEmoji={config.emoji}
                />
                <Text style={reactionStyles.moodEmoji}>{moodEmoji}</Text>
              </TouchableOpacity>

              {/* 확장된 말풍선 */}
              {isExpanded && (
                <View style={[reactionStyles.bubble, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[reactionStyles.bubbleName, { color: colors.primary }]}>
                    {config.emoji} {getGuruDisplayName(reaction.guruId)}
                  </Text>
                  <Text style={[reactionStyles.bubbleText, { color: colors.textPrimary }]}>
                    {isKo ? reaction.reaction : reaction.reactionEn}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** 개별 기사 카드 */
function ArticleCard({
  article,
  colors,
  locale,
  onPredictionPress,
  onGuruPress,
}: {
  article: NewspaperArticle;
  colors: ThemeColors;
  locale: string;
  onPredictionPress?: (predictionId: string) => void;
  onGuruPress?: (guruId: string) => void;
}) {
  const { t } = useLocale();
  const category = CATEGORY_CONFIG[article.category] || CATEGORY_CONFIG.market;
  const isKo = locale === 'ko';

  return (
    <View style={[articleStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 카테고리 배지 */}
      <View style={[articleStyles.categoryBadge, { backgroundColor: category.color + '20' }]}>
        <Text style={articleStyles.categoryEmoji}>{category.emoji}</Text>
        <Text style={[articleStyles.categoryLabel, { color: category.color }]}>
          {isKo ? category.labelKo : category.labelEn}
        </Text>
      </View>

      {/* 헤드라인 */}
      <Text style={[articleStyles.headline, { color: colors.textPrimary }]} numberOfLines={2}>
        {isKo ? article.headline : article.headlineEn}
      </Text>

      {/* 요약 */}
      <Text style={[articleStyles.summary, { color: colors.textSecondary }]} numberOfLines={3}>
        {isKo ? article.summary : article.summaryEn}
      </Text>

      {/* 구루 반응 */}
      <GuruReactionRow
        reactions={article.guruReactions ?? article.reactions ?? []}
        colors={colors}
        locale={locale}
        onGuruPress={onGuruPress}
      />

      {/* 관련 예측 버튼 */}
      {article.relatedPrediction && onPredictionPress && (
        <TouchableOpacity
          style={[articleStyles.predictionButton, { backgroundColor: colors.primary + '15' }]}
          onPress={() => onPredictionPress(article.relatedPrediction ?? '')}
          activeOpacity={0.7}
        >
          <Text style={[articleStyles.predictionText, { color: colors.primary }]}>
            {t('village_ui.newspaper.related_prediction')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

const VillageNewspaper = React.memo(({
  articles,
  isVisible,
  onClose,
  colors,
  locale = 'ko',
  onPredictionPress,
  onGuruPress,
}: VillageNewspaperProps) => {
  const { t } = useLocale();
  const _isKo = locale === 'ko';

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* 신문 헤더 */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTop}>
            <Text style={[styles.newspaperTitle, { color: colors.textPrimary }]}>
              {t('village_ui.newspaper.title')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>
                {t('village_ui.newspaper.close')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.dateLine, { borderTopColor: colors.border }]}>
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {formatNewspaperDate(locale)}
            </Text>
            <Text style={[styles.editionText, { color: colors.textTertiary }]}>
              {t('village_ui.newspaper.article_count', { count: articles.length })}
            </Text>
          </View>
        </View>

        {/* 기사 목록 */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {articles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{'\uD83D\uDCF0'}</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {t('village_ui.newspaper.empty_title')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {t('village_ui.newspaper.empty_subtitle')}
              </Text>
            </View>
          ) : (
            articles.map((article, index) => (
              <ArticleCard
                key={article.id || `article-${index}`}
                article={article}
                colors={colors}
                locale={locale}
                onPredictionPress={onPredictionPress}
                onGuruPress={onGuruPress}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
});

VillageNewspaper.displayName = 'VillageNewspaper';

export default VillageNewspaper;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newspaperTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dateLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  dateText: {
    fontSize: 13,
  },
  editionText: {
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
});

const articleStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
    marginBottom: 10,
  },
  categoryEmoji: {
    fontSize: 13,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  headline: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  predictionButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  predictionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

const reactionStyles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reactionItem: {
    alignItems: 'center',
  },
  avatarButton: {
    position: 'relative',
  },
  moodEmoji: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    fontSize: 14,
  },
  bubble: {
    marginTop: 8,
    borderRadius: 10,
    padding: 10,
    maxWidth: 200,
  },
  bubbleName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
