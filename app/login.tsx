/**
 * 로그인 화면
 * 이메일/비밀번호 및 소셜 인증(Google, Kakao, Apple) 지원
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, OAuthProvider } from '../src/context/AuthContext';
import { COLORS, SIZES } from '../src/styles/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp, signInWithOAuth } = useAuth();

  // 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

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
        Alert.alert(
          '성공',
          '회원가입되었습니다. 로그인해주세요.',
          [{ text: '확인', onPress: () => setIsSignUpMode(false) }]
        );
        setEmail('');
        setPassword('');
      } else {
        await signIn(email, password);
        router.replace('/(tabs)');
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
      router.replace('/(tabs)');
    } catch (error: any) {
      const errorMessage = error?.message || `${provider} 로그인 실패`;

      if (!errorMessage.includes('cancel')) {
        Alert.alert('소셜 로그인 오류', errorMessage);
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  /**
   * Apple 로그인 플레이스홀더 (준비 중)
   */
  const handleAppleLogin = () => {
    Alert.alert(
      'Apple 로그인',
      'Apple 로그인은 현재 준비 중입니다.\n곧 지원될 예정입니다.',
      [{ text: '확인' }]
    );
  };

  const isAnyLoading = isLoading || loadingProvider !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>스마트 리밸런서</Text>
            <Text style={styles.subtitle}>
              {isSignUpMode
                ? '계정을 만들어 시작하세요'
                : '포트폴리오 최적화를 시작하세요'}
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

            {/* Apple 로그인 (iOS에서만 표시, 플레이스홀더) */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                onPress={handleAppleLogin}
                disabled={isAnyLoading}
              >
                <Text style={styles.appleIcon}></Text>
                <Text style={styles.appleButtonText}>Apple로 시작하기</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 구분선 */}
          <View style={styles.dividerSection}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는 이메일로</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 이메일 입력 필드 */}
          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                editable={!isAnyLoading}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                editable={!isAnyLoading}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
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
                <ActivityIndicator color={COLORS.background} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUpMode ? '회원가입' : '로그인'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.toggleSection}>
              <Text style={styles.toggleText}>
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

          {/* 하단 안내 */}
          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              계정을 만들면 이용약관 및 개인정보처리방침에 동의하게 됩니다
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.fBase,
    color: COLORS.textSecondary,
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
    fontSize: 18,
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
    fontSize: 18,
  },
  kakaoButtonText: {
    fontSize: SIZES.fBase,
    fontWeight: '600',
    color: '#000000',
  },

  // Apple 버튼
  appleButton: {
    backgroundColor: '#000000',
  },
  appleIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  appleButtonText: {
    fontSize: SIZES.fBase,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: SIZES.fSm,
    color: COLORS.textTertiary,
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
    color: COLORS.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.rMd,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    fontSize: SIZES.fBase,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },

  // 버튼 섹션
  buttonSection: {
    gap: SIZES.lg,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.background,
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
    color: COLORS.textSecondary,
  },
  toggleButton: {
    fontSize: SIZES.fSm,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // 하단 섹션
  footerSection: {
    marginTop: SIZES.xxxl,
  },
  footerText: {
    fontSize: SIZES.fXs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
