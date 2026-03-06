/**
 * ScenarioSelector — 30초 게이트웨이 (이승건 빼기 전략)
 *
 * 역할: 3개 수평 카드로 시나리오 선택 (기존 4개에서 축소)
 * 선택 시 scale 애니메이션 + primary 보더
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

export type ScenarioType = 'market_correction' | 'bear_market' | 'rate_shock';

interface ScenarioOption {
  type: ScenarioType;
  emoji: string;
  title: string;
  subtitle: string;
  magnitude: string;
}

type TFunc = (key: string, params?: Record<string, unknown>) => string;

function getScenarios(t: TFunc): ScenarioOption[] {
  return [
    {
      type: 'market_correction',
      emoji: '📉',
      title: t('scenarioSelector.marketCorrection'),
      subtitle: t('scenarioSelector.marketCorrectionSub'),
      magnitude: '-10%',
    },
    {
      type: 'bear_market',
      emoji: '🐻',
      title: t('scenarioSelector.bearMarket'),
      subtitle: t('scenarioSelector.bearMarketSub'),
      magnitude: '-20%',
    },
    {
      type: 'rate_shock',
      emoji: '🏦',
      title: t('scenarioSelector.rateShock'),
      subtitle: t('scenarioSelector.rateShockSub'),
      magnitude: '+3%p',
    },
  ];
}

interface ScenarioSelectorProps {
  selected: ScenarioType | null;
  onSelect: (type: ScenarioType) => void;
  disabled?: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  selected,
  onSelect,
  disabled,
}) => {
  const { colors } = useTheme();
  const { t } = useLocale();
  const scenarios = getScenarios(t);

  return (
    <View style={s.container}>
      <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
        {t('scenarioSelector.title')}
      </Text>
      <Text style={[s.sectionSubtitle, { color: colors.textTertiary }]}>
        {t('scenarioSelector.subtitle')}
      </Text>

      <View style={s.row}>
        {scenarios.map(scenario => {
          const isSelected = selected === scenario.type;
          return (
            <TouchableOpacity
              key={scenario.type}
              onPress={() => onSelect(scenario.type)}
              disabled={disabled}
              activeOpacity={0.7}
              style={[
                s.card,
                {
                  backgroundColor: isSelected
                    ? `${colors.primary}12`
                    : colors.surface,
                  borderColor: isSelected
                    ? colors.primary
                    : colors.border,
                  transform: [{ scale: isSelected ? 1.02 : 1 }],
                },
              ]}
            >
              <Text style={s.emoji}>{scenario.emoji}</Text>
              <Text style={[s.magnitude, { color: colors.warning }]}>
                {scenario.magnitude}
              </Text>
              <Text
                style={[
                  s.title,
                  {
                    color: isSelected
                      ? colors.primary
                      : colors.textPrimary,
                  },
                ]}
              >
                {scenario.title}
              </Text>
              <Text style={[s.subtitle, { color: colors.textTertiary }]}>
                {scenario.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 29,
    marginBottom: 8,
  },
  magnitude: {
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
});
