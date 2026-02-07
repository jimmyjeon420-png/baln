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
} from 'react-native';
import Svg, { Path, Circle, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { EggPhase, EggCycleAnalysis, InvestmentAction } from '../types/kostolany';
import { EGG_CYCLE_PHASES, PHASE_TRANSITIONS } from '../constants/eggCycleData';

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

const KostolanyEggCard: React.FC<KostolanyEggCardProps> = ({
  analysis,
  interestRateText,
}) => {
  const [expanded, setExpanded] = useState(false);

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

  // ── 면책 ──
  disclaimer: {
    fontSize: 10,
    color: '#444',
    lineHeight: 15,
    textAlign: 'center',
  },
});

export default KostolanyEggCard;
