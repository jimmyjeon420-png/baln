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

const SCENARIO_PRESETS: {
  id: WhatIfScenario;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}[] = [
  {
    id: 'interest_rate_change',
    label: '금리 변동',
    icon: 'trending-up',
    color: '#FFA726',
    description: '기준금리가 0.5%p 인상/인하되면?',
  },
  {
    id: 'stock_crash',
    label: '특정 종목 하락',
    icon: 'arrow-down',
    color: '#CF6679',
    description: '보유 종목이 20% 급락하면?',
  },
  {
    id: 'market_crash',
    label: '시장 전체 하락',
    icon: 'thunderstorm',
    color: '#EF5350',
    description: '시장이 30% 폭락하면? (코로나 급)',
  },
  {
    id: 'currency_change',
    label: '환율 변동',
    icon: 'swap-horizontal',
    color: '#4FC3F7',
    description: '원/달러 환율이 10% 변동하면?',
  },
  {
    id: 'custom',
    label: '자유 시나리오',
    icon: 'create',
    color: '#7C4DFF',
    description: '원하는 시나리오를 직접 입력',
  },
];

export default function WhatIfScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { mediumTap } = useHaptics();
  const whatIfMutation = useWhatIf();

  const [userTier, setUserTier] = useState<UserTier>('SILVER');
  const [selectedScenario, setSelectedScenario] = useState<WhatIfScenario | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [showGate, setShowGate] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);

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
      Alert.alert('시나리오 선택', '시뮬레이션할 시나리오를 선택해주세요.');
      return;
    }
    if (selectedScenario === 'custom' && !customDescription.trim()) {
      Alert.alert('시나리오 입력', '시나리오 설명을 입력해주세요.');
      return;
    }
    if (portfolio.length === 0) {
      Alert.alert('포트폴리오 필요', '보유 자산이 있어야 시뮬레이션할 수 있습니다.');
      return;
    }
    mediumTap();
    setShowGate(true);
  };

  const handleConfirm = async () => {
    setShowGate(false);
    setResult(null);

    const preset = SCENARIO_PRESETS.find(p => p.id === selectedScenario);
    const totalValue = portfolio.reduce((s: number, p: any) => s + (p.current_value || 0), 0);

    const input: WhatIfInput = {
      scenario: selectedScenario!,
      description: selectedScenario === 'custom'
        ? customDescription
        : preset?.description || '',
      portfolio: portfolio.map(p => ({
        ticker: p.ticker || p.name,
        name: p.name,
        currentValue: p.current_value || 0,
        allocation: totalValue > 0
          ? Math.round((p.current_value / totalValue) * 100)
          : 0,
      })),
    };

    try {
      const res = await whatIfMutation.mutateAsync({ input, userTier });
      setResult(res);
    } catch (err: any) {
      Alert.alert('시뮬레이션 실패', err.message || '분석에 실패했습니다.');
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>What-If 시뮬레이터</Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          "만약 ~하면?" 포트폴리오 영향을 AI가 분석합니다
        </Text>

        {/* 시나리오 프리셋 */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>시나리오 선택</Text>
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
              <Text style={[styles.scenarioLabel, { color: colors.textPrimary }]}>{preset.label}</Text>
              <Text style={[styles.scenarioDesc, { color: colors.textSecondary }]}>{preset.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 자유 시나리오 입력 */}
        {selectedScenario === 'custom' && (
          <TextInput
            style={[styles.customInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderStrong }]}
            value={customDescription}
            onChangeText={setCustomDescription}
            placeholder="시나리오를 자유롭게 입력하세요..."
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
          <Text style={styles.simulateText}>시뮬레이션 실행</Text>
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
