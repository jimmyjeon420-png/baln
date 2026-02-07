import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

// 더보기(메뉴) 화면 - 설정 및 추가 기능
export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  // 로그아웃 처리
  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login');
            } catch (error) {
              Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  // 메뉴 항목 정의 - 각 항목에 실제 네비게이션 연결
  const menuItems = [
    { icon: 'pulse', label: 'AI 진단', onPress: () => router.push('/(tabs)/diagnosis'), feature: true },
    { icon: 'diamond', label: 'VIP 커뮤니티', onPress: () => router.push('/settings/lounge'), highlight: true },
    { icon: 'telescope', label: '투자 거장 인사이트', onPress: () => router.push('/settings/gurus'), feature: true },
    { icon: 'bar-chart', label: '투자 DNA', onPress: () => router.push('/settings/tier-insights'), feature: true },
    { icon: 'person-outline', label: '프로필 설정', onPress: () => router.push('/settings/profile') },
    { icon: 'notifications-outline', label: '알림 설정', onPress: () => router.push('/settings/notifications') },
    { icon: 'shield-checkmark-outline', label: '보안', onPress: () => router.push('/settings/security') },
    { icon: 'help-circle-outline', label: '도움말', onPress: () => router.push('/settings/help') },
    { icon: 'document-text-outline', label: '이용약관', onPress: () => router.push('/settings/terms') },
    { icon: 'lock-closed-outline', label: '개인정보처리방침', onPress: () => router.push('/settings/privacy') },
    { icon: 'information-circle-outline', label: '앱 정보', onPress: () => router.push('/settings/about') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>더보기</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* 프로필 카드 */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => user ? router.push('/settings/profile') : router.push('/login')}
        >
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#4CAF50" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.email?.split('@')[0] || '사용자'}</Text>
            <Text style={styles.profileEmail}>
              {user ? user.email : '로그인하여 데이터를 동기화하세요'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888888" />
        </TouchableOpacity>

        {/* 메뉴 목록 */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                (item as any).highlight && styles.menuItemHighlight,
                (item as any).feature && styles.menuItemFeature,
              ]}
              onPress={item.onPress}
            >
              <Ionicons
                name={item.icon as any}
                size={22}
                color={(item as any).highlight ? '#FFC107' : (item as any).feature ? '#4CAF50' : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.menuLabel,
                  (item as any).highlight && styles.menuLabelHighlight,
                  (item as any).feature && styles.menuLabelFeature,
                ]}
              >
                {item.label}
              </Text>
              {(item as any).highlight && (
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>VIP</Text>
                </View>
              )}
              {(item as any).feature && (
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#888888" />
            </TouchableOpacity>
          ))}
        </View>

        {/* 로그아웃 버튼 (로그인 상태일 때만 표시) */}
        {user && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#CF6679" />
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        )}

        {/* 버전 정보 */}
        <Text style={styles.versionText}>Smart Rebalancer v2.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  menuItemHighlight: {
    backgroundColor: '#2A2A1A',
  },
  menuItemFeature: {
    backgroundColor: '#1A2A1A',
  },
  menuLabelHighlight: {
    color: '#FFC107',
    fontWeight: '600',
  },
  menuLabelFeature: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  aiBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  vipBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  vipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CF6679',
  },
  versionText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 12,
    marginTop: 24,
    marginBottom: 40,
  },
});
