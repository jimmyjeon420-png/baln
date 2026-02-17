/**
 * 건강 점수 섹션 — 6팩터 종합 진단 (처방전 전용)
 *
 * 역할: 히어로 바로 아래에서 포트폴리오 전체 건강 상태를 요약 → 상세 펼침
 * 데이터: rebalanceScore.ts의 calculateHealthScore (순수 함수, AI 미사용)
 *
 * UX 개선 (2026-02-09):
 * - 팩터별 툴팁 (정보 아이콘 터치 시 설명)
 * - 취약 팩터 개선 제안 (40점 미만)
 * - 등급별 해석 강화
 * - 햅틱 피드백 추가
 *
 * UX 개선 (2026-02-10):
 * - "왜 이 점수인가" 요약 (가장 취약한 팩터 기반 1-2줄 설명)
 * - "지금 할 수 있는 것" 액션 가이드 (등급별 맞춤 조언)
 * - COLORS.textSecondary 기반 설명 텍스트 레이어
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HealthScoreDetail from '../HealthScoreDetail';
import type { HealthScoreResult, FactorResult } from '../../services/rebalanceScore';
import { useTheme } from '../../hooks/useTheme';
import { saveHealthScore, loadPreviousHealthScore } from '../../utils/storage';

interface HealthScoreSectionProps {
  healthScore: HealthScoreResult;
  onScoreImproved?: (improvement: number) => void;
}

/** 팩터별 설명 텍스트 (툴팁용) */
const FACTOR_DESCRIPTIONS: Record<string, string> = {
  '배분 이탈도': '처음 목표로 세운 비중과 지금 실제 비중의 차이예요.\n\n주식이 많이 오르면 그 비중이 자연스럽게 커지게 돼요. 이걸 원래 계획으로 되돌리는 게 리밸런싱이에요.',
  '자산 집중도': '특정 자산에 쏠림 정도입니다. 분산이 잘 되어 있을수록 높은 점수를 받습니다.\n\n집중도가 낮으면 한 종목의 폭락에도 포트폴리오 전체가 안정적이에요.',
  '상관관계': '자산 간 움직임의 유사도입니다. 낮을수록 분산 효과가 큽니다.\n\n낮은 상관관계는 한 자산이 떨어질 때 다른 자산이 오를 수 있다는 뜻이에요.',
  '변동성': '자산 가치의 변동 폭입니다. 낮을수록 안정적입니다.\n\n변동성이 낮으면 심리적으로 편안하게 투자를 지속할 수 있어요.',
  '하방 리스크': '손실 가능성입니다. 낮을수록 안전합니다.\n\n현재 손실 중인 종목이 많으면 하방 리스크 점수가 낮아져요.',
  '세금 효율': '세금 최적화 정도입니다. 높을수록 절세 효과가 큽니다.\n\n5% 이상 손실 종목이 있으면 절세 매도(TLH) 기회가 있다는 신호예요.',
};

/** 팩터별 개선 제안 (40점 미만 시) */
const FACTOR_SUGGESTIONS: Record<string, string> = {
  '배분 이탈도': '일부 종목의 비중이 많이 달라졌어요.\n\n아래 "오늘의 액션"에서 어떤 종목을 얼마나 조정하면 좋은지 알려드려요.',
  '자산 집중도': '특정 자산에 쏠려 있습니다.\n\n분산 투자를 고려해보세요. 채권이나 현금 비중을 늘리면 안정성이 높아져요.',
  '상관관계': '자산들이 비슷하게 움직입니다.\n\n상관관계가 낮은 자산(채권, 현금, 비트코인 등)을 추가하면 분산 효과가 커져요.',
  '변동성': '포트폴리오 변동성이 높습니다.\n\n안정적인 자산(채권, 현금)의 비중을 늘리면 변동폭을 줄일 수 있어요.',
  '하방 리스크': '손실 중인 종목이 많습니다.\n\n손절 또는 평단 낮추기를 고려해보세요. 아래 AI 분석을 확인해보세요.',
  '세금 효율': '절세 기회를 활용하지 못하고 있어요.\n\n5% 이상 손실 종목을 매도 후 유사 종목으로 갈아타면 세금을 절약할 수 있어요.',
};

/** 등급별 상세 해석 */
const GRADE_INTERPRETATIONS: Record<string, string> = {
  'S': '완벽한 포트폴리오입니다!\n\n현재 상태를 유지하시면 장기적으로 안정적인 수익을 기대할 수 있어요.',
  'A': '우수한 포트폴리오입니다.\n\n소폭 조정만 하면 더욱 최적화할 수 있어요.',
  'B': '일부 개선이 필요합니다.\n\n아래 취약한 팩터를 중심으로 조정해보세요.',
  'C': '리밸런싱을 권장합니다.\n\n현재 상태로는 위험이 높을 수 있어요. 오늘의 액션을 꼭 확인해주세요.',
  'D': '긴급 조정이 필요합니다!\n\n포트폴리오가 매우 불안정한 상태예요. 즉시 리밸런싱을 실행해주세요.',
};

/** 등급별 아이콘 */
const GRADE_ICONS: Record<string, string> = {
  'S': '🏆',
  'A': '✅',
  'B': '⚠️',
  'C': '🔴',
  'D': '🚨',
};

/**
 * "왜 이 점수인가" 요약 생성
 *
 * 가장 취약한 팩터(들)를 기반으로 사용자가 이해할 수 있는 1-2줄의 이유를 만든다.
 * 예: "자산 집중도와 변동성이 낮아서 전체 점수가 내려갔어요."
 * 예: "모든 팩터가 양호합니다. 현재 전략을 유지하세요."
 */
// 팩터 이름 → 일반인 친화적 표현
const FACTOR_PLAIN: Record<string, string> = {
  '배분 이탈도': '종목 비중',
  '위험 집중도': '집중 위험',
  '상관관계': '분산 효과',
  '변동성': '가격 변동',
  '하방 리스크': '손실 위험',
  '세금 효율': '절세 기회',
};

function generateWhyExplanation(healthScore: HealthScoreResult): string {
  const { factors, totalScore } = healthScore;

  // 모든 팩터가 70점 이상이면 → 긍정 메시지
  const weakFactors = factors.filter((f: FactorResult) => f.score < 70);
  if (weakFactors.length === 0) {
    return '모든 지표가 고르게 양호해요. 현재 투자 전략이 잘 작동하고 있어요.';
  }

  // 가장 취약한 순으로 정렬 (점수 낮은 순)
  const sorted = [...weakFactors].sort((a, b) => a.score - b.score);

  // 가장 낮은 팩터 (친화적 이름으로)
  const worst = sorted[0];
  const worstName = FACTOR_PLAIN[worst.label] || worst.label;

  if (sorted.length === 1) {
    return `${worstName}이 달라져서 전체 점수가 낮아졌어요. 분석 탭에서 조정할 수 있어요.`;
  }

  // 2개 이상 취약
  const secondWorst = sorted[1];
  const secondName = FACTOR_PLAIN[secondWorst.label] || secondWorst.label;
  if (sorted.length === 2) {
    return `${worstName}과 ${secondName}을 조정하면 점수가 올라가요.`;
  }

  // 3개 이상 취약
  return `${worstName}을 포함해 ${sorted.length}개 항목을 조정하면 ${Math.min(totalScore + 15, 100)}점까지 올릴 수 있어요.`;
}

/**
 * "지금 할 수 있는 것" 액션 가이드 생성
 *
 * 등급 + 가장 취약한 팩터에 맞는 구체적 행동을 제안한다.
 */
function generateActionGuidance(healthScore: HealthScoreResult): string | null {
  const { grade, factors } = healthScore;

  // S등급이면 특별한 액션 불필요
  if (grade === 'S') return null;

  // 가장 취약한 팩터를 기반으로 구체적 액션 제안
  const sorted = [...factors].sort((a, b) => a.score - b.score);
  const worst = sorted[0];

  const ACTION_MAP: Record<string, string> = {
    '배분 이탈도': '아래 "오늘의 액션"에서 매매 제안을 확인하고, 목표 비율에 맞춰 조정해보세요.',
    '자산 집중도': '가장 비중이 높은 자산을 일부 줄이고, 다른 자산군으로 분산하는 것을 고려해보세요.',
    '상관관계': '현재 보유 자산과 움직임이 다른 자산(채권, 원자재 등)을 추가해보세요.',
    '변동성': '변동성이 큰 종목의 비중을 줄이거나, 채권/현금 비중을 늘려 안정성을 높여보세요.',
    '하방 리스크': '손실 중인 종목의 손절 또는 추가 매수 여부를 검토해보세요.',
    '세금 효율': '손실 종목 매도 후 유사 종목 매수(절세 매도)를 검토해보세요.',
  };

  return ACTION_MAP[worst.label] || '아래 상세 내역을 펼쳐서 각 팩터별 개선점을 확인해보세요.';
}

export default function HealthScoreSection({ healthScore, onScoreImproved }: HealthScoreSectionProps) {
  const { colors, shadows } = useTheme();
  const [showDetail, setShowDetail] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipContent, setTooltipContent] = useState({ title: '', description: '' });
  const [improveToast, setImproveToast] = useState<{ show: boolean; improvement: number; credits: number }>({ show: false, improvement: 0, credits: 0 });
  const improveOpacity = useRef(new Animated.Value(0)).current;
  const scoreLoadedRef = useRef(false);

  // "왜 이 점수인가" + "지금 할 수 있는 것" 계산
  const whyExplanation = useMemo(() => generateWhyExplanation(healthScore), [healthScore]);
  const actionGuidance = useMemo(() => generateActionGuidance(healthScore), [healthScore]);

  // 건강 점수 개선 감지 (최초 로드 시에만 실행)
  useEffect(() => {
    const checkScoreImprovement = async () => {
      if (scoreLoadedRef.current) return;
      scoreLoadedRef.current = true;

      const previousScore = await loadPreviousHealthScore();
      const currentScore = healthScore.totalScore;

      // 이전 점수가 있고 현재 점수가 10점 이상 올랐으면
      if (previousScore !== null && currentScore - previousScore >= 10) {
        const improvement = currentScore - previousScore;
        const credits = 1; // 1C = ₩100, 건강 점수 개선 보상

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
          // 햅틱 미지원 무시
        }

        setImproveToast({ show: true, improvement, credits });

        // 페이드인 → 4초 후 페이드아웃
        Animated.sequence([
          Animated.timing(improveOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(4000),
          Animated.timing(improveOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setImproveToast({ show: false, improvement: 0, credits: 0 }));

        // 콜백 호출
        if (onScoreImproved) {
          onScoreImproved(improvement);
        }
      }

      // 현재 점수 저장 (다음 비교를 위해)
      await saveHealthScore(currentScore);
    };

    checkScoreImprovement();
  }, [healthScore]);

  /** 툴팁 표시 함수 */
  const showTooltip = (factorLabel: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // 햅틱 미지원 디바이스 무시
    }
    setTooltipContent({
      title: factorLabel,
      description: FACTOR_DESCRIPTIONS[factorLabel] || '설명이 없습니다.',
    });
    setTooltipVisible(true);
  };

  /** 팩터별 개선 제안 렌더링 (40점 미만 시) */
  const renderSuggestion = (factor: { label: string; score: number }) => {
    if (factor.score >= 40) return null;
    return (
      <Text style={[s.suggestion, { color: colors.error, backgroundColor: colors.error + '1A', borderLeftColor: colors.error }]}>
        {FACTOR_SUGGESTIONS[factor.label] || ''}
      </Text>
    );
  };

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 건강 점수 개선 토스트 */}
      {improveToast.show && (
        <Animated.View style={[s.improveToast, { opacity: improveOpacity, backgroundColor: colors.premium.gold + '26', borderColor: colors.premium.gold + '4D' }]}>
          <Ionicons name="sparkles" size={20} color={colors.premium.gold} />
          <View style={s.improveToastContent}>
            <Text style={[s.improveToastTitle, { color: colors.premium.gold }]}>건강 점수가 {improveToast.improvement}점 올랐어요!</Text>
            <Text style={[s.improveToastSubtitle, { color: colors.premium.gold + 'CC' }]}>보상으로 AI 분석 1회 무료 (1C 적립)</Text>
          </View>
        </Animated.View>
      )}

      {/* 헤더: 건강 점수 + 등급 뱃지 + 상세 토글 */}
      <TouchableOpacity
        style={s.headerRow}
        onPress={() => setShowDetail(!showDetail)}
        activeOpacity={0.7}
      >
        <View style={s.headerLeft}>
          <View style={[s.scoreCircle, { backgroundColor: colors.border }]}>
            <Text style={[s.scoreNumber, { color: healthScore.gradeColor }]}>
              {healthScore.totalScore}
            </Text>
          </View>
          <View>
            <View style={s.titleRow}>
              <Text style={[s.cardLabel, { color: colors.textPrimary }]}>건강 점수</Text>
              <View style={[s.gradeBadge, { backgroundColor: healthScore.gradeBgColor }]}>
                <Text style={[s.gradeText, { color: healthScore.gradeColor }]}>
                  {healthScore.grade} {healthScore.gradeLabel}
                </Text>
              </View>
            </View>
            <Text style={[s.cardLabelEn, { color: colors.textSecondary }]}>Health Score</Text>
          </View>
        </View>
        <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* 등급별 상세 해석 */}
      <Text style={[s.summary, { color: healthScore.gradeColor }]}>
        {GRADE_ICONS[healthScore.grade]} {GRADE_INTERPRETATIONS[healthScore.grade]}
      </Text>

      {/* [NEW] 역사적 맥락 비교 — 달리오 철학: "2008년 금융위기 때는 30점이었어요" */}
      <View style={[s.historicalContext, { backgroundColor: colors.surfaceElevated }]}>
        <View style={s.historicalRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={[s.historicalLabel, { color: colors.textSecondary }]}>역사적 비교</Text>
        </View>
        <View style={s.historicalComparison}>
          <Text style={[s.historicalText, { color: colors.textSecondary }]}>
            📊 2008년 금융위기: 평균 35점
          </Text>
          <Text style={[s.historicalText, { color: colors.textSecondary }]}>
            📊 2020년 코로나 팬데믹: 평균 42점
          </Text>
          <Text style={[s.currentComparison, { color: healthScore.gradeColor }]}>
            → 현재 당신의 점수는 {healthScore.totalScore}점입니다
          </Text>
          <Text style={[s.historicalNote, { color: colors.textSecondary }]}>
            위기 속에서도 투자자들이 견디어낸 점수들입니다. 안심하세요.
          </Text>
        </View>
      </View>

      {/* [NEW] "왜 이 점수인가" 요약 — 어떤 팩터가 점수를 끌어내렸는지 설명 */}
      <View style={[s.whySection, { backgroundColor: colors.surfaceElevated }]}>
        <View style={s.whyRow}>
          <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
          <Text style={[s.whyLabel, { color: colors.textSecondary }]}>왜 이 점수인가요?</Text>
        </View>
        <Text style={[s.whyText, { color: colors.textSecondary }]}>{whyExplanation}</Text>
      </View>

      {/* [NEW] "지금 할 수 있는 것" 액션 가이드 — S등급이면 표시 안 함 */}
      {actionGuidance && (
        <View style={[s.actionGuideSection, { backgroundColor: colors.success + '1A', borderLeftColor: colors.success + '4D' }]}>
          <View style={s.actionGuideRow}>
            <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.success} />
            <Text style={[s.actionGuideLabel, { color: colors.success }]}>지금 할 수 있는 것</Text>
          </View>
          <Text style={[s.actionGuideText, { color: colors.textSecondary }]}>{actionGuidance}</Text>
        </View>
      )}

      {/* 6팩터 미니 바 (접힌 상태) — 툴팁 추가 */}
      {!showDetail && (
        <View style={s.miniFactors}>
          {healthScore.factors.map((factor, idx) => {
            const barColor = factor.score >= 70 ? colors.success : factor.score >= 40 ? colors.warning : colors.error;
            return (
              <View key={idx} style={s.miniFactor}>
                <Text style={s.miniIcon}>{factor.icon}</Text>
                <View style={[s.miniBarBg, { backgroundColor: colors.surfaceElevated }]}>
                  <View style={[s.miniBarFill, { width: `${factor.score}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[s.miniScore, { color: barColor }]}>{factor.score}</Text>

                {/* 툴팁 아이콘 */}
                <TouchableOpacity
                  onPress={() => showTooltip(factor.label)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={s.infoIcon}
                >
                  <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* 상세 펼침 — 기존 HealthScoreDetail 컴포넌트 재사용 + 개선 제안 추가 */}
      {showDetail && (
        <View style={s.detailContainer}>
          <HealthScoreDetail result={healthScore} />

          {/* 팩터별 개선 제안 (40점 미만) */}
          {healthScore.factors.some(f => f.score < 40) && (
            <View style={[s.suggestionsSection, { borderTopColor: colors.border }]}>
              <Text style={[s.suggestionsTitle, { color: colors.warning }]}>개선 제안</Text>
              {healthScore.factors.map((factor, idx) => (
                <View key={idx}>
                  {renderSuggestion(factor)}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 툴팁 모달 */}
      <Modal
        visible={tooltipVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTooltipVisible(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setTooltipVisible(false)}
        >
          <View style={[s.tooltipModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.tooltipHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.tooltipTitle, { color: colors.textPrimary }]}>{tooltipContent.title}</Text>
              <TouchableOpacity onPress={() => setTooltipVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.tooltipScroll}>
              <Text style={[s.tooltipDescription, { color: colors.textTertiary }]}>{tooltipContent.description}</Text>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  // card: {
  //   backgroundColor: '#141414',
  //   marginHorizontal: 16,
  //   marginBottom: 12,
  //   borderRadius: 16,
  //   padding: 18,
  //   borderWidth: 1,
  //   borderColor: '#1E1E1E',
  // },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  // 건강 점수 개선 토스트
  improveToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  improveToastContent: {
    flex: 1,
  },
  improveToastTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  improveToastSubtitle: {
    fontSize: 11,
    fontWeight: '500',
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
  // scoreCircle: {
  //   width: 44,
  //   height: 44,
  //   borderRadius: 22,
  //   backgroundColor: '#1E1E1E',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  // cardLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  // cardLabelEn: { fontSize: 10, color: '#555', marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  cardLabel: { fontSize: 15, fontWeight: '700' },
  cardLabelEn: { fontSize: 10, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' as const },
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

  // [NEW] 역사적 맥락 비교 섹션 — 달리오 철학
  historicalContext: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  historicalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  historicalLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  historicalComparison: {
    gap: 6,
  },
  historicalText: {
    fontSize: 12,
    lineHeight: 18,
  },
  currentComparison: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },
  historicalNote: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // [NEW] "왜 이 점수인가" 섹션
  // whySection: {
  //   backgroundColor: 'rgba(176,176,176,0.06)',
  //   borderRadius: 10,
  //   padding: 12,
  //   marginBottom: 8,
  // },
  whySection: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  // whyLabel: {
  //   fontSize: 11,
  //   fontWeight: '600',
  //   color: COLORS.textSecondary,
  // },
  // whyText: {
  //   fontSize: 12,
  //   color: COLORS.textSecondary,
  //   lineHeight: 18,
  // },
  whyLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  whyText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // [NEW] "지금 할 수 있는 것" 액션 가이드 섹션
  // actionGuideSection: {
  //   backgroundColor: 'rgba(76,175,80,0.06)',
  //   borderRadius: 10,
  //   padding: 12,
  //   marginBottom: 12,
  //   borderLeftWidth: 2,
  //   borderLeftColor: 'rgba(76,175,80,0.3)',
  // },
  actionGuideSection: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 2,
  },
  actionGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  // actionGuideLabel: {
  //   fontSize: 11,
  //   fontWeight: '600',
  //   color: COLORS.primary,
  // },
  // actionGuideText: {
  //   fontSize: 12,
  //   color: COLORS.textSecondary,
  //   lineHeight: 18,
  // },
  actionGuideLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionGuideText: {
    fontSize: 12,
    lineHeight: 18,
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
  // miniBarBg: {
  //   flex: 1,
  //   height: 4,
  //   backgroundColor: '#222',
  //   borderRadius: 2,
  //   overflow: 'hidden',
  // },
  miniBarBg: {
    flex: 1,
    height: 4,
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
  infoIcon: {
    marginLeft: 4,
  },
  detailContainer: {
    marginTop: 4,
  },
  // 개선 제안 섹션
  // suggestionsSection: {
  //   marginTop: 16,
  //   paddingTop: 16,
  //   borderTopWidth: 1,
  //   borderTopColor: '#222',
  // },
  // suggestionsTitle: {
  //   fontSize: 14,
  //   fontWeight: '700',
  //   color: '#FFC107',
  //   marginBottom: 12,
  // },
  suggestionsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  suggestion: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  // 툴팁 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  // tooltipModal: {
  //   backgroundColor: '#1E1E1E',
  //   borderRadius: 16,
  //   padding: 20,
  //   width: '100%',
  //   maxHeight: '70%',
  //   borderWidth: 1,
  //   borderColor: '#333',
  // },
  tooltipModal: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
  },
  // tooltipHeader: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   marginBottom: 12,
  //   paddingBottom: 12,
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#333',
  // },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  // tooltipTitle: {
  //   fontSize: 16,
  //   fontWeight: '700',
  //   color: '#FFFFFF',
  // },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tooltipScroll: {
    maxHeight: 300,
  },
  // tooltipDescription: {
  //   fontSize: 14,
  //   color: '#CCCCCC',
  //   lineHeight: 22,
  // },
  tooltipDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
});
