/**
 * PeerComparisonCard — 또래 비교 넛지 카드
 *
 * 역할: 같은 자산 구간 사용자들과 "나"를 익명으로 비교하여 동기 부여
 * 비유: 학교 성적표에서 "학년 평균 대비 내 등수"를 보여주는 것
 *
 * 비교 항목 3가지:
 * 1. 건강 점수 — "또래 평균 B등급, 나는 A등급 (상위 15%)"
 * 2. 예측 적중률 — "또래 평균 52%, 나는 68%"
 * 3. 연속 출석 — "또래 평균 12일, 나는 45일"
 *
 * 원칙: 절대 다른 사용자 개인정보 노출 금지 (익명 통계만 사용)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ============================================================================
// Props 인터페이스
// ============================================================================

export interface PeerComparisonCardProps {
  /** 자산 구간 라벨 (예: "3천만~5천만") */
  myBracket: string;
  /** 내 건강 등급 (예: "A") */
  myHealthGrade: string;
  /** 또래 평균 건강 등급 (예: "B") */
  peerAvgHealthGrade: string;
  /** 내 예측 적중률 (0~100) */
  myAccuracy: number;
  /** 또래 평균 예측 적중률 (0~100) */
  peerAvgAccuracy: number;
  /** 내 연속 출석 일수 */
  myStreak: number;
  /** 또래 평균 연속 출석 일수 */
  peerAvgStreak: number;
  /** 내 백분위 (상위 몇 %) */
  myPercentile: number;
  /** 넛지 메시지 */
  nudgeMessage: string;
}

// ============================================================================
// 상수
// ============================================================================

/** 건강 등급을 숫자로 변환 (프로그레스 바 계산용) */
const GRADE_TO_SCORE: Record<string, number> = {
  'A+': 100, 'A': 90, 'A-': 85,
  'B+': 80, 'B': 70, 'B-': 65,
  'C+': 60, 'C': 50, 'C-': 45,
  'D+': 40, 'D': 30, 'D-': 25,
  'F': 10,
};

// ============================================================================
// 유틸 함수
// ============================================================================

/** 등급 문자열 → 숫자 변환 */
function gradeToScore(grade: string): number {
  return GRADE_TO_SCORE[grade.toUpperCase()] ?? 50;
}

// ============================================================================
// 서브 컴포넌트: 비교 프로그레스 바
// ============================================================================

interface ComparisonBarProps {
  /** 비교 항목 라벨 */
  label: string;
  /** 항목 아이콘 */
  icon: keyof typeof Ionicons.glyphMap;
  /** 내 값 (표시용 텍스트) */
  myValueLabel: string;
  /** 또래 값 (표시용 텍스트) */
  peerValueLabel: string;
  /** 내 값 (0~100 스케일, 바 비율) */
  myRatio: number;
  /** 또래 값 (0~100 스케일, 바 비율) */
  peerRatio: number;
}

function ComparisonBar({
  label,
  icon,
  myValueLabel,
  peerValueLabel,
  myRatio,
  peerRatio,
}: ComparisonBarProps) {
  const { colors } = useTheme();
  const isBetter = myRatio >= peerRatio;
  const barColor = isBetter ? colors.success : colors.warning;

  // 비율을 5~100% 범위로 정규화 (바가 너무 작아지지 않도록)
  const maxVal = Math.max(myRatio, peerRatio, 1);
  const myWidth = Math.max((myRatio / maxVal) * 100, 5);
  const peerWidth = Math.max((peerRatio / maxVal) * 100, 5);

  return (
    <View style={s.comparisonItem}>
      {/* 항목 라벨 */}
      <View style={s.comparisonHeader}>
        <View style={s.comparisonLabelRow}>
          <Ionicons name={icon} size={16} color={colors.textTertiary} />
          <Text style={[s.comparisonLabel, { color: colors.textSecondary }]}>
            {label}
          </Text>
        </View>
        {isBetter && (
          <View style={[s.betterBadge, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="arrow-up" size={10} color={colors.success} />
          </View>
        )}
      </View>

      {/* 내 바 */}
      <View style={s.barRow}>
        <Text style={[s.barLabel, { color: colors.primary }]}>나</Text>
        <View style={[s.barTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              s.barFill,
              { width: `${myWidth}%`, backgroundColor: barColor },
            ]}
          />
        </View>
        <Text style={[s.barValue, { color: colors.textPrimary }]}>
          {myValueLabel}
        </Text>
      </View>

      {/* 또래 평균 바 */}
      <View style={s.barRow}>
        <Text style={[s.barLabel, { color: colors.textTertiary }]}>또래</Text>
        <View style={[s.barTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              s.barFill,
              { width: `${peerWidth}%`, backgroundColor: colors.textQuaternary },
            ]}
          />
        </View>
        <Text style={[s.barValue, { color: colors.textTertiary }]}>
          {peerValueLabel}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PeerComparisonCard({
  myBracket,
  myHealthGrade,
  peerAvgHealthGrade,
  myAccuracy,
  peerAvgAccuracy,
  myStreak,
  peerAvgStreak,
  myPercentile,
  nudgeMessage,
}: PeerComparisonCardProps) {
  const { colors, shadows } = useTheme();

  const isTopPerformer = myPercentile <= 30;

  return (
    <View style={[s.container, { backgroundColor: colors.surface }, shadows.md]}>
      {/* 헤더: 자산 구간 뱃지 + 제목 */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={[s.bracketBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={s.bracketEmoji}>💰</Text>
            <Text style={[s.bracketText, { color: colors.primary }]}>
              {myBracket} 구간
            </Text>
          </View>
          <Text style={[s.percentileText, { color: isTopPerformer ? colors.success : colors.textTertiary }]}>
            상위 {myPercentile}%
          </Text>
        </View>
        <Text style={[s.title, { color: colors.textPrimary }]}>
          나 vs 또래 비교
        </Text>
      </View>

      {/* 비교 항목 3개 */}
      <View style={s.comparisons}>
        {/* 1. 건강 점수 */}
        <ComparisonBar
          label="건강 점수"
          icon="heart-outline"
          myValueLabel={`${myHealthGrade}등급`}
          peerValueLabel={`${peerAvgHealthGrade}등급`}
          myRatio={gradeToScore(myHealthGrade)}
          peerRatio={gradeToScore(peerAvgHealthGrade)}
        />

        {/* 2. 예측 적중률 */}
        <ComparisonBar
          label="예측 적중률"
          icon="analytics-outline"
          myValueLabel={`${myAccuracy}%`}
          peerValueLabel={`${peerAvgAccuracy}%`}
          myRatio={myAccuracy}
          peerRatio={peerAvgAccuracy}
        />

        {/* 3. 연속 출석 */}
        <ComparisonBar
          label="연속 출석"
          icon="flame-outline"
          myValueLabel={`${myStreak}일`}
          peerValueLabel={`${peerAvgStreak}일`}
          myRatio={myStreak}
          peerRatio={peerAvgStreak}
        />
      </View>

      {/* 넛지 메시지 */}
      <View style={[s.nudgeContainer, { backgroundColor: isTopPerformer ? colors.success + '10' : colors.warning + '10' }]}>
        <Ionicons
          name={isTopPerformer ? 'trophy-outline' : 'trending-up-outline'}
          size={18}
          color={isTopPerformer ? colors.success : colors.warning}
        />
        <Text style={[s.nudgeText, { color: isTopPerformer ? colors.success : colors.warning }]}>
          {nudgeMessage}
        </Text>
      </View>

      {/* 익명 고지 */}
      <Text style={[s.disclaimer, { color: colors.textQuaternary }]}>
        모든 비교는 익명 통계 기반이며, 개인정보는 포함되지 않습니다.
      </Text>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  // 컨테이너
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
  },

  // 헤더
  header: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bracketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  bracketEmoji: {
    fontSize: 14,
  },
  bracketText: {
    fontSize: 13,
    fontWeight: '600',
  },
  percentileText: {
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },

  // 비교 항목
  comparisons: {
    gap: 16,
    marginBottom: 16,
  },
  comparisonItem: {
    gap: 6,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  comparisonLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comparisonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  betterBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 프로그레스 바
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 28,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    fontSize: 13,
    fontWeight: '600',
    width: 52,
    textAlign: 'right',
  },

  // 넛지 메시지
  nudgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  nudgeText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },

  // 익명 고지
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
