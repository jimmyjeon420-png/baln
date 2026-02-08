/**
 * VIP 라운지 리다이렉트
 * 기존 딥링크 호환성 유지를 위해 탭 라운지로 자동 이동
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function LoungeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/lounge');
  }, []);

  return null;
}
