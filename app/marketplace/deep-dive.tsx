/**
 * AI 종목 딥다이브 — 종목 선택 → CreditGate → AI 분석 → 결과
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CreditGate from '../../src/components/CreditGate';
import DeepDiveResultCard from '../../src/components/DeepDiveResultCard';
import { AnalysisSkeletonLoader } from '../../src/components/MarketplaceSkeletonLoader';
import { useDeepDive } from '../../src/hooks/useAIMarketplace';
import { useHaptics } from '../../src/hooks/useHaptics';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import type { UserTier } from '../../src/types/database';
import type { DeepDiveInput, DeepDiveResult } from '../../src/types/marketplace';

export default function DeepDiveScreen() {
  const router = useRouter();
  const { mediumTap } = useHaptics();
  const deepDiveMutation = useDeepDive();

  const [userTier, setUserTier] = useState<UserTier>('SILVER');
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [showGate, setShowGate] = useState(false);
  const [result, setResult] = useState<DeepDiveResult | null>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);

  // 포트폴리오 & 티어 로드 (에러 시에도 화면 렌더링 보장)
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const user = await getCurrentUser();
          if (!user) return;

          const [profileRes, portfolioRes] = await Promise.all([
            supabase.from('profiles').select('tier').eq('id', user.id).single(),
            supabase.from('portfolios').select('*').eq('user_id', user.id),
          ]);

          if (profileRes.data?.tier) setUserTier(profileRes.data.tier as UserTier);
          if (portfolioRes.data) setPortfolio(portfolioRes.data);
        } catch (err) {
          console.warn('[DeepDive] 데이터 로드 실패:', err);
        }
      };
      load();
    }, [])
  );

  const handleSelectStock = (asset: any) => {
    mediumTap();
    setTicker(asset.ticker || '');
    setName(asset.name || asset.ticker || '');
  };

  const handleAnalyze = () => {
    if (!ticker.trim()) {
      Alert.alert('종목 입력', '분석할 종목 코드를 입력해주세요.');
      return;
    }
    mediumTap();
    setShowGate(true);
  };

  const handleConfirmAnalysis = async () => {
    setShowGate(false);
    setResult(null);

    const input: DeepDiveInput = {
      ticker: ticker.toUpperCase(),
      name: name || ticker.toUpperCase(),
      currentPrice: portfolio.find(p => p.ticker === ticker.toUpperCase())?.current_price,
      avgPrice: portfolio.find(p => p.ticker === ticker.toUpperCase())?.avg_price,
      quantity: portfolio.find(p => p.ticker === ticker.toUpperCase())?.quantity,
    };

    try {
      const res = await deepDiveMutation.mutateAsync({ input, userTier });
      setResult(res);
    } catch (err: any) {
      Alert.alert('분석 실패', err.message || 'AI 분석에 실패했습니다. 크레딧은 환불됩니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI 종목 딥다이브</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* 종목 입력 */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>종목 코드</Text>
          <TextInput
            style={styles.textInput}
            value={ticker}
            onChangeText={setTicker}
            placeholder="예: AAPL, TSLA, 005930"
            placeholderTextColor="#555"
            autoCapitalize="characters"
          />
          <Text style={styles.inputLabel}>종목명 (선택)</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="예: 애플, 테슬라"
            placeholderTextColor="#555"
          />
        </View>

        {/* 보유 종목 빠른 선택 */}
        {portfolio.length > 0 && (
          <View style={styles.quickSelect}>
            <Text style={styles.quickLabel}>내 보유 종목</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {portfolio
                  .filter(p => p.ticker)
                  .map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.chip,
                        ticker === p.ticker && styles.chipActive,
                      ]}
                      onPress={() => handleSelectStock(p)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          ticker === p.ticker && styles.chipTextActive,
                        ]}
                      >
                        {p.ticker}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* 분석 시작 버튼 */}
        <TouchableOpacity
          style={[styles.analyzeButton, !ticker.trim() && styles.disabledButton]}
          onPress={handleAnalyze}
          disabled={!ticker.trim() || deepDiveMutation.isPending}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={18} color="#FFF" />
          <Text style={styles.analyzeButtonText}>딥다이브 분석 시작</Text>
        </TouchableOpacity>

        {/* 로딩 스켈레톤 */}
        {deepDiveMutation.isPending && <AnalysisSkeletonLoader />}

        {/* 결과 */}
        {result && <DeepDiveResultCard result={result} />}
      </ScrollView>

      {/* 크레딧 게이트 */}
      <CreditGate
        visible={showGate}
        featureType="deep_dive"
        userTier={userTier}
        loading={deepDiveMutation.isPending}
        onConfirm={handleConfirmAnalysis}
        onCancel={() => setShowGate(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  inputSection: { marginBottom: 16 },
  inputLabel: { color: '#888', fontSize: 13, marginBottom: 6, marginTop: 10 },
  textInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  quickSelect: { marginBottom: 16 },
  quickLabel: { color: '#888', fontSize: 13, marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: { backgroundColor: '#7C4DFF20', borderColor: '#7C4DFF' },
  chipText: { color: '#888', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#7C4DFF' },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4FC3F7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  analyzeButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.4 },
});
