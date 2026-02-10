/**
 * accountDeletion.ts - 계정 삭제 및 데이터 내보내기 서비스
 *
 * 역할: "퇴사 처리 부서"
 * - 유저가 탈퇴를 원할 때, 모든 관련 데이터를 정리하고 로그아웃 처리
 * - GDPR/개인정보보호법 대응: 유저 데이터를 JSON으로 내보내기
 *
 * Apple App Store 필수 요건:
 * - 계정 삭제 기능이 없으면 심사 거절됨
 * - 클라이언트에서는 auth.admin 사용 불가 → 데이터 테이블만 삭제 후 signOut
 *
 * 삭제 순서 (외래키 의존성 고려):
 * 1. 댓글/좋아요 등 자식 테이블 먼저
 * 2. 게시글/투표 등 중간 테이블
 * 3. 포트폴리오/크레딧 등 핵심 테이블
 * 4. 프로필 (최상위 테이블)
 * 5. AsyncStorage 전체 클리어
 * 6. Supabase auth.signOut()
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabase';

// ============================================================================
// 타입 정의
// ============================================================================

/** 삭제 결과 */
interface DeletionResult {
  success: boolean;
  error?: string;
  deletedTables: string[];
  failedTables: string[];
}

/** 내보내기 데이터 */
interface ExportedData {
  exportDate: string;
  userId: string;
  email: string;
  profile: any;
  portfolios: any[];
  credits: any;
  creditTransactions: any[];
  predictionVotes: any[];
  predictionStats: any;
  communityPosts: any[];
  communityComments: any[];
  communityLikes: any[];
  streakData: any;
  notificationSettings: any;
}

// ============================================================================
// 삭제 대상 테이블 목록 (삭제 순서 = 외래키 의존성 역순)
// ============================================================================

/**
 * 유저 데이터가 있는 테이블 목록
 * 순서가 중요! 자식 테이블 → 부모 테이블 순으로 삭제해야 외래키 에러 방지
 */
// 핵심 테이블 목록 (이것들이 실패하면 삭제 프로세스 즉시 중단)
// 포트폴리오, 크레딧, 프로필은 유저의 핵심 자산 데이터이므로
// 삭제 실패 시 부분 삭제 상태로 방치하면 안 됨
const CRITICAL_TABLES = ['portfolios', 'user_credits', 'profiles'];

const USER_TABLES_IN_DELETE_ORDER = [
  // 1단계: 자식 테이블 (다른 테이블 참조)
  'community_likes',
  'community_comments',
  'credit_transactions',
  'ai_chat_messages',
  'ai_feature_results',

  // 2단계: 중간 테이블
  'community_posts',
  'prediction_votes',
  'prediction_user_stats',

  // 3단계: 핵심 테이블
  'portfolios',
  'portfolio_snapshots',
  'user_credits',
  'guru_insights',         // 유저별 데이터가 있다면
  'deposit_events',

  // 4단계: 프로필 (최후에 삭제)
  'profiles',
];

// ============================================================================
// 데이터 내보내기 함수
// ============================================================================

/**
 * exportUserData - 유저의 모든 데이터를 JSON으로 내보내기
 *
 * GDPR/개인정보보호법 대응:
 * - 유저는 자신의 데이터를 언제든 다운로드할 권리가 있음
 * - JSON 형태로 정리하여 반환
 *
 * @param userId - Supabase auth 유저 ID
 * @param email - 유저 이메일
 * @returns 내보내기 데이터 객체
 */
export async function exportUserData(
  userId: string,
  email: string
): Promise<ExportedData> {
  // 각 테이블에서 유저 데이터 조회 (병렬 실행으로 속도 향상)
  const [
    profileResult,
    portfoliosResult,
    creditsResult,
    creditTxResult,
    predVotesResult,
    predStatsResult,
    postsResult,
    commentsResult,
    likesResult,
  ] = await Promise.allSettled([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('portfolios').select('*').eq('user_id', userId),
    supabase.from('user_credits').select('*').eq('user_id', userId).single(),
    supabase.from('credit_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('prediction_votes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('prediction_user_stats').select('*').eq('user_id', userId).single(),
    supabase.from('community_posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('community_comments').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('community_likes').select('*').eq('user_id', userId),
  ]);

  // Promise.allSettled 결과에서 안전하게 데이터 추출
  const safeGet = (result: PromiseSettledResult<any>, fallback: any = null) => {
    if (result.status === 'fulfilled' && result.value?.data) {
      return result.value.data;
    }
    return fallback;
  };

  // AsyncStorage에서 스트릭/알림 데이터도 포함
  let streakData = null;
  let notificationSettings = null;
  try {
    const streakRaw = await AsyncStorage.getItem('@baln:streak_data');
    streakData = streakRaw ? JSON.parse(streakRaw) : null;
  } catch { /* 스트릭 데이터 없음 — 무시 */ }

  try {
    const notifRaw = await AsyncStorage.getItem('@baln:notification_settings');
    notificationSettings = notifRaw ? JSON.parse(notifRaw) : null;
  } catch { /* 알림 설정 없음 — 무시 */ }

  return {
    exportDate: new Date().toISOString(),
    userId,
    email,
    profile: safeGet(profileResult),
    portfolios: safeGet(portfoliosResult, []),
    credits: safeGet(creditsResult),
    creditTransactions: safeGet(creditTxResult, []),
    predictionVotes: safeGet(predVotesResult, []),
    predictionStats: safeGet(predStatsResult),
    communityPosts: safeGet(postsResult, []),
    communityComments: safeGet(commentsResult, []),
    communityLikes: safeGet(likesResult, []),
    streakData,
    notificationSettings,
  };
}

// ============================================================================
// 계정 삭제 함수
// ============================================================================

/**
 * deleteUserAccount - 유저의 모든 데이터를 삭제하고 로그아웃
 *
 * 처리 순서:
 * 1. 각 테이블에서 user_id 기준으로 데이터 삭제
 * 2. AsyncStorage의 @baln:* 키 전부 삭제
 * 3. Supabase auth.signOut() 호출
 *
 * 주의:
 * - auth.admin.deleteUser()는 서버 사이드(Edge Function)에서만 가능
 * - 클라이언트에서는 데이터 테이블 삭제 + signOut으로 처리
 * - auth 레코드 완전 삭제가 필요하면 나중에 Edge Function 추가 가능
 *
 * @param userId - Supabase auth 유저 ID
 * @returns 삭제 결과
 */
export async function deleteUserAccount(userId: string): Promise<DeletionResult> {
  const deletedTables: string[] = [];
  const failedTables: string[] = [];

  // 1단계: 각 테이블에서 유저 데이터 삭제
  for (const table of USER_TABLES_IN_DELETE_ORDER) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(table === 'profiles' ? 'id' : 'user_id', userId);

      if (error) {
        console.warn(`[계정삭제] ${table} 삭제 실패:`, error.message);
        failedTables.push(table);

        // 핵심 테이블 실패 시 즉시 중단 — 부분 삭제 상태 방지
        if (CRITICAL_TABLES.includes(table)) {
          console.error(`[계정삭제] 핵심 테이블(${table}) 삭제 실패 — 프로세스 중단`);
          return {
            success: false,
            error: `핵심 데이터(${table}) 삭제에 실패했습니다. 다시 시도해주세요.`,
            deletedTables,
            failedTables,
          };
        }
      } else {
        deletedTables.push(table);
      }
    } catch (err) {
      console.warn(`[계정삭제] ${table} 삭제 중 예외:`, err);
      failedTables.push(table);

      // 핵심 테이블 예외 시에도 즉시 중단
      if (CRITICAL_TABLES.includes(table)) {
        console.error(`[계정삭제] 핵심 테이블(${table}) 삭제 중 예외 — 프로세스 중단`);
        return {
          success: false,
          error: `핵심 데이터(${table}) 삭제에 실패했습니다. 다시 시도해주세요.`,
          deletedTables,
          failedTables,
        };
      }
    }
  }

  // 2단계: AsyncStorage 전체 클리어 (@baln:* 키 + 기타 앱 키)
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    // @baln: 접두사 키 + 보상/퀴즈 관련 키 모두 삭제
    const balnKeys = allKeys.filter(
      (key) => key.startsWith('@baln:') || key.startsWith('reward_')
    );

    if (balnKeys.length > 0) {
      await AsyncStorage.multiRemove(balnKeys);
    }

    console.log(`[계정삭제] AsyncStorage ${balnKeys.length}개 키 삭제 완료`);
  } catch (err) {
    console.warn('[계정삭제] AsyncStorage 클리어 실패:', err);
    // AsyncStorage 실패는 치명적이지 않음 — 계속 진행
  }

  // 3단계: Supabase 로그아웃
  try {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('[계정삭제] 로그아웃 실패:', signOutError.message);
      return {
        success: false,
        error: `데이터 삭제는 완료했으나 로그아웃에 실패했습니다: ${signOutError.message}`,
        deletedTables,
        failedTables,
      };
    }
  } catch (err) {
    console.error('[계정삭제] 로그아웃 중 예외:', err);
    return {
      success: false,
      error: '로그아웃 처리 중 오류가 발생했습니다.',
      deletedTables,
      failedTables,
    };
  }

  console.log(`[계정삭제] 완료 — 삭제: ${deletedTables.length}개 테이블, 실패: ${failedTables.length}개`);

  return {
    success: true,
    deletedTables,
    failedTables,
  };
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * getUserDataSummary - 삭제 전 유저에게 보여줄 데이터 요약
 *
 * "이런 데이터가 영구 삭제됩니다" 안내용
 *
 * @param userId - Supabase auth 유저 ID
 * @returns 각 항목별 데이터 개수
 */
export async function getUserDataSummary(userId: string): Promise<{
  portfolioCount: number;
  predictionCount: number;
  postCount: number;
  commentCount: number;
  creditBalance: number;
  streakDays: number;
}> {
  const [
    portfolioResult,
    predictionResult,
    postResult,
    commentResult,
    creditResult,
  ] = await Promise.allSettled([
    supabase.from('portfolios').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('prediction_votes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('community_comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('user_credits').select('balance').eq('user_id', userId).single(),
  ]);

  // count 안전 추출
  const safeCount = (result: PromiseSettledResult<any>) => {
    if (result.status === 'fulfilled' && result.value?.count != null) {
      return result.value.count;
    }
    return 0;
  };

  // 크레딧 잔액
  let creditBalance = 0;
  if (creditResult.status === 'fulfilled' && creditResult.value?.data?.balance != null) {
    creditBalance = creditResult.value.data.balance;
  }

  // 스트릭
  let streakDays = 0;
  try {
    const streakRaw = await AsyncStorage.getItem('@baln:streak_data');
    if (streakRaw) {
      const parsed = JSON.parse(streakRaw);
      streakDays = parsed.currentStreak || 0;
    }
  } catch { /* 무시 */ }

  return {
    portfolioCount: safeCount(portfolioResult),
    predictionCount: safeCount(predictionResult),
    postCount: safeCount(postResult),
    commentCount: safeCount(commentResult),
    creditBalance,
    streakDays,
  };
}
