import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, TYPOGRAPHY } from '../../styles/theme';

/**
 * 상태 배지 공통 컴포넌트
 * 앱 전체에서 일관된 상태 표시를 위한 배지입니다.
 *
 * @example
 * <StatusBadge type="success" label="적중!" />
 * <StatusBadge type="warning" label="주의" />
 * <StatusBadge type="premium" label="Premium" />
 */

export type BadgeType = 'success' | 'warning' | 'error' | 'info' | 'premium';

interface StatusBadgeProps {
  /** 배지 타입 (색상 결정) */
  type: BadgeType;
  /** 배지 텍스트 (예: "적중!", "주의", "Premium") */
  label: string;
  /** 추가 스타일 (선택 사항) */
  style?: any;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, label, style }) => {
  // 타입별 색상 결정
  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          background: COLORS.success + '20', // 20% 투명도
          text: COLORS.success,
          border: COLORS.success,
        };
      case 'warning':
        return {
          background: COLORS.warning + '20',
          text: COLORS.warning,
          border: COLORS.warning,
        };
      case 'error':
        return {
          background: COLORS.error + '20',
          text: COLORS.error,
          border: COLORS.error,
        };
      case 'info':
        return {
          background: COLORS.info + '20',
          text: COLORS.info,
          border: COLORS.info,
        };
      case 'premium':
        return {
          background: COLORS.premium.gold + '20',
          text: COLORS.premium.gold,
          border: COLORS.premium.gold,
        };
      default:
        return {
          background: COLORS.neutral + '20',
          text: COLORS.neutral,
          border: COLORS.neutral,
        };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.rSm,
    borderWidth: 1,
    alignSelf: 'flex-start', // 텍스트 길이만큼만 차지
  },
  label: {
    ...TYPOGRAPHY.labelSmall,
    fontSize: SIZES.fTiny,
    fontWeight: '700',
  },
});
