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
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useTrackEvent } from '../../hooks/useAnalytics';
import { useHabitLoopTracking } from '../../hooks/useHabitLoopTracking';
import { mediumTap, success as successHaptic } from '../../services/hapticService';
import AITrackRecordBanner from './AITrackRecordBanner';
import { getLocaleCode } from '../../utils/formatters';
import { useLocale } from '../../context/LocaleContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 카드 내부 질문 슬라이드 너비 (카드 padding 고려)
const POLL_SLIDE_WIDTH = SCREEN_WIDTH - 32 - 40; // 카드 marginHorizontal 16*2 + padding 20*2

// ============================================================================
// 카테고리 정보 (색상 + 라벨)
// ============================================================================

// CATEGORY_COLORS: stable category display data (emoji + color only; labels come from i18n)
const CATEGORY_COLORS: Record<string, { emoji: string; color: string }> = {
  stocks: { emoji: '📈', color: '#4CAF50' },
  crypto: { emoji: '₿',  color: '#F7931A' },
  macro:  { emoji: '🌍', color: '#2196F3' },
  event:  { emoji: '⚡', color: '#FF9800' },
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
  source?: string;
  createdAt?: string;
  upReason?: string; // [NEW] 오를 근거
  downReason?: string; // [NEW] 내릴 근거
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
  recentResults: {
    question: string;
    myVote: 'YES' | 'NO';
    correctAnswer: 'YES' | 'NO';
    isCorrect: boolean;
    reward: number; // 크레딧 보상
    description?: string; // 배경 설명
    source?: string; // 정답 근거
  }[];

  /** 적중률 (0~100, null이면 투표 이력 없음) */
  accuracyRate: number | null;

  /** 투표 콜백 (하위호환) */
  onVote?: (choice: 'YES' | 'NO') => void;

  /** 투표 콜백 (pollId 포함) — 새 prop */
  onVotePoll?: (pollId: string, choice: 'YES' | 'NO') => void;

  /** [전체 기록 보기] 콜백 (프리미엄 게이트) */
  onViewHistory?: () => void;

  /** [맥락 카드 보기] 콜백 — allVoted CTA 버튼용 */
  onViewContext?: () => void;

  /** 로딩 상태 */
  isLoading: boolean;

  /** 투표 제출 중 로딩 */
  isVoting: boolean;

  /** 선택된 카테고리 */
  selectedCategory?: 'stocks' | 'crypto' | 'macro' | 'event' | 'all';

  /** 카테고리 변경 콜백 */
  onCategoryChange?: (category: string) => void;

  /** 커뮤니티 전체 예측 적중률 (AI 트랙레코드 배너용, null이면 배너 숨김) */
  globalAccuracy?: number | null;

  /** 집계된 종료 투표 수 */
  globalResolvedCount?: number;

  /** 트랙레코드 배너 클릭 콜백 */
  onTrackRecordPress?: () => void;

  /** DB 실패 시 표준 질문 폴백 데이터 여부 */
  isFallbackData?: boolean;

  /** 추천 신뢰도 메타 */
  trustMeta?: {
    sourceLabel: string;
    generatedAt?: string | null;
    freshnessLabel?: string;
    confidenceScore?: number;
  };
}

function formatMetaTimestamp(timestamp: string | null | undefined, timeUnknown: string): string {
  if (!timestamp) return timeUnknown;
  const dt = new Date(timestamp);
  if (Number.isNaN(dt.getTime())) return timeUnknown;
  return dt.toLocaleString(getLocaleCode(), {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  onViewContext,
  isLoading,
  isVoting,
  selectedCategory: _selectedCategory = 'all',
  onCategoryChange: _onCategoryChange,
  globalAccuracy = null,
  globalResolvedCount = 0,
  onTrackRecordPress,
  isFallbackData = false,
  trustMeta,
}: PredictionVoteCardProps) {
  const { colors } = useTheme();
  const track = useTrackEvent();
  const { trackStep } = useHabitLoopTracking();
  const { t, language } = useLocale();
  const isKo = language === 'ko';
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const scrollRef = React.useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // 복기 해설 토글 상태 (인덱스별 펼침/접힘)
  const [expandedReviewIndex, setExpandedReviewIndex] = React.useState<number | null>(null);

  // 투표 완료 애니메이션
  const completeFade = React.useRef(new Animated.Value(0)).current;

  // 질문 목록: polls prop 우선, 없으면 currentPoll을 배열로 래핑
  // polls가 undefined일 수 있으므로 빈 배열 fallback 보장
  const allPolls: PollItem[] = React.useMemo(() => {
    if (Array.isArray(pollsProp) && pollsProp.length > 0) return pollsProp;
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

  // 모든 투표 완료 시 애니메이션 + 성공 햅틱
  React.useEffect(() => {
    if (allVoted) {
      successHaptic();
      Animated.timing(completeFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      completeFade.setValue(0);
    }
  }, [allVoted, completeFade]);

  // 투표 핸들러 (투표 후 자동 다음 질문 스크롤)
  const handleVote = React.useCallback((pollId: string, choice: 'YES' | 'NO') => {
    // 이벤트 추적: 예측 투표
    track('prediction_vote', { pollId, choice, pollIndex: currentIndex });
    trackStep('prediction_vote');

    // 햅틱: 투표 버튼 탭 시 중간 진동
    mediumTap();

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
        scrollRef.current?.scrollTo({ x: POLL_SLIDE_WIDTH * nextIndex, animated: true });
        setCurrentIndex(nextIndex);
      }
    }, 300);
  }, [onVotePoll, onVote, currentIndex, allPolls.length, track, trackStep]);

  // ──────────────────────────────────────────────────────────────────────
  // 로딩 상태
  // ──────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View />
          <Text style={styles.cardLogo}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        </View>
        <View style={styles.centerArea}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
          <Text style={[styles.loadingText, { marginTop: 16 }]}>
            {t('prediction.card.loading')}
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
        <View style={styles.topRow}>
          <View />
          <Text style={styles.cardLogo}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        </View>
        <View style={styles.centerArea}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyText}>{t('prediction.card.empty')}</Text>
          {onViewContext && (
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={onViewContext}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyCtaText}>{t('prediction.card.empty_cta')}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // 개별 질문 슬라이드 렌더러 (일반 함수 — early return 이후이므로 useCallback 사용 불가)
  // ──────────────────────────────────────────────────────────────────────
  const renderPollSlide = ({ item }: { item: PollItem; index: number }) => {
    const pollVote = getMyVoteForPoll(item.id);
    const hasVoted = pollVote !== null;
    const catColors = CATEGORY_COLORS[item.category];
    const categoryLabel = catColors
      ? t(`prediction.card.category_${item.category}` as Parameters<typeof t>[0])
      : item.category;

    return (
      <View style={styles.pollSlide}>
        {/* 카테고리 칩 */}
        {catColors && (
          <View style={[styles.pollCategoryChip, { borderColor: catColors.color }]}>
            <Text style={styles.pollCategoryEmoji}>{catColors.emoji}</Text>
            <Text style={[styles.pollCategoryLabel, { color: catColors.color }]}>
              {categoryLabel}
            </Text>
          </View>
        )}

        {/* 질문 텍스트 */}
        <View style={styles.pollQuestionArea}>
          <Text style={styles.questionText} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8}>
            {item.question}
          </Text>
        </View>

        {/* [NEW] 오를/내릴 근거 박스 */}
        {(item.upReason || item.downReason) && (
          <View style={styles.reasonsContainer}>
            {item.upReason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonIcon}>📰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reasonLabel}>{t('prediction.card.up_reason')}</Text>
                  <Text style={styles.reasonText} numberOfLines={2}>{item.upReason}</Text>
                </View>
              </View>
            )}
            {item.downReason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonIcon}>📰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reasonLabel}>{t('prediction.card.down_reason')}</Text>
                  <Text style={styles.reasonText} numberOfLines={2}>{item.downReason}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 투표 버튼 */}
        <View style={styles.voteArea}>
          {isVoting ? (
            <ActivityIndicator size="small" color={colors.primary} />
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
                  pollVote === 'NO' && styles.voteButtonNoSelected,
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
                accessibilityRole="button"
                accessibilityLabel={t('prediction.card.vote_yes_label', { question: item.question })}
              >
                <Text style={styles.voteButtonText}>👍 YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteButton, styles.voteButtonNo]}
                onPress={() => handleVote(item.id, 'NO')}
                accessibilityRole="button"
                accessibilityLabel={t('prediction.card.vote_no_label', { question: item.question })}
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
      {/* 상단: 헤더 + 페이지 표시 + baln */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🎯</Text>
          <Text style={styles.headerText}>{t('prediction.card.title')}</Text>
          {isFallbackData && (
            <View style={styles.fallbackBadge}>
              <Text style={styles.fallbackBadgeText}>{t('prediction.card.fallback_badge')}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
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
          <Text style={styles.cardLogo}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {trustMeta && (
          <View style={styles.trustMetaRow}>
            <Text style={styles.trustMetaText}>{t('prediction.card.trust_source', { label: trustMeta.sourceLabel })}</Text>
            <Text style={styles.trustMetaText}>{t('prediction.card.trust_generated', { time: formatMetaTimestamp(trustMeta.generatedAt, t('prediction.card.time_unknown')) })}</Text>
            {trustMeta.freshnessLabel && (
              <Text style={styles.trustMetaText}>{t('prediction.card.trust_freshness', { label: trustMeta.freshnessLabel })}</Text>
            )}
            {typeof trustMeta.confidenceScore === 'number' && (
              <Text style={styles.trustMetaText}>{t('prediction.card.trust_confidence', { score: trustMeta.confidenceScore })}</Text>
            )}
          </View>
        )}

        {/* 질문 카운터 (1/3) + 스와이프 힌트 */}
        {allPolls.length > 1 && (
          <View style={styles.pollCounterRow}>
            <Text style={styles.pollCounterText}>
              {t('prediction.card.poll_counter', { current: currentIndex + 1, total: allPolls.length })}
            </Text>
            {currentIndex < allPolls.length - 1 && (
              <Text style={styles.pollSwipeHint}>{t('prediction.card.swipe_hint')}</Text>
            )}
          </View>
        )}

        {/* 수평 스크롤 질문 리스트 (ScrollView + map으로 중첩 에러 방지) */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={POLL_SLIDE_WIDTH}
          decelerationRate="fast"
          nestedScrollEnabled
          disableIntervalMomentum
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / POLL_SLIDE_WIDTH);
            setCurrentIndex(page);
          }}
          style={styles.pollFlatList}
          contentContainerStyle={styles.pollFlatListContent}
        >
          {allPolls.map((item, index) => (
            <React.Fragment key={item.id}>
              {renderPollSlide({ item, index })}
            </React.Fragment>
          ))}
        </ScrollView>

        {/* 모두 투표 완료 메시지 */}
        {allVoted && (
          <Animated.View style={[styles.allVotedBanner, { opacity: completeFade }]}>
            <Text style={styles.allVotedText}>
              {t('prediction.card.all_voted')}
            </Text>
            <View style={styles.allVotedCTARow}>
              {onViewContext && (
                <TouchableOpacity
                  style={styles.allVotedCTAButton}
                  onPress={onViewContext}
                  accessibilityRole="button"
                  accessibilityLabel={t('prediction.card.view_context')}
                >
                  <Text style={[styles.allVotedCTAText, { color: colors.primary }]}>
                    {t('prediction.card.view_context')}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
              {onViewHistory && (
                <TouchableOpacity
                  style={styles.allVotedCTAButton}
                  onPress={onViewHistory}
                  accessibilityRole="button"
                  accessibilityLabel={t('prediction.card.view_history')}
                >
                  <Text style={[styles.allVotedCTAText, { color: colors.primary }]}>
                    {t('prediction.card.view_history')}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* 복기 섹션 */}
        {recentResults.length > 0 && (
          <View style={styles.reviewArea}>
            <Text style={styles.reviewTitle}>{t('prediction.card.review_section')}</Text>
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
                        if (!isExpanded) {
                          track('review_explanation_viewed', { questionIndex: index });
                        }
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
                      <Text style={styles.reviewReward}>+{result.reward}개</Text>
                    )}
                    {hasExplanation && (
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textTertiary}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>

                  {/* 해설 (펼쳐진 상태) */}
                  {isExpanded && hasExplanation && (
                    <View style={styles.explanationBox}>
                      {result.description && (
                        <View style={styles.explanationSection}>
                          <Text style={styles.explanationLabel}>{t('prediction.card.explanation_context')}</Text>
                          <Text style={styles.explanationText}>{result.description}</Text>
                        </View>
                      )}
                      {result.source && (
                        <View style={styles.explanationSection}>
                          <Text style={styles.explanationLabel}>
                            {result.isCorrect ? t('prediction.card.explanation_correct') : t('prediction.card.explanation_answer_key')}
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
                {t('prediction.card.accuracy_label', { rate: accuracyRate.toFixed(0) })}
              </Text>
            )}
            {accuracyRate === null && (
              <Text style={styles.accuracyHint}>
                {t('prediction.card.accuracy_hint')}
              </Text>
            )}
          </View>
        )}

        {/* AI 트랙레코드 배너 (커뮤니티 전체 적중률) */}
        <AITrackRecordBanner
          accuracy={globalAccuracy}
          resolvedCount={globalResolvedCount}
          onPress={onTrackRecordPress}
        />

        {/* 하단: [전체 기록 보기] 프리미엄 게이트 */}
        {onViewHistory && (
          <TouchableOpacity style={styles.historyButton} onPress={() => { track('prediction_history_viewed'); onViewHistory(); }} accessibilityRole="button" accessibilityLabel={t('prediction.card.stats_button')}>
            <Text style={styles.historyText}>{t('prediction.card.stats_button')}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flex: 1,
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contentScroll: {
      flex: 1,
      marginTop: 4,
    },
    contentContainer: {
      paddingBottom: 4,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardLogo: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1,
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
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerEmoji: {
      fontSize: 25,
    },
    headerText: {
      fontSize: 19,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    fallbackBadge: {
      marginLeft: 4,
      backgroundColor: 'rgba(255, 183, 77, 0.2)',
      borderColor: 'rgba(255, 183, 77, 0.35)',
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    fallbackBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFB74D',
    },
    trustMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingTop: 8,
      paddingBottom: 2,
    },
    trustMetaText: {
      fontSize: 11,
      color: colors.textTertiary,
      backgroundColor: colors.surfaceLight,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
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
      backgroundColor: colors.surfaceLight,
    },
    pageDotActive: {
      width: 16,
      backgroundColor: colors.textPrimary,
    },
    pageDotVoted: {
      backgroundColor: colors.primary,
    },
    // 질문 카운터 + 스와이프 힌트
    pollCounterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      paddingBottom: 4,
    },
    pollCounterText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    pollSwipeHint: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.primary,
    },
    // 수평 스크롤 FlatList
    pollFlatList: {
      marginTop: 4,
    },
    pollFlatListContent: {
      alignItems: 'stretch',
    },
    // 개별 질문 슬라이드
    pollSlide: {
      width: POLL_SLIDE_WIDTH,
      justifyContent: 'flex-start',
      paddingBottom: 6,
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
      marginBottom: 8,
    },
    pollCategoryEmoji: {
      fontSize: 13,
    },
    pollCategoryLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    pollQuestionArea: {
      justifyContent: 'center',
      minHeight: 96,
      paddingVertical: 8,
    },
    questionText: {
      fontSize: 23,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 33,
      textAlign: 'center',
    },
    // [NEW] 근거 박스 스타일
    reasonsContainer: {
      gap: 6,
      marginVertical: 6,
    },
    reasonBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: colors.border + '0F',
      borderRadius: 10,
      padding: 10,
      borderLeftWidth: 2,
      borderLeftColor: colors.textSecondary,
    },
    reasonIcon: {
      fontSize: 17,
      marginTop: 2,
    },
    reasonLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 3,
    },
    reasonText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    voteArea: {
      marginTop: 8,
      marginBottom: 4,
    },
    voteRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 2,
    },
    resultsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 2,
    },
    voteButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    voteButtonYes: {
      borderColor: colors.primary,
      backgroundColor: 'transparent',
    },
    voteButtonNo: {
      borderColor: colors.error,
      backgroundColor: 'transparent',
    },
    voteButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    voteButtonNoSelected: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
    voteButtonText: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    voteButtonTextSelected: {
      color: '#FFFFFF',
    },
    votePercentage: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 4,
    },
    votePercentageSelected: {
      color: 'rgba(255, 255, 255, 0.85)',
    },
    // 모두 투표 완료 배너
    allVotedBanner: {
      backgroundColor: colors.primary + '1A',
      borderWidth: 1,
      borderColor: colors.primary + '4D',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    allVotedText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    allVotedCTARow: {
      gap: 10,
      marginTop: 12,
    },
    allVotedCTAButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    allVotedCTAText: {
      fontSize: 14,
      fontWeight: '600',
    },
    // 복기 섹션
    reviewArea: {
      gap: 8,
      marginTop: 10,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    reviewTitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 4,
    },
    reviewItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 44,
      paddingVertical: 6,
    },
    reviewEmoji: {
      fontSize: 17,
    },
    reviewQuestion: {
      flex: 1,
      fontSize: 15,
      color: colors.textSecondary,
    },
    reviewReward: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    explanationBox: {
      marginTop: 8,
      marginLeft: 28,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: colors.primary,
      gap: 12,
    },
    explanationSection: {
      gap: 4,
    },
    explanationLabel: {
      fontSize: 13,
      color: colors.textTertiary,
      fontWeight: '600',
    },
    explanationText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 21,
    },
    accuracyText: {
      fontSize: 15,
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 4,
    },
    accuracyHint: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: 4,
    },
    historyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      minHeight: 48,
    },
    historyText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    centerArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 17,
      color: colors.textSecondary,
    },
    emptyEmoji: {
      fontSize: 80,
      marginBottom: 20,
    },
    emptyText: {
      fontSize: 17,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '15',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginTop: 12,
      gap: 4,
    },
    emptyCtaText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
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
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    categoryChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    categoryTextActive: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
  });
}
