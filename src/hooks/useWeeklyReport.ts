/**
 * useWeeklyReport.ts — 주간 리포트 데이터 집계 훅
 *
 * 역할: "주간 성적표 집계 부서"
 * - 최근 7일간 습관 루프 완료율 집계
 * - 예측 적중률, 스트릭 현황, 번영도 변화 종합
 * - 매주 일요일 자정(KST) 기준으로 이전 주 데이터 스냅샷
 *
 * 비유: 학교에서 매주 금요일에 받는 주간 알림장
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreakData } from '../services/streakService';

const WEEKLY_REPORT_KEY = '@baln:weekly_report';
const HABIT_LOOP_PREFIX = '@baln:habit_loop:';
const PROSPERITY_KEY = 'village_prosperity';

export interface WeeklyReportData {
  /** 리포트 기간 시작일 (YYYY-MM-DD) */
  weekStart: string;
  /** 리포트 기간 종료일 (YYYY-MM-DD) */
  weekEnd: string;
  /** 습관 루프 완료 일수 (3단계 전부 완료한 날 수) */
  habitCompleteDays: number;
  /** 습관 루프 부분 완료 일수 (1~2단계만 완료) */
  habitPartialDays: number;
  /** 맥락 카드 읽은 일수 */
  cardReadDays: number;
  /** 예측 투표한 일수 */
  votedDays: number;
  /** 복기 완료 일수 */
  reviewedDays: number;
  /** 현재 스트릭 */
  currentStreak: number;
  /** 번영도 레벨 */
  prosperityLevel: number;
  /** 번영도 점수 */
  prosperityScore: number;
  /** 데이터 로드 시점 */
  generatedAt: string;
}

/** KST 기준 오늘 날짜 */
function getTodayKST(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

/** 날짜에서 N일 전 계산 */
function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

export function useWeeklyReport() {
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const today = getTodayKST();
        const weekStart = subtractDays(today, 6); // 최근 7일

        // 습관 루프 데이터 집계 (7일분)
        let habitCompleteDays = 0;
        let habitPartialDays = 0;
        let cardReadDays = 0;
        let votedDays = 0;
        let reviewedDays = 0;

        for (let i = 0; i < 7; i++) {
          const dateKey = subtractDays(today, i);
          const storageKey = `${HABIT_LOOP_PREFIX}${dateKey}`;
          try {
            const raw = await AsyncStorage.getItem(storageKey);
            if (raw) {
              const progress = JSON.parse(raw);
              if (progress.cardRead) cardReadDays++;
              if (progress.voted) votedDays++;
              if (progress.reviewed) reviewedDays++;

              const stepsCompleted = [progress.cardRead, progress.voted, progress.reviewed].filter(Boolean).length;
              if (stepsCompleted === 3) habitCompleteDays++;
              else if (stepsCompleted > 0) habitPartialDays++;
            }
          } catch {
            // 개별 날짜 파싱 에러 무시
          }
        }

        // 스트릭 데이터
        const streakData = await getStreakData();

        // 번영도 데이터
        let prosperityLevel = 1;
        let prosperityScore = 0;
        try {
          const prosperityRaw = await AsyncStorage.getItem(PROSPERITY_KEY);
          if (prosperityRaw) {
            const prosperity = JSON.parse(prosperityRaw);
            prosperityLevel = prosperity.level || 1;
            prosperityScore = prosperity.score || 0;
          }
        } catch {
          // 무시
        }

        const reportData: WeeklyReportData = {
          weekStart,
          weekEnd: today,
          habitCompleteDays,
          habitPartialDays,
          cardReadDays,
          votedDays,
          reviewedDays,
          currentStreak: streakData.currentStreak,
          prosperityLevel,
          prosperityScore,
          generatedAt: new Date().toISOString(),
        };

        if (mounted) {
          setReport(reportData);
          // 캐시 저장
          await AsyncStorage.setItem(WEEKLY_REPORT_KEY, JSON.stringify(reportData));
        }
      } catch (err) {
        if (__DEV__) console.warn('[useWeeklyReport] 에러:', err);

        // 캐시 폴백
        try {
          const cached = await AsyncStorage.getItem(WEEKLY_REPORT_KEY);
          if (cached && mounted) {
            setReport(JSON.parse(cached));
          }
        } catch {
          // 무시
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  return { report, isLoading };
}
