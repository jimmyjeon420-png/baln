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
import { COLORS, SIZES, TYPOGRAPHY } from '../styles/theme';

interface Props {
  selected: AssetType;
  onSelect: (type: AssetType) => void;
}

export const AssetTypeSelector: React.FC<Props> = ({ selected, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Asset Type</Text>
      <View style={styles.toggleGroup}>
        <TouchableOpacity
          style={[
            styles.option,
            selected === AssetType.LIQUID && styles.optionActive
          ]}
          onPress={() => onSelect(AssetType.LIQUID)}
        >
          <Text style={[
            styles.optionText,
            selected === AssetType.LIQUID && styles.optionTextActive
          ]}>
            💧 Liquid
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            selected === AssetType.ILLIQUID && styles.optionActive
          ]}
          onPress={() => onSelect(AssetType.ILLIQUID)}
        >
          <Text style={[
            styles.optionText,
            selected === AssetType.ILLIQUID && styles.optionTextActive
          ]}>
            🏠 Illiquid
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
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
    color: COLORS.textPrimary,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  optionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  optionTextActive: {
    color: COLORS.primary,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: SIZES.sm,
    fontStyle: 'italic',
  },
});
