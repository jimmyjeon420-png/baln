/**
 * cafeGuruVisitService — 구루 카페 방문 관리 서비스
 *
 * 역할: "카페 방문 스케줄러" — 오늘 어떤 구루가 카페에 오는지,
 *       지금 카페에 있는지를 결정론적으로 계산
 * 비유: 카페 벽에 붙어있는 "이번 주 게스트 일정표"
 *
 * 사용처:
 * - src/hooks/useCafeFeatures.ts (방문 구루 조회)
 * - src/components/lounge/GuruVisitBanner.tsx (방문 배너 표시)
 */

import { GURU_VISIT_SCHEDULE, type GuruVisitSlot } from '../data/cafeConfig';
import { GURU_CHARACTER_CONFIGS } from '../data/guruCharacterConfig';

// =============================================================================
// 타입
// =============================================================================

export interface VisitingGuru {
  guruId: string;
  guruName: string;
  guruNameEn: string;
  emoji: string;
  accentColor: string;
  startHour: number;
  endHour: number;
  /** 지금 카페에 있는지 여부 */
  isPresent: boolean;
}

// =============================================================================
// 내부 유틸
// =============================================================================

/** 현재 KST 시간 가져오기 */
function getKSTDate(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

/** 주간 회전 오프셋 — 매주 다른 구루 조합이 되도록 */
function getWeeklyOffset(): number {
  const kst = getKSTDate();
  const startOfYear = new Date(kst.getFullYear(), 0, 1);
  const weekNumber = Math.floor(
    (kst.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return weekNumber % 10;
}

// =============================================================================
// 공개 API
// =============================================================================

/**
 * 오늘 카페를 방문하는 구루 목록 반환
 * 요일 스케줄 + 주간 회전 오프셋으로 매주 다른 조합 생성
 */
export function getTodayVisitingGurus(): VisitingGuru[] {
  const kst = getKSTDate();
  const dayOfWeek = kst.getUTCDay(); // 0=일 ~ 6=토
  const kstHour = kst.getUTCHours();

  const slots = GURU_VISIT_SCHEDULE[dayOfWeek] ?? [];
  const guruIds = Object.keys(GURU_CHARACTER_CONFIGS);
  const offset = getWeeklyOffset();

  return slots.map((slot: GuruVisitSlot) => {
    // 주간 오프셋 적용: 기본 구루 대신 회전된 구루 선택
    const baseIndex = guruIds.indexOf(slot.guruId);
    const rotatedIndex = baseIndex >= 0
      ? (baseIndex + offset) % guruIds.length
      : 0;
    const guruId = guruIds[rotatedIndex];
    const config = GURU_CHARACTER_CONFIGS[guruId];

    return {
      guruId,
      guruName: config?.guruName ?? guruId,
      guruNameEn: config?.guruNameEn ?? guruId,
      emoji: config?.emoji ?? '',
      accentColor: config?.accentColor ?? '#4CAF50',
      startHour: slot.startHour,
      endHour: slot.endHour,
      isPresent: kstHour >= slot.startHour && kstHour < slot.endHour,
    };
  });
}

/**
 * 특정 구루가 지금 카페에 있는지 확인
 */
export function isGuruCurrentlyPresent(guruId: string): boolean {
  const visitors = getTodayVisitingGurus();
  return visitors.some((v) => v.guruId === guruId && v.isPresent);
}

/**
 * 지금 카페에 있는 구루만 반환
 */
export function getCurrentlyPresentGurus(): VisitingGuru[] {
  return getTodayVisitingGurus().filter((v) => v.isPresent);
}
