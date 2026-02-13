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
import { AdminUser, AdminUserDetail } from '../../src/services/adminService';
import { COLORS } from '../../src/styles/theme';

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

const SORT_CHIPS: { key: SortKey; label: string }[] = [
  { key: 'last_active', label: '최근활동순' },
  { key: 'total_assets', label: '자산순' },
  { key: 'credit_balance', label: '크레딧순' },
  { key: 'created_at', label: '가입일순' },
];

// ─── 이벤트 이름 한국어 매핑 ─────────────────────────────────

const EVENT_LABEL_MAP: Record<string, string> = {
  screen_view: '화면 조회',
  prediction_vote: '예측 투표',
  context_card_read: '카드 읽기',
  share_card: '공유',
  achievement_earned: '업적 달성',
  review_completed: '복기 완료',
};

// ─── 크레딧 거래 타입 뱃지 색상 ──────────────────────────────

const CREDIT_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  attendance: { label: '출석', color: COLORS.primary },
  prediction: { label: '예측', color: COLORS.info },
  share: { label: '공유', color: '#7C4DFF' },
  welcome: { label: '환영', color: COLORS.warning },
  bonus: { label: '보너스', color: COLORS.warning },
  purchase: { label: '구매', color: COLORS.error },
  spend: { label: '사용', color: COLORS.textTertiary },
  premium: { label: 'Premium', color: COLORS.warning },
  admin_grant: { label: '관리자', color: COLORS.primary },
};

// ─── 페이지네이션 상수 ──────────────────────────────────────

const PAGE_SIZE = 30;

// ─── 헬퍼 함수 ─────────────────────────────────────────────

/** 자산 금액을 한국식으로 포맷 (예: 1.2억, 5,000만, 300원) */
function formatAssets(amount: number): string {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`;
  if (amount >= 10000) return `${Math.floor(amount / 10000).toLocaleString()}만`;
  return `${amount.toLocaleString()}원`;
}

/** 상대 시간 표시 (예: 방금 전, 3시간 전, 2일 전) */
function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

/** 날짜를 "2026.02.10 가입" 형식으로 포맷 */
function formatJoinDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day} 가입`;
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
  return `${credits}C (₩${krw.toLocaleString()})`;
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

/** 이벤트 이름을 한국어로 변환 */
function getEventLabel(eventName: string): string {
  return EVENT_LABEL_MAP[eventName] || eventName;
}

/** 크레딧 거래 타입 뱃지 정보 */
function getCreditTypeBadge(type: string): { label: string; color: string } {
  return CREDIT_TYPE_BADGE[type] || { label: type, color: COLORS.textTertiary };
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────

export default function AdminUsersScreen() {
  const router = useRouter();

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
    const actionLabel = isBanned ? '차단 해제' : '차단';

    Alert.alert(
      `유저 ${actionLabel} 확인`,
      isBanned
        ? `${selectedUser.email || selectedUser.id}\n\n차단을 해제하시겠습니까?`
        : `${selectedUser.email || selectedUser.id}\n\n이 유저를 차단하시겠습니까?\n(관리자 사유로 기록됩니다)`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: actionLabel,
          style: isBanned ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const result = await banMutation.mutateAsync({
                userId: selectedUser.id,
                reason: isBanned ? undefined : '관리자 차단',
              });
              if (result.success) {
                await refetchDetail();
                Alert.alert(
                  `${actionLabel} 완료`,
                  `유저를 ${actionLabel}했습니다.`
                );
              } else {
                Alert.alert(`${actionLabel} 실패`, result.error || '알 수 없는 오류');
              }
            } catch (err: any) {
              Alert.alert('오류', err.message || '처리 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  }, [selectedUser, userDetail, banMutation, refetchDetail]);

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
              {item.email || '이메일 없음'}
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
            <Text style={styles.joinDate}>{formatJoinDate(item.created_at)}</Text>
          </View>
          {item.last_active && (
            <Text style={styles.lastActive}>
              최근: {getRelativeTime(item.last_active)}
            </Text>
          )}
        </View>

        {/* 오른쪽: 총 자산 */}
        <View style={styles.assetContainer}>
          <Text style={styles.assetValue}>{formatAssets(item.total_assets)}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }, [getTierColor, getPlanBadge]);

  // ================================================================
  // 리스트 푸터 (로딩 인디케이터)
  // ================================================================

  const renderFooter = useMemo(() => {
    if (!isLoading || offset === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.footerText}>불러오는 중...</Text>
      </View>
    );
  }, [isLoading, offset]);

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
          {debouncedSearch ? '검색 결과 없음' : '유저가 없습니다.'}
        </Text>
        {debouncedSearch && (
          <Text style={styles.emptySubtext}>
            다른 검색어로 시도해보세요.
          </Text>
        )}
      </View>
    );
  }, [isLoading, offset, debouncedSearch]);

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
      Alert.alert('입력 오류', '1 이상의 금액을 입력해주세요.');
      return;
    }
    if (amount > 10000) {
      Alert.alert('입력 오류', '최대 10,000C까지 지급 가능합니다.');
      return;
    }

    Keyboard.dismiss();

    Alert.alert(
      '보너스 지급 확인',
      `${selectedUser.email || selectedUser.id}\n\n지급 금액: ${amount}C (₩${(amount * 100).toLocaleString()})\n${grantMemo ? `메모: ${grantMemo}` : ''}`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '지급',
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
                  '지급 완료',
                  `${amount}C (₩${(amount * 100).toLocaleString()})를 지급했습니다.\n새 잔액: ${result.new_balance ?? '-'}C`
                );
              } else {
                Alert.alert('지급 실패', result.error || '알 수 없는 오류');
              }
            } catch (err: any) {
              Alert.alert('오류', err.message || '크레딧 지급 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  }, [selectedUser, grantAmount, grantMemo, grantMutation]);

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
              <Text style={styles.grantTitle}>보너스 크레딧 지급</Text>
            </View>

            {/* 대상 유저 */}
            <View style={styles.grantTargetRow}>
              <Text style={styles.grantLabel}>대상</Text>
              <Text style={styles.grantTargetEmail} numberOfLines={1}>
                {selectedUser.email || selectedUser.id.slice(0, 8) + '...'}
              </Text>
            </View>

            {/* 금액 입력 */}
            <View style={styles.grantInputGroup}>
              <Text style={styles.grantLabel}>지급 금액</Text>
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
              <Text style={styles.grantLabel}>메모 (선택)</Text>
              <TextInput
                style={styles.grantMemoInput}
                value={grantMemo}
                onChangeText={setGrantMemo}
                placeholder="예: 이벤트 보상, 오류 보상 등"
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
                <Text style={styles.grantCancelText}>취소</Text>
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
                    {amount > 0 ? `${amount}C 지급` : '지급'}
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
            <Text style={styles.modalHeaderTitle}>유저 상세</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* 유저 아이덴티티 헤더 */}
            <View style={styles.modalUserHeader}>
              <View style={[styles.modalTierBadge, { backgroundColor: tierColor + '20' }]}>
                <Ionicons name="person" size={28} color={tierColor} />
              </View>
              <Text style={styles.modalUserEmail}>
                {selectedUser.email || '이메일 없음'}
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
                      차단됨
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── 섹션 1: 기본 정보 (기존 유지) ── */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>기본 정보</Text>
              <View style={styles.infoCard}>
                <InfoRow
                  icon="mail-outline"
                  label="이메일"
                  value={selectedUser.email || '이메일 없음'}
                />
                <InfoRow
                  icon="card-outline"
                  label="플랜"
                  value={planBadge.label}
                  valueColor={planBadge.color}
                />
                <InfoRow
                  icon="shield-outline"
                  label="티어"
                  value={selectedUser.tier}
                  valueColor={tierColor}
                />
                <InfoRow
                  icon="calendar-outline"
                  label="가입일"
                  value={formatJoinDate(selectedUser.created_at)}
                />
                <InfoRow
                  icon="wallet-outline"
                  label="총 자산"
                  value={formatAssets(selectedUser.total_assets)}
                  valueColor={COLORS.primary}
                />
                <InfoRow
                  icon="time-outline"
                  label="최근 활동"
                  value={
                    selectedUser.last_active
                      ? getRelativeTime(selectedUser.last_active)
                      : '활동 기록 없음'
                  }
                  isLast
                />
              </View>
            </View>

            {/* ── 섹션 2: 크레딧 (Enhanced with detail data) ── */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>크레딧</Text>
              <View style={styles.infoCard}>
                <InfoRow
                  icon="diamond-outline"
                  label="크레딧 잔액"
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
                    <Text style={styles.detailLoadingText}>거래 내역 로딩 중...</Text>
                  </View>
                )}
                {!isDetailLoading &&
                  userDetail?.credits?.recent_transactions &&
                  userDetail.credits.recent_transactions.length > 0 && (
                    <View style={styles.transactionSection}>
                      <Text style={styles.transactionSectionLabel}>최근 거래</Text>
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
                                {badge.label}
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
              <Text style={styles.modalSectionTitle}>예측</Text>
              <View style={styles.infoCard}>
                <InfoRow
                  icon="analytics-outline"
                  label="예측 정확도"
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
                  label="총 투표"
                  value={`${(userDetail?.predictions?.total_votes ?? selectedUser.total_votes).toLocaleString()}회`}
                />
                <InfoRow
                  icon="checkmark-circle-outline"
                  label="적중"
                  value={
                    userDetail?.predictions
                      ? `${userDetail.predictions.correct_votes.toLocaleString()}회`
                      : '-'
                  }
                  valueColor={COLORS.primary}
                />
                <InfoRow
                  icon="flame-outline"
                  label="현재 스트릭"
                  value={
                    userDetail?.predictions
                      ? `${userDetail.predictions.current_streak}일`
                      : '-'
                  }
                  valueColor={COLORS.warning}
                />
                <InfoRow
                  icon="trophy-outline"
                  label="최고 스트릭"
                  value={
                    userDetail?.predictions
                      ? `${userDetail.predictions.best_streak}일`
                      : '-'
                  }
                  isLast
                />
                {isDetailLoading && !userDetail && (
                  <View style={styles.detailLoadingRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.detailLoadingText}>예측 데이터 로딩 중...</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── 섹션 4: 활동 로그 (New) ── */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>활동 로그</Text>
              <View style={styles.infoCard}>
                {isDetailLoading && !userDetail && (
                  <View style={styles.detailLoadingRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.detailLoadingText}>활동 로그 로딩 중...</Text>
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
                          {getEventLabel(activity.event_name)}
                        </Text>
                        <Text style={styles.activityTime}>
                          {getRelativeTime(activity.created_at)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    !isDetailLoading && (
                      <View style={styles.activityEmptyRow}>
                        <Text style={styles.activityEmptyText}>활동 기록이 없습니다</Text>
                      </View>
                    )
                  )}
              </View>
            </View>

            {/* 유저 ID (개발자 참고용) */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>시스템 정보</Text>
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
              <Text style={styles.modalSectionTitle}>관리자 액션</Text>

              {/* 차단 상태 표시 */}
              {isBanned && userDetail?.profile?.ban_reason && (
                <View style={styles.banStatusContainer}>
                  <Ionicons name="ban-outline" size={16} color={COLORS.error} />
                  <Text style={styles.banStatusText}>
                    차단됨: {userDetail.profile.ban_reason}
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
                      {isBanned ? '차단 해제' : '차단하기'}
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
                <Text style={styles.grantButtonText}>보너스 크레딧 지급</Text>
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
        <Text style={styles.headerTitle}>유저 관리</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="이메일로 검색..."
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
          {SORT_CHIPS.map((chip) => {
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
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 전체 유저 수 카운터 */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          전체 <Text style={styles.countNumber}>{totalCount.toLocaleString()}</Text>명
        </Text>
        {debouncedSearch ? (
          <Text style={styles.searchHint}>
            "{debouncedSearch}" 검색 결과
          </Text>
        ) : null}
      </View>

      {/* 미니 요약 바 */}
      {allUsers.length > 0 && (
        <View style={styles.summaryBarContainer}>
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              Premium <Text style={styles.summaryHighlight}>{summaryStats.premiumCount}</Text>명
              {'  |  '}
              평균 자산 <Text style={styles.summaryHighlight}>{summaryStats.avgAssets.toLocaleString()}</Text>만
              {'  |  '}
              7일 활성 <Text style={styles.summaryHighlight}>{summaryStats.activeCount}</Text>명
            </Text>
          </View>
        </View>
      )}

      {/* 유저 목록 */}
      {isLoading && offset === 0 && allUsers.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>유저 목록을 불러오는 중...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>데이터를 불러올 수 없습니다.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
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
    fontSize: 18,
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
    fontSize: 15,
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
    fontSize: 13,
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
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  countNumber: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  searchHint: {
    fontSize: 12,
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
    fontSize: 13,
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
    fontSize: 8,
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
    fontSize: 14,
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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  joinDate: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  lastActive: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  assetContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  assetValue: {
    fontSize: 14,
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
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 18,
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
    fontSize: 17,
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
    fontSize: 13,
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
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    maxWidth: '55%',
    textAlign: 'right',
  },
  monoText: {
    fontFamily: 'Courier',
    fontSize: 11,
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
    fontSize: 12,
    color: COLORS.textTertiary,
  },

  // ── 모달: 크레딧 거래 내역 ──
  transactionSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  transactionSectionLabel: {
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: '700',
  },
  txInfo: {
    flex: 1,
    marginRight: 8,
  },
  txDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 1,
  },
  txDate: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  txAmount: {
    fontSize: 14,
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
    fontSize: 13,
    color: COLORS.textPrimary,
    marginLeft: 4,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  activityEmptyRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  activityEmptyText: {
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 15,
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
    fontSize: 15,
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
    fontSize: 17,
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
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  grantTargetEmail: {
    fontSize: 14,
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
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: 12,
  },
  grantUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  grantKrw: {
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 14,
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
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
