/**
 * villageNotificationHelper — 알림 템플릿 유틸리티
 *
 * 역할: notificationTemplates.ts의 데이터를 쉽게 사용할 수 있게 해주는
 *       헬퍼 함수 모음. 탭 파일을 수정하지 않고도 푸시/로컬 알림에서
 *       구루 캐릭터 목소리의 알림 콘텐츠를 가져올 수 있음.
 *
 * 비유: "알림 비서" — "오늘 아침 알림은 버핏이 담당, 한국어/영어 본문 알려줘"
 */

import {
  getTemplateForType,
  getTemplateByGuru,
  type NotificationTemplate,
} from '../data/notificationTemplates';

/** 알림 콘텐츠 반환 형식 */
export interface NotificationContent {
  title: string;
  body: string;
}

/**
 * 알림 유형 + 구루 + 로케일 기반으로 알림 제목/본문 반환
 *
 * @param type   - 알림 유형 (morning_reminder, streak_warning 등)
 * @param guruId - 특정 구루 ID (없으면 날짜 기반 자동 순환)
 * @param locale - 'ko' | 'en' (기본: 'ko')
 */
export function getNotificationContent(
  type: NotificationTemplate['type'],
  guruId?: string,
  locale: 'ko' | 'en' = 'ko',
): NotificationContent {
  const template = guruId
    ? getTemplateByGuru(guruId, type) ?? getTemplateForType(type)
    : getTemplateForType(type);

  if (locale === 'en') {
    return {
      title: template.titleEn,
      body: template.bodyEn,
    };
  }

  return {
    title: template.title,
    body: template.body,
  };
}
