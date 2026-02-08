// ============================================================================
// 온보딩 레이아웃
// 헤더 숨김 처리 (전체 화면 온보딩)
// ============================================================================

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#121212' },
      }}
    />
  );
}
