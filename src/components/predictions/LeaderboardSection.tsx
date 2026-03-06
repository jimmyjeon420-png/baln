/**
 * LeaderboardSection.tsx - 투자 예측 리더보드 섹션 (게임형 UI)
 *
 * 역할: "명예의 전당"
 * - Top 10 유저 카드 (1~3등 그라데이션 배경)
 * - 순위 배지 (🥇🥈🥉) + 메달 색상
 * - 프로필 아바타 (색상 원)
 * - 적중률 + 투표 횟수 + 연속 스트릭
 * - 내 순위 하이라이트 (TOP 10 밖이면 하단 고정)
 * - 순차 페이드인 애니메이션
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useLocale } from '../../context/LocaleContext';
import { LeaderboardEntry } from '../../types/prediction';

interface LeaderboardSectionProps {
  leaderboard: LeaderboardEntry[] | undefined;
  isLoading: boolean;
}

export default function LeaderboardSection({ leaderboard, isLoading }: LeaderboardSectionProps) {
  const { t } = useLocale();
  // 내 순위가 TOP 10 밖인지 확인
  const myEntry = leaderboard?.find(entry => entry.isMe);
  const isMyRankOutsideTop10 = myEntry && myEntry.rank > 10;
  const top10 = leaderboard?.slice(0, 10) || [];
  const remainingToTop10 = isMyRankOutsideTop10 ? myEntry.rank - 10 : 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{'🏆 '}{t('leaderboard.title')}</Text>
      {isLoading ? (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>{t('leaderboard.loading')}</Text>
        </View>
      ) : !leaderboard || leaderboard.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏅</Text>
          <Text style={styles.emptyTitle}>{t('leaderboard.empty_title')}</Text>
          <Text style={styles.emptyDescription}>
            {t('leaderboard.empty_desc')}
          </Text>
        </View>
      ) : (
        <>
          {/* TOP 10 카드 */}
          <View style={styles.leaderboardContainer}>
            {top10.map((entry, index) => (
              <LeaderboardCard
                key={entry.user_id}
                entry={entry}
                index={index}
              />
            ))}
          </View>

          {/* 내 순위 (TOP 10 밖) */}
          {isMyRankOutsideTop10 && (
            <MyRankCard
              entry={myEntry}
              remainingToTop10={remainingToTop10}
            />
          )}
        </>
      )}
    </View>
  );
}

// ============================================================================
// 리더보드 카드 컴포넌트 (애니메이션 적용)
// ============================================================================

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  index: number;
}

function LeaderboardCard({ entry, index }: LeaderboardCardProps) {
  const { t } = useLocale();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    // 순차 페이드인 (각 항목 100ms 딜레이)
    opacity.value = withDelay(index * 100, withSpring(1, { damping: 15 }));
    translateY.value = withDelay(index * 100, withSpring(0, { damping: 15 }));
  }, [index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const isTop3 = entry.rank <= 3;
  const isMe = entry.isMe;

  // 1~3등 그라데이션 색상
  const gradientColors = isTop3
    ? entry.rank === 1
      ? ['#FFD700', '#FFA500'] as const // 금색
      : entry.rank === 2
      ? ['#C0C0C0', '#A9A9A9'] as const // 은색
      : ['#CD7F32', '#8B4513'] as const // 동색
    : ['#1E1E1E', '#1E1E1E'] as const; // 일반

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          isMe && !isTop3 && styles.cardMe,
        ]}
      >
        {/* 순위 배지 */}
        <View style={styles.rankBadge}>
          {isTop3 ? (
            <Text style={styles.medalEmoji}>
              {['🥇', '🥈', '🥉'][entry.rank - 1]}
            </Text>
          ) : (
            <Text style={[styles.rankNumber, isTop3 && styles.rankNumberTop]}>
              {entry.rank}
            </Text>
          )}
        </View>

        {/* 프로필 아바타 */}
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(entry.user_id) }]}>
          <Text style={styles.avatarText}>
            {(entry.isMe ? t('leaderboard.me_label') : entry.display_name).charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* 유저 정보 */}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, isTop3 && styles.userNameTop]}>
            {entry.isMe ? t('leaderboard.me_label') : entry.display_name}
          </Text>
          <Text style={[styles.userVotes, isTop3 && styles.userVotesTop]}>
            {t('leaderboard.votes_count', { count: String(entry.total_votes) })}
          </Text>
        </View>

        {/* 적중률 */}
        <View style={styles.accuracySection}>
          <Text style={[styles.accuracyValue, isTop3 && styles.accuracyValueTop]}>
            {Number(entry.accuracy_rate).toFixed(1)}%
          </Text>
          <Text style={[styles.accuracyLabel, isTop3 && styles.accuracyLabelTop]}>
            {t('leaderboard.accuracy_label')}
          </Text>
        </View>

        {/* 연속 스트릭 */}
        {entry.best_streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={[styles.streakText, isTop3 && styles.streakTextTop]}>
              {entry.best_streak}🔥
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================================================
// 내 순위 카드 (TOP 10 밖 - 펄스 애니메이션)
// ============================================================================

interface MyRankCardProps {
  entry: LeaderboardEntry;
  remainingToTop10: number;
}

function MyRankCard({ entry, remainingToTop10 }: MyRankCardProps) {
  const { t } = useLocale();
  const scale = useSharedValue(1);

  useEffect(() => {
    // 펄스 애니메이션 (1.0 -> 1.05 -> 1.0 반복)
    scale.value = withRepeat(
      withSequence(
        withSpring(1.05, { damping: 2 }),
        withSpring(1.0, { damping: 2 })
      ),
      -1, // 무한 반복
      false
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.myRankContainer, animatedStyle]}>
      <View style={styles.myRankHeader}>
        <Text style={styles.myRankTitle}>{t('leaderboard.my_rank_title')}</Text>
        <Text style={styles.myRankSubtitle}>
          {t('leaderboard.my_rank_remaining', { count: String(remainingToTop10) })}
        </Text>
      </View>

      <View style={styles.myRankCard}>
        {/* 순위 배지 */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankNumber}>{entry.rank}</Text>
        </View>

        {/* 프로필 아바타 */}
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(entry.user_id) }]}>
          <Text style={styles.avatarText}>{t('leaderboard.me_label')}</Text>
        </View>

        {/* 유저 정보 */}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, styles.userNameMe]}>{t('leaderboard.me_label')}</Text>
          <Text style={styles.userVotes}>{t('leaderboard.votes_count', { count: String(entry.total_votes) })}</Text>
        </View>

        {/* 적중률 */}
        <View style={styles.accuracySection}>
          <Text style={styles.accuracyValue}>
            {Number(entry.accuracy_rate).toFixed(1)}%
          </Text>
          <Text style={styles.accuracyLabel}>{t('leaderboard.accuracy_label')}</Text>
        </View>

        {/* 연속 스트릭 */}
        {entry.best_streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>{entry.best_streak}🔥</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

// 유저 ID 기반 아바타 색상 생성
function getAvatarColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B500', '#E74C3C', '#3498DB', '#2ECC71',
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },

  // 로딩 상태
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 15,
    color: '#666666',
  },

  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 21,
  },

  // 리더보드 컨테이너
  leaderboardContainer: {
    gap: 10,
  },

  // 카드 래퍼 (애니메이션용)
  cardWrapper: {
    marginBottom: 2,
  },

  // 카드 스타일
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#1E1E1E',
    // 그림자 효과
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardMe: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },

  // 순위 배지
  rankBadge: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medalEmoji: {
    fontSize: 29,
  },
  rankNumber: {
    fontSize: 19,
    fontWeight: '800',
    color: '#AAAAAA',
  },
  rankNumberTop: {
    fontSize: 21,
    color: '#FFFFFF',
  },

  // 프로필 아바타
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 유저 정보
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  userNameTop: {
    color: '#000000',
    fontWeight: '800',
  },
  userNameMe: {
    color: '#4CAF50',
    fontWeight: '800',
  },
  userVotes: {
    fontSize: 12,
    color: '#888888',
  },
  userVotesTop: {
    color: '#000000',
    opacity: 0.7,
  },

  // 적중률 섹션
  accuracySection: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  accuracyValue: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  accuracyValueTop: {
    color: '#000000',
  },
  accuracyLabel: {
    fontSize: 11,
    color: '#888888',
  },
  accuracyLabelTop: {
    color: '#000000',
    opacity: 0.6,
  },

  // 연속 스트릭 배지
  streakBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9800',
  },
  streakTextTop: {
    color: '#000000',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // 내 순위 카드 (TOP 10 밖)
  myRankContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  myRankHeader: {
    marginBottom: 10,
  },
  myRankTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  myRankSubtitle: {
    fontSize: 13,
    color: '#888888',
  },
  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#1A2A1A',
    borderWidth: 2,
    borderColor: '#4CAF50',
    // 그림자 효과
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
