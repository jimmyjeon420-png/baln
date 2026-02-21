import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import { useAchievementCount, useAchievements } from '../../src/hooks/useAchievements';
import { BadgeRow } from '../../src/components/profile/BadgeRow';
import { useScreenTracking } from '../../src/hooks/useAnalytics';
import { SIZES } from '../../src/styles/theme';
import RealEstatePreview from '../../src/components/more/RealEstatePreview';
import NewsPreview from '../../src/components/more/NewsPreview';
import CommunityPreview from '../../src/components/more/CommunityPreview';
import { useLoungeEligibility } from '../../src/hooks/useCommunity';
import { useTheme, ThemeMode } from '../../src/hooks/useTheme';
import { CreditDisplay } from '../../src/components/common/CreditDisplay';
import { useIsAdmin } from '../../src/hooks/useAdminDashboard';
import { useGuruStyle, GURU_DISPLAY_NAME } from '../../src/hooks/useGuruStyle';

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
  const { achievements: badgeAchievements, isLoading: badgeLoading } = useAchievements();
  const { themeMode, setThemeMode, colors } = useTheme();
  const { data: isAdmin } = useIsAdmin();
  const { guruStyle } = useGuruStyle();
  const { eligibility } = useLoungeEligibility();

  // 화면 포커스 시 AsyncStorage에서 최신 guru style 읽기 (guru-style.tsx 변경 후 즉시 반영)
  const [latestGuruStyle, setLatestGuruStyle] = React.useState(guruStyle);
  useFocusEffect(React.useCallback(() => {
    AsyncStorage.getItem('@baln:guru_style').then(v => {
      const valid = ['dalio', 'buffett', 'cathie_wood', 'kostolany'];
      if (v && valid.includes(v)) {
        setLatestGuruStyle(v as typeof guruStyle);
      }
    });
  }, []));

  // ---------------------------------------------------------------------------
  // 로그아웃 처리 (useCallback으로 불필요한 재생성 방지)
  // ---------------------------------------------------------------------------
  const handleLogout = React.useCallback(async () => {
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
  }, [signOut, router]);

  // ---------------------------------------------------------------------------
  // 테마 변경 핸들러
  // ---------------------------------------------------------------------------
  const handleThemeChange = React.useCallback(async (mode: ThemeMode) => {
    await setThemeMode(mode);
  }, [setThemeMode]);

  // ---------------------------------------------------------------------------
  // 메뉴 섹션 정의 — useMemo로 매 렌더 시 배열 재생성 방지
  // ---------------------------------------------------------------------------

  const sections: MenuSection[] = React.useMemo(() => [
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
          label: '성취 & 감정 기록',
          onPress: () => router.push('/achievements'),
          badge: unlockedCount > 0 ? `${unlockedCount}/${totalCount}` : undefined,
          badgeColor: '#4CAF50',
        },
        {
          icon: 'gift-outline',
          label: '친구 초대',
          onPress: () => router.push('/settings/referral'),
          badge: '20C',
          badgeColor: '#4CAF50',
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
          icon: 'bookmark-outline',
          label: '내 북마크',
          onPress: () => router.push('/community/bookmarks'),
        },
      ],
    },

    // ── 섹션 3: 설정 ──
    {
      title: '설정',
      items: [
        {
          icon: 'analytics-outline',
          label: '투자 철학 변경',
          onPress: () => router.push('/settings/guru-style'),
          badge: GURU_DISPLAY_NAME[latestGuruStyle],
          badgeColor: '#4CAF5033',
        },
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
          icon: 'information-circle-outline',
          label: '앱 정보',
          onPress: () => router.push('/settings/about'),
        },
      ],
    },
  ], [router, unlockedCount, totalCount, latestGuruStyle]);

  // ---------------------------------------------------------------------------
  // 다크모드 토글 (헤더 우측 스위치에서 사용)
  // ---------------------------------------------------------------------------
  const isDarkMode = themeMode === 'dark';
  const toggleTheme = React.useCallback(
    () => handleThemeChange(isDarkMode ? 'light' : 'dark'),
    [handleThemeChange, isDarkMode],
  );

  // ---------------------------------------------------------------------------
  // DEV 전용 섹션 (개발 모드에서만 노출)
  // ---------------------------------------------------------------------------
  const devSection: MenuSection = {
    title: 'DEV 메뉴',
    items: [],
  };

  // ---------------------------------------------------------------------------
  // 렌더: 메뉴 항목 1개
  // ---------------------------------------------------------------------------
  const renderMenuItem = (item: MenuItem, index: number, isLast: boolean) => (
    <TouchableOpacity
      key={`${item.label}-${index}`}
      style={[
        styles.menuItem,
        isLast && styles.menuItemLast,
        { borderBottomColor: isLast ? 'transparent' : colors.borderLight }
      ]}
      onPress={item.onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{item.label}</Text>
      {item.badge && (
        <View style={[styles.badge, { backgroundColor: item.badgeColor || colors.primary }]}>
          <Text style={[styles.badgeText, { color: colors.textPrimary }]}>{item.badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  // ---------------------------------------------------------------------------
  // 렌더: 메뉴 섹션 1개 (제목 + 카드)
  // ---------------------------------------------------------------------------
  const renderSection = (section: MenuSection, sectionIndex: number) => (
    <View key={`section-${sectionIndex}`} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{section.title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 — 우측에 다크/라이트 모드 스위치 */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>전체</Text>
        <View style={styles.themeToggle}>
          <Ionicons
            name={isDarkMode ? 'moon' : 'sunny'}
            size={16}
            color={isDarkMode ? '#FFD54F' : '#FF9800'}
          />
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={isDarkMode ? '#FFF' : '#F4F3F4'}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 프로필 카드 ── */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.surface }]}
          onPress={() => (user ? router.push('/settings/profile') : router.push('/login'))}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]} numberOfLines={1}>
              {user?.email?.split('@')[0] || '사용자'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]} numberOfLines={1}>
              {user ? user.email : '로그인하여 데이터를 동기화하세요'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* ── 뱃지 행 (획득한 배지 상위 3개) ── */}
        {user && (
          <BadgeRow achievements={badgeAchievements} isLoading={badgeLoading} />
        )}

        {/* ── 뉴스 미리보기 (실시간 시장 뉴스) ── */}
        {user && <NewsPreview />}

        {/* ── 커뮤니티 미리보기 (모든 사용자에게 공개, 전체 커뮤니티는 자산 조건 유지) ── */}
        {user && <CommunityPreview isEligible={eligibility?.isEligible ?? true} />}

        {/* ── 부동산 보유 현황 (있을 때만 표시) ── */}
        {user && <RealEstatePreview />}

        {/* ── 크레딧 표시 (Agent 3) ── */}
        {user && (
          <View style={styles.creditWrap}>
            <CreditDisplay />
          </View>
        )}

        {/* ── 관리자 대시보드 (관리자만 표시) ── */}
        {user && isAdmin && (
          <TouchableOpacity
            style={[styles.adminCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/admin')}
            activeOpacity={0.7}
          >
            <View style={[styles.adminIconWrap, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            </View>
            <View style={styles.adminInfo}>
              <Text style={[styles.adminTitle, { color: colors.textPrimary }]}>관리자 대시보드</Text>
              <Text style={[styles.adminSubtitle, { color: colors.textSecondary }]}>유저, 지표, 라운지 관리</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* ── 3개 메뉴 섹션 ── */}
        {sections.map((section, idx) => renderSection(section, idx))}

        {/* ── DEV 메뉴 (개발 모드 전용, 항목 있을 때만) ── */}
        {__DEV__ && devSection.items.length > 0 && renderSection(devSection, sections.length)}

        {/* ── 로그아웃 버튼 ── */}
        {user && (
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.surface }]}
            onPress={handleLogout}
            activeOpacity={0.6}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>로그아웃</Text>
          </TouchableOpacity>
        )}

        {/* ── 버전 정보 ── */}
        <Text style={[styles.versionText, { color: colors.textTertiary }]}>bal<Text style={{ color: '#4CAF50' }}>n</Text> v3.0.0</Text>
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
    // backgroundColor는 동적으로 적용됨 (colors.background)
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SIZES.xl,
    paddingHorizontal: SIZES.xl,
    paddingBottom: SIZES.lg,
  },
  headerTitle: {
    fontSize: SIZES.fXxxl,
    fontWeight: '700',
    // color는 동적으로 적용됨 (colors.textPrimary)
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    // backgroundColor는 동적으로 적용됨 (colors.surface)
    borderRadius: SIZES.card.borderRadius,
    padding: SIZES.card.padding,
    marginBottom: SIZES.xxl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor는 동적으로 적용됨 (colors.surfaceLight)
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
    // color는 동적으로 적용됨 (colors.textPrimary)
  },
  profileEmail: {
    fontSize: SIZES.fXs,
    // color는 동적으로 적용됨 (colors.textSecondary)
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
    // color는 동적으로 적용됨 (colors.textTertiary)
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SIZES.sm,
    marginLeft: SIZES.xs,
  },
  sectionCard: {
    // backgroundColor는 동적으로 적용됨 (colors.surface)
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
    // borderBottomColor는 동적으로 적용됨 (colors.borderLight)
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    // backgroundColor는 동적으로 적용됨 (colors.surfaceLight)
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: SIZES.fBase,
    // color는 동적으로 적용됨 (colors.textPrimary)
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
    // color는 동적으로 적용됨 (colors.textPrimary)
  },

  // ---------------------------------------------------------------------------
  // 로그아웃
  // ---------------------------------------------------------------------------
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor는 동적으로 적용됨 (colors.surface)
    borderRadius: SIZES.card.borderRadius,
    paddingVertical: 14,
    marginTop: SIZES.sm,
    gap: SIZES.sm,
  },
  logoutText: {
    fontSize: SIZES.fBase,
    fontWeight: '600',
    // color는 동적으로 적용됨 (colors.error)
  },

  // ---------------------------------------------------------------------------
  // 크레딧 표시 래퍼
  // ---------------------------------------------------------------------------
  creditWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // ---------------------------------------------------------------------------
  // 관리자 대시보드 카드
  // ---------------------------------------------------------------------------
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.card.borderRadius,
    padding: SIZES.card.padding,
    marginBottom: SIZES.xxl,
  },
  adminIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  adminTitle: {
    fontSize: SIZES.fBase,
    fontWeight: '600',
  },
  adminSubtitle: {
    fontSize: SIZES.fXs,
    marginTop: 2,
  },

  // ---------------------------------------------------------------------------
  // 버전
  // ---------------------------------------------------------------------------
  versionText: {
    textAlign: 'center',
    // color는 동적으로 적용됨 (colors.textTertiary)
    fontSize: SIZES.fXs,
    marginTop: SIZES.xxl,
    marginBottom: 40,
  },
});
