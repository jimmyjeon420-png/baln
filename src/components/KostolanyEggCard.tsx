/**
 * 코스톨라니 달걀 모형 카드 — 처방전 세션 통합
 *
 * 역할: "시장이 왜 이런 상태인지" 설명하는 브릿지 카드
 * 배치: 시장 날씨(현상) ↔ 오늘의 액션(행동) 사이
 *
 * 콤팩트 뷰: 미니 달걀 + 한줄 요약 + 액션 배지
 * 상세 뷰: 큰 달걀 + 펀드매니저 분석(Bull/Bear) + 다음 시나리오
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { EggPhase, EggCycleAnalysis, InvestmentAction } from '../types/kostolany';
import { EGG_CYCLE_PHASES, PHASE_TRANSITIONS } from '../constants/eggCycleData';
import { useRateCycleEvidence } from '../hooks/useSharedAnalysis';
import type { RateCycleEvidence, EvidenceItem, EconIndicator, ConfidenceFactor } from '../services/centralKitchen';

// ══════════════════════════════════════════
// Props
// ══════════════════════════════════════════

interface KostolanyEggCardProps {
  analysis: EggCycleAnalysis;
  interestRateText?: string;  // 금리 확률 원문 (선택)
}

// ══════════════════════════════════════════
// 6단계 위치 (달걀 윤곽 위 시계방향)
// A1(12시) → A2(2시) → A3(4시) → B1(6시) → B2(8시) → B3(10시)
// ══════════════════════════════════════════

const PHASE_ORDER: EggPhase[] = [
  EggPhase.A1_CORRECTION,
  EggPhase.A2_ACCOMPANIMENT,
  EggPhase.A3_EXAGGERATION,
  EggPhase.B1_CORRECTION,
  EggPhase.B2_ACCOMPANIMENT,
  EggPhase.B3_EXAGGERATION,
];

// 달걀 윤곽 위 6개 지점 좌표 (가로 180 x 세로 150 기준)
// 달걀은 위가 좁고 아래가 넓은 형태 → 좌표 조정
const PHASE_POSITIONS: Record<EggPhase, { x: number; y: number }> = {
  [EggPhase.A1_CORRECTION]:    { x: 90,  y: 14 },   // 12시 (꼭대기)
  [EggPhase.A2_ACCOMPANIMENT]: { x: 150, y: 42 },   // 2시 (우상단)
  [EggPhase.A3_EXAGGERATION]:  { x: 160, y: 95 },   // 4시 (우하단)
  [EggPhase.B1_CORRECTION]:    { x: 90,  y: 138 },  // 6시 (바닥)
  [EggPhase.B2_ACCOMPANIMENT]: { x: 22,  y: 95 },   // 8시 (좌하단)
  [EggPhase.B3_EXAGGERATION]:  { x: 20,  y: 42 },   // 10시 (좌상단)
};

// 액션 색상
const ACTION_STYLE: Record<InvestmentAction, { bg: string; text: string; label: string }> = {
  [InvestmentAction.BUY]:  { bg: 'rgba(76,175,80,0.15)',  text: '#4CAF50', label: '매수' },
  [InvestmentAction.SELL]: { bg: 'rgba(207,102,121,0.15)', text: '#CF6679', label: '매도' },
  [InvestmentAction.HOLD]: { bg: 'rgba(136,136,136,0.15)', text: '#888888', label: '보유' },
};

// ══════════════════════════════════════════
// 펀드매니저 분석 데이터 (단계별)
// ══════════════════════════════════════════

interface FundManagerView {
  bullCase: string[];    // 상승 근거 (초록)
  bearCase: string[];    // 하락 위험 (빨강)
  nextTrigger: string;   // 다음 단계 전환 조건
}

const FUND_MANAGER_VIEWS: Record<EggPhase, FundManagerView> = {
  [EggPhase.A1_CORRECTION]: {
    bullCase: [
      '금리 고점 도달 → 인하 사이클 시작 임박',
      '극도의 비관론 = 역사적 최고의 매수 타이밍',
      '기업 실적 바닥 통과 신호 포착',
    ],
    bearCase: [
      '경기 침체 장기화 가능성 잔존',
      '추가 신용 경색 리스크 모니터링 필요',
      '투자자 심리 회복까지 시간 소요',
    ],
    nextTrigger: 'Fed 금리 인하 시작 시 A2(파도타기)로 전환',
  },
  [EggPhase.A2_ACCOMPANIMENT]: {
    bullCase: [
      'AI 생산성 혁명 → 디플레이션 압력 → 추가 인하 명분',
      '금리 하락 모멘텀 → 기업 이익 개선 사이클',
      '실질 금리 하락 → 자산 가격 리레이팅 진행 중',
    ],
    bearCase: [
      '핵심 인플레이션 목표 2% 미달성 → 인하 근거 약화',
      '관세 정책 → 수입 물가 상승 → 인플레 재발 리스크',
      'S&P P/E 30배 = 닷컴 이후 최고 → 밸류에이션 부담',
    ],
    nextTrigger: '금리가 저점에 도달하고 시장 과열 신호 출현 시 A3(과열)로 전환',
  },
  [EggPhase.A3_EXAGGERATION]: {
    bullCase: [
      '낮은 금리 환경이 혁신 기업에 유리',
      '유동성 풍부 → 추가 랠리 가능',
      '경기 확장 사이클 지속 가능성',
    ],
    bearCase: [
      '자산 가격이 내재 가치 초과 → 거품 영역',
      '투자자 과신 → FOMO 매수 급증 = 위험 신호',
      '금리 인상 시작 시 급격한 조정 불가피',
    ],
    nextTrigger: 'Fed 금리 인상 전환 시 B1(조정)으로 전환',
  },
  [EggPhase.B1_CORRECTION]: {
    bullCase: [
      '조정은 건강한 시장의 자연스러운 과정',
      '우량 종목 저가 매수 기회 형성',
      '기업 펀더멘털은 아직 건재',
    ],
    bearCase: [
      '금리 상승 초기 → 추가 긴축 가능성',
      '시장 심리 급격한 악화 → 투매 위험',
      '레버리지 청산 도미노 주의',
    ],
    nextTrigger: '금리 상승 지속 + 기업 실적 둔화 시 B2(하강)로 전환',
  },
  [EggPhase.B2_ACCOMPANIMENT]: {
    bullCase: [
      '하락장에서의 정기 적립식 투자 효과 극대화',
      '배당주/방어주 상대적 강세',
      '인플레이션 피크아웃 신호 출현 가능',
    ],
    bearCase: [
      '금리 상승 지속 → 경기 둔화 가속',
      '기업 실적 하향 조정 본격화',
      '신용 시장 긴축 → 유동성 위기 가능성',
    ],
    nextTrigger: '시장 극도의 공포 + 투매 완료 시 B3(과도하락)로 전환',
  },
  [EggPhase.B3_EXAGGERATION]: {
    bullCase: [
      '극도의 공포 = 다음 상승장의 전조',
      '자산 가격 내재가치 이하 → 매수 기회',
      '금리 인하 전환 기대감 형성',
    ],
    bearCase: [
      '추가 하락 가능성 — 바닥 확인 어려움',
      '경기 침체 현실화 → 실업률 상승',
      '투자자 심리 회복까지 수개월 소요',
    ],
    nextTrigger: '금리 고점 확인 + 인하 전환 시 A1(조정/매수)로 전환',
  },
};

// ══════════════════════════════════════════
// 미니 달걀 SVG 컴포넌트
// ══════════════════════════════════════════

const MiniEggDiagram: React.FC<{ currentPhase: EggPhase }> = ({ currentPhase }) => {
  const width = 180;
  const height = 150;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        {/* 현재 단계 글로우 효과 */}
        <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={EGG_CYCLE_PHASES[currentPhase].color} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={EGG_CYCLE_PHASES[currentPhase].color} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* 달걀 윤곽 (위가 좁고 아래가 넓은 계란 형태) */}
      <Path
        d="M90 8 C130 8, 168 40, 168 80 C168 120, 140 146, 90 146 C40 146, 12 120, 12 80 C12 40, 50 8, 90 8 Z"
        fill="none"
        stroke="#2A2A2A"
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />

      {/* 좌측 라벨: 금리 하락 (A단계) */}
      <G>
        <Circle cx={6} cy={68} r={2} fill="#4CAF50" opacity={0.6} />
      </G>

      {/* 우측 라벨: 금리 상승 (B단계) - 실제로는 좌측이 B */}

      {/* 시계방향 화살표 힌트 (12시 → 2시 방향) */}
      <Path
        d="M100 12 L107 18 L100 18"
        fill="none"
        stroke="#444"
        strokeWidth={1}
      />

      {/* 6개 단계 마커 */}
      {PHASE_ORDER.map((phase) => {
        const pos = PHASE_POSITIONS[phase];
        const isActive = phase === currentPhase;
        const phaseInfo = EGG_CYCLE_PHASES[phase];
        const isAPhase = phase.startsWith('A');

        return (
          <G key={phase}>
            {/* 글로우 (현재 단계만) */}
            {isActive && (
              <Circle
                cx={pos.x}
                cy={pos.y}
                r={16}
                fill="url(#glowGrad)"
              />
            )}
            {/* 마커 원 */}
            <Circle
              cx={pos.x}
              cy={pos.y}
              r={isActive ? 8 : 5}
              fill={isActive ? phaseInfo.color : '#2A2A2A'}
              stroke={isActive ? phaseInfo.color : isAPhase ? '#4CAF5040' : '#CF667940'}
              strokeWidth={isActive ? 2 : 1}
            />
            {/* 단계 레이블 (짧은 코드) */}
            {!isActive && (
              <>
                {/* 비활성 단계의 짧은 텍스트 — SVG Text 대신 네이티브 오버레이 사용 */}
              </>
            )}
          </G>
        );
      })}
    </Svg>
  );
};

// ══════════════════════════════════════════
// 메인 카드 컴포넌트
// ══════════════════════════════════════════

// ══════════════════════════════════════════
// 증거 딥다이브 하위 컴포넌트들
// ══════════════════════════════════════════

/** 스탠스(매파/비둘기파) 배지 색상 */
const STANCE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  hawkish: { bg: 'rgba(207,102,121,0.15)', text: '#CF6679', label: '매파' },
  dovish:  { bg: 'rgba(76,175,80,0.15)',  text: '#4CAF50', label: '비둘기파' },
  neutral: { bg: 'rgba(136,136,136,0.15)', text: '#888',    label: '중립' },
};

/** 영향도 배지 */
const IMPACT_LABELS: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

/** A. 핵심 뉴스 증거 섹션 */
const EvidenceSection: React.FC<{ items: EvidenceItem[] }> = ({ items }) => (
  <View style={evidStyles.section}>
    <View style={evidStyles.sectionHeader}>
      <Ionicons name="newspaper-outline" size={14} color="#FFC107" />
      <Text style={evidStyles.sectionTitle}>핵심 뉴스 증거</Text>
    </View>
    {items.map((item, idx) => {
      const stanceStyle = STANCE_COLORS[item.stance] || STANCE_COLORS.neutral;
      return (
        <View key={idx} style={evidStyles.evidenceItem}>
          <View style={evidStyles.evidenceRow}>
            <Text style={evidStyles.evidenceHeadline} numberOfLines={2}>
              {item.headline}
            </Text>
          </View>
          <View style={evidStyles.evidenceMetaRow}>
            <Text style={evidStyles.evidenceSource}>{item.source}</Text>
            <View style={[evidStyles.stanceBadge, { backgroundColor: stanceStyle.bg }]}>
              <Text style={[evidStyles.stanceBadgeText, { color: stanceStyle.text }]}>
                {stanceStyle.label}
              </Text>
            </View>
            {item.impact && (
              <Text style={evidStyles.impactText}>
                영향: {IMPACT_LABELS[item.impact] || item.impact}
              </Text>
            )}
          </View>
        </View>
      );
    })}
  </View>
);

/** B. 경제 지표 대시보드 섹션 */
const IndicatorCard: React.FC<{ indicator: EconIndicator; fullWidth?: boolean }> = ({
  indicator,
  fullWidth,
}) => {
  const trendIcon = indicator.trend === 'rising' ? 'trending-up' :
                    indicator.trend === 'falling' ? 'trending-down' : 'remove';
  const trendColor = indicator.trend === 'rising' ? '#CF6679' :
                     indicator.trend === 'falling' ? '#4CAF50' : '#888';

  return (
    <View style={[evidStyles.indicatorCard, fullWidth && { width: '100%' }]}>
      <Text style={evidStyles.indicatorName}>{indicator.name}</Text>
      <View style={evidStyles.indicatorValueRow}>
        <Text style={evidStyles.indicatorValue}>{indicator.value}</Text>
        <Ionicons name={trendIcon as any} size={12} color={trendColor} />
      </View>
      <Text style={evidStyles.indicatorPrev}>이전: {indicator.previous}</Text>
      {indicator.nextRelease && (
        <Text style={evidStyles.indicatorNext}>다음: {indicator.nextRelease}</Text>
      )}
    </View>
  );
};

const IndicatorsSection: React.FC<{ indicators: RateCycleEvidence['economicIndicators'] }> = ({
  indicators,
}) => (
  <View style={evidStyles.section}>
    <View style={evidStyles.sectionHeader}>
      <Ionicons name="stats-chart-outline" size={14} color="#64B5F6" />
      <Text style={evidStyles.sectionTitle}>경제 지표 대시보드</Text>
    </View>
    {/* Fed 기준금리 — 풀와이드 */}
    <IndicatorCard indicator={indicators.fedRate} fullWidth />
    {/* 2x2 그리드: CPI, 실업률, 수익률곡선, PCE코어 */}
    <View style={evidStyles.indicatorGrid}>
      <IndicatorCard indicator={indicators.cpi} />
      <IndicatorCard indicator={indicators.unemployment} />
      <IndicatorCard indicator={indicators.yieldCurveSpread} />
      <IndicatorCard indicator={indicators.pceCore} />
    </View>
  </View>
);

/** C. 매파 vs 비둘기파 섹션 */
const ExpertSection: React.FC<{ perspectives: RateCycleEvidence['expertPerspectives'] }> = ({
  perspectives,
}) => {
  const hawkishRatio = perspectives.ratio;
  const dovishRatio = 100 - hawkishRatio;

  return (
    <View style={evidStyles.section}>
      <View style={evidStyles.sectionHeader}>
        <Ionicons name="people-outline" size={14} color="#CE93D8" />
        <Text style={evidStyles.sectionTitle}>매파 vs 비둘기파</Text>
      </View>

      {/* 비율 바 */}
      <View style={evidStyles.ratioBar}>
        <View style={[evidStyles.ratioFill, { width: `${hawkishRatio}%`, backgroundColor: '#CF6679' }]}>
          {hawkishRatio >= 20 && (
            <Text style={evidStyles.ratioText}>매파 {hawkishRatio}%</Text>
          )}
        </View>
        <View style={[evidStyles.ratioFill, { width: `${dovishRatio}%`, backgroundColor: '#4CAF50' }]}>
          {dovishRatio >= 20 && (
            <Text style={evidStyles.ratioText}>비둘기파 {dovishRatio}%</Text>
          )}
        </View>
      </View>

      {/* 매파 진영 */}
      <View style={evidStyles.campBox}>
        <View style={evidStyles.campHeader}>
          <Ionicons name="arrow-up-circle" size={12} color="#CF6679" />
          <Text style={[evidStyles.campTitle, { color: '#CF6679' }]}>매파 (긴축 선호)</Text>
        </View>
        {perspectives.hawkishArgs.map((arg, i) => (
          <View key={i} style={evidStyles.argRow}>
            <View style={[evidStyles.argBullet, { backgroundColor: '#CF6679' }]} />
            <Text style={evidStyles.argText}>{arg}</Text>
          </View>
        ))}
        {perspectives.hawkishFigures.length > 0 && (
          <Text style={evidStyles.figuresText}>
            대표: {perspectives.hawkishFigures.join(', ')}
          </Text>
        )}
      </View>

      {/* 비둘기파 진영 */}
      <View style={[evidStyles.campBox, { marginTop: 8 }]}>
        <View style={evidStyles.campHeader}>
          <Ionicons name="arrow-down-circle" size={12} color="#4CAF50" />
          <Text style={[evidStyles.campTitle, { color: '#4CAF50' }]}>비둘기파 (완화 선호)</Text>
        </View>
        {perspectives.dovishArgs.map((arg, i) => (
          <View key={i} style={evidStyles.argRow}>
            <View style={[evidStyles.argBullet, { backgroundColor: '#4CAF50' }]} />
            <Text style={evidStyles.argText}>{arg}</Text>
          </View>
        ))}
        {perspectives.dovishFigures.length > 0 && (
          <Text style={evidStyles.figuresText}>
            대표: {perspectives.dovishFigures.join(', ')}
          </Text>
        )}
      </View>
    </View>
  );
};

/** D. 판단 신뢰도 섹션 */
const ConfidenceSection: React.FC<{
  overall: number;
  factors: ConfidenceFactor[];
}> = ({ overall, factors }) => {
  const barColor = overall >= 70 ? '#4CAF50' : overall >= 40 ? '#FFC107' : '#CF6679';
  const WEIGHT_LABELS: Record<string, string> = { strong: '강', medium: '중', weak: '약' };

  return (
    <View style={evidStyles.section}>
      <View style={evidStyles.sectionHeader}>
        <Ionicons name="shield-checkmark-outline" size={14} color="#4CAF50" />
        <Text style={evidStyles.sectionTitle}>판단 신뢰도</Text>
      </View>

      {/* 프로그레스 바 */}
      <View style={evidStyles.progressContainer}>
        <View style={evidStyles.progressBar}>
          <View style={[evidStyles.progressFill, { width: `${overall}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[evidStyles.progressLabel, { color: barColor }]}>{overall}%</Text>
      </View>

      {/* 지지/반론 요인 */}
      {factors.map((f, i) => (
        <View key={i} style={evidStyles.factorRow}>
          <Ionicons
            name={f.type === 'supporting' ? 'checkmark-circle' : 'alert-circle'}
            size={12}
            color={f.type === 'supporting' ? '#4CAF50' : '#CF6679'}
          />
          <Text style={evidStyles.factorText}>{f.factor}</Text>
          <View style={[
            evidStyles.weightBadge,
            { backgroundColor: f.weight === 'strong' ? 'rgba(255,255,255,0.12)' :
                               f.weight === 'medium' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }
          ]}>
            <Text style={evidStyles.weightText}>{WEIGHT_LABELS[f.weight] || f.weight}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// ══════════════════════════════════════════
// 메인 카드 컴포넌트
// ══════════════════════════════════════════

const KostolanyEggCard: React.FC<KostolanyEggCardProps> = ({
  analysis,
  interestRateText,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  // 2차 확장 시에만 DB 조회 (lazy loading)
  const {
    data: evidence,
    isLoading: evidenceLoading,
  } = useRateCycleEvidence(evidenceExpanded);

  const phaseInfo = EGG_CYCLE_PHASES[analysis.currentPhase];
  const actionStyle = ACTION_STYLE[analysis.action];
  const fundManagerView = FUND_MANAGER_VIEWS[analysis.currentPhase];
  const nextPhaseInfo = EGG_CYCLE_PHASES[analysis.nextPhase];
  const transition = PHASE_TRANSITIONS[analysis.currentPhase];

  // A단계(상승장) vs B단계(하락장) 레이블
  const isAPhase = analysis.currentPhase.startsWith('A');
  const cycleLabel = isAPhase ? '상승 사이클' : '하락 사이클';
  const cycleBg = isAPhase ? 'rgba(76,175,80,0.12)' : 'rgba(207,102,121,0.12)';
  const cycleColor = isAPhase ? '#4CAF50' : '#CF6679';

  return (
    <View style={styles.card}>
      {/* ─── 헤더 ─── */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.cardLabel}>금리 사이클 나침반</Text>
            <Text style={styles.cardLabelEn}>MARKET CYCLE</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* 현재 단계 배지 */}
          <View style={[styles.phaseBadge, { backgroundColor: phaseInfo.color + '20' }]}>
            <Text style={[styles.phaseBadgeText, { color: phaseInfo.color }]}>
              {phaseInfo.emoji} {phaseInfo.titleKorean}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#666"
          />
        </View>
      </TouchableOpacity>

      {/* ─── 콤팩트 뷰 (항상 표시) ─── */}
      <View style={styles.compactBody}>
        {/* 미니 달걀 + 요약 나란히 */}
        <View style={styles.compactRow}>
          {/* 미니 달걀 다이어그램 */}
          <View style={styles.miniEggContainer}>
            <MiniEggDiagram currentPhase={analysis.currentPhase} />
            {/* 단계 라벨 오버레이 */}
            {PHASE_ORDER.map((phase) => {
              const pos = PHASE_POSITIONS[phase];
              const isActive = phase === analysis.currentPhase;
              if (isActive) return null; // 활성 단계는 별도 표시
              const pi = EGG_CYCLE_PHASES[phase];
              return (
                <Text
                  key={phase}
                  style={[
                    styles.phaseLabel,
                    {
                      left: pos.x - 10,
                      top: pos.y + 10,
                      color: '#555',
                    },
                  ]}
                >
                  {phase.split('_')[0]}
                </Text>
              );
            })}
            {/* 활성 단계 라벨 (강조) */}
            {(() => {
              const pos = PHASE_POSITIONS[analysis.currentPhase];
              return (
                <Text
                  style={[
                    styles.phaseLabel,
                    {
                      left: pos.x - 14,
                      top: pos.y + 12,
                      color: phaseInfo.color,
                      fontWeight: '700',
                      fontSize: 11,
                    },
                  ]}
                >
                  {analysis.currentPhase.split('_')[0]}
                </Text>
              );
            })()}
          </View>

          {/* 요약 정보 */}
          <View style={styles.compactInfo}>
            {/* 사이클 레이블 */}
            <View style={[styles.cycleBadge, { backgroundColor: cycleBg }]}>
              <View style={[styles.cycleDot, { backgroundColor: cycleColor }]} />
              <Text style={[styles.cycleText, { color: cycleColor }]}>{cycleLabel}</Text>
            </View>

            {/* 한줄 설명 */}
            <Text style={styles.summaryText} numberOfLines={2}>
              {phaseInfo.subtitle}
            </Text>

            {/* 추천 액션 배지 */}
            <View style={[styles.actionBadge, { backgroundColor: actionStyle.bg }]}>
              <Text style={[styles.actionBadgeText, { color: actionStyle.text }]}>
                {analysis.actionKorean}
              </Text>
              <Text style={styles.confidenceText}>
                신뢰도 {analysis.confidence}%
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ─── 코스톨라니 달걀 가이드 (펼치기) ─── */}
      <TouchableOpacity
        style={styles.guideToggle}
        onPress={() => setGuideExpanded(!guideExpanded)}
        activeOpacity={0.7}
      >
        <Ionicons name="help-circle-outline" size={14} color="#666" />
        <Text style={styles.guideToggleText}>코스톨라니 달걀이란?</Text>
        <Ionicons
          name={guideExpanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color="#555"
        />
      </TouchableOpacity>

      {guideExpanded && (
        <View style={styles.guideBody}>
          <Text style={styles.guideIntro}>
            앙드레 코스톨라니(1906-1999)는 유럽의 전설적 투자자로,{'\n'}
            금리와 주식시장의 관계를 <Text style={styles.guideBold}>달걀 형태의 순환 모형</Text>으로 설명했습니다.
          </Text>

          {/* 핵심 원리 */}
          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>핵심 원리</Text>
            <Text style={styles.guideText}>
              금리가 오르면 주식이 하락하고, 금리가 내리면 주식이 상승하는 사이클이 달걀(타원) 위를 시계방향으로 돌며 반복됩니다.
            </Text>
          </View>

          {/* 6단계 설명 */}
          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>6단계 순환</Text>
            <View style={styles.guideCycleRow}>
              <View style={[styles.guideCycleBadge, { backgroundColor: 'rgba(76,175,80,0.12)' }]}>
                <Text style={[styles.guideCycleBadgeText, { color: '#4CAF50' }]}>A 상승장</Text>
              </View>
              <Text style={styles.guideCycleDesc}>금리 하락 → 주식 상승</Text>
            </View>
            <View style={styles.guideSteps}>
              <Text style={styles.guideStepText}>
                <Text style={{ color: '#4CAF50' }}>A1</Text> 조정(매수 기회) → <Text style={{ color: '#66BB6A' }}>A2</Text> 파도타기(보유) → <Text style={{ color: '#FFC107' }}>A3</Text> 과열(매도 신호)
              </Text>
            </View>

            <View style={[styles.guideCycleRow, { marginTop: 8 }]}>
              <View style={[styles.guideCycleBadge, { backgroundColor: 'rgba(207,102,121,0.12)' }]}>
                <Text style={[styles.guideCycleBadgeText, { color: '#CF6679' }]}>B 하락장</Text>
              </View>
              <Text style={styles.guideCycleDesc}>금리 상승 → 주식 하락</Text>
            </View>
            <View style={styles.guideSteps}>
              <Text style={styles.guideStepText}>
                <Text style={{ color: '#CF6679' }}>B1</Text> 조정(익절) → <Text style={{ color: '#EF5350' }}>B2</Text> 하강(방어) → <Text style={{ color: '#C62828' }}>B3</Text> 과도하락(바닥)
              </Text>
            </View>
          </View>

          {/* 한줄 명언 */}
          <View style={styles.guideQuote}>
            <Text style={styles.guideQuoteText}>
              "모두가 팔 때 사고, 모두가 살 때 팔아라"
            </Text>
            <Text style={styles.guideQuoteAuthor}>— 앙드레 코스톨라니</Text>
          </View>
        </View>
      )}

      {/* ─── 상세 뷰 (펼침) ─── */}
      {expanded && (
        <View style={styles.detailBody}>
          <View style={styles.detailDivider} />

          {/* 현재 단계 설명 */}
          <View style={styles.phaseDescBox}>
            <Text style={styles.phaseDescTitle}>
              {phaseInfo.emoji} {phaseInfo.titleKorean} — {phaseInfo.title}
            </Text>
            <Text style={styles.phaseDescText}>
              {analysis.description}
            </Text>
          </View>

          {/* 금리 원문 (있으면 표시) */}
          {interestRateText && (
            <View style={styles.rateOriginal}>
              <Ionicons name="trending-up" size={12} color="#FFC107" />
              <Text style={styles.rateOriginalText}>{interestRateText}</Text>
            </View>
          )}

          {/* ─── 펀드매니저의 시각 ─── */}
          <View style={styles.fundManagerSection}>
            <Text style={styles.fundManagerTitle}>펀드매니저의 시각</Text>

            {/* Bull Case (초록) */}
            <View style={styles.caseBox}>
              <View style={styles.caseHeader}>
                <Ionicons name="arrow-up-circle" size={14} color="#4CAF50" />
                <Text style={[styles.caseHeaderText, { color: '#4CAF50' }]}>상승 근거</Text>
              </View>
              {fundManagerView.bullCase.map((item, idx) => (
                <View key={idx} style={styles.caseItem}>
                  <View style={[styles.caseBullet, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.caseItemText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Bear Case (빨강) */}
            <View style={[styles.caseBox, { marginTop: 10 }]}>
              <View style={styles.caseHeader}>
                <Ionicons name="arrow-down-circle" size={14} color="#CF6679" />
                <Text style={[styles.caseHeaderText, { color: '#CF6679' }]}>반론 / 위험 요인</Text>
              </View>
              {fundManagerView.bearCase.map((item, idx) => (
                <View key={idx} style={styles.caseItem}>
                  <View style={[styles.caseBullet, { backgroundColor: '#CF6679' }]} />
                  <Text style={styles.caseItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ─── 다음 시나리오 ─── */}
          <View style={styles.nextScenario}>
            <Ionicons name="arrow-forward-circle" size={14} color="#FFC107" />
            <View style={styles.nextScenarioContent}>
              <Text style={styles.nextScenarioLabel}>
                다음 시나리오: {nextPhaseInfo.emoji} {nextPhaseInfo.titleKorean}
              </Text>
              <Text style={styles.nextScenarioText}>
                {fundManagerView.nextTrigger}
              </Text>
            </View>
          </View>

          {/* ─── "왜 이 판단인가?" 2차 확장 버튼 ─── */}
          <TouchableOpacity
            style={styles.evidenceToggle}
            onPress={() => setEvidenceExpanded(!evidenceExpanded)}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={14} color="#64B5F6" />
            <Text style={styles.evidenceToggleText}>왜 이 판단인가?</Text>
            <Ionicons
              name={evidenceExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color="#64B5F6"
            />
          </TouchableOpacity>

          {/* ─── 2차 확장: 증거 딥다이브 ─── */}
          {evidenceExpanded && (
            <View style={styles.evidenceBody}>
              {evidenceLoading ? (
                <View style={styles.evidenceLoading}>
                  <ActivityIndicator size="small" color="#64B5F6" />
                  <Text style={styles.evidenceLoadingText}>증거 데이터 로딩 중...</Text>
                </View>
              ) : evidence ? (
                <>
                  {/* A. 핵심 뉴스 증거 */}
                  {evidence.keyEvidence?.length > 0 && (
                    <EvidenceSection items={evidence.keyEvidence} />
                  )}

                  {/* B. 경제 지표 대시보드 */}
                  {evidence.economicIndicators && (
                    <IndicatorsSection indicators={evidence.economicIndicators} />
                  )}

                  {/* C. 매파 vs 비둘기파 */}
                  {evidence.expertPerspectives && (
                    <ExpertSection perspectives={evidence.expertPerspectives} />
                  )}

                  {/* D. 판단 신뢰도 */}
                  {evidence.confidenceFactors && (
                    <ConfidenceSection
                      overall={evidence.confidenceFactors.overall}
                      factors={evidence.confidenceFactors.factors}
                    />
                  )}

                  {/* 생성 시각 */}
                  {evidence.generatedAt && (
                    <Text style={styles.evidenceTimestamp}>
                      데이터 기준: {new Date(evidence.generatedAt).toLocaleString('ko-KR')}
                    </Text>
                  )}
                </>
              ) : (
                <View style={styles.evidenceEmpty}>
                  <Ionicons name="time-outline" size={20} color="#555" />
                  <Text style={styles.evidenceEmptyText}>
                    데이터 준비 중{'\n'}매일 오전 7시에 업데이트됩니다
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ─── 면책 ─── */}
          <Text style={styles.disclaimer}>
            코스톨라니 모형은 참고 지표이며 투자 결정의 근거가 아닙니다.
            실제 투자는 전문가 상담 후 결정하세요.
          </Text>
        </View>
      )}
    </View>
  );
};

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },

  // ── 헤더 ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardLabelEn: {
    fontSize: 10,
    color: '#555',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  phaseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phaseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── 콤팩트 뷰 ──
  compactBody: {
    marginTop: 14,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniEggContainer: {
    width: 180,
    height: 150,
    position: 'relative',
  },
  phaseLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    width: 28,
  },
  compactInfo: {
    flex: 1,
    gap: 8,
  },
  cycleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  cycleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  cycleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 13,
    color: '#BBB',
    lineHeight: 19,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confidenceText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },

  // ── 상세 뷰 ──
  detailBody: {
    marginTop: 4,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#222',
    marginBottom: 14,
  },
  phaseDescBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  phaseDescTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 6,
  },
  phaseDescText: {
    fontSize: 12,
    color: '#AAA',
    lineHeight: 19,
  },
  rateOriginal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,193,7,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
    marginBottom: 14,
  },
  rateOriginalText: {
    fontSize: 12,
    color: '#FFC107',
    fontWeight: '500',
  },

  // ── 펀드매니저 섹션 ──
  fundManagerSection: {
    marginBottom: 14,
  },
  fundManagerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 10,
  },
  caseBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  caseHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  caseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  caseBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
  },
  caseItemText: {
    flex: 1,
    fontSize: 12,
    color: '#AAA',
    lineHeight: 18,
  },

  // ── 다음 시나리오 ──
  nextScenario: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,193,7,0.06)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.1)',
  },
  nextScenarioContent: {
    flex: 1,
  },
  nextScenarioLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFC107',
    marginBottom: 4,
  },
  nextScenarioText: {
    fontSize: 11,
    color: '#999',
    lineHeight: 17,
  },

  // ── 2차 확장 (증거 딥다이브) ──
  evidenceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(100,181,246,0.08)',
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(100,181,246,0.15)',
  },
  evidenceToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64B5F6',
  },
  evidenceBody: {
    marginBottom: 14,
  },
  evidenceLoading: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  evidenceLoadingText: {
    fontSize: 12,
    color: '#666',
  },
  evidenceEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  evidenceEmptyText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 18,
  },
  evidenceTimestamp: {
    fontSize: 10,
    color: '#444',
    textAlign: 'right',
    marginTop: 8,
  },

  // ── 면책 ──
  disclaimer: {
    fontSize: 10,
    color: '#444',
    lineHeight: 15,
    textAlign: 'center',
  },

  // ── 코스톨라니 가이드 ──
  guideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 10,
    paddingVertical: 4,
  },
  guideToggleText: {
    fontSize: 12,
    color: '#666',
  },
  guideBody: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#252525',
  },
  guideIntro: {
    fontSize: 12,
    color: '#AAA',
    lineHeight: 20,
    marginBottom: 12,
  },
  guideBold: {
    color: '#DDD',
    fontWeight: '700',
  },
  guideSection: {
    marginBottom: 12,
  },
  guideSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DDD',
    marginBottom: 6,
  },
  guideText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 19,
  },
  guideCycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideCycleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guideCycleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  guideCycleDesc: {
    fontSize: 11,
    color: '#888',
  },
  guideSteps: {
    marginTop: 4,
    marginLeft: 4,
  },
  guideStepText: {
    fontSize: 11,
    color: '#777',
    lineHeight: 18,
  },
  guideQuote: {
    backgroundColor: 'rgba(255,193,7,0.06)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  guideQuoteText: {
    fontSize: 12,
    color: '#FFC107',
    fontStyle: 'italic',
    fontWeight: '600',
    lineHeight: 18,
  },
  guideQuoteAuthor: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
});

// ══════════════════════════════════════════
// 증거 딥다이브 섹션 전용 스타일
// ══════════════════════════════════════════

const evidStyles = StyleSheet.create({
  // ── 공통 섹션 ──
  section: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DDD',
  },

  // ── A. 핵심 뉴스 증거 ──
  evidenceItem: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  evidenceRow: {
    marginBottom: 6,
  },
  evidenceHeadline: {
    fontSize: 12,
    color: '#CCC',
    lineHeight: 18,
    fontWeight: '500',
  },
  evidenceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  evidenceSource: {
    fontSize: 10,
    color: '#666',
  },
  stanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stanceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  impactText: {
    fontSize: 9,
    color: '#555',
  },

  // ── B. 경제 지표 ──
  indicatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  indicatorCard: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 10,
    width: '48.5%',
    marginBottom: 0,
  },
  indicatorName: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  indicatorValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  indicatorValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  indicatorPrev: {
    fontSize: 9,
    color: '#555',
  },
  indicatorNext: {
    fontSize: 9,
    color: '#FFC107',
    marginTop: 2,
  },

  // ── C. 매파 vs 비둘기파 ──
  ratioBar: {
    flexDirection: 'row',
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  ratioFill: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratioText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  campBox: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 10,
  },
  campHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  campTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  argRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  argBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 5,
  },
  argText: {
    flex: 1,
    fontSize: 11,
    color: '#AAA',
    lineHeight: 17,
  },
  figuresText: {
    fontSize: 10,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // ── D. 판단 신뢰도 ──
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingVertical: 2,
  },
  factorText: {
    flex: 1,
    fontSize: 11,
    color: '#AAA',
    lineHeight: 16,
  },
  weightBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  weightText: {
    fontSize: 9,
    color: '#888',
    fontWeight: '600',
  },
});

export default KostolanyEggCard;
