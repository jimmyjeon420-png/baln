/**
 * achievements.tsx - 나의 성취 배지 화면
 *
 * 역할: "명예의 전당"
 * - 10개 핵심 배지 그리드 (3열)
 * - 해금 배지: 풀컬러 + 해금 날짜
 * - 잠긴 배지: opacity 0.3 + 자물쇠 아이콘
 * - 해금 시 expo-haptics 진동 + 축하 토스트
 *
 * [진입점]
 * - profile.tsx "나의 성취" 메뉴 → router.push('/achievements')
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAchievements } from '../src/hooks/useAchievements';
import { useStreak } from '../src/hooks/useStreak';
import { useMyPredictionStats } from '../src/hooks/usePredictions';
import { COLORS } from '../src/styles/theme';
import type { AchievementWithStatus, AchievementId } from '../src/services/achievementService';

export default function AchievementsScreen() {
  const router = useRouter();
  const {
    achievements,
    unlockedCount,
    totalCount,
    isLoading,
    newlyUnlocked,
    clearNewlyUnlocked,
    checkAchievements,
  } = useAchievements();

  const { currentStreak } = useStreak();
  const { data: predictionStats } = useMyPredictionStats();

  // 축하 토스트 상태
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastOpacity] = useState(new Animated.Value(0));

  // 화면 진입 시 자동 해금 체크
  useEffect(() => {
    const autoCheck = async () => {
      await checkAchievements({
        currentStreak,
        predictionAccuracy: predictionStats?.accuracy_rate,
        predictionStreak: predictionStats?.current_streak,
        correctVotes: predictionStats?.correct_votes,
      });
    };

    // 스트릭 또는 예측 데이터 로드 후 체크
    if (currentStreak > 0 || predictionStats) {
      autoCheck();
    }
  }, [currentStreak, predictionStats]);

  // 새로 해금 시 토스트 표시
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      // 첫 번째 새 배지 정보 가져오기
      const newBadge = achievements.find(a => a.id === newlyUnlocked[0]);
      if (newBadge) {
        showToast(`${newBadge.emoji} ${newBadge.title} 배지 획득!`);

        // 햅틱 진동
        triggerHaptic();
      }

      clearNewlyUnlocked();
    }
  }, [newlyUnlocked]);

  // 토스트 표시 함수
  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastMessage(null);
    });
  };

  // 햅틱 진동 (try/catch로 안전 처리)
  const triggerHaptic = async () => {
    try {
      const Haptics = require('expo-haptics');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // 디바이스 미지원 시 무시
    }
  };

  // 진행률 퍼센트
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>나의 성취</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{unlockedCount}/{totalCount}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* 진행률 카드 */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>{'🏆'} 배지 수집 진행률</Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          {/* 진행률 바 */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressSubtitle}>
            {unlockedCount === 0
              ? '첫 배지를 획득해보세요!'
              : unlockedCount >= totalCount
                ? '모든 배지를 획득했어요! 대단해요!'
                : `${totalCount - unlockedCount}개 배지가 남았어요`}
          </Text>
        </View>

        {/* 배지 그리드 (3열) */}
        <View style={styles.badgeGrid}>
          {achievements.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </View>

        {/* 안내 문구 */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color="#888888" />
          <Text style={styles.infoText}>
            배지는 앱 사용 활동에 따라 자동으로 해금됩니다.{'\n'}
            매일 방문하고, 예측에 참여하면 배지를 모을 수 있어요!
          </Text>
        </View>
      </ScrollView>

      {/* 축하 토스트 */}
      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// 배지 카드 컴포넌트
// ============================================================================

function BadgeCard({ badge }: { badge: AchievementWithStatus }) {
  const isUnlocked = badge.isUnlocked;

  return (
    <View style={[styles.badgeCard, !isUnlocked && styles.badgeCardLocked]}>
      {/* 이모지 or 자물쇠 */}
      <View style={styles.badgeEmojiContainer}>
        {isUnlocked ? (
          <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
        ) : (
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={24} color="#555555" />
          </View>
        )}
      </View>

      {/* 배지 제목 */}
      <Text style={[styles.badgeTitle, !isUnlocked && styles.badgeTitleLocked]}>
        {badge.title}
      </Text>

      {/* 설명 (해금 시) 또는 "???" (잠금 시) */}
      <Text
        style={[styles.badgeDesc, !isUnlocked && styles.badgeDescLocked]}
        numberOfLines={2}
      >
        {isUnlocked ? badge.description : '???'}
      </Text>

      {/* 해금 날짜 (해금 시만) */}
      {isUnlocked && badge.unlockedDate && (
        <Text style={styles.badgeDate}>{badge.unlockedDate}</Text>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },

  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },

  // 진행률 카드
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#2A2A2A',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  progressSubtitle: {
    fontSize: 13,
    color: '#888888',
  },

  // 배지 그리드 (3열)
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },

  // 배지 카드
  badgeCard: {
    width: '30.5%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  badgeCardLocked: {
    opacity: 0.35,
    borderColor: '#1E1E1E',
  },
  badgeEmojiContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  lockIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeTitleLocked: {
    color: '#666666',
  },
  badgeDesc: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeDescLocked: {
    color: '#444444',
  },
  badgeDate: {
    fontSize: 9,
    color: COLORS.primary,
    marginTop: 6,
    fontWeight: '600',
  },

  // 안내 카드
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#888888',
    lineHeight: 18,
  },

  // 축하 토스트
  toast: {
    position: 'absolute',
    top: 100,
    left: 24,
    right: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});
