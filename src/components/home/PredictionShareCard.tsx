/**
 * PredictionShareCard.tsx - 예측 결과 공유 카드
 *
 * 역할: "예측 성적표 인증샷" — SNS 공유용 비주얼 카드
 *
 * 사용처: 예측 결과 복기 후 "공유하기" 버튼 → 이 카드 캡처 → SNS 공유
 * 보상: 공유 시 5크레딧 지급 (rewardService 연동)
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ============================================================================
// Props
// ============================================================================

interface PredictionShareCardProps {
  /** 예측 질문 */
  question: string;
  /** 내 답변 */
  myVote: 'YES' | 'NO';
  /** 정답 */
  correctAnswer: 'YES' | 'NO';
  /** 내 적중률 */
  accuracyRate: number;
  /** 연속 적중 수 */
  currentStreak: number;
  /** 총 투표 수 */
  totalVotes: number;
  /** 공유 완료 콜백 */
  onShareComplete?: () => void;
}

// ============================================================================
// 컴포넌트
// ============================================================================

export default function PredictionShareCard({
  question,
  myVote,
  correctAnswer,
  accuracyRate,
  currentStreak,
  totalVotes,
  onShareComplete,
}: PredictionShareCardProps) {
  const { colors } = useTheme();
  const isCorrect = myVote === correctAnswer;

  // 공유 핸들러
  const handleShare = async () => {
    try {
      const resultEmoji = isCorrect ? '\u2705' : '\u274C';
      const streakText = currentStreak > 0 ? `\u{1F525} ${currentStreak}연속 적중!` : '';

      const message = [
        `${resultEmoji} baln 예측 게임 결과`,
        '',
        `Q. ${question}`,
        `내 답: ${myVote === 'YES' ? 'O' : 'X'} → ${isCorrect ? '적중!' : '오답'}`,
        '',
        `적중률: ${accuracyRate.toFixed(0)}% (${totalVotes}회 참여)`,
        streakText,
        '',
        'baln 앱에서 나도 예측해보기 \u{1F449}',
        'https://baln.app',
      ].filter(Boolean).join('\n');

      await Share.share({ message });
      onShareComplete?.();
    } catch (err) {
      if ((err as any)?.message !== 'User cancelled') {
        Alert.alert('공유 실패', '다시 시도해주세요.');
      }
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 결과 배지 */}
      <View style={[
        styles.resultBadge,
        { backgroundColor: isCorrect ? colors.primary + '1A' : colors.error + '1A' },
      ]}>
        <Text style={styles.resultEmoji}>
          {isCorrect ? '\u{1F389}' : '\u{1F914}'}
        </Text>
        <Text style={[
          styles.resultText,
          { color: isCorrect ? colors.primary : colors.error },
        ]}>
          {isCorrect ? '적중!' : '아쉬워요'}
        </Text>
      </View>

      {/* 질문 */}
      <Text style={[styles.question, { color: colors.textPrimary }]} numberOfLines={2}>
        {question}
      </Text>

      {/* 통계 */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {accuracyRate.toFixed(0)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>적중률</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {totalVotes}회
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>참여</Text>
        </View>
        {currentStreak > 0 && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.premium.gold }]}>
                {currentStreak}{'\u{1F525}'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>연속</Text>
            </View>
          </>
        )}
      </View>

      {/* 공유 버튼 */}
      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: colors.primary }]}
        onPress={handleShare}
        activeOpacity={0.8}
      >
        <Ionicons name="share-outline" size={18} color="#FFFFFF" />
        <Text style={styles.shareText}>공유하고 5C 받기</Text>
      </TouchableOpacity>

      {/* 브랜딩 */}
      <Text style={[styles.branding, { color: colors.textTertiary }]}>
        baln \u00B7 매일 5분 투자 습관
      </Text>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 12,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  resultEmoji: {
    fontSize: 20,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '700',
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  shareText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  branding: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
