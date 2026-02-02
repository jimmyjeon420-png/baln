/**
 * 로그인 화면
 * 이메일과 비밀번호로 인증
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SIZES, TYPOGRAPHY } from '../src/styles/theme';
import i18n from '../src/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  // 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  /**
   * 로그인/회원가입 처리
   */
  const handleAuth = async () => {
    // 입력값 검증
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
        // 회원가입
        await signUp(email, password);
        Alert.alert(
          '성공',
          '회원가입되었습니다. 로그인해주세요.',
          [{ text: '확인', onPress: () => setIsSignUpMode(false) }]
        );
        setEmail('');
        setPassword('');
      } else {
        // 로그인
        await signIn(email, password);
        // 로그인 성공 시 자동으로 (tabs) 로 리다이렉트됨
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      // 에러 메시지 출력
      const errorMessage = error?.message || '인증 실패';

      // 사용자 친화적인 에러 메시지
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

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          {/* 제목 */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>스마트 리밸런서</Text>
            <Text style={styles.subtitle}>
              {isSignUpMode
                ? '계정을 만들어 시작하세요'
                : '포트폴리오 최적화를 시작하세요'}
            </Text>
          </View>

          {/* 입력 필드 */}
          <View style={styles.formSection}>
            {/* 이메일 입력 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* 비밀번호 입력 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
            </View>
          </View>

          {/* 버튼 */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.background} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUpMode ? '회원가입' : '로그인'}
                </Text>
              )}
            </TouchableOpacity>

            {/* 회원가입 토글 */}
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
                disabled={isLoading}
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
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.lg,
    justifyContent: 'space-between',
    paddingVertical: SIZES.xl,
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

  // 입력 폼 섹션
  formSection: {
    gap: SIZES.lg,
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
    marginTop: SIZES.xl,
  },
  footerText: {
    fontSize: SIZES.fXs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
