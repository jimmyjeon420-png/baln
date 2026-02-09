/**
 * 프로필 설정 화면
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // TODO: Supabase에 프로필 업데이트 로직 추가
    setTimeout(() => {
      setLoading(false);
      Alert.alert('성공', '프로필이 저장되었습니다.');
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 설정</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 컨텐츠 */}
      <View style={styles.content}>
        {/* 이메일 (읽기 전용) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>이메일</Text>
          <View style={styles.readOnlyInput}>
            <Text style={styles.readOnlyText}>{user?.email || '로그인 필요'}</Text>
          </View>
        </View>

        {/* 표시 이름 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>표시 이름</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="표시 이름 입력"
            placeholderTextColor="#666666"
          />
        </View>

        {/* 저장 버튼 */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#121212" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>저장</Text>
          )}
        </TouchableOpacity>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 계정 삭제 (Apple App Store 필수 요건) */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => router.push('/settings/delete-account')}
        >
          <Ionicons name="trash-outline" size={20} color="#CF6679" />
          <Text style={styles.deleteAccountText}>계정 삭제</Text>
          <Ionicons name="chevron-forward" size={18} color="#666666" />
        </TouchableOpacity>
        <Text style={styles.deleteAccountHint}>
          계정과 모든 데이터가 영구적으로 삭제됩니다
        </Text>
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAAAAA',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
  },
  readOnlyInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666666',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121212',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 32,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  deleteAccountText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#CF6679',
  },
  deleteAccountHint: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    marginLeft: 4,
  },
});
