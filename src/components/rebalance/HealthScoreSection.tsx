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
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Animated, Dimensions } from 'react-native';
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

/** 팩터별 직관적 한글 라벨 (이모티콘 옆에 표시) */
const FACTOR_LABELS: Record<string, string> = {
  '배분 이탈도': '비중 균형 상태',
  '자산 집중도': '위험 분산도',
  '위험 집중도': '위험 분산도',
  '상관관계': '자산 독립성',
  '변동성': '가격 안정성',
  '하방 리스크': '손실 방어력',
  '세금 효율': '절세 효율',
  '레버리지 건전성': '부채 건전성',
};

/** 팩터 점수 → 상태 라벨 */
function getFactorStatus(score: number): { label: string; color: string } {
  if (score >= 70) return { label: '좋음', color: '#4CAF50' };
  if (score >= 40) return { label: '주의', color: '#FF9800' };
  return { label: '개선 필요', color: '#CF6679' };
}

/** 팩터 상세 설명 (ⓘ 툴팁용) */
interface FactorDetail {
  summary: string;
  whenHigh: string;
  whenLow: string;
  formula: string;
  dataSource: string;
  tip: string;
}

const FACTOR_DETAILS: Record<string, FactorDetail> = {
  '배분 이탈도': {
    summary: '각 자산의 비중이 처음 매수 시점 또는 설정한 목표와 얼마나 달라졌는지 측정해요.',
    whenHigh: '각 자산의 비중이 목표와 5% 이내로 유지되고 있어요.\n포트폴리오가 원래 전략대로 운영되고 있는 상태예요.',
    whenLow: '아직 목표 비중을 설정하지 않았거나, 특정 자산이 크게 오르내려 비중이 많이 달라진 상태예요.\n⚠️ 목표 비중 미설정 시 0점으로 계산돼요.',
    formula: '각 자산의 (실제 비중 - 목표 비중) 절댓값 합계 ÷ 2\n→ 이탈이 0%면 100점, 25% 이상이면 0점',
    dataSource: '내가 직접 입력한 자산 가격 + 각 자산에 설정한 목표 비중(%)',
    tip: '분석 탭의 각 자산 상세에서 목표 비중(%)을 입력하면 이 점수가 올라가요.',
  },
  '자산 집중도': {
    summary: '위험이 특정 자산 하나에 집중되지 않고 고르게 분산되어 있는지 측정해요.',
    whenHigh: '어떤 한 자산도 전체 위험의 40% 미만을 차지해요.\n한 종목이 폭락해도 전체 포트폴리오 피해가 제한돼요.',
    whenLow: '특정 자산 하나가 전체 위험의 절반 이상을 담당하고 있어요.\n그 자산이 -30% 내리면 포트폴리오 전체가 크게 흔들려요.',
    formula: '자산별 위험 기여도(자산가치 × 변동성)의 HHI 집중도 지수\n→ 고르게 분산될수록 100점, 한 자산 집중일수록 0점',
    dataSource: '내가 입력한 자산 가격 + 자산 유형별 기준 변동성\n(예: 국내주식 30%, 코인 80%, 채권 5%)',
    tip: '비중이 가장 높은 자산을 일부 줄이고 채권, 현금, 다른 자산군을 추가하세요.',
  },
  '위험 집중도': {
    summary: '위험이 특정 자산 하나에 집중되지 않고 고르게 분산되어 있는지 측정해요.',
    whenHigh: '어떤 한 자산도 전체 위험의 40% 미만을 차지해요.\n한 종목이 폭락해도 전체 포트폴리오 피해가 제한돼요.',
    whenLow: '특정 자산 하나가 전체 위험의 절반 이상을 담당하고 있어요.\n그 자산이 -30% 내리면 포트폴리오 전체가 크게 흔들려요.',
    formula: '자산별 위험 기여도(자산가치 × 변동성)의 HHI 집중도 지수\n→ 고르게 분산될수록 100점, 한 자산 집중일수록 0점',
    dataSource: '내가 입력한 자산 가격 + 자산 유형별 기준 변동성\n(예: 국내주식 30%, 코인 80%, 채권 5%)',
    tip: '비중이 가장 높은 자산을 일부 줄이고 채권, 현금, 다른 자산군을 추가하세요.',
  },
  '상관관계': {
    summary: '각 자산이 서로 다른 방향으로 움직이는지 측정해요. 따로 움직일수록 진짜 분산이에요.',
    whenHigh: '주식이 내릴 때 채권이 오르는 것처럼, 자산들이 서로 독립적으로 움직여요.\n시장이 나빠져도 일부 자산이 완충 역할을 해요.',
    whenLow: '보유한 자산들이 모두 같은 방향으로 움직여요.\n주식, 코인, 성장주만 보유하면 전부 동시에 올라가거나 내려가요.',
    formula: '자산 유형별 기준 상관계수를 보유 비중으로 가중 평균\n→ 상관계수 -0.3 이하면 100점, 0.8 이상이면 0점',
    dataSource: '자산 유형 조합별 역사적 상관계수 (앱 내 기준값)\n예: 주식↔채권 -0.1, 주식↔코인 +0.5, 주식↔금 +0.1',
    tip: '주식 외에 채권, 금, 현금처럼 반대로 움직이는 자산을 포트폴리오에 추가하세요.',
  },
  '변동성': {
    summary: '포트폴리오 전체의 가격이 얼마나 크게 출렁이는지 측정해요.',
    whenHigh: '연간 가격 변동폭이 18% 미만이에요.\n시장이 출렁여도 내 자산이 비교적 안정적으로 유지돼요.',
    whenLow: '연간 가격 변동폭이 30% 이상이에요.\n코인, 성장주 비중이 높아 심리적 압박이 크고 패닉셀 위험이 높아요.',
    formula: '자산 유형별 연간 기준 변동성 × 보유 비중의 가중 평균\n→ 18% 미만이면 100점, 30% 이상이면 0점',
    dataSource: '자산 유형별 기준 연간 변동성 (앱 내 기준값)\n예: 국내주식 30% / 채권 5% / 코인 80% / 현금 0%',
    tip: '암호화폐, 개별 성장주 비중을 줄이고 채권 ETF, 현금 비중을 늘려 변동폭을 줄이세요.',
  },
  '하방 리스크': {
    summary: '현재 손실 중인 자산이 얼마나 있는지 측정해요.',
    whenHigh: '손실 중인 자산이 없거나 매우 적어요.\n포트폴리오 대부분이 수익 또는 원금 유지 상태예요.',
    whenLow: '손실 중인 자산이 포트폴리오의 상당 부분을 차지해요.\n추가 하락 시 손실이 복리로 커질 수 있어요.',
    formula: '손실 자산의 (취득가 - 현재가) ÷ 취득가 × 보유 비중 가중 평균\n→ 손실 없으면 100점, 가중 손실 33% 이상이면 0점',
    dataSource: '내가 직접 입력한 취득가(매입가) + 현재 자산 평가액',
    tip: '장기 보유 전략이라면 손실 자산의 평균 매입가 낮추기를, 단기라면 손절 기준을 명확히 정하세요.',
  },
  '세금 효율': {
    summary: '절세할 수 있는 기회를 얼마나 활용하고 있는지 측정해요.',
    whenHigh: '5% 이상 손실 중인 자산이 없거나, 절세 매도를 이미 활용했어요.\n세금 효율이 최적화된 상태예요.',
    whenLow: '5% 이상 손실 중인 자산이 여럿 있어요.\n이 자산들을 연말 전에 매도하면 다른 수익과 상계해 세금을 줄일 수 있어요.',
    formula: '5% 이상 손실 자산 수 ÷ 전체 유동자산 수\n→ 절세 기회 없으면 100점, 절반 이상이 기회 자산이면 0점',
    dataSource: '내가 직접 입력한 취득가(매입가) + 현재 자산 평가액',
    tip: '손실 자산 매도 후 비슷한 다른 자산을 즉시 매수하면, 투자 포지션은 유지하면서 절세 혜택을 받을 수 있어요.',
  },
  '레버리지 건전성': {
    summary: '대출이나 레버리지를 안전한 수준으로 사용하고 있는지 측정해요.',
    whenHigh: '부채가 없거나, 안정 자산(부동산 등) 기반 LTV가 60% 미만이에요.\n자산 가치가 내려도 반대매매 위험이 없어요.',
    whenLow: '고변동 자산(코인, 성장주)에 레버리지를 사용 중이에요.\n자산 가치가 급락하면 강제 청산(반대매매)이 발생할 수 있어요.',
    formula: 'LTV × 자산 변동성 × 자산가치의 총합 ÷ 전체 자산\n→ 위험 수치 10% 미만이면 100점, 높을수록 0점에 가까워짐',
    dataSource: '내가 입력한 대출액(LTV) + 자산 가격 + 자산 유형별 기준 변동성',
    tip: '레버리지는 부동산처럼 안정적인 자산에만 제한적으로 사용하세요. 변동성 큰 자산의 레버리지는 매우 위험해요.',
  },
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

/** 점수 → 행동 언어 상태 설명 */
function getConditionLabel(score: number): string {
  if (score >= 80) return '균형 잡힌 상태예요';
  if (score >= 60) return '약간 무리한 상태예요';
  if (score >= 40) return '조정이 필요한 상태예요';
  return '지금 리밸런싱이 필요해요';
}

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
  const [tooltipFactorKey, setTooltipFactorKey] = useState<string>('');
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
    setTooltipFactorKey(factorLabel);
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
          <View style={{ flex: 1 }}>
            {/* 행동 언어 — 숫자보다 먼저 눈에 들어오도록 */}
            <Text style={[s.conditionStatus, { color: healthScore.gradeColor }]}>
              {getConditionLabel(healthScore.totalScore)}
            </Text>
            <View style={s.titleRow}>
              <Text style={[s.cardLabel, { color: colors.textPrimary }]}>포트폴리오 컨디션</Text>
              <View style={[s.gradeBadge, { backgroundColor: healthScore.gradeBgColor }]}>
                <Text style={[s.gradeText, { color: healthScore.gradeColor }]}>
                  {healthScore.grade}등급
                </Text>
              </View>
            </View>
            <Text style={[s.cardLabelEn, { color: colors.textTertiary }]}>Health Score · {healthScore.totalScore}점</Text>
          </View>
        </View>
        <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* 등급별 상세 해석 */}
      <Text style={[s.summary, { color: healthScore.gradeColor }]}>
        {GRADE_ICONS[healthScore.grade]} {GRADE_INTERPRETATIONS[healthScore.grade]}
      </Text>

      {/* [NEW] 역사적 맥락 비교 — 달리오 철학 */}
      <View style={[s.historicalContext, { backgroundColor: colors.surfaceElevated }]}>
        <View style={s.historicalRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={[s.historicalLabel, { color: colors.textSecondary }]}>역사적 기준점 — 레이 달리오 원칙</Text>
        </View>
        <Text style={[s.historicalIntro, { color: colors.textSecondary }]}>
          과거 금융위기 때 대부분의 투자자 점수는 아래와 같았어요.{'\n'}당신의 점수는 그 위기 때보다 얼마나 안전한지 확인하세요.
        </Text>
        <View style={s.historicalComparison}>
          {/* 2008년 비교 */}
          <View style={[s.historicalCompareRow, { borderColor: colors.border }]}>
            <View style={s.historicalLeft}>
              <Text style={[s.historicalCrisisLabel, { color: colors.textSecondary }]}>📉 2008년 금융위기 당시</Text>
              <Text style={[s.historicalCrisisScore, { color: colors.textSecondary }]}>평균 <Text style={{ fontWeight: '800' }}>35점</Text></Text>
            </View>
            <View style={[s.historicalDiffBadge, { backgroundColor: colors.success + '22' }]}>
              <Text style={[s.historicalDiffText, { color: colors.success }]}>내 점수 +{healthScore.totalScore - 35}점 ↑</Text>
            </View>
          </View>
          {/* 2020년 비교 */}
          <View style={[s.historicalCompareRow, { borderColor: colors.border }]}>
            <View style={s.historicalLeft}>
              <Text style={[s.historicalCrisisLabel, { color: colors.textSecondary }]}>🦠 2020년 코로나 팬데믹 당시</Text>
              <Text style={[s.historicalCrisisScore, { color: colors.textSecondary }]}>평균 <Text style={{ fontWeight: '800' }}>42점</Text></Text>
            </View>
            <View style={[s.historicalDiffBadge, { backgroundColor: colors.success + '22' }]}>
              <Text style={[s.historicalDiffText, { color: colors.success }]}>내 점수 +{healthScore.totalScore - 42}점 ↑</Text>
            </View>
          </View>
        </View>
        <Text style={[s.historicalNote, { color: colors.textSecondary }]}>
          💡 저 점수들은 시장이 극도로 불안할 때도 버텨낸 기준이에요.{'\n'}현재 당신은 그보다 높으니 패닉셀 할 이유가 없어요.
        </Text>
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

      {/* 6팩터 미니 바 (접힌 상태) */}
      {!showDetail && (
        <View style={s.miniFactors}>
          {/* 헤더: 높을수록 좋다는 안내 */}
          <View style={[s.factorHeaderRow, { borderBottomColor: colors.border }]}>
            <Text style={[s.factorHeaderLabel, { color: colors.textSecondary }]}>지표</Text>
            <Text style={[s.factorHeaderHint, { color: colors.textSecondary }]}>← 낮음 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 높을수록 좋음 →</Text>
          </View>
          {healthScore.factors.map((factor, idx) => {
            const barColor = factor.score >= 70 ? colors.success : factor.score >= 40 ? colors.warning : colors.error;
            const status = getFactorStatus(factor.score);
            const friendlyLabel = FACTOR_LABELS[factor.label] || factor.label;
            return (
              <View key={idx} style={s.miniFactor}>
                <Text style={s.miniIcon}>{factor.icon}</Text>
                <Text style={[s.miniLabel, { color: colors.textSecondary }]}>{friendlyLabel}</Text>
                <View style={[s.miniBarBg, { backgroundColor: colors.surfaceElevated }]}>
                  <View style={[s.miniBarFill, { width: `${factor.score}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[s.miniScore, { color: barColor }]}>{factor.score}</Text>
                <View style={[s.miniStatusBadge, { backgroundColor: barColor + '22' }]}>
                  <Text style={[s.miniStatusText, { color: barColor }]}>{status.label}</Text>
                </View>

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

      {/* 팩터 상세 툴팁 모달 */}
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
          <TouchableOpacity activeOpacity={1} style={[s.tooltipModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(() => {
              const detail = FACTOR_DETAILS[tooltipFactorKey];
              const friendlyLabel = FACTOR_LABELS[tooltipFactorKey] || tooltipFactorKey;
              if (!detail) return null;
              return (
                <>
                  {/* 헤더 */}
                  <View style={[s.tooltipHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[s.tooltipTitle, { color: colors.textPrimary }]}>{friendlyLabel}</Text>
                    <TouchableOpacity onPress={() => setTooltipVisible(false)}>
                      <Ionicons name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={s.tooltipScroll} showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 16 }}>
                    {/* 한 줄 요약 */}
                    <Text style={[s.tooltipSummary, { color: colors.textSecondary }]}>{detail.summary}</Text>

                    {/* 높을 때 */}
                    <View style={[s.tooltipSection, { backgroundColor: '#4CAF5015', borderLeftColor: '#4CAF50' }]}>
                      <Text style={[s.tooltipSectionTitle, { color: '#4CAF50' }]}>✅ 점수가 높을 때 (70점 이상)</Text>
                      <Text style={[s.tooltipSectionText, { color: colors.textSecondary }]}>{detail.whenHigh}</Text>
                    </View>

                    {/* 낮을 때 */}
                    <View style={[s.tooltipSection, { backgroundColor: '#CF667915', borderLeftColor: '#CF6679' }]}>
                      <Text style={[s.tooltipSectionTitle, { color: '#CF6679' }]}>⚠️ 점수가 낮을 때 (40점 미만)</Text>
                      <Text style={[s.tooltipSectionText, { color: colors.textSecondary }]}>{detail.whenLow}</Text>
                    </View>

                    {/* 계산 공식 */}
                    <View style={[s.tooltipSection, { backgroundColor: colors.surfaceElevated, borderLeftColor: colors.border }]}>
                      <Text style={[s.tooltipSectionTitle, { color: colors.textSecondary }]}>📐 계산 방식</Text>
                      <Text style={[s.tooltipSectionText, { color: colors.textSecondary, fontFamily: 'monospace' }]}>{detail.formula}</Text>
                    </View>

                    {/* 데이터 소스 */}
                    <View style={[s.tooltipSection, { backgroundColor: colors.surfaceElevated, borderLeftColor: colors.border }]}>
                      <Text style={[s.tooltipSectionTitle, { color: colors.textSecondary }]}>📊 데이터 출처</Text>
                      <Text style={[s.tooltipSectionText, { color: colors.textSecondary }]}>{detail.dataSource}</Text>
                    </View>

                    {/* 개선 팁 */}
                    <View style={[s.tooltipSection, { backgroundColor: colors.success + '15', borderLeftColor: colors.success }]}>
                      <Text style={[s.tooltipSectionTitle, { color: colors.success }]}>💡 개선 방법</Text>
                      <Text style={[s.tooltipSectionText, { color: colors.textSecondary }]}>{detail.tip}</Text>
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </TouchableOpacity>
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
  conditionStatus: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
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
    marginBottom: 6,
  },
  historicalLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  historicalIntro: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  historicalComparison: {
    gap: 8,
    marginBottom: 10,
  },
  historicalCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  historicalLeft: {
    flex: 1,
  },
  historicalCrisisLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  historicalCrisisScore: {
    fontSize: 12,
    lineHeight: 16,
  },
  historicalDiffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  historicalDiffText: {
    fontSize: 12,
    fontWeight: '700',
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
    lineHeight: 17,
    marginTop: 2,
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
    gap: 8,
  },
  factorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    marginBottom: 2,
    borderBottomWidth: 1,
  },
  factorHeaderLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  factorHeaderHint: {
    fontSize: 10,
  },
  miniFactor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniLabel: {
    fontSize: 11,
    width: 72,
    flexShrink: 0,
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
    fontWeight: '700',
    width: 22,
    textAlign: 'right',
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  miniStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  infoIcon: {
    marginLeft: 2,
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
    maxHeight: Dimensions.get('window').height * 0.80,
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
    flexGrow: 1,
  },
  tooltipSummary: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  tooltipSection: {
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 8,
  },
  tooltipSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  tooltipSectionText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
