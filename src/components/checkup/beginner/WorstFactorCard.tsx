/**
 * WorstFactorCard - 가장 취약한 요인 카드
 *
 * 건강 점수 요인 중 가장 낮은 점수를 쉬운 한국어로 보여줌.
 * 초보자가 "무엇을 가장 먼저 개선해야 하는지" 한눈에 파악.
 * Wave 4: 클릭 시 상세 설명 모달 표시 + 역사적 맥락 추가
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { FactorResult } from '../../../services/rebalanceScore';
import { Asset, AssetType } from '../../../types/asset';
import FactorExplanationModal from '../FactorExplanationModal';
import { getFactorType, FACTOR_EXPLANATIONS } from '../../../data/factorExplanations';
import { useTheme } from '../../../hooks/useTheme';
import type { ThemeColors } from '../../../styles/colors';

interface WorstFactorCardProps {
  factors: FactorResult[];
  allAssets?: Asset[];
}

const LABEL_MAP: Record<string, string> = {
  '배분 이탈도': '비중이 달라졌어요',
  '자산 집중도': '한 곳에 몰려있어요',
  '위험 집중도': '위험이 집중돼 있어요',
  '상관관계': '자산들이 같이 움직여요',
  '변동성': '가격 변동이 큰 편이에요',
  '하방 리스크': '손실 중인 자산이 있어요',
  '세금 효율': '절세 기회가 있어요',
  '레버리지 건전성': '대출 부담이 있어요',
  '철학 정합도': '투자 철학과 맞지 않아요',
};

function getStoryMessage(factor: FactorResult, allAssets?: Asset[]): string | null {
  if (!allAssets || allAssets.length === 0) return null;

  // 부동산(비유동)은 리밸런싱 대상이 아님 → 유동 자산만으로 분석
  const liquidAssets = allAssets.filter(a => a.assetType !== AssetType.ILLIQUID);
  if (liquidAssets.length === 0) return null;

  switch (factor.label) {
    case '배분 이탈도': {
      const liquidTotal = liquidAssets.reduce((s, x) => s + x.currentValue, 0);
      if (liquidTotal === 0) return null;
      const maxDrift = liquidAssets.reduce((worst, a) => {
        const actualPct = (a.currentValue / liquidTotal) * 100;
        const targetPct = a.targetAllocation || 0;
        const signedDrift = actualPct - targetPct; // 양수 = 목표보다 많음, 음수 = 적음
        return Math.abs(signedDrift) > Math.abs(worst.signedDrift)
          ? { name: a.name, signedDrift }
          : worst;
      }, { name: '', signedDrift: 0 });
      if (maxDrift.name && Math.abs(maxDrift.signedDrift) > 1) {
        const direction = maxDrift.signedDrift > 0 ? '많아요' : '적어요';
        return `${maxDrift.name}이 목표보다 ${Math.round(Math.abs(maxDrift.signedDrift))}% ${direction}`;
      }
      return null;
    }
    case '자산 집중도': {
      const total = liquidAssets.reduce((s, a) => s + a.currentValue, 0);
      if (total === 0) return null;
      const top = liquidAssets.reduce((max, a) => a.currentValue > max.currentValue ? a : max, liquidAssets[0]);
      const pct = Math.round((top.currentValue / total) * 100);
      return `전체 유동자산의 ${pct}%가 ${top.name}에 몰려있어요`;
    }
    case '상관관계':
      return '보유 종목들이 비슷하게 움직이고 있어요';
    case '변동성':
      return '최근 가격 변동이 평소보다 큰 편이에요';
    case '하방 리스크': {
      const lossCount = liquidAssets.filter(a => {
        const avg = a.avgPrice ?? 0;
        const cur = a.currentPrice ?? 0;
        return avg > 0 && cur > 0 && cur < avg;
      }).length;
      return lossCount > 0 ? `${lossCount}개 종목이 매입가 아래에 있어요` : null;
    }
    case '철학 정합도':
      return '현재 보유 종목 스타일과 선택 철학이 일치하지 않습니다. 분석 탭에서 구루 설정을 확인해보세요.';
    default:
      return null;
  }
}

/**
 * 점수에 따른 색상을 테마 토큰으로 반환
 */
function getScoreColor(score: number, colors: ThemeColors): string {
  if (score > 70) return colors.primaryDark ?? colors.primary;
  if (score >= 40) return colors.warning;
  return colors.error;
}

export default function WorstFactorCard({ factors, allAssets }: WorstFactorCardProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!factors || factors.length === 0) return null;

  const worst = factors.reduce((prev, curr) =>
    curr.score < prev.score ? curr : prev,
  );

  const simplifiedLabel = LABEL_MAP[worst.label] || worst.label;
  const barColor = getScoreColor(worst.score, colors);
  const factorType = getFactorType(worst.label);
  const historicalContext = factorType ? FACTOR_EXPLANATIONS[factorType].historicalContext : null;

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
      >
      <Text style={styles.cardTitle}>주의할 점</Text>

      <View style={styles.factorRow}>
        <Text style={styles.icon}>{worst.icon}</Text>
        <View style={styles.factorContent}>
          <Text style={styles.factorLabel}>{simplifiedLabel}</Text>

          {/* Score bar */}
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(worst.score, 3)}%`,
                  backgroundColor: barColor,
                },
              ]}
            />
          </View>

          <Text style={[styles.scoreText, { color: barColor }]}>
            {worst.score}점
          </Text>
        </View>
      </View>

      <Text style={styles.comment}>{getStoryMessage(worst, allAssets) ?? worst.comment}</Text>

      {/* 조정 효과 힌트 (배분 이탈도일 때만) */}
      {worst.label === '배분 이탈도' && worst.score < 70 && (
        <View style={styles.improveHint}>
          <Text style={styles.improveIcon}>✨</Text>
          <Text style={styles.improveText}>
            분석 탭에서 조정하면 건강 점수가 올라가요
          </Text>
        </View>
      )}

      {/* 역사적 맥락 */}
      {historicalContext && (
        <View style={styles.contextContainer}>
          <Text style={styles.contextIcon}>📚</Text>
          <Text style={styles.contextText}>{historicalContext}</Text>
        </View>
      )}

      {/* 탭해서 자세히 보기 힌트 */}
      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>탭해서 자세히 알아보기</Text>
        <Text style={styles.tapHintIcon}>→</Text>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.textPrimary,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  icon: {
    fontSize: 29,
    marginTop: 2,
  },
  factorContent: {
    flex: 1,
  },
  factorLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.textPrimary,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: colors.borderLight,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  comment: {
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 12,
    color: colors.textSecondary,
  },
  improveHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: `${colors.primary}15`,
  },
  improveIcon: {
    fontSize: 15,
  },
  improveText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  contextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    backgroundColor: `${colors.warning}20`,
  },
  contextIcon: {
    fontSize: 17,
    marginTop: 2,
  },
  contextText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tapHintText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryDark ?? colors.primary,
  },
  tapHintIcon: {
    fontSize: 15,
    color: colors.primaryDark ?? colors.primary,
  },
});
