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

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PollWithMyVote } from '../../types/prediction';

interface ReviewCardProps {
  poll: PollWithMyVote;
  isCorrect: boolean;
  currentStreak?: number;  // 현재 연속 적중 수 (옵션)
}

export default function ReviewCard({ poll, isCorrect, currentStreak }: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 상태별 스타일
  const bgColor = isCorrect ? '#1A2A1A' : '#2A1A1A';
  const borderColor = isCorrect ? '#4CAF50' : '#CF6679';
  const iconName = isCorrect ? 'checkmark-circle' : 'close-circle';
  const iconColor = isCorrect ? '#4CAF50' : '#CF6679';
  const resultText = isCorrect ? '적중!' : '아쉽게 빗나갔어요';

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
            <Text style={styles.creditText}>+{poll.myCreditsEarned} 크레딧</Text>
          </View>
        )}
      </View>

      {/* 연속 적중 배너 (5연속 이상일 때) */}
      {isCorrect && currentStreak && currentStreak >= 5 && (
        <View style={styles.streakBanner}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>
            {currentStreak}연속 적중 중!
            {currentStreak < 10
              ? ' 10연속 시 +10 보너스 획득!'
              : ' 🏆 대단해요!'}
          </Text>
        </View>
      )}

      {/* 질문 */}
      <Text style={styles.question}>{poll.question}</Text>

      {/* 내 선택 vs 정답 */}
      <View style={styles.answerSection}>
        <View style={styles.answerRow}>
          <Text style={styles.answerLabel}>내 선택:</Text>
          <Text style={[
            styles.answerValue,
            { color: isCorrect ? '#4CAF50' : '#CF6679' },
          ]}>
            {poll.myVote === 'YES' ? poll.yes_label : poll.no_label}
          </Text>
        </View>
        <View style={styles.answerRow}>
          <Text style={styles.answerLabel}>정답:</Text>
          <Text style={[styles.answerValue, { color: '#4CAF50' }]}>
            {poll.correct_answer === 'YES' ? poll.yes_label : poll.no_label}
          </Text>
        </View>
      </View>

      {/* 해설 토글 버튼 */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleButtonText}>
          {isExpanded ? '해설 닫기' : '해설 보기'}
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
                ? '예측이 적중했습니다! 시장 흐름을 잘 파악하셨네요.'
                : '이번에는 시장이 예상과 다르게 움직였습니다. 다음 기회에 도전해보세요.'}
            </Text>
          )}

          {/* 출처 */}
          {poll.source && (
            <View style={styles.sourceRow}>
              <Ionicons name="link-outline" size={14} color="#555555" />
              <Text style={styles.sourceText}>출처: {poll.source}</Text>
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
    fontSize: 16,
    fontWeight: '800',
  },
  creditBadge: {
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  creditText: {
    fontSize: 13,
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
    fontSize: 16,
  },
  streakText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    flex: 1,
  },

  // 질문
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
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
    fontSize: 13,
    color: '#888888',
    width: 60,
  },
  answerValue: {
    fontSize: 14,
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
    fontSize: 13,
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
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 21,
    marginBottom: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  sourceText: {
    fontSize: 11,
    color: '#555555',
    flex: 1,
  },
});
