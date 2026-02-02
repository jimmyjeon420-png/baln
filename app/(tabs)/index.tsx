import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import supabase from '../../src/services/supabase';
import { Asset } from '../../src/types/asset';
import { transformDbRowToAsset } from '../../src/utils/assetTransform';
import { COLORS, SIZES, TYPOGRAPHY } from '../../src/styles/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [totalAssets, setTotalAssets] = useState(0);
  const [topAssets, setTopAssets] = useState<Asset[]>([]);

  // Supabase에서 포트폴리오 데이터 로드
  const loadPortfolioData = useCallback(async () => {
    try {
      setIsLoadingAssets(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('사용자 정보 불러오기 실패:', userError);
        setTotalAssets(0);
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
        setTopAssets(assets.slice(0, 3)); // 상위 3개만 표시
      } else {
        setTotalAssets(0);
        setTopAssets([]);
      }
    } catch (error) {
      console.error('포트폴리오 로드 중 예기치 않은 오류:', error);
      setTotalAssets(0);
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
    // add-asset 화면으로 네비게이션
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
            {/* FIXED: Removed lineHeight, increased padding */}
            <Text style={styles.scoreNumber}>65점</Text>
            <Text style={styles.scoreDesc}>워렌 버핏보다 변동성이 2배 높아요.</Text>
          </View>
          <TouchableOpacity style={styles.actionButton}>
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
                ${totalAssets.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              {topAssets.length > 0 && (
                <Text style={styles.assetChange}>
                  {topAssets.length}개 자산 보유 중
                </Text>
              )}
            </View>

            {/* Asset List (Top 3) */}
            {topAssets.length > 0 ? (
              <View style={styles.listContainer}>
                {topAssets.map((asset, index) => {
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
                      <View>
                        <Text style={styles.itemName}>
                          {asset.ticker || asset.name}
                        </Text>
                        <Text style={styles.itemTicker}>
                          {asset.quantity && asset.avgPrice
                            ? `${asset.quantity.toFixed(2)} @ $${asset.avgPrice.toFixed(2)}`
                            : asset.name
                          }
                        </Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.itemValue}>
                          ${assetValue.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
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
            ) : (
              <View style={styles.emptyAssetState}>
                <Text style={styles.emptyAssetText}>자산을 추가하려면 투자 탭에서 시작하세요.</Text>
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
  scrollContent: { padding: SIZES.lg, paddingBottom: SIZES.xxxl },
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

  listContainer: { gap: SIZES.md },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SIZES.lg, borderRadius: SIZES.rMd },
  iconPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  iconText: { fontWeight: 'bold', color: COLORS.textSecondary },
  itemName: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  itemTicker: { fontSize: 12, color: COLORS.textSecondary, marginTop: SIZES.xs },
  itemRight: { alignItems: 'flex-end' },
  itemValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  itemProfit: { fontSize: 13, fontWeight: '600', marginTop: SIZES.xs },
  emptyAssetState: { backgroundColor: COLORS.surface, borderRadius: SIZES.rMd, padding: SIZES.xl, alignItems: 'center', justifyContent: 'center' },
  emptyAssetText: { fontSize: 14, color: COLORS.textSecondary },
});
