import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, Provider } from '@supabase/supabase-js';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../services/supabase';
import queryClient from '../services/queryClient';
// Optional import: 패키지 미설치 시에도 앱 크래시 방지
let AppleAuthentication: any = null;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch {
  // expo-apple-authentication 미설치 → Apple 로그인 비활성화
}

// OAuth 세션 완료 처리 (웹 브라우저 팝업 자동 닫기)
WebBrowser.maybeCompleteAuthSession();

/**
 * 지원하는 OAuth 제공자 타입
 */
export type OAuthProvider = 'google' | 'kakao' | 'apple';

/**
 * 인증 컨텍스트 타입
 */
interface AuthContextType {
  // 상태
  session: Session | null;
  user: User | null;
  loading: boolean;

  // 이메일 인증 함수
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  // OAuth 인증 함수
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;

  // Apple 네이티브 인증
  signInWithApple: () => Promise<void>;
}

/**
 * AuthContext 생성
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider 컴포넌트
 * 앱의 루트 레이아웃에서 감싸야 함
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 사용자 프로필 동기화 (upsert)
   * 소셜 로그인 시 사용자 정보를 profiles 테이블에 저장
   * NOTE: 현재 DB 스키마에 맞게 최소한의 필드만 사용
   */
  const syncUserProfile = async (user: User, provider: OAuthProvider | 'email') => {
    try {
      const { id, email } = user;

      // 프로필 데이터 준비 (DB에 존재하는 컬럼만 사용)
      const profileData = {
        id,
        email,
      };

      // profiles 테이블에 upsert (없으면 생성, 있으면 업데이트)
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('프로필 동기화 실패:', error);
      }
    } catch (error) {
      console.error('프로필 동기화 중 오류:', error);
    }
  };

  /**
   * access_token JWT 만료 여부 확인
   * JWT의 exp 클레임을 디코딩하여 만료 시간 비교
   */
  const isAccessTokenExpired = (sessionToCheck: Session): boolean => {
    try {
      const token = sessionToCheck.access_token;
      if (!token) return true;

      // JWT payload 디코딩 (base64)
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      if (!exp) return true;

      // 현재 시간 + 60초 여유 (만료 1분 전이면 갱신)
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const isExpired = nowInSeconds >= (exp - 60);

      if (isExpired) {
        const expiredAgo = nowInSeconds - exp;
        console.log(`[AuthContext] 토큰 ${expiredAgo > 0 ? `${expiredAgo}초 전 만료` : '곧 만료'}`);
      }

      return isExpired;
    } catch {
      console.warn('[AuthContext] JWT 디코딩 실패 → 만료 처리');
      return true;
    }
  };

  /**
   * 세션 건강 체크 (Session Health Check)
   *
   * TestFlight 업데이트 후 이전 빌드의 세션 토큰이 남아있으면
   * getSession()은 "로그인됨"을 반환하지만, 실제 서버 요청은 실패합니다.
   * → 간단한 DB 쿼리를 보내 세션이 진짜 유효한지 확인합니다.
   * → 실패하면 세션을 지우고 로그인 화면으로 보냅니다.
   */
  const verifySessionHealth = async (sessionToCheck: Session): Promise<boolean> => {
    try {
      const result = await Promise.race([
        supabase.from('profiles').select('id').limit(1),
        new Promise<{ error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ error: { message: 'Health check timeout (5s)' } }), 5000)
        ),
      ]);

      const error = (result as any)?.error;
      if (error) {
        console.warn('[AuthContext] 세션 건강 체크 실패:', error.message);

        // 인증 관련 에러인 경우 세션 무효화
        const msg = (error.message || '').toLowerCase();
        // ★ 타임아웃은 네트워크 문제이므로 인증 에러로 분류하지 않음
        // 이전: timeout을 인증 에러로 처리 → 느린 네트워크에서 강제 로그아웃
        const isTimeout = msg.includes('timeout');
        const isAuthError = !isTimeout && (
          msg.includes('jwt') ||
          msg.includes('token') ||
          msg.includes('expired') ||
          msg.includes('invalid') ||
          msg.includes('unauthorized') ||
          msg.includes('401')
        );

        if (isAuthError) {
          console.warn('[AuthContext] 세션 토큰 만료/손상 감지 → 세션 초기화');
          Sentry.captureMessage('세션 토큰 만료/손상 감지', {
            level: 'warning',
            tags: { service: 'auth', type: 'session_invalid' },
            extra: { errorMessage: msg },
          });

          // 먼저 토큰 갱신 시도 (refresh token이 유효할 수 있음)
          // ★ 10초 타임아웃 추가 — 네트워크 느릴 때 무한 대기 방지
          try {
            const refreshResult = await Promise.race([
              supabase.auth.refreshSession(),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
            ]);

            if (refreshResult && 'data' in refreshResult) {
              const { data: refreshData, error: refreshError } = refreshResult;
              if (!refreshError && refreshData.session) {
                console.log('[AuthContext] 토큰 갱신 성공 → 세션 유지');
                return true;
              }
            } else {
              console.warn('[AuthContext] 토큰 갱신 10초 타임아웃 → 오프라인 허용');
              return true; // 타임아웃은 네트워크 문제 → 세션 유지
            }
          } catch {
            // 갱신도 실패 → 아래에서 세션 삭제
          }

          // 갱신 실패 → 세션 완전 삭제
          await supabase.auth.signOut().catch(() => {});
          queryClient.clear();
          try {
            const allKeys = await AsyncStorage.getAllKeys();
            const keysToRemove = allKeys.filter(
              (key) =>
                key === 'BALN_QUERY_CACHE' ||
                key.startsWith('@baln:') ||
                key.startsWith('reward_')
            );
            if (keysToRemove.length > 0) {
              await AsyncStorage.multiRemove(keysToRemove);
            }
          } catch {
            // 스토리지 정리 실패는 치명적이지 않음
          }
          return false;
        }

        // 네트워크 에러 등 비-인증 에러 → 세션은 유지 (오프라인 접속 허용)
        console.log('[AuthContext] 비-인증 에러 (네트워크?) → 세션 유지, 오프라인 허용');
        return true;
      }

      console.log('[AuthContext] 세션 건강 체크 통과');
      return true;
    } catch (error) {
      console.warn('[AuthContext] 세션 건강 체크 예외:', error);
      // 예외 발생 시 세션 유지 (오프라인 등)
      return true;
    }
  };

  /**
   * 앱 초기화 시: 세션 복구 + 만료된 토큰 즉시 갱신
   *
   * ★ 핵심 수정: getSession()만으로는 만료된 access_token이 그대로 사용됨
   * → 만료 여부 확인 후 refreshSession()으로 새 토큰 발급
   * → 이후 모든 API 호출이 유효한 토큰으로 동작
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1단계: 저장된 세션 복구 (로컬 AsyncStorage에서)
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (existingSession) {
          // 2단계: access_token 만료 여부 확인
          const isTokenExpired = isAccessTokenExpired(existingSession);

          if (isTokenExpired) {
            // ★ 토큰 만료 → 즉시 갱신 (이전: 건강체크만 하고 만료된 토큰 사용)
            console.log('[AuthContext] access_token 만료됨 → refreshSession 시도');
            try {
              const refreshResult = await Promise.race([
                supabase.auth.refreshSession(),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
              ]);

              if (refreshResult && 'data' in refreshResult) {
                const { data: refreshData, error: refreshError } = refreshResult;
                if (!refreshError && refreshData.session) {
                  console.log('[AuthContext] 토큰 갱신 성공 → 새 세션 적용');
                  setSession(refreshData.session);
                  setUser(refreshData.session.user || null);
                } else {
                  // refresh_token도 만료 → 재로그인 필요
                  console.warn('[AuthContext] 토큰 갱신 실패 → 재로그인 필요');
                  await supabase.auth.signOut().catch(() => {});
                  setSession(null);
                  setUser(null);
                }
              } else {
                // 타임아웃 → 오프라인 모드 (만료된 세션이라도 유지)
                console.warn('[AuthContext] 토큰 갱신 타임아웃 → 오프라인 허용');
                setSession(existingSession);
                setUser(existingSession.user || null);
              }
            } catch {
              console.warn('[AuthContext] 토큰 갱신 예외 → 기존 세션 유지');
              setSession(existingSession);
              setUser(existingSession.user || null);
            }
          } else {
            // 토큰 유효 → 건강 체크만 수행
            const isHealthy = await verifySessionHealth(existingSession);
            if (isHealthy) {
              setSession(existingSession);
              setUser(existingSession.user || null);
            } else {
              console.warn('[AuthContext] 세션 건강 체크 실패 → 로그인 필요');
              setSession(null);
              setUser(null);
            }
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('세션 복구 실패:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * 인증 상태 변화 감지 + 프로필 자동 동기화
   *
   * 처리하는 이벤트:
   * - SIGNED_IN: 프로필 동기화 + 캐시 새로고침 (새 사용자 데이터 로드)
   * - SIGNED_OUT: 캐시 전체 삭제 (이전 사용자 데이터 제거)
   * - TOKEN_REFRESHED: 세션 갱신 성공 (정상 동작, 로그만)
   */
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[AuthContext] onAuthStateChange:', event);

        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);

        // 로그인 성공 시 프로필 동기화 + 캐시 새로고침
        if (event === 'SIGNED_IN' && currentSession?.user) {
          const provider = currentSession.user.app_metadata?.provider as OAuthProvider | 'email' || 'email';
          await syncUserProfile(currentSession.user, provider);

          // Sentry 사용자 컨텍스트 설정 (이메일은 개인정보이므로 ID만 전달)
          Sentry.setUser({ id: currentSession.user.id });

          // 이전 세션의 오래된 캐시 데이터 무효화 → 새로운 사용자 데이터로 갱신
          queryClient.invalidateQueries();
        }

        // 로그아웃 시 캐시 정리 (signOut 함수가 아닌 외부 요인으로 로그아웃된 경우 대비)
        if (event === 'SIGNED_OUT') {
          Sentry.setUser(null); // Sentry 사용자 컨텍스트 초기화
          queryClient.clear();
        }

        // 토큰 갱신 성공 로그
        if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] 토큰 자동 갱신 성공');
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe?.();
    };
  }, []);

  /**
   * 이메일 로그인
   */
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('로그인 실패:', error);
      throw error;
    }
  };

  /**
   * 이메일 회원가입
   */
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('회원가입 실패:', error);
      throw error;
    }
  };

  /**
   * 로그아웃
   *
   * 보안: 이전 사용자의 데이터가 다음 사용자에게 노출되지 않도록
   * React Query 캐시 + AsyncStorage 영속 캐시 + 앱 로컬 데이터를 모두 삭제합니다.
   */
  const signOut = async () => {
    try {
      // 1. Supabase 세션 종료
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }

      // 2. React Query 메모리 캐시 전체 삭제 (이전 사용자 데이터 제거)
      queryClient.clear();

      // 3. AsyncStorage에서 앱 데이터 + 영속 캐시 삭제
      //    BALN_QUERY_CACHE: React Query 영속 캐시 (이전 사용자 포트폴리오/크레딧 등)
      //    @baln:*: 앱별 로컬 데이터 (온보딩 완료, 스트릭, 웰컴 모달 등)
      //    reward_*: 보상 관련 키
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const keysToRemove = allKeys.filter(
          (key) =>
            key === 'BALN_QUERY_CACHE' ||
            key.startsWith('@baln:') ||
            key.startsWith('reward_')
        );
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
        }
      } catch (storageError) {
        // AsyncStorage 삭제 실패는 치명적이지 않음 — 로그만 남기고 진행
        console.warn('[signOut] AsyncStorage 클리어 실패:', storageError);
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  };

  /**
   * OAuth 소셜 로그인
   * Google, Kakao 지원
   */
  const signInWithOAuth = async (provider: OAuthProvider) => {
    try {
      // Supabase 공식 Redirect URI 사용
      const supabaseRedirectUri = 'https://ruqeinfcqhgexrckonsy.supabase.co/auth/v1/callback';

      // 앱으로 돌아올 딥링크 URL
      const appRedirectUrl = AuthSession.makeRedirectUri({
        scheme: 'baln',
        path: 'auth/callback',
      });

      if (__DEV__) {
        console.log('=== OAuth 로그인 시작 ===');
        console.log('Provider:', provider);
        console.log('Supabase Redirect URI:', supabaseRedirectUri);
        console.log('App Redirect URL:', appRedirectUrl);
      }

      // Supabase OAuth 요청
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: appRedirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('Supabase OAuth 에러:', error);
        throw new Error(error.message);
      }

      if (!data.url) {
        throw new Error('OAuth URL을 받지 못했습니다');
      }

      if (__DEV__) console.log('OAuth URL:', data.url);

      // 웹 브라우저로 OAuth 페이지 열기
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        appRedirectUrl
      );

      if (__DEV__) console.log('WebBrowser 결과:', result.type);

      // 결과 처리
      if (result.type === 'success' && result.url) {
        if (__DEV__) console.log('콜백 URL:', result.url);

        // URL에서 토큰 추출
        const url = new URL(result.url);

        // Fragment (#) 또는 Query (?) 파라미터에서 토큰 확인
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const queryParams = new URLSearchParams(url.search);

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

        if (__DEV__) console.log('Access Token 존재:', !!accessToken);

        if (accessToken) {
          // 세션 설정
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            console.error('세션 설정 에러:', sessionError);
            throw new Error(sessionError.message);
          }

          if (__DEV__) console.log('세션 설정 완료:', !!sessionData.session);
        } else {
          // 에러 확인
          const errorCode = hashParams.get('error') || queryParams.get('error');
          const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

          if (errorCode || errorDescription) {
            const errorMsg = errorDescription
              ? decodeURIComponent(errorDescription)
              : `인증 실패: ${errorCode}`;
            throw new Error(errorMsg);
          }

          // 토큰도 에러도 없는 경우
          console.warn('토큰을 찾을 수 없음. URL 구조 확인 필요.');
        }
      } else if (result.type === 'cancel') {
        if (__DEV__) console.log('사용자가 로그인을 취소했습니다');
        return;
      } else if (result.type === 'dismiss') {
        if (__DEV__) console.log('브라우저가 닫혔습니다');
        return;
      }
    } catch (error: any) {
      console.error(`${provider} 로그인 실패:`, error);
      Sentry.captureException(error, {
        tags: { service: 'auth', provider },
      });
      throw error;
    }
  };

  /**
   * Apple 네이티브 로그인
   * iOS 전용: expo-apple-authentication SDK → Supabase signInWithIdToken
   */
  const signInWithApple = async () => {
    try {
      // 0. Apple 인증 네이티브 모듈 가용성 체크
      if (!AppleAuthentication) {
        throw new Error('현재 빌드에서 Apple 로그인을 사용할 수 없습니다');
      }
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        if (__DEV__) {
          throw new Error('Apple 로그인은 실제 기기에서만 테스트할 수 있습니다 (시뮬레이터 미지원)');
        }
        throw new Error('이 기기에서는 Apple 로그인을 사용할 수 없습니다');
      }

      // 1. 랜덤 nonce 생성 (보안용 1회성 토큰)
      const rawNonce = Array.from(
        { length: 32 },
        () => Math.random().toString(36)[2] || '0'
      ).join('');

      // 2. SHA-256 해시 (Apple에 전달할 해시된 nonce)
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      // 3. Apple 네이티브 로그인 다이얼로그 호출
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('Apple에서 인증 토큰을 받지 못했습니다');
      }

      // 4. Supabase에 Apple ID 토큰으로 로그인
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        // Supabase에서 Apple provider 미활성화 에러
        if (error.message?.includes('provider is not enabled')) {
          throw new Error('서버에서 Apple 로그인이 아직 활성화되지 않았습니다');
        }
        throw new Error(error.message);
      }

      if (__DEV__) console.log('Apple 로그인 성공');
    } catch (error: any) {
      // 사용자가 취소한 경우 (Apple 고유 에러코드)
      if (error.code === 'ERR_REQUEST_CANCELED') {
        if (__DEV__) console.log('사용자가 Apple 로그인을 취소했습니다');
        return;
      }
      // 네이티브 모듈 미설치 시 (안전장치)
      if (error.code === 'ERR_UNAVAILABLE') {
        console.error('Apple 인증 네이티브 모듈 없음');
        throw new Error('앱을 최신 버전으로 업데이트해주세요');
      }
      console.error('Apple 로그인 실패:', error);
      Sentry.captureException(error, {
        tags: { service: 'auth', provider: 'apple' },
      });
      throw error;
    }
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    signInWithApple,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * AuthContext를 사용하기 위한 커스텀 훅
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다');
  }

  return context;
}
