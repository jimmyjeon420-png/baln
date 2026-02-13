import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// 3중 방어: env → eas.json → 하드코딩 폴백 (EAS 빌드에서 env 누락 대비)
// ============================================================================
const FALLBACK_URL = 'https://ruqeinfcqhgexrckonsy.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cWVpbmZjcWhnZXhyY2tvbnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMTE4MDksImV4cCI6MjA4NDc4NzgwOX0.NJmOH_uF59nYaSmjebGMNHlBwvqx5MHIwXOoqzITsXc';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;

// 진단 로그 (빌드에서 env 변수가 제대로 들어왔는지 확인)
console.log('[Supabase] URL:', supabaseUrl.substring(0, 30) + '...');
console.log('[Supabase] Key:', supabaseAnonKey.substring(0, 20) + '...');

// AsyncStorage 어댑터를 사용하여 토큰 저장
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * 현재 로그인한 사용자를 반환 (5초 타임아웃 포함)
 *
 * ⚠️ supabase.auth.getUser() 대신 이 함수를 사용하세요!
 * - getUser(): 매번 서버에 HTTP 요청 → 타임아웃 위험
 * - getCurrentUser(): getSession() + 5초 타임아웃 → 절대 멈추지 않음
 */
export async function getCurrentUser() {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (!result) {
      console.warn('[Supabase] getSession 5초 타임아웃 — 세션 없음 처리');
      return null;
    }

    return (result as any).data?.session?.user ?? null;
  } catch (err) {
    console.warn('[Supabase] getCurrentUser 에러:', err);
    return null;
  }
}

export default supabase;
