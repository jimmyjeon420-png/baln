import { Redirect } from 'expo-router';

export default function StartPage() {
  // 진입 라우팅은 AuthGate에서 단일하게 처리한다.
  // /login으로 진입하면 로그인 여부 + 온보딩 완료 여부에 따라
  // /onboarding 또는 /(tabs)로 자동 분기된다.
  return <Redirect href="/login" />;
}
