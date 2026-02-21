/**
 * AITrackRecordBanner.tsx - AI 예측 신뢰도 배너
 *
 * 신뢰도 강화 전략:
 * "지난 30일 baln 커뮤니티 예측 적중률: N%" 형태로 표시
 *
 * 이승건 원칙: "숫자가 있으면 믿는다"
 * 달리오 원칙: "트랙레코드가 신뢰의 근거"
 *
 * 데이터 소스:
 * - Supabase prediction_polls.status='resolved' 기준
 * - 각 투표의 정답 선택 비율 집계 = 커뮤니티 전체 적중률
 * - DB에 데이터 없으면 배너 숨김 (초기 단계 무의미한 수치 방지)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface AITrackRecordBannerProps {
  /** 커뮤니티 예측 적중률 (0~100, null이면 배너 숨김) */
  accuracy: number | null;
  /** 집계된 종료 투표 수 */
  resolvedCount: number;
  /** 상세 통계 이동 콜백 */
  onPress?: () => void;
}

export default function AITrackRecordBanner({
  accuracy,
  resolvedCount,
  onPress,
}: AITrackRecordBannerProps) {
  const { colors } = useTheme();

  // 데이터가 없거나 집계 수가 너무 적으면 숨김 (신뢰성 없는 수치 방지)
  if (accuracy === null || resolvedCount < 3) return null;

  // 적중률에 따른 색상
  const accuracyColor =
    accuracy >= 65
      ? colors.primary      // 초록 (우수)
      : accuracy >= 50
      ? '#FF9800'           // 주황 (보통)
      : colors.error;       // 빨강 (낮음)

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.primary + '12',
          borderColor: colors.primary + '30',
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* 왼쪽: 아이콘 + 텍스트 */}
      <View style={styles.left}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary + '25' }]}>
          <Ionicons name="stats-chart" size={14} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textTertiary }]}>
            지난 30일 커뮤니티 예측
          </Text>
          <Text style={[styles.sublabel, { color: colors.textTertiary }]}>
            {resolvedCount}개 질문 집계
          </Text>
        </View>
      </View>

      {/* 오른쪽: 적중률 */}
      <View style={styles.right}>
        <Text style={[styles.accuracy, { color: accuracyColor }]}>
          {accuracy}%
        </Text>
        <Text style={[styles.accuracyLabel, { color: accuracyColor }]}>
          적중
        </Text>
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.textTertiary}
            style={{ marginLeft: 2 }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  sublabel: {
    fontSize: 12,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  accuracy: {
    fontSize: 21,
    fontWeight: '800',
  },
  accuracyLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
