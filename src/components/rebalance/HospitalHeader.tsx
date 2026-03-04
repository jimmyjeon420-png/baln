/**
 * HospitalHeader — 분석 탭 헤더
 *
 * 기능: 건강 등급별 거장 코멘트 표시
 * - A: 버핏 — 칭찬
 * - B: 린치 — 격려
 * - C: 달리오 — 주의
 * - D: 막스 — 경고
 * - F: 로저스 — 긴급
 *
 * 사용처: app/(tabs)/rebalance.tsx 분석 탭 최상단
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import { t, getCurrentLanguage } from '../../locales';
import type { ThemeColors } from '../../styles/colors';

// =============================================================================
// 타입 정의
// =============================================================================

interface HospitalHeaderProps {
  /** 건강 등급 (A/B/C/D/F) */
  healthGrade?: string;
  /** 테마 색상 */
  colors: ThemeColors;
  /** @deprecated Use t() from locales instead. Kept for backward compatibility. */
  locale?: string;
}

// =============================================================================
// 등급별 구루 코멘트 설정
// =============================================================================

interface GradeConfig {
  guruId: string;
  color: string;
  commentKey: string;
}

const GRADE_CONFIGS: Record<string, GradeConfig> = {
  A: {
    guruId: 'buffett',
    color: '#4CAF50',
    commentKey: 'rebalance.hospital.grade_A',
  },
  B: {
    guruId: 'lynch',
    color: '#8BC34A',
    commentKey: 'rebalance.hospital.grade_B',
  },
  C: {
    guruId: 'dalio',
    color: '#FFC107',
    commentKey: 'rebalance.hospital.grade_C',
  },
  D: {
    guruId: 'marks',
    color: '#FF9800',
    commentKey: 'rebalance.hospital.grade_D',
  },
  F: {
    guruId: 'rogers',
    color: '#F44336',
    commentKey: 'rebalance.hospital.grade_F',
  },
};

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function HospitalHeader({
  healthGrade,
  colors,
}: HospitalHeaderProps): React.ReactElement {
  const _isKo = getCurrentLanguage() === 'ko';

  // 등급 설정 조회
  const gradeKey = healthGrade?.toUpperCase() ?? '';
  const gradeConfig = GRADE_CONFIGS[gradeKey] ?? null;

  // 구루 정보
  const guruConfig = gradeConfig
    ? GURU_CHARACTER_CONFIGS[gradeConfig.guruId]
    : null;
  const guruEmoji = guruConfig?.emoji ?? '';
  const guruName = gradeConfig
    ? getGuruDisplayName(gradeConfig.guruId)
    : '';
  const accentColor = gradeConfig?.color ?? colors.textTertiary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
        },
      ]}
    >
      {/* 간판 */}
      <Text style={[styles.signText, { color: colors.textPrimary }]}>
        {t('rebalance.hospital.sign')}
      </Text>

      {/* 구루 코멘트 또는 대기 메시지 */}
      {gradeConfig ? (
        <Text
          style={[styles.commentText, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {guruEmoji} {guruName}: &ldquo;{t(gradeConfig.commentKey)}&rdquo;
        </Text>
      ) : (
        <Text style={[styles.waitingText, { color: colors.textTertiary }]}>
          {t('rebalance.hospital.waiting')}
        </Text>
      )}
    </View>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
  },
  signText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 19,
  },
  waitingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

export default HospitalHeader;
