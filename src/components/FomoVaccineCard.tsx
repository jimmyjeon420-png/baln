/**
 * FOMO Vaccine Card - 고평가 자산 경고
 * 과열된 자산에 대한 경고 표시
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FomoSubScores } from '../services/gemini';

interface FomoAlert {
  ticker: string;
  name: string;
  overvaluationScore: number; // 0-100
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  subScores?: FomoSubScores; // 3개 하위 지표
}

// 서브스코어 라벨 매핑
const FOMO_SUB_LABELS: { key: keyof FomoSubScores; label: string }[] = [
  { key: 'valuationHeat', label: '밸류에이션 과열도' },
  { key: 'shortTermSurge', label: '단기 급등률' },
  { key: 'marketOverheat', label: '시장 과열 신호' },
];

// 점수별 색상 (높을수록 위험 → 빨강)
const getFomoBarColor = (score: number): string => {
  if (score >= 70) return '#CF6679';
  if (score >= 40) return '#FFC107';
  return '#4CAF50';
};

interface FomoVaccineCardProps {
  alerts: FomoAlert[];
}

export default function FomoVaccineCard({ alerts }: FomoVaccineCardProps) {
  // 심각도별 색상 설정
  const severityConfig = {
    LOW: {
      color: '#4CAF50',
      bgColor: '#1A2E1A',
      label: '낮음',
      icon: 'checkmark-circle' as const,
    },
    MEDIUM: {
      color: '#FFC107',
      bgColor: '#2E2A1A',
      label: '중간',
      icon: 'alert-circle' as const,
    },
    HIGH: {
      color: '#CF6679',
      bgColor: '#2E1A1A',
      label: '높음',
      icon: 'warning' as const,
    },
  };

  // 경고가 없는 경우
  if (alerts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: '#1A2E1A' }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="medical" size={24} color="#4CAF50" />
            <Text style={styles.title}>FOMO Vaccine</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text style={styles.emptyText}>고평가 경고 없음</Text>
          <Text style={styles.emptySubtext}>
            현재 포트폴리오에 과열 우려 자산이 없습니다
          </Text>
        </View>
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
          backgroundColor:
            highAlertCount > 0
              ? '#2E1A1A'
              : alerts.some((a) => a.severity === 'MEDIUM')
              ? '#2E2A1A'
              : '#1E1E1E',
        },
      ]}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="medical"
            size={24}
            color={highAlertCount > 0 ? '#CF6679' : '#FFC107'}
          />
          <Text style={styles.title}>FOMO Vaccine</Text>
        </View>
        {alerts.length > 0 && (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: highAlertCount > 0 ? '#CF6679' : '#FFC107',
              },
            ]}
          >
            <Text style={styles.countText}>{alerts.length}개 경고</Text>
          </View>
        )}
      </View>

      {/* 경고 메시지 */}
      <Text style={styles.description}>
        💉 FOMO(Fear Of Missing Out)를 예방하세요
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
                  <Text style={styles.alertTicker}>{alert.ticker}</Text>
                  <Text style={styles.alertName}>{alert.name}</Text>
                </View>
                <View
                  style={[styles.severityBadge, { backgroundColor: config.color }]}
                >
                  <Text style={styles.severityText}>{config.label}</Text>
                </View>
              </View>

              {/* 고평가 점수 바 */}
              <View style={styles.scoreContainer}>
                <View style={styles.scoreBarBg}>
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
                  {FOMO_SUB_LABELS.map(({ key, label }) => {
                    const score = alert.subScores![key] ?? 0;
                    const barColor = getFomoBarColor(score);
                    return (
                      <View key={key} style={styles.fomoSubRow}>
                        <Text style={styles.fomoSubLabel}>{label}</Text>
                        <View style={styles.fomoSubBarBg}>
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
              <Text style={styles.reasonText}>{alert.reason}</Text>
            </View>
          );
        })}
      </View>

      {/* 하단 팁 */}
      <View style={styles.tipContainer}>
        <Ionicons name="bulb" size={16} color="#FFC107" />
        <Text style={styles.tipText}>
          고평가 자산은 추가 매수를 자제하고, 분할 매도를 고려하세요
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  description: {
    fontSize: 13,
    color: '#AAAAAA',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#888888',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alertName: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
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
    backgroundColor: '#333333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  reasonText: {
    fontSize: 12,
    color: '#AAAAAA',
    lineHeight: 18,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#888888',
    lineHeight: 18,
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
    fontSize: 11,
    color: '#999999',
    width: 100,
  },
  fomoSubBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fomoSubBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  fomoSubValue: {
    fontSize: 11,
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },
});
