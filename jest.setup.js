// Jest 설정 파일
// 모든 테스트 실행 전 초기화 작업을 수행합니다

// 글로벌 타임아웃 설정
jest.setTimeout(10000);

// 콘솔 경고 억제 (필요시)
global.console = {
  ...console,
  // error: jest.fn(), // 에러 로그를 완전히 숨기려면 주석 해제
  // warn: jest.fn(), // 경고 로그를 완전히 숨기려면 주석 해제
};

// React Native 환경 Mock
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper'); // 현재 설정에서는 불필요

// Expo 모듈 Mock
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key',
    },
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Supabase Mock
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}));

// Gemini AI Mock
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn(),
    })),
  })),
}));
