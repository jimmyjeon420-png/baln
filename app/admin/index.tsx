/**
 * 관리자 허브 (Admin Hub) — 메인 내비게이션 화면
 *
 * 역할: 관리자 전용 기능들의 진입점 (출입구)
 *       5개의 카드 메뉴를 통해 각 관리 화면으로 이동합니다.
 *       각 카드에는 실시간 미니 KPI 뱃지가 표시됩니다.
 *
 * 비유: "회사 본사 로비" — 각 부서(대시보드, 유저, 신고, 분석, 라운지)로 가는 안내 데스크
 *       로비 안내판에 각 부서의 오늘 현황이 간략히 표시되어 있는 것과 같습니다.
 *
 * 접근 제한: useIsAdmin() 훅으로 관리자 여부를 확인하여,
 *           관리자가 아닌 경우 "접근 권한 없음" 메시지를 표시합니다.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsAdmin, useAdminOverview } from '../../src/hooks/useAdminDashboard';
import { COLORS } from '../../src/styles/theme';

// ================================================================
// 내비게이션 카드 정의
// ================================================================

type AdminCard = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
};

const ADMIN_CARDS: AdminCard[] = [
  {
    key: 'dashboard',
    icon: 'bar-chart',
    title: '핵심 지표',
    subtitle: 'DAU, 매출, 리텐션',
    route: '/admin/dashboard',
  },
  {
    key: 'users',
    icon: 'people',
    title: '유저 관리',
    subtitle: '검색, 상세, 활동',
    route: '/admin/users',
  },
  {
    key: 'reports',
    icon: 'flag',
    title: '신고 관리',
    subtitle: '커뮤니티 신고 처리',
    route: '/admin/reports',
  },
  {
    key: 'analytics',
    icon: 'trending-up',
    title: '상세 분석',
    subtitle: '리텐션, 분포, 추이',
    route: '/admin/analytics',
  },
  {
    key: 'lounge',
    icon: 'chatbubbles',
    title: '라운지 관리',
    subtitle: '게시글, 모임 관리',
    route: '/admin/lounge',
  },
];

// ================================================================
// 뱃지 값 매핑 함수
// ================================================================

/**
 * 카드 key에 따라 overview 데이터에서 적절한 뱃지 텍스트를 반환합니다.
 * overview 데이터가 없으면 null을 반환하여 뱃지를 숨깁니다.
 */
function getBadgeValue(
  cardKey: string,
  overview: any,
): { text: string; highlight: boolean } | null {
  if (!overview) return null;

  switch (cardKey) {
    case 'dashboard':
      return { text: `DAU ${overview.dau ?? 0}`, highlight: false };
    case 'users':
      return { text: `총 ${overview.total_users ?? 0}명`, highlight: false };
    case 'reports': {
      const pending = overview.pending_reports ?? 0;
      return { text: `${pending}건 대기`, highlight: pending > 0 };
    }
    case 'analytics':
      return {
        text: `이탈위험 ${overview.churn_risk_count ?? 0}`,
        highlight: false,
      };
    case 'lounge':
      return { text: `오늘 ${overview.posts_today ?? 0}건`, highlight: false };
    default:
      return null;
  }
}

// ================================================================
// 메인 컴포넌트
// ================================================================

export default function AdminHubScreen() {
  const router = useRouter();
  const { data: isAdmin, isLoading, error } = useIsAdmin();

  // 관리자 확인 후에만 overview 데이터를 가져옵니다.
  // isAdmin이 아직 로딩 중이거나 false면 overview 쿼리를 비활성화합니다.
  const { data: overview } = useAdminOverview();

  // --------------------------------------------------
  // 로딩 상태: 관리자 권한 확인 중
  // --------------------------------------------------
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>관리자</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>권한 확인 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // 접근 거부: 관리자가 아닌 경우
  // --------------------------------------------------
  if (!isAdmin || error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>관리자</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed" size={64} color={COLORS.textSecondary} />
          <Text style={styles.deniedTitle}>접근 권한 없음</Text>
          <Text style={styles.deniedSubtitle}>
            관리자 계정으로 로그인해주세요.
          </Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
            <Text style={styles.goBackButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // 관리자 허브: 2x2 그리드 카드 + 실시간 KPI 뱃지
  // --------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>관리자</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 그리드 — 2열 동적 생성 */}
      <View style={styles.gridContainer}>
        {Array.from({ length: Math.ceil(ADMIN_CARDS.length / 2) }, (_, rowIdx) => {
          const rowCards = ADMIN_CARDS.slice(rowIdx * 2, rowIdx * 2 + 2);
          return (
            <View key={`row-${rowIdx}`} style={styles.gridRow}>
              {rowCards.map((card) => {
                const badge = getBadgeValue(card.key, overview);
                return (
                  <TouchableOpacity
                    key={card.key}
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() => router.push(card.route as any)}
                  >
                    {/* 미니 KPI 뱃지 — overview 데이터가 있을 때만 표시 */}
                    {badge && (
                      <View
                        style={[
                          styles.badge,
                          badge.highlight && styles.badgeHighlight,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            badge.highlight && styles.badgeTextHighlight,
                          ]}
                        >
                          {badge.text}
                        </Text>
                      </View>
                    )}

                    <View style={styles.iconContainer}>
                      <Ionicons name={card.icon} size={28} color={COLORS.primary} />
                    </View>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                  </TouchableOpacity>
                );
              })}
              {/* 홀수 카드일 때 마지막 행에 빈 공간 유지 */}
              {rowCards.length === 1 && <View style={styles.cardPlaceholder} />}
            </View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// ================================================================
// 스타일
// ================================================================

const styles = StyleSheet.create({
  // 전체 컨테이너
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },

  // 중앙 정렬 컨테이너 (로딩, 에러 등)
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },

  // 접근 거부 화면
  deniedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  deniedSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  goBackButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goBackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // 2x2 그리드
  gridContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // 카드
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  cardPlaceholder: {
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  // 미니 KPI 뱃지 — 카드 우상단에 표시되는 작은 알약 모양
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  badgeHighlight: {
    backgroundColor: COLORS.error + '30',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  badgeTextHighlight: {
    color: COLORS.error,
  },
});
