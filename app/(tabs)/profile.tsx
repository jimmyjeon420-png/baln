import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useAchievementCount } from '../../src/hooks/useAchievements';
import { useScreenTracking } from '../../src/hooks/useAnalytics';
import { COLORS, SIZES } from '../../src/styles/theme';
import RealEstatePreview from '../../src/components/more/RealEstatePreview';

// =============================================================================
// 타입 정의
// =============================================================================

/** 메뉴 항목 하나의 구조 */
interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** 뱃지 텍스트 (예: "NEW"). 최대 1-2개 항목에만 부여 */
  badge?: string;
  /** 뱃지 배경색 */
  badgeColor?: string;
}

/** 섹션 하나의 구조 (섹션 제목 + 메뉴 항목 목록) */
interface MenuSection {
  title: string;
  items: MenuItem[];
}

// =============================================================================
// 전체(More) 화면 — 깔끔한 3-섹션 구조
// =============================================================================

export default function ProfileScreen() {
  useScreenTracking('more');
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { unlockedCount, totalCount } = useAchievementCount();

  // ---------------------------------------------------------------------------
  // 로그아웃 처리
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // 메뉴 섹션 정의 — 3개 그룹으로 깔끔하게 분류
  // ---------------------------------------------------------------------------

  const sections: MenuSection[] = [
    // ── 섹션 1: 나의 활동 ──
    {
      title: '나의 활동',
      items: [
        {
          icon: 'diamond-outline',
          label: '크레딧 & 구독',
          onPress: () => router.push('/marketplace/credits'),
        },
        {
          icon: 'trophy-outline',
          label: '나의 성취 & 레벨',
          onPress: () => router.push('/achievements'),
          badge: unlockedCount > 0 ? `${unlockedCount}/${totalCount}` : undefined,
          badgeColor: COLORS.primary,
        },
        {
          icon: 'bookmark-outline',
          label: '내 북마크',
          onPress: () => router.push('/community/bookmarks'),
        },
        {
          icon: 'notifications-outline',
          label: '알림 센터',
          onPress: () => router.push('/notifications'),
        },
      ],
    },

    // ── 섹션 2: 더 알아보기 ──
    {
      title: '더 알아보기',
      items: [
        {
          icon: 'people-outline',
          label: 'VIP 라운지',
          onPress: () => router.push('/community'),
        },
        {
          icon: 'help-circle-outline',
          label: '오늘의 퀴즈',
          onPress: () => router.push('/settings/daily-quiz'),
          badge: 'NEW',
          badgeColor: COLORS.primary,
        },
        {
          icon: 'home-outline',
          label: '부동산 자산',
          onPress: () => router.push('/add-realestate'),
        },
        {
          icon: 'heart-outline',
          label: 'Heart 자산 관리',
          onPress: () => router.push('/settings/manage-hearts'),
        },
      ],
    },

    // ── 섹션 3: 설정 ──
    {
      title: '설정',
      items: [
        {
          icon: 'person-outline',
          label: '프로필 설정',
          onPress: () => router.push('/settings/profile'),
        },
        {
          icon: 'notifications-outline',
          label: '알림 설정',
          onPress: () => router.push('/settings/notifications'),
        },
        {
          icon: 'shield-checkmark-outline',
          label: '보안',
          onPress: () => router.push('/settings/security'),
        },
        {
          icon: 'help-circle-outline',
          label: '도움말',
          onPress: () => router.push('/settings/help'),
        },
        {
          icon: 'document-text-outline',
          label: '이용약관',
          onPress: () => router.push('/settings/terms'),
        },
        {
          icon: 'lock-closed-outline',
          label: '개인정보처리방침',
          onPress: () => router.push('/settings/privacy'),
        },
        {
          icon: 'information-circle-outline',
          label: '앱 정보',
          onPress: () => router.push('/settings/about'),
        },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // DEV 전용 섹션 (개발 모드에서만 노출)
  // ---------------------------------------------------------------------------
  const devSection: MenuSection = {
    title: 'DEV 메뉴',
    items: [
      {
        icon: 'shield',
        label: '관리자 신고 처리',
        onPress: () => router.push('/admin/reports'),
      },
    ],
  };

  // ---------------------------------------------------------------------------
  // 렌더: 메뉴 항목 1개
  // ---------------------------------------------------------------------------
  const renderMenuItem = (item: MenuItem, index: number, isLast: boolean) => (
    <TouchableOpacity
      key={`${item.label}-${index}`}
      style={[styles.menuItem, isLast && styles.menuItemLast]}
      onPress={item.onPress}
      activeOpacity={0.6}
    >
      <View style={styles.menuIconWrap}>
        <Ionicons name={item.icon} size={20} color={COLORS.textSecondary} />
      </View>
      <Text style={styles.menuLabel}>{item.label}</Text>
      {item.badge && (
        <View style={[styles.badge, { backgroundColor: item.badgeColor || COLORS.primary }]}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );

  // ---------------------------------------------------------------------------
  // 렌더: 메뉴 섹션 1개 (제목 + 카드)
  // ---------------------------------------------------------------------------
  const renderSection = (section: MenuSection, sectionIndex: number) => (
    <View key={`section-${sectionIndex}`} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionCard}>
        {section.items.map((item, idx) =>
          renderMenuItem(item, idx, idx === section.items.length - 1)
        )}
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // 메인 렌더
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>전체</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 프로필 카드 ── */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => (user ? router.push('/settings/profile') : router.push('/login'))}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.email?.split('@')[0] || '사용자'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user ? user.email : '로그인하여 데이터를 동기화하세요'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>

        {/* ── 부동산 보유 현황 (있을 때만 표시) ── */}
        {user && <RealEstatePreview />}

        {/* ── 3개 메뉴 섹션 ── */}
        {sections.map((section, idx) => renderSection(section, idx))}

        {/* ── DEV 메뉴 (개발 모드 전용) ── */}
        {__DEV__ && renderSection(devSection, sections.length)}

        {/* ── 로그아웃 버튼 ── */}
        {user && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.6}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        )}

        {/* ── 버전 정보 ── */}
        <Text style={styles.versionText}>baln v3.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// 스타일 — 다크 모드, 깔끔한 섹션 구분
// =============================================================================

const styles = StyleSheet.create({
  // ---------------------------------------------------------------------------
  // 레이아웃
  // ---------------------------------------------------------------------------
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: SIZES.xl,
    paddingHorizontal: SIZES.xl,
    paddingBottom: SIZES.lg,
  },
  headerTitle: {
    fontSize: SIZES.fXxxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIZES.xl,
    paddingBottom: 120,
  },

  // ---------------------------------------------------------------------------
  // 프로필 카드
  // ---------------------------------------------------------------------------
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.card.borderRadius,
    padding: SIZES.card.padding,
    marginBottom: SIZES.xxl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  profileName: {
    fontSize: SIZES.fLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  profileEmail: {
    fontSize: SIZES.fXs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ---------------------------------------------------------------------------
  // 섹션
  // ---------------------------------------------------------------------------
  section: {
    marginBottom: SIZES.xxl,
  },
  sectionTitle: {
    fontSize: SIZES.fXs,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SIZES.sm,
    marginLeft: SIZES.xs,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.card.borderRadius,
    overflow: 'hidden',
  },

  // ---------------------------------------------------------------------------
  // 메뉴 항목
  // ---------------------------------------------------------------------------
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SIZES.card.padding,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: SIZES.fBase,
    color: COLORS.textPrimary,
    marginLeft: SIZES.md,
  },

  // ---------------------------------------------------------------------------
  // 뱃지 (최대 1-2개 항목에만 사용)
  // ---------------------------------------------------------------------------
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: SIZES.sm,
  },
  badgeText: {
    fontSize: SIZES.fTiny,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ---------------------------------------------------------------------------
  // 로그아웃
  // ---------------------------------------------------------------------------
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.card.borderRadius,
    paddingVertical: 14,
    marginTop: SIZES.sm,
    gap: SIZES.sm,
  },
  logoutText: {
    fontSize: SIZES.fBase,
    fontWeight: '600',
    color: COLORS.error,
  },

  // ---------------------------------------------------------------------------
  // 버전
  // ---------------------------------------------------------------------------
  versionText: {
    textAlign: 'center',
    color: COLORS.textTertiary,
    fontSize: SIZES.fXs,
    marginTop: SIZES.xxl,
    marginBottom: 40,
  },
});
