/**
 * 관리자 허브 (Admin Hub) — 메인 내비게이션 화면
 *
 * 역할: 관리자 전용 기능들의 진입점 (출입구)
 *       4개의 카드 메뉴를 통해 각 관리 화면으로 이동합니다.
 *
 * 비유: "회사 본사 로비" — 각 부서(대시보드, 유저, 신고, 분석)로 가는 안내 데스크
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
import { useIsAdmin } from '../../src/hooks/useAdminDashboard';
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
];

// ================================================================
// 메인 컴포넌트
// ================================================================

export default function AdminHubScreen() {
  const router = useRouter();
  const { data: isAdmin, isLoading, error } = useIsAdmin();

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
  // 관리자 허브: 2x2 그리드 카드
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

      {/* 그리드 */}
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          {ADMIN_CARDS.slice(0, 2).map((card) => (
            <TouchableOpacity
              key={card.key}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(card.route as any)}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={card.icon} size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.gridRow}>
          {ADMIN_CARDS.slice(2, 4).map((card) => (
            <TouchableOpacity
              key={card.key}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(card.route as any)}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={card.icon} size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
});
