/**
 * NewsReactionDetailModal — 뉴스 반응 상세 모달
 *
 * 역할: "마을 신문사 기사 전문" — 뉴스에 대한 10명 구루의 상세 반응 표시
 * 비유: 신문 기사를 펼쳤을 때 전문가 코멘트가 쭉 나오는 것
 *
 * 기능:
 * - 뉴스 헤드라인 상단
 * - 감정 분포 (이모지 바 차트)
 * - 10명 구루 반응 + 코멘트
 * - "내 포트폴리오 영향" 섹션
 * - "구루에게 질문하기" 버튼
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import type { GuruNewsReaction } from '../../types/village';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// Sentiment emoji mapping
// ============================================================================

const SENTIMENT_EMOJIS: Record<string, string> = {
  BULLISH: '😄',
  BEARISH: '😟',
  NEUTRAL: '🤔',
  CAUTIOUS: '😐',
  joy: '😄',
  joyful: '😄',
  excited: '🤩',
  calm: '😌',
  worried: '😟',
  thinking: '🤔',
  thoughtful: '🤔',
  grumpy: '😤',
  sad: '😢',
  angry: '😡',
  surprised: '😲',
  sleepy: '😴',
};

function getSentimentEmoji(sentiment: string): string {
  return SENTIMENT_EMOJIS[sentiment] || '🤔';
}

// ============================================================================
// Props
// ============================================================================

interface NewsReactionDetailModalProps {
  visible: boolean;
  headline: string;
  headlineEn?: string;
  reactions: GuruNewsReaction[];
  onClose: () => void;
  onAskGuru?: (guruId: string) => void;
  colors: {
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    primary: string;
    border: string;
  };
}

// ============================================================================
// Component
// ============================================================================

export function NewsReactionDetailModal({
  visible,
  headline,
  headlineEn,
  reactions,
  onClose,
  onAskGuru,
  colors,
}: NewsReactionDetailModalProps) {
  const { t, language } = useLocale();
  const displayHeadline = language === 'ko' ? headline : (headlineEn || headline);

  // Calculate sentiment distribution
  const sentimentCounts = new Map<string, number>();
  for (const r of reactions) {
    const emoji = getSentimentEmoji(r.sentiment);
    sentimentCounts.set(emoji, (sentimentCounts.get(emoji) || 0) + 1);
  }
  const total = reactions.length || 1;
  const distribution = Array.from(sentimentCounts.entries())
    .map(([emoji, count]) => ({ emoji, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Headline */}
          <Text style={[styles.headline, { color: colors.textPrimary }]}>
            {displayHeadline}
          </Text>

          {/* Sentiment Distribution */}
          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('newsReactionDetail.sentimentTitle')}
            </Text>
            <View style={styles.distRow}>
              {distribution.map(d => (
                <View key={d.emoji} style={styles.distItem}>
                  <Text style={styles.distEmoji}>{d.emoji}</Text>
                  <View style={[styles.distBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.distBarFill,
                        { backgroundColor: colors.primary, width: `${d.pct}%` },
                      ]}
                    />
                  </View>
                  <Text style={[styles.distPct, { color: colors.textTertiary }]}>
                    {d.pct}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Guru Reactions */}
          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('newsReactionDetail.reactionsTitle')}
            </Text>
            {reactions.map(r => {
              const config = GURU_CHARACTER_CONFIGS[r.guruId];
              if (!config) return null;
              const name = getGuruDisplayName(r.guruId);
              const comment = language === 'ko' ? r.reaction : (r.reactionEn || r.reaction);
              return (
                <TouchableOpacity
                  key={r.guruId}
                  style={[styles.reactionRow, { borderColor: colors.border }]}
                  onPress={() => onAskGuru?.(r.guruId)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{config.emoji}</Text>
                  <View style={styles.reactionContent}>
                    <View style={styles.reactionHeader}>
                      <Text style={[styles.reactionName, { color: colors.textPrimary }]}>
                        {name}
                      </Text>
                      <Text style={styles.sentimentBadge}>
                        {getSentimentEmoji(r.sentiment)}
                      </Text>
                    </View>
                    <Text style={[styles.reactionComment, { color: colors.textSecondary }]}>
                      {comment}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Portfolio Impact */}
          <View style={[styles.portfolioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.portfolioEmoji}>📊</Text>
            <View style={styles.portfolioText}>
              <Text style={[styles.portfolioTitle, { color: colors.textPrimary }]}>
                {t('newsReactionDetail.portfolioTitle')}
              </Text>
              <Text style={[styles.portfolioDesc, { color: colors.textTertiary }]}>
                {t('newsReactionDetail.portfolioDesc')}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  section: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  distRow: {
    gap: 6,
  },
  distItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distEmoji: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  distBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  distPct: {
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reactionEmoji: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
    paddingTop: 2,
  },
  reactionContent: {
    flex: 1,
    gap: 4,
  },
  reactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactionName: {
    fontSize: 14,
    fontWeight: '700',
  },
  sentimentBadge: {
    fontSize: 14,
  },
  reactionComment: {
    fontSize: 13,
    lineHeight: 19,
  },
  portfolioCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },
  portfolioEmoji: {
    fontSize: 28,
  },
  portfolioText: {
    flex: 1,
    gap: 3,
  },
  portfolioTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  portfolioDesc: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  closeButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
