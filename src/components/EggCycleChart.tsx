/**
 * Kostolany의 The Egg 시각화 컴포넌트
 * 6단계 사이클을 원형으로 표현하고 현재 위치 표시
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { EggPhase, EggCycleAnalysis } from '../types/kostolany';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../styles/theme';
import { EGG_CYCLE_PHASES } from '../constants/eggCycleData';

interface EggCycleChartProps {
  analysis: EggCycleAnalysis;
  size?: number;
  showLabels?: boolean;
  containerStyle?: ViewStyle;
}

const EggCycleChart: React.FC<EggCycleChartProps> = ({
  analysis,
  size = 280,
  showLabels = true,
  containerStyle,
}) => {
  const phases = Object.values(EggPhase);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 3;

  /**
   * 원 위의 위치 계산
   * @param index 0-5 (6개 단계)
   * @returns { x, y } 좌표
   */
  const getPhasePosition = (index: number) => {
    const angle = (index * 360) / 6 - 90; // 12시부터 시작
    const radian = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(radian),
      y: centerY + radius * Math.sin(radian),
    };
  };

  /**
   * 라벨 위치 (더 바깥쪽)
   */
  const getLabelPosition = (index: number) => {
    const angle = (index * 360) / 6 - 90;
    const radian = (angle * Math.PI) / 180;
    const labelRadius = radius + 50;
    return {
      x: centerX + labelRadius * Math.cos(radian),
      y: centerY + labelRadius * Math.sin(radian),
    };
  };

  /**
   * 중앙 텍스트 (현재 액션)
   */
  const renderCenter = () => {
    return (
      <View
        style={[
          styles.centerCircle,
          {
            width: radius * 1.5,
            height: radius * 1.5,
            backgroundColor: COLORS.surface,
            borderColor: COLORS.border,
            borderWidth: 2,
          },
        ]}
      >
        <Text
          style={[
            TYPOGRAPHY.bodySmall,
            { color: COLORS.textPrimary, textAlign: 'center' },
          ]}
        >
          📍 현재
        </Text>
        <Text
          style={[
            TYPOGRAPHY.labelLarge,
            { color: COLORS.primary, marginTop: SIZES.xs },
          ]}
        >
          {analysis.actionKorean}
        </Text>
        <Text
          style={[
            TYPOGRAPHY.bodySmall,
            { color: COLORS.textSecondary, marginTop: SIZES.xs },
          ]}
        >
          신뢰도: {analysis.confidence}%
        </Text>
      </View>
    );
  };

  /**
   * 개별 단계 박스
   */
  const renderPhaseBox = (index: number) => {
    const phase = phases[index];
    const phaseInfo = EGG_CYCLE_PHASES[phase];
    const isActive = analysis.currentPhase === phase;
    const position = getPhasePosition(index);

    return (
      <View
        key={phase}
        style={[
          styles.phaseBox,
          {
            left: position.x - 30,
            top: position.y - 30,
            backgroundColor: isActive ? phaseInfo.color : COLORS.surfaceLight,
            borderColor: isActive ? phaseInfo.color : COLORS.border,
            borderWidth: isActive ? 3 : 1,
            opacity: isActive ? 1 : 0.6,
          },
        ]}
      >
        <Text
          style={[
            TYPOGRAPHY.labelSmall,
            {
              color: isActive ? '#FFFFFF' : COLORS.textSecondary,
              fontWeight: isActive ? '700' : '600',
            },
          ]}
        >
          {phaseInfo.emoji} {phase.split('_')[0]}
        </Text>
      </View>
    );
  };

  /**
   * 라벨 텍스트
   */
  const renderLabel = (index: number) => {
    const phase = phases[index];
    const phaseInfo = EGG_CYCLE_PHASES[phase];
    const position = getLabelPosition(index);
    const isActive = analysis.currentPhase === phase;

    return (
      <View
        key={`label-${phase}`}
        style={[
          styles.labelContainer,
          {
            left: position.x - 35,
            top: position.y - 20,
          },
        ]}
      >
        <Text
          style={[
            TYPOGRAPHY.bodySmall,
            {
              color: isActive ? COLORS.primary : COLORS.textTertiary,
              fontWeight: isActive ? '700' : '400',
              textAlign: 'center',
              maxWidth: 70,
            },
          ]}
        >
          {phaseInfo.titleKorean}
        </Text>
      </View>
    );
  };

  /**
   * 원형 테두리 (참고용)
   */
  const renderCircleBorder = () => {
    return (
      <View
        style={[
          styles.circleBorder,
          {
            width: radius * 2,
            height: radius * 2,
            borderColor: COLORS.border,
            borderWidth: 1,
            borderRadius: radius,
            position: 'absolute',
            left: centerX - radius,
            top: centerY - radius,
          },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 제목 */}
      <Text style={[TYPOGRAPHY.headingMedium, { color: COLORS.textPrimary, marginBottom: SIZES.lg }]}>
        Kostolany's Egg 🥚
      </Text>

      {/* 차트 영역 */}
      <View
        style={[
          styles.chartContainer,
          {
            width: size,
            height: size,
            backgroundColor: COLORS.background,
            borderColor: COLORS.border,
            borderWidth: 1,
            borderRadius: SIZES.rMd,
          },
        ]}
      >
        {/* 원형 보조선 */}
        {renderCircleBorder()}

        {/* 6개 단계 박스 */}
        {phases.map((_, index) => renderPhaseBox(index))}

        {/* 중앙 액션 표시 */}
        <View
          style={[
            styles.centerContainer,
            {
              width: size,
              height: size,
            },
          ]}
        >
          {renderCenter()}
        </View>

        {/* 단계 라벨 */}
        {showLabels && phases.map((_, index) => renderLabel(index))}
      </View>

      {/* 단계 설명 */}
      <View style={[styles.infoBox, { backgroundColor: COLORS.surfaceLight, marginTop: SIZES.lg }]}>
        <Text style={[TYPOGRAPHY.labelMedium, { color: COLORS.textPrimary }]}>
          {EGG_CYCLE_PHASES[analysis.currentPhase].titleKorean}
        </Text>
        <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textSecondary, marginTop: SIZES.sm }]}>
          {analysis.description}
        </Text>
      </View>

      {/* 다음 단계 힌트 */}
      <View
        style={[
          styles.nextPhaseBox,
          {
            backgroundColor: COLORS.surfaceLight,
            borderColor: COLORS.borderLight,
            borderWidth: 1,
            marginTop: SIZES.md,
          },
        ]}
      >
        <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textTertiary }]}>
          다음 예상: {EGG_CYCLE_PHASES[analysis.nextPhase].titleKorean} (
          {EGG_CYCLE_PHASES[analysis.nextPhase].emoji})
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: SIZES.lg,
  },
  chartContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseBox: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: SIZES.rMd,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xs,
    ...SHADOWS.small,
  },
  labelContainer: {
    position: 'absolute',
    width: 70,
  },
  circleBorder: {
    position: 'absolute',
  },
  centerContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.rMd,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
  },
  infoBox: {
    width: '100%',
    borderRadius: SIZES.rMd,
    padding: SIZES.md,
    marginVertical: SIZES.md,
  },
  nextPhaseBox: {
    width: '100%',
    borderRadius: SIZES.rMd,
    padding: SIZES.md,
  },
});

export default EggCycleChart;
