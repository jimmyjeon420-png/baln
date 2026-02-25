/**
 * FriendshipMeter — 구루 우정도 게이지 컴포넌트
 *
 * 역할: "우정 온도계" — 특정 구루와의 관계 깊이를 시각화
 * - 구루 아바타 + 티어 이름 + 진행 바 + 점수 표시
 * - 티어별 색상 차별화 (낯선 사이=회색, 친구=파랑, 절친=보라, 소울메이트=금색)
 * - compact 모드: 리스트에서 쓸 수 있는 간소화 버전
 * - 높은 티어에서 하트/별 장식 표시
 *
 * 비유: "친구 관계 진도표" — RPG 게임의 NPC 호감도 게이지와 동일
 *
 * 사용처:
 * - 구루 목록 화면: 각 구루 옆에 compact 모드로
 * - 구루 디테일 화면: 풀 모드로 상단에 배치
 * - 프로필 화면: 우정도 요약 섹션
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GuruFriendship, FriendshipTier } from '../../types/village';
import { CharacterAvatar } from '../character/CharacterAvatar';

// ============================================================================
// 타입
// ============================================================================

interface FriendshipMeterProps {
  /** 해당 구루와의 우정 상태 데이터 */
  friendship: GuruFriendship;
  /** 구루 ID (CharacterAvatar에 전달) */
  guruId: string;
  /** 테마 색상 */
  colors: any;
  /** 로케일 (ko/en) */
  locale?: string;
  /** 컴팩트 모드 (리스트용, 티어 이모지 + 바만 표시) */
  compact?: boolean;
}

// ============================================================================
// 티어 메타데이터
// ============================================================================

/** 티어 이름 (한국어/영어) */
const TIER_NAMES: Record<FriendshipTier, { ko: string; en: string }> = {
  stranger: { ko: '낯선 사이', en: 'Stranger' },
  acquaintance: { ko: '아는 사이', en: 'Acquaintance' },
  friend: { ko: '친구', en: 'Friend' },
  close_friend: { ko: '절친', en: 'Close Friend' },
  best_friend: { ko: '베프', en: 'Best Friend' },
  mentor: { ko: '스승', en: 'Mentor' },
  soulmate: { ko: '소울메이트', en: 'Soulmate' },
};

/** 티어 이모지 */
const TIER_EMOJI: Record<FriendshipTier, string> = {
  stranger: '🙂',
  acquaintance: '👋',
  friend: '🤝',
  close_friend: '💙',
  best_friend: '💜',
  mentor: '🎓',
  soulmate: '⭐',
};

/** 티어별 점수 범위 (다음 티어까지 필요한 점수) */
const TIER_THRESHOLDS: Record<FriendshipTier, { min: number; max: number }> = {
  stranger: { min: 0, max: 19 },
  acquaintance: { min: 20, max: 49 },
  friend: { min: 50, max: 99 },
  close_friend: { min: 100, max: 149 },
  best_friend: { min: 150, max: 199 },
  mentor: { min: 150, max: 199 },
  soulmate: { min: 200, max: 250 }, // 200+ 이면 만렙
};

/** 티어별 진행 바 색상 */
function getTierBarColor(tier: FriendshipTier): string {
  switch (tier) {
    case 'stranger':      return '#8E9EB0';  // 회색
    case 'acquaintance':  return '#64B5F6';  // 연파랑
    case 'friend':        return '#42A5F5';  // 파랑
    case 'close_friend':  return '#7E57C2';  // 보라
    case 'best_friend':   return '#9B7DFF';  // 진보라
    case 'mentor':        return '#4CAF50';  // 초록
    case 'soulmate':      return '#F0C060';  // 금색
    default:              return '#8E9EB0';
  }
}

/** 티어 → 장식 (하트/별) 표시 여부 */
function getTierDecorations(tier: FriendshipTier): string {
  switch (tier) {
    case 'close_friend':  return '💙';
    case 'best_friend':   return '💜💜';
    case 'mentor':        return '🎓';
    case 'soulmate':      return '⭐⭐⭐';
    default:              return '';
  }
}

/** 현재 티어 내 진행도(0~1) 계산 */
function calcTierProgress(score: number, tier: FriendshipTier): number {
  const threshold = TIER_THRESHOLDS[tier] ?? { min: 0, max: 100 };
  const { min, max } = threshold;
  if (score >= max) return 1;
  if (score <= min) return 0;
  return (score - min) / (max - min);
}

// ============================================================================
// 풀 모드 컴포넌트
// ============================================================================

function FullFriendshipMeter({
  friendship,
  guruId,
  colors,
  locale = 'ko',
}: Omit<FriendshipMeterProps, 'compact'>) {
  const { tier, score } = friendship;
  const isKo = locale === 'ko';

  const tierName = isKo ? TIER_NAMES[tier].ko : TIER_NAMES[tier].en;
  const tierEmoji = TIER_EMOJI[tier];
  const barColor = getTierBarColor(tier);
  const progress = calcTierProgress(score, tier);
  const decorations = getTierDecorations(tier);

  // 다음 티어까지 남은 점수 계산
  const threshold = TIER_THRESHOLDS[tier] ?? { min: 0, max: 100 };
  const isSoulmate = tier === 'soulmate';
  const pointsToNext = isSoulmate ? 0 : threshold.max + 1 - score;

  if (__DEV__) {
    // console.log('[FriendshipMeter] guruId=%s tier=%s score=%d', guruId, tier, score);
  }

  return (
    <View
      style={[
        styles.fullContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* 상단 행: 아바타 + 티어 이름 + 장식 */}
      <View style={styles.headerRow}>
        {/* 구루 아바타 (sm 크기) */}
        <CharacterAvatar guruId={guruId} size="sm" />

        {/* 티어 정보 */}
        <View style={styles.tierInfo}>
          <View style={styles.tierNameRow}>
            <Text style={styles.tierEmoji}>{tierEmoji}</Text>
            <Text style={[styles.tierName, { color: barColor }]}>
              {tierName}
            </Text>
            {decorations.length > 0 && (
              <Text style={styles.decorations}>{decorations}</Text>
            )}
          </View>

          {/* 점수 표시 */}
          <Text style={[styles.scoreText, { color: colors.textTertiary }]}>
            {isKo
              ? `${score}점${isSoulmate ? ' (만렙!)' : ` · 다음 티어까지 ${pointsToNext}점`}`
              : `${score} pts${isSoulmate ? ' (Max!)' : ` · ${pointsToNext} to next`}`
            }
          </Text>
        </View>
      </View>

      {/* 진행 바 */}
      <View style={styles.progressBarArea}>
        {/* 배경 바 */}
        <View
          style={[styles.progressBarBg, { backgroundColor: colors.surfaceElevated }]}
        >
          {/* 채워진 바 */}
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>

        {/* 퍼센트 텍스트 */}
        <Text style={[styles.progressPercent, { color: colors.textTertiary }]}>
          {isSoulmate ? '100%' : `${Math.round(progress * 100)}%`}
        </Text>
      </View>

      {/* 소울메이트 축하 메시지 */}
      {isSoulmate && (
        <Text style={[styles.soulmateBadge, { color: colors.premium.gold }]}>
          {isKo ? '전설의 동반자 ✨' : 'Legendary Bond ✨'}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// 컴팩트 모드 컴포넌트
// ============================================================================

function CompactFriendshipMeter({
  friendship,
  guruId,
  colors,
}: Omit<FriendshipMeterProps, 'compact'>) {
  const { tier, score } = friendship;

  const tierEmoji = TIER_EMOJI[tier];
  const barColor = getTierBarColor(tier);
  const progress = calcTierProgress(score, tier);
  const isSoulmate = tier === 'soulmate';

  return (
    <View style={styles.compactContainer}>
      {/* 티어 이모지 */}
      <Text style={styles.compactEmoji}>{tierEmoji}</Text>

      {/* 진행 바 (작은 버전) */}
      <View
        style={[styles.compactBarBg, { backgroundColor: colors.surfaceElevated }]}
      >
        <View
          style={[
            styles.compactBarFill,
            {
              width: `${Math.min(isSoulmate ? 100 : progress * 100, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

const FriendshipMeter = React.memo(({
  friendship,
  guruId,
  colors,
  locale = 'ko',
  compact = false,
}: FriendshipMeterProps) => {
  if (compact) {
    return (
      <CompactFriendshipMeter
        friendship={friendship}
        guruId={guruId}
        colors={colors}
        locale={locale}
      />
    );
  }

  return (
    <FullFriendshipMeter
      friendship={friendship}
      guruId={guruId}
      colors={colors}
      locale={locale}
    />
  );
});

FriendshipMeter.displayName = 'FriendshipMeter';

export default FriendshipMeter;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  // --- 풀 모드 ---
  fullContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierInfo: {
    flex: 1,
    gap: 3,
  },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tierEmoji: {
    fontSize: 16,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '700',
  },
  decorations: {
    fontSize: 13,
    marginLeft: 2,
  },
  scoreText: {
    fontSize: 12,
  },
  progressBarArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  soulmateBadge: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },

  // --- 컴팩트 모드 ---
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactEmoji: {
    fontSize: 14,
  },
  compactBarBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  compactBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
