/**
 * CrisisBanner.tsx - 시장 위기 배너 컴포넌트
 *
 * 역할: "위기 알림 창구"
 * - 시장 위기 감지 시 홈 화면 상단에 표시
 * - 사용자를 불안하게 만들지 않고, 맥락 확인을 유도
 *   ("안심을 판다, 불안을 팔지 않는다" — 워렌 버핏)
 * - 위기 수준(moderate/severe/extreme)에 따라 색상과 아이콘이 달라짐
 * - 위에서 fade-in 애니메이션으로 자연스럽게 등장
 *
 * [사용처]
 * - app/(tabs)/index.tsx 오늘 탭 최상단
 * - useCrisisAlert 훅에서 상태 전달
 *
 * [전환 전략]
 * - moderate: 맥락 카드 강조 → "침착하게 맥락부터"
 * - severe/extreme: "기관 행동 보기" → Premium 페이월 유도
 */

import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// =============================================================================
// 타입 정의
// =============================================================================

interface CrisisBannerProps {
  /** 위기 수준: none이면 배너 미표시 */
  crisisLevel: 'none' | 'moderate' | 'severe' | 'extreme';
  /** 위기 설명 메시지 (1줄로 truncate) */
  crisisMessage: string;
  /** 주요 시장 이름 (예: "KOSPI", "S&P500") */
  primaryMarket: string | null;
  /** 주요 시장 변동률 (예: -3.5) */
  primaryChange: number | null;
  /** "맥락 확인" 버튼 탭 핸들러 → 맥락 카드로 이동 */
  onViewContext: () => void;
  /** 사용자가 Premium 구독자인지 여부 (기본값 false) */
  isPremium?: boolean;
  /** Premium 유도 문구 탭 핸들러 (severe/extreme + 비프리미엄일 때만 호출) */
  onPremiumPress?: () => void;
}

// =============================================================================
// 위기 수준별 스타일 설정
// =============================================================================

type CrisisConfig = {
  /** 배너 배경 틴트 색상 (반투명) */
  backgroundTint: string;
  /** 아이콘 + 버튼 텍스트 + 테두리 기준 색상 */
  accentColor: string;
  /** Ionicons 아이콘 이름 */
  iconName: 'alert-circle' | 'warning' | 'thunderstorm';
  /** 위기 수준 제목 (한국어) */
  levelLabel: string;
};

const CRISIS_CONFIG: Record<Exclude<CrisisBannerProps['crisisLevel'], 'none'>, CrisisConfig> = {
  moderate: {
    backgroundTint: '#FFB74D15',
    accentColor: '#FFB74D',
    iconName: 'alert-circle',
    levelLabel: '시장 변동',
  },
  severe: {
    backgroundTint: '#FF980015',
    accentColor: '#FF9800',
    iconName: 'warning',
    levelLabel: '시장 급락',
  },
  extreme: {
    backgroundTint: '#CF667915',
    accentColor: '#CF6679',
    iconName: 'thunderstorm',
    levelLabel: '시장 위기',
  },
};

// =============================================================================
// CrisisBanner 컴포넌트
// =============================================================================

function CrisisBanner({
  crisisLevel,
  crisisMessage,
  primaryMarket,
  primaryChange,
  onViewContext,
  isPremium = false,
  onPremiumPress,
}: CrisisBannerProps): React.ReactElement | null {
  const { colors } = useTheme();

  // 애니메이션 값: opacity (0 → 1) + translateY (-12 → 0)
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  // crisisLevel이 바뀔 때마다 fade-in 애니메이션 실행
  useEffect(() => {
    if (crisisLevel === 'none') {
      // 위기 없어지면 즉시 숨김 (값 초기화)
      opacity.setValue(0);
      translateY.setValue(-12);
      return;
    }

    // 시작 위치로 초기화
    opacity.setValue(0);
    translateY.setValue(-12);

    // 두 값을 동시에 애니메이션
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [crisisLevel, opacity, translateY]);

  // crisisLevel이 'none'이면 렌더링하지 않음
  if (crisisLevel === 'none') {
    return null;
  }

  const config = CRISIS_CONFIG[crisisLevel];

  // 변동률 텍스트 포맷 (예: "-3.5%")
  const changeText =
    primaryChange !== null
      ? `${primaryChange > 0 ? '+' : ''}${primaryChange.toFixed(1)}%`
      : null;

  // severe/extreme + 비프리미엄일 때 기관 행동 CTA 표시
  const showPremiumCTA =
    !isPremium && (crisisLevel === 'severe' || crisisLevel === 'extreme');

  const styles = createStyles(colors, config);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={`${config.levelLabel}: ${crisisMessage}`}
    >
      {/* ---- 메인 행: 아이콘 / 텍스트 / 버튼 ---- */}
      <View style={styles.row}>
        {/* 왼쪽: 위기 아이콘 */}
        <Ionicons
          name={config.iconName}
          size={22}
          color={config.accentColor}
          style={styles.icon}
        />

        {/* 가운데: 위기 수준 제목 + 메시지 */}
        <View style={styles.textBlock}>
          {/* Line 1: 위기 수준 제목 + 시장명/변동률 */}
          <View style={styles.titleRow}>
            <Text style={[styles.levelLabel, { color: config.accentColor }]}>
              {config.levelLabel}
            </Text>
            {/* 시장명 + 변동률 (있을 때만) */}
            {primaryMarket !== null && changeText !== null && (
              <Text style={[styles.marketInfo, { color: colors.textTertiary }]}>
                {' '}{primaryMarket} {changeText}
              </Text>
            )}
          </View>

          {/* Line 2: 위기 메시지 (1줄 truncate) */}
          <Text
            style={[styles.crisisMessage, { color: colors.textSecondary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {crisisMessage}
          </Text>
        </View>

        {/* 오른쪽: 맥락 확인 CTA 버튼 */}
        <TouchableOpacity
          onPress={onViewContext}
          style={[
            styles.ctaButton,
            {
              borderColor: config.accentColor + '50',
              backgroundColor: config.backgroundTint,
            },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="맥락 확인"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.ctaText, { color: config.accentColor }]}>
            맥락 확인
          </Text>
        </TouchableOpacity>
      </View>

      {/* ---- 하단: 안심 메시지 ---- */}
      <Text style={[styles.reassurance, { color: colors.textTertiary }]}>
        침착하게 맥락을 먼저 확인하세요
      </Text>

      {/* ---- Premium CTA: 기관 행동 레이어 (severe/extreme + 비프리미엄) ---- */}
      {showPremiumCTA && (
        <TouchableOpacity
          onPress={onPremiumPress}
          style={styles.premiumCTA}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="프리미엄 기능: 기관 행동 보기"
        >
          <Ionicons
            name="lock-closed"
            size={12}
            color={config.accentColor}
            style={styles.premiumLockIcon}
          />
          <Text style={[styles.premiumCTAText, { color: config.accentColor }]}>
            기관들은 지금 어떻게 행동하고 있을까?
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// =============================================================================
// 스타일 팩토리 (테마 + 위기 수준에 따라 동적 생성)
// =============================================================================

function createStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  config: CrisisConfig,
) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 14,
      borderWidth: 1,
      borderColor: config.accentColor + '30', // ~18% 불투명도 테두리
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: 10,
      flexShrink: 0,
    },
    textBlock: {
      flex: 1,
      marginRight: 10,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
      marginBottom: 2,
    },
    levelLabel: {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    marketInfo: {
      fontSize: 13,
      fontWeight: '500',
    },
    crisisMessage: {
      fontSize: 13,
      lineHeight: 18,
    },
    ctaButton: {
      flexShrink: 0,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    ctaText: {
      fontSize: 13,
      fontWeight: '600',
    },
    reassurance: {
      fontSize: 12,
      marginTop: 8,
      // 아이콘 너비(22px) + 오른쪽 마진(10px)에 맞춰 들여쓰기
      marginLeft: 32,
    },
    premiumCTA: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      marginLeft: 32,
      alignSelf: 'flex-start',
    },
    premiumLockIcon: {
      marginRight: 4,
    },
    premiumCTAText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });
}

// React.memo로 불필요한 리렌더링 방지
// (crisisLevel, crisisMessage, primaryMarket, primaryChange, onViewContext가 같으면 리렌더 스킵)
export default memo(CrisisBanner);
