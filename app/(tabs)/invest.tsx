/**
 * Tab 2: 투자 (Investment) - 보유 종목 상세 현황
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import { Asset, AssetType } from '../../src/types/asset';
import { transformDbRowToAsset } from '../../src/utils/assetTransform';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../../src/styles/theme';
import { useTheme } from '../../src/hooks/useTheme';

interface AssetWithPerformance {
  id: string;
  name: string;
  currentValue: number;
  costBasis?: number;
  gain: number;
  gainPercent: number;
  assetType: AssetType;
}

export default function InvestScreen() {
  const router = useRouter();
  const { colors: COLORS } = useTheme();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase에서 자산 데이터 로드
  const loadAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await getCurrentUser();

      if (!user) {
        console.error('사용자 정보 불러오기 실패');
        setAssets([]);
        return;
      }

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('current_value', { ascending: false });

      if (error) {
        console.error('자산 데이터 로드 오류:', error);
        setAssets([]);
        return;
      }

      if (data) {
        const transformedAssets = data.map(transformDbRowToAsset);
        setAssets(transformedAssets);
      }
    } catch (error) {
      console.error('Unexpected error loading assets:', error);
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // 화면 포커스 시 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      loadAssets();
    }, [loadAssets])
  );

  // 자산에 수익/손실 계산 추가 + currentValue로 정렬 (높은 순서)
  const assetsWithPerformance = useMemo((): AssetWithPerformance[] => {
    const processed = assets.map((asset) => {
      const costBasis = asset.costBasis || 0;
      const gain = asset.currentValue - costBasis;
      const gainPercent = costBasis > 0
        ? (gain / costBasis) * 100
        : 0;

      return {
        id: asset.id,
        name: asset.name,
        currentValue: asset.currentValue,
        costBasis: asset.costBasis,
        gain,
        gainPercent,
        assetType: asset.assetType,
      };
    });

    // currentValue 기준 내림차순 정렬 (높은 순서)
    return processed.sort((a, b) => b.currentValue - a.currentValue);
  }, [assets]);

  // 총 수익/손실 계산
  const totalGain = useMemo(() => {
    return assetsWithPerformance.reduce((sum, asset) => sum + asset.gain, 0);
  }, [assetsWithPerformance]);

  const totalGainPercent = useMemo(() => {
    const totalCostBasis = assetsWithPerformance.reduce(
      (sum, asset) => sum + (asset.costBasis || 0),
      0
    );
    return totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;
  }, [assetsWithPerformance, totalGain]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={[TYPOGRAPHY.headingLarge, { color: COLORS.textPrimary }]}>
            투자
          </Text>
        </View>

        {/* 성과 요약 카드 */}
        {assetsWithPerformance.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: COLORS.surface }]}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textSecondary }]}>
                  총 수익/손실
                </Text>
                <Text
                  style={[
                    TYPOGRAPHY.headingMedium,
                    {
                      color: totalGain >= 0 ? COLORS.buy : COLORS.sell,
                      marginTop: SIZES.xs,
                    },
                  ]}
                >
                  {totalGain >= 0 ? '+' : ''}{(totalGain / 10000000).toFixed(2)}억 원
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: COLORS.border }]} />
              <View>
                <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textSecondary }]}>
                  수익률
                </Text>
                <Text
                  style={[
                    TYPOGRAPHY.headingMedium,
                    {
                      color: totalGainPercent >= 0 ? COLORS.buy : COLORS.sell,
                      marginTop: SIZES.xs,
                    },
                  ]}
                >
                  {totalGainPercent >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 보유 종목 섹션 */}
        <View style={styles.section}>
          <Text
            style={[
              TYPOGRAPHY.labelMedium,
              { color: COLORS.textPrimary, marginBottom: SIZES.lg },
            ]}
          >
            보유 종목 ({assetsWithPerformance.length})
          </Text>

          {assetsWithPerformance.length > 0 ? (
            <FlatList
              scrollEnabled={false}
              data={assetsWithPerformance}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View key={item.id} style={[styles.assetCard, { backgroundColor: COLORS.surface }]}>
                  {/* 자산명 & 분류 */}
                  <View style={styles.assetHeader}>
                    <View style={styles.assetInfo}>
                      <Text style={[TYPOGRAPHY.labelSmall, { color: COLORS.textPrimary }]}>
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          TYPOGRAPHY.bodySmall,
                          { color: COLORS.textSecondary, marginTop: SIZES.xs },
                        ]}
                      >
                        {item.assetType === AssetType.LIQUID ? '유동 자산' : '비유동 자산'}
                      </Text>
                    </View>
                    <View style={styles.assetValue}>
                      <Text style={[TYPOGRAPHY.labelSmall, { color: COLORS.textPrimary }]}>
                        {(item.currentValue / 10000000).toFixed(2)}억 원
                      </Text>
                    </View>
                  </View>

                  {/* 수익/손실 */}
                  <View style={[styles.performanceRow, { marginTop: SIZES.md }]}>
                    <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textSecondary }]}>
                      수익/손실
                    </Text>
                    <View style={styles.performanceValue}>
                      <Text
                        style={[
                          TYPOGRAPHY.labelSmall,
                          {
                            color: item.gain >= 0 ? COLORS.buy : COLORS.sell,
                          },
                        ]}
                      >
                        {item.gain >= 0 ? '+' : ''}
                        {(item.gain / 10000000).toFixed(2)}억 원
                      </Text>
                      <Text
                        style={[
                          TYPOGRAPHY.bodySmall,
                          {
                            color: item.gain >= 0 ? COLORS.buy : COLORS.sell,
                            marginLeft: SIZES.md,
                          },
                        ]}
                      >
                        ({item.gainPercent >= 0 ? '+' : ''}{item.gainPercent.toFixed(1)}%)
                      </Text>
                    </View>
                  </View>

                  {/* 취득가 */}
                  <View style={[styles.detailRow, { marginTop: SIZES.md }]}>
                    <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textSecondary }]}>
                      취득가
                    </Text>
                    <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textPrimary }]}>
                      {(item.costBasis ? item.costBasis / 10000000 : 0).toFixed(2)}억 원
                    </Text>
                  </View>
                </View>
              )}
            />
          ) : (
            <View style={[styles.emptyState, { backgroundColor: COLORS.surface }]}>
              <Ionicons name="briefcase-outline" size={64} color={COLORS.textTertiary} />
              <Text style={[TYPOGRAPHY.headingSmall, { color: COLORS.textSecondary, marginTop: SIZES.lg }]}>
                아직 자산이 없어요
              </Text>
              <Text
                style={[
                  TYPOGRAPHY.bodySmall,
                  { color: COLORS.textTertiary, marginTop: SIZES.md },
                ]}
              >
                첫 기록을 남겨보세요!
              </Text>
            </View>
          )}
        </View>

        {/* 설명 */}
        <View style={[styles.infoBox, { backgroundColor: COLORS.surfaceLight, borderLeftColor: COLORS.primary }]}>
          <Text style={[TYPOGRAPHY.labelSmall, { color: COLORS.textPrimary, marginBottom: SIZES.sm }]}>
            📊 수익률 계산
          </Text>
          <Text
            style={[
              TYPOGRAPHY.bodySmall,
              { color: COLORS.textSecondary, lineHeight: 20 },
            ]}
          >
            수익률은 (현재가 - 매수가) / 매수가 × 100으로 계산됩니다. 빨강은 수익, 파랑은 손실을 나타냅니다.
          </Text>
        </View>
      </ScrollView>

      {/* FAB (Floating Action Button) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: COLORS.primary }]}
        onPress={() => router.push('/add-asset')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    paddingBottom: SIZES.xxxl + 60, // 탭 바 높이(80) + 여유 공간 대응
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: SIZES.xl,
  },
  summaryCard: {
    borderRadius: SIZES.rMd,
    padding: SIZES.lg,
    marginBottom: SIZES.xl,
    ...SHADOWS.small,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  divider: {
    width: 1,
    marginHorizontal: SIZES.lg,
    height: 50,
  },
  section: {
    marginBottom: SIZES.xl,
  },
  assetCard: {
    borderRadius: SIZES.rMd,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assetInfo: {
    flex: 1,
  },
  assetValue: {
    alignItems: 'flex-end',
    marginLeft: SIZES.md,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    borderRadius: SIZES.rMd,
    padding: SIZES.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  infoBox: {
    borderRadius: SIZES.rMd,
    padding: SIZES.lg,
    borderLeftWidth: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 90, // 탭 바(~80px) + 여유 공간
    right: SIZES.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
});
