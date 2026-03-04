/**
 * What-If 시뮬레이터 — 시나리오 선택 → CreditGate → 시뮬레이션 → 결과
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
import WhatIfResultCard from '../../src/components/WhatIfResultCard';
import { AnalysisSkeletonLoader } from '../../src/components/MarketplaceSkeletonLoader';
import { useWhatIf } from '../../src/hooks/useAIMarketplace';
import { useHaptics } from '../../src/hooks/useHaptics';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import type { UserTier } from '../../src/types/database';
import type { WhatIfScenario, WhatIfInput, WhatIfResult } from '../../src/types/marketplace';
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';

const SCENARIO_PRESETS: {
  id: WhatIfScenario;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  descKey: string;
}[] = [
  {
    id: 'interest_rate_change',
    labelKey: 'what_if.scenario.interest_rate',
    icon: 'trending-up',
    color: '#FFA726',
    descKey: 'what_if.scenario.interest_rate_desc',
  },
  {
    id: 'stock_crash',
    labelKey: 'what_if.scenario.stock_crash',
    icon: 'arrow-down',
    color: '#CF6679',
    descKey: 'what_if.scenario.stock_crash_desc',
  },
  {
    id: 'market_crash',
    labelKey: 'what_if.scenario.market_crash',
    icon: 'thunderstorm',
    color: '#EF5350',
    descKey: 'what_if.scenario.market_crash_desc',
  },
  {
    id: 'currency_change',
    labelKey: 'what_if.scenario.currency_change',
    icon: 'swap-horizontal',
    color: '#4FC3F7',
    descKey: 'what_if.scenario.currency_change_desc',
  },
  {
    id: 'custom',
    labelKey: 'what_if.scenario.custom',
    icon: 'create',
    color: '#7C4DFF',
    descKey: 'what_if.scenario.custom_desc',
  },
];

export default function WhatIfScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { mediumTap } = useHaptics();
  const whatIfMutation = useWhatIf();

  const [userTier, setUserTier] = useState<UserTier>('SILVER');
  const [selectedScenario, setSelectedScenario] = useState<WhatIfScenario | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [showGate, setShowGate] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);
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
          console.warn('[WhatIf] 데이터 로드 실패:', err);
        }
      };
      load();
    }, [])
  );

  const handleSimulate = () => {
    if (!selectedScenario) {
      Alert.alert(t('what_if.alert.select_scenario_title'), t('what_if.alert.select_scenario_message'));
      return;
    }
    if (selectedScenario === 'custom' && !customDescription.trim()) {
      Alert.alert(t('what_if.alert.enter_scenario_title'), t('what_if.alert.enter_scenario_message'));
      return;
    }
    if (portfolio.length === 0) {
      Alert.alert(t('what_if.alert.portfolio_required_title'), t('what_if.alert.portfolio_required_message'));
      return;
    }
    mediumTap();
    setShowGate(true);
  };

  const handleConfirm = async () => {
    setShowGate(false);
    setResult(null);

    const preset = SCENARIO_PRESETS.find(p => p.id === selectedScenario);
    const totalValue = portfolio.reduce((s: number, p: Record<string, unknown>) => s + ((p.current_value as number) || 0), 0);

    const input: WhatIfInput = {
      scenario: selectedScenario as WhatIfScenario,
      description: selectedScenario === 'custom'
        ? customDescription
        : (preset ? t(preset.descKey) : ''),
      portfolio: portfolio.map(p => ({
        ticker: (p.ticker as string) || (p.name as string),
        name: p.name as string,
        currentValue: (p.current_value as number) || 0,
        allocation: totalValue > 0
          ? Math.round(((p.current_value as number) / totalValue) * 100)
          : 0,
      })),
    };

    try {
      const res = await whatIfMutation.mutateAsync({ input, userTier });
      setResult(res);
    } catch (err: unknown) {
      Alert.alert(t('what_if.alert.simulation_failed_title'), (err instanceof Error ? err.message : undefined) || t('what_if.alert.simulation_failed_message'));
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('what_if.header_title')}</Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('what_if.subtitle')}
        </Text>

        {/* 시나리오 프리셋 */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>{t('what_if.scenario_label')}</Text>
        <View style={styles.scenarioList}>
          {SCENARIO_PRESETS.map(preset => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.scenarioCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                selectedScenario === preset.id && {
                  borderColor: preset.color,
                  backgroundColor: preset.color + '10',
                },
              ]}
              onPress={() => {
                mediumTap();
                setSelectedScenario(preset.id);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={preset.icon} size={24} color={preset.color} />
              <Text style={[styles.scenarioLabel, { color: colors.textPrimary }]}>{t(preset.labelKey)}</Text>
              <Text style={[styles.scenarioDesc, { color: colors.textSecondary }]}>{t(preset.descKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 자유 시나리오 입력 */}
        {selectedScenario === 'custom' && (
          <TextInput
            style={[styles.customInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderStrong }]}
            value={customDescription}
            onChangeText={setCustomDescription}
            placeholder={t('what_if.custom_placeholder')}
            placeholderTextColor={colors.textQuaternary}
            multiline
            numberOfLines={3}
          />
        )}

        {/* 시뮬레이션 버튼 */}
        <TouchableOpacity
          style={[styles.simulateButton, !selectedScenario && styles.disabledButton]}
          onPress={handleSimulate}
          disabled={!selectedScenario || whatIfMutation.isPending}
          activeOpacity={0.7}
        >
          <Ionicons name="flask" size={18} color="#FFF" />
          <Text style={styles.simulateText}>{t('what_if.simulate_button')}</Text>
        </TouchableOpacity>

        {/* 로딩 */}
        {whatIfMutation.isPending && <AnalysisSkeletonLoader />}

        {/* 결과 */}
        {result && <WhatIfResultCard result={result} />}
      </ScrollView>

      <CreditGate
        visible={showGate}
        featureType="what_if"
        userTier={userTier}
        loading={whatIfMutation.isPending}
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
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  scenarioList: { gap: 8, marginBottom: 16 },
  scenarioCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  scenarioLabel: { fontSize: 16, fontWeight: '700' },
  scenarioDesc: { fontSize: 13 },
  customInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFA726',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  simulateText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  disabledButton: { opacity: 0.4 },
});
