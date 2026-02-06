/**
 * Bitcoin Conviction Card - 비트코인 확신 지수 카드
 * CNN Fear & Greed 스타일 원형 게이지 + 5개 팩터 분해
 * PanicShieldCard 패턴 복제
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

// 5개 팩터 라벨 매핑
const SUB_SCORE_LABELS: { key: keyof BitcoinSubScores; label: string; icon: string; weight: string }[] = [
  { key: 'fearGreed',   label: 'Fear & Greed 지수', icon: '😱', weight: '25%' },
  { key: 'momentum7d',  label: '7일 가격 모멘텀',    icon: '📈', weight: '15%' },
  { key: 'momentum30d', label: '30일 가격 모멘텀',   icon: '📊', weight: '15%' },
  { key: 'dominance',   label: 'BTC 시장 지배율',    icon: '👑', weight: '15%' },
  { key: 'aiAnalysis',  label: 'AI 종합 분석',       icon: '🤖', weight: '30%' },
];

export default function BitcoinConvictionCard({ data }: BitcoinConvictionCardProps) {
  const [insightExpanded, setInsightExpanded] = useState(false);

  const zoneConfig = ZONE_CONFIG[data.zone];

  // 원형 게이지 설정 (PanicShieldCard 동일)
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
          <Text style={styles.title}>Bitcoin Conviction Score</Text>
        </View>
        <View style={[styles.zoneBadge, { backgroundColor: zoneConfig.color }]}>
          <Text style={styles.zoneBadgeText}>{zoneConfig.label}</Text>
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
              stroke={zoneConfig.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${progress} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        {/* 중앙 텍스트 */}
        <View style={styles.gaugeCenter}>
          <Text style={[styles.scoreNumber, { color: zoneConfig.color }]}>
            {data.compositeScore}
          </Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </View>
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

      {/* 5개 팩터 분해 바 */}
      <View style={styles.subScoresContainer}>
        <Text style={styles.subScoresTitle}>📋 팩터 분해</Text>
        {SUB_SCORE_LABELS.map(({ key, label, icon, weight }) => {
          const score = data.subScores[key] ?? 0;
          const barColor = getSubScoreColor(score);
          return (
            <View key={key} style={styles.subScoreRow}>
              <View style={styles.subScoreLabelRow}>
                <Text style={styles.subScoreIcon}>{icon}</Text>
                <Text style={styles.subScoreLabel}>{label}</Text>
                <Text style={styles.subScoreWeight}>{weight}</Text>
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

      {/* AI 인사이트 (접기/펼치기) */}
      {data.aiInsight && (
        <View style={styles.insightContainer}>
          <TouchableOpacity
            style={styles.insightToggle}
            onPress={() => setInsightExpanded(!insightExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.insightToggleText}>
              🤖 AI 인사이트 {data.source === 'central-kitchen' ? '(사전 분석)' : '(실시간)'}
            </Text>
            <Ionicons
              name={insightExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#888888"
            />
          </TouchableOpacity>

          {insightExpanded && (
            <View style={styles.insightContent}>
              {/* 3개 팩터 요약 */}
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>⛏️ 해시레이트</Text>
                <Text style={styles.insightValue}>{data.aiInsight.hashrateTrend}</Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>🏛️ 정치/규제</Text>
                <Text style={styles.insightValue}>{data.aiInsight.politicsImpact}</Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>🌍 매크로</Text>
                <Text style={styles.insightValue}>{data.aiInsight.macroOutlook}</Text>
              </View>

              {/* 핵심 이벤트 */}
              {data.aiInsight.keyEvents.length > 0 && (
                <View style={styles.eventsContainer}>
                  <Text style={styles.eventsTitle}>📌 핵심 이벤트</Text>
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
  // 서브스코어 바
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
  subScoreWeight: {
    fontSize: 10,
    color: '#666666',
    marginRight: 8,
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
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 13,
    color: '#CCCCCC',
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
