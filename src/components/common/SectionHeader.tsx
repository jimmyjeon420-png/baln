import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { COLORS, SIZES, TYPOGRAPHY } from '../../styles/theme';

/**
 * 섹션 제목 공통 컴포넌트
 * 앱 전체에서 일관된 섹션 헤더 스타일을 제공합니다.
 *
 * @example
 * <SectionHeader
 *   title="오늘의 예측"
 *   emoji="🎯"
 *   actionLabel="전체 보기"
 *   onAction={() => router.push('/games/predictions')}
 * />
 */

interface SectionHeaderProps {
  /** 섹션 제목 (예: "오늘의 예측") */
  title: string;
  /** 제목 앞 이모지 (선택 사항) */
  emoji?: string;
  /** 우측 액션 버튼 텍스트 (선택 사항, 예: "전체 보기") */
  actionLabel?: string;
  /** 액션 버튼 클릭 핸들러 */
  onAction?: () => void;
  /** 추가 스타일 (선택 사항) */
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  emoji,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* 좌측: 이모지 + 제목 */}
      <View style={styles.leftSection}>
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* 우측: 액션 버튼 (있을 경우) */}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.actionLabel}>{actionLabel} →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  emoji: {
    fontSize: SIZES.fLg,
  },
  title: {
    ...TYPOGRAPHY.headingSmall,
    color: COLORS.textPrimary,
  },
  actionLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
