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
import { LineChart } from 'react-native-chart-kit';
import HealthScoreDetail from '../HealthScoreDetail';
import type { HealthScoreResult, FactorResult } from '../../services/rebalanceScore';
import { useTheme } from '../../hooks/useTheme';
import { saveHealthScore, loadPreviousHealthScore } from '../../utils/storage';
import { useHealthScoreHistory } from '../../hooks/useHealthScoreHistory';
import { useBracketPerformance } from '../../hooks/useBracketPerformance';
import { useLocale } from '../../context/LocaleContext';

interface HealthScoreSectionProps {
  healthScore: HealthScoreResult;
  onScoreImproved?: (improvement: number) => void;
  totalAssets?: number;
  /** Panic Shield 점수 (0-100) — CheckupHeader에서 통합 */
  panicScore?: number;
}

/** 팩터별 직관적 라벨 키 매핑 (locale key → factor_labels.X) */
const FACTOR_LABEL_KEYS: Record<string, string> = {
  '배분 이탈도': 'drift',
  '자산 집중도': 'concentration',
  '위험 집중도': 'concentration',
  '상관관계': 'correlation',
  '변동성': 'volatility',
  '하방 리스크': 'downside',
  '세금 효율': 'tax',
  '레버리지 건전성': 'leverage',
};

/** 팩터 점수 → 상태 라벨 키 */
function getFactorStatusKey(score: number): { key: string; color: string } {
  if (score >= 70) return { key: 'factor_status_good', color: '#4CAF50' };
  if (score >= 40) return { key: 'factor_status_caution', color: '#B56A00' };
  return { key: 'factor_status_improve', color: '#B23A48' };
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

/** 팩터별 개선 제안 locale key 매핑 (40점 미만 시) */
const FACTOR_SUGGESTION_KEYS: Record<string, string> = {
  '배분 이탈도': 'drift',
  '자산 집중도': 'concentration',
  '위험 집중도': 'concentration',
  '상관관계': 'correlation',
  '변동성': 'volatility',
  '하방 리스크': 'downside',
  '세금 효율': 'tax',
};

/** 등급별 상세 해석 — locale keys */
const GRADE_INTERPRETATION_KEYS: Record<string, string> = {
  'S': 'S',
  'A': 'A',
  'B': 'B',
  'C': 'C',
  'D': 'D',
};

/** 등급별 아이콘 */
const GRADE_ICONS: Record<string, string> = {
  'S': '🏆',
  'A': '✅',
  'B': '⚠️',
  'C': '🔴',
  'D': '🚨',
};

/** 점수 → 행동 언어 상태 설명 locale key */
function getConditionLabelKey(score: number): string {
  if (score >= 80) return 'condition_great';
  if (score >= 60) return 'condition_ok';
  if (score >= 40) return 'condition_adjust';
  return 'condition_rebalance';
}

/**
 * "왜 이 점수인가" 요약 생성
 *
 * 가장 취약한 팩터(들)를 기반으로 사용자가 이해할 수 있는 1-2줄의 이유를 만든다.
 * 예: "자산 집중도와 변동성이 낮아서 전체 점수가 내려갔어요."
 * 예: "모든 팩터가 양호합니다. 현재 전략을 유지하세요."
 */
// 팩터 이름 → locale key 매핑 (action_map keys)
const FACTOR_ACTION_KEYS: Record<string, string> = {
  '배분 이탈도': 'drift',
  '자산 집중도': 'concentration',
  '위험 집중도': 'concentration',
  '상관관계': 'correlation',
  '변동성': 'volatility',
  '하방 리스크': 'downside',
  '세금 효율': 'tax',
};

export default function HealthScoreSection({ healthScore, onScoreImproved, totalAssets, panicScore }: HealthScoreSectionProps) {
  const { colors, shadows } = useTheme();
  const { t } = useLocale();
  const [showDetail, setShowDetail] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipFactorKey, setTooltipFactorKey] = useState<string>('');
  const [improveToast, setImproveToast] = useState<{ show: boolean; improvement: number; credits: number }>({ show: false, improvement: 0, credits: 0 });
  const improveOpacity = useRef(new Animated.Value(0)).current;
  const scoreLoadedRef = useRef(false);

  // P1-2: 건강 점수 이력 (스파크라인)
  const { sparklineData, sparklineLabels, trend, hasHistory } = useHealthScoreHistory(
    healthScore.totalScore,
    healthScore.grade,
  );

  // P2-B: 또래 비교 (자산 구간 평균)
  const { peerData, bracketLabel } = useBracketPerformance(totalAssets ?? 0);

  // "왜 이 점수인가" + "지금 할 수 있는 것" 계산 (locale 적용)
  const whyExplanation = useMemo(() => {
    const { factors, totalScore } = healthScore;
    const weakFactors = factors.filter((f: FactorResult) => f.score < 70);
    if (weakFactors.length === 0) {
      return t('health_section.why_all_good');
    }
    const sorted = [...weakFactors].sort((a, b) => a.score - b.score);
    const worst = sorted[0];
    const worstKey = FACTOR_LABEL_KEYS[worst.label] || 'drift';
    const worstName = t(`health_section.factor_labels.${worstKey}`);
    if (sorted.length === 1) {
      return t('health_section.why_one_factor', { factor: worstName });
    }
    const secondWorst = sorted[1];
    const secondKey = FACTOR_LABEL_KEYS[secondWorst.label] || 'drift';
    const secondName = t(`health_section.factor_labels.${secondKey}`);
    if (sorted.length === 2) {
      return t('health_section.why_two_factors', { factor1: worstName, factor2: secondName });
    }
    return t('health_section.why_many_factors', {
      factor: worstName,
      count: String(sorted.length - 1),
      projected: String(Math.min(totalScore + 15, 100)),
    });
  }, [healthScore, t]);

  const actionGuidance = useMemo(() => {
    const { grade, factors } = healthScore;
    if (grade === 'S') return null;
    const sorted = [...factors].sort((a, b) => a.score - b.score);
    const worst = sorted[0];
    const actionKey = FACTOR_ACTION_KEYS[worst.label];
    if (actionKey) {
      return t(`health_section.action_map.${actionKey}`);
    }
    return t('health_section.action_map.default_');
  }, [healthScore, t]);

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
    const suggKey = FACTOR_SUGGESTION_KEYS[factor.label];
    const suggText = suggKey ? t(`health_section.factor_suggestions.${suggKey}`) : '';
    return (
      <Text style={[s.suggestion, { color: colors.error, backgroundColor: colors.error + '1A', borderLeftColor: colors.error }]}>
        {suggText}
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
            <Text style={[s.improveToastTitle, { color: colors.premium.gold }]}>{t('health_section.toast_title', { points: String(improveToast.improvement) })}</Text>
            <Text style={[s.improveToastSubtitle, { color: colors.premium.gold + 'CC' }]}>{t('health_section.toast_subtitle')}</Text>
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
              {t(`health_section.${getConditionLabelKey(healthScore.totalScore)}`)}
            </Text>
            <View style={s.titleRow}>
              <Text style={[s.cardLabel, { color: colors.textPrimary }]}>{t('health_section.card_label')}</Text>
              <View style={[s.gradeBadge, { backgroundColor: healthScore.gradeBgColor }]}>
                <Text style={[s.gradeText, { color: healthScore.gradeColor }]}>
                  {healthScore.grade}{t('health_section.grade_suffix')}
                </Text>
              </View>
            </View>
            <Text style={[s.cardLabelEn, { color: colors.textTertiary }]}>{t('health_section.card_label_en')} · {healthScore.totalScore}pts</Text>
          </View>
        </View>
        <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* P1-2: 건강 점수 추이 스파크라인 (2일 이상 데이터 있을 때만) */}
      {hasHistory && sparklineData.length >= 2 && (
        <View style={s.sparklineContainer}>
          <View style={s.sparklineHeader}>
            <Ionicons
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove-outline'}
              size={12}
              color={trend === 'up' ? colors.success : trend === 'down' ? colors.error : colors.textTertiary}
            />
            <Text style={[s.sparklineLabel, {
              color: trend === 'up' ? colors.success : trend === 'down' ? colors.error : colors.textTertiary,
            }]}>
              {trend === 'up' ? t('health_section.trend_up') : trend === 'down' ? t('health_section.trend_down') : t('health_section.trend_flat')}
            </Text>
            <Text style={[s.sparklinePeriod, { color: colors.textTertiary }]}>{t('health_section.sparkline_period', { days: String(sparklineData.length) })}</Text>
          </View>
          <LineChart
            data={{
              labels: sparklineLabels.filter((_, i) => i % Math.ceil(sparklineLabels.length / 4) === 0 || i === sparklineLabels.length - 1),
              datasets: [{ data: sparklineData }],
            }}
            width={Dimensions.get('window').width - 68}
            height={64}
            withDots={false}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLabels={false}
            withHorizontalLabels={false}
            withShadow={false}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'transparent',
              backgroundGradientTo: 'transparent',
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              decimalPlaces: 0,
              color: () => healthScore.gradeColor,
              strokeWidth: 2,
            }}
            bezier
            style={{ marginLeft: -16, marginTop: 4 }}
          />
        </View>
      )}

      {/* 등급별 상세 해석 */}
      <Text style={[s.summary, { color: healthScore.gradeColor }]}>
        {GRADE_ICONS[healthScore.grade]} {t(`health_section.grade_interpretations.${GRADE_INTERPRETATION_KEYS[healthScore.grade] ?? healthScore.grade}`)}
      </Text>

      {/* [NEW] 역사적 맥락 비교 — 달리오 철학 */}
      <View style={[s.historicalContext, { backgroundColor: colors.surfaceElevated }]}>
        <View style={s.historicalRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={[s.historicalLabel, { color: colors.textSecondary }]}>{t('health_section.historical_title')}</Text>
        </View>
        <Text style={[s.historicalIntro, { color: colors.textSecondary }]}>
          {t('health_section.historical_intro')}
        </Text>
        <View style={s.historicalComparison}>
          {/* 2008년 비교 */}
          <View style={[s.historicalCompareRow, { borderColor: colors.border }]}>
            <Text style={[s.historicalCrisisLabel, { color: colors.textSecondary }]}>{t('health_section.historical_2008_label')}</Text>
            <View style={s.historicalScoreRow}>
              <Text style={[s.historicalCrisisScore, { color: colors.textSecondary }]}>{t('health_section.historical_avg')}<Text style={{ fontWeight: '800' }}>35{t('health_section.historical_pts_label')}</Text></Text>
              <View style={[s.historicalDiffBadge, { backgroundColor: colors.success + '22' }]}>
                <Text style={[s.historicalDiffText, { color: colors.success }]}>{t('health_section.historical_diff', { diff: String(healthScore.totalScore - 35) })}</Text>
              </View>
            </View>
          </View>
          {/* 2020년 비교 */}
          <View style={[s.historicalCompareRow, { borderColor: colors.border }]}>
            <Text style={[s.historicalCrisisLabel, { color: colors.textSecondary }]}>{t('health_section.historical_2020_label')}</Text>
            <View style={s.historicalScoreRow}>
              <Text style={[s.historicalCrisisScore, { color: colors.textSecondary }]}>{t('health_section.historical_avg')}<Text style={{ fontWeight: '800' }}>42{t('health_section.historical_pts_label')}</Text></Text>
              <View style={[s.historicalDiffBadge, { backgroundColor: colors.success + '22' }]}>
                <Text style={[s.historicalDiffText, { color: colors.success }]}>{t('health_section.historical_diff', { diff: String(healthScore.totalScore - 42) })}</Text>
              </View>
            </View>
          </View>
        </View>
        <Text style={[s.historicalNote, { color: colors.textSecondary }]}>
          {t('health_section.historical_note')}
        </Text>
      </View>

      {/* [NEW] "왜 이 점수인가" 요약 — 어떤 팩터가 점수를 끌어내렸는지 설명 */}
      <View style={[s.whySection, { backgroundColor: colors.surfaceElevated }]}>
        <View style={s.whyRow}>
          <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
          <Text style={[s.whyLabel, { color: colors.textSecondary }]}>{t('health_section.why_label')}</Text>
        </View>
        <Text style={[s.whyText, { color: colors.textSecondary }]}>{whyExplanation}</Text>
      </View>

      {/* P2-B: 또래 비교 카드 */}
      {peerData && peerData.userCount > 0 && totalAssets && totalAssets > 0 && (
        <View style={[s.peerCard, { backgroundColor: colors.surfaceElevated }]}>
          <View style={s.peerHeader}>
            <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
            <Text style={[s.peerLabel, { color: colors.textSecondary }]}>
              {t('health_section.peer_label', { bracket: bracketLabel })}
            </Text>
          </View>
          <View style={s.peerStats}>
            <View style={s.peerStat}>
              <Text style={[s.peerStatValue, {
                color: peerData.avgReturnRate >= 0 ? colors.success : colors.error,
              }]}>
                {peerData.avgReturnRate >= 0 ? '+' : ''}{peerData.avgReturnRate.toFixed(1)}%
              </Text>
              <Text style={[s.peerStatLabel, { color: colors.textTertiary }]}>{t('health_section.peer_avg_return')}</Text>
            </View>
            {peerData.top10ReturnRate > 0 && (
              <>
                <View style={[s.peerDivider, { backgroundColor: colors.border }]} />
                <View style={s.peerStat}>
                  <Text style={[s.peerStatValue, { color: colors.success }]}>
                    +{peerData.top10ReturnRate.toFixed(1)}%
                  </Text>
                  <Text style={[s.peerStatLabel, { color: colors.textTertiary }]}>{t('health_section.peer_top10')}</Text>
                </View>
              </>
            )}
          </View>
          <Text style={[s.peerNote, { color: colors.textTertiary }]}>
            {t('health_section.peer_note', { count: peerData.userCount.toLocaleString(), bracket: bracketLabel, date: peerData.statDate })}
          </Text>
        </View>
      )}

      {/* [NEW] "지금 할 수 있는 것" 액션 가이드 — S등급이면 표시 안 함 */}
      {actionGuidance && (
        <View style={[s.actionGuideSection, { backgroundColor: colors.success + '1A', borderLeftColor: colors.success + '4D' }]}>
          <View style={s.actionGuideRow}>
            <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.success} />
            <Text style={[s.actionGuideLabel, { color: colors.success }]}>{t('health_section.action_guide_label')}</Text>
          </View>
          <Text style={[s.actionGuideText, { color: colors.textSecondary }]}>{actionGuidance}</Text>
        </View>
      )}

      {/* Panic Shield — 위기 대비력 (CheckupHeader에서 통합) */}
      {panicScore !== undefined && (
        <View style={[s.panicShield, { backgroundColor: colors.surfaceElevated }]}>
          <View style={s.panicShieldRow}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.primaryDark ?? colors.primary} />
            <Text style={[s.panicShieldLabel, { color: colors.textSecondary }]}>{t('health_section.panic_shield_label')}</Text>
            <Text style={[s.panicShieldScore, { color: colors.primaryDark ?? colors.primary }]}>{Math.round(panicScore)}pts</Text>
            <Text style={[s.panicShieldStatus, {
              color: panicScore >= 70 ? colors.success : panicScore >= 50 ? colors.warning : colors.error,
            }]}>{panicScore >= 70 ? t('health_section.panic_stable') : panicScore >= 50 ? t('health_section.panic_ok') : t('health_section.panic_caution')}</Text>
          </View>
          <Text style={[s.panicShieldReason, { color: colors.textTertiary }]}>
            {panicScore >= 70
              ? t('health_section.panic_reason_stable')
              : panicScore >= 50
              ? t('health_section.panic_reason_ok')
              : t('health_section.panic_reason_caution')}
          </Text>
        </View>
      )}

      {/* 6팩터 미니 바 (접힌 상태) */}
      {!showDetail && (
        <View style={s.miniFactors}>
          {/* 헤더: 높을수록 좋다는 안내 */}
          <View style={[s.factorHeaderRow, { borderBottomColor: colors.border }]}>
            <Text style={[s.factorHeaderLabel, { color: colors.textSecondary }]}>{t('health_section.factor_header_label')}</Text>
            <Text style={[s.factorHeaderHint, { color: colors.textSecondary }]}>{t('health_section.factor_header_hint')}</Text>
          </View>
          {healthScore.factors.map((factor, idx) => {
            const barColor = factor.score >= 70 ? colors.success : factor.score >= 40 ? colors.warning : colors.error;
            const statusInfo = getFactorStatusKey(factor.score);
            const labelKey = FACTOR_LABEL_KEYS[factor.label] || 'drift';
            const friendlyLabel = t(`health_section.factor_labels.${labelKey}`);
            return (
              <View key={idx} style={s.miniFactor}>
                <Text style={s.miniIcon}>{factor.icon}</Text>
                <Text style={[s.miniLabel, { color: colors.textSecondary }]}>{friendlyLabel}</Text>
                <View style={[s.miniBarBg, { backgroundColor: colors.surfaceElevated }]}>
                  <View style={[s.miniBarFill, { width: `${factor.score}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[s.miniScore, { color: barColor }]}>{factor.score}</Text>
                <View style={[s.miniStatusBadge, { backgroundColor: barColor + '22' }]}>
                  <Text style={[s.miniStatusText, { color: barColor }]}>{t(`health_section.${statusInfo.key}`)}</Text>
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
              <Text style={[s.suggestionsTitle, { color: colors.warning }]}>{t('health_section.suggestions_title')}</Text>
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
              const labelKey = FACTOR_LABEL_KEYS[tooltipFactorKey] || 'drift';
              const friendlyLabel = t(`health_section.factor_labels.${labelKey}`);
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
                    <View style={[s.tooltipSection, { backgroundColor: `${colors.success}20`, borderLeftColor: colors.success }]}>
                      <Text style={[s.tooltipSectionTitle, { color: colors.success }]}>{t('health_section.tooltip_when_high_title')}</Text>
                      <Text style={[s.tooltipSectionText, { color: colors.textSecondary }]}>{detail.whenHigh}</Text>
                    </View>

                    {/* 낮을 때 */}
                    <View style={[s.tooltipSection, { backgroundColor: `${colors.error}20`, borderLeftColor: colors.error }]}>
                      <Text style={[s.tooltipSectionTitle, { color: colors.error }]}>{t('health_section.tooltip_when_low_title')}</Text>
                      <Text style={[s.tooltipSectionText, { color: colors.textSecondary }]}>{detail.whenLow}</Text>
                    </View>

                    {/* 계산 공식 */}
                    <View style={[s.tooltipSection, { backgroundColor: colors.surfaceElevated, borderLeftColor: colors.border }]}>
                      <Text style={[s.tooltipSectionTitle, { color: colors.textSecondary }]}>{t('health_section.tooltip_formula_title')}</Text>
                      <Text style={[s.tooltipSectionText, { color: colors.textSecondary, fontFamily: 'monospace' }]}>{detail.formula}</Text>
                    </View>

                    {/* 데이터 소스 */}
                    <View style={[s.tooltipSection, { backgroundColor: colors.surfaceElevated, borderLeftColor: colors.border }]}>
                      <Text style={[s.tooltipSectionTitle, { color: colors.textSecondary }]}>{t('health_section.tooltip_data_source_title')}</Text>
                      <Text style={[s.tooltipSectionText, { color: colors.textSecondary }]}>{detail.dataSource}</Text>
                    </View>

                    {/* 개선 팁 */}
                    <View style={[s.tooltipSection, { backgroundColor: colors.success + '15', borderLeftColor: colors.success }]}>
                      <Text style={[s.tooltipSectionTitle, { color: colors.success }]}>{t('health_section.tooltip_tip_title')}</Text>
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
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  improveToastSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
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
    fontSize: 19,
    fontWeight: '800',
  },
  conditionStatus: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // cardLabel: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  // cardLabelEn: { fontSize: 12, color: '#555', marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  cardLabel: { fontSize: 18, fontWeight: '700' },
  cardLabelEn: { fontSize: 13, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summary: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 12,
  },

  // P1-2: 건강 점수 스파크라인
  sparklineContainer: {
    marginBottom: 10,
    marginTop: -4,
  },
  sparklineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  sparklineLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sparklinePeriod: {
    fontSize: 13,
    marginLeft: 'auto',
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
    gap: 8,
    marginBottom: 8,
  },
  historicalLabel: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  historicalIntro: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  historicalComparison: {
    gap: 8,
    marginBottom: 10,
  },
  historicalCompareRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  historicalScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  historicalCrisisLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  historicalCrisisScore: {
    fontSize: 14,
    lineHeight: 18,
  },
  historicalDiffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  historicalDiffText: {
    fontSize: 13,
    fontWeight: '700',
  },
  historicalText: {
    fontSize: 14,
    lineHeight: 20,
  },
  currentComparison: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 4,
  },
  historicalNote: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },

  // P2-B: 또래 비교 카드
  peerCard: { borderRadius: 10, padding: 12, marginBottom: 12 },
  peerHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  peerLabel: { fontSize: 14, fontWeight: '700' },
  peerStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  peerStat: { flex: 1, alignItems: 'center' },
  peerStatValue: { fontSize: 19, fontWeight: '800', marginBottom: 2 },
  peerStatLabel: { fontSize: 13, lineHeight: 18 },
  peerDivider: { width: 1, height: 32, marginHorizontal: 12 },
  peerNote: { fontSize: 11, textAlign: 'center' as const },

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
  //   fontSize: 13,
  //   fontWeight: '600',
  //   color: COLORS.textSecondary,
  // },
  // whyText: {
  //   fontSize: 14,
  //   color: COLORS.textSecondary,
  //   lineHeight: 20,
  // },
  whyLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  whyText: {
    fontSize: 15,
    lineHeight: 22,
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
  //   fontSize: 13,
  //   fontWeight: '600',
  //   color: COLORS.primary,
  // },
  // actionGuideText: {
  //   fontSize: 14,
  //   color: COLORS.textSecondary,
  //   lineHeight: 20,
  // },
  actionGuideLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionGuideText: {
    fontSize: 15,
    lineHeight: 22,
  },

  // Panic Shield — 위기 대비력 (CheckupHeader에서 통합)
  panicShield: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  panicShieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  panicShieldLabel: {
    fontSize: 14,
    marginLeft: 6,
  },
  panicShieldScore: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  panicShieldStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  panicShieldReason: {
    fontSize: 14,
    marginLeft: 21,
    fontStyle: 'italic',
    lineHeight: 20,
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
    fontSize: 13,
    fontWeight: '600',
  },
  factorHeaderHint: {
    fontSize: 13,
  },
  miniFactor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniLabel: {
    fontSize: 14,
    width: 84,
    flexShrink: 0,
    lineHeight: 20,
  },
  miniIcon: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  miniStatusText: {
    fontSize: 13,
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
  //   fontSize: 16,
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  suggestion: {
    fontSize: 15,
    lineHeight: 22,
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
  //   fontSize: 17,
  //   fontWeight: '700',
  //   color: '#FFFFFF',
  // },
  tooltipTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  tooltipScroll: {
    flexGrow: 1,
  },
  tooltipSummary: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  tooltipSection: {
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 8,
  },
  tooltipSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  tooltipSectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
