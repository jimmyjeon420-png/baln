/**
 * PollCard.tsx - 투자 예측 투표 카드
 *
 * 역할: "예측 경기장의 투표용지"
 * 3가지 상태별 렌더링:
 *   1. 투표 전: 질문 + YES/NO 버튼 + 참여자 수 + 마감 카운트다운
 *   2. 투표 후: 질문 + 비율 바(%) + 내 선택 표시 + 마감 카운트다운
 *   3. 종료 후: 정답 배지 + 비율 바 + 결과 ("적중! +2크레딧" / "아쉽게 빗나갔어요")
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHaptics } from '../../hooks/useHaptics';
import {
  PollWithMyVote,
  POLL_CATEGORY_INFO,
  PollCategoryFilter,
} from '../../types/prediction';

interface PollCardProps {
  poll: PollWithMyVote;
  onVote: (pollId: string, vote: 'YES' | 'NO') => void;
  isVoting?: boolean;
}

export default function PollCard({ poll, onVote, isVoting }: PollCardProps) {
  const { mediumTap } = useHaptics();
  const [countdown, setCountdown] = useState('');

  // 마감 카운트다운 계산
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const deadline = new Date(poll.deadline).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setCountdown('마감');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        setCountdown(`${days}일 남음`);
      } else if (hours > 0) {
        setCountdown(`${hours}시간 ${minutes}분 남음`);
      } else {
        setCountdown(`${minutes}분 남음`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000); // 1분마다 갱신
    return () => clearInterval(timer);
  }, [poll.deadline]);

  const totalVotes = poll.yes_count + poll.no_count;
  const yesPercent = totalVotes > 0 ? Math.round((poll.yes_count / totalVotes) * 100) : 50;
  const noPercent = totalVotes > 0 ? 100 - yesPercent : 50;
  const isResolved = poll.status === 'resolved';
  const hasVoted = poll.myVote !== null;

  // 카테고리 정보
  const catInfo = POLL_CATEGORY_INFO[poll.category as PollCategoryFilter] || POLL_CATEGORY_INFO.stocks;

  // 투표 핸들러
  const handleVote = (vote: 'YES' | 'NO') => {
    mediumTap();
    onVote(poll.id, vote);
  };

  return (
    <View style={[styles.card, isResolved && styles.cardResolved]}>
      {/* 상단: 카테고리 칩 + 마감 카운트다운 */}
      <View style={styles.topRow}>
        <View style={[styles.categoryChip, { backgroundColor: catInfo.color + '20', borderColor: catInfo.color }]}>
          <Text style={styles.categoryEmoji}>{catInfo.emoji}</Text>
          <Text style={[styles.categoryLabel, { color: catInfo.color }]}>{catInfo.label}</Text>
        </View>

        {!isResolved && (
          <View style={styles.countdownBadge}>
            <Ionicons name="time-outline" size={12} color="#888888" />
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}

        {isResolved && (
          <View style={[
            styles.resultBadge,
            { backgroundColor: poll.myIsCorrect ? '#4CAF5020' : '#CF667920' },
          ]}>
            <Text style={[
              styles.resultBadgeText,
              { color: poll.myIsCorrect ? '#4CAF50' : '#CF6679' },
            ]}>
              {poll.myIsCorrect === null ? '미참여' : poll.myIsCorrect ? '적중!' : '빗나감'}
            </Text>
          </View>
        )}
      </View>

      {/* 질문 */}
      <Text style={styles.question}>{poll.question}</Text>

      {/* 부연 설명 */}
      {poll.description && (
        <Text style={styles.description}>{poll.description}</Text>
      )}

      {/* === 상태별 렌더링 === */}

      {/* 1. 투표 전: YES/NO 버튼 */}
      {!hasVoted && !isResolved && (
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={[styles.voteBtn, styles.voteBtnYes]}
            onPress={() => handleVote('YES')}
            disabled={isVoting}
          >
            {isVoting ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                <Text style={styles.voteBtnYesText}>{poll.yes_label}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteBtn, styles.voteBtnNo]}
            onPress={() => handleVote('NO')}
            disabled={isVoting}
          >
            {isVoting ? (
              <ActivityIndicator size="small" color="#CF6679" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#CF6679" />
                <Text style={styles.voteBtnNoText}>{poll.no_label}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 2. 투표 후 + 3. 종료 후: 비율 바 */}
      {(hasVoted || isResolved) && (
        <View style={styles.resultSection}>
          {/* YES 바 */}
          <View style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <Text style={[
                styles.barLabel,
                poll.myVote === 'YES' && styles.barLabelHighlight,
              ]}>
                {poll.yes_label}
                {poll.myVote === 'YES' && ' ← 내 선택'}
                {isResolved && poll.correct_answer === 'YES' && ' ✓ 정답'}
              </Text>
              <Text style={styles.barPercent}>{yesPercent}%</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[
                styles.barFill,
                {
                  width: `${yesPercent}%`,
                  backgroundColor: isResolved && poll.correct_answer === 'YES'
                    ? '#4CAF50'
                    : poll.myVote === 'YES'
                      ? '#4CAF5080'
                      : '#333333',
                },
              ]} />
            </View>
          </View>

          {/* NO 바 */}
          <View style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <Text style={[
                styles.barLabel,
                poll.myVote === 'NO' && styles.barLabelHighlight,
              ]}>
                {poll.no_label}
                {poll.myVote === 'NO' && ' ← 내 선택'}
                {isResolved && poll.correct_answer === 'NO' && ' ✓ 정답'}
              </Text>
              <Text style={styles.barPercent}>{noPercent}%</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[
                styles.barFill,
                {
                  width: `${noPercent}%`,
                  backgroundColor: isResolved && poll.correct_answer === 'NO'
                    ? '#4CAF50'
                    : poll.myVote === 'NO'
                      ? '#CF667980'
                      : '#333333',
                },
              ]} />
            </View>
          </View>
        </View>
      )}

      {/* 하단: 참여자 수 + 보상 정보 */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons name="people-outline" size={14} color="#666666" />
          <Text style={styles.footerText}>{totalVotes.toLocaleString()}명 참여</Text>
        </View>

        {isResolved && poll.myIsCorrect && poll.myCreditsEarned > 0 && (
          <View style={styles.creditBadge}>
            <Text style={styles.creditBadgeText}>+{poll.myCreditsEarned} 크레딧</Text>
          </View>
        )}

        {isResolved && poll.myIsCorrect === false && (
          <Text style={styles.missText}>아쉽게 빗나갔어요</Text>
        )}

        {!isResolved && (
          <Text style={styles.rewardHint}>적중 시 +{poll.reward_credits} 크레딧</Text>
        )}
      </View>

      {/* 정답 출처 (종료 후) */}
      {isResolved && poll.source && (
        <Text style={styles.sourceText}>출처: {poll.source}</Text>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  cardResolved: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  // 상단 행
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryEmoji: {
    fontSize: 12,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    fontSize: 12,
    color: '#888888',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // 질문
  question: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 19,
    marginBottom: 14,
  },

  // 투표 버튼
  voteButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  voteBtnYes: {
    backgroundColor: '#4CAF5010',
    borderColor: '#4CAF5040',
  },
  voteBtnNo: {
    backgroundColor: '#CF667910',
    borderColor: '#CF667940',
  },
  voteBtnYesText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
  },
  voteBtnNoText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CF6679',
  },

  // 비율 바
  resultSection: {
    marginTop: 10,
    gap: 8,
  },
  barRow: {
    gap: 4,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  barLabelHighlight: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  barPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  barBg: {
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },

  // 하단
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
  },
  creditBadge: {
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  creditBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },
  missText: {
    fontSize: 12,
    color: '#CF6679',
  },
  rewardHint: {
    fontSize: 11,
    color: '#555555',
  },
  sourceText: {
    fontSize: 10,
    color: '#444444',
    marginTop: 8,
  },
});
