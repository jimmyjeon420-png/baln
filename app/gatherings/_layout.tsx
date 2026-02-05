/**
 * Gatherings Layout - 모임 관련 화면 레이아웃
 */

import { Stack } from 'expo-router';

export default function GatheringsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#121212' },
        animation: 'slide_from_right',
      }}
    />
  );
}
