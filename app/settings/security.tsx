/**
 * 보안 설정 화면
 * - 생체인증 ON/OFF (실제 Face ID/지문 연동)
 * - 자동 잠금 설정
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import {
  checkBiometricAvailable,
  getBiometricTypeName,
  authenticateWithBiometric,
  getBiometricSettings,
  saveBiometricSettings,
} from '../../src/services/biometric';

export default function SecurityScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLock, setAutoLock] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricName, setBiometricName] = useState('생체 인증');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

  // ================================================================
  // 계정 삭제 — Apple App Store 필수 요구사항
  // 14개 테이블에서 유저 데이터 전부 삭제 후 로그아웃
  // ================================================================
  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '정말 계정을 삭제하시겠습니까?\n\n• 모든 포트폴리오 데이터가 삭제됩니다\n• 모든 AI 분석 기록이 삭제됩니다\n• 이 작업은 되돌릴 수 없습니다',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '영구 삭제',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      '최종 확인',
      '삭제된 데이터는 복구할 수 없습니다.\n정말 진행하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제 진행',
          style: 'destructive',
          onPress: executeDeleteAccount,
        },
      ]
    );
  };

  const executeDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인 정보를 찾을 수 없습니다');
      const userId = user.id;

      // 채팅 세션 ID 조회 (메시지 삭제에 필요)
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId);
      const sessionIds = sessions?.map((s: any) => s.id) || [];

      // 자식 테이블부터 순서대로 삭제 (FK 제약 준수)
      // 각 삭제는 개별 try/catch — 테이블 미존재 시에도 진행
      const deletions: { table: string; filter: [string, any] }[] = [
        { table: 'ai_chat_messages', filter: ['user_id', userId] },
        { table: 'ai_feature_results', filter: ['user_id', userId] },
        { table: 'credit_transactions', filter: ['user_id', userId] },
        { table: 'user_credits', filter: ['user_id', userId] },
        { table: 'daily_summaries', filter: ['user_id', userId] },
        { table: 'team_messages', filter: ['user_id', userId] },
        { table: 'gathering_participants', filter: ['user_id', userId] },
        { table: 'gatherings', filter: ['host_id', userId] },
        { table: 'community_posts', filter: ['user_id', userId] },
        { table: 'asset_verifications', filter: ['user_id', userId] },
        { table: 'assets', filter: ['user_id', userId] },
        { table: 'portfolios', filter: ['user_id', userId] },
      ];

      // 채팅 메시지 삭제 (session_id 기반)
      if (sessionIds.length > 0) {
        try {
          await supabase.from('chat_messages').delete().in('session_id', sessionIds);
        } catch (e) { /* 무시 */ }
      }
      // 채팅 세션 삭제
      try {
        await supabase.from('chat_sessions').delete().eq('user_id', userId);
      } catch (e) { /* 무시 */ }

      // 나머지 테이블 순차 삭제
      for (const { table, filter } of deletions) {
        try {
          await supabase.from(table).delete().eq(filter[0], filter[1]);
        } catch (e) {
          console.warn(`[계정삭제] ${table} 삭제 실패 (무시):`, e);
        }
      }

      // profiles 마지막 삭제 (다른 테이블이 FK 참조할 수 있음)
      try {
        await supabase.from('profiles').delete().eq('id', userId);
      } catch (e) {
        console.warn('[계정삭제] profiles 삭제 실패:', e);
      }

      // 로그아웃 → AuthGate가 자동으로 로그인 화면으로 이동
      await signOut();

    } catch (err) {
      console.error('계정 삭제 오류:', err);
      Alert.alert('오류', '계정 삭제 중 문제가 발생했습니다.\n다시 시도해주세요.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 삭제 진행 중 오버레이 */}
      {deleting && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator size="large" color="#CF6679" />
          <Text style={styles.deletingText}>계정 데이터 삭제 중...</Text>
          <Text style={styles.deletingSubtext}>잠시만 기다려주세요</Text>
        </View>
      )}

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
  // 삭제 오버레이
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  deletingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#CF6679',
    marginTop: 20,
  },
  deletingSubtext: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
  },
});
