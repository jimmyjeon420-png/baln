import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import FreePeriodBanner from '../../src/components/FreePeriodBanner';
import InvestorLevelCard from '../../src/components/InvestorLevelCard';
import { useAchievementCount } from '../../src/hooks/useAchievements';
import { useScreenTracking } from '../../src/hooks/useAnalytics';

// 전체(More) 탭 전용 컴포넌트
import CommunityPreview from '../../src/components/more/CommunityPreview';
import InsightPreview from '../../src/components/more/InsightPreview';
import RealEstatePreview from '../../src/components/more/RealEstatePreview';

// 전체(More) 화면 - 커뮤니티 + 인사이트 + 설정 통합
export default function ProfileScreen() {
  useScreenTracking('more');
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { unlockedCount, totalCount } = useAchievementCount();

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
    { icon: 'diamond', label: '크레딧 충전', onPress: () => router.push('/marketplace/credits'), credit: true },
    { icon: 'people', label: 'VIP 라운지', onPress: () => router.push('/community'), community: true },
    { icon: 'bookmark-outline', label: '내 북마크', onPress: () => router.push('/community/bookmarks'), community: true },
    { icon: 'notifications-outline', label: '알림 센터', onPress: () => router.push('/notifications'), feature: true },
    { icon: 'home-outline', label: '부동산 자산 추가', onPress: () => router.push('/add-realestate'), feature: true },
    { icon: 'heart', label: 'Heart 자산 관리', onPress: () => router.push('/settings/manage-hearts'), feature: true },
    { icon: 'trophy-outline', label: '투자 레벨', onPress: () => router.push('/settings/investor-level'), highlight: true },
    { icon: 'medal-outline', label: `나의 성취 (${unlockedCount}/${totalCount})`, onPress: () => router.push('/achievements'), feature: true },
    { icon: 'help-outline', label: '오늘의 퀴즈', onPress: () => router.push('/settings/daily-quiz'), feature: true },

    { icon: 'person-outline', label: '프로필 설정', onPress: () => router.push('/settings/profile') },
    { icon: 'notifications-outline', label: '알림 설정', onPress: () => router.push('/settings/notifications') },
    { icon: 'shield-checkmark-outline', label: '보안', onPress: () => router.push('/settings/security') },
    { icon: 'help-circle-outline', label: '도움말', onPress: () => router.push('/settings/help') },
    { icon: 'document-text-outline', label: '이용약관', onPress: () => router.push('/settings/terms') },
    { icon: 'lock-closed-outline', label: '개인정보처리방침', onPress: () => router.push('/settings/privacy') },
    { icon: 'information-circle-outline', label: '앱 정보', onPress: () => router.push('/settings/about') },

    // 개발 모드 - 관리자 메뉴 (추후 관리자 권한 체크 추가)
    { icon: 'shield', label: '[DEV] 관리자 신고 처리', onPress: () => router.push('/admin/reports'), dev: true },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>전체</Text>
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

        {/* 투자 레벨 카드 (컴팩트) */}
        {user && <InvestorLevelCard />}

        {/* 무료 기간 프로모션 배너 */}
        <View style={{ marginBottom: 12 }}>
          <FreePeriodBanner compact={true} />
        </View>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 전체 탭 통합 섹션 (3-Tab 전략) */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {/* ① 커뮤니티 미리보기 — VIP 라운지 인기글 */}
        {user && <CommunityPreview />}

        {/* ② AI 인사이트 미리보기 — 오늘의 시장 한 줄 요약 */}
        <InsightPreview />

        {/* ③ 부동산 자산 미리보기 — 보유 건수 + 총 시세 */}
        {user && <RealEstatePreview />}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 기존 메뉴 섹션 */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {/* 메뉴 목록 */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                (item as any).credit && styles.menuItemCredit,
                (item as any).highlight && styles.menuItemHighlight,
                (item as any).feature && styles.menuItemFeature,
                (item as any).community && styles.menuItemCommunity,
                (item as any).dev && styles.menuItemDev,
              ]}
              onPress={item.onPress}
            >
              <Ionicons
                name={item.icon as any}
                size={22}
                color={(item as any).credit ? '#7C4DFF' : (item as any).highlight ? '#FFC107' : (item as any).feature ? '#4CAF50' : (item as any).community ? '#FF69B4' : (item as any).dev ? '#FF5722' : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.menuLabel,
                  (item as any).credit && styles.menuLabelCredit,
                  (item as any).highlight && styles.menuLabelHighlight,
                  (item as any).feature && styles.menuLabelFeature,
                  (item as any).community && styles.menuLabelCommunity,
                  (item as any).dev && styles.menuLabelDev,
                ]}
              >
                {item.label}
              </Text>
              {(item as any).credit && (
                <View style={styles.creditBadge}>
                  <Text style={styles.creditBadgeText}>충전</Text>
                </View>
              )}
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
              {(item as any).community && (
                <View style={styles.communityBadge}>
                  <Text style={styles.communityBadgeText}>HOT</Text>
                </View>
              )}
              {(item as any).dev && (
                <View style={styles.devBadge}>
                  <Text style={styles.devBadgeText}>DEV</Text>
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
        <Text style={styles.versionText}>baln v3.0.0</Text>
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
  menuItemCredit: {
    backgroundColor: '#1E1A2E',
  },
  menuItemCommunity: {
    backgroundColor: '#2E1A2E',
  },
  menuItemDev: {
    backgroundColor: '#2A1A1A',
  },
  menuLabelHighlight: {
    color: '#FFC107',
    fontWeight: '600',
  },
  menuLabelFeature: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  menuLabelCredit: {
    color: '#7C4DFF',
    fontWeight: '600',
  },
  menuLabelCommunity: {
    color: '#FF69B4',
    fontWeight: '600',
  },
  menuLabelDev: {
    color: '#FF5722',
    fontWeight: '600',
  },
  creditBadge: {
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  creditBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
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
  communityBadge: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  communityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  devBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
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
