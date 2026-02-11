/**
 * 분석 탭 헤더 컴포넌트
 *
 * 역할: AI 진단 결과를 한 줄로 요약 + 건강 등급 뱃지
 * 비유: 건강검진 결과지 맨 위 "종합 소견" 섹션
 *
 * 표시 내용:
 * - 건강 등급 (S/A/B/C/D) + 색상 뱃지
 * - 한 줄 요약 ("포트폴리오 건강 A등급, 집중도 주의")
 * - Panic Shield 점수 (간단 표시)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HealthScoreResult } from '../../services/rebalanceScore';
import { useTheme } from '../../hooks/useTheme';

interface CheckupHeaderProps {
  /** 건강 점수 (6팩터) */
  healthScore: HealthScoreResult;
  /** Panic Shield 점수 (0-100) */
  panicScore?: number;
  /** Panic Shield 이유 (선택) */
  panicReason?: string;
  /** 총 자산 */
  totalAssets: number;
}

/**
 * 건강 등급별 색상
 */
const GRADE_COLORS: Record<string, string> = {
  S: '#4CAF50', // 초록
  A: '#64B5F6', // 파랑
  B: '#FFA726', // 주황
  C: '#FF7043', // 빨강-주황
  D: '#CF6679', // 빨강
};

/**
 * 건강 등급별 아이콘
 */
const GRADE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  S: 'trophy',
  A: 'checkmark-circle',
  B: 'alert-circle',
  C: 'warning',
  D: 'close-circle',
};

/**
 * 건강 등급별 한 줄 요약 생성
 */
function generateSummary(healthScore: HealthScoreResult): string {
  // summary가 이미 있으면 그대로 사용 (rebalanceScore에서 계산됨)
  if (healthScore.summary) return healthScore.summary;

  const { grade } = healthScore;

  // 주의가 필요한 팩터 (60점 미만)
  const warnings = healthScore.factors
    .filter((f: any) => f.score < 60)
    .map((f: any) => f.label);

  if (warnings.length === 0) {
    return `포트폴리오 건강 ${grade}등급, 모든 지표 양호`;
  } else if (warnings.length === 1) {
    return `포트폴리오 건강 ${grade}등급, ${warnings[0]} 주의`;
  } else if (warnings.length === 2) {
    return `포트폴리오 건강 ${grade}등급, ${warnings[0]}·${warnings[1]} 개선 필요`;
  } else {
    return `포트폴리오 건강 ${grade}등급, ${warnings.length}개 지표 개선 필요`;
  }
}

export default function CheckupHeader({
  healthScore,
  panicScore,
  panicReason,
  totalAssets,
}: CheckupHeaderProps) {
  const { colors, shadows } = useTheme();
  const gradeColor = healthScore.gradeColor || GRADE_COLORS[healthScore.grade];
  const gradeIcon = GRADE_ICONS[healthScore.grade];
  const summary = generateSummary(healthScore);

  // Panic Shield 이유 생성 (없으면 점수 기반 기본 메시지)
  const getPanicReason = (): string => {
    if (panicReason) return panicReason;
    if (!panicScore) return '';

    if (panicScore >= 70) {
      return '현금 비중과 분산이 안정적';
    } else if (panicScore >= 50) {
      return '일부 개선 여지 있음';
    } else {
      return '현금 확보 또는 분산 필요';
    }
  };

  // 총자산 포맷 (억/만 단위)
  const formatAssets = (amount: number): string => {
    if (amount >= 100_000_000) {
      const eok = Math.floor(amount / 100_000_000);
      const man = Math.floor((amount % 100_000_000) / 10_000);
      return man > 0 ? `${eok}억 ${man}만원` : `${eok}억원`;
    } else if (amount >= 10_000) {
      return `${Math.floor(amount / 10_000)}만원`;
    } else {
      return `${Math.floor(amount).toLocaleString()}원`;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.md]}>
      {/* 상단: 건강 등급 뱃지 */}
      <View style={styles.gradeSection}>
        <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '20' }]}>
          <Ionicons name={gradeIcon} size={28} color={gradeColor} />
          <Text style={[styles.gradeText, { color: gradeColor }]}>
            {healthScore.grade}
          </Text>
        </View>
        <View style={styles.gradeInfo}>
          <Text style={[styles.scoreText, { color: colors.textPrimary }]}>{Math.round(healthScore.totalScore)}점</Text>
          <Text style={[styles.totalAssetsText, { color: colors.textSecondary }]}>{formatAssets(totalAssets)}</Text>
        </View>
      </View>

      {/* 중간: 한 줄 요약 */}
      <View style={[styles.summarySection, { borderTopColor: colors.border }]}>
        <Text style={[styles.summaryText, { color: colors.textPrimary }]}>{summary}</Text>
      </View>

      {/* 하단: Panic Shield 간단 표시 (있을 때만) */}
      {panicScore !== undefined && (
        <View style={[styles.panicSection, { borderTopColor: colors.border }]}>
          <View style={styles.panicRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#4CAF50" />
            <Text style={[styles.panicLabel, { color: colors.textSecondary }]}>Panic Shield</Text>
            <Text style={styles.panicScore}>{Math.round(panicScore)}점</Text>
            <Text style={[styles.panicDesc, { color: colors.textSecondary }]}>
              {panicScore >= 70 ? '강함' : panicScore >= 50 ? '보통' : '취약'}
            </Text>
          </View>
          {/* 점수 이유 (달리오: 맥락 제공) */}
          <Text style={[styles.panicReason, { color: colors.textTertiary }]}>
            {getPanicReason()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    // backgroundColor: 동적 적용 (colors.surface)
    borderRadius: 16,
    borderWidth: 1,
    // borderColor: 동적 적용 (colors.border)
  },
  gradeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gradeBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  gradeInfo: {
    flex: 1,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '700',
    // color: 동적 적용 (colors.textPrimary)
    marginBottom: 4,
  },
  totalAssetsText: {
    fontSize: 14,
    // color: 동적 적용 (colors.textSecondary)
  },
  summarySection: {
    paddingTop: 16,
    borderTopWidth: 1,
    // borderTopColor: 동적 적용 (colors.border)
  },
  summaryText: {
    fontSize: 15,
    // color: 동적 적용 (colors.textPrimary)
    lineHeight: 22,
  },
  panicSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    // borderTopColor: 동적 적용 (colors.border)
  },
  panicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  panicLabel: {
    fontSize: 13,
    // color: 동적 적용 (colors.textSecondary)
    marginLeft: 6,
  },
  panicScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50', // 고정 색상 (강조색)
    marginLeft: 8,
  },
  panicDesc: {
    fontSize: 13,
    // color: 동적 적용 (colors.textSecondary)
    marginLeft: 4,
  },
  panicReason: {
    fontSize: 12,
    // color: 동적 적용 (colors.textTertiary)
    marginLeft: 22, // 아이콘 + 라벨 너비만큼 들여쓰기
    fontStyle: 'italic',
  },
});
