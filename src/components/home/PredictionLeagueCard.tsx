/**
 * PredictionLeagueCard — 예측 리그 컴팩트 카드
 *
 * 역할: 오늘 탭에 표시되는 예측 리그 미니 카드
 * 비유: 스포츠 앱의 "내 리그 순위" 위젯 — 한눈에 티어+순위+기록 확인
 *
 * 표시 정보:
 * - 현재 티어 이모지 + 이름 + 레이팅
 * - 이번 주 적중 기록 (예: "5/8 적중")
 * - 다음 티어까지 진행 바
 * - 시뮬레이션 순위 (12위 / 30명)
 * - 탭 → LeagueStandingModal 열기
 *
 * 사용처: app/(tabs)/index.tsx (오늘 탭)
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { getTierName, type LeagueTier } from '../../data/leagueConfig';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

interface PredictionLeagueCardProps {
  /** 현재 티어 */
  currentTier: LeagueTier;
  /** 현재 레이팅 */
  rating: number;
  /** 이번 주 적중 수 */
  weeklyCorrect: number;
  /** 이번 주 총 예측 수 */
  weeklyTotal: number;
  /** 이번 주 순위 */
  weeklyRank: number;
  /** 다음 티어까지 진행률 (0~100) */
  tierProgress: number;
  /** 다음 티어 (없으면 null) */
  nextTier: LeagueTier | null;
  /** 승급 존 여부 */
  inPromotionZone: boolean;
  /** 강등 존 여부 */
  inRelegationZone: boolean;
  /** 이번 주 승급 여부 */
  isPromoted: boolean;
  /** 카드 탭 시 콜백 (순위표 열기) */
  onPress: () => void;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function PredictionLeagueCard({
  currentTier,
  rating,
  weeklyCorrect,
  weeklyTotal,
  weeklyRank,
  tierProgress,
  nextTier,
  inPromotionZone,
  inRelegationZone,
  isPromoted,
  onPress,
}: PredictionLeagueCardProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const { t, language } = useLocale();

  // 진행 바 애니메이션
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: tierProgress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progressAnim, tierProgress]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  // 순위 존 색상
  const rankColor = inPromotionZone
    ? '#4CAF50'
    : inRelegationZone
      ? '#FF5722'
      : 'rgba(255, 255, 255, 0.6)';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, { borderColor: currentTier.color + '30' }]}
    >
      {/* 상단: 티어 + 레이팅 */}
      <View style={styles.topRow}>
        <View style={styles.tierInfo}>
          <Text style={styles.tierEmoji}>{currentTier.emoji}</Text>
          <View>
            <Text style={[styles.tierName, { color: currentTier.color }]}>
              {getTierName(currentTier, language)}
            </Text>
            <Text style={styles.ratingText}>{rating} RP</Text>
          </View>
        </View>

        {/* 순위 */}
        <View style={styles.rankBadge}>
          <Text style={[styles.rankNumber, { color: rankColor }]}>
            {weeklyRank}
            <Text style={styles.rankTotal}> / 30</Text>
          </Text>
          <Text style={styles.rankLabel}>{t('predictionLeague.rank')}</Text>
        </View>
      </View>

      {/* 중간: 주간 기록 */}
      <View style={styles.weeklyRow}>
        <Text style={styles.weeklyLabel}>
          {t('predictionLeague.thisWeek')}
        </Text>
        <Text style={styles.weeklyRecord}>
          {weeklyTotal > 0
            ? `${weeklyCorrect}/${weeklyTotal} ${t('predictionLeague.correct')}`
            : t('predictionLeague.noPredictions')}
        </Text>
        {isPromoted && (
          <View style={styles.promotedBadge}>
            <Text style={styles.promotedText}>
              {t('predictionLeague.promoted')}
            </Text>
          </View>
        )}
      </View>

      {/* 하단: 진행 바 */}
      {nextTier && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressWidth,
                  backgroundColor: currentTier.color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {t('predictionLeague.rpToNext', { tier: getTierName(nextTier, language), rp: String(nextTier.minRating - rating) })}
          </Text>
        </View>
      )}

      {/* 최고 티어일 때 */}
      {!nextTier && (
        <Text style={styles.maxTierText}>
          {t('predictionLeague.maxTier')}
        </Text>
      )}

      {/* 존 인디케이터 */}
      {(inPromotionZone || inRelegationZone) && (
        <View
          style={[
            styles.zoneBanner,
            { backgroundColor: inPromotionZone ? '#4CAF5015' : '#FF572215' },
          ]}
        >
          <Text
            style={[
              styles.zoneText,
              { color: inPromotionZone ? '#4CAF50' : '#FF5722' },
            ]}
          >
            {inPromotionZone
              ? t('predictionLeague.promotionZone')
              : t('predictionLeague.relegationZone')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default PredictionLeagueCard;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginVertical: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierEmoji: {
    fontSize: 32,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '800',
  },
  ratingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 1,
  },
  rankBadge: {
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  rankTotal: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.3)',
  },
  rankLabel: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
    marginTop: 1,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  weeklyLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
  },
  weeklyRecord: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  promotedBadge: {
    backgroundColor: '#4CAF5020',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  promotedText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '800',
  },
  progressSection: {
    gap: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
    textAlign: 'right',
  },
  maxTierText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  zoneBanner: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  zoneText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
