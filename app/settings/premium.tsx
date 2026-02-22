import { Redirect } from 'expo-router';

export default function LegacyPremiumRoute() {
  // 과금 진입점 단일화: /settings/premium → /subscription/paywall
  return <Redirect href="/subscription/paywall" />;
}
