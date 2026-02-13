// ============================================================================
// 온보딩 레이아웃
// 헤더 숨김 처리 (전체 화면 온보딩)
// ============================================================================

import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
