/**
 * SkeletonLoader.tsx - 재사용 가능한 스켈레톤 로딩 컴포넌트
 *
 * 역할: "로딩 뼈대" — 데이터를 불러오는 동안 사용자에게 콘텐츠 형태의 placeholder를 보여줍니다.
 *       실제 콘텐츠가 로딩되기 전에 깜빡이는 회색 박스를 표시하여,
 *       사용자가 "화면이 멈췄나?" 하는 불안감을 줄여줍니다.
 *
 * 비유: 건물을 짓기 전에 철골 구조물(뼈대)을 먼저 세우는 것과 같습니다.
 *       데이터(건물)가 완성되기 전에 뼈대(스켈레톤)를 먼저 보여주는 역할입니다.
 *
 * 프리셋 변형:
 * - SkeletonLoader: 기본 사각형 (크기 자유)
 * - SkeletonCard: 카드 형태 (높이 120, 둥근 모서리)
 * - SkeletonText: 텍스트 줄 (높이 16, 랜덤 폭)
 * - SkeletonAvatar: 원형 프로필 (40x40)
 * - SkeletonChart: 차트 영역 (높이 200)
 *
 * 사용처:
 * - 모든 카드/리스트의 로딩 상태
 * - 맥락 카드, AI 분석, 포트폴리오 등 데이터 로딩 대기 시
 *
 * @example
 * // 기본 사용
 * <SkeletonLoader width={200} height={24} />
 *
 * // 프리셋 사용
 * <SkeletonCard />
 * <SkeletonText lines={3} />
 * <SkeletonAvatar size={48} />
 * <SkeletonChart />
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

// ──────────────────────────────────────────────
// 상수 정의
// ──────────────────────────────────────────────

/** 애니메이션 속도 — 한 방향 전환에 750ms (총 왕복 1.5초) */
const PULSE_DURATION = 750;

/** opacity 최솟값 (가장 어두울 때) */
const OPACITY_MIN = 0.3;

/** opacity 최댓값 (가장 밝을 때) */
const OPACITY_MAX = 0.7;

// ──────────────────────────────────────────────
// 기본 SkeletonLoader 컴포넌트
// ──────────────────────────────────────────────

interface SkeletonLoaderProps {
  /** 너비 — 숫자(px) 또는 DimensionValue('100%', '80%' 등) */
  width?: DimensionValue;

  /** 높이 (px) */
  height?: number;

  /** 모서리 둥글기 (px) */
  borderRadius?: number;

  /** 추가 스타일 (위치 조정 등에 사용) */
  style?: ViewStyle;
}

/**
 * SkeletonLoader — 기본 스켈레톤 블록
 *
 * 깜빡이는(opacity pulse) 회색 사각형입니다.
 * width, height, borderRadius를 자유롭게 지정할 수 있습니다.
 */
export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const { colors } = useTheme();
  // opacity 값을 관리하는 Animated 값 (0.3에서 시작)
  const opacity = useRef(new Animated.Value(OPACITY_MIN)).current;

  useEffect(() => {
    // 무한 반복 깜빡임 애니메이션: 0.3 → 0.7 → 0.3 → ...
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: OPACITY_MAX,
          duration: PULSE_DURATION,
          useNativeDriver: true, // 네이티브 드라이버로 부드러운 애니메이션
        }),
        Animated.timing(opacity, {
          toValue: OPACITY_MIN,
          duration: PULSE_DURATION,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    // 컴포넌트 언마운트 시 애니메이션 정리 (메모리 누수 방지)
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.disabled },
        {
          width,
          height,
          borderRadius,
          opacity: opacity as unknown as number, // Animated.Value 타입 호환
        },
        style,
      ]}
      // 접근성: 스크린리더에서 "로딩 중"으로 안내
      accessibilityRole="none"
      accessibilityLabel="로딩 중"
    />
  );
}

// ──────────────────────────────────────────────
// 프리셋 1: SkeletonCard — 카드 형태
// ──────────────────────────────────────────────

interface SkeletonCardProps {
  /** 카드 높이 (기본 120) */
  height?: number;

  /** 추가 스타일 */
  style?: ViewStyle;
}

/**
 * SkeletonCard — 카드 형태의 스켈레톤
 *
 * 둥근 모서리(borderRadius 16)의 큰 카드 placeholder입니다.
 * 맥락 카드, AI 분석 카드 등의 로딩 상태에 사용합니다.
 */
export function SkeletonCard({ height = 120, style }: SkeletonCardProps) {
  return (
    <SkeletonLoader
      width="100%"
      height={height}
      borderRadius={16}
      style={style}
    />
  );
}

// ──────────────────────────────────────────────
// 프리셋 2: SkeletonText — 텍스트 줄
// ──────────────────────────────────────────────

interface SkeletonTextProps {
  /** 표시할 줄 수 (기본 1) */
  lines?: number;

  /** 줄 간격 (기본 8px) */
  spacing?: number;

  /** 추가 스타일 (감싸는 View에 적용) */
  style?: ViewStyle;
}

/**
 * 텍스트 줄의 너비를 랜덤하게 결정하는 함수
 * 마지막 줄은 항상 짧게 (60~80%), 나머지는 80~100%
 */
function getTextWidth(index: number, total: number): DimensionValue {
  if (index === total - 1 && total > 1) {
    // 마지막 줄은 짧게 (실제 텍스트처럼 보이도록)
    const percent = 60 + Math.floor(Math.random() * 20); // 60~80%
    return `${percent}%`;
  }
  // 나머지 줄은 길게
  const percent = 80 + Math.floor(Math.random() * 20); // 80~100%
  return `${percent}%`;
}

/**
 * SkeletonText — 텍스트 줄 형태의 스켈레톤
 *
 * 여러 줄의 텍스트가 로딩되는 것을 표현합니다.
 * 마지막 줄은 자연스럽게 짧게 표시됩니다.
 */
export function SkeletonText({
  lines = 1,
  spacing = 8,
  style,
}: SkeletonTextProps) {
  // 컴포넌트 마운트 시 한 번만 너비를 계산 (리렌더링 시 변하지 않도록)
  const widths = useRef<DimensionValue[]>(
    Array.from({ length: lines }, (_, i) => getTextWidth(i, lines))
  ).current;

  return (
    <View style={style}>
      {widths.map((width, index) => (
        <SkeletonLoader
          key={index}
          width={width}
          height={16}
          borderRadius={4}
          style={index < lines - 1 ? { marginBottom: spacing } : undefined}
        />
      ))}
    </View>
  );
}

// ──────────────────────────────────────────────
// 프리셋 3: SkeletonAvatar — 원형 프로필
// ──────────────────────────────────────────────

interface SkeletonAvatarProps {
  /** 원의 크기 (기본 40) */
  size?: number;

  /** 추가 스타일 */
  style?: ViewStyle;
}

/**
 * SkeletonAvatar — 원형 스켈레톤
 *
 * 프로필 이미지, 아이콘 등 원형 요소의 로딩 상태에 사용합니다.
 */
export function SkeletonAvatar({ size = 40, style }: SkeletonAvatarProps) {
  return (
    <SkeletonLoader
      width={size}
      height={size}
      borderRadius={size / 2} // 원형으로 만들기 위해 반지름 = 크기/2
      style={style}
    />
  );
}

// ──────────────────────────────────────────────
// 프리셋 4: SkeletonChart — 차트 영역
// ──────────────────────────────────────────────

interface SkeletonChartProps {
  /** 차트 높이 (기본 200) */
  height?: number;

  /** 추가 스타일 */
  style?: ViewStyle;
}

/**
 * SkeletonChart — 차트 영역의 스켈레톤
 *
 * 주가 차트, 자산 추이 그래프 등의 로딩 상태에 사용합니다.
 * 둥근 모서리(12)의 넓은 영역으로 표시됩니다.
 */
export function SkeletonChart({ height = 200, style }: SkeletonChartProps) {
  return (
    <SkeletonLoader
      width="100%"
      height={height}
      borderRadius={12}
      style={style}
    />
  );
}

