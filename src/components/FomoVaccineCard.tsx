/**
 * FOMO Vaccine Card - 고평가 자산 경고
 * 과열된 자산에 대한 경고 표시
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FomoSubScores } from '../services/gemini';
import { useTheme } from '../hooks/useTheme';
import { useLocale } from '../context/LocaleContext';

// Android 레이아웃 애니메이션 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FomoAlert {
  ticker: string;
  name: string;
  overvaluationScore: number; // 0-100
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  subScores?: FomoSubScores; // 3개 하위 지표
}

// 서브스코어 라벨 매핑
const FOMO_SUB_LABELS: { key: keyof FomoSubScores; labelKey: string }[] = [
  { key: 'valuationHeat', labelKey: 'fomoVaccine.sub_valuation_heat' },
  { key: 'shortTermSurge', labelKey: 'fomoVaccine.sub_short_term_surge' },
  { key: 'marketOverheat', labelKey: 'fomoVaccine.sub_market_overheat' },
];

// 점수별 색상 (높을수록 위험 → 빨강)
const getFomoBarColor = (score: number): string => {
  if (score >= 70) return '#CF6679';
  if (score >= 40) return '#FFC107';
  return '#4CAF50';
};

// 서브스코어별 PO 설명 (비개발자용)
const FOMO_SUB_DESC_KEYS: Record<keyof FomoSubScores, string> = {
  valuationHeat: 'fomoVaccine.sub_desc_valuation_heat',
  shortTermSurge: 'fomoVaccine.sub_desc_short_term_surge',
  marketOverheat: 'fomoVaccine.sub_desc_market_overheat',
};

interface FomoVaccineCardProps {
  alerts: FomoAlert[];
}

// 가이드 섹션 컴포넌트 (경고 유무와 관계없이 동일)
function FomoGuideSection() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [showGuide, setShowGuide] = useState(false);

  const toggleGuide = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowGuide(!showGuide);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.guideToggle, { backgroundColor: colors.surface }]}
        onPress={toggleGuide}
        activeOpacity={0.7}
      >
        <Ionicons name="help-circle-outline" size={16} color={colors.textTertiary} />
        <Text style={[styles.guideToggleText, { color: colors.textTertiary }]}>
          이 점수는 무엇인가요?
        </Text>
        <Ionicons
          name={showGuide ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {showGuide && (
        <View style={[styles.guideContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* 개념 설명 + 학술 근거 */}
          <View style={[styles.guideSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.guideSectionTitle, { color: colors.textSecondary }]}>{t('fomoVaccine.guide_what_title')}</Text>
            <Text style={[styles.guideText, { color: colors.textTertiary }]}>
              행동재무학에서 FOMO는{' '}
              <Text style={[styles.guideSource, { color: colors.info }]}>희소성 편향(Scarcity Bias)</Text>의 일종입니다.
              "남들은 다 벌고 있는데 나만 빠지면 어쩌지?"라는 불안감이
              이미 고점인 종목을 추격 매수하게 만듭니다.
            </Text>
            <Text style={[styles.guideText, { marginTop: 8, color: colors.textTertiary }]}>
              <Text style={[styles.guideSource, { color: colors.info }]}>Morningstar(2024)</Text> 연구에 따르면,
              FOMO에 휩쓸린 투자자는 그렇지 않은 투자자 대비{' '}
              <Text style={[styles.guideBold, { color: colors.textSecondary }]}>위험조정 수익률(Sharpe Ratio)이 평균 4% 낮았습니다</Text>.
              FOMO Vaccine은 이런 충동적 매수를 예방하기 위해
              보유 종목의 고평가 위험도를 실시간으로 분석합니다.
            </Text>
          </View>

          {/* 점수 해석 */}
          <View style={[styles.guideSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.guideSectionTitle, { color: colors.textSecondary }]}>{t('fomoVaccine.guide_score_title')}</Text>
            <Text style={[styles.guideText, { color: colors.textTertiary }]}>
              각 종목별로 0~100점의 고평가 점수가 부여됩니다.
              점수가 높을수록 현재 가격이 적정가치(PER, PBR 등) 대비 비싸다는 의미입니다.
            </Text>
            <View style={{ marginTop: 8 }}>
              <View style={styles.guideScoreRow}>
                <View style={[styles.guideScoreDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.guideScoreText, { color: colors.textTertiary }]}>
                  <Text style={[styles.guideBold, { color: colors.success }]}>0~30 낮음</Text> — 적정 가격 수준, 추가 매수 가능
                </Text>
              </View>
              <View style={styles.guideScoreRow}>
                <View style={[styles.guideScoreDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.guideScoreText, { color: colors.textTertiary }]}>
                  <Text style={[styles.guideBold, { color: colors.warning }]}>31~60 중간</Text> — 추가 매수 자제, 관망 권장
                </Text>
              </View>
              <View style={styles.guideScoreRow}>
                <View style={[styles.guideScoreDot, { backgroundColor: colors.error }]} />
                <Text style={[styles.guideScoreText, { color: colors.textTertiary }]}>
                  <Text style={[styles.guideBold, { color: colors.error }]}>61~100 높음</Text> — 고평가 상태, 분할 매도 검토
                </Text>
              </View>
            </View>
          </View>

          {/* 3개 하위 지표 설명 */}
          <View style={[styles.guideSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.guideSectionTitle, { color: colors.textSecondary }]}>{t('fomoVaccine.guide_sub_title')}</Text>
            <Text style={[styles.guideText, { marginBottom: 10, color: colors.textTertiary }]}>
              닷컴 버블(2000), 금융위기(2008)에서 FOMO에 빠진 투자자들은
              고평가 자산에 진입해 큰 손실을 입었습니다.
              다음 3가지 관점에서 과열 여부를 진단합니다:
            </Text>
            {FOMO_SUB_LABELS.map(({ key, labelKey }) => (
              <View key={key} style={styles.guideItemRow}>
                <View style={[styles.guideScoreDot, { backgroundColor: colors.warning, marginTop: 5 }]} />
                <View style={styles.guideItemContent}>
                  <Text style={[styles.guideItemLabel, { color: colors.textSecondary }]}>{t(labelKey)}</Text>
                  <Text style={[styles.guideItemDesc, { color: colors.textTertiary }]}>
                    {t(FOMO_SUB_DESC_KEYS[key])}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* 출처 표시 */}
          <View style={[styles.guideSection, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={[styles.guideSectionTitle, { color: colors.textSecondary }]}>{t('fomoVaccine.guide_ref_title')}</Text>
            <Text style={[styles.guideSourceItem, { color: colors.textQuaternary }]}>
              {'\u2022'} Nirun & Asgarli, "FoMO in Investment: A Critical Literature Review" (SSRN, 2025)
            </Text>
            <Text style={[styles.guideSourceItem, { color: colors.textQuaternary }]}>
              {'\u2022'} Morningstar — "FOMO Can Lead to Lower Returns" (2024)
            </Text>
            <Text style={[styles.guideSourceItem, { color: colors.textQuaternary }]}>
              {'\u2022'} MDPI Finance (2025) — FOMO, Loss Aversion & Herd Behavior in Investment
            </Text>
            <Text style={[styles.guideSourceItem, { color: colors.textQuaternary }]}>
              {'\u2022'} ResearchGate — "The Effects of FOMO on Investment Behavior in the Stock Market"
            </Text>
          </View>
        </View>
      )}
    </>
  );
}

export default function FomoVaccineCard({ alerts }: FomoVaccineCardProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  // 심각도별 색상 설정
  const severityConfig = {
    LOW: {
      color: colors.success,
      bgColor: colors.streak.background,
      label: t('fomoVaccine.severity_low'),
      icon: 'checkmark-circle' as const,
    },
    MEDIUM: {
      color: colors.warning,
      bgColor: colors.surface,
      label: t('fomoVaccine.severity_medium'),
      icon: 'alert-circle' as const,
    },
    HIGH: {
      color: colors.error,
      bgColor: colors.surface,
      label: t('fomoVaccine.severity_high'),
      icon: 'warning' as const,
    },
  };

  // 경고가 없는 경우
  if (alerts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.streak.background }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="medical" size={24} color={colors.success} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>FOMO Vaccine</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={[styles.emptyText, { color: colors.success }]}>{t('fomoVaccine.no_alert')}</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            {t('fomoVaccine.no_alert_sub')}
          </Text>
        </View>
        <FomoGuideSection />
      </View>
    );
  }

  // HIGH 경고 개수 계산
  const highAlertCount = alerts.filter((a) => a.severity === 'HIGH').length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
        },
      ]}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="medical"
            size={24}
            color={highAlertCount > 0 ? colors.error : colors.warning}
          />
          <Text style={[styles.title, { color: colors.textPrimary }]}>FOMO Vaccine</Text>
        </View>
        {alerts.length > 0 && (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: highAlertCount > 0 ? colors.error : colors.warning,
              },
            ]}
          >
            <Text style={[styles.countText, { color: colors.textPrimary }]}>{t('fomoVaccine.alert_count', { count: alerts.length })}</Text>
          </View>
        )}
      </View>

      {/* 경고 메시지 */}
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {t('fomoVaccine.description')}
      </Text>

      {/* 경고 리스트 */}
      <View style={styles.alertList}>
        {alerts.map((alert, idx) => {
          const config = severityConfig[alert.severity];
          return (
            <View
              key={idx}
              style={[styles.alertItem, { backgroundColor: config.bgColor }]}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertLeft}>
                  <Ionicons name={config.icon} size={18} color={config.color} />
                  <Text style={[styles.alertTicker, { color: colors.textPrimary }]}>{alert.ticker}</Text>
                  <Text style={[styles.alertName, { color: colors.textTertiary }]}>{alert.name}</Text>
                </View>
                <View
                  style={[styles.severityBadge, { backgroundColor: config.color }]}
                >
                  <Text style={[styles.severityText, { color: colors.textPrimary }]}>{config.label}</Text>
                </View>
              </View>

              {/* 고평가 점수 바 */}
              <View style={styles.scoreContainer}>
                <View style={[styles.scoreBarBg, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${alert.overvaluationScore}%`,
                        backgroundColor: config.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.scoreText, { color: config.color }]}>
                  {alert.overvaluationScore}점
                </Text>
              </View>

              {/* 서브스코어 분해 (3개 지표) */}
              {alert.subScores && (
                <View style={styles.fomoSubScoresContainer}>
                  {FOMO_SUB_LABELS.map(({ key, labelKey }) => {
                    const score = alert.subScores?.[key] ?? 0;
                    const barColor = getFomoBarColor(score);
                    return (
                      <View key={key} style={styles.fomoSubRow}>
                        <Text style={[styles.fomoSubLabel, { color: colors.textTertiary }]}>{t(labelKey)}</Text>
                        <View style={[styles.fomoSubBarBg, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.fomoSubBarFill,
                              { width: `${score}%`, backgroundColor: barColor },
                            ]}
                          />
                        </View>
                        <Text style={[styles.fomoSubValue, { color: barColor }]}>
                          {score}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* 사유 */}
              <Text style={[styles.reasonText, { color: colors.textSecondary }]}>{alert.reason}</Text>
            </View>
          );
        })}
      </View>

      {/* PO 가이드 */}
      <FomoGuideSection />

      {/* 하단 팁 */}
      <View style={[styles.tipContainer, { borderTopColor: colors.border }]}>
        <Ionicons name="bulb" size={16} color={colors.warning} />
        <Text style={[styles.tipText, { color: colors.textTertiary }]}>
          {t('fomoVaccine.tip')}
        </Text>
      </View>
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
    marginBottom: 12,
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
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  alertList: {
    gap: 12,
  },
  alertItem: {
    borderRadius: 12,
    padding: 14,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  alertTicker: {
    fontSize: 15,
    fontWeight: '700',
  },
  alertName: {
    fontSize: 13,
    marginLeft: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  scoreBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 19,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  // FOMO 서브스코어 스타일
  fomoSubScoresContainer: {
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  fomoSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fomoSubLabel: {
    fontSize: 12,
    width: 100,
  },
  fomoSubBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fomoSubBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  fomoSubValue: {
    fontSize: 12,
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
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
});
