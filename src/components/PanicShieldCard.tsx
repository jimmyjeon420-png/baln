/**
 * Panic Shield Card - 포트폴리오 안정성 게이지
 * 행동재무학 기반 공포 지수 시각화
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

// Android 레이아웃 애니메이션 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { PanicSubScores } from '../services/gemini';

interface StopLossGuideline {
  ticker: string;
  name: string;
  suggestedStopLoss: number;
  currentLoss: number;
  action: 'HOLD' | 'WATCH' | 'CONSIDER_SELL';
}

interface PeerComparison {
  bracketLabel: string;  // "1~3억"
  avgScore: number;      // 구간 평균 점수
  sampleCount: number;   // 비교 대상 수
}

interface PanicShieldCardProps {
  index: number; // 0-100 (높을수록 안전)
  level: 'SAFE' | 'CAUTION' | 'DANGER';
  stopLossGuidelines: StopLossGuideline[];
  subScores?: PanicSubScores; // 5개 하위 지표
  peerComparison?: PeerComparison | null; // 또래 비교 데이터
}

// 서브스코어 바 색상 결정 (점수가 높을수록 안전 → 초록)
const getSubScoreColor = (score: number): string => {
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FFC107';
  return '#CF6679';
};

// 서브스코어 라벨 매핑
const SUB_SCORE_LABELS: { key: keyof PanicSubScores; label: string; icon: string }[] = [
  { key: 'portfolioLoss', label: '포트폴리오 손실률', icon: '📉' },
  { key: 'concentrationRisk', label: '자산 집중도', icon: '🎯' },
  { key: 'volatilityExposure', label: '변동성 노출', icon: '📊' },
  { key: 'stopLossProximity', label: '손절선 근접도', icon: '🚨' },
  { key: 'marketSentiment', label: '시장 심리', icon: '🧠' },
];

// 서브스코어별 PO 설명 (비개발자용)
const SUB_SCORE_DESCRIPTIONS: Record<keyof PanicSubScores, string> = {
  portfolioLoss: '현재 보유 종목들의 평균 손실률입니다. 점수가 높을수록 손실이 적어 안전합니다.',
  concentrationRisk: '특정 종목에 자산이 몰려있는 정도입니다. 분산이 잘 되어있으면 점수가 높습니다.',
  volatilityExposure: '보유 종목들의 가격 변동폭입니다. 안정적인 종목이 많을수록 점수가 높습니다.',
  stopLossProximity: '손절 기준선까지 얼마나 여유가 있는지입니다. 여유가 많을수록 높은 점수입니다.',
  marketSentiment: '현재 시장 전체의 투자 심리입니다. 시장이 안정적일수록 점수가 높습니다.',
};

export default function PanicShieldCard({
  index,
  level,
  stopLossGuidelines,
  subScores,
  peerComparison,
}: PanicShieldCardProps) {
  // 가이드 섹션 펼침/접힘 상태
  const [showGuide, setShowGuide] = useState(false);

  const toggleGuide = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowGuide(!showGuide);
  };
  // 레벨별 색상 및 메시지
  const levelConfig = {
    SAFE: {
      color: '#4CAF50',
      bgColor: '#1A2E1A',
      label: '안전',
      message: '포트폴리오가 안정적입니다',
      icon: 'shield-checkmark' as const,
    },
    CAUTION: {
      color: '#FFC107',
      bgColor: '#2E2A1A',
      label: '주의',
      message: '일부 자산 모니터링 필요',
      icon: 'alert-circle' as const,
    },
    DANGER: {
      color: '#CF6679',
      bgColor: '#2E1A1A',
      label: '위험',
      message: '포트폴리오 점검이 필요합니다',
      icon: 'warning' as const,
    },
  };

  const config = levelConfig[level];

  // 원형 게이지 설정
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (index / 100) * circumference;

  // 손절 가이드라인에서 주의/위험 항목만 필터링
  const alertItems = stopLossGuidelines.filter(
    (item) => item.action !== 'HOLD'
  );

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield" size={24} color={config.color} />
          <Text style={styles.title}>Panic Shield</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: config.color }]}>
          <Text style={styles.levelText}>{config.label}</Text>
        </View>
      </View>

      {/* 원형 게이지 */}
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* 배경 원 */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#333333"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* 진행 원 */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={config.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${progress} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        {/* 중앙 텍스트 */}
        <View style={styles.gaugeCenter}>
          <Text style={[styles.indexNumber, { color: config.color }]}>
            {index}
          </Text>
          <Text style={styles.indexLabel}>/ 100</Text>
        </View>
      </View>

      {/* 상태 메시지 */}
      <View style={styles.statusContainer}>
        <Ionicons name={config.icon} size={20} color={config.color} />
        <Text style={[styles.statusMessage, { color: config.color }]}>
          {config.message}
        </Text>
      </View>

      {/* 또래 비교 넛지 (sampleCount >= 3일 때만 표시) */}
      {peerComparison && peerComparison.sampleCount >= 3 && (
        <View style={styles.peerContainer}>
          <View style={styles.peerBadge}>
            <Ionicons name="people" size={14} color="#AAAAAA" />
            <Text style={styles.peerLabel}>
              {peerComparison.bracketLabel} 투자자 평균
            </Text>
            <Text style={[styles.peerAvgScore, { color: '#FFFFFF' }]}>
              {peerComparison.avgScore}점
            </Text>
          </View>
          {(() => {
            const diff = index - peerComparison.avgScore;
            if (diff === 0) return null;
            const isAbove = diff > 0;
            const color = isAbove ? '#4CAF50' : '#CF6679';
            const arrow = isAbove ? 'arrow-up' : 'arrow-down';
            const text = isAbove
              ? `평균보다 ${diff}점 높습니다`
              : `평균보다 ${Math.abs(diff)}점 낮습니다`;
            return (
              <View style={[styles.peerDiffBadge, { backgroundColor: `${color}15` }]}>
                <Ionicons name={arrow as any} size={12} color={color} />
                <Text style={[styles.peerDiffText, { color }]}>{text}</Text>
              </View>
            );
          })()}
          <Text style={styles.peerSampleText}>
            {peerComparison.sampleCount}명 기준
          </Text>
        </View>
      )}

      {/* PO 가이드: "이 점수는 무엇인가요?" */}
      <TouchableOpacity
        style={styles.guideToggle}
        onPress={toggleGuide}
        activeOpacity={0.7}
      >
        <Ionicons name="help-circle-outline" size={16} color="#888888" />
        <Text style={styles.guideToggleText}>
          이 점수는 무엇인가요?
        </Text>
        <Ionicons
          name={showGuide ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="#888888"
        />
      </TouchableOpacity>

      {showGuide && (
        <View style={styles.guideContainer}>
          {/* 개념 설명 + 학술 근거 */}
          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>Panic Shield란?</Text>
            <Text style={styles.guideText}>
              노벨경제학상 수상자 <Text style={styles.guideBold}>대니얼 카너먼</Text>의
              {' '}<Text style={styles.guideSource}>전망이론(Prospect Theory, 1979)</Text>에 따르면,
              사람은 동일한 금액이라도 <Text style={styles.guideBold}>이익보다 손실을 2배 이상 크게</Text>{' '}
              느낍니다. 이런 심리가 시장 급락 시 "패닉 셀링"을 유발합니다.
            </Text>
            <Text style={[styles.guideText, { marginTop: 8 }]}>
              Panic Shield는 CNN의{' '}
              <Text style={styles.guideSource}>Fear & Greed Index</Text> 방법론을
              개인 포트폴리오에 맞게 재설계한 <Text style={styles.guideBold}>방어력 점수</Text>입니다.
              CNN 지수가 시장 전체 심리를 7가지 지표로 측정하듯, Panic Shield는
              내 포트폴리오의 취약점을 5가지 관점에서 진단합니다.
            </Text>
          </View>

          {/* 점수 해석 */}
          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>점수 읽는 법</Text>
            <View style={styles.guideScoreRow}>
              <View style={[styles.guideScoreDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.guideScoreText}>
                <Text style={[styles.guideBold, { color: '#4CAF50' }]}>70~100 안전</Text> — 분산이 잘 되어있고, 급락에도 견딜 수 있는 구조
              </Text>
            </View>
            <View style={styles.guideScoreRow}>
              <View style={[styles.guideScoreDot, { backgroundColor: '#FFC107' }]} />
              <Text style={styles.guideScoreText}>
                <Text style={[styles.guideBold, { color: '#FFC107' }]}>40~69 주의</Text> — 일부 종목이 위험 신호를 보이고 있어 모니터링 필요
              </Text>
            </View>
            <View style={styles.guideScoreRow}>
              <View style={[styles.guideScoreDot, { backgroundColor: '#CF6679' }]} />
              <Text style={styles.guideScoreText}>
                <Text style={[styles.guideBold, { color: '#CF6679' }]}>0~39 위험</Text> — 손실이 크거나 특정 종목에 과도하게 집중되어 있음
              </Text>
            </View>
          </View>

          {/* 5개 하위 지표 설명 (CNN 대비) */}
          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>5가지 세부 지표</Text>
            <Text style={[styles.guideText, { marginBottom: 10 }]}>
              CNN Fear & Greed Index는 VIX(변동성), 풋/콜 비율, 정크본드 수요 등
              7개 <Text style={styles.guideBold}>시장 전체</Text> 지표를 봅니다.
              Panic Shield는 이를 <Text style={styles.guideBold}>내 포트폴리오</Text>에
              맞게 5가지로 재구성했습니다:
            </Text>
            {SUB_SCORE_LABELS.map(({ key, label, icon }) => (
              <View key={key} style={styles.guideItemRow}>
                <Text style={styles.guideItemIcon}>{icon}</Text>
                <View style={styles.guideItemContent}>
                  <Text style={styles.guideItemLabel}>{label}</Text>
                  <Text style={styles.guideItemDesc}>
                    {SUB_SCORE_DESCRIPTIONS[key]}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* 점수 산출 방식 + 토스 PO 넛지 */}
          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>점수 산출 방식</Text>
            <Text style={styles.guideText}>
              Google Gemini AI가 보유 종목의 수익률, 분산도, 시장 변동성, 뉴스 심리를
              실시간으로 종합 분석합니다. CNN의 7개 지표가 동일 가중치로 합산되듯,
              5개 하위 지표를 가중 평균하여 0~100점을 산출합니다.
            </Text>
          </View>

          {/* 출처 표시 */}
          <View style={[styles.guideSection, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.guideSectionTitle}>참고 자료</Text>
            <Text style={styles.guideSourceItem}>
              {'\u2022'} Kahneman & Tversky, "Prospect Theory" (Econometrica, 1979)
            </Text>
            <Text style={styles.guideSourceItem}>
              {'\u2022'} CNN Fear & Greed Index — 7개 시장심리 지표 종합
            </Text>
            <Text style={styles.guideSourceItem}>
              {'\u2022'} Finance Research Letters (2025) — "CNN F&G Index as predictor of US equity returns"
            </Text>
            <Text style={styles.guideSourceItem}>
              {'\u2022'} Zerodha Nudge, INDmoney — 행동재무학 기반 투자 넛지 사례
            </Text>
          </View>
        </View>
      )}

      {/* 서브스코어 분해 (CNN Fear & Greed 스타일) */}
      {subScores && (
        <View style={styles.subScoresContainer}>
          <Text style={styles.subScoresTitle}>📋 점수 분해</Text>
          {SUB_SCORE_LABELS.map(({ key, label, icon }) => {
            const score = subScores[key] ?? 0;
            const barColor = getSubScoreColor(score);
            return (
              <View key={key} style={styles.subScoreRow}>
                <View style={styles.subScoreLabelRow}>
                  <Text style={styles.subScoreIcon}>{icon}</Text>
                  <Text style={styles.subScoreLabel}>{label}</Text>
                  <Text style={[styles.subScoreValue, { color: barColor }]}>
                    {score}
                  </Text>
                </View>
                <View style={styles.subScoreBarBg}>
                  <View
                    style={[
                      styles.subScoreBarFill,
                      { width: `${score}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 손절 가이드라인 */}
      {alertItems.length > 0 && (
        <View style={styles.guidelinesContainer}>
          <Text style={styles.guidelinesTitle}>📉 손절 가이드라인</Text>
          {alertItems.slice(0, 3).map((item, idx) => (
            <View key={idx} style={styles.guidelineItem}>
              <View style={styles.guidelineLeft}>
                <Text style={styles.guidelineTicker}>{item.ticker}</Text>
                <Text style={styles.guidelineName}>{item.name}</Text>
              </View>
              <View style={styles.guidelineRight}>
                <Text
                  style={[
                    styles.guidelineLoss,
                    { color: (item.currentLoss ?? 0) < 0 ? '#CF6679' : '#4CAF50' },
                  ]}
                >
                  {(item.currentLoss ?? 0) >= 0 ? '+' : ''}{(item.currentLoss ?? 0).toFixed(1)}%
                </Text>
                <View
                  style={[
                    styles.actionBadge,
                    {
                      backgroundColor:
                        item.action === 'CONSIDER_SELL' ? '#CF6679' : '#FFC107',
                    },
                  ]}
                >
                  <Text style={styles.actionText}>
                    {item.action === 'WATCH' ? '주시' : '검토'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  indexNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  indexLabel: {
    fontSize: 14,
    color: '#888888',
    marginTop: -4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  statusMessage: {
    fontSize: 14,
    fontWeight: '500',
  },
  guidelinesContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAAAAA',
    marginBottom: 12,
  },
  guidelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  guidelineLeft: {
    flex: 1,
  },
  guidelineTicker: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  guidelineName: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  guidelineRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidelineLoss: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
  },
  // 서브스코어 스타일
  subScoresContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  subScoresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAAAAA',
    marginBottom: 14,
  },
  subScoreRow: {
    marginBottom: 12,
  },
  subScoreLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  subScoreIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  subScoreLabel: {
    flex: 1,
    fontSize: 12,
    color: '#CCCCCC',
  },
  subScoreValue: {
    fontSize: 12,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
  subScoreBarBg: {
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  subScoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // PO 가이드 스타일
  guideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  guideToggleText: {
    fontSize: 12,
    color: '#888888',
  },
  guideContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  guideSection: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  guideSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CCCCCC',
    marginBottom: 8,
  },
  guideText: {
    fontSize: 12,
    color: '#999999',
    lineHeight: 20,
  },
  guideBold: {
    fontWeight: '700',
    color: '#CCCCCC',
  },
  guideScoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  guideScoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  guideScoreText: {
    flex: 1,
    fontSize: 12,
    color: '#999999',
    lineHeight: 18,
  },
  guideItemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  guideItemIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  guideItemContent: {
    flex: 1,
  },
  guideItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 2,
  },
  guideItemDesc: {
    fontSize: 11,
    color: '#888888',
    lineHeight: 17,
  },
  guideSource: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#7B9EBF',
  },
  guideSourceItem: {
    fontSize: 11,
    color: '#777777',
    lineHeight: 18,
    marginBottom: 4,
  },
  // 또래 비교 넛지 스타일
  peerContainer: {
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  peerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  peerLabel: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  peerAvgScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  peerDiffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  peerDiffText: {
    fontSize: 12,
    fontWeight: '600',
  },
  peerSampleText: {
    fontSize: 10,
    color: '#666666',
  },
});
