/**
 * 관리자 KPI 대시보드 화면
 *
 * 역할: 창업자(비개발자)가 앱의 핵심 지표를 한눈에 파악할 수 있는 "경영 대시보드"
 *
 * 비유: "회사의 실시간 성적표"
 *   - 상단 4장 카드 = 가장 중요한 핵심 지표 (유저수, 활성, 신규, 프리미엄)
 *     + 어제 대비 변화량 화살표 (DeltaIndicator)
 *   - 중단 4장 카드 = 운영 건강 지표 (주간활성, 크레딧, 예측참여, 이탈위험)
 *   - 활동 요약 바 = 투표/카드/조회 건수 한줄 요약
 *   - 하단 피드 = 시간대별 그룹으로 분류된 최근 활동 로그
 *
 * 진입점: profile.tsx 관리자 메뉴 → "대시보드"
 */

import React, { useCallback, useState, useMemo } from 'react';
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
import {
  useAdminOverview,
  useRecentActivity,
  useAdminDailyComparison,
} from '../../src/hooks/useAdminDashboard';
import DeltaIndicator from '../../src/components/admin/DeltaIndicator';
import { COLORS } from '../../src/styles/theme';

// ─── 타입 정의 ─────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface KpiCardConfig {
  label: string;
  icon: IoniconsName;
  color: string;
  getValue: (data: any) => string;
  getSubLabel?: (data: any) => string;
  /** comparison 데이터에서 delta를 꺼내기 위한 키 */
  comparisonKey?: string;
  /** delta 옆에 붙는 접미사 (예: "명", "건") */
  deltaSuffix?: string;
}

interface ActivityEvent {
  event_name: string;
  properties: Record<string, any> | null;
  user_id: string | null;
  email: string | null;
  created_at: string;
}

// ─── 이벤트 이름 한국어 매핑 ──────────────────────────────────

const EVENT_LABEL_MAP: Record<string, { label: string; icon: IoniconsName }> = {
  screen_view: { label: '화면 조회', icon: 'eye-outline' },
  prediction_vote: { label: '예측 투표', icon: 'help-circle-outline' },
  context_card_read: { label: '카드 읽기', icon: 'newspaper-outline' },
  share_card: { label: '공유', icon: 'share-social-outline' },
  achievement_earned: { label: '업적 달성', icon: 'trophy-outline' },
  review_completed: { label: '복기 완료', icon: 'checkmark-done-outline' },
  crisis_banner_shown: { label: '위기 알림', icon: 'alert-circle-outline' },
};

// ─── 숫자 포맷 유틸 ──────────────────────────────────────────

function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

function formatCredits(value: number): string {
  return `${formatNumber(value)}C`;
}

const CREDIT_SYMBOL = '\u20A9'; // ₩

function formatCreditsWithKrw(value: number): string {
  const krw = value * 100;
  return `${formatNumber(value)}C (${CREDIT_SYMBOL}${formatNumber(krw)})`;
}

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}

// ─── 시간대 그룹 분류 유틸 ───────────────────────────────────

type TimeGroup = '방금' | '1시간 이내' | '오늘' | '어제' | '이전';

function getTimeGroup(dateString: string): TimeGroup {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  // "방금" — 5분 미만
  if (diffMinutes < 5) return '방금';

  // "1시간 이내" — 5분~60분
  if (diffMinutes < 60) return '1시간 이내';

  // "오늘" — 같은 날
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (nowDate.getTime() === eventDate.getTime()) return '오늘';

  // "어제" — 하루 전
  const yesterdayDate = new Date(nowDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  if (yesterdayDate.getTime() === eventDate.getTime()) return '어제';

  // "이전" — 그 이전
  return '이전';
}

/** 시간대별로 활동 이벤트를 그룹화합니다. 그룹 순서는 고정입니다. */
function groupActivitiesByTime(
  activities: ActivityEvent[],
): { group: TimeGroup; items: ActivityEvent[] }[] {
  const ORDER: TimeGroup[] = ['방금', '1시간 이내', '오늘', '어제', '이전'];
  const buckets = new Map<TimeGroup, ActivityEvent[]>();

  for (const group of ORDER) {
    buckets.set(group, []);
  }

  for (const event of activities) {
    const group = getTimeGroup(event.created_at);
    buckets.get(group)!.push(event);
  }

  // 비어있는 그룹은 제외
  return ORDER.filter((g) => buckets.get(g)!.length > 0).map((g) => ({
    group: g,
    items: buckets.get(g)!,
  }));
}

// ─── 활동 요약 카운트 ────────────────────────────────────────

interface ActivitySummary {
  votes: number;
  cards: number;
  views: number;
}

function computeActivitySummary(activities: ActivityEvent[]): ActivitySummary {
  let votes = 0;
  let cards = 0;
  let views = 0;

  for (const event of activities) {
    switch (event.event_name) {
      case 'prediction_vote':
        votes++;
        break;
      case 'context_card_read':
        cards++;
        break;
      case 'screen_view':
        views++;
        break;
    }
  }

  return { votes, cards, views };
}

// ─── KPI 카드 설정 ───────────────────────────────────────────

const PRIMARY_KPIS: KpiCardConfig[] = [
  {
    label: '전체 유저',
    icon: 'people',
    color: COLORS.info,
    getValue: (d) => `${formatNumber(d.total_users)}명`,
  },
  {
    label: '오늘 활성',
    icon: 'pulse',
    color: COLORS.primary,
    getValue: (d) => `${formatNumber(d.dau)}명`,
    getSubLabel: (d) => {
      if (d.total_users === 0) return '전체의 0%';
      const pct = ((d.dau / d.total_users) * 100).toFixed(1);
      return `전체의 ${pct}%`;
    },
    comparisonKey: 'dau',
    deltaSuffix: '명',
  },
  {
    label: '신규 가입',
    icon: 'person-add',
    color: COLORS.primaryLight,
    getValue: (d) => `${formatNumber(d.new_today)}명`,
    getSubLabel: (d) => `이번 주 ${formatNumber(d.new_this_week)}명`,
    comparisonKey: 'signups',
    deltaSuffix: '명',
  },
  {
    label: 'Premium',
    icon: 'diamond',
    color: '#FFC107',
    getValue: (d) => `${formatNumber(d.premium_count)}명`,
    getSubLabel: (d) => {
      if (d.total_users === 0) return '전환율 0%';
      const pct = ((d.premium_count / d.total_users) * 100).toFixed(1);
      return `전환율 ${pct}%`;
    },
  },
];

const SECONDARY_KPIS: KpiCardConfig[] = [
  {
    label: '주간 활성',
    icon: 'calendar',
    color: COLORS.info,
    getValue: (d) => `${formatNumber(d.wau)}명`,
    getSubLabel: (d) => 'WAU',
  },
  {
    label: '크레딧 발급',
    icon: 'add-circle',
    color: COLORS.primary,
    getValue: (d) => formatCredits(d.credits_issued_today),
    getSubLabel: (d) => `(${CREDIT_SYMBOL}${formatNumber(d.credits_issued_today * 100)})`,
    comparisonKey: 'credits_issued',
    deltaSuffix: 'C',
  },
  {
    label: '예측 참여',
    icon: 'help-circle',
    color: COLORS.warning,
    getValue: (d) => `${formatNumber(d.predictions_today)}건`,
    getSubLabel: () => '오늘',
    comparisonKey: 'votes',
    deltaSuffix: '건',
  },
  {
    label: '이탈 위험',
    icon: 'warning',
    color: COLORS.error,
    getValue: (d) => `${formatNumber(d.churn_risk_count)}명`,
    getSubLabel: (d) => d.churn_risk_count > 0 ? '주의 필요' : '안전',
  },
];

// ─── 컴포넌트 ────────────────────────────────────────────────

/** KPI 카드 단일 컴포넌트 (어제 대비 delta 표시 포함) */
function KpiCard({
  config,
  data,
  large,
  comparison,
}: {
  config: KpiCardConfig;
  data: any;
  large?: boolean;
  comparison?: any;
}) {
  if (!data) return null;
  const value = config.getValue(data);
  const subLabel = config.getSubLabel?.(data);

  // comparison 데이터에서 delta 추출
  const delta =
    comparison && config.comparisonKey && comparison[config.comparisonKey]
      ? comparison[config.comparisonKey].delta
      : null;

  return (
    <View style={[styles.kpiCard, large && styles.kpiCardLarge]}>
      <View style={[styles.kpiIconContainer, { backgroundColor: config.color + '20' }]}>
        <Ionicons
          name={config.icon}
          size={large ? 22 : 18}
          color={config.color}
        />
      </View>
      <Text style={styles.kpiLabel}>{config.label}</Text>
      <Text style={[styles.kpiValue, large && styles.kpiValueLarge, { color: config.color }]}>
        {value}
      </Text>
      {/* 어제 대비 변화량 — comparison 데이터가 있을 때만 표시 */}
      {delta !== null && delta !== undefined && (
        <View style={styles.deltaContainer}>
          <DeltaIndicator
            delta={delta}
            suffix={config.deltaSuffix}
            compact={!large}
          />
        </View>
      )}
      {subLabel && (
        <Text style={styles.kpiSubLabel}>{subLabel}</Text>
      )}
    </View>
  );
}

/** 최근 활동 아이템 컴포넌트 */
function ActivityItem({ event }: { event: ActivityEvent }) {
  const mapped = EVENT_LABEL_MAP[event.event_name];
  const label = mapped?.label ?? event.event_name;
  const icon = mapped?.icon ?? ('ellipse-outline' as IoniconsName);
  const email = event.email || '익명';
  const relativeTime = getRelativeTime(event.created_at);

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityIconContainer}>
        <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityTopRow}>
          <Text style={styles.activityLabel} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.activityTime}>{relativeTime}</Text>
        </View>
        <Text style={styles.activityEmail} numberOfLines={1}>
          {email}
        </Text>
      </View>
    </View>
  );
}

/** 시간대 그룹 섹션 헤더 */
function TimeGroupHeader({ group }: { group: TimeGroup }) {
  return (
    <View style={styles.timeGroupHeader}>
      <View style={styles.timeGroupDot} />
      <Text style={styles.timeGroupText}>{group}</Text>
    </View>
  );
}

/** 활동 요약 바 — 투표/카드/조회 건수 한줄 요약 */
function ActivitySummaryBar({ summary }: { summary: ActivitySummary }) {
  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryItem}>
        <Ionicons name="help-circle-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.summaryText}>
          투표 <Text style={styles.summaryCount}>{summary.votes}건</Text>
        </Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Ionicons name="newspaper-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.summaryText}>
          카드 <Text style={styles.summaryCount}>{summary.cards}건</Text>
        </Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.summaryText}>
          조회 <Text style={styles.summaryCount}>{summary.views}건</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── 메인 화면 ───────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useAdminOverview();

  const {
    data: activities,
    isLoading: activitiesLoading,
    refetch: refetchActivities,
  } = useRecentActivity(15);

  const {
    data: comparison,
    refetch: refetchComparison,
  } = useAdminDailyComparison();

  const isLoading = overviewLoading && !overview;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchOverview(), refetchActivities(), refetchComparison()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchOverview, refetchActivities, refetchComparison]);

  // 활동 피드를 시간대별로 그룹화
  const groupedActivities = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    return groupActivitiesByTime(activities);
  }, [activities]);

  // 활동 요약 카운트 계산
  const activitySummary = useMemo(() => {
    if (!activities || activities.length === 0) return null;
    return computeActivitySummary(activities);
  }, [activities]);

  // ─── 로딩 상태 ─────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>대시보드</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 에러 상태 ─────────────────────────────────

  if (overviewError && !overview) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>대시보드</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorTitle}>데이터를 불러올 수 없습니다</Text>
          <Text style={styles.errorMessage}>
            {overviewError instanceof Error
              ? overviewError.message
              : '네트워크 연결을 확인해주세요.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetchOverview()}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 정상 렌더 ─────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>대시보드</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ─── 핵심 KPI (Primary) ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>핵심 지표</Text>
          <Text style={styles.sectionSubtitle}>1분마다 자동 갱신</Text>
        </View>

        <View style={styles.kpiGrid}>
          {PRIMARY_KPIS.map((kpi) => (
            <KpiCard
              key={kpi.label}
              config={kpi}
              data={overview}
              large
              comparison={comparison}
            />
          ))}
        </View>

        {/* ─── 운영 KPI (Secondary) ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>운영 지표</Text>
          <Text style={styles.sectionSubtitle}>오늘 기준</Text>
        </View>

        <View style={styles.kpiGrid}>
          {SECONDARY_KPIS.map((kpi) => (
            <KpiCard
              key={kpi.label}
              config={kpi}
              data={overview}
              comparison={comparison}
            />
          ))}
        </View>

        {/* ─── 추가 정보 배너 ─── */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerItem}>
            <Text style={styles.infoBannerLabel}>게시글</Text>
            <Text style={styles.infoBannerValue}>
              {overview ? `${formatNumber(overview.posts_today)}건` : '-'}
            </Text>
          </View>
          <View style={styles.infoBannerDivider} />
          <View style={styles.infoBannerItem}>
            <Text style={styles.infoBannerLabel}>미처리 신고</Text>
            <Text
              style={[
                styles.infoBannerValue,
                overview && overview.pending_reports > 0 && { color: COLORS.error },
              ]}
            >
              {overview ? `${formatNumber(overview.pending_reports)}건` : '-'}
            </Text>
          </View>
          <View style={styles.infoBannerDivider} />
          <View style={styles.infoBannerItem}>
            <Text style={styles.infoBannerLabel}>크레딧 소비</Text>
            <Text style={styles.infoBannerValue}>
              {overview ? `${formatCredits(overview.credits_spent_today)} (${CREDIT_SYMBOL}${formatNumber(overview.credits_spent_today * 100)})` : '-'}
            </Text>
          </View>
        </View>

        {/* ─── 최근 활동 피드 ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 활동</Text>
          <Text style={styles.sectionSubtitle}>최근 15건</Text>
        </View>

        {/* 활동 요약 바 — 투표/카드/조회 건수 */}
        {activitySummary && (
          <ActivitySummaryBar summary={activitySummary} />
        )}

        {activitiesLoading && !activities ? (
          <View style={styles.activityLoadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.activityLoadingText}>활동 내역 불러오는 중...</Text>
          </View>
        ) : groupedActivities.length > 0 ? (
          <View style={styles.activityList}>
            {groupedActivities.map((section) => (
              <React.Fragment key={section.group}>
                {/* 시간대 그룹 헤더 */}
                <TimeGroupHeader group={section.group} />
                {/* 해당 그룹의 활동 아이템들 */}
                {section.items.map((event, index) => (
                  <ActivityItem
                    key={`${section.group}-${event.created_at}-${index}`}
                    event={event}
                  />
                ))}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyActivity}>
            <Ionicons name="file-tray-outline" size={32} color={COLORS.textSecondary} />
            <Text style={styles.emptyActivityText}>최근 활동이 없습니다.</Text>
          </View>
        )}

        {/* 하단 여백 */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  // 레이아웃
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // 로딩
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },

  // 에러
  errorTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // 섹션 헤더
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // KPI 그리드
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // KPI 카드
  kpiCard: {
    width: '47%' as any,
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
  },
  kpiCardLarge: {
    padding: 16,
  },
  kpiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 23,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  kpiValueLarge: {
    fontSize: 27,
  },
  kpiSubLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  deltaContainer: {
    marginTop: 4,
  },

  // 정보 배너
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  infoBannerItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoBannerDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  infoBannerLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoBannerValue: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // 활동 요약 바
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryCount: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryDivider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },

  // 시간대 그룹 헤더
  timeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surfaceLight,
  },
  timeGroupDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  timeGroupText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // 최근 활동 피드
  activityList: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activityEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activityLoadingContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
  },
  activityLoadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  emptyActivity: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});
