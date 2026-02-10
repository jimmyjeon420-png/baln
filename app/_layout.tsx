import { Stack, useRouter, useSegments } from 'expo-router';
import { View, AppState, AppStateStatus, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import {
  configureNotificationHandler,
  requestNotificationPermission,
  loadNotificationSettings,
  syncNotificationSchedule,
} from '../src/services/notifications';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import BiometricLockScreen from '../src/components/BiometricLockScreen';
import BrandSplash from '../src/components/BrandSplash';
import { getBiometricSettings } from '../src/services/biometric';
import { useSubscriptionBonus } from '../src/hooks/useCredits';
import { useWelcomeBonus } from '../src/hooks/useRewards';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorBoundary from '../src/components/common/ErrorBoundary';
import { useDeepLink } from '../src/hooks/useDeepLink';
import { useAnalyticsInit } from '../src/hooks/useAnalytics';
import { usePrefetchCheckup } from '../src/hooks/usePrefetchCheckup';

// React Query 클라이언트 — gcTime을 24시간으로 설정 (영속 캐시와 동기화)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,          // 5분: 이 시간 내 재요청 안 함
      gcTime: 1000 * 60 * 60 * 24,       // 24시간: 영속 캐시와 수명 동기화
      retry: 2,
    },
  },
});

// AsyncStorage 기반 영속 캐시 — 앱 재시작 시에도 데이터 즉시 표시
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'BALN_QUERY_CACHE',
});

/**
 * 인증 상태에 따른 라우팅 보호
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // 앱 시작 시 자동 보상 체크 (로그인된 경우만)
  useSubscriptionBonus();  // 구독자 월 30크레딧 보너스
  useWelcomeBonus();       // 신규 가입 10크레딧 웰컴 보너스
  useDeepLink();           // 딥링크 처리 (알림 탭, 외부 링크 등)
  usePrefetchCheckup();    // 분석 탭 데이터 미리 로드 (이승건: "보기 전에 준비")

  useEffect(() => {
    if (loading) return; // 로딩 중에는 아무것도 하지 않음

    const inAuthGroup = segments[0] === 'login';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // 로그인되지 않았고, 로그인 페이지가 아니면 로그인으로 리다이렉트
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // 로그인되었고, 로그인 페이지에 있으면 → 온보딩 체크 후 리다이렉트
      AsyncStorage.getItem('@baln:onboarding_completed').then((completed) => {
        if (completed === 'true') {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      });
    } else if (user && inOnboarding) {
      // 온보딩 중인데 이미 완료했으면 메인으로
      AsyncStorage.getItem('@baln:onboarding_completed').then((completed) => {
        if (completed === 'true') {
          router.replace('/(tabs)');
        }
      });
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

// 알림 핸들러 설정 (컴포넌트 외부에서 1회 실행)
configureNotificationHandler();

export default function RootLayout() {
  useAnalyticsInit();  // Analytics 초기화 (앱 실행 시 1회)
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);
  const [isLocked, setIsLocked] = useState(false);
  const isLockedRef = useRef(false); // 클로저 내부에서 최신 상태 접근용
  const [showSplash, setShowSplash] = useState(true); // 브랜드 스플래시 표시 여부
  const appState = useRef(AppState.currentState);

  // isLocked 변경 시 ref 동기화
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // AppState 변화 감지 → 백그라운드에서 복귀 시 잠금
  // [핵심] background → active만 감지 (inactive → active는 무시)
  // Face ID 팝업이 뜨면 iOS가 앱을 inactive로 바꾸는데,
  // 이를 감지하면 Face ID 해제 직후 다시 잠금이 걸려 무한 루프 발생
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      // background → active 전환 시에만 잠금 (inactive는 무시)
      if (appState.current === 'background' && nextState === 'active') {
        // 이미 잠겨있으면 중복 트리거 방지
        if (isLockedRef.current) {
          appState.current = nextState;
          return;
        }
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

  // OTA 업데이트 자동 확인 & 적용
  useEffect(() => {
    const checkForOTAUpdate = async () => {
      try {
        if (!Updates.isEnabled) return; // 개발 모드에서는 스킵
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          // 업데이트 다운로드 완료 → 앱 재시작하여 적용
          Alert.alert(
            '업데이트 완료',
            '새로운 버전이 준비되었습니다. 지금 적용할까요?',
            [
              { text: '나중에', style: 'cancel' },
              { text: '적용', onPress: () => Updates.reloadAsync() },
            ]
          );
        }
      } catch (err) {
        // 업데이트 체크 실패 시 무시 (네트워크 오류 등)
        console.warn('[Updates] OTA 업데이트 확인 실패 (무시):', err);
      }
    };
    checkForOTAUpdate();
  }, []);

  useEffect(() => {
    // 알림 권한 + 설정 로드를 병렬 실행 (직렬 대비 ~200ms 단축)
    const setupNotifications = async () => {
      try {
        const [granted, settings] = await Promise.all([
          requestNotificationPermission(),
          loadNotificationSettings(),
        ]);
        if (granted) {
          await syncNotificationSchedule(settings);
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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24,   // 24시간: 하루 지나면 캐시 만료
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success', // 성공한 쿼리만 저장
        },
      }}
    >
      <SafeAreaProvider>
        <AuthProvider>
          {/* 다크 모드 배경 (#121212) - Fintech 스타일 */}
          <View style={{ flex: 1, backgroundColor: '#121212' }}>
            <StatusBar style="light" />
            <ErrorBoundary>
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
                {/* 티어 맞춤 전략 상세 */}
                <Stack.Screen name="tier-strategy" options={{ headerShown: false }} />
                {/* 커뮤니티 게시물 상세 + 댓글 */}
                <Stack.Screen name="community/[id]" options={{ headerShown: false }} />
                {/* 투자 DNA - 등급별 포트폴리오 비중 비교 */}
                <Stack.Screen name="settings/tier-insights" options={{ headerShown: false }} />
                {/* 게임 (투자 예측 등) */}
                <Stack.Screen name="games" options={{ headerShown: false }} />
                {/* 온보딩 플로우 (신규 유저) */}
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                {/* 업적 배지 화면 */}
                <Stack.Screen name="achievements" options={{ headerShown: false }} />
                {/* 알림 센터 화면 */}
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
                {/* 커뮤니티 즐겨찾기 */}
                <Stack.Screen name="community/bookmarks" options={{ headerShown: false }} />
                {/* 부동산 상세 화면 */}
                <Stack.Screen name="realestate/[id]" options={{ headerShown: false }} />
                {/* 부동산 추가 화면 */}
                <Stack.Screen
                  name="add-realestate"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                  }}
                />
                {/* 계정 삭제 화면 */}
                <Stack.Screen name="settings/delete-account" options={{ headerShown: false }} />
                {/* 투자 거장 인사이트 화면 */}
                <Stack.Screen name="settings/gurus" options={{ headerShown: false }} />
                {/* 작성자 프로필 화면 */}
                <Stack.Screen name="community/author/[userId]" options={{ headerShown: false }} />
                {/* 리밸런싱 히스토리 화면 */}
                <Stack.Screen name="rebalance-history" options={{ headerShown: false }} />
                {/* 거래 기록 화면 */}
                <Stack.Screen name="log-trade" options={{ headerShown: false }} />
              </Stack>
            </AuthGate>
            </ErrorBoundary>
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
    </PersistQueryClientProvider>
  );
}