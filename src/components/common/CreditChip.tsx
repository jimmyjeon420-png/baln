/**
 * CreditChip - 작은 크레딧 보상 표시
 *
 * 역할: "보상 뱃지"
 * - 출석 보상, 예측 적중 시 "+2C (₩200)" 표시
 * - 획득/차감 시각적 피드백
 * - 항상 원화 병기 (1C = ₩100)
 *
 * 사용 예:
 * - 출석 체크 완료 시
 * - 예측 적중 시
 * - 크레딧 차감 확인 (AI 분석 사용)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCredits } from '../../utils/formatters';

interface CreditChipProps {
  /** 크레딧 수량 (양수: 획득, 음수: 차감) */
  amount: number;
  /** 크기 */
  size?: 'small' | 'medium' | 'large';
  /** 원화 표시 여부 */
  showKRW?: boolean;
  /** 아이콘 표시 여부 */
  showIcon?: boolean;
}

export function CreditChip({
  amount,
  size = 'medium',
  showKRW = true,
  showIcon = true,
}: CreditChipProps) {
  const isPositive = amount >= 0;
  const absoluteAmount = Math.abs(amount);

  // 크기별 스타일
  const sizeConfig = {
    small: { padding: 6, fontSize: 13, iconSize: 12 },
    medium: { padding: 8, fontSize: 15, iconSize: 14 },
    large: { padding: 12, fontSize: 17, iconSize: 16 },
  }[size];

  // 색상 (획득: 보라색, 차감: 회색)
  const colorStyle = isPositive
    ? { bg: '#9333EA', text: '#FFF' }
    : { bg: '#6B7280', text: '#FFF' };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorStyle.bg,
          paddingHorizontal: sizeConfig.padding + 4,
          paddingVertical: sizeConfig.padding,
        },
      ]}
    >
      {showIcon && (
        <Ionicons
          name={isPositive ? 'add-circle' : 'remove-circle'}
          size={sizeConfig.iconSize}
          color={colorStyle.text}
          style={styles.icon}
        />
      )}

      <Text
        style={[
          styles.text,
          { fontSize: sizeConfig.fontSize, color: colorStyle.text },
        ]}
      >
        {isPositive ? '+' : '-'}
        {formatCredits(absoluteAmount, showKRW)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
  },
});
