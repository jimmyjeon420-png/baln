/**
 * 관리자용 유저 관리 화면
 *
 * 기능:
 * - 유저 목록 표시 (이메일 검색 + 페이지네이션)
 * - 정렬 칩: 최근활동순 / 자산순 / 크레딧순 / 가입일순
 * - 미니 요약 바: Premium 수, 평균 자산, 7일 활성
 * - 유저 카드: 티어 뱃지, 이메일 + 활동 상태 dot, 플랜, 가입일, 자산
 * - 유저 상세 모달: 기본/크레딧/예측/활동 로그 (useAdminUserDetail)
 * - 차단 토글 (useAdminBanUser)
 * - Pull-to-refresh + 무한 스크롤
 *
 * 비유: "고객 관리 대장" — 전체 회원 현황을 한눈에 보고,
 *       특정 회원을 탭하면 상세 프로필이 열리는 화면
 *
 * 진입점: 관리자 대시보드 → 유저 관리
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAdminUserList, useGrantBonusCredits, useAdminUserDetail, useAdminBanUser } from '../../src/hooks/useAdminDashboard';
import { AdminUser } from '../../src/services/adminService';
import { COLORS } from '../../src/styles/theme';
import { useLocale } from '../../src/context/LocaleContext';

// ─── 티어 색상 매핑 ─────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  SILVER: '#9E9E9E',
  GOLD: '#FFC107',
  PLATINUM: '#29B6F6',
  DIAMOND: '#7C4DFF',
};

// ─── 플랜 뱃지 색상 매핑 ────────────────────────────────────

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: COLORS.textTertiary },
  premium: { label: 'Premium', color: COLORS.warning },
  vip: { label: 'VIP', color: '#7C4DFF' },
};

// ─── 정렬 타입 ──────────────────────────────────────────────

type SortKey = 'created_at' | 'last_active' | 'total_assets' | 'credit_balance';

const SORT_CHIP_KEYS: { key: SortKey; tKey: string }[] = [
  { key: 'last_active', tKey: 'admin.users.sort.lastActive' },
  { key: 'total_assets', tKey: 'admin.users.sort.assets' },
  { key: 'credit_balance', tKey: 'admin.users.sort.credits' },
  { key: 'created_at', tKey: 'admin.users.sort.joinDate' },
];

// ─── 이벤트 이름 한국어 매핑 ─────────────────────────────────

const EVENT_LABEL_KEYS: Record<string, string> = {
  screen_view: 'admin.users.event.screenView',
  prediction_vote: 'admin.users.event.predictionVote',
  context_card_read: 'admin.users.event.cardRead',
  share_card: 'admin.users.event.share',
  achievement_earned: 'admin.users.event.achievement',
  review_completed: 'admin.users.event.reviewCompleted',
};

// ─── 크레딧 거래 타입 뱃지 색상 ──────────────────────────────

const CREDIT_TYPE_BADGE: Record<string, { tKey: string; color: string }> = {
  attendance: { tKey: 'admin.users.credit.attendance', color: COLORS.primary },
  prediction: { tKey: 'admin.users.credit.prediction', color: COLORS.info },
  share: { tKey: 'admin.users.credit.share', color: '#7C4DFF' },
  welcome: { tKey: 'admin.users.credit.welcome', color: COLORS.warning },
  bonus: { tKey: 'admin.users.credit.bonus', color: COLORS.warning },
  purchase: { tKey: 'admin.users.credit.purchase', color: COLORS.error },
  spend: { tKey: 'admin.users.credit.spend', color: COLORS.textTertiary },
  premium: { tKey: 'admin.users.credit.premium', color: COLORS.warning },
  admin_grant: { tKey: 'admin.users.credit.adminGrant', color: COLORS.primary },
};

// ─── 페이지네이션 상수 ──────────────────────────────────────

const PAGE_SIZE = 30;

// ─── 헬퍼 함수 ─────────────────────────────────────────────

/** 자산 금액을 포맷 (예: 1.2억, 5,000만, 300원) */
function formatAssets(amount: number, t: (key: string) => string): string {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}${t('common.unitBillion')}`;
  if (amount >= 10000) return `${Math.floor(amount / 10000).toLocaleString()}${t('common.unitTenThousand')}`;
  return `${amount.toLocaleString()}${t('common.unitWon')}`;
}

/** 상대 시간 표시 (예: 방금 전, 3시간 전, 2일 전) */
function getRelativeTime(dateStr: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('common.time.justNow');
  if (mins < 60) return t('common.time.minutesAgo').replace('{{n}}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('common.time.hoursAgo').replace('{{n}}', String(hours));
  const days = Math.floor(hours / 24);
  if (days < 30) return t('common.time.daysAgo').replace('{{n}}', String(days));
  return t('common.time.monthsAgo').replace('{{n}}', String(Math.floor(days / 30)));
}

/** 날짜를 "2026.02.10 가입" 형식으로 포맷 */
function formatJoinDate(dateStr: string, t: (key: string) => string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day} ${t('admin.users.joined')}`;
}

/** 날짜를 짧은 형식으로 포맷 (예: "02.10 14:30") */
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}.${day} ${h}:${min}`;
}

/** 크레딧을 원화 병기 형식으로 포맷 (예: "10C (₩1,000)") */
function formatCredits(credits: number): string {
  const krw = credits * 100;
  return `${credits}개 (₩${krw.toLocaleString()})`;
}

/** 예측 정확도를 퍼센트 문자열로 포맷 */
function formatAccuracy(accuracy: number | null): string {
  if (accuracy === null || accuracy === undefined) return '-';
  return `${(accuracy * 100).toFixed(1)}%`;
}

/** 활동 상태 dot 색상 계산 (last_active 기준) */
function getActivityDotColor(lastActive: string | null): string {
  if (!lastActive) return '#CF6679'; // red: no activity
  const diff = Date.now() - new Date(lastActive).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours <= 24) return '#4CAF50'; // green: within 24h
  const days = hours / 24;
  if (days <= 7) return '#FFB74D'; // yellow: within 7 days
  return '#757575'; // gray: 7+ days
}

/** 이벤트 이름을 번역 키로 변환 */
function getEventLabelKey(eventName: string): string | null {
  return EVENT_LABEL_KEYS[eventName] || null;
}

/** 크레딧 거래 타입 뱃지 정보 */
function getCreditTypeBadge(type: string): { tKey: string; color: string } {
  return CREDIT_TYPE_BADGE[type] || { tKey: type, color: COLORS.textTertiary };
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────

export default function AdminUsersScreen() {
  const router = useRouter();
  const { t } = useLocale();

  // ── 상태 관리 ──
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantMemo, setGrantMemo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 보너스 지급 Mutation ──
  const grantMutation = useGrantBonusCredits();

  // ── 차단 Mutation ──
  const banMutation = useAdminBanUser();

  // ── 유저 상세 쿼리 ──
  const {
    data: userDetail,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useAdminUserDetail(selectedUser?.id || null);

  // ── 검색 디바운스 (500ms) ──
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setOffset(0);
      setAllUsers([]);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchText]);

  // ── 데이터 쿼리 ──
  const { data, isLoading, error, refetch } = useAdminUserList({
    limit: PAGE_SIZE,
    offset,
    search: debouncedSearch || undefined,
  });

  // ── 데이터가 도착하면 allUsers에 누적 (페이지네이션) ──
  useEffect(() => {
    if (data?.users) {
      if (offset === 0) {
        setAllUsers(data.users);
      } else {
        setAllUsers((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const newUsers = data.users.filter((u) => !existingIds.has(u.id));
          return [...prev, ...newUsers];
        });
      }
    }
  }, [data, offset]);

  // ── 클라이언트 정렬 (sortKey에 따라) ──
  const sortedUsers = useMemo(() => {
    const users = [...allUsers];
    switch (sortKey) {
      case 'last_active':
        return users.sort((a, b) => {
          if (!a.last_active && !b.last_active) return 0;
          if (!a.last_active) return 1; // null last
          if (!b.last_active) return -1;
          return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
        });
      case 'total_assets':
        return users.sort((a, b) => b.total_assets - a.total_assets);
      case 'credit_balance':
        return users.sort((a, b) => b.credit_balance - a.credit_balance);
      case 'created_at':
      default:
        return users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [allUsers, sortKey]);

  // ── 미니 요약 통계 계산 ──
  const summaryStats = useMemo(() => {
    const total = allUsers.length;
    const premiumCount = allUsers.filter((u) => u.plan_type === 'premium').length;
    const totalAssets = allUsers.reduce((sum, u) => sum + u.total_assets, 0);
    const avgAssets = total > 0 ? Math.round(totalAssets / total / 10000) : 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeCount = allUsers.filter(
      (u) => u.last_active && new Date(u.last_active).getTime() >= sevenDaysAgo
    ).length;
    return { premiumCount, avgAssets, activeCount };
  }, [allUsers]);

  // ── 전체 유저 수 ──
  const totalCount = data?.total_count ?? 0;

  // ── 더 불러올 데이터 있는지 ──
  const hasMore = allUsers.length < totalCount;

  // ── Pull-to-refresh ──
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setOffset(0);
    setAllUsers([]);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  // ── 무한 스크롤 (끝에 도달하면 다음 페이지 로드) ──
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  }, [isLoading, hasMore]);

  // ── 티어 뱃지 색상 ──
  const getTierColor = useCallback((tier: string): string => {
    return TIER_COLORS[tier] || COLORS.textTertiary;
  }, []);

  // ── 플랜 뱃지 정보 ──
  const getPlanBadge = useCallback((plan: string) => {
    return PLAN_BADGE[plan] || { label: plan, color: COLORS.textTertiary };
  }, []);

  // ── 차단 토글 핸들러 ──
  const handleBanToggle = useCallback(() => {
    if (!selectedUser) return;

    const isBanned = userDetail?.profile?.is_banned ?? false;
    const actionLabel = isBanned ? t('admin.users.unban') : t('admin.users.ban');

    Alert.alert(
      t(isBanned ? 'admin.users.alert.unbanConfirmTitle' : 'admin.users.alert.banConfirmTitle'),
      isBanned
        ? `${selectedUser.email || selectedUser.id}\n\n${t('admin.users.alert.unbanConfirmMessage')}`
        : `${selectedUser.email || selectedUser.id}\n\n${t('admin.users.alert.banConfirmMessage')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: actionLabel,
          style: isBanned ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const result = await banMutation.mutateAsync({
                userId: selectedUser.id,
                reason: isBanned ? undefined : t('admin.users.banReason'),
              });
              if (result.success) {
                await refetchDetail();
                Alert.alert(
                  t(isBanned ? 'admin.users.alert.unbanSuccess' : 'admin.users.alert.banSuccess'),
                  t(isBanned ? 'admin.users.alert.unbanSuccessMessage' : 'admin.users.alert.banSuccessMessage')
                );
              } else {
                Alert.alert(t(isBanned ? 'admin.users.alert.unbanFail' : 'admin.users.alert.banFail'), result.error || t('common.unknownError'));
              }
            } catch (err: unknown) {
              Alert.alert(t('common.error'), err instanceof Error ? err.message : t('admin.users.alert.processError'));
            }
          },
        },
      ]
    );
  }, [selectedUser, userDetail, banMutation, refetchDetail, t]);

  // ================================================================
  // 유저 카드 렌더링
  // ================================================================

  const renderUserCard = useCallback(({ item }: { item: AdminUser }) => {
    const tierColor = getTierColor(item.tier);
    const planBadge = getPlanBadge(item.plan_type);
    const activityDotColor = getActivityDotColor(item.last_active);

    return (
      <TouchableOpacity
        style={styles.userCard}
        activeOpacity={0.7}
        onPress={() => setSelectedUser(item)}
      >
        {/* 왼쪽: 티어 뱃지 원형 */}
        <View style={[styles.tierBadge, { backgroundColor: tierColor + '30' }]}>
          <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
          <Text style={[styles.tierLabel, { color: tierColor }]}>
            {item.tier}
          </Text>
        </View>

        {/* 중앙: 이메일 + 활동 상태 dot + 플랜 뱃지 + 가입일 */}
        <View style={styles.userInfo}>
          <View style={styles.emailRow}>
            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email || t('admin.users.noEmail')}
            </Text>
            <View
              style={[
                styles.activityDot,
                { backgroundColor: activityDotColor },
              ]}
            />
          </View>
          <View style={styles.userMeta}>
            <View style={[styles.planBadge, { backgroundColor: planBadge.color + '20' }]}>
              <Text style={[styles.planBadgeText, { color: planBadge.color }]}>
                {planBadge.label}
              </Text>
            </View>
            <Text style={styles.joinDate}>{formatJoinDate(item.created_at, t)}</Text>
          </View>
          {item.last_active && (
            <Text style={styles.lastActive}>
              {t('admin.users.recent')}: {getRelativeTime(item.last_active, t)}
            </Text>
          )}
        </View>

        {/* 오른쪽: 총 자산 */}
        <View style={styles.assetContainer}>
          <Text style={styles.assetValue}>{formatAssets(item.total_assets, t)}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }, [getTierColor, getPlanBadge, t]);

  // ================================================================
  // 리스트 푸터 (로딩 인디케이터)
  // ================================================================

  const renderFooter = useMemo(() => {
    if (!isLoading || offset === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.footerText}>{t('common.loading')}</Text>
      </View>
    );
  }, [isLoading, offset, t]);

  // ================================================================
  // 빈 상태
  // ================================================================

  const renderEmpty = useMemo(() => {
    if (isLoading && offset === 0) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name={debouncedSearch ? 'search-outline' : 'people-outline'}
          size={64}
          color={COLORS.textTertiary}
        />
        <Text style={styles.emptyText}>
          {debouncedSearch ? t('admin.users.noSearchResults') : t('admin.users.noUsers')}
        </Text>
        {debouncedSearch && (
          <Text style={styles.emptySubtext}>
            {t('admin.users.tryOtherSearch')}
          </Text>
        )}
      </View>
    );
  }, [isLoading, offset, debouncedSearch, t]);

  // ── 보너스 지급 핸들러 ──
  const handleOpenGrant = useCallback(() => {
    setGrantAmount('');
    setGrantMemo('');
    setShowGrantModal(true);
  }, []);

  const handleGrant = useCallback(async () => {
    if (!selectedUser) return;
    const amount = parseInt(grantAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert(t('admin.users.alert.inputError'), t('admin.users.alert.minAmountError'));
      return;
    }
    if (amount > 10000) {
      Alert.alert(t('admin.users.alert.inputError'), t('admin.users.alert.maxAmountError'));
      return;
    }

    Keyboard.dismiss();

    Alert.alert(
      t('admin.users.alert.grantConfirmTitle'),
      `${selectedUser.email || selectedUser.id}\n\n${t('admin.users.alert.grantAmount')}: ${amount}${t('admin.users.creditUnit')} (₩${(amount * 100).toLocaleString()})\n${grantMemo ? `${t('admin.users.memo')}: ${grantMemo}` : ''}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.users.grant'),
          style: 'default',
          onPress: async () => {
            try {
              const result = await grantMutation.mutateAsync({
                targetUserId: selectedUser.id,
                amount,
                memo: grantMemo || undefined,
              });
              if (result.success) {
                setShowGrantModal(false);
                const newBalance = result.new_balance ?? selectedUser.credit_balance + amount;
                // 로컬 상태의 잔액도 업데이트 (선택된 유저 + 목록)
                setSelectedUser((prev) =>
                  prev ? { ...prev, credit_balance: newBalance } : null
                );
                // allUsers 목록의 해당 유저 잔액도 동기화
                setAllUsers((prev) =>
                  prev.map((u) =>
                    u.id === selectedUser.id
                      ? { ...u, credit_balance: newBalance }
                      : u
                  )
                );
                Alert.alert(
                  t('admin.users.alert.grantSuccess'),
                  `${amount}${t('admin.users.creditUnit')} (₩${(amount * 100).toLocaleString()}) ${t('admin.users.alert.grantSuccessMessage')}\n${t('admin.users.alert.newBalance')}: ${result.new_balance ?? '-'}${t('admin.users.creditUnit')}`
                );
              } else {
                Alert.alert(t('admin.users.alert.grantFail'), result.error || t('common.unknownError'));
              }
            } catch (err: unknown) {
              Alert.alert(t('common.error'), err instanceof Error ? err.message : t('admin.users.alert.grantError'));
            }
          },
        },
      ]
    );
  }, [selectedUser, grantAmount, grantMemo, grantMutation, t]);

  // ================================================================
  // 보너스 지급 모달
  // ================================================================

  const renderGrantModal = () => {
    if (!selectedUser) return null;

    const amount = parseInt(grantAmount, 10) || 0;
    const krw = amount * 100;

    return (
      <Modal
        visible={showGrantModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowGrantModal(false)}
      >
        <View style={styles.grantOverlay}>
          <View style={styles.grantCard}>
            {/* 헤더 */}
            <View style={styles.grantHeader}>
              <Ionicons name="gift-outline" size={24} color={COLORS.primary} />
              <Text style={styles.grantTitle}>{t('admin.users.grantTitle')}</Text>
            </View>

            {/* 대상 유저 */}
            <View style={styles.grantTargetRow}>
              <Text style={styles.grantLabel}>{t('admin.users.target')}</Text>
              <Text style={styles.grantTargetEmail} numberOfLines={1}>
                {selectedUser.email || selectedUser.id.slice(0, 8) + '...'}
              </Text>
            </View>

            {/* 금액 입력 */}
            <View style={styles.grantInputGroup}>
              <Text style={styles.grantLabel}>{t('admin.users.alert.grantAmount')}</Text>
              <View style={styles.grantAmountRow}>
                <TextInput
                  style={styles.grantAmountInput}
                  value={grantAmount}
                  onChangeText={(t) => setGrantAmount(t.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="number-pad"
                  maxLength={5}
                  autoFocus
                />
                <Text style={styles.grantUnit}>C</Text>
              </View>
              {amount > 0 && (
                <Text style={styles.grantKrw}>= ₩{krw.toLocaleString()}</Text>
              )}
            </View>

            {/* 빠른 선택 버튼 */}
            <View style={styles.quickAmountRow}>
              {[10, 50, 100, 500].map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.quickAmountBtn,
                    amount === q && styles.quickAmountBtnActive,
                  ]}
                  onPress={() => setGrantAmount(String(q))}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount === q && styles.quickAmountTextActive,
                    ]}
                  >
                    {q}C
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 메모 입력 */}
            <View style={styles.grantInputGroup}>
              <Text style={styles.grantLabel}>{t('admin.users.memoOptional')}</Text>
              <TextInput
                style={styles.grantMemoInput}
                value={grantMemo}
                onChangeText={setGrantMemo}
                placeholder={t('admin.users.memoPlaceholder')}
                placeholderTextColor={COLORS.textTertiary}
                maxLength={100}
              />
            </View>

            {/* 버튼 영역 */}
            <View style={styles.grantButtons}>
              <TouchableOpacity
                style={styles.grantCancelBtn}
                onPress={() => setShowGrantModal(false)}
              >
                <Text style={styles.grantCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.grantConfirmBtn,
                  (!amount || grantMutation.isPending) && styles.grantConfirmBtnDisabled,
                ]}
                onPress={handleGrant}
                disabled={!amount || grantMutation.isPending}
              >
                {grantMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.grantConfirmText}>
                    {amount > 0 ? `${amount}${t('admin.users.creditUnit')} ${t('admin.users.grant')}` : t('admin.users.grant')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ================================================================
  // 유저 상세 모달
  // ================================================================

  const renderUserDetailModal = () => {
    if (!selectedUser) return null;

    const tierColor = getTierColor(selectedUser.tier);
    const planBadge = getPlanBadge(selectedUser.plan_type);
    const isBanned = userDetail?.profile?.is_banned ?? false;

    return (
      <Modal
        visible={!!selectedUser}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedUser(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          {/* 모달 헤더 */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedUser(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>{t('admin.users.userDetail')}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* 유저 아이덴티티 헤더 */}
            <View style={styles.modalUserHeader}>
              <View style={[styles.modalTierBadge, { backgroundColor: tierColor + '20' }]}>
                <Ionicons name="person" size={28} color={tierColor} />
              </View>
              <Text style={styles.modalUserEmail}>
                {selectedUser.email || t('admin.users.noEmail')}
              </Text>
              <View style={styles.modalBadgeRow}>
                <View style={[styles.planBadge, { backgroundColor: planBadge.color + '20' }]}>
                  <Text style={[styles.planBadgeText, { color: planBadge.color }]}>
                    {planBadge.label}
                  </Text>
                </View>
                <View style={[styles.planBadge, { backgroundColor: tierColor + '20' }]}>
                  <Text style={[styles.planBadgeText, { color: tierColor }]}>
                    {selectedUser.tier}
                  </Text>
                </View>
                {isBanned && (
                  <View style={[styles.planBadge, { backgroundColor: COLORS.error + '20' }]}>
                    <Text style={[styles.planBadgeText, { color: COLORS.error }]}>
                      {t('admin.users.banned')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── 섹션 1: 기본 정보 (기존 유지) ── */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('admin.users.section.basicInfo')}</Text>
              <View style={styles.infoCard}>
                <InfoRow
                  icon="mail-outline"
                  label={t('admin.users.label.email')}
                  value={selectedUser.email || t('admin.users.noEmail')}
                />
                <InfoRow
                  icon="card-outline"
                  label={t('admin.users.label.plan')}
                  value={planBadge.label}
                  valueColor={planBadge.color}
                />
                <InfoRow
                  icon="shield-outline"
                  label={t('admin.users.label.tier')}
                  value={selectedUser.tier}
                  valueColor={tierColor}
                />
                <InfoRow
                  icon="calendar-outline"
                  label={t('admin.users.label.joinDate')}
                  value={formatJoinDate(selectedUser.created_at, t)}
                />
                <InfoRow
                  icon="wallet-outline"
                  label={t('admin.users.label.totalAssets')}
                  value={formatAssets(selectedUser.total_assets, t)}
                  valueColor={COLORS.primary}
                />
                <InfoRow
                  icon="time-outline"
                  label={t('admin.users.label.lastActive')}
                  value={
                    selectedUser.last_active
                      ? getRelativeTime(selectedUser.last_active, t)
                      : t('admin.users.noActivity')
                  }
                  isLast
                />
              </View>
            </View>

            {/* ── 섹션 2: 크레딧 (Enhanced with detail data) ── */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('admin.users.section.credits')}</Text>
              <View style={styles.infoCard}>
                <InfoRow
                  icon="diamond-outline"
                  label={t('admin.users.label.creditBalance')}
                  value={formatCredits(
                    userDetail?.credits?.balance ?? selectedUser.credit_balance
                  )}
                  valueColor={COLORS.warning}
                  isLast={
                    !userDetail?.credits?.recent_transactions ||
                    userDetail.credits.recent_transactions.length === 0
                  }
                />
                {/* 최근 5건 거래 내역 */}
                {isDetailLoading && (
                  <View style={styles.detailLoadingRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.detailLoadingText}>{t('admin.users.loadingTransactions')}</Text>
                  </View>
                )}
                {!isDetailLoading &&
                  userDetail?.credits?.recent_transactions &&
                  userDetail.credits.recent_transactions.length > 0 && (
                    <View style={styles.transactionSection}>
                      <Text style={styles.transactionSectionLabel}>{t('admin.users.recentTransactions')}</Text>
                      {userDetail.credits.recent_transactions.slice(0, 5).map((tx, idx) => {
                        const badge = getCreditTypeBadge(tx.type);
                        const isPositive = tx.amount > 0;
                        return (
                          <View
                            key={`tx-${idx}`}
                            style={[
                              styles.transactionRow,
                              idx < Math.min(userDetail.credits.recent_transactions.length, 5) - 1 &&
                                styles.transactionRowBorder,
                            ]}
                          >
                            <View style={[styles.txTypeBadge, { backgroundColor: badge.color + '20' }]}>
                              <Text style={[styles.txTypeBadgeText, { color: badge.color }]}>
                                {t(badge.tKey)}
                              </Text>
                            </View>
                            <View style={styles.txInfo}>
                              {tx.description && (
                                <Text style={styles.txDescription} numberOfLines={1}>
                                  {tx.description}
                                </Text>
                              )}
                              <Text style={styles.txDate}>{formatShortDate(tx.created_at)}</Text>
                            </View>
                            <Text
                              style={[
                                styles.txAmount,
                                { color: isPositive ? COLORS.primary : COLORS.error },
                              ]}
                            >
                              {isPositive ? '+' : ''}{tx.amount}C
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
              </View>
            </View>

            {/* ── 섹션 3: 예측 (Enhanced with detail data) ── */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('admin.users.section.predictions')}</Text>
              <View style={styles.infoCard}>
                <InfoRow
                  icon="analytics-outline"
                  label={t('admin.users.label.accuracy')}
                  value={formatAccuracy(
                    userDetail?.predictions?.accuracy_rate ?? selectedUser.prediction_accuracy
                  )}
                  valueColor={
                    (userDetail?.predictions?.accuracy_rate ?? selectedUser.prediction_accuracy) !== null &&
                    ((userDetail?.predictions?.accuracy_rate ?? selectedUser.prediction_accuracy) ?? 0) >= 0.6
                      ? COLORS.primary
                      : COLORS.textPrimary
                  }
                />
                <InfoRow
                  icon="hand-left-outline"
                  label={t('admin.users.label.totalVotes')}
                  value={`${(userDetail?.predictions?.total_votes ?? selectedUser.total_votes).toLocaleString()}${t('common.unitTimes')}`}
                />
                <InfoRow
                  icon="checkmark-circle-outline"
                  label={t('admin.users.label.correct')}
                  value={
                    userDetail?.predictions
                      ? `${userDetail.predictions.correct_votes.toLocaleString()}${t('common.unitTimes')}`
                      : '-'
                  }
                  valueColor={COLORS.primary}
                />
                <InfoRow
                  icon="flame-outline"
                  label={t('admin.users.label.currentStreak')}
                  value={
                    userDetail?.predictions
                      ? `${userDetail.predictions.current_streak}${t('common.unitDays')}`
                      : '-'
                  }
                  valueColor={COLORS.warning}
                />
                <InfoRow
                  icon="trophy-outline"
                  label={t('admin.users.label.bestStreak')}
                  value={
                    userDetail?.predictions
                      ? `${userDetail.predictions.best_streak}${t('common.unitDays')}`
                      : '-'
                  }
                  isLast
                />
                {isDetailLoading && !userDetail && (
                  <View style={styles.detailLoadingRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.detailLoadingText}>{t('admin.users.loadingPredictions')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── 섹션 4: 활동 로그 (New) ── */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('admin.users.section.activityLog')}</Text>
              <View style={styles.infoCard}>
                {isDetailLoading && !userDetail && (
                  <View style={styles.detailLoadingRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.detailLoadingText}>{t('admin.users.loadingActivity')}</Text>
                  </View>
                )}
                {!isDetailLoading &&
                  userDetail?.recent_activities &&
                  userDetail.recent_activities.length > 0 ? (
                    userDetail.recent_activities.slice(0, 10).map((activity, idx) => (
                      <View
                        key={`act-${idx}`}
                        style={[
                          styles.activityRow,
                          idx < Math.min(userDetail.recent_activities.length, 10) - 1 &&
                            styles.activityRowBorder,
                        ]}
                      >
                        <View style={styles.activityIconContainer}>
                          <Ionicons
                            name="ellipse"
                            size={6}
                            color={COLORS.primary}
                          />
                        </View>
                        <Text style={styles.activityLabel}>
                          {getEventLabelKey(activity.event_name) ? t(getEventLabelKey(activity.event_name) ?? '') : activity.event_name}
                        </Text>
                        <Text style={styles.activityTime}>
                          {getRelativeTime(activity.created_at, t)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    !isDetailLoading && (
                      <View style={styles.activityEmptyRow}>
                        <Text style={styles.activityEmptyText}>{t('admin.users.noActivity')}</Text>
                      </View>
                    )
                  )}
              </View>
            </View>

            {/* 유저 ID (개발자 참고용) */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('admin.users.section.systemInfo')}</Text>
              <View style={styles.infoCard}>
                <InfoRow
                  icon="finger-print-outline"
                  label="User ID"
                  value={selectedUser.id}
                  isLast
                  mono
                />
              </View>
            </View>

            {/* 관리자 액션 */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('admin.users.section.adminActions')}</Text>

              {/* 차단 상태 표시 */}
              {isBanned && userDetail?.profile?.ban_reason && (
                <View style={styles.banStatusContainer}>
                  <Ionicons name="ban-outline" size={16} color={COLORS.error} />
                  <Text style={styles.banStatusText}>
                    {t('admin.users.bannedReason')}: {userDetail.profile.ban_reason}
                  </Text>
                </View>
              )}

              {/* 차단 토글 버튼 */}
              <TouchableOpacity
                style={[
                  styles.banButton,
                  {
                    backgroundColor: isBanned ? COLORS.primary : COLORS.error,
                  },
                ]}
                activeOpacity={0.7}
                onPress={handleBanToggle}
                disabled={banMutation.isPending}
              >
                {banMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={isBanned ? 'checkmark-circle-outline' : 'ban-outline'}
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.banButtonText}>
                      {isBanned ? t('admin.users.unban') : t('admin.users.ban')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* 보너스 크레딧 지급 */}
              <TouchableOpacity
                style={styles.grantButton}
                activeOpacity={0.7}
                onPress={handleOpenGrant}
              >
                <Ionicons name="gift-outline" size={20} color="#FFFFFF" />
                <Text style={styles.grantButtonText}>{t('admin.users.grantBonus')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ================================================================
  // 메인 UI
  // ================================================================

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.users.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('admin.users.searchPlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 정렬 칩 */}
      <View style={styles.sortChipContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortChipScroll}
        >
          {SORT_CHIP_KEYS.map((chip) => {
            const isActive = sortKey === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[
                  styles.sortChip,
                  isActive && styles.sortChipActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setSortKey(chip.key)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    isActive && styles.sortChipTextActive,
                  ]}
                >
                  {t(chip.tKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 전체 유저 수 카운터 */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {t('admin.users.total')} <Text style={styles.countNumber}>{totalCount.toLocaleString()}</Text>{t('admin.users.countUnit')}
        </Text>
        {debouncedSearch ? (
          <Text style={styles.searchHint}>
            "{debouncedSearch}" {t('admin.users.searchResults')}
          </Text>
        ) : null}
      </View>

      {/* 미니 요약 바 */}
      {allUsers.length > 0 && (
        <View style={styles.summaryBarContainer}>
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              Premium <Text style={styles.summaryHighlight}>{summaryStats.premiumCount}</Text>{t('admin.users.countUnit')}
              {'  |  '}
              {t('admin.users.avgAssets')} <Text style={styles.summaryHighlight}>{summaryStats.avgAssets.toLocaleString()}</Text>{t('admin.users.tenThousandUnit')}
              {'  |  '}
              {t('admin.users.active7d')} <Text style={styles.summaryHighlight}>{summaryStats.activeCount}</Text>{t('admin.users.countUnit')}
            </Text>
          </View>
        </View>
      )}

      {/* 유저 목록 */}
      {isLoading && offset === 0 && allUsers.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('admin.users.loadingList')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{t('admin.users.loadError')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedUsers}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        />
      )}

      {/* 유저 상세 모달 */}
      {renderUserDetailModal()}

      {/* 보너스 지급 모달 */}
      {renderGrantModal()}
    </SafeAreaView>
  );
}

// ================================================================
// InfoRow 서브 컴포넌트 (모달 내 정보 행)
// ================================================================

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  isLast,
  mono,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <View style={styles.infoRowLeft}>
        <Ionicons name={icon} size={16} color={COLORS.textTertiary} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text
        style={[
          styles.infoValue,
          valueColor ? { color: valueColor } : undefined,
          mono ? styles.monoText : undefined,
        ]}
        numberOfLines={1}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

// ================================================================
// 스타일
// ================================================================

const styles = StyleSheet.create({
  // ── 레이아웃 ──
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── 헤더 ──
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
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // ── 검색바 ──
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },

  // ── 정렬 칩 ──
  sortChipContainer: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  sortChipScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortChipActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  sortChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  sortChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // ── 전체 카운트 ──
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  countNumber: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  searchHint: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },

  // ── 미니 요약 바 ──
  summaryBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  summaryBar: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryHighlight: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ── 유저 카드 ──
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  tierBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 2,
  },
  tierLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  joinDate: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  lastActive: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  assetContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  assetValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // ── 상태 화면 (로딩/에러/빈 상태) ──
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: 4,
  },

  // ── 리스트 푸터 (페이지네이션 로딩) ──
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // ── 모달 ──
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // ── 모달: 유저 아이덴티티 헤더 ──
  modalUserHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  modalTierBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalUserEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },

  // ── 모달: 섹션 ──
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // ── 모달: InfoRow ──
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
    maxWidth: '55%',
    textAlign: 'right',
  },
  monoText: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: COLORS.textTertiary,
  },

  // ── 모달: 디테일 로딩 ──
  detailLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  detailLoadingText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },

  // ── 모달: 크레딧 거래 내역 ──
  transactionSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  transactionSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  transactionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
  },
  txTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  txInfo: {
    flex: 1,
    marginRight: 8,
  },
  txDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 1,
  },
  txDate: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── 모달: 활동 로그 ──
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityIconContainer: {
    width: 20,
    alignItems: 'center',
  },
  activityLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: 4,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  activityEmptyRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  activityEmptyText: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },

  // ── 관리자 액션: 차단 상태 ──
  banStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 8,
  },
  banStatusText: {
    fontSize: 14,
    color: COLORS.error,
    flex: 1,
  },

  // ── 관리자 액션: 차단 버튼 ──
  banButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 10,
  },
  banButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── 관리자 액션: 보너스 지급 버튼 (모달 내) ──
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  grantButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── 보너스 지급 모달 ──
  grantOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  grantCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
  },
  grantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  grantTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  grantTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  grantLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  grantTargetEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    maxWidth: '65%',
  },
  grantInputGroup: {
    marginBottom: 16,
  },
  grantAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  grantAmountInput: {
    flex: 1,
    fontSize: 25,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: 12,
  },
  grantUnit: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  grantKrw: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 4,
    paddingLeft: 4,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickAmountBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAmountBtnActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  quickAmountTextActive: {
    color: COLORS.primary,
  },
  grantMemoInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  grantButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  grantCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
  },
  grantCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  grantConfirmBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  grantConfirmBtnDisabled: {
    opacity: 0.4,
  },
  grantConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
