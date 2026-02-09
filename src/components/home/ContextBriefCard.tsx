/**
 * ContextBriefCard.tsx - 맥락 브리핑 카드 (3줄 구조)
 *
 * 역할: "시장 맥락 3줄 요약 디스플레이"
 * - 달리오 Bridgewater 메모 형식 (Fact/Mechanism/Impact)
 * - 기존 4겹 맥락카드 → 3줄로 극단 단순화
 * - [더 알아보기] = 무료/프리미엄 경계선
 *
 * Anti-Toss 원칙:
 * - Gateway: 3줄만 읽고 30초 안에 이해
 * - 빼기 전략: 뉴스/차트/시세 제거
 * - One Page One Card: Fact/Mechanism/Impact 딱 3줄
 * - 보험 BM: 3줄은 무료, 상세는 프리미엄
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// 무료 체험 기간 상수
// ============================================================================

/** 무료 체험 종료일 (5월 31일) */
const FREE_TRIAL_END = new Date('2026-05-31T23:59:59');

/** 무료 체험 기간 중인지 확인 */
function isFreeTrial(): boolean {
  return new Date() <= FREE_TRIAL_END;
}

/** 남은 일수 계산 (D-xxx) */
function getDaysRemaining(): number {
  const now = new Date();
  const diff = FREE_TRIAL_END.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============================================================================
// Props 인터페이스
// ============================================================================

interface ContextBriefCardProps {
  /** 사실 (FACT) */
  fact: string | null;

  /** 메커니즘 (MECHANISM) */
  mechanism: string | null;

  /** 임팩트 (IMPACT) */
  impact: string | null;

  /** 시장 분위기 */
  sentiment: 'calm' | 'caution' | 'alert';

  /** 시장 분위기 라벨 */
  sentimentLabel: string; // '안정' | '주의' | '경계'

  /** 날짜 */
  date: string; // '2월 9일'

  /** [더 알아보기] 콜백 */
  onLearnMore?: () => void;

  /** 프리미엄 구독 여부 */
  isPremium: boolean;

  /** 공유하기 콜백 */
  onShare?: () => void;

  /** 로딩 상태 */
  isLoading: boolean;
}

// ============================================================================
// 센티먼트 색상 매핑
// ============================================================================

const SENTIMENT_COLORS = {
  calm: '#4CAF50',    // 초록
  caution: '#FFB74D', // 주황
  alert: '#CF6679',   // 빨강
};

// ============================================================================
// 스켈레톤 로더 컴포넌트
// ============================================================================

function SkeletonBar({ width }: { width: number | `${number}%` }) {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeletonBar,
        { width: typeof width === 'number' ? width : width, opacity },
      ]}
    />
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default React.forwardRef<View, ContextBriefCardProps>(function ContextBriefCard({
  fact,
  mechanism,
  impact,
  sentiment,
  sentimentLabel,
  date,
  onLearnMore,
  isPremium,
  onShare,
  isLoading,
}: ContextBriefCardProps, ref) {
  const sentimentColor = SENTIMENT_COLORS[sentiment];
  const freeTrial = isFreeTrial();
  const daysRemaining = getDaysRemaining();

  // 무료 체험 기간에는 프리미엄처럼 취급
  const effectivePremium = isPremium || freeTrial;

  // ──────────────────────────────────────────────────────────────────────
  // 로딩 상태
  // ──────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.card}>
        {/* 상단 배지 */}
        <View style={[styles.sentimentBadge, { backgroundColor: COLORS.surfaceLight }]}>
          <SkeletonBar width={60} />
        </View>

        {/* 3줄 스켈레톤 */}
        <View style={styles.contentArea}>
          <View style={styles.section}>
            <SkeletonBar width={80} />
            <SkeletonBar width="90%" />
          </View>
          <View style={styles.section}>
            <SkeletonBar width={100} />
            <SkeletonBar width="85%" />
          </View>
          <View style={styles.section}>
            <SkeletonBar width={90} />
            <SkeletonBar width="80%" />
          </View>
        </View>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Empty 상태 (데이터 없음)
  // ──────────────────────────────────────────────────────────────────────
  if (!fact && !mechanism && !impact) {
    return (
      <View style={styles.card}>
        <View style={styles.centerArea}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>오늘의 맥락을 준비 중이에요</Text>
        </View>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // 데이터 상태 (3줄 브리핑 표시)
  // ──────────────────────────────────────────────────────────────────────
  return (
    <View ref={ref} style={styles.card}>
      {/* 무료 체험 배너 (5/31까지) */}
      {freeTrial && (
        <View style={styles.freeTrialBanner}>
          <Text style={styles.freeTrialText}>
            5월 31일까지 모든 기능 무료!
          </Text>
          <View style={styles.freeTrialCountdown}>
            <Text style={styles.freeTrialDday}>D-{daysRemaining}</Text>
          </View>
        </View>
      )}

      {/* 상단: 센티먼트 배지 */}
      <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor }]}>
        <Text style={styles.sentimentEmoji}>
          {sentiment === 'calm' ? '🟢' : sentiment === 'caution' ? '🟡' : '🔴'}
        </Text>
        <Text style={styles.sentimentLabel}>{sentimentLabel}</Text>
      </View>

      {/* 중앙: 3줄 브리핑 */}
      <View style={styles.contentArea}>
        {/* 1. FACT */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📌 사실</Text>
          <Text style={styles.sectionContent} numberOfLines={2}>
            {fact || '데이터 준비 중'}
          </Text>
        </View>

        {/* 2. MECHANISM */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>⚙️ 메커니즘</Text>
          <Text style={styles.sectionContentSecondary} numberOfLines={2}>
            {mechanism || '분석 중...'}
          </Text>
        </View>

        {/* 3. IMPACT */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>💥 임팩트</Text>
          <Text style={styles.sectionContentImpact} numberOfLines={2}>
            {impact || '영향도 계산 중'}
          </Text>
        </View>
      </View>

      {/* 하단: 프리미엄 게이트 + 공유 */}
      <View style={styles.footer}>
        {/* [더 알아보기] 버튼 — 무료 체험 기간에는 잠금 해제 */}
        {onLearnMore && (
          <TouchableOpacity style={styles.learnMoreButton} onPress={onLearnMore}>
            <Text style={styles.learnMoreText}>
              {effectivePremium ? '더 알아보기' : '🔒 프리미엄'}
            </Text>
            {effectivePremium ? (
              <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
            ) : (
              <Text style={styles.premiumPrice}>월 ₩2,900</Text>
            )}
          </TouchableOpacity>
        )}

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 공유하기 버튼 */}
        {onShare && (
          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.shareText}>공유하기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

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
  sentimentBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  sentimentEmoji: {
    fontSize: 14,
  },
  sentimentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionContent: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 26,
  },
  sectionContentSecondary: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  sectionContentImpact: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 26,
  },
  footer: {
    gap: 16,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  learnMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  premiumPrice: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  shareText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  skeletonBar: {
    height: 14,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    marginVertical: 4,
  },
  // 무료 체험 배너 스타일
  freeTrialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  freeTrialText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    flex: 1,
  },
  freeTrialCountdown: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  freeTrialDday: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
