import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 1000 * 60 * 5, // 5분
      staleTime: 1000 * 60, // 1분
    },
    mutations: {
      retry: 1,
    },
  },
});

export default queryClient;
