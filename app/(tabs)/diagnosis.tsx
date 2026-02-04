/**
 * AI 진단 화면 - Panic Shield & FOMO Vaccine
 * 행동재무학 기반 포트폴리오 리스크 분석
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../src/services/supabase';
import {
  analyzePortfolioRisk,
  RiskAnalysisResult,
  PortfolioAsset,
} from '../../src/services/gemini';
import PanicShieldCard from '../../src/components/PanicShieldCard';
import FomoVaccineCard from '../../src/components/FomoVaccineCard';

export default function DiagnosisScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 포트폴리오 데이터 로드
  const loadPortfolio = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('로그인이 필요합니다.');
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Portfolio fetch error:', fetchError);
        setError('포트폴리오 데이터를 불러올 수 없습니다.');
        return [];
      }

      if (!data || data.length === 0) {
        setError(null);
        return [];
      }

      // DB 데이터를 PortfolioAsset 형태로 변환
      const assets: PortfolioAsset[] = data.map((item: any) => ({
        ticker: item.ticker || 'UNKNOWN',
        name: item.name || '알 수 없는 자산',
        quantity: item.quantity || 0,
        avgPrice: item.avg_price || 0,
        currentPrice: item.current_price || item.avg_price || 0,
        currentValue: item.current_value || (item.quantity * (item.current_price || item.avg_price)) || 0,
      }));

      setError(null);
      return assets;
    } catch (err) {
      console.error('Load portfolio error:', err);
      setError('데이터 로드 중 오류가 발생했습니다.');
      return [];
    }
  }, []);

  // AI 분석 실행
  const runAnalysis = useCallback(async (assets: PortfolioAsset[]) => {
    if (assets.length === 0) {
      setAnalysisResult(null);
      return;
    }

    try {
      const result = await analyzePortfolioRisk(assets);
      setAnalysisResult(result);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('AI 분석 중 오류가 발생했습니다.');
    }
  }, []);

  // 데이터 로드 및 분석
  const loadAndAnalyze = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    const assets = await loadPortfolio();
    setPortfolio(assets);

    if (assets.length > 0) {
      await runAnalysis(assets);
    }

    setLoading(false);
    setRefreshing(false);
  }, [loadPortfolio, runAnalysis]);

  // 초기 로드
  useEffect(() => {
    loadAndAnalyze();
  }, []);

  // 화면 포커스 시 새로고침
  useFocusEffect(
    useCallback(() => {
      loadAndAnalyze(false);
    }, [loadAndAnalyze])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAndAnalyze(false);
  }, [loadAndAnalyze]);

  // 로딩 상태
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>포트폴리오 분석 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 빈 포트폴리오 상태
  if (portfolio.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 진단</Text>
          <Text style={styles.headerSubtitle}>행동재무학 기반 투자 분석</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={64} color="#4CAF50" />
          <Text style={styles.emptyTitle}>분석할 자산이 없습니다</Text>
          <Text style={styles.emptyText}>
            자산을 추가하면 AI가 포트폴리오를{'\n'}분석해드립니다
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 에러 상태
  if (error && !analysisResult) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 진단</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#CF6679" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadAndAnalyze()}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 진단</Text>
          <Text style={styles.headerSubtitle}>
            행동재무학 기반 투자 분석
          </Text>
        </View>

        {/* Panic Shield 카드 */}
        {analysisResult && (
          <PanicShieldCard
            index={analysisResult.panicShieldIndex}
            level={analysisResult.panicShieldLevel}
            stopLossGuidelines={analysisResult.stopLossGuidelines}
          />
        )}

        {/* FOMO Vaccine 카드 */}
        {analysisResult && (
          <FomoVaccineCard alerts={analysisResult.fomoAlerts} />
        )}

        {/* 맞춤 조언 섹션 */}
        {analysisResult && analysisResult.personalizedAdvice.length > 0 && (
          <View style={styles.adviceContainer}>
            <View style={styles.adviceHeader}>
              <Ionicons name="person-circle" size={24} color="#4CAF50" />
              <Text style={styles.adviceTitle}>38세 가장을 위한 맞춤 조언</Text>
            </View>
            {analysisResult.personalizedAdvice.map((advice, idx) => (
              <View key={idx} style={styles.adviceItem}>
                <Text style={styles.adviceNumber}>{idx + 1}</Text>
                <Text style={styles.adviceText}>{advice}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 포트폴리오 스냅샷 */}
        {analysisResult && (
          <View style={styles.snapshotContainer}>
            <Text style={styles.snapshotTitle}>📊 포트폴리오 스냅샷</Text>
            <View style={styles.snapshotGrid}>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>총 자산</Text>
                <Text style={styles.snapshotValue}>
                  ₩{analysisResult.portfolioSnapshot.totalValue.toLocaleString()}
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>총 손익</Text>
                <Text
                  style={[
                    styles.snapshotValue,
                    {
                      color:
                        analysisResult.portfolioSnapshot.totalGainLoss >= 0
                          ? '#4CAF50'
                          : '#CF6679',
                    },
                  ]}
                >
                  {analysisResult.portfolioSnapshot.totalGainLoss >= 0 ? '+' : ''}
                  ₩{analysisResult.portfolioSnapshot.totalGainLoss.toLocaleString()}
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>수익률</Text>
                <Text
                  style={[
                    styles.snapshotValue,
                    {
                      color:
                        analysisResult.portfolioSnapshot.gainLossPercent >= 0
                          ? '#4CAF50'
                          : '#CF6679',
                    },
                  ]}
                >
                  {analysisResult.portfolioSnapshot.gainLossPercent >= 0 ? '+' : ''}
                  {analysisResult.portfolioSnapshot.gainLossPercent.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>분산 점수</Text>
                <Text style={styles.snapshotValue}>
                  {analysisResult.portfolioSnapshot.diversificationScore}/100
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 보유 자산 리스트 */}
        <View style={styles.assetListContainer}>
          <Text style={styles.assetListTitle}>
            📦 보유 자산 ({portfolio.length}개)
          </Text>
          {portfolio.map((asset, idx) => {
            const gainLoss = asset.currentPrice - asset.avgPrice;
            const gainLossPercent =
              asset.avgPrice > 0 ? (gainLoss / asset.avgPrice) * 100 : 0;
            return (
              <View key={idx} style={styles.assetItem}>
                <View style={styles.assetLeft}>
                  <View style={styles.assetIcon}>
                    <Text style={styles.assetIconText}>
                      {asset.ticker[0]}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.assetTicker}>{asset.ticker}</Text>
                    <Text style={styles.assetName}>{asset.name}</Text>
                  </View>
                </View>
                <View style={styles.assetRight}>
                  <Text style={styles.assetValue}>
                    ₩{asset.currentValue.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.assetGain,
                      { color: gainLossPercent >= 0 ? '#4CAF50' : '#CF6679' },
                    ]}
                  >
                    {gainLossPercent >= 0 ? '+' : ''}
                    {gainLossPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 12,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#CF6679',
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  adviceContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  adviceNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  adviceText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  snapshotContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  snapshotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  snapshotItem: {
    width: '47%',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
  },
  snapshotLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
  },
  snapshotValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assetListContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
  },
  assetListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  assetTicker: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assetName: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assetGain: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
