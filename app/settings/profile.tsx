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
import supabase from '../../src/services/supabase';
import { useLocale } from '../../src/context/LocaleContext';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLocale();
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || user?.email?.split('@')[0] || ''
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert(t('settings.profile.error_title'), t('settings.profile.error_name_required'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      });
      if (error) throw error;
      Alert.alert(t('settings.profile.success_title'), t('settings.profile.success_message'));
    } catch (error: unknown) {
      console.warn('[Profile] 저장 실패:', (error as Error)?.message);
      Alert.alert(t('settings.profile.error_title'), t('settings.profile.error_save_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title={t('settings.profile.title')} />

      {/* 컨텐츠 */}
      <View style={styles.content}>
        {/* 이메일 (읽기 전용) */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('settings.profile.email_label')}</Text>
          <View style={[styles.readOnlyInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.readOnlyText, { color: colors.textTertiary }]}>{user?.email || t('settings.profile.email_placeholder')}</Text>
          </View>
        </View>

        {/* 표시 이름 */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('settings.profile.display_name_label')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('settings.profile.display_name_placeholder')}
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
            <Text style={[styles.saveButtonText, { color: colors.background }]}>{t('settings.profile.save_button')}</Text>
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
          <Text style={[styles.deleteAccountText, { color: colors.error }]}>{t('settings.profile.delete_account')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
        <Text style={[styles.deleteAccountHint, { color: colors.textTertiary }]}>
          {t('settings.profile.delete_account_hint')}
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
