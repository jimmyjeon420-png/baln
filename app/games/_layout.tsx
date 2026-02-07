/**
 * games/_layout.tsx - 게임 라우트 레이아웃
 * Stack 네비게이션 (슬라이드 전환)
 */

import { Stack } from 'expo-router';

export default function GamesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
