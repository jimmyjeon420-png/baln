/**
 * 생체인증 잠금 화면
 * - 앱 복귀 시 전체화면 오버레이로 표시
 * - 생체인증 성공 시 해제
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authenticateWithBiometric, getBiometricTypeName } from '../services/biometric';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

export default function BiometricLockScreen({ onUnlock }: BiometricLockScreenProps) {
  const [biometricName, setBiometricName] = useState('생체 인증');
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    getBiometricTypeName().then(setBiometricName);
    // 마운트 시 자동으로 인증 시도
    handleAuthenticate();
  }, []);

  const handleAuthenticate = async () => {
    setAuthFailed(false);
    const success = await authenticateWithBiometric();
    if (success) {
      onUnlock();
    } else {
      setAuthFailed(true);
    }
  };

  return (
    <View style={styles.overlay}>
      {/* 앱 로고 영역 */}
      <View style={styles.logoArea}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={48} color="#4CAF50" />
        </View>
        <Text style={styles.appName}>Smart Rebalancer</Text>
        <Text style={styles.subtitle}>앱이 잠겨 있습니다</Text>
      </View>

      {/* 인증 버튼 */}
      <View style={styles.actionArea}>
        {authFailed && (
          <Text style={styles.errorText}>인증에 실패했습니다</Text>
        )}
        <TouchableOpacity style={styles.unlockButton} onPress={handleAuthenticate}>
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
    backgroundColor: '#121212',
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
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
  },
  actionArea: {
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#CF6679',
    marginBottom: 16,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  unlockText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
