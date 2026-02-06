/**
 * Marketplace Layout - AI 프리미엄 마켓플레이스 네비게이션
 * Stack 네비게이터로 메인/딥다이브/What-If/세금/AI CFO/충전소 관리
 */

import { Stack } from 'expo-router';

export default function MarketplaceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="deep-dive" />
      <Stack.Screen name="what-if" />
      <Stack.Screen name="tax-report" />
      <Stack.Screen name="ai-cfo-chat" />
      <Stack.Screen
        name="credits"
        options={{ presentation: 'modal' }}
      />
    </Stack>
  );
}
