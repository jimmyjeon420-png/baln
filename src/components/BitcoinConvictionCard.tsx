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
  BitcoinLivePrice,
  ZONE_CONFIG,
  getZoneLabel,
} from '../services/bitcoinIntelligence';
import { useLocale } from '../context/LocaleContext';

interface BitcoinConvictionCardProps {
  data: BitcoinIntelligenceResult;
  /** 실시간 BTC 가격 (30초마다 갱신, 확신 점수와 별도) */
  livePrice?: BitcoinLivePrice | null;
}

// 서브스코어 바 색상 결정
const getSubScoreColor = (score: number): string => {
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FFB74D';
  return '#CF6679';
};

// 점수 수준별 맥락 메시지 (고객이 "이 점수가 나한테 어떤 의미인지" 알 수 있도록)
function getScoreContextKey(key: keyof BitcoinSubScores, score: number): string {
  const level = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
  const keyMap: Record<string, Record<string, string>> = {
    fearGreed: { high: 'bitcoinConviction.ctx_fear_greed_high', mid: 'bitcoinConviction.ctx_fear_greed_mid', low: 'bitcoinConviction.ctx_fear_greed_low' },
    momentum7d: { high: 'bitcoinConviction.ctx_momentum7d_high', mid: 'bitcoinConviction.ctx_momentum7d_mid', low: 'bitcoinConviction.ctx_momentum7d_low' },
    momentum30d: { high: 'bitcoinConviction.ctx_momentum30d_high', mid: 'bitcoinConviction.ctx_momentum30d_mid', low: 'bitcoinConviction.ctx_momentum30d_low' },
    hashrate: { high: 'bitcoinConviction.ctx_hashrate_high', mid: 'bitcoinConviction.ctx_hashrate_mid', low: 'bitcoinConviction.ctx_hashrate_low' },
    dominance: { high: 'bitcoinConviction.ctx_dominance_high', mid: 'bitcoinConviction.ctx_dominance_mid', low: 'bitcoinConviction.ctx_dominance_low' },
    aiAnalysis: { high: 'bitcoinConviction.ctx_ai_high', mid: 'bitcoinConviction.ctx_ai_mid', low: 'bitcoinConviction.ctx_ai_low' },
  };
  return keyMap[key]?.[level] ?? 'bitcoinConviction.ctx_ai_mid';
}

// 종합 점수에 대한 해석 메시지
function getCompositeInterpretationKeys(score: number): { titleKey: string; messageKey: string } {
  if (score >= 80) return { titleKey: 'bitcoinConviction.score_very_strong', messageKey: 'bitcoinConviction.score_very_strong_msg' };
  if (score >= 60) return { titleKey: 'bitcoinConviction.score_moderate', messageKey: 'bitcoinConviction.score_moderate_msg' };
  if (score >= 40) return { titleKey: 'bitcoinConviction.score_neutral', messageKey: 'bitcoinConviction.score_neutral_msg' };
  if (score >= 20) return { titleKey: 'bitcoinConviction.score_caution', messageKey: 'bitcoinConviction.score_caution_msg' };
  return { titleKey: 'bitcoinConviction.score_extreme_fear', messageKey: 'bitcoinConviction.score_extreme_fear_msg' };
}

// 6개 팩터: 쉬운 이름 + 한 줄 설명
const SUB_SCORE_CONFIG: {
  key: keyof BitcoinSubScores;
  labelKey: string;
  descKey: string;
  icon: string;
  weight: string;
}[] = [
  {
    key: 'fearGreed',
    labelKey: 'bitcoinConviction.sub_fear_greed',
    descKey: 'bitcoinConviction.sub_fear_greed_desc',
    icon: '🌡️',
    weight: '20%',
  },
  {
    key: 'momentum7d',
    labelKey: 'bitcoinConviction.sub_momentum_7d',
    descKey: 'bitcoinConviction.sub_momentum_7d_desc',
    icon: '📈',
    weight: '10%',
  },
  {
    key: 'momentum30d',
    labelKey: 'bitcoinConviction.sub_momentum_30d',
    descKey: 'bitcoinConviction.sub_momentum_30d_desc',
    icon: '📊',
    weight: '10%',
  },
  {
    key: 'hashrate',
    labelKey: 'bitcoinConviction.sub_hashrate',
    descKey: 'bitcoinConviction.sub_hashrate_desc',
    icon: '⛏️',
    weight: '15%',
  },
  {
    key: 'dominance',
    labelKey: 'bitcoinConviction.sub_dominance',
    descKey: 'bitcoinConviction.sub_dominance_desc',
    icon: '👑',
    weight: '15%',
  },
  {
    key: 'aiAnalysis',
    labelKey: 'bitcoinConviction.sub_ai_analysis',
    descKey: 'bitcoinConviction.sub_ai_analysis_desc',
    icon: '🤖',
    weight: '30%',
  },
];

export default function BitcoinConvictionCard({ data, livePrice }: BitcoinConvictionCardProps) {
  const { t } = useLocale();
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [factorHelpOpen, setFactorHelpOpen] = useState(false);

  const zoneConfig = ZONE_CONFIG[data.zone];
  const interpretationKeys = getCompositeInterpretationKeys(data.compositeScore);

  // 원형 게이지 설정
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (data.compositeScore / 100) * circumference;

  // BTC 가격: 실시간 가격 우선, 없으면 확신 점수 데이터의 가격 사용
  const displayPrice = (livePrice?.currentPrice && livePrice.currentPrice > 0)
    ? livePrice.currentPrice
    : data.currentPrice;
  const displayChange = (livePrice?.currentPrice && livePrice.currentPrice > 0)
    ? livePrice.priceChange24h
    : data.priceChange24h;
  const isLivePrice = !!(livePrice?.currentPrice && livePrice.currentPrice > 0);

  const formattedPrice = displayPrice > 0
    ? `$${displayPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: zoneConfig.bgColor }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.bitcoinIcon}>₿</Text>
          <Text style={styles.title}>{t('bitcoinConviction.title')}</Text>
        </View>
        <View style={[styles.zoneBadge, { backgroundColor: zoneConfig.color }]}>
          <Text style={styles.zoneBadgeText}>{getZoneLabel(data.zone)}</Text>
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
          {t(interpretationKeys.titleKey)}
        </Text>
        <Text style={styles.interpretationMessage}>
          {t(interpretationKeys.messageKey)}
        </Text>
      </View>

      {/* 존 라벨 + BTC 현재가 */}
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <View style={[styles.zoneDot, { backgroundColor: zoneConfig.color }]} />
          <Text style={[styles.zoneText, { color: zoneConfig.color }]}>
            {getZoneLabel(data.zone)}
          </Text>
        </View>
        {formattedPrice && (
          <View style={styles.priceContainer}>
            {isLivePrice && <View style={styles.liveDot} />}
            <Text style={styles.priceLabel}>BTC</Text>
            <Text style={styles.priceValue}>{formattedPrice}</Text>
            <Text
              style={[
                styles.priceChange,
                { color: displayChange >= 0 ? '#4CAF50' : '#CF6679' },
              ]}
            >
              {displayChange >= 0 ? '+' : ''}
              {displayChange.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      {/* 5개 팩터 분석 (쉬운 설명 포함) */}
      <View style={styles.subScoresContainer}>
        <View style={styles.subScoresTitleRow}>
          <Text style={styles.subScoresTitle}>{t('bitcoinConviction.score_components')}</Text>
          <TouchableOpacity
            onPress={() => setFactorHelpOpen(!factorHelpOpen)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.helpToggle}>
              {factorHelpOpen ? t('bitcoinConviction.hide_desc') : t('bitcoinConviction.show_desc')}
            </Text>
          </TouchableOpacity>
        </View>

        {SUB_SCORE_CONFIG.map(({ key, labelKey, descKey, icon, weight }) => {
          const score = data.subScores[key] ?? 0;
          const barColor = getSubScoreColor(score);
          const context = t(getScoreContextKey(key, score));

          return (
            <View key={key} style={styles.subScoreRow}>
              {/* 라벨 행 */}
              <View style={styles.subScoreLabelRow}>
                <Text style={styles.subScoreIcon}>{icon}</Text>
                <Text style={styles.subScoreLabel}>{t(labelKey)}</Text>
                <Text style={styles.subScoreWeight}>{t('bitcoinConviction.weight', { value: weight })}</Text>
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
                <Text style={styles.subScoreDesc}>{t(descKey)}</Text>
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
              {t('bitcoinConviction.ai_detail')} {data.source === 'central-kitchen' ? t('bitcoinConviction.ai_pre_analyzed') : t('bitcoinConviction.ai_realtime')}
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
                <Text style={styles.insightLabel}>{t('bitcoinConviction.insight_hashrate')}</Text>
                <Text style={styles.insightHint}>{t('bitcoinConviction.insight_hashrate_hint')}</Text>
                <Text style={styles.insightValue}>{data.aiInsight.hashrateTrend}</Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>{t('bitcoinConviction.insight_politics')}</Text>
                <Text style={styles.insightHint}>{t('bitcoinConviction.insight_politics_hint')}</Text>
                <Text style={styles.insightValue}>{data.aiInsight.politicsImpact}</Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>{t('bitcoinConviction.insight_macro')}</Text>
                <Text style={styles.insightHint}>{t('bitcoinConviction.insight_macro_hint')}</Text>
                <Text style={styles.insightValue}>{data.aiInsight.macroOutlook}</Text>
              </View>

              {data.aiInsight.keyEvents.length > 0 && (
                <View style={styles.eventsContainer}>
                  <Text style={styles.eventsTitle}>{t('bitcoinConviction.insight_events')}</Text>
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
        {t('bitcoinConviction.disclaimer')}
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
    fontSize: 23,
    fontWeight: '800',
    color: '#F7931A',
  },
  title: {
    fontSize: 17,
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
    fontSize: 13,
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
    fontSize: 15,
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  interpretationMessage: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 21,
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
    fontSize: 15,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  priceLabel: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceChange: {
    fontSize: 13,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#AAAAAA',
  },
  helpToggle: {
    fontSize: 13,
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
    fontSize: 14,
    marginRight: 6,
  },
  subScoreLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#DDDDDD',
  },
  subScoreWeight: {
    fontSize: 11,
    color: '#666666',
    marginRight: 8,
  },
  subScoreValue: {
    fontSize: 14,
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
    fontSize: 12,
    color: '#888888',
    marginTop: 5,
    lineHeight: 17,
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
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 17,
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
    fontSize: 15,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 2,
  },
  insightHint: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 21,
  },
  eventsContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(247, 147, 26, 0.08)',
    borderRadius: 10,
    padding: 12,
  },
  eventsTitle: {
    fontSize: 13,
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
    fontSize: 14,
  },
  eventText: {
    flex: 1,
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 19,
  },
  // 면책 문구
  disclaimer: {
    fontSize: 11,
    color: '#555555',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 15,
  },
});
