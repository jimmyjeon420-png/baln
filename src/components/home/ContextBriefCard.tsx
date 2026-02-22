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

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useTrackEvent } from '../../hooks/useAnalytics';
import { useHabitLoopTracking } from '../../hooks/useHabitLoopTracking';
import type { ThemeColors } from '../../styles/colors';

// Android LayoutAnimation 활성화
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


// ============================================================================
// 무료 체험 기간 상수
// ============================================================================

/** 무료 체험 종료일 (5월 31일) */
const FREE_TRIAL_END = new Date('2026-05-31T23:59:59');

/** 무료 체험 기간 중인지 확인 */
function isFreeTrial(): boolean {
  return new Date() <= FREE_TRIAL_END;
}

/** 수요일 전체 공개일 (Full Context Day) 확인 */
function isFullContextDay(): boolean {
  return new Date().getDay() === 3; // 0=일, 3=수
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
  political: '#7E57C2',      // 보라 - 정치 맥락
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

  /** Layer 3: 정치 맥락 [무료] */
  politicalContext?: string | null;

  /** Layer 4: 기관 행동 [Premium] */
  institutionalBehavior?: string | null;

  /** Layer 5: 포트폴리오 영향 [Premium] */
  portfolioImpact?: {
    percentChange: number;
    healthScoreChange: number;
    message: string;
    isCalculating?: boolean;
  } | null;

  /** 업데이트 시점 라벨 (예: "오전 6:03 업데이트") */
  updateTimeLabel?: string | null;

  /** 데이터 출처 라벨 */
  dataSource?: string | null;

  /** 데이터 생성 시점 (ISO) */
  dataTimestamp?: string | null;

  /** 신뢰도 메모 */
  confidenceNote?: string | null;

  /** 신뢰도 점수 (추정) */
  confidenceScore?: number | null;

  /** 데이터 신선도 라벨 */
  freshnessLabel?: string | null;
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

function formatTrustTime(timestamp?: string | null): string {
  if (!timestamp) return '시간 미표기';
  const dt = new Date(timestamp);
  if (Number.isNaN(dt.getTime())) return '시간 미표기';
  return dt.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function simplifySourceLabel(source?: string | null): string {
  if (!source) return 'baln 분석 엔진';
  if (source.includes('fallback') || source.includes('폴백')) return '표준 맥락 폴백';
  if (source.includes('Google')) return 'baln + Google Search';
  return source;
}

// ============================================================================
// 스켈레톤 로더 컴포넌트
// ============================================================================

function SkeletonBar({ width }: { width: number | `${number}%` }) {
  const { colors } = useTheme();
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
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
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

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
        accessibilityLabel={
          isLocked
            ? `${title} 레이어 — 프리미엄 잠금`
            : `${title} 레이어 ${isExpanded ? '접기' : '펼치기'}`
        }
        accessibilityRole="button"
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
          accessibilityLabel={`${title} 프리미엄 구독으로 잠금 해제`}
          accessibilityRole="button"
        >
          <View style={styles.lockedBlur}>
            <Text style={styles.lockedBlurText}>
              {layerNum === 4
                ? '기관 투자자의 움직임과 의미를...'
                : '당신의 포트폴리오에 미치는 영향을...'}
            </Text>
          </View>
          <View style={styles.lockedCTA}>
            <Ionicons name="star" size={14} color={COLORS.premium.gold} />
            <Text style={styles.lockedCTAText}>Premium으로 전체 보기</Text>
            <Text style={styles.lockedCTAPrice}>월 4,900</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// 거시경제 체인 시각화 서브 컴포넌트
// ============================================================================

/**
 * 포트폴리오 영향도에 따른 마지막 노드 색상을 반환합니다.
 * - 양수(상승): 초록 (#4CAF50)
 * - 소폭 하락(-3% 미만): 노랑/앰버 (#FFC107)
 * - 큰 하락(-3% 이상): 빨강 (#FF5252)
 * - 데이터 없음/무시 가능: 회색 (#888888)
 */
function getLastNodeColor(percentChange: number | undefined | null): string {
  if (percentChange == null) return '#888888';
  if (percentChange >= 0) return '#4CAF50';
  if (percentChange > -3) return '#E6A700'; // 라이트 모드에서도 대비 확보 (was #FFC107)
  return '#FF5252';
}

const MacroChainVisual = React.memo(function MacroChainVisual({
  chain,
  portfolioPercentChange,
}: {
  chain: string[];
  portfolioPercentChange?: number | null;
}) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  if (!chain || chain.length === 0) return null;

  const lastNodeColor = getLastNodeColor(portfolioPercentChange);

  return (
    <View style={styles.chainContainer} accessibilityLabel="거시경제 연쇄 반응 차트">
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
                        ? lastNodeColor
                        : colors.textTertiary,
                },
              ]}
            />
            <Text
              style={[
                styles.chainStepText,
                index === 0 && styles.chainStepFirst,
                index === chain.length - 1 && {
                  fontWeight: '600' as const,
                  color: lastNodeColor,
                },
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
});

// ============================================================================
// 포트폴리오 영향 시각화 서브 컴포넌트
// ============================================================================

const PortfolioImpactVisual = React.memo(function PortfolioImpactVisual({
  percentChange,
  healthScoreChange,
  message,
  isCalculating,
}: {
  percentChange: number;
  healthScoreChange: number;
  message: string;
  isCalculating?: boolean;
}) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [timedOut, setTimedOut] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // 30초 타임아웃: isCalculating이 true인 채 30초 지나면 폴백 표시
  React.useEffect(() => {
    if (isCalculating) {
      setTimedOut(false);
      timeoutRef.current = setTimeout(() => setTimedOut(true), 30_000);
    } else {
      setTimedOut(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isCalculating]);

  // 계산 중 + 타임아웃 → 폴백 메시지
  if (isCalculating && timedOut) {
    return (
      <View style={styles.impactContainer}>
        <Ionicons name="time-outline" size={28} color="#FF9800" />
        <Text style={[styles.impactMessage, { textAlign: 'center', marginTop: 8 }]}>
          영향도 데이터를 가져올 수 없습니다.{'\n'}내일 아침 다시 확인해주세요.
        </Text>
      </View>
    );
  }

  // 계산 중 (타임아웃 전) → 로딩
  if (isCalculating) {
    return (
      <View style={[styles.impactContainer, { alignItems: 'center', paddingVertical: 16 }]}>
        <Text style={styles.impactMessage}>영향도 계산 중...</Text>
      </View>
    );
  }

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
});

// ============================================================================
// 헤드라인 섹션 서브 컴포넌트 (메커니즘 펼치기/접기)
// ============================================================================

function HeadlineSection({
  fact,
  mechanism,
  styles,
}: {
  fact: string | null;
  mechanism: string | null;
  styles: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const measuredRef = useRef(false);

  // onTextLayout으로 잘린 텍스트의 실제 줄 수를 측정하면 numberOfLines에 의해
  // 이미 클램프된 줄 수만 보고하므로 정확하지 않음.
  // 대신: 숨겨진 Text로 실제 줄 수를 측정한 뒤 2줄 초과 시 버튼을 표시함.
  const handleMeasureLayout = useCallback((e: any) => {
    if (measuredRef.current) return;
    if (e.nativeEvent.lines && e.nativeEvent.lines.length > 2) {
      measuredRef.current = true;
      setNeedsExpand(true);
    }
  }, []);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  return (
    <View style={styles.headlineSection} accessibilityLabel="오늘의 시장 헤드라인" accessibilityRole="header">
      <Text style={styles.headlineText}>{fact || '시장 데이터 준비 중'}</Text>
      {mechanism ? (
        <View>
          {/* 숨겨진 측정 텍스트: numberOfLines 없이 렌더링하여 실제 줄 수를 측정 */}
          {!needsExpand && (
            <Text
              style={[styles.mechanismSummary, { position: 'absolute', opacity: 0 }]}
              onTextLayout={handleMeasureLayout}
            >
              {mechanism}
            </Text>
          )}
          <Text
            style={styles.mechanismSummary}
            numberOfLines={expanded ? undefined : 2}
          >
            {mechanism}
          </Text>
          {needsExpand && (
            <TouchableOpacity
              onPress={toggle}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.expandToggleButton}
            >
              <Text style={styles.expandToggle}>
                {expanded ? '접기' : '더보기'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
      politicalContext,
      institutionalBehavior,
      portfolioImpact,
      updateTimeLabel,
      dataSource,
      dataTimestamp,
      confidenceNote,
      confidenceScore,
      freshnessLabel,
    }: ContextBriefCardProps,
    ref
  ) => {
    const { colors } = useTheme();
    const track = useTrackEvent();
    const { trackStep } = useHabitLoopTracking();
    const hasTrackedRead = useRef(false);
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const COLORS = colors; // 하위 호환성을 위해 COLORS 별칭 생성

    const sentimentColor = SENTIMENT_COLORS[sentiment];
    const sentimentBg = SENTIMENT_BG_COLORS[sentiment];
    const freeTrial = isFreeTrial();
    const daysRemaining = getDaysRemaining();

    // 맥락 카드 데이터가 로드되면 context_card_read 이벤트 기록 (1회만)
    useEffect(() => {
      if (!isLoading && fact && !hasTrackedRead.current) {
        hasTrackedRead.current = true;
        track('context_card_read', { sentiment, date });
        trackStep('context_card_read');
      }
    }, [isLoading, fact, sentiment, date, track, trackStep]);

    // 무료 체험 기간에는 프리미엄처럼 취급
    const effectivePremium = isPremium || freeTrial;

    // 싱글 아코디언: 하나만 열림 (null = 모두 접힘)
    const [expandedLayer, setExpandedLayer] = useState<number | null>(null);

    const toggleLayer = useCallback((layerNum: number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedLayer((prev) => {
        const isExpanding = prev !== layerNum;
        if (isExpanding) {
          const layerNames = ['', 'historical', 'macro', 'political', 'institutional', 'portfolio'];
          track('context_layer_expanded', { layer: layerNum, name: layerNames[layerNum] });
        }
        return prev === layerNum ? null : layerNum;
      });
    }, [track]);

    // 하위호환: LayerSection에서 사용하는 boolean 변환
    const expandedLayers: Record<number, boolean> = {
      1: expandedLayer === 1,
      2: expandedLayer === 2,
      3: expandedLayer === 3,
      4: expandedLayer === 4,
      5: expandedLayer === 5,
    };

    // 4겹 데이터 존재 여부 확인
    const has4LayerData =
      !!historicalContext || (macroChain && macroChain.length > 0);

    // ──────────────────────────────────────────────────────────────
    // 로딩 상태
    // ──────────────────────────────────────────────────────────────
    if (isLoading) {
      return (
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View
              style={[styles.sentimentBadge, { backgroundColor: COLORS.surfaceLight }]}
            >
              <SkeletonBar width={60} />
            </View>
            <Text style={styles.cardLogo}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
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
          <View style={styles.topRow}>
            <View />
            <Text style={styles.cardLogo}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
          </View>
          <View style={styles.centerArea}>
            <Ionicons name="analytics-outline" size={64} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>오늘의 맥락을 분석하고 있어요</Text>
            <Text style={styles.emptySubtext}>
              새로운 분석을 준비하고 있어요
            </Text>
          </View>
        </View>
      );
    }

    // ──────────────────────────────────────────────────────────────
    // 데이터 상태 (4겹 레이어 브리핑)
    // ──────────────────────────────────────────────────────────────
    return (
      <View ref={ref} style={styles.card} accessibilityLabel="오늘의 맥락 브리핑 카드">
        {/* ── 헤더: 센티먼트 + 무료체험 D-day + 공유 + baln ── */}
        <View style={styles.headerRow}>
          <View style={[styles.sentimentBadge, { backgroundColor: sentimentBg }]}>
            <View style={[styles.sentimentDot, { backgroundColor: sentimentColor }]} />
            <Text style={[styles.sentimentLabel, { color: sentimentColor }]}>
              {sentimentLabel}
            </Text>
            {freeTrial && (
              <View style={styles.freeTrialInline}>
                <Text style={styles.freeTrialInlineText}>D-{daysRemaining}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRightGroup}>
            {updateTimeLabel && (
              <View style={styles.updateTimeBadge}>
                <Ionicons name="time-outline" size={12} color={COLORS.textTertiary} />
                <Text style={styles.updateTimeText}>{updateTimeLabel}</Text>
              </View>
            )}
            {onShare && (
              <TouchableOpacity
                onPress={() => { track('share_card', { source: 'context_brief' }); onShare(); }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="맥락 카드 공유하기"
                accessibilityRole="button"
              >
                <Ionicons name="share-social-outline" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
            <Text style={styles.cardLogo}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
          </View>
        </View>

        <View style={styles.trustMetaRow}>
          <Text style={styles.trustMetaText}>출처: {simplifySourceLabel(dataSource)}</Text>
          <Text style={styles.trustMetaText}>생성: {formatTrustTime(dataTimestamp)}</Text>
          {freshnessLabel && <Text style={styles.trustMetaText}>신선도: {freshnessLabel}</Text>}
          {typeof confidenceScore === 'number' && (
            <Text style={styles.trustMetaText}>신뢰도: {confidenceScore}점(추정)</Text>
          )}
          {!!confidenceNote && (
            <Text style={styles.trustMetaNote} numberOfLines={1}>
              {confidenceNote}
            </Text>
          )}
        </View>

        {/* ── 헤드라인 ── */}
        <HeadlineSection
          fact={fact}
          mechanism={mechanism}
          styles={styles}
        />

        {/* ── 4겹 레이어 (스크롤 가능) ── */}
        <ScrollView
          style={styles.layersScroll}
          contentContainerStyle={styles.layersContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
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
              <MacroChainVisual
                chain={macroChain}
                portfolioPercentChange={portfolioImpact?.percentChange}
              />
            ) : (
              <Text style={styles.layerBodyText}>
                {mechanism || '거시경제 연쇄 반응을 분석 중입니다...'}
              </Text>
            )}
          </LayerSection>

          <LayerSection
            layerNum={3}
            icon="flag-outline"
            title="정치 맥락"
            subtitle="Political Context"
            color={LAYER_COLORS.political}
            isExpanded={expandedLayers[3]}
            onToggle={() => toggleLayer(3)}
            styles={styles}
            COLORS={COLORS}
          >
            <Text style={styles.layerBodyText}>
              {politicalContext || '역사적으로 정치 이벤트는 단기 시장 변동을 만들었지만, 장기 투자 관점에서 영향은 제한적이었습니다.'}
            </Text>
          </LayerSection>

          <LayerSection
            layerNum={4}
            icon="business-outline"
            title="기관 행동"
            subtitle="Institutional Flow"
            color={LAYER_COLORS.institutional}
            isExpanded={expandedLayers[4]}
            onToggle={() => toggleLayer(4)}
            isLocked={!effectivePremium}
            onPressPremium={onLearnMore}
            styles={styles}
            COLORS={COLORS}
          >
            <Text style={styles.layerBodyText}>
              {institutionalBehavior || '기관 투자자 데이터를 분석 중입니다...'}
            </Text>
          </LayerSection>

          <LayerSection
            layerNum={5}
            icon="wallet-outline"
            title="내 포트폴리오 영향"
            subtitle="Portfolio Impact"
            color={LAYER_COLORS.portfolio}
            isExpanded={expandedLayers[5]}
            onToggle={() => toggleLayer(5)}
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
                isCalculating={portfolioImpact.isCalculating}
              />
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 8, gap: 6 }}>
                <Ionicons name="analytics-outline" size={24} color={LAYER_COLORS.portfolio} />
                <Text style={[styles.layerBodyText, { textAlign: 'center' }]}>
                  {sentiment === 'calm'
                    ? '시장이 안정적입니다. 포트폴리오에 큰 변동이 없을 것으로 보입니다.'
                    : sentiment === 'caution'
                      ? '시장에 주의 신호가 있습니다. 포트폴리오 점검을 권장합니다.'
                      : '시장이 경계 상태입니다. 포트폴리오 점검이 필요합니다.'}
                </Text>
              </View>
            )}
          </LayerSection>
        </ScrollView>

      </View>
    );
  }
);

// ============================================================================
// 스타일
// ============================================================================

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  // ── 카드 전체 ──
  card: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ── 로딩/빈 상태용 상단 행 ──
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLogo: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },

  // ── 헤더 (센티먼트 + 공유 + baln) ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
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
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  freeTrialInline: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 1,
    paddingHorizontal: 6,
    marginLeft: 2,
  },
  freeTrialInlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  updateTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  updateTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textTertiary,
  },
  trustMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  trustMetaText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trustMetaNote: {
    fontSize: 11,
    color: COLORS.textQuaternary,
    maxWidth: '100%',
  },

  // ── 헤드라인 ──
  headlineSection: {
    marginBottom: 8,
  },
  headlineText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 25,
    marginBottom: 4,
  },
  mechanismSummary: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  expandToggleButton: {
    paddingVertical: 6,
  },
  expandToggle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
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

  // ── 4겹 레이어 (스크롤 가능) ──
  layersScroll: {
    flex: 1,
  },
  layersContent: {
    gap: 6,
    paddingBottom: 8,
  },

  // 레이어 컨테이너
  layerContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // 레이어 헤더 (탭 영역)
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 44,
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
    width: 20,
    height: 20,
    borderRadius: 10,
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
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textTertiary,
    lineHeight: 15,
    letterSpacing: 0.3,
  },

  // 레이어 콘텐츠 (펼쳐졌을 때)
  layerContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 0,
    borderLeftWidth: 3,
    marginLeft: 22,
  },

  // 레이어 본문 텍스트
  layerBodyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
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
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.premium.gold,
    letterSpacing: 0.5,
  },
  lockedContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  lockedBlur: {
    opacity: 0.25,
    marginBottom: 6,
    marginLeft: 22,
  },
  lockedBlurText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  lockedCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 193, 7, 0.10)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginLeft: 22,
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
    gap: 8,
  },
  chainDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chainStepText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 19,
    flex: 1,
  },
  chainStepFirst: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // chainStepLast: 동적 색상으로 대체됨 (getLastNodeColor 함수 참조)
  chainArrowContainer: {
    alignItems: 'flex-start',
    paddingLeft: 1,
    marginVertical: -3,
  },
  chainLine: {
    width: 1,
    height: 4,
    backgroundColor: COLORS.textTertiary,
    marginLeft: 3,
  },

  // ── 포트폴리오 영향 시각화 ──
  impactContainer: {
    gap: 10,
  },
  impactMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  impactBigBox: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 90,
  },
  impactBigNumber: {
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 27,
  },
  impactBigLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 1,
    fontWeight: '500',
  },
  impactMetaColumn: {
    flex: 1,
    gap: 4,
  },
  impactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  impactMetaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  impactMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  // ── 빈 상태 ──
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 17,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  swipeHint: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.5,
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

  // ── 무료 체험 배너 (레거시, 로딩 상태용) ──
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
    fontSize: 14,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
