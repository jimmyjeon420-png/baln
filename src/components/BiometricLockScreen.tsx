/**
 * 생체인증 잠금 화면
 * - 앱 복귀 시 전체화면 오버레이로 표시
 * - 생체인증 성공 시 해제
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authenticateWithBiometric, getBiometricTypeName } from '../services/biometric';
import { useTheme } from '../hooks/useTheme';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

export default function BiometricLockScreen({ onUnlock }: BiometricLockScreenProps) {
  const { colors } = useTheme();
  const [biometricName, setBiometricName] = useState('생체 인증');
  const [authFailed, setAuthFailed] = useState(false);
  const isAuthenticating = useRef(false); // 중복 인증 방지 가드

  useEffect(() => {
    getBiometricTypeName().then(setBiometricName);
    // 마운트 시 자동으로 인증 시도 (1회만)
    handleAuthenticate();
  }, []);

  const handleAuthenticate = useCallback(async () => {
    // 이미 Face ID 진행 중이면 무시 (무한 루프 방지)
    if (isAuthenticating.current) return;
    isAuthenticating.current = true;

    setAuthFailed(false);
    const success = await authenticateWithBiometric();
    isAuthenticating.current = false;

    if (success) {
      onUnlock();
    } else {
      setAuthFailed(true);
    }
  }, [onUnlock]);

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      {/* 앱 로고 영역 */}
      <View style={styles.logoArea}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <Ionicons name="lock-closed" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.appName, { color: colors.textPrimary }]}>bal<Text style={{ color: colors.primary }}>n</Text></Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>앱이 잠겨 있습니다</Text>
      </View>

      {/* 인증 버튼 */}
      <View style={styles.actionArea}>
        {authFailed && (
          <Text style={[styles.errorText, { color: colors.error }]}>인증에 실패했습니다</Text>
        )}
        <TouchableOpacity style={[styles.unlockButton, { backgroundColor: colors.primary }]} onPress={handleAuthenticate}>
          <Ionicons
            name={biometricName === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
            size={28}
            color="#FFFFFF"
          />
          <Text style={styles.unlockText}>
            {authFailed ? '다시 시도' : `${biometricName}(으)로 잠금 해제`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 60,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  appName: {
    fontSize: 25,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
  },
  actionArea: {
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    marginBottom: 16,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  unlockText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
