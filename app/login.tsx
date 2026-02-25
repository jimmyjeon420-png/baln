/**
 * 로그인 화면
 * 이메일/비밀번호 및 소셜 인증(Google, Kakao, Apple) 지원
 */

import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth, OAuthProvider } from '../src/context/AuthContext';
import { SIZES } from '../src/styles/theme';
import { useTheme } from '../src/hooks/useTheme';
import queryClient from '../src/services/queryClient';

export default function LoginScreen() {
  const { signIn, signUp, signInWithOAuth, signInWithApple } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  // 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | 'apple' | null>(null);

  /**
   * 이메일 로그인/회원가입 처리
   */
  const handleAuth = async () => {
    if (!email.trim()) {
      Alert.alert('오류', '이메일을 입력해주세요');
      return;
    }

    if (!password.trim()) {
      Alert.alert('오류', '비밀번호를 입력해주세요');
      return;
    }

    if (password.length < 6) {
      Alert.alert('오류', '비밀번호는 6자 이상이어야 합니다');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUpMode) {
        await signUp(email, password);
        // 가입 성공 → 즉시 자동 로그인 (AuthGate가 온보딩으로 라우팅)
        await signIn(email, password);
        // 새 사용자이므로 이전 캐시 데이터 제거
        queryClient.clear();
      } else {
        await signIn(email, password);
        // 이전 세션의 캐시된 데이터 제거 후 새로 로드
        // 라우팅은 AuthGate가 단일 처리 (온보딩/메인 분기)
        queryClient.clear();
      }
    } catch (error: any) {
      const errorMessage = error?.message || '인증 실패';

      let displayMessage = errorMessage;
      if (errorMessage.includes('Invalid login credentials')) {
        displayMessage = '이메일 또는 비밀번호가 올바르지 않습니다';
      } else if (errorMessage.includes('User already registered')) {
        displayMessage = '이미 등록된 이메일입니다';
      } else if (errorMessage.includes('Email not confirmed')) {
        displayMessage = '이메일 인증이 필요합니다';
      }

      Alert.alert('오류', displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 소셜 로그인 처리
   */
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setLoadingProvider(provider);

    try {
      await signInWithOAuth(provider);
      // 이전 세션의 캐시된 데이터 제거 후 새로 로드
      // 라우팅은 AuthGate가 단일 처리
      queryClient.clear();
    } catch (error: any) {
      const errorMessage = error?.message || '';

      if (!errorMessage.includes('cancel')) {
        console.warn(`[로그인] ${provider} OAuth 오류:`, errorMessage);
        Alert.alert('소셜 로그인 오류', '소셜 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  /**
   * Apple 네이티브 로그인 처리 (iOS 전용)
   */
  const handleAppleLogin = async () => {
    setLoadingProvider('apple');

    try {
      await signInWithApple();
      // 이전 세션의 캐시된 데이터 제거 후 새로 로드
      // 라우팅은 AuthGate가 단일 처리
      queryClient.clear();
    } catch (error: any) {
      const errorMessage = error?.message || 'Apple 로그인 실패';

      // 사용자 취소는 무시 (한국어/영어 모두 감지)
      if (errorMessage.includes('cancel') || errorMessage.includes('취소')) {
        return;
      }

      // 에러 메시지 매핑 (사용자 친화적)
      let displayMessage = errorMessage;
      if (errorMessage.includes('업데이트')) {
        displayMessage = '현재 빌드에서 Apple 로그인을 사용할 수 없습니다.\n앱을 최신 버전으로 업데이트해주세요.';
      } else if (errorMessage.includes('활성화')) {
        displayMessage = 'Apple 로그인을 사용할 수 없습니다.\n다른 로그인 방법을 이용해주세요.';
      }

      Alert.alert('Apple 로그인 오류', displayMessage);
    } finally {
      setLoadingProvider(null);
    }
  };

  const isAnyLoading = isLoading || loadingProvider !== null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>baln</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isSignUpMode
                ? '계정을 만들어 시작하세요'
                : '매일 5분, 바른 투자 습관'}
            </Text>
          </View>

          {/* 소셜 로그인 버튼 */}
          <View style={styles.socialSection}>
            {/* 구글 로그인 */}
            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton]}
              onPress={() => handleOAuthLogin('google')}
              disabled={isAnyLoading}
            >
              {loadingProvider === 'google' ? (
                <ActivityIndicator color="#4285F4" size="small" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>구글로 시작하기</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 카카오 로그인 */}
            <TouchableOpacity
              style={[styles.socialButton, styles.kakaoButton]}
              onPress={() => handleOAuthLogin('kakao')}
              disabled={isAnyLoading}
            >
              {loadingProvider === 'kakao' ? (
                <ActivityIndicator color="#3C1E1E" size="small" />
              ) : (
                <>
                  <Text style={styles.kakaoIcon}>💬</Text>
                  <Text style={styles.kakaoButtonText}>카카오로 시작하기</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple 로그인 (iOS에서만 표시) — Apple 공식 버튼 컴포넌트 사용 */}
            {Platform.OS === 'ios' && (
              loadingProvider === 'apple' ? (
                <View style={[styles.socialButton, styles.appleButton]}>
                  <ActivityIndicator color="#000000" size="small" />
                </View>
              ) : (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={SIZES.rMd}
                  style={styles.appleOfficialButton}
                  onPress={handleAppleLogin}
                />
              )
            )}
          </View>

          {/* 구분선 */}
          <View style={styles.dividerSection}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>또는 이메일로</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* 이메일 입력 필드 */}
          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>이메일</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
                placeholder="your@email.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                editable={!isAnyLoading}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>비밀번호</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                editable={!isAnyLoading}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleAuth}
              />
            </View>
          </View>

          {/* 버튼 */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.primaryButton, isAnyLoading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={isAnyLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUpMode ? '회원가입' : '로그인'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.toggleSection}>
              <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                {isSignUpMode ? '이미 계정이 있나요?' : '계정이 없나요?'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSignUpMode(!isSignUpMode);
                  setEmail('');
                  setPassword('');
                }}
                disabled={isAnyLoading}
              >
                <Text style={styles.toggleButton}>
                  {isSignUpMode ? '로그인' : '회원가입'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 하단 안내 — 약관/개인정보 링크 (Apple 심사 요구) */}
          <View style={styles.footerSection}>
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              계정을 만들면{' '}
              <Text
                style={[styles.footerLink, { color: colors.primary }]}
                onPress={() => router.push('/settings/terms')}
              >
                이용약관
              </Text>
              {' '}및{' '}
              <Text
                style={[styles.footerLink, { color: colors.primary }]}
                onPress={() => router.push('/settings/privacy')}
              >
                개인정보처리방침
              </Text>
              에 동의하게 됩니다
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xl,
    justifyContent: 'center',
  },

  // 헤더 섹션
  headerSection: {
    marginBottom: SIZES.xxxl,
  },
  title: {
    fontSize: SIZES.fXxxl,
    fontWeight: '700',
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.fBase,
    textAlign: 'center',
  },

  // 소셜 로그인 섹션
  socialSection: {
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: SIZES.rMd,
    gap: SIZES.sm,
  },

  // 구글 버튼
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  googleIcon: {
    fontSize: 19,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: SIZES.fBase,
    fontWeight: '500',
    color: '#1F1F1F',
  },

  // 카카오 버튼
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  kakaoIcon: {
    fontSize: 19,
  },
  kakaoButtonText: {
    fontSize: SIZES.fBase,
    fontWeight: '600',
    color: '#000000',
  },

  // Apple 공식 버튼 — Apple HIG 자동 준수
  appleOfficialButton: {
    width: '100%',
    height: 50,
  },
  // Apple 로딩 상태용 플레이스홀더
  appleButton: {
    backgroundColor: '#FFFFFF',
    height: 50,
  },

  // 구분선 섹션
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.lg,
    gap: SIZES.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: SIZES.fSm,
  },

  // 입력 폼 섹션
  formSection: {
    gap: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  inputContainer: {
    gap: SIZES.sm,
  },
  label: {
    fontSize: SIZES.fSm,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.rMd,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    fontSize: SIZES.fBase,
  },

  // 버튼 섹션
  buttonSection: {
    gap: SIZES.lg,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.rMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: SIZES.fBase,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // 토글 섹션
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  toggleText: {
    fontSize: SIZES.fSm,
  },
  toggleButton: {
    fontSize: SIZES.fSm,
    fontWeight: '600',
    color: '#4CAF50',
  },

  // 하단 섹션
  footerSection: {
    marginTop: SIZES.xxxl,
  },
  footerText: {
    fontSize: SIZES.fXs,
    textAlign: 'center',
    lineHeight: 19,
  },
  footerLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
