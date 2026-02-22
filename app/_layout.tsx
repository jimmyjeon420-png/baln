import { Stack, useRouter, useSegments, useNavigationContainerRef } from 'expo-router';
import { View, AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { useTheme } from '../src/hooks/useTheme';
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
import WelcomeBonusModal from '../src/components/WelcomeBonusModal';
import { useDeepLink } from '../src/hooks/useDeepLink';
import { useAnalyticsInit } from '../src/hooks/useAnalytics';
import { usePrefetchCheckup } from '../src/hooks/usePrefetchCheckup';
import queryClient from '../src/services/queryClient';
import * as Sentry from '@sentry/react-native';

// ============================================================================
// [Sentry] 에러 모니터링 초기화
// DSN이 없으면 Sentry 비활성 — 앱 정상 동작 보장
// ============================================================================
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
if (SENTRY_DSN && !__DEV__) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
  });
}

// AsyncStorage 기반 영속 캐시 — 앱 재시작 시에도 데이터 즉시 표시
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'BALN_QUERY_CACHE',
});

/**
 * 테마 배경 래퍼 - useTheme 훅을 사용하기 위해 분리
 */
function ThemedAppContainer({ children }: { children: React.ReactNode }) {
  const { colors, theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* StatusBar 스타일도 테마에 따라 변경 */}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

/**
 * 인증 상태에 따른 라우팅 보호
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeCredits, setWelcomeCredits] = useState(10);

  // ★ 인증 완료 전에는 데이터 훅을 실행하지 않음 (콜드 스타트 레이스 컨디션 방지)
  // loading=true이거나 user=null이면 enabled: false로 쿼리 자체를 차단
  const isReady = !loading && !!user;
  useSubscriptionBonus(isReady);  // 구독자 월 30크레딧 보너스
  const welcomeBonus = useWelcomeBonus(isReady);       // 신규 가입 10크레딧 웰컴 보너스
  useDeepLink(isReady);           // 딥링크 처리 (인증 완료 후에만)
  usePrefetchCheckup();    // 분석 탭 데이터 미리 로드 (내부에서 hasAssets 체크)

  // 웰컴 보너스 지급 시 축하 모달 표시 (1회만)
  // TanStack Query 캐시가 영속되므로, 모달 표시 여부를 별도로 추적
  useEffect(() => {
    if (welcomeBonus.data?.granted && welcomeBonus.data?.creditsEarned) {
      AsyncStorage.getItem('@baln:welcome_modal_shown').then((shown) => {
        if (shown !== 'true') {
          setWelcomeCredits(welcomeBonus.data?.creditsEarned ?? 0);
          setShowWelcomeModal(true);
          AsyncStorage.setItem('@baln:welcome_modal_shown', 'true').catch((err) =>
            console.warn('[AuthGate] 웰컴 모달 상태 저장 실패:', err)
          );
        }
      }).catch((err) => console.warn('[AuthGate] 웰컴 모달 상태 조회 실패:', err));
    }
  }, [welcomeBonus.data?.granted]);

  useEffect(() => {
    if (loading) return; // 로딩 중에는 아무것도 하지 않음

    const inAuthGroup = segments[0] === 'login';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // 로그인되지 않았고, 로그인 페이지가 아니면 로그인으로 리다이렉트
      router.replace('/login');
      return;
    }

    if (!user) return;

    let cancelled = false;

    // 로그인 사용자는 어느 경로에서 들어오든 온보딩 완료 상태를 단일 기준으로 분기한다.
    AsyncStorage.getItem('@baln:onboarding_completed').then((completed) => {
      if (cancelled) return;

      const isCompleted = completed === 'true';
      if (!isCompleted && !inOnboarding) {
        router.replace('/onboarding');
        return;
      }

      if (isCompleted && (inAuthGroup || inOnboarding)) {
        router.replace('/(tabs)');
      }
    }).catch((err) => {
      console.warn('[AuthGate] 온보딩 상태 조회 실패:', err);
      if (!cancelled && (inAuthGroup || inOnboarding)) {
        router.replace('/(tabs)');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, loading, segments, router]);

  // ★ 인증 로딩 중에는 자식을 렌더링하지 않음 (콜드 스타트 레이스 컨디션 방지)
  // BrandSplash는 AuthGate 외부(RootLayout)에서 렌더되므로 사용자는 스플래시를 봄
  if (loading) {
    return null;
  }

  return (
    <>
      {children}
      <WelcomeBonusModal
        visible={showWelcomeModal}
        creditsEarned={welcomeCredits}
        onDismiss={() => setShowWelcomeModal(false)}
      />
    </>
  );
}

// 알림 핸들러 설정 (컴포넌트 외부에서 1회 실행)
configureNotificationHandler();

function RootLayout() {
  useAnalyticsInit();  // Analytics 초기화 (앱 실행 시 1회)
  const ref = useNavigationContainerRef();
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);
  const [isLocked, setIsLocked] = useState(false);
  const isLockedRef = useRef(false); // 클로저 내부에서 최신 상태 접근용
  const [showSplash, setShowSplash] = useState(true); // 브랜드 스플래시 표시 여부
  const appState = useRef(AppState.currentState);

  // Sentry 네비게이션 추적 — 현재 비활성화 (네트워크 디버깅 중)
  // useEffect(() => {
  //   if (ref?.current) {
  //     routingInstrumentation.registerNavigationContainer(ref);
  //   }
  // }, [ref]);

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

  // OTA 업데이트 자동 확인 & 즉시 적용 (사용자 확인 불필요)
  useEffect(() => {
    const checkForOTAUpdate = async () => {
      try {
        if (!Updates.isEnabled) {
          console.log('[Updates] 개발 모드 — OTA 비활성화');
          return;
        }
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          console.log('[Updates] 새 업데이트 발견 — 다운로드 시작');
          await Updates.fetchUpdateAsync();
          console.log('[Updates] 다운로드 완료 — 즉시 적용');
          await Updates.reloadAsync();
        }
      } catch (err) {
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
          <ThemeProvider>
            {/* 테마 적용 배경 (다크/라이트 모드 자동 전환) */}
            <ThemedAppContainer>
              <ErrorBoundary onError={(error, errorInfo) => {
                // Sentry에 React 컴포넌트 에러 전달 (DSN 없으면 무시됨)
                if (SENTRY_DSN && !__DEV__) {
                  Sentry.captureException(error, {
                    contexts: { react: { componentStack: errorInfo.componentStack ?? undefined } },
                  });
                }
              }}>
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
                {/* 데일리 퀴즈 화면 */}
                <Stack.Screen name="settings/daily-quiz" options={{ headerShown: false }} />
                {/* 친구 초대 화면 */}
                <Stack.Screen name="settings/referral" options={{ headerShown: false }} />
                {/* Heart 자산 관리 화면 */}
                <Stack.Screen name="settings/manage-hearts" options={{ headerShown: false }} />
                {/* 투자자 레벨 화면 */}
                <Stack.Screen name="settings/investor-level" options={{ headerShown: false }} />
                {/* 라이선스 화면 */}
                <Stack.Screen name="settings/licenses" options={{ headerShown: false }} />
                {/* 웹사이트 화면 */}
                <Stack.Screen name="settings/website" options={{ headerShown: false }} />
                {/* 커뮤니티 메인 화면 */}
                <Stack.Screen name="community/index" options={{ headerShown: false }} />
                {/* 커뮤니티 글 작성 화면 */}
                <Stack.Screen name="community/create" options={{ headerShown: false }} />
                {/* AI 분석 - 종목 딥다이브 */}
                <Stack.Screen name="analysis/deep-dive" options={{ headerShown: false }} />
                {/* AI 분석 - What-If 시뮬레이션 */}
                <Stack.Screen name="analysis/what-if" options={{ headerShown: false }} />
                {/* AI 분석 - 세금 리포트 */}
                <Stack.Screen name="analysis/tax-report" options={{ headerShown: false }} />
                {/* AI 분석 - 시장 브리핑 채팅 */}
                <Stack.Screen name="analysis/cfo-chat" options={{ headerShown: false }} />
                {/* 어드민 화면 */}
                <Stack.Screen name="admin" options={{ headerShown: false }} />
                {/* 감정 히스토리 화면 */}
                <Stack.Screen name="journal/emotion-history" options={{ headerShown: false }} />
                {/* 모임 화면 */}
                <Stack.Screen name="gatherings" options={{ headerShown: false }} />
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
            </ThemedAppContainer>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

// ============================================================================
// [Sentry] Sentry.wrap()으로 앱 최상위 래핑
// DSN이 없으면 wrap()은 원본 컴포넌트를 그대로 반환 (no-op)
// ============================================================================
export default Sentry.wrap(RootLayout);
