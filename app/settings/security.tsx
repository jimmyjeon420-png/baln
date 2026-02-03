/**
 * 보안 설정 화면
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SecurityScreen() {
  const router = useRouter();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLock, setAutoLock] = useState(true);

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

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '정말 계정을 삭제하시겠습니까?\n모든 데이터가 영구적으로 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => Alert.alert('안내', '계정 삭제는 고객센터에 문의해주세요.'),
        },
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
              <Text style={styles.settingLabel}>생체 인증</Text>
              <Text style={styles.settingDescription}>Face ID / 지문으로 잠금 해제</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: '#333333', true: '#4CAF50' }}
              thumbColor={biometricEnabled ? '#FFFFFF' : '#888888'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>자동 잠금</Text>
              <Text style={styles.settingDescription}>앱 전환 시 자동 잠금</Text>
            </View>
            <Switch
              value={autoLock}
              onValueChange={setAutoLock}
              trackColor={{ false: '#333333', true: '#4CAF50' }}
              thumbColor={autoLock ? '#FFFFFF' : '#888888'}
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

          <TouchableOpacity style={styles.actionItem} onPress={handleDeleteAccount}>
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
