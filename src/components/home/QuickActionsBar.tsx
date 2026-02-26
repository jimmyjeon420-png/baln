import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SIZES } from '../../styles/theme';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입 정의
// ============================================================================

interface QuickActionsBarProps {
  onAddAsset: () => void;
  onRealEstate: () => void;
  onPrediction: () => void;
}

// 퀵 액션 아이콘 (라벨은 i18n)
const ACTION_ICONS = [
  { key: 'add', icon: '📸' },
  { key: 'realestate', icon: '🏠' },
  { key: 'prediction', icon: '🎮' },
] as const;

// ============================================================================
// QuickActionsBar — 퀵 액션 바 (안내 데스크 바로가기 역할)
// ============================================================================

const QuickActionsBar = ({
  onAddAsset,
  onRealEstate,
  onPrediction,
}: QuickActionsBarProps) => {
  const haptics = useHaptics();
  const { colors } = useTheme();
  const { t } = useLocale();

  const handlers: Record<string, () => void> = {
    add: onAddAsset,
    realestate: onRealEstate,
    prediction: onPrediction,
  };

  const actionLabels: Record<string, string> = {
    add: t('quick_actions.add_asset'),
    realestate: t('quick_actions.real_estate'),
    prediction: t('quick_actions.prediction_game'),
  };

  return (
    <View style={styles.container}>
      {ACTION_ICONS.map((action) => (
        <TouchableOpacity
          key={action.key}
          style={styles.button}
          onPress={() => {
            haptics.lightTap();
            handlers[action.key]();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceLight }]}>
            <Text style={styles.iconText}>{action.icon}</Text>
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{actionLabels[action.key]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================================
// React.memo 최적화: 콜백 함수 참조 비교 (부모에서 useCallback으로 메모이제이션 필요)
// ============================================================================

export default React.memo(QuickActionsBar, (prev, next) => {
  // 세 콜백 함수의 참조가 모두 같으면 리렌더링 방지
  return (
    prev.onAddAsset === next.onAddAsset &&
    prev.onRealEstate === next.onRealEstate &&
    prev.onPrediction === next.onPrediction
  );
});

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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconText: {
    fontSize: 23,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
