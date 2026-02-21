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
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="프로필 설정" />

      {/* 컨텐츠 */}
      <View style={styles.content}>
        {/* 이메일 (읽기 전용) */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>이메일</Text>
          <View style={[styles.readOnlyInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.readOnlyText, { color: colors.textTertiary }]}>{user?.email || '로그인 필요'}</Text>
          </View>
        </View>

        {/* 표시 이름 */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>표시 이름</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="표시 이름 입력"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* 저장 버튼 */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.background }]}>저장</Text>
          )}
        </TouchableOpacity>

        {/* 구분선 */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* 계정 삭제 (Apple App Store 필수 요건) */}
        <TouchableOpacity
          style={[styles.deleteAccountButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/settings/delete-account')}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
          <Text style={[styles.deleteAccountText, { color: colors.error }]}>계정 삭제</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
        <Text style={[styles.deleteAccountHint, { color: colors.textTertiary }]}>
          계정과 모든 데이터가 영구적으로 삭제됩니다
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    borderWidth: 1,
  },
  readOnlyInput: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  readOnlyText: {
    fontSize: 17,
  },
  saveButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 32,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  deleteAccountText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountHint: {
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
  },
});
