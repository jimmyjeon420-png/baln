import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import supabase from '../../src/services/supabase';
import { Asset } from '../../src/types/asset';
import { transformDbRowToAsset } from '../../src/utils/assetTransform';
import { COLORS, SIZES } from '../../src/styles/theme';
import AssetPieChart, { ASSET_COLORS } from '../../src/components/AssetPieChart';
import WhaleBenchmark from '../../src/components/WhaleBenchmark';
import { useWhaleComparison } from '../../src/hooks/useWhaleData';
import { PortfolioItem, calculateUserAllocation } from '../../src/services/whaleApi';

export default function HomeScreen() {
  const router = useRouter();
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [totalAssets, setTotalAssets] = useState(0);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [topAssets, setTopAssets] = useState<Asset[]>([]);

  // 포트폴리오 아이템 변환 (Whale 비교용)
  const portfolioItems: PortfolioItem[] = useMemo(() => {
    return allAssets.map((asset) => ({
      ticker: asset.ticker || asset.name,
      name: asset.name,
      currentValue: asset.quantity && asset.currentPrice
        ? asset.quantity * asset.currentPrice
        : asset.currentValue,
      assetType: asset.assetType,
    }));
  }, [allAssets]);

  // Whale 벤치마크 데이터
  const {
    whaleAllocation,
    userAllocation,
    comparison,
    isLoading: isWhaleLoading,
    refetch: refetchWhale,
  } = useWhaleComparison(portfolioItems);

  // 파이 차트용 데이터 생성
  const pieChartData = useMemo(() => {
    if (!userAllocation) return [];

    const data = [];
    if (userAllocation.stock > 0) {
      data.push({
        name: '주식',
        value: (userAllocation.stock / 100) * totalAssets,
        color: ASSET_COLORS.stock,
      });
    }
    if (userAllocation.bond > 0) {
      data.push({
        name: '채권',
        value: (userAllocation.bond / 100) * totalAssets,
        color: ASSET_COLORS.bond,
      });
    }
    if (userAllocation.realEstate > 0) {
      data.push({
        name: '부동산',
        value: (userAllocation.realEstate / 100) * totalAssets,
        color: ASSET_COLORS.realEstate,
      });
    }
    if (userAllocation.crypto > 0) {
      data.push({
        name: '암호화폐',
        value: (userAllocation.crypto / 100) * totalAssets,
        color: ASSET_COLORS.crypto,
      });
    }
    if (userAllocation.cash > 0) {
      data.push({
        name: '현금',
        value: (userAllocation.cash / 100) * totalAssets,
        color: ASSET_COLORS.cash,
      });
    }

    return data;
  }, [userAllocation, totalAssets]);

  // Supabase에서 포트폴리오 데이터 로드
  const loadPortfolioData = useCallback(async () => {
    try {
      setIsLoadingAssets(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('사용자 정보 불러오기 실패:', userError);
        setTotalAssets(0);
        setAllAssets([]);
        setTopAssets([]);
        return;
      }

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('current_value', { ascending: false });

      if (error) {
        console.error('포트폴리오 데이터 로드 오류:', error);
        setTotalAssets(0);
        setAllAssets([]);
        setTopAssets([]);
        return;
      }

      if (data && data.length > 0) {
        const assets = data.map(transformDbRowToAsset);

        // 총 자산 계산: Sum(quantity * current_price)
        const total = assets.reduce((sum, asset) => {
          if (asset.quantity && asset.currentPrice) {
            return sum + (asset.quantity * asset.currentPrice);
          }
          return sum + asset.currentValue;
        }, 0);

        setTotalAssets(total);
        setAllAssets(assets);
        setTopAssets(assets.slice(0, 3)); // 상위 3개만 표시
      } else {
        setTotalAssets(0);
        setAllAssets([]);
        setTopAssets([]);
      }
    } catch (error) {
      console.error('포트폴리오 로드 중 예기치 않은 오류:', error);
      setTotalAssets(0);
      setAllAssets([]);
      setTopAssets([]);
    } finally {
      setIsLoadingAssets(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadPortfolioData();
  }, [loadPortfolioData]);

  // 화면 포커스 시 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      loadPortfolioData();
    }, [loadPortfolioData])
  );

  const handleOCR = () => {
    router.push('/add-asset');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>내 자산</Text>
          <TouchableOpacity onPress={handleOCR} style={styles.cameraButton}>
            <Ionicons name="camera-outline" size={24} color="#191F28" />
            <Text style={styles.cameraText}>캡처</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Card (Score) */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreTextContainer}>
            <Text style={styles.scoreLabel}>포트폴리오 점수</Text>
            <Text style={styles.scoreNumber}>65점</Text>
            <Text style={styles.scoreDesc}>워렌 버핏보다 변동성이 2배 높아요.</Text>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/diagnosis')}
          >
            <Text style={styles.actionButtonText}>🚀 90점으로 올리기</Text>
          </TouchableOpacity>
        </View>

        {/* Total Asset Section */}
        {isLoadingAssets ? (
          <View style={styles.assetSection}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            <View style={styles.assetSection}>
              <Text style={styles.assetLabel}>총 자산</Text>
              <Text style={styles.assetValue}>
                ₩{totalAssets.toLocaleString('ko-KR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </Text>
              {allAssets.length > 0 && (
                <Text style={styles.assetChange}>
                  {allAssets.length}개 자산 보유 중
                </Text>
              )}
            </View>

            {/* 파이 차트 섹션 */}
            {allAssets.length > 0 && (
              <AssetPieChart data={pieChartData} totalValue={totalAssets} />
            )}

            {/* Whale Benchmark 섹션 */}
            {allAssets.length > 0 && (
              <WhaleBenchmark
                userAllocation={userAllocation}
                whaleAllocation={whaleAllocation}
                comparison={comparison}
                isLoading={isWhaleLoading}
                onRefresh={refetchWhale}
              />
            )}

            {/* Asset List (Top 3) */}
            {topAssets.length > 0 ? (
              <View style={styles.listSection}>
                <Text style={styles.listTitle}>📈 상위 보유 자산</Text>
                <View style={styles.listContainer}>
                  {topAssets.map((asset) => {
                    const assetValue = asset.quantity && asset.currentPrice
                      ? asset.quantity * asset.currentPrice
                      : asset.currentValue;
                    const costBasis = asset.costBasis || asset.currentValue;
                    const gain = assetValue - costBasis;
                    const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

                    return (
                      <View key={asset.id} style={styles.listItem}>
                        <View style={styles.iconPlaceholder}>
                          <Text style={styles.iconText}>
                            {asset.ticker ? asset.ticker[0] : asset.name[0]}
                          </Text>
                        </View>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>
                            {asset.ticker || asset.name}
                          </Text>
                          <Text style={styles.itemTicker}>
                            {asset.quantity && asset.avgPrice
                              ? `${asset.quantity.toFixed(2)} @ ₩${asset.avgPrice.toLocaleString()}`
                              : asset.name
                            }
                          </Text>
                        </View>
                        <View style={styles.itemRight}>
                          <Text style={styles.itemValue}>
                            ₩{assetValue.toLocaleString('ko-KR', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </Text>
                          <Text style={[styles.itemProfit, { color: gain >= 0 ? '#4CAF50' : '#CF6679' }]}>
                            {gain >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.emptyAssetState}>
                <Ionicons name="wallet-outline" size={48} color="#444444" />
                <Text style={styles.emptyAssetTitle}>아직 등록된 자산이 없습니다</Text>
                <Text style={styles.emptyAssetText}>
                  우측 상단 '캡처' 버튼을 눌러{'\n'}자산 스크린샷을 추가하세요
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.lg, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.xl },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary },
  cameraButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SIZES.sm, borderRadius: SIZES.rMd },
  cameraText: { marginLeft: SIZES.xs, color: COLORS.textPrimary, fontWeight: '600' },

  scoreCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.rXl, padding: SIZES.xl, marginBottom: SIZES.xl, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  scoreTextContainer: { alignItems: 'center', marginBottom: SIZES.xl },
  scoreLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SIZES.xs },
  scoreNumber: { fontSize: 56, fontWeight: '800', color: '#FF6B00', textAlign: 'center', includeFontPadding: false },
  scoreDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: SIZES.xs },
  actionButton: { backgroundColor: '#3182F6', paddingVertical: SIZES.lg, paddingHorizontal: SIZES.xl, borderRadius: SIZES.rMd, width: '100%', alignItems: 'center' },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  assetSection: { marginBottom: SIZES.xl },
  assetLabel: { fontSize: 14, color: COLORS.textSecondary },
  assetValue: { fontSize: 32, fontWeight: 'bold', color: COLORS.textPrimary, marginVertical: SIZES.md },
  assetChange: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  listSection: { marginTop: 8 },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  listContainer: { gap: SIZES.md },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SIZES.lg, borderRadius: SIZES.rMd },
  iconPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  iconText: { fontWeight: 'bold', color: '#4CAF50', fontSize: 16 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  itemTicker: { fontSize: 12, color: COLORS.textSecondary, marginTop: SIZES.xs },
  itemRight: { alignItems: 'flex-end' },
  itemValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  itemProfit: { fontSize: 13, fontWeight: '600', marginTop: SIZES.xs },

  emptyAssetState: { backgroundColor: COLORS.surface, borderRadius: SIZES.rMd, padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyAssetTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginTop: 16 },
  emptyAssetText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
