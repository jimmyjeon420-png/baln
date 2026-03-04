/**
 * Governance.tsx - 지배구조 평가 섹션
 *
 * 역할: CEO 평가 + 주주 친화성 + 배당 수익률 + ESG 평가
 * 비유: "경영진 성적표" - 회사를 경영하는 사람들의 역량과 주주 친화도
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입 정의
// ============================================================================

export interface GovernanceData {
  ceoRating: number;          // CEO 평가 (0-5)
  ceoName: string;            // CEO 이름
  tenure: number;             // 재임 기간 (년)

  shareholderFriendly: number; // 주주 친화성 (0-5)
  dividendYield: number;       // 배당 수익률 (%)
  payoutRatio: number;         // 배당성향 (%)

  esgRating: number;           // ESG 평가 (0-5)
  esgGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D'; // ESG 등급

  keyPoints: string[];         // 핵심 포인트
}

interface GovernanceProps {
  data: GovernanceData;
  onRefresh?: () => void;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function Governance({ data, onRefresh: _onRefresh }: GovernanceProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);

  // 종합 평가
  const overallScore = (data.ceoRating + data.shareholderFriendly + data.esgRating) / 3;
  const overallGrade = overallScore >= 4 ? t('deepDive.governance.excellent') : overallScore >= 3 ? t('deepDive.governance.good') : t('deepDive.governance.average');
  const overallColor = overallScore >= 4 ? colors.primary : overallScore >= 3 ? colors.warning : colors.neutral;

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={s.headerRow}>
        <View>
          <Text style={[s.cardTitle, { color: colors.textPrimary }]}>👔 지배구조 & ESG</Text>
          <Text style={[s.cardSubtitle, { color: colors.textTertiary }]}>Governance & ESG</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {/* 종합 평가 뱃지 */}
          <View style={[s.gradeBadge, { backgroundColor: overallColor + '20' }]}>
            <Text style={[s.gradeBadgeText, { color: overallColor }]}>{overallGrade}</Text>
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
        {/* CEO 평가 */}
        <View style={s.summaryItem}>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.ceoCapability')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {renderStars(data.ceoRating)}
            <Text style={[s.scoreText, { color: colors.textPrimary }]}>
              {data.ceoRating.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* 주주 친화성 */}
        <View style={s.summaryItem}>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.shareholderFriendly')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {renderStars(data.shareholderFriendly)}
            <Text style={[s.scoreText, { color: colors.textPrimary }]}>
              {data.shareholderFriendly.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* ESG */}
        <View style={s.summaryItem}>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.esgGrade')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={[s.esgGrade, { color: getEsgColor(data.esgGrade) }]}>
              {data.esgGrade}
            </Text>
            {renderStars(data.esgRating)}
          </View>
        </View>
      </View>

      {/* 상세 정보 (펼쳐진 상태) */}
      {expanded && (
        <View style={[s.detailContainer, { borderTopColor: colors.border }]}>
          {/* CEO 상세 */}
          <View style={[s.detailSection, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('deepDive.governance.ceoEvaluation')}</Text>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.name')}</Text>
              <Text style={[s.detailValue, { color: colors.textPrimary }]}>{data.ceoName}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.tenure')}</Text>
              <Text style={[s.detailValue, { color: colors.textPrimary }]}>{data.tenure}년</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.capabilityRating')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {renderStars(data.ceoRating)}
                <Text style={[s.detailValue, { color: colors.textPrimary }]}>
                  {data.ceoRating.toFixed(1)}/5.0
                </Text>
              </View>
            </View>
          </View>

          {/* 배당 정보 */}
          <View style={[s.detailSection, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('deepDive.governance.dividendInfo')}</Text>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.dividendYield')}</Text>
              <Text style={[s.dividendValue, { color: colors.primary }]}>
                {data.dividendYield.toFixed(2)}%
              </Text>
            </View>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.payoutRatio')}</Text>
              <Text style={[s.detailValue, { color: colors.textPrimary }]}>
                {data.payoutRatio.toFixed(0)}%
              </Text>
            </View>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.shareholderFriendly')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {renderStars(data.shareholderFriendly)}
                <Text style={[s.detailValue, { color: colors.textPrimary }]}>
                  {data.shareholderFriendly.toFixed(1)}/5.0
                </Text>
              </View>
            </View>
          </View>

          {/* ESG 상세 */}
          <View style={[s.detailSection, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('deepDive.governance.esgEvaluation')}</Text>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.grade')}</Text>
              <Text style={[s.esgGradeLarge, { color: getEsgColor(data.esgGrade) }]}>
                {data.esgGrade}
              </Text>
            </View>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{t('deepDive.governance.ratingScore')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {renderStars(data.esgRating)}
                <Text style={[s.detailValue, { color: colors.textPrimary }]}>
                  {data.esgRating.toFixed(1)}/5.0
                </Text>
              </View>
            </View>
          </View>

          {/* 핵심 포인트 */}
          {data.keyPoints.length > 0 && (
            <View style={[s.pointsBox, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[s.pointsTitle, { color: colors.textPrimary }]}>{t('deepDive.governance.keyPoints')}</Text>
              {data.keyPoints.map((point, idx) => (
                <View key={idx} style={s.pointRow}>
                  <Text style={[s.bullet, { color: colors.textTertiary }]}>•</Text>
                  <Text style={[s.pointText, { color: colors.textSecondary }]}>{point}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

function renderStars(rating: number) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < fullStars; i++) {
    stars.push(<Text key={`full-${i}`} style={s.star}>★</Text>);
  }
  if (hasHalfStar) {
    stars.push(<Text key="half" style={s.starHalf}>★</Text>);
  }
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Text key={`empty-${i}`} style={s.starEmpty}>☆</Text>);
  }

  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
}

function getEsgColor(grade: string): string {
  if (grade.startsWith('A')) return '#4CAF50';
  if (grade.startsWith('B')) return '#FFC107';
  return '#9E9E9E';
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
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // 요약 행
  summaryRow: {
    gap: 16,
  },
  summaryItem: {
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  esgGrade: {
    fontSize: 17,
    fontWeight: '700',
  },

  // 별점
  star: {
    fontSize: 17,
    color: '#FFC107',
  },
  starHalf: {
    fontSize: 17,
    color: '#FFE082',
  },
  starEmpty: {
    fontSize: 17,
    color: '#E0E0E0',
  },

  // 상세 정보
  detailContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  detailSection: {
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  dividendValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  esgGradeLarge: {
    fontSize: 21,
    fontWeight: '700',
  },

  // 핵심 포인트
  pointsBox: {
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  pointsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
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
});
