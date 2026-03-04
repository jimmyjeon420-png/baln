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
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';

export default function DeepDiveScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { mediumTap } = useHaptics();
  const deepDiveMutation = useDeepDive();

  const [userTier, setUserTier] = useState<UserTier>('SILVER');
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [showGate, setShowGate] = useState(false);
  const [result, setResult] = useState<DeepDiveResult | null>(null);
  const [portfolio, setPortfolio] = useState<Record<string, unknown>[]>([]);

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

  const handleSelectStock = (asset: Record<string, unknown>) => {
    mediumTap();
    setTicker((asset.ticker as string) || '');
    setName((asset.name as string) || (asset.ticker as string) || '');
  };

  const handleAnalyze = () => {
    if (!ticker.trim()) {
      Alert.alert(t('deep_dive.alert.ticker_required_title'), t('deep_dive.alert.ticker_required_message'));
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
      currentPrice: portfolio.find(p => p.ticker === ticker.toUpperCase())?.current_price as number | undefined,
      avgPrice: portfolio.find(p => p.ticker === ticker.toUpperCase())?.avg_price as number | undefined,
      quantity: portfolio.find(p => p.ticker === ticker.toUpperCase())?.quantity as number | undefined,
    };

    try {
      const res = await deepDiveMutation.mutateAsync({ input, userTier });
      setResult(res);
    } catch (err: unknown) {
      Alert.alert(t('deep_dive.alert.analysis_failed_title'), (err instanceof Error ? err.message : undefined) || t('deep_dive.alert.analysis_failed_message'));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('deep_dive.header_title')}</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* 종목 입력 */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('deep_dive.ticker_label')}</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderStrong }]}
            value={ticker}
            onChangeText={setTicker}
            placeholder={t('deep_dive.ticker_placeholder')}
            placeholderTextColor={colors.textQuaternary}
            autoCapitalize="characters"
          />
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('deep_dive.name_label')}</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderStrong }]}
            value={name}
            onChangeText={setName}
            placeholder={t('deep_dive.name_placeholder')}
            placeholderTextColor={colors.textQuaternary}
          />
        </View>

        {/* 보유 종목 빠른 선택 */}
        {portfolio.length > 0 && (
          <View style={styles.quickSelect}>
            <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>{t('deep_dive.my_holdings')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {portfolio
                  .filter(p => p.ticker)
                  .map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.chip,
                        { backgroundColor: colors.surface, borderColor: colors.borderStrong },
                        ticker === p.ticker && styles.chipActive,
                      ]}
                      onPress={() => handleSelectStock(p)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: colors.textSecondary },
                          ticker === p.ticker && styles.chipTextActive,
                        ]}
                      >
                        {String(p.ticker)}
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
          <Text style={styles.analyzeButtonText}>{t('deep_dive.analyze_button')}</Text>
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
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  inputSection: { marginBottom: 16 },
  inputLabel: { fontSize: 14, marginBottom: 6, marginTop: 10 },
  textInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  quickSelect: { marginBottom: 16 },
  quickLabel: { fontSize: 14, marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: '#7C4DFF20', borderColor: '#7C4DFF' },
  chipText: { fontSize: 14, fontWeight: '600' },
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
  analyzeButtonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  disabledButton: { opacity: 0.4 },
});
