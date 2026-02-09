/**
 * PredictionVoteCard.tsx - 예측 투표 카드
 *
 * 역할: "투자 예측 게임 디스플레이"
 * - 질문 1개 + YES/NO 투표 + 복기 3개
 * - 리더보드/통계 제거 (빼기 전략)
 * - 30초 안에 투표 완료 (Gateway 원칙)
 *
 * Anti-Toss 원칙:
 * - Gateway: 30초 안에 투표 완료
 * - Heart/Like: YES/NO 2택 심플
 * - 빼기 전략: 리더보드/통계 제거
 * - One Page One Card: 질문+투표+복기 한 카드에
 * - 보험 BM: 투표 무료, 상세 리뷰 프리미엄
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// Props 인터페이스
// ============================================================================

interface PredictionVoteCardProps {
  /** 오늘의 투표 (1개만) */
  currentPoll: {
    id: string;
    question: string;
    category: 'stocks' | 'crypto' | 'macro' | 'event';
    yesPercentage: number; // 0~100
    noPercentage: number; // 0~100
    totalVotes: number;
    deadline: string; // ISO date
  } | null;

  /** 내 투표 상태 */
  myVote: 'YES' | 'NO' | null;

  /** 지난주 복기 (최대 3개) */
  recentResults: Array<{
    question: string;
    myVote: 'YES' | 'NO';
    correctAnswer: 'YES' | 'NO';
    isCorrect: boolean;
    reward: number; // 크레딧 보상
  }>;

  /** 적중률 (0~100, null이면 투표 이력 없음) */
  accuracyRate: number | null;

  /** 투표 콜백 */
  onVote?: (choice: 'YES' | 'NO') => void;

  /** [전체 기록 보기] 콜백 (프리미엄 게이트) */
  onViewHistory?: () => void;

  /** 로딩 상태 */
  isLoading: boolean;

  /** 투표 제출 중 로딩 */
  isVoting: boolean;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PredictionVoteCard({
  currentPoll,
  myVote,
  recentResults,
  accuracyRate,
  onVote,
  onViewHistory,
  isLoading,
  isVoting,
}: PredictionVoteCardProps) {
  // ──────────────────────────────────────────────────────────────────────
  // 로딩 상태
  // ──────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.centerArea}>
          <ActivityIndicator size="large" color={COLORS.textSecondary} />
          <Text style={[styles.loadingText, { marginTop: 16 }]}>
            오늘의 예측을 불러오는 중...
          </Text>
        </View>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Empty 상태 (질문 없음)
  // ──────────────────────────────────────────────────────────────────────
  if (!currentPoll) {
    return (
      <View style={styles.card}>
        <View style={styles.centerArea}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyText}>오늘의 예측이 아직 준비되지 않았어요</Text>
        </View>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // 데이터 상태 (질문 + 투표 + 복기)
  // ──────────────────────────────────────────────────────────────────────
  const hasVoted = myVote !== null;

  return (
    <View style={styles.card}>
      {/* 상단: 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🎯</Text>
        <Text style={styles.headerText}>오늘의 예측</Text>
      </View>

      {/* 질문 */}
      <View style={styles.questionArea}>
        <Text style={styles.questionText} numberOfLines={3}>
          {currentPoll.question}
        </Text>
      </View>

      {/* 투표 버튼 */}
      <View style={styles.voteArea}>
        {isVoting ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : hasVoted ? (
          // 투표 완료 → 비율 바 표시
          <View style={styles.resultsRow}>
            <TouchableOpacity
              disabled
              style={[
                styles.voteButton,
                styles.voteButtonYes,
                myVote === 'YES' && styles.voteButtonSelected,
                { flex: currentPoll.yesPercentage / 100 },
              ]}
            >
              <Text style={[styles.voteButtonText, myVote === 'YES' && styles.voteButtonTextSelected]}>
                👍 YES
              </Text>
              <Text style={[styles.votePercentage, myVote === 'YES' && styles.votePercentageSelected]}>
                {currentPoll.yesPercentage.toFixed(0)}%
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled
              style={[
                styles.voteButton,
                styles.voteButtonNo,
                myVote === 'NO' && styles.voteButtonSelected,
                { flex: currentPoll.noPercentage / 100 },
              ]}
            >
              <Text style={[styles.voteButtonText, myVote === 'NO' && styles.voteButtonTextSelected]}>
                👎 NO
              </Text>
              <Text style={[styles.votePercentage, myVote === 'NO' && styles.votePercentageSelected]}>
                {currentPoll.noPercentage.toFixed(0)}%
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // 투표 전 → 동일 크기 버튼
          <View style={styles.voteRow}>
            <TouchableOpacity
              style={[styles.voteButton, styles.voteButtonYes]}
              onPress={() => onVote?.('YES')}
            >
              <Text style={styles.voteButtonText}>👍 YES</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.voteButton, styles.voteButtonNo]}
              onPress={() => onVote?.('NO')}
            >
              <Text style={styles.voteButtonText}>👎 NO</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 복기 섹션 */}
      {recentResults.length > 0 && (
        <View style={styles.reviewArea}>
          <Text style={styles.reviewTitle}>─── 지난주 복기 ───</Text>
          {recentResults.slice(0, 3).map((result, index) => (
            <View key={index} style={styles.reviewItem}>
              <Text style={styles.reviewEmoji}>
                {result.isCorrect ? '✅' : '❌'}
              </Text>
              <Text style={styles.reviewQuestion} numberOfLines={1}>
                {result.question}
              </Text>
              {result.isCorrect && (
                <Text style={styles.reviewReward}>+{result.reward}C</Text>
              )}
            </View>
          ))}

          {/* 적중률 */}
          {accuracyRate !== null && accuracyRate >= 0 && (
            <Text style={styles.accuracyText}>
              적중률: {accuracyRate.toFixed(0)}%
            </Text>
          )}
          {accuracyRate === null && (
            <Text style={styles.accuracyHint}>
              5회 이상 투표 시 적중률 표시
            </Text>
          )}
        </View>
      )}

      {/* 하단: [전체 기록 보기] 프리미엄 게이트 */}
      {onViewHistory && (
        <TouchableOpacity style={styles.historyButton} onPress={onViewHistory}>
          <Text style={styles.historyText}>🔒 전체 기록 보기</Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const CARD_HEIGHT = SCREEN_HEIGHT * 0.75;

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  questionArea: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 32,
    textAlign: 'center',
  },
  voteArea: {
    marginVertical: 20,
  },
  voteRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resultsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  voteButtonYes: {
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
  },
  voteButtonNo: {
    borderColor: '#CF6679',
    backgroundColor: 'transparent',
  },
  voteButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  voteButtonTextSelected: {
    color: COLORS.textPrimary,
  },
  votePercentage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  votePercentageSelected: {
    color: COLORS.textPrimary,
  },
  reviewArea: {
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reviewTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewEmoji: {
    fontSize: 16,
  },
  reviewQuestion: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  reviewReward: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  accuracyText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
  accuracyHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
  },
  historyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
