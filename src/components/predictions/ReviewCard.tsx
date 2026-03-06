/**
 * ReviewCard.tsx - 투자 예측 복기 카드
 *
 * 역할: "어제 내 예측의 성적표"
 * - 어제 투표한 예측의 정답/오답 표시
 * - 초록(적중)/빨강(오답) 배경 색상
 * - 해설 (왜 그런 결과가 나왔는지)
 * - 연속 적중 표시 (🔥 5연속 적중 중!)
 * - 접힘/펼침 토글로 상세 해설 보기
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTrackEvent } from '../../hooks/useAnalytics';
import { useLocale } from '../../context/LocaleContext';
import { PollWithMyVote } from '../../types/prediction';

interface ReviewCardProps {
  poll: PollWithMyVote;
  isCorrect: boolean;
  currentStreak?: number;  // 현재 연속 적중 수 (옵션)
}

function extractTaggedLine(source: string | null | undefined, tag: string): string | null {
  if (!source) return null;
  const regex = new RegExp(`^${tag}:\\s*(.+)$`, 'm');
  const match = source.match(regex);
  return match?.[1]?.trim() || null;
}

export default function ReviewCard({ poll, isCorrect, currentStreak }: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const track = useTrackEvent();
  const { t } = useLocale();
  const hasTrackedReview = useRef(false);

  // 상태별 스타일
  const bgColor = isCorrect ? '#1A2A1A' : '#2A1A1A';
  const borderColor = isCorrect ? '#4CAF50' : '#CF6679';
  const iconName = isCorrect ? 'checkmark-circle' : 'close-circle';
  const iconColor = isCorrect ? '#4CAF50' : '#CF6679';
  const resultText = isCorrect ? t('reviewCard.result_correct') : t('reviewCard.result_wrong');

  const observed = extractTaggedLine(poll.source, '관측데이터');
  const thresholdCheck = extractTaggedLine(poll.source, '조건검증');
  const reasoning = extractTaggedLine(poll.source, '핵심근거');
  const yesScenario = extractTaggedLine(poll.source, 'YES 시나리오');
  const noScenario = extractTaggedLine(poll.source, 'NO 시나리오');
  const learningPoint = extractTaggedLine(poll.source, '학습포인트');
  const sourceRef = extractTaggedLine(poll.source, '출처');
  const myScenario = poll.myVote === 'YES' ? yesScenario : noScenario;
  const hasStructuredSource = !!(
    observed || thresholdCheck || reasoning || yesScenario || noScenario || learningPoint || sourceRef
  );

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
      {/* 상단: 결과 배지 + 크레딧 */}
      <View style={styles.header}>
        <View style={styles.resultRow}>
          <Ionicons name={iconName} size={24} color={iconColor} />
          <Text style={[styles.resultText, { color: iconColor }]}>
            {resultText}
          </Text>
        </View>

        {isCorrect && poll.myCreditsEarned > 0 && (
          <View style={styles.creditBadge}>
            <Text style={styles.creditText}>{t('reviewCard.credit_earned', { amount: String(poll.myCreditsEarned) })}</Text>
          </View>
        )}
      </View>

      {/* 연속 적중 배너 (5연속 이상일 때) */}
      {isCorrect && currentStreak && currentStreak >= 5 && (
        <View style={styles.streakBanner}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>
            {t('reviewCard.streak_ongoing', { count: String(currentStreak) })}
            {currentStreak < 10
              ? t('reviewCard.streak_bonus_10')
              : t('reviewCard.streak_congrats')}
          </Text>
        </View>
      )}

      {/* 질문 */}
      <Text style={styles.question}>{poll.question}</Text>

      {/* 내 선택 vs 정답 */}
      <View style={styles.answerSection}>
        <View style={styles.answerRow}>
          <Text style={styles.answerLabel}>{t('reviewCard.my_choice')}</Text>
          <Text style={[
            styles.answerValue,
            { color: isCorrect ? '#4CAF50' : '#CF6679' },
          ]}>
            {poll.myVote === 'YES' ? poll.yes_label : poll.no_label}
          </Text>
        </View>
        <View style={styles.answerRow}>
          <Text style={styles.answerLabel}>{t('reviewCard.correct_answer')}</Text>
          <Text style={[styles.answerValue, { color: '#4CAF50' }]}>
            {poll.correct_answer === 'YES' ? poll.yes_label : poll.no_label}
          </Text>
        </View>
      </View>

      {/* 해설 토글 버튼 */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => {
          if (!isExpanded && !hasTrackedReview.current) {
            hasTrackedReview.current = true;
            track('review_completed', { pollId: poll.id, isCorrect });
          }
          setIsExpanded(!isExpanded);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleButtonText}>
          {isExpanded ? t('reviewCard.toggle_hide') : t('reviewCard.toggle_show')}
        </Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#888888"
        />
      </TouchableOpacity>

      {/* 상세 해설 (펼침 시) */}
      {isExpanded && (
        <View style={styles.explanationSection}>
          {poll.description ? (
            <Text style={styles.explanationText}>{poll.description}</Text>
          ) : (
            <Text style={styles.explanationText}>
              {isCorrect
                ? t('reviewCard.explanation_correct')
                : t('reviewCard.explanation_wrong')}
            </Text>
          )}

          {myScenario && (
            <Text style={styles.explanationText}>
              {isCorrect ? t('reviewCard.success_reason') : t('reviewCard.fail_reason')}: {myScenario}
            </Text>
          )}

          {learningPoint && (
            <Text style={styles.explanationText}>
              {t('reviewCard.learning_point')}: {learningPoint}
            </Text>
          )}

          {(observed || thresholdCheck || reasoning) && (
            <View style={styles.explanationMetaBox}>
              {observed && <Text style={styles.metaText}>{t('reviewCard.observed')}: {observed}</Text>}
              {thresholdCheck && <Text style={styles.metaText}>{t('reviewCard.condition')}: {thresholdCheck}</Text>}
              {reasoning && <Text style={styles.metaText}>{t('reviewCard.reasoning')}: {reasoning}</Text>}
            </View>
          )}

          {sourceRef && (
            <View style={styles.sourceRow}>
              <Ionicons name="link-outline" size={14} color="#555555" />
              <Text style={styles.sourceText}>{t('reviewCard.source')}: {sourceRef}</Text>
            </View>
          )}

          {/* 레거시 source 포맷 fallback */}
          {!hasStructuredSource && poll.source && (
            <View style={styles.sourceRow}>
              <Ionicons name="link-outline" size={14} color="#555555" />
              <Text style={styles.sourceText}>{t('reviewCard.source')}: {poll.source}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 17,
    fontWeight: '800',
  },
  creditBadge: {
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  creditText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },

  // 연속 적중 배너
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2A1A1A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  streakEmoji: {
    fontSize: 17,
  },
  streakText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
    flex: 1,
  },

  // 질문
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 23,
    marginBottom: 12,
  },

  // 내 선택 vs 정답
  answerSection: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  answerLabel: {
    fontSize: 14,
    color: '#888888',
    width: 60,
  },
  answerValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  // 토글 버튼
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2A2A2A',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '600',
  },

  // 해설 섹션
  explanationSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  explanationText: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 22,
    marginBottom: 10,
  },
  explanationMetaBox: {
    marginTop: 2,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#222222',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#AAAAAA',
    lineHeight: 19,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  sourceText: {
    fontSize: 12,
    color: '#555555',
    flex: 1,
  },
});
