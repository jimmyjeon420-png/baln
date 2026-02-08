/**
 * PredictionPreview.tsx - 오늘 탭 투자 예측 미리보기
 *
 * 역할: "오늘 탭에서 예측 게임으로 유도하는 티저 카드"
 * - 오늘의 예측 질문 중 첫 번째만 표시
 * - YES/NO 버튼으로 바로 투표 가능
 * - 투표 완료 시 "투표 완료 ✓" 표시
 * - 터치하면 /games/predictions로 이동
 * - "2개 더 보기 →" 링크로 게임 화면 유도
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  usePollsWithMyVotes,
  useSubmitVote,
} from '../../hooks/usePredictions';
import { useHaptics } from '../../hooks/useHaptics';

export default function PredictionPreview() {
  const router = useRouter();
  const { mediumTap } = useHaptics();
  const { data: activePolls, isLoading } = usePollsWithMyVotes();
  const submitVote = useSubmitVote();

  // 첫 번째 질문만 표시
  const firstPoll = activePolls?.[0];

  // 투표 핸들러
  const handleVote = useCallback(
    (pollId: string, vote: 'YES' | 'NO') => {
      mediumTap();
      submitVote.mutate(
        { pollId, vote },
        {
          onError: (error: Error) => {
            Alert.alert('투표 실패', error.message);
          },
        },
      );
    },
    [submitVote, mediumTap],
  );

  // 전체 보기
  const handleViewAll = () => {
    mediumTap();
    router.push('/games/predictions');
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#4CAF50" />
        <Text style={styles.loadingText}>오늘의 예측 불러오는 중...</Text>
      </View>
    );
  }

  // 질문 없음
  if (!firstPoll) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔮</Text>
          <Text style={styles.emptyText}>
            오늘의 예측 질문이{'\n'}아직 준비되지 않았습니다
          </Text>
        </View>
      </View>
    );
  }

  const hasVoted = firstPoll.myVote !== null;
  const totalPolls = activePolls?.length || 0;
  const remainingPolls = totalPolls - 1;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleViewAll}
      activeOpacity={0.8}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={styles.title}>오늘의 예측</Text>
        </View>

        {hasVoted ? (
          <View style={styles.votedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={styles.votedText}>투표 완료</Text>
          </View>
        ) : (
          <View style={styles.activeBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.activeText}>투표하기</Text>
          </View>
        )}
      </View>

      {/* 질문 */}
      <Text style={styles.question} numberOfLines={2}>
        {firstPoll.question}
      </Text>

      {/* 투표 버튼 or 투표 완료 상태 */}
      {!hasVoted ? (
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={[styles.voteBtn, styles.voteBtnYes]}
            onPress={(e) => {
              e.stopPropagation();
              handleVote(firstPoll.id, 'YES');
            }}
            disabled={submitVote.isPending}
          >
            {submitVote.isPending ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
                <Text style={styles.voteBtnYesText}>{firstPoll.yes_label}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteBtn, styles.voteBtnNo]}
            onPress={(e) => {
              e.stopPropagation();
              handleVote(firstPoll.id, 'NO');
            }}
            disabled={submitVote.isPending}
          >
            {submitVote.isPending ? (
              <ActivityIndicator size="small" color="#CF6679" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color="#CF6679" />
                <Text style={styles.voteBtnNoText}>{firstPoll.no_label}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.votedState}>
          <View style={styles.votedInfo}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.votedInfoText}>
              당신은 <Text style={styles.votedChoice}>
                {firstPoll.myVote === 'YES' ? firstPoll.yes_label : firstPoll.no_label}
              </Text>에 투표했습니다
            </Text>
          </View>
        </View>
      )}

      {/* 하단: 더보기 링크 */}
      {remainingPolls > 0 && (
        <View style={styles.footer}>
          <Ionicons name="arrow-forward" size={14} color="#4CAF50" />
          <Text style={styles.footerText}>
            {remainingPolls}개 더 보기
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  // 로딩
  loadingText: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginTop: 8,
  },

  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 19,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  votedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },

  // 질문
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 14,
  },

  // 투표 버튼
  voteButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  voteBtnNoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CF6679',
  },

  // 투표 완료 상태
  votedState: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
  },
  votedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  votedInfoText: {
    fontSize: 13,
    color: '#AAAAAA',
    flex: 1,
  },
  votedChoice: {
    color: '#4CAF50',
    fontWeight: '700',
  },

  // 하단
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
});
