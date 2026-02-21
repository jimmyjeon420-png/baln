/**
 * CreditBadge - 크레딧 잔액 배지
 * 헤더/카드에 표시. 터치 시 크레딧 충전소로 이동.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMyCredits } from '../hooks/useCredits';
import { useTheme } from '../hooks/useTheme';

interface CreditBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  onPress?: () => void; // 커스텀 핸들러 (기본: 충전소 이동)
}

export default function CreditBadge({
  size = 'medium',
  showIcon = true,
  onPress,
}: CreditBadgeProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: credits } = useMyCredits();

  const balance = credits?.balance ?? 0;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/marketplace/credits');
    }
  };

  const sizeStyles = {
    small: { paddingH: 8, paddingV: 4, fontSize: 13, iconSize: 12 },
    medium: { paddingH: 12, paddingV: 6, fontSize: 15, iconSize: 14 },
    large: { paddingH: 16, paddingV: 8, fontSize: 17, iconSize: 16 },
  }[size];

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        {
          paddingHorizontal: sizeStyles.paddingH,
          paddingVertical: sizeStyles.paddingV,
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderStrong,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {showIcon && (
        <Ionicons
          name="diamond"
          size={sizeStyles.iconSize}
          color={colors.premium.purple}
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, { fontSize: sizeStyles.fontSize, color: colors.textPrimary }]}>
        {balance.toLocaleString()}
      </Text>
      <Ionicons
        name="add-circle"
        size={sizeStyles.iconSize}
        color={colors.textTertiary}
        style={styles.addIcon}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
  },
  addIcon: {
    marginLeft: 4,
  },
});
