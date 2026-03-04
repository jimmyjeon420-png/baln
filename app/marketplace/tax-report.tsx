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
import supabase, { getCurrentUser } from '../../src/services/supabase';
import type { UserTier } from '../../src/types/database';
import type { TaxResidency, TaxReportInput, TaxReportResult } from '../../src/types/marketplace';
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';

export default function TaxReportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { mediumTap } = useHaptics();
  const taxMutation = useTaxReport();

  const [userTier, setUserTier] = useState<UserTier>('SILVER');
  const [residency, setResidency] = useState<TaxResidency>('KR');
  const [annualIncome, setAnnualIncome] = useState('');
  const [showGate, setShowGate] = useState(false);
  const [result, setResult] = useState<TaxReportResult | null>(null);
  const [portfolio, setPortfolio] = useState<Record<string, unknown>[]>([]);

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
          console.warn('[TaxReport] 데이터 로드 실패:', err);
        }
      };
      load();
    }, [])
  );

  const handleAnalyze = () => {
    if (portfolio.length === 0) {
      Alert.alert(t('tax_report.alert.portfolio_required_title'), t('tax_report.alert.portfolio_required_message'));
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
        ticker: (p.ticker as string) || (p.name as string),
        name: p.name as string,
        currentValue: (p.current_value as number) || 0,
        costBasis: (p.cost_basis as number) || ((p.avg_price as number) || 0) * ((p.quantity as number) || 1),
        purchaseDate: (p.purchase_date as string) || (p.created_at as string),
        quantity: (p.quantity as number) || 1,
      })),
    };

    try {
      const res = await taxMutation.mutateAsync({ input, userTier });
      setResult(res);
    } catch (err: unknown) {
      Alert.alert(t('tax_report.alert.analysis_failed_title'), (err instanceof Error ? err.message : undefined) || t('tax_report.alert.analysis_failed_message'));
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('tax_report.header_title')}</Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('tax_report.subtitle')}
        </Text>

        {/* 거주지 선택 */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>{t('tax_report.residency_label')}</Text>
        <View style={styles.residencyRow}>
          <TouchableOpacity
            style={[styles.residencyCard, { backgroundColor: colors.surface, borderColor: colors.border }, residency === 'KR' && styles.residencyActive]}
            onPress={() => { mediumTap(); setResidency('KR'); }}
            activeOpacity={0.7}
          >
            <Text style={styles.residencyFlag}>{t('tax_report.residency.kr_flag')}</Text>
            <Text style={[styles.residencyLabel, { color: colors.textSecondary }, residency === 'KR' && { color: colors.textPrimary }]}>
              {t('tax_report.residency.kr_label')}
            </Text>
            <Text style={[styles.residencyDesc, { color: colors.textTertiary }]}>{t('tax_report.residency.kr_desc')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.residencyCard, { backgroundColor: colors.surface, borderColor: colors.border }, residency === 'US' && styles.residencyActive]}
            onPress={() => { mediumTap(); setResidency('US'); }}
            activeOpacity={0.7}
          >
            <Text style={styles.residencyFlag}>{t('tax_report.residency.us_flag')}</Text>
            <Text style={[styles.residencyLabel, { color: colors.textSecondary }, residency === 'US' && { color: colors.textPrimary }]}>
              {t('tax_report.residency.us_label')}
            </Text>
            <Text style={[styles.residencyDesc, { color: colors.textTertiary }]}>{t('tax_report.residency.us_desc')}</Text>
          </TouchableOpacity>
        </View>

        {/* 연 소득 입력 */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>{t('tax_report.income_label')}</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderStrong }]}
          value={annualIncome}
          onChangeText={setAnnualIncome}
          placeholder={t('tax_report.income_placeholder')}
          placeholderTextColor={colors.textQuaternary}
          keyboardType="numeric"
        />
        <Text style={[styles.hint, { color: colors.textQuaternary }]}>
          {t('tax_report.income_hint')}
        </Text>

        {/* 포트폴리오 요약 */}
        <View style={[styles.portfolioSummary, { backgroundColor: colors.surface }]}>
          <Ionicons name="briefcase" size={18} color={colors.textSecondary} />
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {portfolio.length}개 자산 | 총 ₩
            {portfolio
              .reduce((s: number, p: Record<string, unknown>) => s + ((p.current_value as number) || 0), 0)
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
          <Text style={styles.analyzeText}>{t('tax_report.analyze_button')}</Text>
        </TouchableOpacity>

        {/* 로딩 */}
        {taxMutation.isPending && <AnalysisSkeletonLoader />}

        {/* 결과 */}
        {result && <TaxReportCard result={result} />}

        {/* 세금 면책 문구 */}
        <View style={styles.taxDisclaimer}>
          <Text style={[styles.taxDisclaimerTitle, { color: colors.primaryLight }]}>{t('tax_report.disclaimer_title')}</Text>
          <Text style={[styles.taxDisclaimerText, { color: colors.textSecondary }]}>
            {t('tax_report.disclaimer_text')}
          </Text>
        </View>
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
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 16 },
  residencyRow: { flexDirection: 'row', gap: 10 },
  residencyCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  residencyActive: { borderColor: '#66BB6A', backgroundColor: '#66BB6A10' },
  residencyFlag: { fontSize: 25, marginBottom: 4 },
  residencyLabel: { fontSize: 15, fontWeight: '700' },
  residencyDesc: { fontSize: 11, textAlign: 'center', marginTop: 4 },
  textInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  hint: { fontSize: 12, marginTop: 4 },
  portfolioSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  summaryText: { fontSize: 14 },
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
  analyzeText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  disabledButton: { opacity: 0.4 },
  taxDisclaimer: {
    marginTop: 20,
    backgroundColor: 'rgba(102, 187, 106, 0.06)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(102, 187, 106, 0.15)',
  },
  taxDisclaimerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  taxDisclaimerText: {
    fontSize: 12,
    lineHeight: 19,
  },
});
