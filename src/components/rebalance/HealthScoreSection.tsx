/**
 * 건강 점수 섹션 — 6팩터 종합 진단 (처방전 전용)
 *
 * 역할: 히어로 바로 아래에서 포트폴리오 전체 건강 상태를 요약 → 상세 펼침
 * 데이터: rebalanceScore.ts의 calculateHealthScore (순수 함수, AI 미사용)
 *
 * UX 개선 (2026-02-09):
 * - 팩터별 툴팁 (ℹ️ 아이콘 터치 시 설명)
 * - 취약 팩터 개선 제안 (40점 미만)
 * - 등급별 해석 강화
 * - 햅틱 피드백 추가
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HealthScoreDetail from '../HealthScoreDetail';
import type { HealthScoreResult } from '../../services/rebalanceScore';

interface HealthScoreSectionProps {
  healthScore: HealthScoreResult;
}

/** 팩터별 설명 텍스트 (툴팁용) */
const FACTOR_DESCRIPTIONS: Record<string, string> = {
  '배분 이탈도': '목표 배분과 현재 배분의 차이입니다. 0%에 가까울수록 좋습니다.\n\n이탈도가 낮으면 당신의 투자 전략이 잘 유지되고 있다는 신호예요.',
  '자산 집중도': '특정 자산에 쏠림 정도입니다. 분산이 잘 되어 있을수록 높은 점수를 받습니다.\n\n집중도가 낮으면 한 종목의 폭락에도 포트폴리오 전체가 안정적이에요.',
  '상관관계': '자산 간 움직임의 유사도입니다. 낮을수록 분산 효과가 큽니다.\n\n낮은 상관관계는 한 자산이 떨어질 때 다른 자산이 오를 수 있다는 뜻이에요.',
  '변동성': '자산 가치의 변동 폭입니다. 낮을수록 안정적입니다.\n\n변동성이 낮으면 심리적으로 편안하게 투자를 지속할 수 있어요.',
  '하방 리스크': '손실 가능성입니다. 낮을수록 안전합니다.\n\n현재 손실 중인 종목이 많으면 하방 리스크 점수가 낮아져요.',
  '세금 효율': '세금 최적화 정도입니다. 높을수록 절세 효과가 큽니다.\n\n5% 이상 손실 종목이 있으면 절세 매도(TLH) 기회가 있다는 신호예요.',
};

/** 팩터별 개선 제안 (40점 미만 시) */
const FACTOR_SUGGESTIONS: Record<string, string> = {
  '배분 이탈도': '⚠️ 목표 배분 대비 이탈이 큽니다.\n\n아래 "오늘의 액션"을 참고해 리밸런싱을 해보세요.',
  '자산 집중도': '⚠️ 특정 자산에 쏠려 있습니다.\n\n분산 투자를 고려해보세요. 채권이나 현금 비중을 늘리면 안정성이 높아져요.',
  '상관관계': '⚠️ 자산들이 비슷하게 움직입니다.\n\n상관관계가 낮은 자산(채권, 현금, 비트코인 등)을 추가하면 분산 효과가 커져요.',
  '변동성': '⚠️ 포트폴리오 변동성이 높습니다.\n\n안정적인 자산(채권, 현금)의 비중을 늘리면 변동폭을 줄일 수 있어요.',
  '하방 리스크': '⚠️ 손실 중인 종목이 많습니다.\n\n손절 또는 평단 낮추기를 고려해보세요. 아래 AI 분석을 확인해보세요.',
  '세금 효율': '⚠️ 절세 기회를 활용하지 못하고 있어요.\n\n5% 이상 손실 종목을 매도 후 유사 종목으로 갈아타면 세금을 절약할 수 있어요.',
};

/** 등급별 상세 해석 */
const GRADE_INTERPRETATIONS: Record<string, string> = {
  'S': '🎉 완벽한 포트폴리오입니다!\n\n현재 상태를 유지하시면 장기적으로 안정적인 수익을 기대할 수 있어요.',
  'A': '✅ 우수한 포트폴리오입니다.\n\n소폭 조정만 하면 더욱 최적화할 수 있어요.',
  'B': '⚠️ 일부 개선이 필요합니다.\n\n아래 취약한 팩터를 중심으로 조정해보세요.',
  'C': '🔴 리밸런싱을 권장합니다.\n\n현재 상태로는 위험이 높을 수 있어요. 오늘의 액션을 꼭 확인해주세요.',
  'D': '🚨 긴급 조정이 필요합니다!\n\n포트폴리오가 매우 불안정한 상태예요. 즉시 리밸런싱을 실행해주세요.',
};

export default function HealthScoreSection({ healthScore }: HealthScoreSectionProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipContent, setTooltipContent] = useState({ title: '', description: '' });

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
      <Text style={s.suggestion}>
        {FACTOR_SUGGESTIONS[factor.label] || ''}
      </Text>
    );
  };

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

      {/* 등급별 상세 해석 */}
      <Text style={[s.summary, { color: healthScore.gradeColor }]}>
        {GRADE_INTERPRETATIONS[healthScore.grade]}
      </Text>

      {/* 6팩터 미니 바 (접힌 상태) — 툴팁 추가 */}
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

                {/* 툴팁 아이콘 */}
                <TouchableOpacity
                  onPress={() => showTooltip(factor.label)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={s.infoIcon}
                >
                  <Ionicons name="information-circle-outline" size={16} color="#888" />
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
            <View style={s.suggestionsSection}>
              <Text style={s.suggestionsTitle}>💡 개선 제안</Text>
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
          <View style={s.tooltipModal}>
            <View style={s.tooltipHeader}>
              <Text style={s.tooltipTitle}>{tooltipContent.title}</Text>
              <TouchableOpacity onPress={() => setTooltipVisible(false)}>
                <Ionicons name="close" size={20} color="#888" />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.tooltipScroll}>
              <Text style={s.tooltipDescription}>{tooltipContent.description}</Text>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  infoIcon: {
    marginLeft: 4,
  },
  detailContainer: {
    marginTop: 4,
  },
  // 개선 제안 섹션
  suggestionsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFC107',
    marginBottom: 12,
  },
  suggestion: {
    fontSize: 13,
    color: '#CF6679',
    lineHeight: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(207,102,121,0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#CF6679',
  },
  // 툴팁 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tooltipModal: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#333',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tooltipScroll: {
    maxHeight: 300,
  },
  tooltipDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
});
