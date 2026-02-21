/**
 * StreakCalendar.tsx — 월간 출석 캘린더 히트맵
 *
 * [비유] "깃허브 잔디" — 매일 출석하면 초록색으로 채워지는 달력
 * - 출석한 날: 초록색
 * - 예측 적중한 날: 진한 초록
 * - 미출석: 회색
 * - 이번 달 출석률 퍼센트
 * - 좌우 버튼으로 이전/다음 월 이동
 *
 * useTheme() 훅으로 다크/라이트 모드 대응
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ── Props ──
interface StreakCalendarProps {
  monthData: Array<{
    date: string; // "YYYY-MM-DD"
    checkedIn: boolean;
    predictionCorrect?: boolean;
  }>;
  currentMonth: Date;
  onChangeMonth: (direction: 'prev' | 'next') => void;
  attendanceRate: number; // 0~100
}

// ── 요일 라벨 ──
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// ── 날짜 유틸 ──
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatMonthTitle(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}년 ${month}월`;
}

function isToday(dateStr: string): boolean {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${d}`;
}

function isFuture(dateStr: string): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return new Date(dateStr) > now;
}

// ── 출석률 색상 ──
function getAttendanceColor(rate: number, colors: ReturnType<typeof useTheme>['colors']): string {
  if (rate >= 80) return colors.streak.active;
  if (rate >= 50) return colors.warning;
  return colors.error;
}

// ── 메인 컴포넌트 ──
export default function StreakCalendar({
  monthData,
  currentMonth,
  onChangeMonth,
  attendanceRate,
}: StreakCalendarProps) {
  const { colors } = useTheme();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // monthData를 date 키 맵으로 변환
  const dataMap = useMemo(() => {
    const map: Record<string, { checkedIn: boolean; predictionCorrect?: boolean }> = {};
    for (const item of monthData) {
      map[item.date] = { checkedIn: item.checkedIn, predictionCorrect: item.predictionCorrect };
    }
    return map;
  }, [monthData]);

  // 그리드 데이터 생성 (빈칸 포함)
  const gridCells = useMemo(() => {
    const cells: Array<{
      day: number | null;
      dateStr: string;
      checkedIn: boolean;
      predictionCorrect?: boolean;
    }> = [];

    // 첫 주 빈칸
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateStr: '', checkedIn: false });
    }

    // 날짜 채우기
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = dataMap[dateStr];
      cells.push({
        day: d,
        dateStr,
        checkedIn: data?.checkedIn ?? false,
        predictionCorrect: data?.predictionCorrect,
      });
    }

    return cells;
  }, [year, month, daysInMonth, firstDay, dataMap]);

  // 미래 월 이동 방지
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* ── 헤더: 월 네비게이션 ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onChangeMonth('prev')}
          style={[styles.navButton, { backgroundColor: colors.surfaceLight }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
          {formatMonthTitle(currentMonth)}
        </Text>

        <TouchableOpacity
          onPress={() => onChangeMonth('next')}
          style={[
            styles.navButton,
            { backgroundColor: colors.surfaceLight },
            isCurrentMonth && styles.navButtonDisabled,
          ]}
          disabled={isCurrentMonth}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isCurrentMonth ? colors.textQuaternary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* ── 요일 라벨 ── */}
      <View style={styles.dayLabelRow}>
        {DAY_LABELS.map((label) => (
          <View key={label} style={styles.dayLabelCell}>
            <Text style={[styles.dayLabelText, { color: colors.textTertiary }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── 캘린더 그리드 ── */}
      <View style={styles.grid}>
        {gridCells.map((cell, idx) => {
          if (cell.day === null) {
            return <View key={`empty-${idx}`} style={styles.gridCell} />;
          }

          const future = isFuture(cell.dateStr);
          const today = isToday(cell.dateStr);

          // 셀 배경색 결정
          let cellBgColor = 'transparent';
          if (cell.checkedIn && cell.predictionCorrect) {
            // 출석 + 예측 적중 = 진한 초록
            cellBgColor = colors.streak.active;
          } else if (cell.checkedIn) {
            // 출석만 = 초록
            cellBgColor = `${colors.streak.active}88`; // 50% opacity
          } else if (!future) {
            // 미출석 (과거) = 회색
            cellBgColor = colors.border;
          }

          return (
            <View key={cell.dateStr} style={styles.gridCell}>
              <View
                style={[
                  styles.gridDot,
                  { backgroundColor: cellBgColor },
                  today && [styles.gridDotToday, { borderColor: colors.streak.active }],
                ]}
              >
                <Text
                  style={[
                    styles.gridDayNumber,
                    {
                      color: cell.checkedIn
                        ? colors.background
                        : future
                          ? colors.textQuaternary
                          : colors.textTertiary,
                    },
                    today && { fontWeight: '800' },
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* ── 하단: 출석률 + 범례 ── */}
      <View style={styles.footer}>
        {/* 출석률 */}
        <View style={styles.rateSection}>
          <Text style={[styles.rateLabel, { color: colors.textTertiary }]}>
            이번 달 출석률
          </Text>
          <Text
            style={[
              styles.rateValue,
              { color: getAttendanceColor(attendanceRate, colors) },
            ]}
          >
            {Math.round(attendanceRate)}%
          </Text>
        </View>

        {/* 범례 */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>미출석</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: `${colors.streak.active}88` }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>출석</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.streak.active }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>적중</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },

  // ── 헤더 ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },

  // ── 요일 라벨 ──
  dayLabelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── 그리드 ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridDot: {
    width: '85%',
    height: '85%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridDotToday: {
    borderWidth: 2,
  },
  gridDayNumber: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ── 하단 ──
  footer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateSection: {
    gap: 2,
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  rateValue: {
    fontSize: 23,
    fontWeight: '900',
  },

  // ── 범례 ──
  legendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
