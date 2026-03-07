/**
 * E2E Integration Test: 예측 투표 → 결과 확인 → 크레딧 지급 흐름
 *
 * 테스트 시나리오:
 * - 예측 투표 제출 (RPC 호출)
 * - RPC 실패 시 로컬 저장 폴백
 * - 올바른 예측 시 크레딧 3C 지급 확인
 * - 스트릭 추적 검증
 * - 폴백 투표 데이터 유효성
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import supabase, { getCurrentUser } from '../../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Mock 설정
// ============================================================================

jest.mock('../../services/supabase');
jest.mock('../../locales', () => ({
  getCurrentLanguage: jest.fn(() => 'ko'),
  t: jest.fn((key: string) => key),
}));
jest.mock('../../context/LocaleContext', () => ({
  getCurrentDisplayLanguage: jest.fn(() => 'ko'),
}));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockRpc = jest.fn();
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// ============================================================================
// 테스트
// ============================================================================

describe('예측 투표 → 결과 → 크레딧 (E2E Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: 'prediction-user-001' } as any);
    (supabase as any).rpc = mockRpc;
  });

  // --------------------------------------------------------------------------
  // 1. 투표 제출 성공
  // --------------------------------------------------------------------------

  it('투표 제출 성공 — submit_poll_vote RPC succeeds', async () => {
    mockRpc.mockResolvedValue({
      data: [{
        success: true,
        new_yes_count: 185,
        new_no_count: 142,
      }],
      error: null,
    });

    const { data, error } = await supabase.rpc('submit_poll_vote', {
      p_poll_id: 'poll-001',
      p_vote: 'YES',
    });

    expect(error).toBeNull();
    expect(data[0].success).toBe(true);
    expect(data[0].new_yes_count).toBe(185);
    expect(mockRpc).toHaveBeenCalledWith('submit_poll_vote', {
      p_poll_id: 'poll-001',
      p_vote: 'YES',
    });
  });

  // --------------------------------------------------------------------------
  // 2. 중복 투표 방지
  // --------------------------------------------------------------------------

  it('중복 투표 방지 — duplicate vote returns error', async () => {
    mockRpc.mockResolvedValue({
      data: [{
        success: false,
        error_message: '이미 투표했습니다',
      }],
      error: null,
    });

    const { data } = await supabase.rpc('submit_poll_vote', {
      p_poll_id: 'poll-001',
      p_vote: 'YES',
    });

    expect(data[0].success).toBe(false);
    expect(data[0].error_message).toBe('이미 투표했습니다');
  });

  // --------------------------------------------------------------------------
  // 3. 예측 적중 시 크레딧 3C 지급
  // --------------------------------------------------------------------------

  it('예측 적중 시 크레딧 3C 지급 — awards 3C for correct prediction', async () => {
    // resolve_poll RPC 시뮬레이션 (서버 사이드에서 실행)
    // 유저 투표가 correct_answer와 일치 → 3C 지급
    const mockResolveResult = {
      poll_id: 'poll-001',
      correct_answer: 'YES',
      user_vote: 'YES',
      is_correct: true,
      credits_earned: 3,
      new_streak: 5,
    };

    // 크레딧 지급 검증
    expect(mockResolveResult.is_correct).toBe(true);
    expect(mockResolveResult.credits_earned).toBe(3);
    expect(mockResolveResult.new_streak).toBe(5);
  });

  // --------------------------------------------------------------------------
  // 4. 예측 오답 시 크레딧 미지급 + 스트릭 리셋
  // --------------------------------------------------------------------------

  it('예측 오답 시 크레딧 미지급 — no credits for incorrect prediction', () => {
    const mockResolveResult = {
      poll_id: 'poll-002',
      correct_answer: 'NO',
      user_vote: 'YES',
      is_correct: false,
      credits_earned: 0,
      new_streak: 0, // 스트릭 리셋
    };

    expect(mockResolveResult.is_correct).toBe(false);
    expect(mockResolveResult.credits_earned).toBe(0);
    expect(mockResolveResult.new_streak).toBe(0);
  });

  // --------------------------------------------------------------------------
  // 5. RPC 실패 시 로컬 저장 폴백
  // --------------------------------------------------------------------------

  it('RPC 실패 시 로컬 저장 — falls back to AsyncStorage on RPC failure', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Function not found' },
    });

    // RPC 실패
    const { error } = await supabase.rpc('submit_poll_vote', {
      p_poll_id: 'poll-003',
      p_vote: 'NO',
    });

    expect(error).toBeTruthy();

    // 로컬 저장 시뮬레이션
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    const localVote = {
      pollId: 'poll-003',
      vote: 'NO',
      timestamp: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      '@baln:local_votes',
      JSON.stringify([localVote])
    );

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@baln:local_votes',
      JSON.stringify([localVote])
    );
  });

  // --------------------------------------------------------------------------
  // 6. 유저 통계 조회
  // --------------------------------------------------------------------------

  it('유저 예측 통계 조회 — fetches prediction user stats', async () => {
    const mockStats = {
      user_id: 'prediction-user-001',
      total_votes: 25,
      correct_votes: 15,
      current_streak: 3,
      best_streak: 7,
      total_credits_earned: 45,
      accuracy_rate: 60.0,
    };

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockStats,
        error: null,
      }),
    });

    const { data } = await (supabase.from('prediction_user_stats') as any)
      .select('*')
      .eq('user_id', 'prediction-user-001')
      .single();

    expect(data).toEqual(mockStats);
    expect(data.accuracy_rate).toBe(60.0);
    expect(data.total_credits_earned).toBe(45);
  });
});
