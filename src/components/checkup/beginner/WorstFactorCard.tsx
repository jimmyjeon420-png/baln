/**
 * WorstFactorCard - 가장 취약한 요인 카드
 *
 * 건강 점수 요인 중 가장 낮은 점수를 쉬운 한국어로 보여줌.
 * 초보자가 "무엇을 가장 먼저 개선해야 하는지" 한눈에 파악.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { FactorResult } from '../../../services/rebalanceScore';

interface WorstFactorCardProps {
  factors: FactorResult[];
}

const LABEL_MAP: Record<string, string> = {
  '배분 이탈도': '계획이랑 달라졌어요',
  '자산 집중도': '한 곳에 몰려있어요',
  '상관관계': '자산들이 같이 움직여요',
  '변동성': '가격 변동이 큰 편이에요',
  '하방 리스크': '손실 중인 자산이 있어요',
  '세금 효율': '절세 기회가 있어요',
};

function getScoreColor(score: number): string {
  if (score > 70) return '#4CAF50';
  if (score >= 40) return '#FFB74D';
  return '#CF6679';
}

export default function WorstFactorCard({ factors }: WorstFactorCardProps) {
  if (!factors || factors.length === 0) return null;

  const worst = factors.reduce((prev, curr) =>
    curr.score < prev.score ? curr : prev,
  );

  const simplifiedLabel = LABEL_MAP[worst.label] || worst.label;
  const barColor = getScoreColor(worst.score);

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>주의할 점</Text>

      <View style={s.factorRow}>
        <Text style={s.icon}>{worst.icon}</Text>
        <View style={s.factorContent}>
          <Text style={s.factorLabel}>{simplifiedLabel}</Text>

          {/* Score bar */}
          <View style={s.barTrack}>
            <View
              style={[
                s.barFill,
                {
                  width: `${Math.max(worst.score, 3)}%`,
                  backgroundColor: barColor,
                },
              ]}
            />
          </View>

          <Text style={[s.scoreText, { color: barColor }]}>
            {worst.score}점
          </Text>
        </View>
      </View>

      <Text style={s.comment}>{worst.comment}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 24,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  icon: {
    fontSize: 28,
    marginTop: 2,
  },
  factorContent: {
    flex: 1,
  },
  factorLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  comment: {
    fontSize: 15,
    color: '#B0B0B0',
    lineHeight: 22,
  },
});
