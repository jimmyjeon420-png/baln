/**
 * Gatherings Layout - 모임 관련 화면 레이아웃
 */

import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function GatheringsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
