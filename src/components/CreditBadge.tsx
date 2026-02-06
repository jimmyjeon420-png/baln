/**
 * CreditBadge - 크레딧 잔액 배지
 * 헤더/카드에 표시. 터치 시 크레딧 충전소로 이동.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMyCredits } from '../hooks/useCredits';

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
    small: { paddingH: 8, paddingV: 4, fontSize: 12, iconSize: 12 },
    medium: { paddingH: 12, paddingV: 6, fontSize: 14, iconSize: 14 },
    large: { paddingH: 16, paddingV: 8, fontSize: 16, iconSize: 16 },
  }[size];

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        {
          paddingHorizontal: sizeStyles.paddingH,
          paddingVertical: sizeStyles.paddingV,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {showIcon && (
        <Ionicons
          name="diamond"
          size={sizeStyles.iconSize}
          color="#7C4DFF"
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, { fontSize: sizeStyles.fontSize }]}>
        {balance.toLocaleString()}
      </Text>
      <Ionicons
        name="add-circle"
        size={sizeStyles.iconSize}
        color="#666"
        style={styles.addIcon}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addIcon: {
    marginLeft: 4,
  },
});
