/**
 * DeltaIndicator — 어제 대비 변화량 표시 컴포넌트
 *
 * 비유: "전광판의 화살표" — 주가 옆에 빨간/초록 화살표처럼
 *       숫자가 올랐는지 내렸는지 한눈에 보여줍니다.
 *
 * 사용: Dashboard KPI 카드에서 "vs 어제" 비교 표시
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';

interface DeltaIndicatorProps {
  delta: number;
  suffix?: string;
  compact?: boolean;
}

export default function DeltaIndicator({ delta, suffix = '', compact = false }: DeltaIndicatorProps) {
  if (delta === 0) {
    return (
      <View style={styles.container}>
        <Ionicons name="remove" size={compact ? 10 : 12} color={COLORS.textTertiary} />
        {!compact && <Text style={[styles.text, { color: COLORS.textTertiary }]}>0{suffix}</Text>}
      </View>
    );
  }

  const isPositive = delta > 0;
  const color = isPositive ? COLORS.primary : COLORS.error;
  const icon = isPositive ? 'caret-up' : 'caret-down';
  const sign = isPositive ? '+' : '';

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={compact ? 10 : 12} color={color} />
      <Text style={[styles.text, { color }, compact && styles.textCompact]}>
        {sign}{delta}{suffix}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 10,
  },
});
