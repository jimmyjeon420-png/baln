import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

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
 * 현재 로그인한 사용자를 로컬 세션에서 즉시 반환
 *
 * ⚠️ supabase.auth.getUser() 대신 이 함수를 사용하세요!
 * - getUser(): 매번 서버에 HTTP 요청 → 네트워크 느리면 타임아웃
 * - getCurrentUser(): 핸드폰에 저장된 세션에서 즉시 반환 → 0ms
 */
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export default supabase;
