/**
 * 리스크 대시보드 섹션 — Panic Shield + FOMO Vaccine 요약/상세
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonBlock } from '../SkeletonLoader';
import PanicShieldCard from '../PanicShieldCard';
import FomoVaccineCard from '../FomoVaccineCard';
import type { RiskAnalysisResult } from '../../services/gemini';
import type { PeerComparison } from '../../types/rebalanceTypes';

interface RiskDashboardSectionProps {
  analysisResult: RiskAnalysisResult | null;
  peerPanicData?: PeerComparison | null;
  isAILoading?: boolean;
}

export default function RiskDashboardSection({
  analysisResult,
  peerPanicData,
  isAILoading,
}: RiskDashboardSectionProps) {
  const [showDetail, setShowDetail] = useState(false);

  // AI 로딩 중 스켈레톤 (레이아웃 위치 확보 → CLS 방지)
  if (isAILoading && !analysisResult) {
    return (
      <View style={s.card}>
        <SkeletonBlock width={100} height={16} />
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, gap: 8 }}>
            <SkeletonBlock width={24} height={24} style={{ borderRadius: 6 }} />
            <SkeletonBlock width={80} height={11} />
            <SkeletonBlock width={60} height={13} />
          </View>
          <View style={{ flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, gap: 8 }}>
            <SkeletonBlock width={24} height={24} style={{ borderRadius: 6 }} />
            <SkeletonBlock width={80} height={11} />
            <SkeletonBlock width={60} height={13} />
          </View>
        </View>
      </View>
    );
  }

  if (!analysisResult) return null;

  const panicLevel = analysisResult.panicShieldLevel;
  const panicIndex = analysisResult.panicShieldIndex;
  const highFomoCount = analysisResult.fomoAlerts.filter(a => a.severity === 'HIGH').length;

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.cardLabel}>리스크 체크</Text>
          <Text style={s.cardLabelEn}>Risk Dashboard</Text>
        </View>
        <TouchableOpacity
          style={s.expandButton}
          onPress={() => setShowDetail(!showDetail)}
        >
          <Text style={s.expandButtonText}>{showDetail ? '접기' : '상세'}</Text>
          <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color="#888" />
        </TouchableOpacity>
      </View>

      {/* 요약 2줄 */}
      <View style={s.summaryRow}>
        {/* Panic Shield 요약 */}
        <View style={[s.summaryItem, {
          backgroundColor: panicLevel === 'DANGER' ? 'rgba(207,102,121,0.08)'
            : panicLevel === 'CAUTION' ? 'rgba(255,193,7,0.08)' : 'rgba(76,175,80,0.08)'
        }]}>
          <Ionicons name="shield" size={18} color={
            panicLevel === 'DANGER' ? '#CF6679' : panicLevel === 'CAUTION' ? '#FFC107' : '#4CAF50'
          } />
          <View>
            <Text style={s.summaryLabel}>Panic Shield</Text>
            <Text style={[s.summaryValue, {
              color: panicLevel === 'DANGER' ? '#CF6679' : panicLevel === 'CAUTION' ? '#FFC107' : '#4CAF50'
            }]}>
              {panicIndex}/100 {panicLevel === 'SAFE' ? '안전' : panicLevel === 'CAUTION' ? '주의' : '위험'}
            </Text>
          </View>
        </View>

        {/* FOMO Vaccine 요약 */}
        <View style={[s.summaryItem, {
          backgroundColor: highFomoCount > 0 ? 'rgba(207,102,121,0.08)' : 'rgba(76,175,80,0.08)'
        }]}>
          <Ionicons name="medical" size={18} color={highFomoCount > 0 ? '#CF6679' : '#4CAF50'} />
          <View>
            <Text style={s.summaryLabel}>FOMO Vaccine</Text>
            <Text style={[s.summaryValue, { color: highFomoCount > 0 ? '#CF6679' : '#4CAF50' }]}>
              {highFomoCount > 0 ? `경고 ${analysisResult.fomoAlerts.length}건` : '경고 없음'}
            </Text>
          </View>
        </View>
      </View>

      {/* 상세 펼침 */}
      {showDetail && (
        <View style={s.detailContainer}>
          <PanicShieldCard
            index={analysisResult.panicShieldIndex}
            level={analysisResult.panicShieldLevel}
            stopLossGuidelines={analysisResult.stopLossGuidelines}
            subScores={analysisResult.panicSubScores}
            peerComparison={peerPanicData}
          />
          <FomoVaccineCard alerts={analysisResult.fomoAlerts} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cardLabelEn: { fontSize: 10, color: '#555', marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  expandButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandButtonText: { fontSize: 12, color: '#888' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  summaryLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  summaryValue: { fontSize: 13, fontWeight: '700' },
  detailContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#222' },
});
