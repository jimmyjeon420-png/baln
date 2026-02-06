import { Stack, useRouter, useSegments } from 'expo-router';
import { View, AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import {
  configureNotificationHandler,
  requestNotificationPermission,
  scheduleMorningBriefing,
  scheduleInactivityReminder,
} from '../src/services/notifications';
import * as Notifications from 'expo-notifications';
import BiometricLockScreen from '../src/components/BiometricLockScreen';
import BrandSplash from '../src/components/BrandSplash';
import { getBiometricSettings } from '../src/services/biometric';
import { useSubscriptionBonus } from '../src/hooks/useCredits';

// React Query 클라이언트 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      retry: 2,
    },
  },
});

/**
 * 인증 상태에 따른 라우팅 보호
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // 앱 시작 시 구독자 월 크레딧 보너스 체크 (로그인된 경우만)
  useSubscriptionBonus();

  useEffect(() => {
    if (loading) return; // 로딩 중에는 아무것도 하지 않음

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      // 로그인되지 않았고, 로그인 페이지가 아니면 로그인으로 리다이렉트
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // 로그인되었고, 로그인 페이지에 있으면 메인으로 리다이렉트
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

// 알림 핸들러 설정 (컴포넌트 외부에서 1회 실행)
configureNotificationHandler();

export default function RootLayout() {
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showSplash, setShowSplash] = useState(true); // 브랜드 스플래시 표시 여부
  const appState = useRef(AppState.currentState);

  // AppState 변화 감지 → 백그라운드에서 복귀 시 잠금
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      // background/inactive → active 전환 시
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        try {
          const settings = await getBiometricSettings();
          if (settings.biometricEnabled && settings.autoLockEnabled) {
            setIsLocked(true);
          }
        } catch {
          // 설정 로드 실패 시 잠금 안 함 (사용자 편의 우선)
        }
      }
      appState.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // 알림 권한 요청 + 스케줄링 (비동기, 실패해도 앱 크래시 안 함)
    const setupNotifications = async () => {
      try {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleMorningBriefing();
          await scheduleInactivityReminder();
        }
      } catch (err) {
        console.error('Notification setup failed (non-fatal):', err);
      }
    };
    setupNotifications();

    // 알림 수신 리스너 (포그라운드)
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // 포그라운드 알림 수신 시 별도 처리 없음 (핸들러가 자동 표시)
    });

    // 알림 탭 리스너 (사용자가 알림을 탭했을 때)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      // 알림 탭 시 진단 화면으로 이동은 AuthGate 내에서 처리 가능
      // 딥링크 처리를 위해서는 expo-router의 linking config 활용
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* 다크 모드 배경 (#121212) - Fintech 스타일 */}
          <View style={{ flex: 1, backgroundColor: '#121212' }}>
            <StatusBar style="light" />
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }}>
                {/* 로그인 화면 */}
                <Stack.Screen name="login" options={{ headerShown: false }} />
                {/* (tabs) 폴더를 메인 화면으로 지정 */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                {/* add-asset 모달 화면 */}
                <Stack.Screen
                  name="add-asset"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                  }}
                />
                {/* 구독/페이월 화면 */}
                <Stack.Screen
                  name="subscription/paywall"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                  }}
                />
                {/* 설정 관련 화면들 */}
                <Stack.Screen name="settings/profile" options={{ headerShown: false }} />
                <Stack.Screen name="settings/notifications" options={{ headerShown: false }} />
                <Stack.Screen name="settings/security" options={{ headerShown: false }} />
                <Stack.Screen name="settings/help" options={{ headerShown: false }} />
                <Stack.Screen name="settings/terms" options={{ headerShown: false }} />
                <Stack.Screen name="settings/about" options={{ headerShown: false }} />
                <Stack.Screen name="settings/lounge" options={{ headerShown: false }} />
                <Stack.Screen name="settings/privacy" options={{ headerShown: false }} />
                {/* AI 프리미엄 마켓플레이스 */}
                <Stack.Screen name="marketplace" options={{ headerShown: false }} />
              </Stack>
            </AuthGate>
            {/* 브랜드 스플래시 (앱 시작 시 'baln.logic' 표시) */}
            {showSplash && (
              <BrandSplash onFinish={() => setShowSplash(false)} />
            )}
            {/* 생체인증 잠금 화면 (AuthGate 바깥, 최상위 오버레이) */}
            {isLocked && (
              <BiometricLockScreen onUnlock={() => setIsLocked(false)} />
            )}
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}