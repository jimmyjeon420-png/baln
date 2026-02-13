/**
 * @deprecated 이 파일은 더 이상 사용하지 않습니다.
 * 대신 src/locales/index.ts를 사용하세요.
 * 글로벌 버전 준비 시 이 파일을 삭제할 예정입니다.
 *
 * Migration: import { t } from '../locales' 로 교체
 *
 * 현재 이 파일을 import하는 곳:
 * - app/(tabs)/journal.tsx (→ import { t } from '../../src/locales' 로 전환 필요)
 */
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

// 한글 번역
const ko = {
  // 탭 메뉴
  home: '홈',
  insight: '인사이트',
  invest: '투자',
  coach: '코치',
  menu: '메뉴',
  portfolio: '포트폴리오',
  rebalance: '리밸런싱',
  analytics: '분석',
  settings: '설정',
  logout: '로그아웃',

  // 로그인 화면
  login: '로그인',
  signup: '회원가입',
  email: '이메일',
  password: '비밀번호',
  signInSubtitle: '매일 5분, 바른 투자 습관',
  signUpSubtitle: '계정을 만들어 시작하세요',
  alreadyHaveAccount: '이미 계정이 있나요?',
  noAccount: '계정이 없나요?',
  passwordMin: '비밀번호는 6자 이상이어야 합니다',
  authAgreement: '계정을 만들면 이용약관 및 개인정보처리방침에 동의하게 됩니다',
  currentAccount: '현재 계정:',
  signOutConfirm: '정말 로그아웃하시겠습니까?',
};

// 영어 번역
const en = {
  // Tab menu
  home: 'Home',
  insight: 'Insight',
  invest: 'Invest',
  coach: 'Coach',
  menu: 'Menu',
  portfolio: 'Portfolio',
  rebalance: 'Rebalancing',
  analytics: 'Analytics',
  settings: 'Settings',
  logout: 'Logout',

  // Login screen
  login: 'Sign In',
  signup: 'Sign Up',
  email: 'Email',
  password: 'Password',
  signInSubtitle: 'Smart investing habits in 5 min a day',
  signUpSubtitle: 'Create an account to get started',
  alreadyHaveAccount: 'Already have an account?',
  noAccount: "Don't have an account?",
  passwordMin: 'Password must be at least 6 characters',
  authAgreement: 'By creating an account, you agree to our Terms of Service and Privacy Policy',
  currentAccount: 'Current account:',
  signOutConfirm: 'Are you sure you want to sign out?',
};

// i18n 인스턴스 생성 및 설정
const i18n = new I18n({
  ko,
  en,
});

// 기본 언어 설정 (디바이스 언어)
const deviceLanguage = getLocales()[0]?.languageCode || 'en';
i18n.locale = deviceLanguage.startsWith('ko') ? 'ko' : 'en';

// 폴백 설정
i18n.enableFallback = true;

export default i18n;
