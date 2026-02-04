/**
 * Asset Pie Chart - 자산 배분 파이 차트
 * 포트폴리오 구성 시각화
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

interface AssetData {
  name: string;
  value: number;
  color: string;
  legendFontColor?: string;
}

interface AssetPieChartProps {
  data: AssetData[];
  totalValue: number;
}

// 자산 유형별 기본 색상
export const ASSET_COLORS = {
  stock: '#4CAF50',      // 녹색 (주식)
  bond: '#2196F3',       // 파랑 (채권)
  realEstate: '#FF9800', // 주황 (부동산)
  crypto: '#9C27B0',     // 보라 (암호화폐)
  cash: '#607D8B',       // 회색 (현금)
  other: '#795548',      // 갈색 (기타)
};

// 자산 유형 아이콘
const ASSET_ICONS: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  stock: 'trending-up',
  bond: 'document-text',
  realEstate: 'home',
  crypto: 'logo-bitcoin',
  cash: 'cash',
  other: 'ellipse',
};

export default function AssetPieChart({ data, totalValue }: AssetPieChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64; // 좌우 패딩 고려

  // 데이터가 없는 경우
  if (data.length === 0 || totalValue === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="pie-chart" size={22} color="#4CAF50" />
          <Text style={styles.title}>자산 배분</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={48} color="#444444" />
          <Text style={styles.emptyText}>표시할 자산이 없습니다</Text>
        </View>
      </View>
    );
  }

  // 차트 데이터 변환
  const chartData = data.map((item) => ({
    name: item.name,
    population: item.value,
    color: item.color,
    legendFontColor: '#AAAAAA',
    legendFontSize: 12,
  }));

  // 차트 설정
  const chartConfig = {
    backgroundColor: '#1E1E1E',
    backgroundGradientFrom: '#1E1E1E',
    backgroundGradientTo: '#1E1E1E',
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(170, 170, 170, ${opacity})`,
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Ionicons name="pie-chart" size={22} color="#4CAF50" />
        <Text style={styles.title}>자산 배분</Text>
      </View>

      {/* 파이 차트 */}
      <View style={styles.chartWrapper}>
        <PieChart
          data={chartData}
          width={chartWidth}
          height={180}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute={false}
          hasLegend={false}
          center={[chartWidth / 4, 0]}
        />
      </View>

      {/* 커스텀 범례 */}
      <View style={styles.legendContainer}>
        {data.map((item, index) => {
          const percentage = totalValue > 0
            ? ((item.value / totalValue) * 100).toFixed(1)
            : '0.0';

          return (
            <View key={index} style={styles.legendItem}>
              <View style={styles.legendLeft}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendName}>{item.name}</Text>
              </View>
              <View style={styles.legendRight}>
                <Text style={styles.legendValue}>
                  ₩{item.value.toLocaleString()}
                </Text>
                <Text style={[styles.legendPercent, { color: item.color }]}>
                  {percentage}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* 총 자산 표시 */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>총 자산</Text>
        <Text style={styles.totalValue}>₩{totalValue.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chartWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 12,
  },
  legendContainer: {
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendValue: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  legendPercent: {
    fontSize: 14,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  totalContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#888888',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
});
