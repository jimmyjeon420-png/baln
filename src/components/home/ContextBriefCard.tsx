/**
 * ContextBriefCard.tsx - 맥락 브리핑 카드 (4겹 레이어 시스템)
 *
 * 역할: "시장 맥락 4겹 레이어 디스플레이"
 * - 기존 3줄 브리핑 (Fact/Mechanism/Impact) 을 4겹 레이어로 확장
 * - Layer 1: 역사적 맥락 ("2018년에도 이런 패턴...") [무료]
 * - Layer 2: 거시경제 체인 ("CPI -> 금리 -> 기술주 -> 삼성전자") [무료]
 * - Layer 3: 기관 행동 ("외국인 3일 연속 순매수 중") [Premium]
 * - Layer 4: 내 포트폴리오 영향 ("당신의 자산 -1.2% 영향") [Premium]
 *
 * Anti-Toss 원칙:
 * - Gateway: 헤드라인 + 센티먼트로 즉각 인지
 * - 빼기 전략: 각 레이어를 접을 수 있어서 원하는 깊이만 소비
 * - 보험 BM: Layer 1-2 무료, Layer 3-4 프리미엄
 * - 무료 체험 기간 (5/31까지): 모든 레이어 오픈
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import type { ThemeColors } from '../../styles/colors';

// Android LayoutAnimation 활성화
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
// 레이어 색상 상수 (4겹 각각 고유 색상)
// ============================================================================

const LAYER_COLORS = {
  historical: '#4CAF50',     // 초록 - 역사적 맥락
  macro: '#29B6F6',          // 라이트 블루 - 거시경제 체인
  institutional: '#FF9800',  // 주황 - 기관 행동
  portfolio: '#7C4DFF',      // 퍼플 - 내 포트폴리오
} as const;

// ============================================================================
// Props 인터페이스
// ============================================================================

interface ContextBriefCardProps {
  /** 사실 (FACT) - 헤드라인 */
  fact: string | null;

  /** 메커니즘 (MECHANISM) - 거시경제 체인 요약 */
  mechanism: string | null;

  /** 임팩트 (IMPACT) - 영향도 요약 */
  impact: string | null;

  /** 시장 분위기 */
  sentiment: 'calm' | 'caution' | 'alert';

  /** 시장 분위기 라벨 */
  sentimentLabel: string;

  /** 날짜 */
  date: string;

  /** [더 알아보기] 콜백 */
  onLearnMore?: () => void;

  /** 프리미엄 구독 여부 */
  isPremium: boolean;

  /** 공유하기 콜백 */
  onShare?: () => void;

  /** 로딩 상태 */
  isLoading: boolean;

  // ── 4겹 레이어 전용 데이터 (optional, 하위호환) ──

  /** Layer 1: 역사적 맥락 */
  historicalContext?: string | null;

  /** Layer 2: 거시경제 체인 (화살표 연결 배열) */
  macroChain?: string[] | null;

  /** Layer 3: 기관 행동 [Premium] */
  institutionalBehavior?: string | null;

  /** Layer 4: 포트폴리오 영향 [Premium] */
  portfolioImpact?: {
    percentChange: number;
    healthScoreChange: number;
    message: string;
  } | null;
}

// ============================================================================
// 센티먼트 색상 매핑
// ============================================================================

const SENTIMENT_COLORS = {
  calm: '#4CAF50',
  caution: '#FFB74D',
  alert: '#CF6679',
};

const SENTIMENT_BG_COLORS = {
  calm: 'rgba(76, 175, 80, 0.12)',
  caution: 'rgba(255, 183, 77, 0.12)',
  alert: 'rgba(207, 102, 121, 0.12)',
};

// ============================================================================
// 스켈레톤 로더 컴포넌트
// ============================================================================

function SkeletonBar({ width }: { width: number | `${number}%` }) {
  const { colors } = useTheme();
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
        {
          height: 14,
          backgroundColor: colors.surfaceLight,
          borderRadius: 4,
          marginVertical: 4,
        },
        { width: typeof width === 'number' ? width : width, opacity },
      ]}
    />
  );
}

// ============================================================================
// 레이어 섹션 서브 컴포넌트 (접기/펼치기 지원)
// ============================================================================

interface LayerSectionProps {
  /** 레이어 번호 (1~4) */
  layerNum: number;
  /** 아이콘 이름 */
  icon: keyof typeof Ionicons.glyphMap;
  /** 레이어 제목 (한국어) */
  title: string;
  /** 레이어 영문 라벨 */
  subtitle: string;
  /** 레이어 고유 색상 */
  color: string;
  /** 펼쳐진 상태 */
  isExpanded: boolean;
  /** 토글 핸들러 */
  onToggle: () => void;
  /** 프리미엄 잠금 여부 */
  isLocked?: boolean;
  /** 프리미엄 구매 콜백 */
  onPressPremium?: () => void;
  /** 자식 콘텐츠 */
  children: React.ReactNode;
  /** 스타일 객체 */
  styles: any;
  /** 색상 객체 */
  COLORS: any;
}

function LayerSection({
  layerNum,
  icon,
  title,
  subtitle,
  color,
  isExpanded,
  onToggle,
  isLocked = false,
  onPressPremium,
  children,
  styles,
  COLORS,
}: LayerSectionProps) {
  return (
    <View style={styles.layerContainer}>
      {/* 레이어 헤더 (탭하면 접기/펼치기) */}
      <TouchableOpacity
        style={styles.layerHeader}
        onPress={isLocked ? onPressPremium : onToggle}
        activeOpacity={0.7}
      >
        {/* 좌측: 번호 배지 + 아이콘 + 제목 */}
        <View style={styles.layerHeaderLeft}>
          <View style={[styles.layerNumBadge, { backgroundColor: color }]}>
            <Text style={styles.layerNumText}>{layerNum}</Text>
          </View>
          <Ionicons name={icon} size={18} color={color} style={{ marginLeft: 10 }} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.layerTitle}>{title}</Text>
            <Text style={styles.layerSubtitle}>{subtitle}</Text>
          </View>
        </View>

        {/* 우측: 잠금 또는 화살표 */}
        <View style={styles.layerHeaderRight}>
          {isLocked ? (
            <View style={styles.premiumBadge}>
              <Ionicons name="lock-closed" size={12} color={COLORS.premium.gold} />
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          ) : (
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.textTertiary}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* 레이어 콘텐츠 (펼쳐졌을 때만) */}
      {isExpanded && !isLocked && (
        <View style={[styles.layerContent, { borderLeftColor: color }]}>
          {children}
        </View>
      )}

      {/* 잠금 상태: 블러 프리뷰 */}
      {isLocked && (
        <TouchableOpacity
          style={styles.lockedContent}
          onPress={onPressPremium}
          activeOpacity={0.7}
        >
          <View style={styles.lockedBlur}>
            <Text style={styles.lockedBlurText}>
              {layerNum === 3
                ? '기관 투자자의 움직임과 의미를...'
                : '당신의 포트폴리오에 미치는 영향을...'}
            </Text>
          </View>
          <View style={styles.lockedCTA}>
            <Ionicons name="star" size={14} color={COLORS.premium.gold} />
            <Text style={styles.lockedCTAText}>Premium으로 전체 보기</Text>
            <Text style={styles.lockedCTAPrice}>월 2,900</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// 거시경제 체인 시각화 서브 컴포넌트
// ============================================================================

function MacroChainVisual({ chain }: { chain: string[] }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  if (!chain || chain.length === 0) return null;

  return (
    <View style={styles.chainContainer}>
      {chain.map((step, index) => (
        <View key={index}>
          <View style={styles.chainStep}>
            <View
              style={[
                styles.chainDot,
                {
                  backgroundColor:
                    index === 0
                      ? LAYER_COLORS.macro
                      : index === chain.length - 1
                        ? colors.sell
                        : colors.textTertiary,
                },
              ]}
            />
            <Text
              style={[
                styles.chainStepText,
                index === 0 && styles.chainStepFirst,
                index === chain.length - 1 && styles.chainStepLast,
              ]}
            >
              {step}
            </Text>
          </View>
          {index < chain.length - 1 && (
            <View style={styles.chainArrowContainer}>
              <View style={styles.chainLine} />
              <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// 포트폴리오 영향 시각화 서브 컴포넌트
// ============================================================================

function PortfolioImpactVisual({
  percentChange,
  healthScoreChange,
  message,
}: {
  percentChange: number;
  healthScoreChange: number;
  message: string;
}) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const isPositive = percentChange >= 0;
  const changeColor = isPositive ? colors.buy : colors.sell;

  return (
    <View style={styles.impactContainer}>
      {/* 변동률 큰 숫자 표시 */}
      <View style={styles.impactMainRow}>
        <View style={[styles.impactBigBox, { borderColor: changeColor }]}>
          <Text style={[styles.impactBigNumber, { color: changeColor }]}>
            {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
          </Text>
          <Text style={styles.impactBigLabel}>자산 변동</Text>
        </View>

        <View style={styles.impactMetaColumn}>
          {/* 건강 점수 변동 */}
          <View style={styles.impactMetaRow}>
            <Ionicons
              name={
                healthScoreChange > 0
                  ? 'arrow-up-circle'
                  : healthScoreChange < 0
                    ? 'arrow-down-circle'
                    : 'remove-circle'
              }
              size={18}
              color={
                healthScoreChange > 0
                  ? colors.buy
                  : healthScoreChange < 0
                    ? colors.sell
                    : colors.textTertiary
              }
            />
            <Text style={styles.impactMetaText}>
              건강 점수{' '}
              {healthScoreChange === 0
                ? '변동 없음'
                : `${healthScoreChange > 0 ? '+' : ''}${healthScoreChange}`}
            </Text>
          </View>
        </View>
      </View>

      {/* 해설 메시지 */}
      {message ? (
        <Text style={styles.impactMessage}>{message}</Text>
      ) : null}
    </View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default React.forwardRef<View, ContextBriefCardProps>(
  (
    {
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
      historicalContext,
      macroChain,
      institutionalBehavior,
      portfolioImpact,
    }: ContextBriefCardProps,
    ref
  ) => {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const COLORS = colors; // 하위 호환성을 위해 COLORS 별칭 생성

    const sentimentColor = SENTIMENT_COLORS[sentiment];
    const sentimentBg = SENTIMENT_BG_COLORS[sentiment];
    const freeTrial = isFreeTrial();
    const daysRemaining = getDaysRemaining();

    // 무료 체험 기간에는 프리미엄처럼 취급
    const effectivePremium = isPremium || freeTrial;

    // 레이어 펼침 상태 관리
    const [expandedLayers, setExpandedLayers] = useState<Record<number, boolean>>({
      1: false,
      2: false,
      3: false,
      4: false,
    });

    const toggleLayer = useCallback((layerNum: number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedLayers((prev) => ({
        ...prev,
        [layerNum]: !prev[layerNum],
      }));
    }, []);

    // 4겹 데이터 존재 여부 확인
    const has4LayerData =
      !!historicalContext || (macroChain && macroChain.length > 0);

    // ──────────────────────────────────────────────────────────────
    // 로딩 상태
    // ──────────────────────────────────────────────────────────────
    if (isLoading) {
      return (
        <View style={styles.card}>
          <View
            style={[styles.sentimentBadge, { backgroundColor: COLORS.surfaceLight }]}
          >
            <SkeletonBar width={60} />
          </View>
          <View style={styles.contentArea}>
            <View style={styles.section}>
              <SkeletonBar width={80} />
              <SkeletonBar width="90%" />
            </View>
            <View style={styles.layerSkeletonGroup}>
              <SkeletonBar width="100%" />
              <SkeletonBar width="100%" />
              <SkeletonBar width="100%" />
              <SkeletonBar width="100%" />
            </View>
          </View>
        </View>
      );
    }

    // ──────────────────────────────────────────────────────────────
    // Empty 상태 (데이터 없음)
    // ──────────────────────────────────────────────────────────────
    if (!fact && !mechanism && !impact) {
      return (
        <View style={styles.card}>
          <View style={styles.centerArea}>
            <Ionicons name="analytics-outline" size={64} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>오늘의 맥락을 준비 중이에요</Text>
            <Text style={styles.emptySubtext}>
              매일 오전 7시에 새로운 분석이 도착합니다
            </Text>
          </View>
        </View>
      );
    }

    // ──────────────────────────────────────────────────────────────
    // 데이터 상태 (4겹 레이어 브리핑)
    // ──────────────────────────────────────────────────────────────
    return (
      <View ref={ref} style={styles.card}>
        {/* 무료 체험 배너 (5/31까지) */}
        {freeTrial && (
          <View style={styles.freeTrialBanner}>
            <Ionicons name="gift-outline" size={16} color={COLORS.primary} />
            <Text style={styles.freeTrialText}>
              5월 31일까지 모든 기능 무료!
            </Text>
            <View style={styles.freeTrialCountdown}>
              <Text style={styles.freeTrialDday}>D-{daysRemaining}</Text>
            </View>
          </View>
        )}

        {/* ──────────────────────────────────────────────────── */}
        {/* 상단: 센티먼트 배지 + 날짜 */}
        {/* ──────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={[styles.sentimentBadge, { backgroundColor: sentimentBg }]}>
            <View style={[styles.sentimentDot, { backgroundColor: sentimentColor }]} />
            <Text style={[styles.sentimentLabel, { color: sentimentColor }]}>
              {sentimentLabel}
            </Text>
          </View>
          {date ? <Text style={styles.dateText}>{date}</Text> : null}
        </View>

        {/* ──────────────────────────────────────────────────── */}
        {/* 헤드라인 (FACT) */}
        {/* ──────────────────────────────────────────────────── */}
        <View style={styles.headlineSection}>
          <Text style={styles.headlineText} numberOfLines={3}>
            {fact || '시장 데이터 준비 중'}
          </Text>
          {mechanism ? (
            <Text style={styles.mechanismSummary} numberOfLines={2}>
              {mechanism}
            </Text>
          ) : null}
        </View>

        {/* ──────────────────────────────────────────────────── */}
        {/* 4겹 레이어 아코디언 */}
        {/* ──────────────────────────────────────────────────── */}
        <View style={styles.layersArea}>
          {/* Layer 1: 역사적 맥락 [무료] */}
          <LayerSection
            layerNum={1}
            icon="time-outline"
            title="역사적 맥락"
            subtitle="Historical Context"
            color={LAYER_COLORS.historical}
            isExpanded={expandedLayers[1]}
            onToggle={() => toggleLayer(1)}
            styles={styles}
            COLORS={COLORS}
          >
            <Text style={styles.layerBodyText}>
              {historicalContext || fact || '역사적 맥락 데이터를 불러오는 중입니다...'}
            </Text>
          </LayerSection>

          {/* Layer 2: 거시경제 체인 [무료] */}
          <LayerSection
            layerNum={2}
            icon="git-network-outline"
            title="거시경제 체인"
            subtitle="Macro Chain"
            color={LAYER_COLORS.macro}
            isExpanded={expandedLayers[2]}
            onToggle={() => toggleLayer(2)}
            styles={styles}
            COLORS={COLORS}
          >
            {macroChain && macroChain.length > 0 ? (
              <MacroChainVisual chain={macroChain} />
            ) : (
              <Text style={styles.layerBodyText}>
                {mechanism || '거시경제 연쇄 반응을 분석 중입니다...'}
              </Text>
            )}
          </LayerSection>

          {/* Layer 3: 기관 행동 [Premium] */}
          <LayerSection
            layerNum={3}
            icon="business-outline"
            title="기관 행동"
            subtitle="Institutional Flow"
            color={LAYER_COLORS.institutional}
            isExpanded={expandedLayers[3]}
            onToggle={() => toggleLayer(3)}
            isLocked={!effectivePremium}
            onPressPremium={onLearnMore}
            styles={styles}
            COLORS={COLORS}
          >
            <Text style={styles.layerBodyText}>
              {institutionalBehavior ||
                '기관 투자자 데이터를 분석 중입니다...'}
            </Text>
          </LayerSection>

          {/* Layer 4: 내 포트폴리오 영향 [Premium] */}
          <LayerSection
            layerNum={4}
            icon="wallet-outline"
            title="내 포트폴리오 영향"
            subtitle="My Portfolio Impact"
            color={LAYER_COLORS.portfolio}
            isExpanded={expandedLayers[4]}
            onToggle={() => toggleLayer(4)}
            isLocked={!effectivePremium}
            onPressPremium={onLearnMore}
            styles={styles}
            COLORS={COLORS}
          >
            {portfolioImpact ? (
              <PortfolioImpactVisual
                percentChange={portfolioImpact.percentChange}
                healthScoreChange={portfolioImpact.healthScoreChange}
                message={portfolioImpact.message}
              />
            ) : (
              <Text style={styles.layerBodyText}>
                {impact || '포트폴리오 영향도를 계산 중입니다...'}
              </Text>
            )}
          </LayerSection>
        </View>

        {/* ──────────────────────────────────────────────────── */}
        {/* 하단: 공유 버튼 */}
        {/* ──────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          {onShare && (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={onShare}
              activeOpacity={0.7}
            >
              <Ionicons
                name="share-social-outline"
                size={18}
                color={COLORS.textSecondary}
              />
              <Text style={styles.shareText}>공유하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);

// ============================================================================
// 스타일
// ============================================================================

const CARD_HEIGHT = SCREEN_HEIGHT * 0.75;

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  // ── 카드 전체 ──
  card: {
    height: CARD_HEIGHT,
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ── 헤더 (센티먼트 + 날짜) ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sentimentLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },

  // ── 헤드라인 ──
  headlineSection: {
    marginBottom: 4,
  },
  headlineText: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 28,
    marginBottom: 6,
  },
  mechanismSummary: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // ── 콘텐츠 영역 (로딩/빈 상태) ──
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  section: {
    gap: 8,
  },

  // ── 4겹 레이어 아코디언 ──
  layersArea: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },

  // 레이어 컨테이너
  layerContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14,
    overflow: 'hidden',
  },

  // 레이어 헤더 (탭 영역)
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  layerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  layerHeaderRight: {
    marginLeft: 8,
  },

  // 레이어 번호 배지
  layerNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 레이어 제목
  layerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  layerSubtitle: {
    fontSize: 10,
    fontWeight: '400',
    color: COLORS.textTertiary,
    lineHeight: 14,
    letterSpacing: 0.3,
  },

  // 레이어 콘텐츠 (펼쳐졌을 때)
  layerContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
    borderLeftWidth: 3,
    marginLeft: 24,
  },

  // 레이어 본문 텍스트
  layerBodyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // ── 프리미엄 잠금 ──
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.premium.gold,
    letterSpacing: 0.5,
  },
  lockedContent: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  lockedBlur: {
    opacity: 0.25,
    marginBottom: 8,
    marginLeft: 24,
  },
  lockedBlurText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  lockedCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 193, 7, 0.10)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 24,
  },
  lockedCTAText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.premium.gold,
    flex: 1,
  },
  lockedCTAPrice: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textTertiary,
  },

  // ── 거시경제 체인 시각화 ──
  chainContainer: {
    gap: 0,
  },
  chainStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chainStepText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  chainStepFirst: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chainStepLast: {
    fontWeight: '600',
    color: COLORS.sell,
  },
  chainArrowContainer: {
    alignItems: 'flex-start',
    paddingLeft: 2,
    marginVertical: -2,
  },
  chainLine: {
    width: 1,
    height: 6,
    backgroundColor: COLORS.textTertiary,
    marginLeft: 3,
  },

  // ── 포트폴리오 영향 시각화 ──
  impactContainer: {
    gap: 12,
  },
  impactMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  impactBigBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  impactBigNumber: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  impactBigLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  impactMetaColumn: {
    flex: 1,
    gap: 6,
  },
  impactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  impactMetaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  impactMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  // ── 하단 푸터 ──
  footer: {
    marginTop: 4,
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
  },
  shareText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // ── 빈 상태 ──
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },

  // ── 스켈레톤 ──
  skeletonBar: {
    height: 14,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    marginVertical: 4,
  },
  layerSkeletonGroup: {
    gap: 10,
  },

  // ── 무료 체험 배너 ──
  freeTrialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.25)',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 6,
    gap: 8,
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
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  freeTrialDday: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF', // 초록 배경 위의 흰색 텍스트 (배경이 초록색이므로 항상 흰색 유지)
  },
});
