import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, Provider } from '@supabase/supabase-js';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import supabase from '../services/supabase';

// OAuth 세션 완료 처리 (웹 브라우저 팝업 자동 닫기)
WebBrowser.maybeCompleteAuthSession();

/**
 * 지원하는 OAuth 제공자 타입
 */
export type OAuthProvider = 'google' | 'kakao';

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
   * 앱 초기화 시: Supabase의 기존 세션 복구
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 저장된 세션 복구
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        setSession(existingSession);
        setUser(existingSession?.user || null);
      } catch (error) {
        console.error('세션 복구 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * 인증 상태 변화 감지 + 프로필 자동 동기화
   */
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);

        // 로그인 성공 시 프로필 동기화
        if (event === 'SIGNED_IN' && currentSession?.user) {
          const provider = currentSession.user.app_metadata?.provider as OAuthProvider | 'email' || 'email';
          await syncUserProfile(currentSession.user, provider);
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
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
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
        scheme: 'smartrebalancer',
        path: 'auth/callback',
      });

      console.log('=== OAuth 로그인 시작 ===');
      console.log('Provider:', provider);
      console.log('Supabase Redirect URI:', supabaseRedirectUri);
      console.log('App Redirect URL:', appRedirectUrl);

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

      console.log('OAuth URL:', data.url);

      // 웹 브라우저로 OAuth 페이지 열기
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        appRedirectUrl
      );

      console.log('WebBrowser 결과:', result.type);

      // 결과 처리
      if (result.type === 'success' && result.url) {
        console.log('콜백 URL:', result.url);

        // URL에서 토큰 추출
        const url = new URL(result.url);

        // Fragment (#) 또는 Query (?) 파라미터에서 토큰 확인
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const queryParams = new URLSearchParams(url.search);

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

        console.log('Access Token 존재:', !!accessToken);

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

          console.log('세션 설정 완료:', !!sessionData.session);
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
        console.log('사용자가 로그인을 취소했습니다');
        return;
      } else if (result.type === 'dismiss') {
        console.log('브라우저가 닫혔습니다');
        return;
      }
    } catch (error: any) {
      console.error(`${provider} 로그인 실패:`, error);
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
