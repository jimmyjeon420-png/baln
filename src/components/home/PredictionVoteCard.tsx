/**
 * PredictionVoteCard.tsx - 예측 투표 카드 (3개 질문 수평 스크롤)
 *
 * 역할: "투자 예측 게임 디스플레이"
 * - 3개 질문을 수평 스크롤(FlatList horizontal)로 표시
 * - 각 질문에 카테고리 칩 (주식/코인/매크로/이벤트) 표시
 * - 투표 후 자동으로 다음 질문 스크롤
 * - 모두 투표 완료 시 "내일 결과를 확인하세요!" 메시지
 *
 * Anti-Toss 원칙:
 * - Gateway: 30초 안에 3개 투표 완료
 * - Heart/Like: YES/NO 2택 심플
 * - 빼기 전략: 리더보드/통계 제거
 * - One Page One Card: 질문+투표 한 카드에
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
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 카드 내부 질문 슬라이드 너비 (카드 padding 고려)
const POLL_SLIDE_WIDTH = SCREEN_WIDTH - 32 - 48; // 카드 marginHorizontal 16*2 + padding 24*2

// ============================================================================
// 카테고리 정보 (색상 + 라벨)
// ============================================================================

const CATEGORY_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  stocks:  { label: '주식',     emoji: '📈', color: '#4CAF50' },
  crypto:  { label: '코인',     emoji: '₿',  color: '#F7931A' },
  macro:   { label: '거시경제', emoji: '🌍', color: '#2196F3' },
  event:   { label: '이벤트',   emoji: '⚡', color: '#FF9800' },
};

// ============================================================================
// Props 인터페이스
// ============================================================================

/** 개별 투표 질문 데이터 */
interface PollItem {
  id: string;
  question: string;
  category: 'stocks' | 'crypto' | 'macro' | 'event';
  yesPercentage: number; // 0~100
  noPercentage: number; // 0~100
  totalVotes: number;
  deadline: string; // ISO date
}

interface PredictionVoteCardProps {
  /** 오늘의 투표 (1개만 — 하위호환) */
  currentPoll: PollItem | null;

  /** 오늘의 투표 목록 (3개까지) — 새 prop */
  polls?: PollItem[];

  /** 내 투표 상태 (하위호환: currentPoll용) */
  myVote: 'YES' | 'NO' | null;

  /** 내 투표 Map (pollId → 'YES'|'NO') — 새 prop */
  myVotesMap?: Record<string, 'YES' | 'NO'>;

  /** 지난주 복기 (최대 3개) */
  recentResults: Array<{
    question: string;
    myVote: 'YES' | 'NO';
    correctAnswer: 'YES' | 'NO';
    isCorrect: boolean;
    reward: number; // 크레딧 보상
    description?: string; // 배경 설명
    source?: string; // 정답 근거
  }>;

  /** 적중률 (0~100, null이면 투표 이력 없음) */
  accuracyRate: number | null;

  /** 투표 콜백 (하위호환) */
  onVote?: (choice: 'YES' | 'NO') => void;

  /** 투표 콜백 (pollId 포함) — 새 prop */
  onVotePoll?: (pollId: string, choice: 'YES' | 'NO') => void;

  /** [전체 기록 보기] 콜백 (프리미엄 게이트) */
  onViewHistory?: () => void;

  /** 로딩 상태 */
  isLoading: boolean;

  /** 투표 제출 중 로딩 */
  isVoting: boolean;

  /** 선택된 카테고리 */
  selectedCategory?: 'stocks' | 'crypto' | 'macro' | 'event' | 'all';

  /** 카테고리 변경 콜백 */
  onCategoryChange?: (category: string) => void;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PredictionVoteCard({
  currentPoll,
  polls: pollsProp,
  myVote,
  myVotesMap = {},
  recentResults,
  accuracyRate,
  onVote,
  onVotePoll,
  onViewHistory,
  isLoading,
  isVoting,
  selectedCategory = 'all',
  onCategoryChange,
}: PredictionVoteCardProps) {
  const flatListRef = React.useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // FlatList 스크롤 끝 핸들러 (Hook 규칙: 조건문 전에 선언 필수)
  const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  // 복기 해설 토글 상태 (인덱스별 펼침/접힘)
  const [expandedReviewIndex, setExpandedReviewIndex] = React.useState<number | null>(null);

  // 투표 완료 애니메이션
  const completeFade = React.useRef(new Animated.Value(0)).current;

  // 질문 목록: polls prop 우선, 없으면 currentPoll을 배열로 래핑
  const allPolls: PollItem[] = React.useMemo(() => {
    if (pollsProp && pollsProp.length > 0) return pollsProp;
    if (currentPoll) return [currentPoll];
    return [];
  }, [pollsProp, currentPoll]);

  // 각 질문별 투표 상태 조회
  const getMyVoteForPoll = React.useCallback((pollId: string): 'YES' | 'NO' | null => {
    // myVotesMap에 있으면 사용 (신규 다중 질문 방식)
    if (myVotesMap[pollId]) return myVotesMap[pollId];
    // 하위호환: 단일 질문인 경우 myVote 사용
    if (currentPoll && pollId === currentPoll.id && myVote) return myVote;
    return null;
  }, [myVotesMap, myVote, currentPoll]);

  // 모든 질문에 투표했는지 확인
  const allVoted = React.useMemo(() => {
    if (allPolls.length === 0) return false;
    return allPolls.every(poll => getMyVoteForPoll(poll.id) !== null);
  }, [allPolls, getMyVoteForPoll]);

  // 모든 투표 완료 시 애니메이션
  React.useEffect(() => {
    if (allVoted) {
      Animated.timing(completeFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      completeFade.setValue(0);
    }
  }, [allVoted]);

  // 투표 핸들러 (투표 후 자동 다음 질문 스크롤)
  const handleVote = React.useCallback((pollId: string, choice: 'YES' | 'NO') => {
    // 신규 방식 (다중 질문)
    if (onVotePoll) {
      onVotePoll(pollId, choice);
    }
    // 하위호환 (단일 질문)
    else if (onVote) {
      onVote(choice);
    }

    // 다음 질문으로 자동 스크롤 (300ms 후)
    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex < allPolls.length) {
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        setCurrentIndex(nextIndex);
      }
    }, 300);
  }, [onVotePoll, onVote, currentIndex, allPolls.length]);

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
  if (allPolls.length === 0) {
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
  // 개별 질문 슬라이드 렌더러
  // ──────────────────────────────────────────────────────────────────────
  const renderPollSlide = ({ item, index }: { item: PollItem; index: number }) => {
    const pollVote = getMyVoteForPoll(item.id);
    const hasVoted = pollVote !== null;
    const catInfo = CATEGORY_INFO[item.category];

    return (
      <View style={styles.pollSlide}>
        {/* 카테고리 칩 */}
        {catInfo && (
          <View style={[styles.pollCategoryChip, { borderColor: catInfo.color }]}>
            <Text style={styles.pollCategoryEmoji}>{catInfo.emoji}</Text>
            <Text style={[styles.pollCategoryLabel, { color: catInfo.color }]}>
              {catInfo.label}
            </Text>
          </View>
        )}

        {/* 질문 텍스트 */}
        <View style={styles.pollQuestionArea}>
          <Text style={styles.questionText} numberOfLines={4}>
            {item.question}
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
                  pollVote === 'YES' && styles.voteButtonSelected,
                  { flex: Math.max(item.yesPercentage, 10) / 100 },
                ]}
              >
                <Text style={[styles.voteButtonText, pollVote === 'YES' && styles.voteButtonTextSelected]}>
                  YES
                </Text>
                <Text style={[styles.votePercentage, pollVote === 'YES' && styles.votePercentageSelected]}>
                  {item.yesPercentage.toFixed(0)}%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled
                style={[
                  styles.voteButton,
                  styles.voteButtonNo,
                  pollVote === 'NO' && styles.voteButtonSelected,
                  { flex: Math.max(item.noPercentage, 10) / 100 },
                ]}
              >
                <Text style={[styles.voteButtonText, pollVote === 'NO' && styles.voteButtonTextSelected]}>
                  NO
                </Text>
                <Text style={[styles.votePercentage, pollVote === 'NO' && styles.votePercentageSelected]}>
                  {item.noPercentage.toFixed(0)}%
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // 투표 전 → 동일 크기 버튼
            <View style={styles.voteRow}>
              <TouchableOpacity
                style={[styles.voteButton, styles.voteButtonYes]}
                onPress={() => handleVote(item.id, 'YES')}
              >
                <Text style={styles.voteButtonText}>👍 YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteButton, styles.voteButtonNo]}
                onPress={() => handleVote(item.id, 'NO')}
              >
                <Text style={styles.voteButtonText}>👎 NO</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ──────────────────────────────────────────────────────────────────────
  // 데이터 상태 (질문 + 투표 + 복기)
  // ──────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.card}>
      {/* 상단: 헤더 + 페이지 표시 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🎯</Text>
          <Text style={styles.headerText}>오늘의 예측</Text>
        </View>
        {/* 페이지 인디케이터 (1/3) */}
        {allPolls.length > 1 && (
          <View style={styles.pageIndicator}>
            {allPolls.map((poll, idx) => {
              const voted = getMyVoteForPoll(poll.id) !== null;
              return (
                <View
                  key={idx}
                  style={[
                    styles.pageDot,
                    idx === currentIndex && styles.pageDotActive,
                    voted && styles.pageDotVoted,
                  ]}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* 수평 스크롤 질문 리스트 */}
      <FlatList
        ref={flatListRef}
        data={allPolls}
        renderItem={renderPollSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={POLL_SLIDE_WIDTH}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        style={styles.pollFlatList}
        contentContainerStyle={styles.pollFlatListContent}
        getItemLayout={(_, index) => ({
          length: POLL_SLIDE_WIDTH,
          offset: POLL_SLIDE_WIDTH * index,
          index,
        })}
      />

      {/* 모두 투표 완료 메시지 */}
      {allVoted && (
        <Animated.View style={[styles.allVotedBanner, { opacity: completeFade }]}>
          <Text style={styles.allVotedText}>
            🎯 모두 투표 완료! 내일 결과를 확인하세요!
          </Text>
        </Animated.View>
      )}

      {/* 복기 섹션 */}
      {recentResults.length > 0 && (
        <View style={styles.reviewArea}>
          <Text style={styles.reviewTitle}>─── 지난 복기 ───</Text>
          {recentResults.slice(0, 3).map((result, index) => {
            const isExpanded = expandedReviewIndex === index;
            const hasExplanation = result.description || result.source;

            return (
              <View key={index}>
                {/* 복기 헤더 (클릭 가능) */}
                <TouchableOpacity
                  style={styles.reviewItem}
                  onPress={() => {
                    if (hasExplanation) {
                      setExpandedReviewIndex(isExpanded ? null : index);
                    }
                  }}
                  disabled={!hasExplanation}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reviewEmoji}>
                    {result.isCorrect ? '✅' : '❌'}
                  </Text>
                  <Text style={styles.reviewQuestion} numberOfLines={isExpanded ? undefined : 1}>
                    {result.question}
                  </Text>
                  {result.isCorrect && (
                    <Text style={styles.reviewReward}>+{result.reward}C</Text>
                  )}
                  {hasExplanation && (
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={COLORS.textTertiary}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </TouchableOpacity>

                {/* 해설 (펼쳐진 상태) */}
                {isExpanded && hasExplanation && (
                  <View style={styles.explanationBox}>
                    {result.description && (
                      <View style={styles.explanationSection}>
                        <Text style={styles.explanationLabel}>💡 배경</Text>
                        <Text style={styles.explanationText}>{result.description}</Text>
                      </View>
                    )}
                    {result.source && (
                      <View style={styles.explanationSection}>
                        <Text style={styles.explanationLabel}>
                          {result.isCorrect ? '🎯 정답 근거' : '📌 정답 근거'}
                        </Text>
                        <Text style={styles.explanationText}>{result.source}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

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
          <Text style={styles.historyText}>📊 상세 통계 보기</Text>
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
    justifyContent: 'space-between',
  },
  headerLeft: {
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
  // 페이지 인디케이터
  pageIndicator: {
    flexDirection: 'row',
    gap: 6,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceLight,
  },
  pageDotActive: {
    width: 16,
    backgroundColor: COLORS.textPrimary,
  },
  pageDotVoted: {
    backgroundColor: COLORS.primary,
  },
  // 수평 스크롤 FlatList
  pollFlatList: {
    flex: 1,
  },
  pollFlatListContent: {
    // 질문 슬라이드들이 정렬되도록
  },
  // 개별 질문 슬라이드
  pollSlide: {
    width: POLL_SLIDE_WIDTH,
    justifyContent: 'center',
  },
  // 카테고리 칩
  pollCategoryChip: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  pollCategoryEmoji: {
    fontSize: 12,
  },
  pollCategoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pollQuestionArea: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 32,
    textAlign: 'center',
  },
  voteArea: {
    marginVertical: 12,
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
  // 모두 투표 완료 배너
  allVotedBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  allVotedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // 복기 섹션
  reviewArea: {
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reviewTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
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
  explanationBox: {
    marginTop: 8,
    marginLeft: 28,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
    gap: 12,
  },
  explanationSection: {
    gap: 4,
  },
  explanationLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  explanationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  accuracyText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  accuracyHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 4,
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
  categoryFilter: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});
