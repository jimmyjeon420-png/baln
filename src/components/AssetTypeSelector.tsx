/**
 * Toggle component to select between Liquid and Illiquid assets
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text
} from 'react-native';
import { AssetType } from '../types/asset';
import { SIZES } from '../styles/theme';
import { useTheme } from '../hooks/useTheme';

interface Props {
  selected: AssetType;
  onSelect: (type: AssetType) => void;
}

export const AssetTypeSelector: React.FC<Props> = ({ selected, onSelect }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>Asset Type</Text>
      <View style={styles.toggleGroup}>
        <TouchableOpacity
          style={[
            styles.option,
            { borderColor: colors.border, backgroundColor: colors.surface },
            selected === AssetType.LIQUID && { borderColor: colors.primary, backgroundColor: colors.surfaceLight },
          ]}
          onPress={() => onSelect(AssetType.LIQUID)}
        >
          <Text style={[
            styles.optionText,
            { color: colors.textSecondary },
            selected === AssetType.LIQUID && { color: colors.primary },
          ]}>
            💧 Liquid
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            { borderColor: colors.border, backgroundColor: colors.surface },
            selected === AssetType.ILLIQUID && { borderColor: colors.primary, backgroundColor: colors.surfaceLight },
          ]}
          onPress={() => onSelect(AssetType.ILLIQUID)}
        >
          <Text style={[
            styles.optionText,
            { color: colors.textSecondary },
            selected === AssetType.ILLIQUID && { color: colors.primary },
          ]}>
            🏠 Illiquid
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        {selected === AssetType.LIQUID
          ? 'Can be quickly sold (stocks, ETFs, crypto)'
          : 'Takes time to sell (real estate, art)'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SIZES.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SIZES.sm,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  option: {
    flex: 1,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: SIZES.sm,
    fontStyle: 'italic',
  },
});
