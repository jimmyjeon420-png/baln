/**
 * 보안 설정 화면
 * - 생체인증 ON/OFF (실제 Face ID/지문 연동)
 * - 자동 잠금 설정
 * - 계정 삭제는 전용 화면(delete-account.tsx)으로 이동
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  checkBiometricAvailable,
  getBiometricTypeName,
  authenticateWithBiometric,
  getBiometricSettings,
  saveBiometricSettings,
} from '../../src/services/biometric';

export default function SecurityScreen() {
  const router = useRouter();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLock, setAutoLock] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricName, setBiometricName] = useState('생체 인증');
  const [loading, setLoading] = useState(true);

  // 화면 진입 시 설정 로드 + 기기 지원 여부 확인
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const [available, name, settings] = await Promise.all([
          checkBiometricAvailable(),
          getBiometricTypeName(),
          getBiometricSettings(),
        ]);
        setBiometricAvailable(available);
        setBiometricName(name);
        setBiometricEnabled(settings.biometricEnabled && available);
        setAutoLock(settings.autoLockEnabled);
        setLoading(false);
      };
      init();
    }, [])
  );

  // 생체인증 토글 핸들러
  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // 켤 때: 먼저 생체인증으로 본인 확인
      const success = await authenticateWithBiometric();
      if (!success) {
        Alert.alert('인증 실패', '생체 인증에 실패했습니다. 다시 시도해주세요.');
        return; // 토글 상태 유지 (OFF)
      }
      setBiometricEnabled(true);
      await saveBiometricSettings({ biometricEnabled: true, autoLockEnabled: autoLock });
      Alert.alert('활성화 완료', `${biometricName}이(가) 활성화되었습니다.`);
    } else {
      // 끌 때: 바로 저장
      setBiometricEnabled(false);
      await saveBiometricSettings({ biometricEnabled: false, autoLockEnabled: autoLock });
    }
  };

  // 자동잠금 토글 핸들러
  const handleAutoLockToggle = async (value: boolean) => {
    setAutoLock(value);
    await saveBiometricSettings({ biometricEnabled, autoLockEnabled: value });
  };

  const handleChangePassword = () => {
    Alert.alert(
      '비밀번호 변경',
      '이메일로 비밀번호 재설정 링크를 보내시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '전송', onPress: () => Alert.alert('성공', '이메일을 확인해주세요.') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>보안</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 컨텐츠 */}
      <View style={styles.content}>
        {/* 보안 설정 */}
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{biometricName}</Text>
              <Text style={styles.settingDescription}>
                {biometricAvailable
                  ? `${biometricName}(으)로 잠금 해제`
                  : '이 기기는 생체 인증을 지원하지 않습니다'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: '#333333', true: '#4CAF50' }}
              thumbColor={biometricEnabled ? '#FFFFFF' : '#888888'}
              disabled={loading || !biometricAvailable}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>자동 잠금</Text>
              <Text style={styles.settingDescription}>앱 전환 시 자동 잠금</Text>
            </View>
            <Switch
              value={autoLock}
              onValueChange={handleAutoLockToggle}
              trackColor={{ false: '#333333', true: '#4CAF50' }}
              thumbColor={autoLock ? '#FFFFFF' : '#888888'}
              disabled={loading || !biometricEnabled}
            />
          </View>
        </View>

        {/* 계정 관리 */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <TouchableOpacity style={styles.actionItem} onPress={handleChangePassword}>
            <Ionicons name="key-outline" size={22} color="#FFFFFF" />
            <Text style={styles.actionLabel}>비밀번호 변경</Text>
            <Ionicons name="chevron-forward" size={18} color="#888888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/settings/delete-account')}>
            <Ionicons name="trash-outline" size={22} color="#CF6679" />
            <Text style={[styles.actionLabel, { color: '#CF6679' }]}>계정 삭제</Text>
            <Ionicons name="chevron-forward" size={18} color="#888888" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingDescription: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    gap: 12,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
