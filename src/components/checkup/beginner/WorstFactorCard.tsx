/**
 * WorstFactorCard - 가장 취약한 요인 카드
 *
 * 건강 점수 요인 중 가장 낮은 점수를 쉬운 한국어로 보여줌.
 * 초보자가 "무엇을 가장 먼저 개선해야 하는지" 한눈에 파악.
 * Wave 4: 클릭 시 상세 설명 모달 표시 + 역사적 맥락 추가
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { FactorResult } from '../../../services/rebalanceScore';
import type { Asset } from '../../../types/asset';
import FactorExplanationModal from '../FactorExplanationModal';
import { getFactorType, FACTOR_EXPLANATIONS } from '../../../data/factorExplanations';

interface WorstFactorCardProps {
  factors: FactorResult[];
  allAssets?: Asset[];
}

const LABEL_MAP: Record<string, string> = {
  '배분 이탈도': '계획이랑 달라졌어요',
  '자산 집중도': '한 곳에 몰려있어요',
  '상관관계': '자산들이 같이 움직여요',
  '변동성': '가격 변동이 큰 편이에요',
  '하방 리스크': '손실 중인 자산이 있어요',
  '세금 효율': '절세 기회가 있어요',
};

function getStoryMessage(factor: FactorResult, allAssets?: Asset[]): string | null {
  if (!allAssets || allAssets.length === 0) return null;

  switch (factor.label) {
    case '배분 이탈도': {
      const maxDrift = allAssets.reduce((worst, a) => {
        const drift = Math.abs((a.currentValue / allAssets.reduce((s, x) => s + x.currentValue, 0)) * 100 - a.targetAllocation);
        return drift > worst.drift ? { name: a.name, drift } : worst;
      }, { name: '', drift: 0 });
      if (maxDrift.name) return `${maxDrift.name}이(가) 목표 비중보다 ${Math.round(maxDrift.drift)}%p 차이나요`;
      return null;
    }
    case '자산 집중도': {
      const total = allAssets.reduce((s, a) => s + a.currentValue, 0);
      if (total === 0) return null;
      const top = allAssets.reduce((max, a) => a.currentValue > max.currentValue ? a : max, allAssets[0]);
      const pct = Math.round((top.currentValue / total) * 100);
      return `전체 자산의 ${pct}%가 ${top.name}에 몰려있어요`;
    }
    case '상관관계':
      return '보유 종목들이 비슷하게 움직이고 있어요';
    case '변동성':
      return '최근 가격 변동이 평소보다 큰 편이에요';
    case '하방 리스크': {
      const lossCount = allAssets.filter(a => {
        const avg = a.avgPrice ?? 0;
        const cur = a.currentPrice ?? 0;
        return avg > 0 && cur > 0 && cur < avg;
      }).length;
      return lossCount > 0 ? `${lossCount}개 종목이 매입가 아래에 있어요` : null;
    }
    default:
      return null;
  }
}

function getScoreColor(score: number): string {
  if (score > 70) return '#4CAF50';
  if (score >= 40) return '#FFB74D';
  return '#CF6679';
}

export default function WorstFactorCard({ factors, allAssets }: WorstFactorCardProps) {
  const [modalVisible, setModalVisible] = useState(false);

  if (!factors || factors.length === 0) return null;

  const worst = factors.reduce((prev, curr) =>
    curr.score < prev.score ? curr : prev,
  );

  const simplifiedLabel = LABEL_MAP[worst.label] || worst.label;
  const barColor = getScoreColor(worst.score);
  const factorType = getFactorType(worst.label);
  const historicalContext = factorType ? FACTOR_EXPLANATIONS[factorType].historicalContext : null;

  return (
    <>
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
      >
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

      <Text style={s.comment}>{getStoryMessage(worst, allAssets) ?? worst.comment}</Text>

      {/* 역사적 맥락 */}
      {historicalContext && (
        <View style={s.contextContainer}>
          <Text style={s.contextIcon}>📚</Text>
          <Text style={s.contextText}>{historicalContext}</Text>
        </View>
      )}

      {/* 탭해서 자세히 보기 힌트 */}
      <View style={s.tapHint}>
        <Text style={s.tapHintText}>탭해서 자세히 알아보기</Text>
        <Text style={s.tapHintIcon}>→</Text>
      </View>
    </TouchableOpacity>

    {/* 설명 모달 */}
    <FactorExplanationModal
      visible={modalVisible}
      factorType={factorType}
      onClose={() => setModalVisible(false)}
    />
  </>
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
    marginBottom: 12,
  },
  contextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,183,77,0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  contextIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  contextText: {
    flex: 1,
    fontSize: 14,
    color: '#FFB74D',
    lineHeight: 20,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  tapHintText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  tapHintIcon: {
    fontSize: 14,
    color: '#4CAF50',
  },
});
