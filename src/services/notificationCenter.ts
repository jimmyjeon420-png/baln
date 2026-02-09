/**
 * 알림 센터 서비스 — 수신 알림 관리
 *
 * 비유: "알림 우체통"
 * - 들어온 알림을 카테고리별로 분류
 * - 읽음/안읽음 상태 관리
 * - AsyncStorage에 최대 100건 보관
 *
 * 카테고리:
 * - investment: 투자 알림 (위기 감지, 시세 변동, 예측 결과)
 * - social: 소셜 알림 (좋아요, 댓글, 답글)
 * - system: 시스템 알림 (구독, 크레딧, 공지사항)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// 타입 정의
// ============================================================================

/** 알림 카테고리 */
export type NotificationCategory = 'investment' | 'social' | 'system';

/** 카테고리 필터 (전체 포함) */
export type NotificationCategoryFilter = NotificationCategory | 'all';

/** 알림 아이템 */
export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  icon: string;         // Ionicons 이름
  iconColor: string;
  isRead: boolean;
  createdAt: string;    // ISO string
  /** 탭 시 이동할 경로 (선택) */
  navigateTo?: string;
  /** 추가 데이터 */
  metadata?: Record<string, any>;
}

/** 카테고리 정보 */
export const NOTIFICATION_CATEGORIES: Record<NotificationCategoryFilter, {
  label: string;
  icon: string;
  color: string;
}> = {
  all: { label: '전체', icon: 'notifications', color: '#4CAF50' },
  investment: { label: '투자', icon: 'trending-up', color: '#4CAF50' },
  social: { label: '소셜', icon: 'people', color: '#FF69B4' },
  system: { label: '시스템', icon: 'settings', color: '#29B6F6' },
};

// ============================================================================
// AsyncStorage 관리
// ============================================================================

const STORAGE_KEY = '@baln:notification_center';
const MAX_NOTIFICATIONS = 100;

/**
 * 알림 목록 로드
 */
export async function loadNotifications(): Promise<NotificationItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as NotificationItem[];
    // 최신순 정렬
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

/**
 * 알림 저장 (최대 100건 유지)
 */
async function saveNotifications(items: NotificationItem[]): Promise<void> {
  try {
    // 최신 100건만 유지
    const trimmed = items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_NOTIFICATIONS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // 저장 실패 무시
  }
}

/**
 * 새 알림 추가
 */
export async function addNotification(
  notification: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>,
): Promise<void> {
  const items = await loadNotifications();
  const newItem: NotificationItem = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  items.unshift(newItem);
  await saveNotifications(items);
}

/**
 * 특정 알림 읽음 처리
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const items = await loadNotifications();
  const idx = items.findIndex(i => i.id === notificationId);
  if (idx >= 0) {
    items[idx].isRead = true;
    await saveNotifications(items);
  }
}

/**
 * 전체 읽음 처리
 */
export async function markAllAsRead(): Promise<void> {
  const items = await loadNotifications();
  items.forEach(i => { i.isRead = true; });
  await saveNotifications(items);
}

/**
 * 안읽은 알림 수 조회
 */
export async function getUnreadCount(): Promise<number> {
  const items = await loadNotifications();
  return items.filter(i => !i.isRead).length;
}

/**
 * 카테고리별 필터링
 */
export function filterByCategory(
  items: NotificationItem[],
  category: NotificationCategoryFilter,
): NotificationItem[] {
  if (category === 'all') return items;
  return items.filter(i => i.category === category);
}

/**
 * 알림 전체 삭제
 */
export async function clearAllNotifications(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * 샘플 알림 생성 (개발용)
 */
export async function createSampleNotifications(): Promise<void> {
  const samples: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>[] = [
    {
      category: 'investment',
      title: '비트코인 -5.2% 급락',
      body: '당신의 포트폴리오에 -1.8% 영향이 예상됩니다',
      icon: 'trending-down',
      iconColor: '#CF6679',
      navigateTo: '/(tabs)',
    },
    {
      category: 'investment',
      title: '예측 적중! +2 크레딧',
      body: '"S&P 500 3% 이상 하락할까?" 예측이 맞았습니다',
      icon: 'checkmark-circle',
      iconColor: '#4CAF50',
      navigateTo: '/games/predictions',
    },
    {
      category: 'social',
      title: '게시글에 좋아요',
      body: 'GOLD 회원님이 "삼성전자 분석 공유합니다" 게시글을 좋아합니다',
      icon: 'heart',
      iconColor: '#CF6679',
      navigateTo: '/community',
    },
    {
      category: 'social',
      title: '새 댓글',
      body: 'PLATINUM 회원님이 댓글을 남겼습니다: "저도 비슷한 생각이에요"',
      icon: 'chatbubble',
      iconColor: '#FF69B4',
      navigateTo: '/community',
    },
    {
      category: 'system',
      title: '아침 브리핑 준비 완료',
      body: 'AI가 분석한 오늘의 시장 동향을 확인하세요',
      icon: 'sunny',
      iconColor: '#FFB74D',
      navigateTo: '/(tabs)',
    },
    {
      category: 'system',
      title: '연속 7일 출석!',
      body: '7일 연속 출석 보상 +5 크레딧이 지급되었습니다',
      icon: 'flame',
      iconColor: '#FF6B35',
    },
    {
      category: 'investment',
      title: '리밸런싱 점검 시간',
      body: '포트폴리오 배분이 목표에서 5% 이상 이탈했습니다',
      icon: 'refresh-circle',
      iconColor: '#29B6F6',
      navigateTo: '/(tabs)/rebalance',
    },
  ];

  const items = await loadNotifications();
  const now = Date.now();

  for (let i = 0; i < samples.length; i++) {
    items.push({
      ...samples[i],
      id: `sample_${now}_${i}`,
      isRead: i > 2, // 처음 3개만 안읽음
      createdAt: new Date(now - i * 3600000 * (i + 1)).toISOString(), // 시간 간격
    });
  }

  await saveNotifications(items);
}
