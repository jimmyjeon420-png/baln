/**
 * PortfolioImpactSection - 내 포트폴리오 영향도 섹션
 *
 * 역할: 오늘 맥락이 내 자산에 미친 영향을 시각화
 * 비유: 건강검진 결과처럼 "당신에게는 이렇게 영향을 줬습니다" 보여주는 섹션
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PortfolioImpactData {
  /** 수익률 변화 (%) */
  percentChange: number;
  /** 건강 점수 변화 */
  healthScoreChange: number;
  /** 영향도 메시지 */
  message: string;
}

interface PortfolioImpactSectionProps {
  /** 포트폴리오 영향도 데이터 */
  data: PortfolioImpactData;
}

/**
 * 포트폴리오 영향도 섹션 컴포넌트
 *
 * @example
 * ```tsx
 * <PortfolioImpactSection
 *   data={{
 *     percentChange: -1.2,
 *     healthScoreChange: 0,
 *     message: '당신의 포트폴리오는 -1.2% 영향, 건강 점수 변동 없음'
 *   }}
 * />
 * ```
 */
export function PortfolioImpactSection({ data }: PortfolioImpactSectionProps) {
  // 수익률 변화 색상
  const changeColor = data.percentChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const changeBgColor = data.percentChange >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';

  // 원화 환산 (임시: -1.2% → -120,000원)
  const krwImpact = (data.percentChange * 1000000).toFixed(0);
  const formattedKRW = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(Number(krwImpact));

  return (
    <View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
      {/* 제목 */}
      <View className="flex-row items-center mb-3">
        <Ionicons name="analytics-outline" size={18} color="#2196F3" />
        <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2">
          오늘 맥락이 내 자산에 미친 영향
        </Text>
      </View>

      {/* 수익률 변화 */}
      <View className={`${changeBgColor} rounded-lg p-3 mb-3`}>
        <Text className={`text-3xl font-bold ${changeColor}`}>
          {data.percentChange > 0 ? '+' : ''}
          {data.percentChange.toFixed(1)}%
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {data.percentChange >= 0 ? '예상 수익' : '예상 손실'}: {formattedKRW}
        </Text>
      </View>

      {/* 건강 점수 변화 */}
      <View className="flex-row items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 mb-3">
        <Text className="text-sm text-gray-600 dark:text-gray-400">건강 점수</Text>
        <View className="flex-row items-center">
          {data.healthScoreChange === 0 ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text className="text-base font-bold ml-2 text-gray-900 dark:text-white">
                변동 없음
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name={data.healthScoreChange > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={18}
                color={data.healthScoreChange > 0 ? '#4CAF50' : '#CF6679'}
              />
              <Text className={`text-base font-bold ml-2 ${data.healthScoreChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.healthScoreChange > 0 ? '+' : ''}
                {data.healthScoreChange}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* AI 조언 메시지 */}
      <View className="flex-row">
        <Ionicons name="bulb-outline" size={16} color="#FFC107" className="mt-1" />
        <Text className="text-sm leading-relaxed ml-2 flex-1 text-gray-700 dark:text-gray-300">
          {data.message}
        </Text>
      </View>
    </View>
  );
}

/**
 * 기본 export (호환성)
 */
export default PortfolioImpactSection;
