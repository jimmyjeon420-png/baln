/**
 * HospitalHeader — 분석 탭 "마을 병원" 연출
 *
 * 역할: "건강검진센터 간판" — 분석 탭 상단에 세계관을 입혀
 *       진단 결과에 따라 구루가 한마디를 건넴
 *
 * 비유: 동물의숲 박물관처럼, 분석 탭에 들어오면
 *       "발른 건강검진센터"라는 간판이 반겨주고
 *       건강 등급에 따라 담당 구루가 코멘트를 남김
 *
 * 건강 등급별 담당 구루:
 * - A: 버핏(🦉) — 칭찬
 * - B: 린치(🐻) — 격려
 * - C: 달리오(🦌) — 주의
 * - D: 막스(🐢) — 경고
 * - F: 로저스(🐯) — 긴급
 *
 * 사용처:
 * - app/(tabs)/rebalance.tsx 분석 탭 최상단
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';

// =============================================================================
// 타입 정의
// =============================================================================

interface HospitalHeaderProps {
  /** 건강 등급 (A/B/C/D/F) */
  healthGrade?: string;
  /** 테마 색상 */
  colors: any;
  /** 로케일 (ko/en) */
  locale: string;
}

// =============================================================================
// 등급별 구루 코멘트 설정
// =============================================================================

interface GradeConfig {
  guruId: string;
  color: string;
  commentKo: string;
  commentEn: string;
}

const GRADE_CONFIGS: Record<string, GradeConfig> = {
  A: {
    guruId: 'buffett',
    color: '#4CAF50',
    commentKo: '아주 건강해! 이 상태를 유지하렴',
    commentEn: 'Very healthy! Keep it up',
  },
  B: {
    guruId: 'lynch',
    color: '#8BC34A',
    commentKo: '꽤 좋은 편이야. 조금만 더 다듬으면 완벽해',
    commentEn: 'Pretty good. A few tweaks and it\'s perfect',
  },
  C: {
    guruId: 'dalio',
    color: '#FFC107',
    commentKo: '주의가 필요해. 리밸런싱을 고려해봐',
    commentEn: 'Needs attention. Consider rebalancing',
  },
  D: {
    guruId: 'marks',
    color: '#FF9800',
    commentKo: '위험 신호야. 천천히 하나씩 고쳐나가자',
    commentEn: 'Warning signs. Let\'s fix things one by one',
  },
  F: {
    guruId: 'rogers',
    color: '#F44336',
    commentKo: '긴급 점검이 필요해! 지금 바로 시작하자',
    commentEn: 'Emergency check needed! Let\'s start now',
  },
};

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function HospitalHeader({
  healthGrade,
  colors,
  locale,
}: HospitalHeaderProps): React.ReactElement {
  const isKo = locale === 'ko';

  // 등급 설정 조회
  const gradeKey = healthGrade?.toUpperCase() ?? '';
  const gradeConfig = GRADE_CONFIGS[gradeKey] ?? null;

  // 구루 정보
  const guruConfig = gradeConfig
    ? GURU_CHARACTER_CONFIGS[gradeConfig.guruId]
    : null;
  const guruEmoji = guruConfig?.emoji ?? '';
  const guruName = guruConfig
    ? (isKo ? guruConfig.guruName : guruConfig.guruNameEn)
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
        {isKo ? '\uD83C\uDFE5 발른 건강검진센터' : '\uD83C\uDFE5 baln Health Center'}
      </Text>

      {/* 구루 코멘트 또는 대기 메시지 */}
      {gradeConfig ? (
        <Text
          style={[styles.commentText, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {guruEmoji} {guruName}: &ldquo;{isKo ? gradeConfig.commentKo : gradeConfig.commentEn}&rdquo;
        </Text>
      ) : (
        <Text style={[styles.waitingText, { color: colors.textTertiary }]}>
          {isKo
            ? '진단 결과를 기다리는 중...'
            : 'Waiting for diagnosis...'}
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
