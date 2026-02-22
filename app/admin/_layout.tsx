import React from 'react';
import { Stack } from 'expo-router';

/**
 * 관리자 영역 전용 스택 레이아웃
 *
 * admin 폴더 하위 라우트(/admin/dashboard 등)를 명시적으로 묶어서
 * 카드 탭 내비게이션이 환경별로 흔들리지 않도록 고정합니다.
 */
export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="users" options={{ headerShown: false }} />
      <Stack.Screen name="reports" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ headerShown: false }} />
      <Stack.Screen name="lounge" options={{ headerShown: false }} />
    </Stack>
  );
}
