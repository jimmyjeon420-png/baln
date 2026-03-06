/**
 * Risks.tsx - 리스크 분석 섹션
 *
 * 역할: 4가지 리스크 카테고리 (시장/경쟁/규제/경영)
 * 비유: "경고등 대시보드" - 투자 전 점검해야 할 리스크 요인들
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입 정의
// ============================================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RiskCategory = 'market' | 'competition' | 'regulation' | 'management';

export interface RiskItem {
  category: RiskCategory;
  level: RiskLevel;
  points: string[];  // bullet points
}

interface RisksProps {
  risks: RiskItem[];
  onRefresh?: () => void;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/** Translate risk category key to display label */
function getRiskCategoryLabel(category: RiskCategory, t: (key: string) => string): string {
  const map: Record<RiskCategory, string> = {
    market: t('deepDive.risks.categoryMarket'),
    competition: t('deepDive.risks.categoryCompetition'),
    regulation: t('deepDive.risks.categoryRegulation'),
    management: t('deepDive.risks.categoryManagement'),
  };
  return map[category] ?? category;
}

/** Short label (without "Risk" suffix) for summary row */
function getRiskCategoryShort(category: RiskCategory, t: (key: string) => string): string {
  const map: Record<RiskCategory, string> = {
    market: t('deepDive.risks.categoryMarketShort'),
    competition: t('deepDive.risks.categoryCompetitionShort'),
    regulation: t('deepDive.risks.categoryRegulationShort'),
    management: t('deepDive.risks.categoryManagementShort'),
  };
  return map[category] ?? category;
}

export default function Risks({ risks, onRefresh: _onRefresh }: RisksProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);

  // 전체 리스크 레벨 계산
  const overallRisk = calculateOverallRisk(risks);
  const overallColor = getRiskColor(overallRisk);

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={s.headerRow}>
        <View>
          <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('deepDive.risks.title')}</Text>
          <Text style={[s.cardSubtitle, { color: colors.textTertiary }]}>{t('deepDive.risks.subtitle')}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {/* 종합 리스크 뱃지 */}
          <View style={[s.riskBadge, { backgroundColor: overallColor + '20' }]}>
            <Text style={[s.riskBadgeText, { color: overallColor }]}>
              {overallRisk === 'HIGH' ? t('deepDive.risks.high') : overallRisk === 'MEDIUM' ? t('deepDive.risks.medium') : t('deepDive.risks.low')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 요약 (항상 표시) */}
      <View style={s.summaryRow}>
        {risks.map((risk, index) => (
          <View key={index} style={s.summaryItem}>
            <Text style={[s.summaryCategory, { color: colors.textSecondary }]}>
              {getRiskCategoryShort(risk.category, t)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons
                name={getRiskIcon(risk.level)}
                size={16}
                color={getRiskColor(risk.level)}
              />
              <Text style={[s.summaryLevel, { color: getRiskColor(risk.level) }]}>
                {risk.level === 'HIGH' ? t('deepDive.risks.high') : risk.level === 'MEDIUM' ? t('deepDive.risks.medium') : t('deepDive.risks.low')}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* 상세 정보 (펼쳐진 상태) */}
      {expanded && (
        <View style={[s.detailContainer, { borderTopColor: colors.border }]}>
          {risks.map((risk, index) => (
            <View
              key={index}
              style={[
                s.riskSection,
                {
                  backgroundColor:
                    risk.level === 'HIGH'
                      ? 'rgba(207, 102, 121, 0.08)'
                      : risk.level === 'MEDIUM'
                      ? 'rgba(255, 152, 0, 0.08)'
                      : 'rgba(76, 175, 80, 0.08)',
                },
              ]}
            >
              {/* 카테고리 헤더 */}
              <View style={s.riskHeader}>
                <Ionicons
                  name={getRiskIcon(risk.level)}
                  size={20}
                  color={getRiskColor(risk.level)}
                />
                <Text style={[s.riskCategory, { color: colors.textPrimary }]}>
                  {getRiskCategoryLabel(risk.category, t)}
                </Text>
                <View style={[s.levelBadge, { backgroundColor: getRiskColor(risk.level) + '30' }]}>
                  <Text style={[s.levelText, { color: getRiskColor(risk.level) }]}>
                    {risk.level === 'HIGH' ? t('deepDive.risks.high') : risk.level === 'MEDIUM' ? t('deepDive.risks.medium') : t('deepDive.risks.low')}
                  </Text>
                </View>
              </View>

              {/* Bullet Points */}
              <View style={s.pointsList}>
                {(risk.points ?? []).map((point, idx) => (
                  <View key={idx} style={s.pointRow}>
                    <Text style={[s.bullet, { color: colors.textTertiary }]}>•</Text>
                    <Text style={[s.pointText, { color: colors.textSecondary }]}>{point}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* 종합 해석 */}
          <View style={[s.guideBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[s.guideText, { color: colors.textSecondary }]}>
              {overallRisk === 'HIGH'
                ? t('deepDive.risks.guideHigh')
                : overallRisk === 'MEDIUM'
                ? t('deepDive.risks.guideMedium')
                : t('deepDive.risks.guideLow')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

function calculateOverallRisk(risks: RiskItem[]): RiskLevel {
  const highCount = risks.filter((r) => r.level === 'HIGH').length;
  const mediumCount = risks.filter((r) => r.level === 'MEDIUM').length;

  if (highCount >= 2) return 'HIGH';
  if (highCount >= 1 || mediumCount >= 3) return 'MEDIUM';
  return 'LOW';
}

function getRiskColor(level: RiskLevel): string {
  if (level === 'HIGH') return '#CF6679';
  if (level === 'MEDIUM') return '#FF9800';
  return '#4CAF50';
}

function getRiskIcon(level: RiskLevel): keyof typeof Ionicons.glyphMap {
  if (level === 'HIGH') return 'warning';
  if (level === 'MEDIUM') return 'alert-circle';
  return 'checkmark-circle';
}

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // 요약 행
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
  },
  summaryCategory: {
    fontSize: 13,
  },
  summaryLevel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // 상세 정보
  detailContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  riskSection: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  riskCategory: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Bullet Points
  pointsList: {
    gap: 6,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 17,
    marginTop: 2,
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },

  // 가이드
  guideBox: {
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  guideText: {
    fontSize: 14,
    lineHeight: 21,
  },
});
