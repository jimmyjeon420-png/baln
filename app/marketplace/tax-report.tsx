/**
 * 세금 최적화 리포트 — 거주지/소득 입력 → CreditGate → AI 분석 → 결과
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
import TaxReportCard from '../../src/components/TaxReportCard';
import { AnalysisSkeletonLoader } from '../../src/components/MarketplaceSkeletonLoader';
import { useTaxReport } from '../../src/hooks/useAIMarketplace';
import { useHaptics } from '../../src/hooks/useHaptics';
import supabase from '../../src/services/supabase';
import type { UserTier } from '../../src/types/database';
import type { TaxResidency, TaxReportInput, TaxReportResult } from '../../src/types/marketplace';

export default function TaxReportScreen() {
  const router = useRouter();
  const { mediumTap } = useHaptics();
  const taxMutation = useTaxReport();

  const [userTier, setUserTier] = useState<UserTier>('SILVER');
  const [residency, setResidency] = useState<TaxResidency>('KR');
  const [annualIncome, setAnnualIncome] = useState('');
  const [showGate, setShowGate] = useState(false);
  const [result, setResult] = useState<TaxReportResult | null>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, portfolioRes] = await Promise.all([
          supabase.from('profiles').select('tier').eq('id', user.id).single(),
          supabase.from('portfolios').select('*').eq('user_id', user.id),
        ]);

        if (profileRes.data?.tier) setUserTier(profileRes.data.tier as UserTier);
        if (portfolioRes.data) setPortfolio(portfolioRes.data);
      };
      load();
    }, [])
  );

  const handleAnalyze = () => {
    if (portfolio.length === 0) {
      Alert.alert('포트폴리오 필요', '보유 자산이 있어야 세금 분석이 가능합니다.');
      return;
    }
    mediumTap();
    setShowGate(true);
  };

  const handleConfirm = async () => {
    setShowGate(false);
    setResult(null);

    const input: TaxReportInput = {
      residency,
      annualIncome: annualIncome ? parseInt(annualIncome.replace(/,/g, ''), 10) : undefined,
      portfolio: portfolio.map(p => ({
        ticker: p.ticker || p.name,
        name: p.name,
        currentValue: p.current_value || 0,
        costBasis: p.cost_basis || (p.avg_price || 0) * (p.quantity || 1),
        purchaseDate: p.purchase_date || p.created_at,
        quantity: p.quantity || 1,
      })),
    };

    try {
      const res = await taxMutation.mutateAsync({ input, userTier });
      setResult(res);
    } catch (err: any) {
      Alert.alert('분석 실패', err.message || '세금 분석에 실패했습니다.');
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
          <Text style={styles.headerTitle}>세금 최적화 리포트</Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={styles.subtitle}>
          AI가 분석하는 맞춤 절세 전략 & 매도 타이밍
        </Text>

        {/* 거주지 선택 */}
        <Text style={styles.sectionLabel}>세금 거주지</Text>
        <View style={styles.residencyRow}>
          <TouchableOpacity
            style={[styles.residencyCard, residency === 'KR' && styles.residencyActive]}
            onPress={() => { mediumTap(); setResidency('KR'); }}
            activeOpacity={0.7}
          >
            <Text style={styles.residencyFlag}>한국</Text>
            <Text style={[styles.residencyLabel, residency === 'KR' && styles.residencyLabelActive]}>
              한국 거주자
            </Text>
            <Text style={styles.residencyDesc}>양도소득세 + 금융소득종합과세</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.residencyCard, residency === 'US' && styles.residencyActive]}
            onPress={() => { mediumTap(); setResidency('US'); }}
            activeOpacity={0.7}
          >
            <Text style={styles.residencyFlag}>미국</Text>
            <Text style={[styles.residencyLabel, residency === 'US' && styles.residencyLabelActive]}>
              미국 거주자
            </Text>
            <Text style={styles.residencyDesc}>Capital Gains Tax + Tax-Loss Harvesting</Text>
          </TouchableOpacity>
        </View>

        {/* 연 소득 입력 */}
        <Text style={styles.sectionLabel}>연 소득 (선택)</Text>
        <TextInput
          style={styles.textInput}
          value={annualIncome}
          onChangeText={setAnnualIncome}
          placeholder="예: 50,000,000"
          placeholderTextColor="#555"
          keyboardType="numeric"
        />
        <Text style={styles.hint}>
          소득 정보를 입력하면 더 정확한 세율 계산이 가능합니다
        </Text>

        {/* 포트폴리오 요약 */}
        <View style={styles.portfolioSummary}>
          <Ionicons name="briefcase" size={18} color="#888" />
          <Text style={styles.summaryText}>
            {portfolio.length}개 자산 | 총 ₩
            {portfolio
              .reduce((s: number, p: any) => s + (p.current_value || 0), 0)
              .toLocaleString()}
          </Text>
        </View>

        {/* 분석 버튼 */}
        <TouchableOpacity
          style={[styles.analyzeButton, portfolio.length === 0 && styles.disabledButton]}
          onPress={handleAnalyze}
          disabled={portfolio.length === 0 || taxMutation.isPending}
          activeOpacity={0.7}
        >
          <Ionicons name="receipt" size={18} color="#FFF" />
          <Text style={styles.analyzeText}>세금 분석 시작</Text>
        </TouchableOpacity>

        {/* 로딩 */}
        {taxMutation.isPending && <AnalysisSkeletonLoader />}

        {/* 결과 */}
        {result && <TaxReportCard result={result} />}
      </ScrollView>

      <CreditGate
        visible={showGate}
        featureType="tax_report"
        userTier={userTier}
        loading={taxMutation.isPending}
        onConfirm={handleConfirm}
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
    marginBottom: 4,
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  sectionLabel: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 16 },
  residencyRow: { flexDirection: 'row', gap: 10 },
  residencyCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  residencyActive: { borderColor: '#66BB6A', backgroundColor: '#66BB6A10' },
  residencyFlag: { fontSize: 24, marginBottom: 4 },
  residencyLabel: { color: '#888', fontSize: 14, fontWeight: '700' },
  residencyLabelActive: { color: '#FFF' },
  residencyDesc: { color: '#666', fontSize: 10, textAlign: 'center', marginTop: 4 },
  textInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  hint: { color: '#555', fontSize: 11, marginTop: 4 },
  portfolioSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  summaryText: { color: '#888', fontSize: 13 },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#66BB6A',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  analyzeText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.4 },
});
