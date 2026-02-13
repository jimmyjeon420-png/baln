/**
 * 상세 분석 화면 (Detailed Analytics) — 관리자 전용
 *
 * 역할: 리텐션율, 가입/DAU 추이, 유저 분포를 한눈에 보여주는 분석 대시보드
 *
 * 비유: "회사의 경영 분석 보고서" — 고객이 얼마나 남아있는지(리텐션),
 *       매일 얼마나 오는지(DAU), 어떤 등급/플랜/자산 구간에 분포하는지를
 *       차트와 숫자로 보여주는 화면입니다.
 *
 * 섹션 구성:
 *   1. 리텐션율 카드 (D1 / D7 / D30)
 *   2. 7일간 가입 추이 (수평 바 차트)
 *   3. 7일간 DAU 추이 (수평 바 차트)
 *   4. 등급별 유저 분포 (SILVER / GOLD / PLATINUM / DIAMOND)
 *   5. 플랜별 유저 분포 (무료 / 프리미엄)
 *   6. 자산 구간별 분포 (B1 ~ B5)
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAdminRetention } from '../../src/hooks/useAdminDashboard';

// ================================================================
// 색상 상수 (다크 모드 핀테크 UI)
// ================================================================

const COLORS = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2C2C2C',
  primary: '#4CAF50',
  primaryLight: '#66BB6A',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#757575',
  border: '#3A3A3A',
  error: '#CF6679',
  warning: '#FFB74D',
  info: '#29B6F6',
};

// 등급별 색상
const TIER_COLORS: Record<string, string> = {
  SILVER: '#9E9E9E',
  GOLD: '#FFC107',
  PLATINUM: '#29B6F6',
  DIAMOND: '#7C4DFF',
};

// 플랜별 색상
const PLAN_COLORS: Record<string, string> = {
  free: '#9E9E9E',
  premium: '#FFC107',
};

// 자산 구간 라벨
const BRACKET_LABELS: Record<string, string> = {
  B1: '1천만 미만',
  B2: '3천만 미만',
  B3: '5천만 미만',
  B4: '1억 미만',
  B5: '1억 이상',
};

// 플랜 라벨 (한글)
const PLAN_LABELS: Record<string, string> = {
  free: '무료',
  premium: '프리미엄',
};

// ================================================================
// 수평 바 컴포넌트 — 단일 행 (라벨 + 바 + 값)
// ================================================================

function HorizontalBar({
  label,
  value,
  maxValue,
  color,
  suffix,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  suffix?: string;
}) {
  const width = maxValue > 0 ? Math.max(4, (value / maxValue) * 100) : 4;

  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={barStyles.barContainer}>
        <View
          style={[
            barStyles.bar,
            { width: `${width}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={barStyles.value}>
        {value}
        {suffix || ''}
      </Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    width: 80,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  value: {
    width: 50,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginLeft: 8,
  },
});

// ================================================================
// 분포 바 컴포넌트 — 라벨 + 바 + 카운트 + 퍼센트
// ================================================================

function DistributionBar({
  label,
  value,
  maxValue,
  total,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  total: number;
  color: string;
}) {
  const width = maxValue > 0 ? Math.max(4, (value / maxValue) * 100) : 4;
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

  return (
    <View style={distStyles.row}>
      <Text style={distStyles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={distStyles.barContainer}>
        <View
          style={[
            distStyles.bar,
            { width: `${width}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={distStyles.value}>
        {value}명 ({percentage}%)
      </Text>
    </View>
  );
}

const distStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    width: 88,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  barContainer: {
    flex: 1,
    height: 22,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  value: {
    width: 100,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginLeft: 8,
  },
});

// ================================================================
// 리텐션 카드 색상 헬퍼
// ================================================================

function getRetentionColor(rate: number): string {
  if (rate >= 40) return COLORS.primary;
  if (rate >= 20) return COLORS.warning;
  return COLORS.error;
}

// ================================================================
// 날짜 포맷 (YYYY-MM-DD → MM/DD)
// ================================================================

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return dateStr;
}

// ================================================================
// 메인 컴포넌트
// ================================================================

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useAdminRetention();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // --------------------------------------------------
  // 로딩 상태
  // --------------------------------------------------
  if (isLoading && !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>상세 분석</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>분석 데이터 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // 에러 상태
  // --------------------------------------------------
  if (error && !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>상세 분석</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons
            name="warning-outline"
            size={48}
            color={COLORS.error}
          />
          <Text style={styles.errorTitle}>데이터 로드 실패</Text>
          <Text style={styles.errorMessage}>
            {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Ionicons name="refresh" size={18} color={COLORS.textPrimary} />
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // 데이터가 없는 경우 (null safety)
  // --------------------------------------------------
  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>상세 분석</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="analytics-outline" size={48} color={COLORS.textTertiary} />
          <Text style={styles.emptyText}>분석 데이터가 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // 데이터 준비
  // --------------------------------------------------

  // 7-day signup trend max value
  const maxSignup = Math.max(
    ...data.daily_signups_7d.map((d) => d.count),
    1,
  );

  // 7-day DAU trend max value
  const maxDau = Math.max(
    ...data.daily_dau_7d.map((d) => d.count),
    1,
  );

  // Tier distribution
  const tierEntries = Object.entries(data.tier_distribution);
  const maxTierCount = Math.max(...tierEntries.map(([, v]) => v), 1);
  const totalTierUsers = tierEntries.reduce((sum, [, v]) => sum + v, 0);

  // Plan distribution
  const planEntries = Object.entries(data.plan_distribution);
  const maxPlanCount = Math.max(...planEntries.map(([, v]) => v), 1);
  const totalPlanUsers = planEntries.reduce((sum, [, v]) => sum + v, 0);

  // Bracket distribution
  const bracketEntries = Object.entries(data.bracket_distribution);
  const maxBracketCount = Math.max(...bracketEntries.map(([, v]) => v), 1);
  const totalBracketUsers = bracketEntries.reduce((sum, [, v]) => sum + v, 0);

  // --------------------------------------------------
  // 정상 렌더링
  // --------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상세 분석</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ============================================================ */}
        {/* Section 1: 리텐션율 카드 (D1, D7, D30) */}
        {/* ============================================================ */}
        <Text style={styles.sectionTitle}>리텐션율</Text>
        <Text style={styles.sectionSubtitle}>
          전체 가입자 {data.total_signups}명 기준
        </Text>

        <View style={styles.retentionRow}>
          {/* D1 */}
          <View style={styles.retentionCard}>
            <Text style={styles.retentionLabel}>D1</Text>
            <Text
              style={[
                styles.retentionRate,
                { color: getRetentionColor(data.d1_retention) },
              ]}
            >
              {data.d1_retention.toFixed(1)}%
            </Text>
            <Text style={styles.retentionCount}>
              {data.d1_count}명 / {data.total_signups}명
            </Text>
          </View>

          {/* D7 */}
          <View style={styles.retentionCard}>
            <Text style={styles.retentionLabel}>D7</Text>
            <Text
              style={[
                styles.retentionRate,
                { color: getRetentionColor(data.d7_retention) },
              ]}
            >
              {data.d7_retention.toFixed(1)}%
            </Text>
            <Text style={styles.retentionCount}>
              {data.d7_count}명 / {data.total_signups}명
            </Text>
          </View>

          {/* D30 */}
          <View style={styles.retentionCard}>
            <Text style={styles.retentionLabel}>D30</Text>
            <Text
              style={[
                styles.retentionRate,
                { color: getRetentionColor(data.d30_retention) },
              ]}
            >
              {data.d30_retention.toFixed(1)}%
            </Text>
            <Text style={styles.retentionCount}>
              {data.d30_count}명 / {data.total_signups}명
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* Section 2: 7일간 가입 추이 */}
        {/* ============================================================ */}
        <Text style={[styles.sectionTitle, styles.sectionMarginTop]}>
          7일간 가입 추이
        </Text>
        <View style={styles.chartCard}>
          {data.daily_signups_7d.map((day) => (
            <HorizontalBar
              key={`signup-${day.date}`}
              label={formatDateShort(day.date)}
              value={day.count}
              maxValue={maxSignup}
              color={COLORS.primary}
              suffix="명"
            />
          ))}
          {data.daily_signups_7d.length === 0 && (
            <Text style={styles.noDataText}>데이터 없음</Text>
          )}
        </View>

        {/* ============================================================ */}
        {/* Section 3: 7일간 DAU 추이 */}
        {/* ============================================================ */}
        <Text style={[styles.sectionTitle, styles.sectionMarginTop]}>
          7일간 DAU 추이
        </Text>
        <View style={styles.chartCard}>
          {data.daily_dau_7d.map((day) => (
            <HorizontalBar
              key={`dau-${day.date}`}
              label={formatDateShort(day.date)}
              value={day.count}
              maxValue={maxDau}
              color={COLORS.info}
              suffix="명"
            />
          ))}
          {data.daily_dau_7d.length === 0 && (
            <Text style={styles.noDataText}>데이터 없음</Text>
          )}
        </View>

        {/* ============================================================ */}
        {/* Section 4: 등급별 유저 분포 */}
        {/* ============================================================ */}
        <Text style={[styles.sectionTitle, styles.sectionMarginTop]}>
          등급별 유저 분포
        </Text>
        <View style={styles.chartCard}>
          {['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].map((tier) => {
            const count = data.tier_distribution[tier] ?? 0;
            return (
              <DistributionBar
                key={`tier-${tier}`}
                label={tier}
                value={count}
                maxValue={maxTierCount}
                total={totalTierUsers}
                color={TIER_COLORS[tier] ?? COLORS.textTertiary}
              />
            );
          })}
          {tierEntries.length === 0 && (
            <Text style={styles.noDataText}>데이터 없음</Text>
          )}
        </View>

        {/* ============================================================ */}
        {/* Section 5: 플랜별 유저 분포 */}
        {/* ============================================================ */}
        <Text style={[styles.sectionTitle, styles.sectionMarginTop]}>
          플랜별 유저 분포
        </Text>
        <View style={styles.chartCard}>
          {['free', 'premium'].map((plan) => {
            const count = data.plan_distribution[plan] ?? 0;
            return (
              <DistributionBar
                key={`plan-${plan}`}
                label={PLAN_LABELS[plan] ?? plan}
                value={count}
                maxValue={maxPlanCount}
                total={totalPlanUsers}
                color={PLAN_COLORS[plan] ?? COLORS.textTertiary}
              />
            );
          })}
          {planEntries.length === 0 && (
            <Text style={styles.noDataText}>데이터 없음</Text>
          )}
        </View>

        {/* ============================================================ */}
        {/* Section 6: 자산 구간별 분포 */}
        {/* ============================================================ */}
        <Text style={[styles.sectionTitle, styles.sectionMarginTop]}>
          자산 구간별 분포
        </Text>
        <View style={styles.chartCard}>
          {['B1', 'B2', 'B3', 'B4', 'B5'].map((bracket, index) => {
            const count = data.bracket_distribution[bracket] ?? 0;
            // 점진적 투명도: B1=0.4, B2=0.55, B3=0.7, B4=0.85, B5=1.0
            const opacity = 0.4 + index * 0.15;
            const label = `${bracket} (${BRACKET_LABELS[bracket] ?? ''})`;
            return (
              <DistributionBar
                key={`bracket-${bracket}`}
                label={label}
                value={count}
                maxValue={maxBracketCount}
                total={totalBracketUsers}
                color={`rgba(76, 175, 80, ${opacity})`}
              />
            );
          })}
          {bracketEntries.length === 0 && (
            <Text style={styles.noDataText}>데이터 없음</Text>
          )}
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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

  // 스크롤
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // 중앙 정렬 컨테이너 (로딩, 에러, 빈 상태)
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

  // 에러 상태
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // 빈 상태
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },

  // 섹션 제목
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  sectionMarginTop: {
    marginTop: 28,
  },

  // 리텐션 카드 3개 행
  retentionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retentionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  retentionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  retentionRate: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  retentionCount: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },

  // 차트 카드 (섹션 컨테이너)
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // 데이터 없음
  noDataText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingVertical: 12,
  },

  // 하단 여백
  bottomSpacer: {
    height: 40,
  },
});
