import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SIZES } from '../../styles/theme';
import { useHaptics } from '../../hooks/useHaptics';

// ============================================================================
// 타입 정의
// ============================================================================

interface QuickActionsBarProps {
  onAddAsset: () => void;
  onRealEstate: () => void;
  onPrediction: () => void;
}

// 퀵 액션 설정
const ACTIONS = [
  { key: 'add', icon: '📸', label: '자산추가' },
  { key: 'realestate', icon: '🏠', label: '부동산' },
  { key: 'prediction', icon: '🎮', label: '예측게임' },
] as const;

// ============================================================================
// QuickActionsBar — 퀵 액션 바 (안내 데스크 바로가기 역할)
// ============================================================================

export default function QuickActionsBar({
  onAddAsset,
  onRealEstate,
  onPrediction,
}: QuickActionsBarProps) {
  const haptics = useHaptics();

  const handlers: Record<string, () => void> = {
    add: onAddAsset,
    realestate: onRealEstate,
    prediction: onPrediction,
  };

  return (
    <View style={styles.container}>
      {ACTIONS.map((action) => (
        <TouchableOpacity
          key={action.key}
          style={styles.button}
          onPress={() => {
            haptics.lightTap();
            handlers[action.key]();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>{action.icon}</Text>
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: SIZES.lg,
  },
  button: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconText: {
    fontSize: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
