import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// 3중 방어: env → eas.json → 하드코딩 폴백 (EAS 빌드에서 env 누락 대비)
// ============================================================================
const FALLBACK_URL = 'https://ruqeinfcqhgexrckonsy.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cWVpbmZjcWhnZXhyY2tvbnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMTE4MDksImV4cCI6MjA4NDc4NzgwOX0.NJmOH_uF59nYaSmjebGMNHlBwvqx5MHIwXOoqzITsXc';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;

// 진단 로그 (빌드에서 env 변수가 제대로 들어왔는지 확인)
console.log('[Supabase] URL:', SUPABASE_URL.substring(0, 30) + '...');
console.log('[Supabase] Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');

// AsyncStorage 어댑터를 사용하여 토큰 저장
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // ★ React Native 교착상태(deadlock) 방지:
    // Supabase JS v2.39+에서 Web Locks API를 사용하는데,
    // React Native에는 이 API가 없어서 폴링 기반 fallback이 작동함.
    // OAuth setSession() → 내부 getSession() 호출 시 락이 해제 안 되어
    // 모든 DB 쿼리가 무한 대기하는 버그 발생.
    // RN은 단일 JS 스레드이므로 락 없이도 안전함.
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      return fn();
    },
  },
});

/**
 * access_token 만료 여부 확인 (JWT exp 클레임 기반)
 * 만료 60초 전부터 "만료됨"으로 판단 (갱신 여유 시간)
 */
function isTokenExpired(accessToken: string): boolean {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now + 60; // 60초 여유
  } catch {
    return true; // 파싱 실패 시 만료로 간주
  }
}

/** refreshSession 동시 호출 방지 (싱글톤) */
let pendingRefresh: Promise<any> | null = null;

/**
 * 현재 로그인한 사용자를 반환 (5초 타임아웃 + 토큰 만료 검증)
 *
 * ⚠️ supabase.auth.getUser() 대신 이 함수를 사용하세요!
 * - getUser(): 매번 서버에 HTTP 요청 → 타임아웃 위험
 * - getCurrentUser(): getSession() + 만료 검증 + 5초 타임아웃
 *
 * ★ 핵심 수정: 만료된 토큰의 user를 반환하면 Supabase RLS가 빈 결과를 주고,
 *   그 빈 결과가 React Query에 "성공"으로 캐시되어 30분간 데이터가 안 보이는 버그가 있었음.
 *   이제 만료 토큰이면 refreshSession()을 먼저 호출한 후 user를 반환함.
 */
export async function getCurrentUser() {
  try {
    // 1차: 로컬 세션 조회 (AsyncStorage, 빠름)
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (!result) {
      console.warn('[Supabase] getSession 5초 타임아웃 — refreshSession 시도');
    } else {
      const session = (result as any).data?.session;
      if (session?.user) {
        // ★ 토큰 만료 검증: 만료됐으면 user를 바로 반환하지 않고 갱신 시도
        if (session.access_token && !isTokenExpired(session.access_token)) {
          return session.user; // 유효한 토큰 → 바로 반환
        }
        console.warn('[Supabase] access_token 만료됨 → refreshSession 시도');
        // 만료된 경우 아래 refreshSession으로 진행
      }
    }

    // 2차: 세션 없거나 토큰 만료 → 서버에서 갱신
    // 동시 호출 방지: 이미 진행 중이면 기존 Promise 대기
    if (!pendingRefresh) {
      pendingRefresh = Promise.race([
        supabase.auth.refreshSession(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]).finally(() => { pendingRefresh = null; });
    }

    const refreshResult = await pendingRefresh;

    if (!refreshResult) {
      console.warn('[Supabase] refreshSession 8초 타임아웃');
      return null;
    }

    const refreshedUser = (refreshResult as any).data?.session?.user ?? null;
    if (refreshedUser) {
      console.log('[Supabase] refreshSession 성공 — 유효한 세션 복구됨');
    }
    return refreshedUser;
  } catch (err) {
    console.warn('[Supabase] getCurrentUser 에러:', err);
    return null;
  }
}

export default supabase;
