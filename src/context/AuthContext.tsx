import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import supabase from '../services/supabase';

/**
 * 인증 컨텍스트 타입
 */
interface AuthContextType {
  // 상태
  session: Session | null;
  user: User | null;
  loading: boolean;

  // 함수
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
   * 인증 상태 변화 감지
   */
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe?.();
    };
  }, []);

  /**
   * 로그인
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
   * 회원가입
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

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
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
