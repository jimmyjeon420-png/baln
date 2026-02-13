import { QueryClient } from '@tanstack/react-query';

/**
 * React Query 클라이언트 싱글턴
 *
 * 앱 전체에서 하나의 인스턴스를 공유합니다.
 * _layout.tsx의 PersistQueryClientProvider와 AuthContext의 signOut에서 모두 사용합니다.
 *
 * - staleTime: 5분 (이 시간 내 동일 쿼리 재요청 안 함)
 * - gcTime: 24시간 (AsyncStorage 영속 캐시와 수명 동기화)
 * - retry: 2회
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,          // 5분
      gcTime: 1000 * 60 * 60 * 24,       // 24시간
      retry: 2,
    },
  },
});

export default queryClient;
