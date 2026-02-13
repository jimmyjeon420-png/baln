/**
 * useStreakFreeze.ts - 스트릭 보호(Streak Freeze) 훅
 *
 * 역할: "스트릭 보험 창구" — Duolingo식 스트릭 프리즈 기능
 *
 * 비즈니스 로직:
 * - 3크레딧으로 프리즈 1개 구매 (마켓플레이스 상품)
 * - 하루 미접속 시 프리즈 자동 소모 → 스트릭 유지
 * - 프리즈 없으면 기존대로 스트릭 리셋
 *
 * 저장소: AsyncStorage '@baln_streak_freezes'
 * 크레딧 차감: Supabase spend_credits RPC
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../services/supabase';

// ============================================================================
// 타입 정의
// ============================================================================

export interface StreakFreezeData {
  count: number;              // 보유 프리즈 수
  lastUsedDate: string | null; // 마지막 사용일 (YYYY-MM-DD)
}

export interface UseStreakFreezeReturn {
  hasActiveFreeze: boolean;     // 프리즈가 1개 이상 있는지
  freezeCount: number;          // 보유 프리즈 수
  lastUsedDate: string | null;  // 마지막 사용일
  isLoading: boolean;           // 로딩 상태
  purchaseFreeze: () => Promise<PurchaseFreezeResult>;  // 프리즈 구매
  useFreeze: () => Promise<UseFreezeResult>;            // 프리즈 사용
  refresh: () => Promise<void>; // 데이터 새로고침
}

export interface PurchaseFreezeResult {
  success: boolean;
  newFreezeCount: number;
  newCreditBalance: number;
  errorMessage?: string;
}

export interface UseFreezeResult {
  success: boolean;
  freezeUsed: boolean;       // 실제 프리즈가 소모되었는지
  remainingFreezes: number;
}

// ============================================================================
// 상수
// ============================================================================

const STORAGE_KEY = '@baln_streak_freezes';
const FREEZE_COST = 3; // 3크레딧

const DEFAULT_DATA: StreakFreezeData = {
  count: 0,
  lastUsedDate: null,
};

// ============================================================================
// 유틸리티 (모듈 레벨 — 훅 외부에서도 사용 가능)
// ============================================================================

/** 오늘 날짜 (YYYY-MM-DD, KST 기준) */
function getTodayString(): string {
  const now = new Date();
  // KST (UTC+9) 기준으로 날짜 계산 — UTC 자정 문제 방지
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

/** AsyncStorage에서 프리즈 데이터 조회 (Supabase 우선, 로컬 폴백) */
async function getFreezeData(): Promise<StreakFreezeData> {
  try {
    // 1. Supabase에서 먼저 조회 (서버 데이터가 진실의 원천)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_freeze_count, streak_freeze_last_used')
        .eq('id', user.id)
        .single();

      if (profile && profile.streak_freeze_count != null) {
        const serverData: StreakFreezeData = {
          count: profile.streak_freeze_count,
          lastUsedDate: profile.streak_freeze_last_used || null,
        };
        // 서버 데이터를 로컬에도 동기화
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
        return serverData;
      }
    }

    // 2. Supabase 실패 시 로컬 폴백
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return DEFAULT_DATA;
    return JSON.parse(json) as StreakFreezeData;
  } catch (error) {
    console.warn('[StreakFreeze] getFreezeData 에러:', error);
    // 네트워크 에러 시 로컬 데이터로 폴백
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) return JSON.parse(json) as StreakFreezeData;
    } catch { /* ignore */ }
    return DEFAULT_DATA;
  }
}

/** AsyncStorage + Supabase 양쪽에 프리즈 데이터 저장 */
async function saveFreezeData(data: StreakFreezeData): Promise<void> {
  try {
    // 로컬 저장 (즉시)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // 서버 저장 (백그라운드, 실패해도 무시)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({
          streak_freeze_count: data.count,
          streak_freeze_last_used: data.lastUsedDate,
        })
        .eq('id', user.id);
    }
  } catch (error) {
    console.warn('[StreakFreeze] saveFreezeData 에러:', error);
  }
}

// ============================================================================
// 훅
// ============================================================================

export function useStreakFreeze(): UseStreakFreezeReturn {
  const [data, setData] = useState<StreakFreezeData>(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const freezeData = await getFreezeData();
      setData(freezeData);
    } catch (error) {
      console.warn('[StreakFreeze] loadData 에러:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 마운트 시 자동 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── 프리즈 구매 (3크레딧 차감) ───
  const purchaseFreeze = useCallback(async (): Promise<PurchaseFreezeResult> => {
    try {
      // 1. 로그인 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.warn('[StreakFreeze] 인증 조회 실패:', authError.message);
        return {
          success: false,
          newFreezeCount: data.count,
          newCreditBalance: 0,
          errorMessage: '네트워크 연결을 확인해주세요.',
        };
      }

      if (!user) {
        return {
          success: false,
          newFreezeCount: data.count,
          newCreditBalance: 0,
          errorMessage: '로그인이 필요합니다.',
        };
      }

      // 2. 크레딧 차감 (spend_credits RPC)
      const { data: rpcData, error: rpcError } = await supabase.rpc('spend_credits', {
        p_user_id: user.id,
        p_amount: FREEZE_COST,
        p_feature_type: 'deep_dive', // 기존 AIFeatureType 중 가장 범용적 타입 사용
        p_feature_ref_id: `streak_freeze_${getTodayString()}`,
      });

      if (rpcError) {
        console.warn('[StreakFreeze] spend_credits RPC 실패:', rpcError.message);
        return {
          success: false,
          newFreezeCount: data.count,
          newCreditBalance: 0,
          errorMessage: rpcError.message,
        };
      }

      const row = rpcData?.[0];
      if (!row || !row.success) {
        return {
          success: false,
          newFreezeCount: data.count,
          newCreditBalance: row?.new_balance ?? 0,
          errorMessage: row?.error_message || '크레딧이 부족합니다.',
        };
      }

      // 3. 프리즈 수 증가 (AsyncStorage)
      const newCount = data.count + 1;
      const newData: StreakFreezeData = {
        ...data,
        count: newCount,
      };
      await saveFreezeData(newData);
      setData(newData);

      return {
        success: true,
        newFreezeCount: newCount,
        newCreditBalance: row.new_balance,
      };
    } catch (error) {
      console.warn('[StreakFreeze] purchaseFreeze 예외:', error);
      return {
        success: false,
        newFreezeCount: data.count,
        newCreditBalance: 0,
        errorMessage: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }, [data]);

  // ─── 프리즈 사용 (스트릭 끊길 때 자동 호출) ───
  const useFreeze = useCallback(async (): Promise<UseFreezeResult> => {
    try {
      const current = await getFreezeData();

      // 프리즈가 없으면 사용 불가
      if (current.count <= 0) {
        return { success: false, freezeUsed: false, remainingFreezes: 0 };
      }

      // 오늘 이미 사용했으면 중복 사용 방지
      const today = getTodayString();
      if (current.lastUsedDate === today) {
        return { success: true, freezeUsed: false, remainingFreezes: current.count };
      }

      // 프리즈 1개 소모 (음수 방지 가드)
      const newCount = Math.max(0, current.count - 1);
      const newData: StreakFreezeData = {
        count: newCount,
        lastUsedDate: today,
      };
      await saveFreezeData(newData);
      setData(newData);

      return { success: true, freezeUsed: true, remainingFreezes: newCount };
    } catch (error) {
      console.warn('[StreakFreeze] useFreeze 예외:', error);
      return { success: false, freezeUsed: false, remainingFreezes: data.count };
    }
  }, [data]);

  return {
    hasActiveFreeze: data.count > 0,
    freezeCount: data.count,
    lastUsedDate: data.lastUsedDate,
    isLoading,
    purchaseFreeze,
    useFreeze,
    refresh: loadData,
  };
}
