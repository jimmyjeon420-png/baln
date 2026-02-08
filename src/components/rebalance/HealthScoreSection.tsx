/**
 * 건강 점수 섹션 — 6팩터 종합 진단 (처방전 전용)
 *
 * 역할: 히어로 바로 아래에서 포트폴리오 전체 건강 상태를 요약 → 상세 펼침
 * 데이터: rebalanceScore.ts의 calculateHealthScore (순수 함수, AI 미사용)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HealthScoreDetail from '../HealthScoreDetail';
import type { HealthScoreResult } from '../../services/rebalanceScore';

interface HealthScoreSectionProps {
  healthScore: HealthScoreResult;
}

export default function HealthScoreSection({ healthScore }: HealthScoreSectionProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <View style={s.card}>
      {/* 헤더: 건강 점수 + 등급 뱃지 + 상세 토글 */}
      <TouchableOpacity
        style={s.headerRow}
        onPress={() => setShowDetail(!showDetail)}
        activeOpacity={0.7}
      >
        <View style={s.headerLeft}>
          <View style={s.scoreCircle}>
            <Text style={[s.scoreNumber, { color: healthScore.gradeColor }]}>
              {healthScore.totalScore}
            </Text>
          </View>
          <View>
            <View style={s.titleRow}>
              <Text style={s.cardLabel}>건강 점수</Text>
              <View style={[s.gradeBadge, { backgroundColor: healthScore.gradeBgColor }]}>
                <Text style={[s.gradeText, { color: healthScore.gradeColor }]}>
                  {healthScore.grade} {healthScore.gradeLabel}
                </Text>
              </View>
            </View>
            <Text style={s.cardLabelEn}>Health Score</Text>
          </View>
        </View>
        <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color="#888" />
      </TouchableOpacity>

      {/* 한줄 요약 */}
      <Text style={[s.summary, { color: healthScore.gradeColor }]}>
        {healthScore.summary}
      </Text>

      {/* 6팩터 미니 바 (접힌 상태) */}
      {!showDetail && (
        <View style={s.miniFactors}>
          {healthScore.factors.map((factor, idx) => {
            const barColor = factor.score >= 70 ? '#4CAF50' : factor.score >= 40 ? '#FFC107' : '#CF6679';
            return (
              <View key={idx} style={s.miniFactor}>
                <Text style={s.miniIcon}>{factor.icon}</Text>
                <View style={s.miniBarBg}>
                  <View style={[s.miniBarFill, { width: `${factor.score}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[s.miniScore, { color: barColor }]}>{factor.score}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* 상세 펼침 — 기존 HealthScoreDetail 컴포넌트 재사용 */}
      {showDetail && (
        <View style={s.detailContainer}>
          <HealthScoreDetail result={healthScore} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cardLabelEn: { fontSize: 10, color: '#555', marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summary: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 12,
  },
  // 미니 팩터 바 (접힌 상태)
  miniFactors: {
    gap: 6,
  },
  miniFactor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniIcon: {
    fontSize: 12,
    width: 18,
    textAlign: 'center',
  },
  miniBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#222',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: 4,
    borderRadius: 2,
  },
  miniScore: {
    fontSize: 11,
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },
  detailContainer: {
    marginTop: 4,
  },
});
