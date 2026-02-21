/**
 * HealthScoreBreakdown.tsx - 건강 점수 5카테고리 상세 보기
 *
 * 역할: "포트폴리오 건강검진 결과지" — 5개 카테고리별 점수 + 개선 가이드
 *
 * 5대 건강 카테고리:
 * 1. 분산도 (Diversification): 종목/섹터/지역 분산
 * 2. 리밸런싱 적시성 (Timeliness): 목표 대비 편차
 * 3. 비용 효율 (Cost): 수수료, 세금 효율
 * 4. 위험 관리 (Risk): 변동성, 최대 낙폭
 * 5. 성장성 (Growth): 기대 수익률, 배당
 *
 * 사용처: 분석 탭 > 건강 점수 터치 → 이 컴포넌트 표시
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ============================================================================
// 타입 정의
// ============================================================================

export interface CategoryScore {
  name: string;
  nameEn: string;
  score: number;       // 0~100
  grade: string;       // A+, A, B+, B, C, D
  emoji: string;
  description: string; // 현재 상태 설명
  suggestion: string;  // 개선 제안
}

interface HealthScoreBreakdownProps {
  visible: boolean;
  onClose: () => void;
  overallScore: number;       // 총점 (0~100)
  overallGrade: string;       // A+, A, B+ 등
  categories: CategoryScore[];
  lastUpdated?: string;       // ISO 날짜
}

// ============================================================================
// 유틸리티
// ============================================================================

function getGradeColor(grade: string, colors: any): string {
  if (grade.startsWith('A')) return colors.primary;
  if (grade.startsWith('B')) return colors.info;
  if (grade.startsWith('C')) return colors.warning;
  return colors.error;
}

function getScoreBarWidth(score: number): `${number}%` {
  return `${Math.min(100, Math.max(0, score))}%`;
}

// ============================================================================
// 컴포넌트
// ============================================================================

export default function HealthScoreBreakdown({
  visible,
  onClose,
  overallScore,
  overallGrade,
  categories,
  lastUpdated,
}: HealthScoreBreakdownProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* 헤더 */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>건강 점수 상세</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* 종합 점수 */}
          <View style={[styles.overallCard, { borderColor: getGradeColor(overallGrade, colors) + '33' }]}>
            <View style={[styles.overallGradeBadge, { backgroundColor: getGradeColor(overallGrade, colors) + '1A' }]}>
              <Text style={[styles.overallGradeText, { color: getGradeColor(overallGrade, colors) }]}>
                {overallGrade}
              </Text>
            </View>
            <Text style={[styles.overallScore, { color: colors.textPrimary }]}>
              {overallScore}
              <Text style={[styles.overallScoreUnit, { color: colors.textTertiary }]}>/100</Text>
            </Text>
            <Text style={[styles.overallLabel, { color: colors.textSecondary }]}>
              종합 건강 점수
            </Text>
            {lastUpdated && (
              <Text style={[styles.updatedAt, { color: colors.textTertiary }]}>
                {lastUpdated.split('T')[0]} 기준
              </Text>
            )}
          </View>

          {/* 카테고리별 점수 */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            카테고리별 분석
          </Text>

          {categories.map((cat, index) => (
            <View
              key={index}
              style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {/* 카테고리 헤더 */}
              <View style={styles.catHeader}>
                <View style={styles.catTitleRow}>
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <View>
                    <Text style={[styles.catName, { color: colors.textPrimary }]}>{cat.name}</Text>
                    <Text style={[styles.catNameEn, { color: colors.textTertiary }]}>{cat.nameEn}</Text>
                  </View>
                </View>
                <View style={[styles.catGradeBadge, { backgroundColor: getGradeColor(cat.grade, colors) + '1A' }]}>
                  <Text style={[styles.catGradeText, { color: getGradeColor(cat.grade, colors) }]}>
                    {cat.grade}
                  </Text>
                </View>
              </View>

              {/* 점수 바 */}
              <View style={[styles.scoreBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.scoreBarFill,
                    {
                      width: getScoreBarWidth(cat.score),
                      backgroundColor: getGradeColor(cat.grade, colors),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.scoreText, { color: colors.textSecondary }]}>
                {cat.score}/100
              </Text>

              {/* 설명 */}
              <Text style={[styles.catDesc, { color: colors.textSecondary }]}>
                {cat.description}
              </Text>

              {/* 개선 제안 */}
              {cat.score < 80 && (
                <View style={[styles.suggestion, { backgroundColor: colors.primary + '0A', borderColor: colors.primary + '1A' }]}>
                  <Ionicons name="bulb-outline" size={14} color={colors.primary} />
                  <Text style={[styles.suggestionText, { color: colors.primary }]}>
                    {cat.suggestion}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {/* 면책 */}
          <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
            건강 점수는 AI가 포트폴리오 구조를 분석한 결과이며, 투자 수익을 보장하지 않습니다.
            투자 결정은 본인의 판단과 전문가 상담에 따라 이루어져야 합니다.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },

  // 종합 점수
  overallCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  overallGradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  overallGradeText: {
    fontSize: 23,
    fontWeight: '900',
  },
  overallScore: {
    fontSize: 48,
    fontWeight: '900',
  },
  overallScoreUnit: {
    fontSize: 19,
    fontWeight: '400',
  },
  overallLabel: {
    fontSize: 15,
    marginTop: 4,
  },
  updatedAt: {
    fontSize: 12,
    marginTop: 4,
  },

  // 섹션 제목
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },

  // 카테고리 카드
  categoryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catEmoji: {
    fontSize: 25,
  },
  catName: {
    fontSize: 16,
    fontWeight: '600',
  },
  catNameEn: {
    fontSize: 12,
    marginTop: 1,
  },
  catGradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  catGradeText: {
    fontSize: 15,
    fontWeight: '800',
  },

  // 점수 바
  scoreBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreText: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 8,
  },

  // 설명
  catDesc: {
    fontSize: 14,
    lineHeight: 19,
  },

  // 개선 제안
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // 면책
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 12,
  },
});
