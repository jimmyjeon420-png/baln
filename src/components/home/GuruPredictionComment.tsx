/**
 * GuruPredictionComment — 예측 복기 구루 코멘트
 *
 * 역할: 어제 예측 결과에 대해 구루 캐릭터가 한마디 코멘트를 남김
 * - 적중률에 따라 반응 메시지 변경
 * - 관련 명언을 인용하여 학습 동기 부여
 * - 날짜 기반 구루 로테이션 (매일 다른 구루)
 *
 * 비유: "복기 시간에 선생님이 한마디 해주는 것"
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import { getDailyQuote } from '../../data/guruQuoteBank';
import type { ThemeColors } from '../../styles/colors';
import { useLocale } from '../../context/LocaleContext';

interface GuruPredictionCommentProps {
  /** 적중 수 */
  correctCount: number;
  /** 전체 수 */
  totalCount: number;
  /** 테마 색상 */
  colors: ThemeColors;
}

/** 날짜 기반 구루 선택 (매일 다른 구루가 코멘트) */
const COMMENT_GURUS = ['buffett', 'dalio', 'lynch', 'marks', 'cathie_wood', 'rogers', 'druckenmiller'];

function getCommentGuru(): string {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return COMMENT_GURUS[seed % COMMENT_GURUS.length];
}

/** 적중률에 따른 반응 메시지 — t() 키 반환 */
function getReactionKey(correctCount: number, totalCount: number): string {
  const rate = totalCount > 0 ? correctCount / totalCount : 0;
  if (rate >= 1) return 'guruComment.perfect';
  if (rate >= 0.67) return 'guruComment.good';
  if (rate >= 0.5) return 'guruComment.half';
  if (rate > 0) return 'guruComment.notGreat';
  return 'guruComment.tryAgain';
}

export function GuruPredictionComment({
  correctCount,
  totalCount,
  colors,
}: GuruPredictionCommentProps) {
  const { t, language } = useLocale();

  if (totalCount === 0) return null;

  const guruId = getCommentGuru();
  const _config = GURU_CHARACTER_CONFIGS[guruId];

  // 적중률 기반 반응 메시지
  const reactionKey = getReactionKey(correctCount, totalCount);
  const reaction = t(reactionKey);

  // 오늘의 관련 명언
  const quote = getDailyQuote();
  const guruName = getGuruDisplayName(guruId);

  // 적중률에 따른 표정
  const rate = correctCount / totalCount;
  const expression = rate >= 0.67 ? 'bullish' as const : rate >= 0.33 ? 'neutral' as const : 'cautious' as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
      <View style={styles.row}>
        <CharacterAvatar
          guruId={guruId}
          size="sm"
          expression={expression}
          animated
        />
        <View style={styles.textBlock}>
          <Text style={[styles.guruName, { color: colors.primary }]}>
            {guruName}
          </Text>
          <Text style={[styles.reaction, { color: colors.textPrimary }]}>
            {reaction}
          </Text>
        </View>
      </View>
      {/* 명언 인용 */}
      <View style={[styles.quoteBlock, { borderLeftColor: colors.primary + '40' }]}>
        <Text style={[styles.quoteText, { color: colors.textSecondary }]}>
          "{language === 'ko' ? quote.quote : quote.quoteEn}"
        </Text>
        <Text style={[styles.quoteSource, { color: colors.textTertiary }]}>
          — {getGuruDisplayName(quote.guruId)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  guruName: {
    fontSize: 12,
    fontWeight: '700',
  },
  reaction: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  quoteBlock: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    marginLeft: 4,
  },
  quoteText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  quoteSource: {
    fontSize: 11,
    marginTop: 4,
  },
});
