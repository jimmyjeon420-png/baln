/**
 * Panic Shield Card - 포트폴리오 안정성 게이지
 * 행동재무학 기반 공포 지수 시각화
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';
import { useLocale } from '../context/LocaleContext';
import type { ThemeColors } from '../styles/colors';
import { PanicSubScores } from '../services/gemini';

// Android 레이아웃 애니메이션 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface StopLossGuideline {
  ticker: string;
  name: string;
  suggestedStopLoss: number;
  currentLoss: number;
  action: 'HOLD' | 'WATCH' | 'REVIEW';
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
const getSubScoreColor = (score: number, colors: ThemeColors): string => {
  if (score >= 70) return colors.success;
  if (score >= 40) return colors.warning;
  return colors.error;
};

// 서브스코어 키/아이콘 매핑 (라벨은 t() 사용)
const SUB_SCORE_KEYS: { key: keyof PanicSubScores; labelKey: string; descKey: string; icon: string }[] = [
  { key: 'portfolioLoss', labelKey: 'panicShield.sub_portfolio_loss', descKey: 'panicShield.sub_desc_portfolio_loss', icon: '📉' },
  { key: 'concentrationRisk', labelKey: 'panicShield.sub_concentration_risk', descKey: 'panicShield.sub_desc_concentration_risk', icon: '🎯' },
  { key: 'volatilityExposure', labelKey: 'panicShield.sub_volatility', descKey: 'panicShield.sub_desc_volatility', icon: '📊' },
  { key: 'stopLossProximity', labelKey: 'panicShield.sub_stop_loss', descKey: 'panicShield.sub_desc_stop_loss', icon: '🚨' },
  { key: 'marketSentiment', labelKey: 'panicShield.sub_market_sentiment', descKey: 'panicShield.sub_desc_market_sentiment', icon: '🧠' },
];

export default function PanicShieldCard({
  index,
  level,
  stopLossGuidelines,
  subScores,
  peerComparison,
}: PanicShieldCardProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  // 가이드 섹션 펼침/접힘 상태
  const [showGuide, setShowGuide] = useState(false);

  const toggleGuide = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowGuide(!showGuide);
  };

  // 레벨별 색상 및 메시지 (동적 색상 적용)
  const levelConfig = {
    SAFE: {
      color: colors.success,
      bgColor: colors.streak.background,
      label: t('panicShield.level_safe'),
      message: t('panicShield.msg_safe'),
      icon: 'shield-checkmark' as const,
    },
    CAUTION: {
      color: colors.warning,
      bgColor: colors.surfaceElevated,
      label: t('panicShield.level_caution'),
      message: t('panicShield.msg_caution'),
      icon: 'alert-circle' as const,
    },
    DANGER: {
      color: colors.error,
      bgColor: colors.surfaceElevated,
      label: t('panicShield.level_danger'),
      message: t('panicShield.msg_danger'),
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
          <Text style={[styles.title, { color: colors.textPrimary }]}>Panic Shield</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: config.color }]}>
          <Text style={[styles.levelText, { color: colors.background }]}>{config.label}</Text>
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
              stroke={colors.border}
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
          <Text style={[styles.indexLabel, { color: colors.textTertiary }]}>/ 100</Text>
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
          <View style={[styles.peerBadge, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="people" size={14} color={colors.textTertiary} />
            <Text style={[styles.peerLabel, { color: colors.textSecondary }]}>
              {t('panicShield.peer_avg').replace('{{bracket}}', peerComparison.bracketLabel)}
            </Text>
            <Text style={[styles.peerAvgScore, { color: colors.textPrimary }]}>
              {t('panicShield.peer_score').replace('{{score}}', String(peerComparison.avgScore))}
            </Text>
          </View>
          {(() => {
            const diff = index - peerComparison.avgScore;
            if (diff === 0) return null;
            const isAbove = diff > 0;
            const color = isAbove ? colors.success : colors.error;
            const arrow = isAbove ? 'arrow-up' : 'arrow-down';
            const text = isAbove
              ? t('panicShield.peer_above').replace('{{diff}}', String(diff))
              : t('panicShield.peer_below').replace('{{diff}}', String(Math.abs(diff)));
            return (
              <View style={[styles.peerDiffBadge, { backgroundColor: `${color}15` }]}>
                <Ionicons name={arrow as keyof typeof Ionicons.glyphMap} size={12} color={color} />
                <Text style={[styles.peerDiffText, { color }]}>{text}</Text>
              </View>
            );
          })()}
          <Text style={[styles.peerSampleText, { color: colors.textTertiary }]}>
            {t('panicShield.peer_sample').replace('{{count}}', String(peerComparison.sampleCount))}
          </Text>
        </View>
      )}

      {/* PO 가이드: "이 점수는 무엇인가요?" */}
      <TouchableOpacity
        style={[styles.guideToggle, { backgroundColor: colors.surfaceElevated }]}
        onPress={toggleGuide}
        activeOpacity={0.7}
      >
        <Ionicons name="help-circle-outline" size={16} color={colors.textTertiary} />
        <Text style={[styles.guideToggleText, { color: colors.textTertiary }]}>
          {t('panicShield.guide_toggle')}
        </Text>
        <Ionicons
          name={showGuide ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {showGuide && (
        <View style={[styles.guideContainer, {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border
        }]}>
          {/* 개념 설명 + 학술 근거 */}
          <View style={[styles.guideSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.guideSectionTitle, { color: colors.textSecondary }]}>{t('panicShield.guide_what_title')}</Text>
            <Text style={[styles.guideText, { color: colors.textTertiary }]}>
              {t('panicShield.guide_what_text1_pre')}<Text style={[styles.guideBold, { color: colors.textSecondary }]}>{t('panicShield.guide_what_text1_name')}</Text>
              {' '}<Text style={[styles.guideSource, { color: colors.info }]}>{t('panicShield.guide_what_text1_theory')}</Text>
              {' '}{t('panicShield.guide_what_text1_key').split('').length > 0 && (
                <Text style={[styles.guideBold, { color: colors.textSecondary }]}>{t('panicShield.guide_what_text1_key')}</Text>
              )}
              {t('panicShield.guide_what_text1_post')}
            </Text>
            <Text style={[styles.guideText, { marginTop: 8, color: colors.textTertiary }]}>
              {t('panicShield.guide_what_text2_pre')}
              <Text style={[styles.guideSource, { color: colors.info }]}>{t('panicShield.guide_what_text2_index')}</Text>
              {' '}<Text style={[styles.guideBold, { color: colors.textSecondary }]}>{t('panicShield.guide_what_text2_key')}</Text>
              {t('panicShield.guide_what_text2_post')}
            </Text>
          </View>

          {/* 점수 해석 */}
          <View style={[styles.guideSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.guideSectionTitle, { color: colors.textSecondary }]}>{t('panicShield.guide_score_title')}</Text>
            <View style={styles.guideScoreRow}>
              <View style={[styles.guideScoreDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.guideScoreText, { color: colors.textTertiary }]}>
                <Text style={[styles.guideBold, { color: colors.success }]}>{t('panicShield.guide_score_safe')}</Text>{t('panicShield.guide_score_safe_desc')}
              </Text>
            </View>
            <View style={styles.guideScoreRow}>
              <View style={[styles.guideScoreDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.guideScoreText, { color: colors.textTertiary }]}>
                <Text style={[styles.guideBold, { color: colors.warning }]}>{t('panicShield.guide_score_caution')}</Text>{t('panicShield.guide_score_caution_desc')}
              </Text>
            </View>
            <View style={styles.guideScoreRow}>
              <View style={[styles.guideScoreDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.guideScoreText, { color: colors.textTertiary }]}>
                <Text style={[styles.guideBold, { color: colors.error }]}>{t('panicShield.guide_score_danger')}</Text>{t('panicShield.guide_score_danger_desc')}
              </Text>
            </View>
          </View>

          {/* 5개 하위 지표 설명 (CNN 대비) */}
          <View style={[styles.guideSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.guideSectionTitle, { color: colors.textSecondary }]}>{t('panicShield.guide_sub_title')}</Text>
            <Text style={[styles.guideText, { marginBottom: 10, color: colors.textTertiary }]}>
              {t('panicShield.guide_sub_text_pre')}<Text style={[styles.guideBold, { color: colors.textSecondary }]}>{t('panicShield.guide_sub_text_market')}</Text>
              {t('panicShield.guide_sub_text_mid')}<Text style={[styles.guideBold, { color: colors.textSecondary }]}>{t('panicShield.guide_sub_text_portfolio')}</Text>
              {t('panicShield.guide_sub_text_post')}
            </Text>
            {SUB_SCORE_KEYS.map(({ key, labelKey, descKey, icon }) => (
              <View key={key} style={styles.guideItemRow}>
                <Text style={styles.guideItemIcon}>{icon}</Text>
                <View style={styles.guideItemContent}>
                  <Text style={[styles.guideItemLabel, { color: colors.textSecondary }]}>{t(labelKey)}</Text>
                  <Text style={[styles.guideItemDesc, { color: colors.textTertiary }]}>
                    {t(descKey)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* 점수 산출 방식 + 토스 PO 넛지 */}
          <View style={[styles.guideSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.guideSectionTitle, { color: colors.textSecondary }]}>{t('panicShield.guide_calc_title')}</Text>
            <Text style={[styles.guideText, { color: colors.textTertiary }]}>
              {t('panicShield.guide_calc_text')}
            </Text>
          </View>

          {/* 출처 표시 */}
          <View style={[styles.guideSection, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={[styles.guideSectionTitle, { color: colors.textSecondary }]}>{t('panicShield.guide_ref_title')}</Text>
            <Text style={[styles.guideSourceItem, { color: colors.textTertiary }]}>
              {'\u2022'} Kahneman & Tversky, "Prospect Theory" (Econometrica, 1979)
            </Text>
            <Text style={[styles.guideSourceItem, { color: colors.textTertiary }]}>
              {'\u2022'} CNN Fear & Greed Index — 7개 시장심리 지표 종합
            </Text>
            <Text style={[styles.guideSourceItem, { color: colors.textTertiary }]}>
              {'\u2022'} Finance Research Letters (2025) — "CNN F&G Index as predictor of US equity returns"
            </Text>
            <Text style={[styles.guideSourceItem, { color: colors.textTertiary }]}>
              {'\u2022'} Zerodha Nudge, INDmoney — 행동재무학 기반 투자 넛지 사례
            </Text>
          </View>
        </View>
      )}

      {/* 서브스코어 분해 (CNN Fear & Greed 스타일) */}
      {subScores && (
        <View style={[styles.subScoresContainer, { borderTopColor: colors.border }]}>
          <Text style={[styles.subScoresTitle, { color: colors.textSecondary }]}>{t('panicShield.score_breakdown')}</Text>
          {SUB_SCORE_KEYS.map(({ key, labelKey, icon }) => {
            const score = subScores[key] ?? 0;
            const barColor = getSubScoreColor(score, colors);
            return (
              <View key={key} style={styles.subScoreRow}>
                <View style={styles.subScoreLabelRow}>
                  <Text style={styles.subScoreIcon}>{icon}</Text>
                  <Text style={[styles.subScoreLabel, { color: colors.textSecondary }]}>{t(labelKey)}</Text>
                  <Text style={[styles.subScoreValue, { color: barColor }]}>
                    {score}
                  </Text>
                </View>
                <View style={[styles.subScoreBarBg, { backgroundColor: colors.border }]}>
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
        <View style={[styles.guidelinesContainer, { borderTopColor: colors.border }]}>
          <Text style={[styles.guidelinesTitle, { color: colors.textSecondary }]}>{t('panicShield.stop_loss_guidelines')}</Text>
          {alertItems.slice(0, 3).map((item, idx) => (
            <View key={idx} style={[styles.guidelineItem, { borderBottomColor: colors.borderLight }]}>
              <View style={styles.guidelineLeft}>
                <Text style={[styles.guidelineTicker, { color: colors.textPrimary }]}>{item.ticker}</Text>
                <Text style={[styles.guidelineName, { color: colors.textTertiary }]}>{item.name}</Text>
              </View>
              <View style={styles.guidelineRight}>
                <Text
                  style={[
                    styles.guidelineLoss,
                    { color: (item.currentLoss ?? 0) < 0 ? colors.error : colors.success },
                  ]}
                >
                  {(item.currentLoss ?? 0) >= 0 ? '+' : ''}{(item.currentLoss ?? 0).toFixed(1)}%
                </Text>
                <View
                  style={[
                    styles.actionBadge,
                    {
                      backgroundColor:
                        item.action === 'REVIEW' ? colors.error : colors.warning,
                    },
                  ]}
                >
                  <Text style={[styles.actionText, { color: colors.background }]}>
                    {item.action === 'WATCH' ? t('panicShield.action_watch') : t('panicShield.action_review')}
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
    fontSize: 19,
    fontWeight: '700',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '500',
  },
  guidelinesContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  guidelinesTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  guidelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  guidelineLeft: {
    flex: 1,
  },
  guidelineTicker: {
    fontSize: 15,
    fontWeight: '600',
  },
  guidelineName: {
    fontSize: 13,
    marginTop: 2,
  },
  guidelineRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidelineLoss: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // 서브스코어 스타일
  subScoresContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  subScoresTitle: {
    fontSize: 15,
    fontWeight: '600',
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
    fontSize: 13,
    marginRight: 6,
  },
  subScoreLabel: {
    flex: 1,
    fontSize: 13,
  },
  subScoreValue: {
    fontSize: 13,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
  subScoreBarBg: {
    height: 6,
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
  },
  guideToggleText: {
    fontSize: 13,
  },
  guideContainer: {
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  guideSection: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
  },
  guideSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  guideText: {
    fontSize: 13,
    lineHeight: 21,
  },
  guideBold: {
    fontWeight: '700',
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
    fontSize: 13,
    lineHeight: 19,
  },
  guideItemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  guideItemIcon: {
    fontSize: 15,
    marginTop: 1,
  },
  guideItemContent: {
    flex: 1,
  },
  guideItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  guideItemDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  guideSource: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  guideSourceItem: {
    fontSize: 12,
    lineHeight: 19,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  peerLabel: {
    fontSize: 13,
  },
  peerAvgScore: {
    fontSize: 14,
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
    fontSize: 13,
    fontWeight: '600',
  },
  peerSampleText: {
    fontSize: 11,
  },
});
