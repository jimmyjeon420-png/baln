/**
 * useBadgeNotification — 뱃지 획득 감지
 * 새 뱃지 획득 시 홈 탭에 축하 메시지 표시
 */
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BADGE_NOTIFY_KEY = '@baln:new_badge_notification';

export interface BadgeNotification {
  badgeName: string;
  badgeEmoji: string;
  message: string;
}

export function useBadgeNotification() {
  const [notification, setNotification] = useState<BadgeNotification | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(BADGE_NOTIFY_KEY).then(raw => {
      if (raw) {
        try {
          setNotification(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const dismiss = async () => {
    setNotification(null);
    await AsyncStorage.removeItem(BADGE_NOTIFY_KEY);
  };

  return { notification, dismiss };
}

/** 뱃지 획득 시 호출 (useAchievements에서) */
export async function recordBadgeNotification(badge: BadgeNotification) {
  await AsyncStorage.setItem(BADGE_NOTIFY_KEY, JSON.stringify(badge));
}
