/**
 * StreakDetailCard.tsx — 스트릭 상세 카드
 *
 * [비유] "출석부 상세 페이지"
 * - 현재 연속 출석 일수 (대형 숫자 + 불꽃)
 * - 최장 기록 표시
 * - 다음 마일스톤까지 프로그레스 바 (7/30/90/365일)
 * - 오늘 출석 체크 상태 (완료/미완료)
 * - 주간 미니 캘린더 (월~일, 초록 점)
 *
 * useTheme() 훅으로 다크/라이트 모드 대응
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ── 마일스톤 목록 ──
const MILESTONES = [
  { target: 7, label: '1주 연속', emoji: '\uD83D\uDD25' },
  { target: 30, label: '1개월 연속', emoji: '\uD83D\uDCAA' },
  { target: 90, label: '철인 달성', emoji: '\uD83D\uDCAA' },
  { target: 365, label: '레전드', emoji: '\uD83C\uDFC6' },
];

// ── Props ──
interface StreakDetailCardProps {
  currentStreak: number;
  longestStreak: number;
  todayCheckedIn: boolean;
  weeklyData: Array<{ day: string; checkedIn: boolean }>;
  nextMilestone: { target: number; label: string };
  onCheckIn?: () => void;
}

// ── 다음 마일스톤 계산 ──
function getNextMilestone(current: number): { target: number; label: string; emoji: string } {
  for (const m of MILESTONES) {
    if (current < m.target) return m;
  }
  // 365일 이상이면 다음 목표는 현재+100
  return { target: current + 100, label: `${current + 100}일 도전`, emoji: '\uD83C\uDFC6' };
}

// ── 메인 컴포넌트 ──
export default function StreakDetailCard({
  currentStreak,
  longestStreak,
  todayCheckedIn,
  weeklyData,
  nextMilestone,
  onCheckIn,
}: StreakDetailCardProps) {
  const { colors } = useTheme();

  // 프로그레스 계산
  const computed = getNextMilestone(currentStreak);
  const milestone = nextMilestone.target > 0 ? nextMilestone : computed;
  const prevMilestone = MILESTONES.filter(m => m.target <= currentStreak).pop();
  const base = prevMilestone ? prevMilestone.target : 0;
  const range = milestone.target - base;
  const progress = range > 0 ? Math.min((currentStreak - base) / range, 1) : 1;
  const remaining = milestone.target - currentStreak;

  // 기록 갱신 중 여부
  const isNewRecord = currentStreak >= longestStreak && currentStreak > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* ── 상단: 스트릭 숫자 + 불꽃 ── */}
      <View style={styles.heroRow}>
        <View style={styles.heroLeft}>
          <Text style={styles.fireEmoji}>{'\uD83D\uDD25'}</Text>
          <View>
            <Text style={[styles.streakNumber, { color: colors.streak.active }]}>
              {currentStreak}
            </Text>
            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
              일 연속 방문
            </Text>
          </View>
        </View>

        {/* 최장 기록 */}
        <View style={[styles.recordBadge, { backgroundColor: colors.streak.background }]}>
          {isNewRecord ? (
            <>
              <Text style={styles.recordEmoji}>{'\u2B50'}</Text>
              <Text style={[styles.recordText, { color: colors.streak.active }]}>
                기록 갱신 중!
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.recordEmoji}>{'\uD83C\uDFC6'}</Text>
              <Text style={[styles.recordText, { color: colors.textSecondary }]}>
                최장 {longestStreak}일
              </Text>
            </>
          )}
        </View>
      </View>

      {/* ── 다음 마일스톤 프로그레스 바 ── */}
      <View style={styles.milestoneSection}>
        <View style={styles.milestoneHeader}>
          <Text style={[styles.milestoneLabel, { color: colors.textSecondary }]}>
            다음 목표: {milestone.label}
          </Text>
          <Text style={[styles.milestoneRemaining, { color: colors.streak.active }]}>
            {remaining > 0 ? `${remaining}일 남음` : '달성!'}
          </Text>
        </View>

        {/* 프로그레스 바 */}
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.streak.active,
                width: `${Math.round(progress * 100)}%`,
              },
            ]}
          />
        </View>

        {/* 마일스톤 도트 */}
        <View style={styles.milestoneDotsRow}>
          {MILESTONES.map((m) => {
            const achieved = currentStreak >= m.target;
            return (
              <View key={m.target} style={styles.milestoneDot}>
                <View
                  style={[
                    styles.dotCircle,
                    achieved
                      ? { backgroundColor: colors.streak.active }
                      : { backgroundColor: colors.border },
                  ]}
                >
                  {achieved && (
                    <Ionicons name="checkmark" size={8} color={colors.background} />
                  )}
                </View>
                <Text
                  style={[
                    styles.dotLabel,
                    { color: achieved ? colors.streak.active : colors.textTertiary },
                  ]}
                >
                  {m.target}일
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── 오늘 출석 체크 상태 ── */}
      {todayCheckedIn ? (
        <View style={[styles.checkedInBanner, { backgroundColor: colors.streak.background }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.streak.active} />
          <Text style={[styles.checkedInText, { color: colors.streak.active }]}>
            오늘 출석 완료!
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.checkInButton, { backgroundColor: colors.primary }]}
          onPress={onCheckIn}
          activeOpacity={0.8}
        >
          <Ionicons name="flame" size={18} color={colors.background} />
          <Text style={[styles.checkInButtonText, { color: colors.background }]}>
            출석 체크하기
          </Text>
        </TouchableOpacity>
      )}

      {/* ── 주간 미니 캘린더 (월~일) ── */}
      <View style={styles.weeklySection}>
        <Text style={[styles.weeklySectionTitle, { color: colors.textTertiary }]}>
          이번 주
        </Text>
        <View style={styles.weeklyRow}>
          {weeklyData.map((item, idx) => (
            <View key={idx} style={styles.weeklyItem}>
              <Text style={[styles.weeklyDayLabel, { color: colors.textTertiary }]}>
                {item.day}
              </Text>
              <View
                style={[
                  styles.weeklyDot,
                  item.checkedIn
                    ? { backgroundColor: colors.streak.active }
                    : { backgroundColor: colors.border },
                ]}
              >
                {item.checkedIn && (
                  <Ionicons name="checkmark" size={10} color={colors.background} />
                )}
              </View>
            </View>
          ))}
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
    padding: 20,
    borderWidth: 1,
  },

  // ── 히어로 (상단 숫자) ──
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fireEmoji: {
    fontSize: 40,
  },
  streakNumber: {
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  // ── 기록 뱃지 ──
  recordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  recordEmoji: {
    fontSize: 14,
  },
  recordText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── 마일스톤 ──
  milestoneSection: {
    marginBottom: 16,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  milestoneRemaining: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  milestoneDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  milestoneDot: {
    alignItems: 'center',
    gap: 4,
  },
  dotCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotLabel: {
    fontSize: 10,
    fontWeight: '500',
  },

  // ── 출석 체크 ──
  checkedInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  checkedInText: {
    fontSize: 14,
    fontWeight: '700',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  checkInButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── 주간 캘린더 ──
  weeklySection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
  },
  weeklySectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyItem: {
    alignItems: 'center',
    gap: 6,
  },
  weeklyDayLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  weeklyDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
