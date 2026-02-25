/**
 * 로그인 화면
 * 이메일/비밀번호 및 소셜 인증(Google, Kakao, Apple) 지원
 */

import React, { useState, useEffect } from 'react';
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
import { useLocale } from '../src/context/LocaleContext';

export default function LoginScreen() {
  const { signIn, signUp, signInWithOAuth, signInWithApple } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useLocale();
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
      Alert.alert(t('login.error.title'), t('login.error.email_required'));
      return;
    }

    if (!password.trim()) {
      Alert.alert(t('login.error.title'), t('login.error.password_required'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('login.error.title'), t('login.error.password_too_short'));
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
      const errorMessage = error?.message || t('login.error.auth_failed');

      let displayMessage = errorMessage;
      if (errorMessage.includes('Invalid login credentials')) {
        displayMessage = t('login.error.invalid_credentials');
      } else if (errorMessage.includes('User already registered')) {
        displayMessage = t('login.error.email_exists');
      } else if (errorMessage.includes('Email not confirmed')) {
        displayMessage = t('login.error.email_not_confirmed');
      }

      Alert.alert(t('login.error.title'), displayMessage);
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
        Alert.alert(t('login.error.social_login_title'), t('login.error.social_login_failed'));
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
      const errorMessage = error?.message || t('login.error.apple_login_failed');

      // 사용자 취소는 무시 (한국어/영어 모두 감지)
      if (errorMessage.includes('cancel') || errorMessage.includes('취소')) {
        return;
      }

      // 에러 메시지 매핑 (사용자 친화적)
      let displayMessage = errorMessage;
      if (errorMessage.includes('업데이트')) {
        displayMessage = t('login.error.apple_unavailable');
      } else if (errorMessage.includes('활성화')) {
        displayMessage = t('login.error.apple_disabled');
      }

      Alert.alert(t('login.error.apple_title'), displayMessage);
    } finally {
      setLoadingProvider(null);
    }
  };

  // Apple 로그인 네이티브 버튼 사용 가능 여부 (시뮬레이터에서는 false)
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAuthAvailable)
        .catch(() => setAppleAuthAvailable(false));
    }
  }, []);

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
                ? t('login.subtitle_signup')
                : t('login.subtitle_signin')}
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
                  <Text style={styles.googleButtonText}>{t('login.google_button')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 카카오 로그인 — 한국어 사용자만 표시 (Kakao는 한국 전용 서비스) */}
            {language === 'ko' && (
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
                    <Text style={styles.kakaoButtonText}>{t('login.kakao_button')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Apple 로그인 (iOS에서만 표시) */}
            {Platform.OS === 'ios' && (
              loadingProvider === 'apple' ? (
                <View style={[styles.socialButton, styles.appleButton]}>
                  <ActivityIndicator color="#000000" size="small" />
                </View>
              ) : appleAuthAvailable ? (
                // 실제 기기: Apple 공식 네이티브 버튼 (Apple HIG 준수)
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={SIZES.rMd}
                  style={styles.appleOfficialButton}
                  onPress={handleAppleLogin}
                />
              ) : (
                // 시뮬레이터 등 네이티브 버튼 불가: 커스텀 폴백 버튼
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton]}
                  onPress={handleAppleLogin}
                  disabled={isAnyLoading}
                >
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.appleButtonText}>{t('login.apple_button')}</Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* 구분선 */}
          <View style={styles.dividerSection}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>{t('login.divider_text')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* 이메일 입력 필드 */}
          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('login.email_label')}</Text>
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
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('login.password_label')}</Text>
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
                  {isSignUpMode ? t('login.signup_button') : t('login.signin_button')}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.toggleSection}>
              <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                {isSignUpMode ? t('login.already_have_account') : t('login.no_account')}
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
                  {isSignUpMode ? t('login.toggle_signin') : t('login.toggle_signup')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 하단 안내 — 약관/개인정보 링크 (Apple 심사 요구) */}
          <View style={styles.footerSection}>
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              {t('login.footer_prefix')}
              <Text
                style={[styles.footerLink, { color: colors.primary }]}
                onPress={() => router.push('/settings/terms')}
              >
                {t('login.terms_link')}
              </Text>
              {t('login.footer_and')}
              <Text
                style={[styles.footerLink, { color: colors.primary }]}
                onPress={() => router.push('/settings/privacy')}
              >
                {t('login.privacy_link')}
              </Text>
              {t('login.footer_suffix')}
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
  // Apple 버튼 (로딩 상태 + 시뮬레이터 폴백)
  appleButton: {
    backgroundColor: '#FFFFFF',
    height: 50,
  },
  appleIcon: {
    fontSize: 19,
    color: '#000000',
  },
  appleButtonText: {
    fontSize: SIZES.fBase,
    fontWeight: '600',
    color: '#000000',
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
