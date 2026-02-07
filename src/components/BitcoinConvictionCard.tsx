/**
 * Bitcoin Conviction Card - 비트코인 확신 지수 카드
 * CNN Fear & Greed 스타일 원형 게이지 + 5개 팩터 분해
 *
 * [개선] 비개발자/비전문가 고객도 이해할 수 있도록
 * 각 팩터에 쉬운 설명 + 점수별 맥락 메시지 추가
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import {
  BitcoinIntelligenceResult,
  BitcoinSubScores,
  ZONE_CONFIG,
} from '../services/bitcoinIntelligence';

interface BitcoinConvictionCardProps {
  data: BitcoinIntelligenceResult;
}

// 서브스코어 바 색상 결정
const getSubScoreColor = (score: number): string => {
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FFB74D';
  return '#CF6679';
};

// 점수 수준별 맥락 메시지 (고객이 "이 점수가 나한테 어떤 의미인지" 알 수 있도록)
function getScoreContext(key: keyof BitcoinSubScores, score: number): string {
  if (key === 'fearGreed') {
    if (score >= 70) return '시장이 과열 상태예요. 신중한 접근이 필요합니다';
    if (score >= 40) return '시장 분위기가 평온합니다';
    return '시장이 공포 상태예요. 역사적으로 매수 기회일 수 있습니다';
  }
  if (key === 'momentum7d') {
    if (score >= 70) return '단기 상승 흐름이 강해요';
    if (score >= 40) return '단기적으로 큰 움직임 없이 안정적이에요';
    return '단기 하락 흐름이에요. 추가 하락 가능성 주시';
  }
  if (key === 'momentum30d') {
    if (score >= 70) return '중기 상승 추세가 견고해요';
    if (score >= 40) return '중기적으로 방향성을 탐색 중이에요';
    return '중기 하락 추세예요. 반등 시점 주시';
  }
  if (key === 'hashrate') {
    if (score >= 70) return '네트워크 매우 건강 → 채굴자들의 장기 투자 확신 강함';
    if (score >= 40) return '네트워크 안정적 → 채굴 인프라 정상 가동 중';
    return '해시레이트 하락 → 채굴자 이탈 신호, 네트워크 주의 필요';
  }
  if (key === 'dominance') {
    if (score >= 70) return '비트코인 집중 현상 → 안전자산 선호 강함';
    if (score >= 40) return '비트코인과 알트코인 균형 상태';
    return '알트코인으로 자금 분산 중 → 위험 선호 증가';
  }
  // aiAnalysis
  if (score >= 70) return 'AI가 긍정적 투자 환경으로 판단했어요';
  if (score >= 40) return 'AI가 혼재된 시그널을 감지했어요';
  return 'AI가 부정적 요인이 우세하다고 판단했어요';
}

// 종합 점수에 대한 해석 메시지
function getCompositeInterpretation(score: number): { title: string; message: string } {
  if (score >= 80) return {
    title: '매우 강한 확신',
    message: '대부분의 지표가 긍정적이에요. 다만, 과열 시그널일 수도 있으니 분할 매수를 고려하세요.',
  };
  if (score >= 60) return {
    title: '적당한 확신',
    message: '긍정적 요인이 우세하지만, 일부 주의 신호도 있어요. 기존 보유라면 유지, 추가 매수는 소량으로.',
  };
  if (score >= 40) return {
    title: '관망 구간',
    message: '긍정과 부정이 혼재되어 있어요. 급하게 움직이기보다 추세를 지켜보세요.',
  };
  if (score >= 20) return {
    title: '주의 구간',
    message: '부정적 시그널이 우세해요. 추가 매수보다는 현금 비중을 늘리는 것을 고려하세요.',
  };
  return {
    title: '극도의 공포',
    message: '시장이 극도로 위축되었어요. 장기 투자 관점에서는 분할 매수 기회일 수 있습니다.',
  };
}

// 6개 팩터: 쉬운 이름 + 한 줄 설명
const SUB_SCORE_CONFIG: {
  key: keyof BitcoinSubScores;
  label: string;
  desc: string;
  icon: string;
  weight: string;
}[] = [
  {
    key: 'fearGreed',
    label: '시장 심리 온도',
    desc: '전 세계 투자자들이 지금 공포를 느끼는지, 탐욕을 느끼는지',
    icon: '🌡️',
    weight: '20%',
  },
  {
    key: 'momentum7d',
    label: '최근 1주일 흐름',
    desc: '지난 7일간 비트코인 가격이 어느 방향으로 움직였는지',
    icon: '📈',
    weight: '10%',
  },
  {
    key: 'momentum30d',
    label: '최근 1개월 추세',
    desc: '지난 30일간 중기 가격 흐름이 상승인지 하락인지',
    icon: '📊',
    weight: '10%',
  },
  {
    key: 'hashrate',
    label: '해시레이트 건강도',
    desc: '비트코인 채굴에 투입되는 전 세계 컴퓨팅 파워. 높을수록 네트워크가 안전하고, 채굴자들이 비트코인의 장기 가치를 믿고 투자하고 있다는 신호',
    icon: '⛏️',
    weight: '15%',
  },
  {
    key: 'dominance',
    label: '비트코인 영향력',
    desc: '암호화폐 시장에서 비트코인이 차지하는 비중',
    icon: '👑',
    weight: '15%',
  },
  {
    key: 'aiAnalysis',
    label: 'AI 종합 투자 매력도',
    desc: 'AI가 규제·경제 상황·시장 전반을 종합 분석한 점수',
    icon: '🤖',
    weight: '30%',
  },
];

export default function BitcoinConvictionCard({ data }: BitcoinConvictionCardProps) {
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [factorHelpOpen, setFactorHelpOpen] = useState(false);

  const zoneConfig = ZONE_CONFIG[data.zone];
  const interpretation = getCompositeInterpretation(data.compositeScore);

  // 원형 게이지 설정
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (data.compositeScore / 100) * circumference;

  // BTC 가격 포맷
  const formattedPrice = data.currentPrice > 0
    ? `$${data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: zoneConfig.bgColor }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.bitcoinIcon}>₿</Text>
          <Text style={styles.title}>비트코인 확신 점수</Text>
        </View>
        <View style={[styles.zoneBadge, { backgroundColor: zoneConfig.color }]}>
          <Text style={styles.zoneBadgeText}>{zoneConfig.label}</Text>
        </View>
      </View>

      {/* 원형 게이지 */}
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#333333"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={zoneConfig.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${progress} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={styles.gaugeCenter}>
          <Text style={[styles.scoreNumber, { color: zoneConfig.color }]}>
            {data.compositeScore}
          </Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </View>
      </View>

      {/* 종합 해석 메시지 (고객이 "이 점수가 뭔데?" 이해할 수 있도록) */}
      <View style={[styles.interpretationBox, { borderColor: zoneConfig.color + '40' }]}>
        <Text style={[styles.interpretationTitle, { color: zoneConfig.color }]}>
          {interpretation.title}
        </Text>
        <Text style={styles.interpretationMessage}>
          {interpretation.message}
        </Text>
      </View>

      {/* 존 라벨 + BTC 현재가 */}
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <View style={[styles.zoneDot, { backgroundColor: zoneConfig.color }]} />
          <Text style={[styles.zoneText, { color: zoneConfig.color }]}>
            {zoneConfig.label}
          </Text>
        </View>
        {formattedPrice && (
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>BTC</Text>
            <Text style={styles.priceValue}>{formattedPrice}</Text>
            <Text
              style={[
                styles.priceChange,
                { color: data.priceChange24h >= 0 ? '#4CAF50' : '#CF6679' },
              ]}
            >
              {data.priceChange24h >= 0 ? '+' : ''}
              {data.priceChange24h.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      {/* 5개 팩터 분석 (쉬운 설명 포함) */}
      <View style={styles.subScoresContainer}>
        <View style={styles.subScoresTitleRow}>
          <Text style={styles.subScoresTitle}>📋 점수 구성 요소</Text>
          <TouchableOpacity
            onPress={() => setFactorHelpOpen(!factorHelpOpen)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.helpToggle}>
              {factorHelpOpen ? '설명 닫기' : '설명 보기'}
            </Text>
          </TouchableOpacity>
        </View>

        {SUB_SCORE_CONFIG.map(({ key, label, desc, icon, weight }) => {
          const score = data.subScores[key] ?? 0;
          const barColor = getSubScoreColor(score);
          const context = getScoreContext(key, score);

          return (
            <View key={key} style={styles.subScoreRow}>
              {/* 라벨 행 */}
              <View style={styles.subScoreLabelRow}>
                <Text style={styles.subScoreIcon}>{icon}</Text>
                <Text style={styles.subScoreLabel}>{label}</Text>
                <Text style={styles.subScoreWeight}>반영 {weight}</Text>
                <Text style={[styles.subScoreValue, { color: barColor }]}>
                  {score}
                </Text>
              </View>

              {/* 프로그레스 바 */}
              <View style={styles.subScoreBarBg}>
                <View
                  style={[
                    styles.subScoreBarFill,
                    { width: `${score}%`, backgroundColor: barColor },
                  ]}
                />
              </View>

              {/* 쉬운 설명 (토글) */}
              {factorHelpOpen && (
                <Text style={styles.subScoreDesc}>{desc}</Text>
              )}

              {/* 맥락 메시지: 이 점수가 뭘 의미하는지 한 줄로 */}
              <View style={styles.contextRow}>
                <View style={[styles.contextDot, { backgroundColor: barColor }]} />
                <Text style={[styles.contextText, { color: barColor }]}>
                  {context}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* AI 인사이트 (접기/펼치기) */}
      {data.aiInsight && (
        <View style={styles.insightContainer}>
          <TouchableOpacity
            style={styles.insightToggle}
            onPress={() => setInsightExpanded(!insightExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.insightToggleText}>
              🤖 AI 상세 분석 {data.source === 'central-kitchen' ? '(사전 분석)' : '(실시간)'}
            </Text>
            <Ionicons
              name={insightExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#888888"
            />
          </TouchableOpacity>

          {insightExpanded && (
            <View style={styles.insightContent}>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>⛏️ 채굴 네트워크 건강도</Text>
                <Text style={styles.insightHint}>비트코인 네트워크의 컴퓨팅 파워 동향</Text>
                <Text style={styles.insightValue}>{data.aiInsight.hashrateTrend}</Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>🏛️ 각국 규제 동향</Text>
                <Text style={styles.insightHint}>미국·유럽·아시아의 암호화폐 정책 변화</Text>
                <Text style={styles.insightValue}>{data.aiInsight.politicsImpact}</Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>🌍 글로벌 경제 환경</Text>
                <Text style={styles.insightHint}>금리·달러·유동성이 비트코인에 미치는 영향</Text>
                <Text style={styles.insightValue}>{data.aiInsight.macroOutlook}</Text>
              </View>

              {data.aiInsight.keyEvents.length > 0 && (
                <View style={styles.eventsContainer}>
                  <Text style={styles.eventsTitle}>📌 주목할 이벤트</Text>
                  {data.aiInsight.keyEvents.map((event, idx) => (
                    <View key={idx} style={styles.eventItem}>
                      <Text style={styles.eventBullet}>•</Text>
                      <Text style={styles.eventText}>{event}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* 면책 문구 */}
      <Text style={styles.disclaimer}>
        이 점수는 투자 조언이 아닙니다. 투자 결정은 본인의 판단 하에 이루어져야 합니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  // 헤더
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
    flex: 1,
  },
  bitcoinIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F7931A',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  zoneBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zoneBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  // 원형 게이지
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
  scoreNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#888888',
    marginTop: -4,
  },
  // 종합 해석 메시지
  interpretationBox: {
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  interpretationTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  interpretationMessage: {
    fontSize: 13,
    color: '#BBBBBB',
    lineHeight: 20,
  },
  // 존 + 가격 행
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  // 서브스코어 (팩터 분석)
  subScoresContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  subScoresTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  subScoresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAAAAA',
  },
  helpToggle: {
    fontSize: 12,
    color: '#F7931A',
    fontWeight: '500',
  },
  subScoreRow: {
    marginBottom: 16,
  },
  subScoreLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  subScoreIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  subScoreLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#DDDDDD',
  },
  subScoreWeight: {
    fontSize: 10,
    color: '#666666',
    marginRight: 8,
  },
  subScoreValue: {
    fontSize: 13,
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
  subScoreDesc: {
    fontSize: 11,
    color: '#888888',
    marginTop: 5,
    lineHeight: 16,
    paddingLeft: 20,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
    paddingLeft: 20,
  },
  contextDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  contextText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  // AI 인사이트
  insightContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  insightToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAAAAA',
  },
  insightContent: {
    marginTop: 14,
  },
  insightRow: {
    marginBottom: 14,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 2,
  },
  insightHint: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 13,
    color: '#BBBBBB',
    lineHeight: 20,
  },
  eventsContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(247, 147, 26, 0.08)',
    borderRadius: 10,
    padding: 12,
  },
  eventsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F7931A',
    marginBottom: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 6,
  },
  eventBullet: {
    color: '#F7931A',
    fontSize: 13,
  },
  eventText: {
    flex: 1,
    fontSize: 12,
    color: '#CCCCCC',
    lineHeight: 18,
  },
  // 면책 문구
  disclaimer: {
    fontSize: 10,
    color: '#555555',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 14,
  },
});
