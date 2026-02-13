/**
 * 알림 센터 화면 — 수신 알림 카테고리별 목록
 *
 * 비유: "알림 우체통 열어보기"
 * - 상단 필터 칩: [전체] [투자] [소셜] [시스템]
 * - 안읽은 알림: 왼쪽 초록 점 표시
 * - 전체 읽음 처리 버튼
 * - 알림 탭 → 해당 화면으로 이동
 *
 * 투자 알림: 위기 감지, 시세 변동, 예측 결과
 * 소셜 알림: 좋아요, 댓글, 답글
 * 시스템 알림: 구독, 크레딧, 공지사항
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../src/styles/theme';
import { useTheme } from '../src/hooks/useTheme';
import {
  NotificationItem,
  NotificationCategoryFilter,
  NOTIFICATION_CATEGORIES,
  loadNotifications,
  markAsRead,
  markAllAsRead,
  filterByCategory,
  createSampleNotifications,
  clearAllNotifications,
} from '../src/services/notificationCenter';
import { getRelativeTime } from '../src/utils/communityUtils';

// 카테고리 필터 목록
const FILTER_CHIPS: NotificationCategoryFilter[] = ['all', 'investment', 'social', 'system'];

export default function NotificationCenterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationCategoryFilter>('all');

  // 알림 로드
  const loadData = useCallback(async () => {
    const items = await loadNotifications();
    setNotifications(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 새로고침
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // 알림 탭 핸들러
  const handleTapNotification = useCallback(async (item: NotificationItem) => {
    // 읽음 처리
    if (!item.isRead) {
      await markAsRead(item.id);
      setNotifications(prev =>
        prev.map(n => n.id === item.id ? { ...n, isRead: true } : n),
      );
    }

    // 해당 화면으로 이동
    if (item.navigateTo) {
      router.push(item.navigateTo as any);
    }
  }, [router]);

  // 전체 읽음 처리
  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  // 샘플 알림 생성 (개발용)
  const handleCreateSamples = useCallback(async () => {
    await createSampleNotifications();
    await loadData();
  }, [loadData]);

  // 필터링된 목록
  const filteredNotifications = filterByCategory(notifications, activeFilter);

  // 안읽은 알림 수
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // 카테고리별 안읽은 수
  const getUnreadCountForCategory = (cat: NotificationCategoryFilter) => {
    if (cat === 'all') return unreadCount;
    return notifications.filter(n => !n.isRead && n.category === cat).length;
  };

  // 알림 아이템 렌더링
  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const catInfo = NOTIFICATION_CATEGORIES[item.category];

    return (
      <TouchableOpacity
        style={[styles.notifCard, { borderBottomColor: colors.borderLight }, !item.isRead && styles.notifCardUnread]}
        onPress={() => handleTapNotification(item)}
        activeOpacity={0.7}
      >
        {/* 안읽음 표시 (초록 점) */}
        {!item.isRead && <View style={styles.unreadDot} />}

        {/* 아이콘 */}
        <View style={[styles.notifIcon, { backgroundColor: item.iconColor + '20' }]}>
          <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
        </View>

        {/* 내용 */}
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text
              style={[styles.notifTitle, { color: colors.textSecondary }, !item.isRead && [styles.notifTitleUnread, { color: colors.textPrimary }]]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[styles.notifTime, { color: colors.textTertiary }]}>{getRelativeTime(item.createdAt)}</Text>
          </View>
          <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
          {/* 카테고리 라벨 */}
          <View style={[styles.categoryTag, { backgroundColor: catInfo.color + '15' }]}>
            <Ionicons name={catInfo.icon as any} size={10} color={catInfo.color} />
            <Text style={[styles.categoryTagText, { color: catInfo.color }]}>
              {catInfo.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>알림</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              style={[styles.markAllBtn, { backgroundColor: colors.primary + '20' }]}
            >
              <Text style={[styles.markAllText, { color: colors.primary }]}>모두 읽음</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 필터 칩 */}
      <View style={styles.filterRow}>
        {FILTER_CHIPS.map((cat) => {
          const info = NOTIFICATION_CATEGORIES[cat];
          const isActive = activeFilter === cat;
          const count = getUnreadCountForCategory(cat);

          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(cat)}
            >
              <Ionicons
                name={info.icon as any}
                size={14}
                color={isActive ? '#000' : colors.textSecondary}
              />
              <Text style={[styles.filterChipText, { color: colors.textSecondary }, isActive && styles.filterChipTextActive]}>
                {info.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: colors.error }, isActive && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 알림 목록 */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textQuaternary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {activeFilter === 'all' ? '알림이 없습니다' : `${NOTIFICATION_CATEGORIES[activeFilter].label} 알림이 없습니다`}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
              새로운 알림이 오면 여기에 표시됩니다
            </Text>

            {/* 개발용: 샘플 알림 생성 */}
            {notifications.length === 0 && (
              <TouchableOpacity
                style={[styles.sampleBtn, { backgroundColor: colors.primary + '15' }]}
                onPress={handleCreateSamples}
              >
                <Ionicons name="add-circle" size={18} color={colors.primary} />
                <Text style={[styles.sampleBtnText, { color: colors.primary }]}>[DEV] 샘플 알림 생성</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerActions: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 필터 칩
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#000',
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeActive: {
    backgroundColor: '#000',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  filterBadgeTextActive: {
    color: '#4CAF50',
  },

  // 알림 목록
  listContent: {
    paddingBottom: 40,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  notifCardUnread: {
    backgroundColor: 'rgba(76,175,80,0.05)',
  },
  unreadDot: {
    position: 'absolute',
    left: 8,
    top: 20,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  notifTime: {
    fontSize: 11,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // 빈 상태
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
  },
  sampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sampleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
