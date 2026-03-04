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
import type { AdminOverview, DailyComparisonData } from '../../src/services/adminService';
import DeltaIndicator from '../../src/components/admin/DeltaIndicator';
import { COLORS } from '../../src/styles/theme';
import { useLocale } from '../../src/context/LocaleContext';

// ─── 타입 정의 ─────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface KpiCardConfig {
  tKey: string;
  icon: IoniconsName;
  color: string;
  getValue: (data: AdminOverview, t: (key: string) => string) => string;
  getSubLabel?: (data: AdminOverview, t: (key: string) => string) => string;
  /** comparison 데이터에서 delta를 꺼내기 위한 키 */
  comparisonKey?: keyof DailyComparisonData;
  /** delta 옆에 붙는 접미사 키 */
  deltaSuffixKey?: string;
}

interface ActivityEvent {
  event_name: string;
  properties: Record<string, unknown> | null;
  user_id: string | null;
  email: string | null;
  created_at: string;
}

// ─── 이벤트 이름 한국어 매핑 ──────────────────────────────────

const EVENT_LABEL_MAP: Record<string, { tKey: string; icon: IoniconsName }> = {
  screen_view: { tKey: 'admin.dashboard.event.screenView', icon: 'eye-outline' },
  prediction_vote: { tKey: 'admin.dashboard.event.predictionVote', icon: 'help-circle-outline' },
  context_card_read: { tKey: 'admin.dashboard.event.cardRead', icon: 'newspaper-outline' },
  share_card: { tKey: 'admin.dashboard.event.share', icon: 'share-social-outline' },
  achievement_earned: { tKey: 'admin.dashboard.event.achievement', icon: 'trophy-outline' },
  review_completed: { tKey: 'admin.dashboard.event.reviewCompleted', icon: 'checkmark-done-outline' },
  crisis_banner_shown: { tKey: 'admin.dashboard.event.crisisAlert', icon: 'alert-circle-outline' },
};

// ─── 숫자 포맷 유틸 ──────────────────────────────────────────

function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

function formatCredits(value: number, t?: (key: string) => string): string {
  const unit = t ? t('common.unitPieces') : '개';
  return `${formatNumber(value)}${unit}`;
}

const CREDIT_SYMBOL = '\u20A9'; // ₩

function getRelativeTime(dateString: string, t: (key: string) => string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return t('common.time.justNow');
  if (diffMinutes < 60) return t('common.time.minutesAgo').replace('{{n}}', String(diffMinutes));
  if (diffHours < 24) return t('common.time.hoursAgo').replace('{{n}}', String(diffHours));
  if (diffDays < 7) return t('common.time.daysAgo').replace('{{n}}', String(diffDays));
  return date.toLocaleDateString();
}

// ─── 시간대 그룹 분류 유틸 ───────────────────────────────────

type TimeGroup = 'justNow' | 'withinHour' | 'today' | 'yesterday' | 'earlier';

const TIME_GROUP_KEYS: Record<TimeGroup, string> = {
  justNow: 'admin.dashboard.timeGroup.justNow',
  withinHour: 'admin.dashboard.timeGroup.withinHour',
  today: 'admin.dashboard.timeGroup.today',
  yesterday: 'admin.dashboard.timeGroup.yesterday',
  earlier: 'admin.dashboard.timeGroup.earlier',
};

function getTimeGroup(dateString: string): TimeGroup {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 5) return 'justNow';
  if (diffMinutes < 60) return 'withinHour';

  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (nowDate.getTime() === eventDate.getTime()) return 'today';

  const yesterdayDate = new Date(nowDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  if (yesterdayDate.getTime() === eventDate.getTime()) return 'yesterday';

  return 'earlier';
}

/** 시간대별로 활동 이벤트를 그룹화합니다. 그룹 순서는 고정입니다. */
function groupActivitiesByTime(
  activities: ActivityEvent[],
): { group: TimeGroup; items: ActivityEvent[] }[] {
  const ORDER: TimeGroup[] = ['justNow', 'withinHour', 'today', 'yesterday', 'earlier'];
  const buckets = new Map<TimeGroup, ActivityEvent[]>();

  for (const group of ORDER) {
    buckets.set(group, []);
  }

  for (const event of activities) {
    const group = getTimeGroup(event.created_at);
    buckets.get(group)?.push(event);
  }

  // 비어있는 그룹은 제외
  return ORDER.filter((g) => (buckets.get(g)?.length ?? 0) > 0).map((g) => ({
    group: g,
    items: buckets.get(g) ?? [],
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
    tKey: 'admin.dashboard.kpi.totalUsers',
    icon: 'people',
    color: COLORS.info,
    getValue: (d, t) => `${formatNumber(d.total_users)}${t('admin.users.countUnit')}`,
  },
  {
    tKey: 'admin.dashboard.kpi.todayActive',
    icon: 'pulse',
    color: COLORS.primary,
    getValue: (d, t) => `${formatNumber(d.dau)}${t('admin.users.countUnit')}`,
    getSubLabel: (d, t) => {
      if (d.total_users === 0) return `${t('admin.dashboard.ofTotal')} 0%`;
      const pct = ((d.dau / d.total_users) * 100).toFixed(1);
      return `${t('admin.dashboard.ofTotal')} ${pct}%`;
    },
    comparisonKey: 'dau',
    deltaSuffixKey: 'admin.users.countUnit',
  },
  {
    tKey: 'admin.dashboard.kpi.newSignups',
    icon: 'person-add',
    color: COLORS.primaryLight,
    getValue: (d, t) => `${formatNumber(d.new_today)}${t('admin.users.countUnit')}`,
    getSubLabel: (d, t) => `${t('admin.dashboard.thisWeek')} ${formatNumber(d.new_this_week)}${t('admin.users.countUnit')}`,
    comparisonKey: 'signups',
    deltaSuffixKey: 'admin.users.countUnit',
  },
  {
    tKey: 'admin.dashboard.kpi.premium',
    icon: 'diamond',
    color: '#FFC107',
    getValue: (d, t) => `${formatNumber(d.premium_count)}${t('admin.users.countUnit')}`,
    getSubLabel: (d, t) => {
      if (d.total_users === 0) return `${t('admin.dashboard.conversionRate')} 0%`;
      const pct = ((d.premium_count / d.total_users) * 100).toFixed(1);
      return `${t('admin.dashboard.conversionRate')} ${pct}%`;
    },
  },
];

const SECONDARY_KPIS: KpiCardConfig[] = [
  {
    tKey: 'admin.dashboard.kpi.weeklyActive',
    icon: 'calendar',
    color: COLORS.info,
    getValue: (d, t) => `${formatNumber(d.wau)}${t('admin.users.countUnit')}`,
    getSubLabel: () => 'WAU',
  },
  {
    tKey: 'admin.dashboard.kpi.creditsIssued',
    icon: 'add-circle',
    color: COLORS.primary,
    getValue: (d, t) => formatCredits(d.credits_issued_today, t),
    getSubLabel: (d) => `(${CREDIT_SYMBOL}${formatNumber(d.credits_issued_today * 100)})`,
    comparisonKey: 'credits_issued',
    deltaSuffixKey: 'C',
  },
  {
    tKey: 'admin.dashboard.kpi.predictions',
    icon: 'help-circle',
    color: COLORS.warning,
    getValue: (d, t) => `${formatNumber(d.predictions_today)}${t('common.unitCount')}`,
    getSubLabel: (d, t) => t('admin.dashboard.today'),
    comparisonKey: 'votes',
    deltaSuffixKey: 'common.unitCount',
  },
  {
    tKey: 'admin.dashboard.kpi.churnRisk',
    icon: 'warning',
    color: COLORS.error,
    getValue: (d, t) => `${formatNumber(d.churn_risk_count)}${t('admin.users.countUnit')}`,
    getSubLabel: (d, t) => d.churn_risk_count > 0 ? t('admin.dashboard.needsAttention') : t('admin.dashboard.safe'),
  },
];

// ─── 컴포넌트 ────────────────────────────────────────────────

/** KPI 카드 단일 컴포넌트 (어제 대비 delta 표시 포함) */
function KpiCard({
  config,
  data,
  large,
  comparison,
  t,
}: {
  config: KpiCardConfig;
  data: AdminOverview | null | undefined;
  large?: boolean;
  comparison?: DailyComparisonData | null;
  t: (key: string) => string;
}) {
  if (!data) return null;
  const value = config.getValue(data, t);
  const subLabel = config.getSubLabel?.(data, t);

  // comparison 데이터에서 delta 추출
  const delta =
    comparison && config.comparisonKey && comparison[config.comparisonKey]
      ? comparison[config.comparisonKey].delta
      : null;

  const deltaSuffix = config.deltaSuffixKey ? t(config.deltaSuffixKey) : undefined;

  return (
    <View style={[styles.kpiCard, large && styles.kpiCardLarge]}>
      <View style={[styles.kpiIconContainer, { backgroundColor: config.color + '20' }]}>
        <Ionicons
          name={config.icon}
          size={large ? 22 : 18}
          color={config.color}
        />
      </View>
      <Text style={styles.kpiLabel}>{t(config.tKey)}</Text>
      <Text style={[styles.kpiValue, large && styles.kpiValueLarge, { color: config.color }]}>
        {value}
      </Text>
      {delta !== null && delta !== undefined && (
        <View style={styles.deltaContainer}>
          <DeltaIndicator
            delta={delta}
            suffix={deltaSuffix}
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
function ActivityItem({ event, t }: { event: ActivityEvent; t: (key: string) => string }) {
  const mapped = EVENT_LABEL_MAP[event.event_name];
  const label = mapped?.tKey ? t(mapped.tKey) : event.event_name;
  const icon = mapped?.icon ?? ('ellipse-outline' as IoniconsName);
  const email = event.email || t('common.anonymous');
  const relativeTime = getRelativeTime(event.created_at, t);

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
function TimeGroupHeader({ group, t }: { group: TimeGroup; t: (key: string) => string }) {
  return (
    <View style={styles.timeGroupHeader}>
      <View style={styles.timeGroupDot} />
      <Text style={styles.timeGroupText}>{t(TIME_GROUP_KEYS[group])}</Text>
    </View>
  );
}

/** 활동 요약 바 — 투표/카드/조회 건수 한줄 요약 */
function ActivitySummaryBar({ summary, t }: { summary: ActivitySummary; t: (key: string) => string }) {
  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryItem}>
        <Ionicons name="help-circle-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.summaryText}>
          {t('admin.dashboard.votes')} <Text style={styles.summaryCount}>{summary.votes}{t('common.unitCount')}</Text>
        </Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Ionicons name="newspaper-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.summaryText}>
          {t('admin.dashboard.cards')} <Text style={styles.summaryCount}>{summary.cards}{t('common.unitCount')}</Text>
        </Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.summaryText}>
          {t('admin.dashboard.views')} <Text style={styles.summaryCount}>{summary.views}{t('common.unitCount')}</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── 메인 화면 ───────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { t } = useLocale();
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
          <Text style={styles.headerTitle}>{t('admin.dashboard.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('admin.dashboard.loading')}</Text>
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
          <Text style={styles.headerTitle}>{t('admin.dashboard.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorTitle}>{t('admin.dashboard.loadError')}</Text>
          <Text style={styles.errorMessage}>
            {overviewError instanceof Error
              ? overviewError.message
              : t('admin.dashboard.checkNetwork')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetchOverview()}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
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
          <Text style={styles.sectionTitle}>{t('admin.dashboard.section.primaryKpi')}</Text>
          <Text style={styles.sectionSubtitle}>{t('admin.dashboard.autoRefresh')}</Text>
        </View>

        <View style={styles.kpiGrid}>
          {PRIMARY_KPIS.map((kpi) => (
            <KpiCard
              key={kpi.tKey}
              config={kpi}
              data={overview}
              large
              comparison={comparison}
              t={t}
            />
          ))}
        </View>

        {/* ─── 운영 KPI (Secondary) ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('admin.dashboard.section.secondaryKpi')}</Text>
          <Text style={styles.sectionSubtitle}>{t('admin.dashboard.asOfToday')}</Text>
        </View>

        <View style={styles.kpiGrid}>
          {SECONDARY_KPIS.map((kpi) => (
            <KpiCard
              key={kpi.tKey}
              config={kpi}
              data={overview}
              comparison={comparison}
              t={t}
            />
          ))}
        </View>

        {/* ─── 추가 정보 배너 ─── */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerItem}>
            <Text style={styles.infoBannerLabel}>{t('admin.dashboard.banner.posts')}</Text>
            <Text style={styles.infoBannerValue}>
              {overview ? `${formatNumber(overview.posts_today)}${t('common.unitCount')}` : '-'}
            </Text>
          </View>
          <View style={styles.infoBannerDivider} />
          <View style={styles.infoBannerItem}>
            <Text style={styles.infoBannerLabel}>{t('admin.dashboard.banner.pendingReports')}</Text>
            <Text
              style={[
                styles.infoBannerValue,
                overview && overview.pending_reports > 0 && { color: COLORS.error },
              ]}
            >
              {overview ? `${formatNumber(overview.pending_reports)}${t('common.unitCount')}` : '-'}
            </Text>
          </View>
          <View style={styles.infoBannerDivider} />
          <View style={styles.infoBannerItem}>
            <Text style={styles.infoBannerLabel}>{t('admin.dashboard.banner.creditsSpent')}</Text>
            <Text style={styles.infoBannerValue}>
              {overview ? `${formatCredits(overview.credits_spent_today, t)} (${CREDIT_SYMBOL}${formatNumber(overview.credits_spent_today * 100)})` : '-'}
            </Text>
          </View>
        </View>

        {/* ─── 최근 활동 피드 ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('admin.dashboard.section.recentActivity')}</Text>
          <Text style={styles.sectionSubtitle}>{t('admin.dashboard.recent15')}</Text>
        </View>

        {/* 활동 요약 바 — 투표/카드/조회 건수 */}
        {activitySummary && (
          <ActivitySummaryBar summary={activitySummary} t={t} />
        )}

        {activitiesLoading && !activities ? (
          <View style={styles.activityLoadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.activityLoadingText}>{t('admin.dashboard.loadingActivity')}</Text>
          </View>
        ) : groupedActivities.length > 0 ? (
          <View style={styles.activityList}>
            {groupedActivities.map((section) => (
              <React.Fragment key={section.group}>
                {/* 시간대 그룹 헤더 */}
                <TimeGroupHeader group={section.group} t={t} />
                {/* 해당 그룹의 활동 아이템들 */}
                {section.items.map((event, index) => (
                  <ActivityItem
                    key={`${section.group}-${event.created_at}-${index}`}
                    event={event}
                    t={t}
                  />
                ))}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyActivity}>
            <Ionicons name="file-tray-outline" size={32} color={COLORS.textSecondary} />
            <Text style={styles.emptyActivityText}>{t('admin.dashboard.noActivity')}</Text>
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
    width: '47%' as unknown as number,
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
