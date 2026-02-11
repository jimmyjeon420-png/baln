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
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';

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

  const handleAnalyze = async () => {
    if (!ticker.trim()) return;

    setIsLoading(true);
    try {
      // TODO: Gemini API 호출 (src/services/gemini.ts 활용)
      // 임시 Mock 데이터
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResult({
        name: '삼성전자',
        ticker: '005930',
        currentPrice: 75000,
        change: -2.3,
        overview: '글로벌 반도체 및 전자제품 제조업체',
        marketCap: '450조원',
        per: 12.5,
        pbr: 1.2,
        recommendation: 'BUY',
        reason: 'AI 반도체 수요 증가로 실적 개선 예상. 다만 단기 변동성이 있을 수 있으니 분할 매수를 권장합니다.',
      });
    } catch (error) {
      console.error('[DeepDive] 분석 실패:', error);
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
        }}
      />
      <ScrollView
        style={[s.container, { backgroundColor: colors.background }]}
        contentContainerStyle={s.content}
      >
        {/* 검색 바 */}
        <View style={[s.searchCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            value={ticker}
            onChangeText={setTicker}
            placeholder="종목 검색 (예: 삼성전자, AAPL)"
            placeholderTextColor={colors.textTertiary}
            style={[s.input, { color: colors.textPrimary }]}
            returnKeyType="search"
            onSubmitEditing={handleAnalyze}
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
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.analyzeButtonText}>AI 분석 시작</Text>
          )}
        </TouchableOpacity>

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
                <Ionicons name="bar-chart" size={18} color="#7C4DFF" />
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
    paddingVertical: 12,
    gap: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
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
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
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
    gap: 8,
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
});
