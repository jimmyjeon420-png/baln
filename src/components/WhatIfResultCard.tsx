/**
 * WhatIfResultCard - What-If 시뮬레이션 결과 카드
 * 포트폴리오 영향 요약 + 자산별 임팩트 + 리스크 평가
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WhatIfResult } from '../types/marketplace';

interface Props {
  result: WhatIfResult;
}

export default function WhatIfResultCard({ result }: Props) {
  const isNegative = result.totalImpact.changePercent < 0;
  const impactColor = isNegative ? '#CF6679' : '#4CAF50';
  const riskColor = {
    HIGH: '#CF6679',
    MEDIUM: '#FFA726',
    LOW: '#4CAF50',
  }[result.riskAssessment.overallRisk];

  return (
    <View style={styles.container}>
      {/* 시나리오 요약 */}
      <View style={styles.summaryCard}>
        <Ionicons name="flask" size={24} color="#FFA726" />
        <Text style={styles.scenario}>{result.scenario}</Text>
        <Text style={styles.summaryText}>{result.summary}</Text>
      </View>

      {/* 전체 영향 */}
      <View style={styles.impactCard}>
        <Text style={styles.sectionTitle}>전체 영향</Text>
        <View style={styles.impactRow}>
          <View style={styles.impactItem}>
            <Text style={styles.impactLabel}>현재</Text>
            <Text style={styles.impactValue}>
              ₩{Math.floor(result.totalImpact.currentTotal).toLocaleString()}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#555" />
          <View style={styles.impactItem}>
            <Text style={styles.impactLabel}>예상</Text>
            <Text style={[styles.impactValue, { color: impactColor }]}>
              ₩{Math.floor(result.totalImpact.projectedTotal).toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={[styles.changeBadge, { backgroundColor: impactColor + '20' }]}>
          <Text style={[styles.changeText, { color: impactColor }]}>
            {isNegative ? '' : '+'}
            {result.totalImpact.changePercent.toFixed(1)}%
            ({isNegative ? '' : '+'}₩{Math.floor(Math.abs(result.totalImpact.changeAmount)).toLocaleString()})
          </Text>
        </View>
      </View>

      {/* 자산별 영향 */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>자산별 영향</Text>
        {result.assetImpacts.map((asset, i) => {
          const assetNeg = asset.changePercent < 0;
          const assetColor = assetNeg ? '#CF6679' : '#4CAF50';
          const levelColor = {
            HIGH: '#CF6679',
            MEDIUM: '#FFA726',
            LOW: '#4CAF50',
          }[asset.impactLevel];

          return (
            <View key={i} style={styles.assetRow}>
              <View style={styles.assetLeft}>
                <Text style={styles.assetTicker}>{asset.ticker}</Text>
                <Text style={styles.assetName}>{asset.name}</Text>
              </View>
              <View style={styles.assetRight}>
                <Text style={[styles.assetChange, { color: assetColor }]}>
                  {assetNeg ? '' : '+'}
                  {asset.changePercent.toFixed(1)}%
                </Text>
                <View style={[styles.levelDot, { backgroundColor: levelColor }]}>
                  <Text style={styles.levelText}>{asset.impactLevel}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* 리스크 평가 */}
      <View style={styles.sectionCard}>
        <View style={styles.riskHeader}>
          <Text style={styles.sectionTitle}>리스크 평가</Text>
          <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>
              {result.riskAssessment.overallRisk === 'HIGH' ? '고위험' :
               result.riskAssessment.overallRisk === 'MEDIUM' ? '중위험' : '저위험'}
            </Text>
          </View>
        </View>

        <Text style={styles.subTitle}>취약점</Text>
        {result.riskAssessment.vulnerabilities.map((v, i) => (
          <Text key={i} style={styles.listItem}>
            <Text style={{ color: '#CF6679' }}>!</Text> {v}
          </Text>
        ))}

        <Text style={[styles.subTitle, { marginTop: 10 }]}>헤지 전략</Text>
        {result.riskAssessment.hedgingSuggestions.map((s, i) => (
          <Text key={i} style={styles.listItem}>
            <Text style={{ color: '#4CAF50' }}>+</Text> {s}
          </Text>
        ))}
      </View>

      <Text style={styles.disclaimer}>
        본 시뮬레이션은 AI 예측이며, 실제 결과와 다를 수 있습니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  summaryCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  scenario: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryText: {
    color: '#AAA',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  impactCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  impactItem: { alignItems: 'center', flex: 1 },
  impactLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  impactValue: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  changeBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
  },
  changeText: { fontSize: 14, fontWeight: '700' },
  sectionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  assetLeft: {},
  assetTicker: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  assetName: { color: '#666', fontSize: 11 },
  assetRight: { alignItems: 'flex-end' },
  assetChange: { fontSize: 14, fontWeight: '700' },
  levelDot: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  levelText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskBadgeText: { fontSize: 12, fontWeight: '700' },
  subTitle: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItem: {
    color: '#CCC',
    fontSize: 13,
    lineHeight: 20,
  },
  disclaimer: {
    color: '#555',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});
