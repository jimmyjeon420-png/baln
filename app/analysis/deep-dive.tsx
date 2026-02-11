/**
 * 종목 딥다이브 - 개별 주식 심층 분석
 *
 * 역할: AI 기반 개별 종목 분석 제공
 * 사용자 흐름: 종목명 입력 → AI 분석 → 매수/매도/보유 추천
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { PriceService } from '../../src/services/PriceService';
import { AssetClass } from '../../src/types/price';
import supabase from '../../src/services/supabase';

interface AnalysisResult {
  name: string;
  ticker: string;
  currentPrice: number;
  change: number;
  overview: string;
  marketCap: string;
  per: number;
  pbr: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
}

export default function DeepDiveScreen() {
  const { colors } = useTheme();
  const [ticker, setTicker] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceService = new PriceService();

  const handleAnalyze = async () => {
    if (!ticker.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1단계: Yahoo Finance로 실시간 가격 조회
      console.log(`[DeepDive] 가격 조회 시작: ${ticker}`);
      let priceData;
      try {
        priceData = await priceService.fetchPrice(ticker, AssetClass.STOCK, 'KRW');
        console.log(`[DeepDive] 가격 조회 성공:`, priceData);
      } catch (priceError) {
        console.warn(`[DeepDive] 가격 조회 실패, AI만으로 분석:`, priceError);
        // 가격 조회 실패해도 AI 분석은 시도 (Gemini가 Google Search로 찾음)
      }

      // 2단계: Gemini AI로 종목 분석
      console.log(`[DeepDive] AI 분석 시작: ${ticker}`);
      const { data, error: geminiError } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          type: 'deep-dive',
          data: {
            ticker,
            currentPrice: priceData?.currentPrice,
            previousPrice: priceData?.previousPrice,
            percentChange: priceData?.percentChange24h,
          },
        },
      });

      if (geminiError) {
        throw new Error(`AI 분석 실패: ${geminiError.message}`);
      }

      if (!data?.data) {
        throw new Error('AI 응답이 비어있습니다');
      }

      console.log(`[DeepDive] AI 분석 완료:`, data.data);
      setResult(data.data);

    } catch (err: any) {
      console.error('[DeepDive] 분석 실패:', err);
      const errorMsg = err.message || '알 수 없는 오류가 발생했습니다';
      setError(errorMsg);
      Alert.alert('분석 실패', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'BUY':
        return '#4CAF50';
      case 'SELL':
        return '#CF6679';
      default:
        return '#FFB74D';
    }
  };

  const getRecommendationLabel = (rec: string) => {
    switch (rec) {
      case 'BUY':
        return '매수';
      case 'SELL':
        return '매도';
      default:
        return '보유';
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '종목 딥다이브',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8, padding: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={[s.container, { backgroundColor: colors.background }]}
        contentContainerStyle={s.content}
      >
        {/* 검색 바 */}
        <View style={[s.searchCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={22} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            value={ticker}
            onChangeText={setTicker}
            placeholder="종목 검색 (예: 삼성전자, AAPL)"
            placeholderTextColor={colors.textTertiary}
            style={[s.input, { color: colors.textPrimary }]}
            returnKeyType="search"
            onSubmitEditing={handleAnalyze}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          onPress={handleAnalyze}
          disabled={isLoading || !ticker.trim()}
          style={[
            s.analyzeButton,
            { backgroundColor: isLoading || !ticker.trim() ? colors.disabled : '#7C4DFF' },
          ]}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={s.analyzeButtonText}>분석 중...</Text>
            </View>
          ) : (
            <Text style={s.analyzeButtonText}>🔍 AI 분석 시작</Text>
          )}
        </TouchableOpacity>

        {/* 에러 메시지 */}
        {error && !isLoading && (
          <View style={[s.errorCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="warning" size={20} color="#CF6679" />
            <Text style={[s.errorText, { color: '#CF6679' }]}>{error}</Text>
          </View>
        )}

        {/* 결과 */}
        {result && !isLoading && (
          <View style={s.resultContainer}>
            {/* 기본 정보 */}
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.stockName, { color: colors.textPrimary }]}>{result.name}</Text>
              <Text style={[s.ticker, { color: colors.textSecondary }]}>
                {result.ticker} | ₩{result.currentPrice.toLocaleString()}
              </Text>
              <Text style={[s.overview, { color: colors.textSecondary }]}>{result.overview}</Text>
            </View>

            {/* 핵심 지표 */}
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <View style={s.cardHeader}>
                <Ionicons name="bar-chart" size={18} color="#7C4DFF" style={{ marginRight: 8 }} />
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>📊 핵심 지표</Text>
              </View>
              <View style={s.metricsGrid}>
                <View style={s.metricItem}>
                  <Text style={[s.metricLabel, { color: colors.textSecondary }]}>시가총액</Text>
                  <Text style={[s.metricValue, { color: colors.textPrimary }]}>
                    {result.marketCap}
                  </Text>
                </View>
                <View style={s.metricItem}>
                  <Text style={[s.metricLabel, { color: colors.textSecondary }]}>PER</Text>
                  <Text style={[s.metricValue, { color: colors.textPrimary }]}>
                    {result.per}
                  </Text>
                </View>
                <View style={s.metricItem}>
                  <Text style={[s.metricLabel, { color: colors.textSecondary }]}>PBR</Text>
                  <Text style={[s.metricValue, { color: colors.textPrimary }]}>
                    {result.pbr}
                  </Text>
                </View>
              </View>
            </View>

            {/* AI 의견 */}
            <View
              style={[
                s.card,
                {
                  backgroundColor: colors.surface,
                  borderLeftWidth: 4,
                  borderLeftColor: getRecommendationColor(result.recommendation),
                },
              ]}
            >
              <View style={s.cardHeader}>
                <Ionicons
                  name="bulb"
                  size={18}
                  color={getRecommendationColor(result.recommendation)}
                  style={{ marginRight: 8 }}
                />
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>🎯 AI 의견</Text>
              </View>
              <Text
                style={[
                  s.recommendation,
                  { color: getRecommendationColor(result.recommendation) },
                ]}
              >
                {getRecommendationLabel(result.recommendation)}
              </Text>
              <Text style={[s.reason, { color: colors.textSecondary }]}>{result.reason}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: 44,
    paddingVertical: 8,
  },
  analyzeButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  stockName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  ticker: {
    fontSize: 14,
    marginBottom: 12,
  },
  overview: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  recommendation: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  reason: {
    fontSize: 15,
    lineHeight: 22,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
