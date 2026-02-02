/**
 * Modal for selecting tax jurisdiction
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { Text } from 'react-native';
import { Country, TaxSettings } from '../types/tax';
import { COUNTRY_TAX_PROFILES } from '../constants/taxProfiles';
import { COLORS, SIZES, TYPOGRAPHY } from '../styles/theme';

interface Props {
  visible: boolean;
  currentCountry: Country;
  onSelect: (country: Country, customRate?: number) => void;
  onClose: () => void;
}

export const CountrySelectModal: React.FC<Props> = ({
  visible,
  currentCountry,
  onSelect,
  onClose
}) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customRate, setCustomRate] = useState('');

  const handleCountrySelect = (country: Country) => {
    onSelect(country);
    setShowCustom(false);
    setCustomRate('');
    onClose();
  };

  const handleCustomRateSubmit = () => {
    const rate = parseFloat(customRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Invalid Rate', 'Please enter a tax rate between 0 and 100');
      return;
    }
    onSelect(currentCountry, rate);
    setShowCustom(false);
    setCustomRate('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Tax Jurisdiction</Text>
          <View style={{ width: 30 }} />
        </View>

        {showCustom ? (
          // Custom Tax Rate Input
          <View style={styles.customContainer}>
            <Text style={styles.customLabel}>Enter Custom Tax Rate (%)</Text>
            <TextInput
              style={styles.customInput}
              placeholder="e.g., 35"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
              value={customRate}
              onChangeText={setCustomRate}
              maxLength={5}
            />
            <View style={styles.customButtonGroup}>
              <TouchableOpacity
                style={styles.customCancelButton}
                onPress={() => {
                  setShowCustom(false);
                  setCustomRate('');
                }}
              >
                <Text style={styles.customCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customSubmitButton}
                onPress={handleCustomRateSubmit}
              >
                <Text style={styles.customSubmitButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Country List
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {COUNTRY_TAX_PROFILES.map(profile => (
              <TouchableOpacity
                key={profile.code}
                style={[
                  styles.countryItem,
                  currentCountry === profile.code && styles.countryItemSelected
                ]}
                onPress={() => handleCountrySelect(profile.code)}
              >
                <View style={styles.countryContent}>
                  <View style={styles.countryHeader}>
                    <Text style={styles.flag}>{profile.flag}</Text>
                    <View style={styles.countryInfo}>
                      <Text style={styles.countryName}>{profile.name}</Text>
                      <Text style={styles.countryRate}>
                        {profile.capitalGainsTaxRate}% Capital Gains Tax
                      </Text>
                    </View>
                  </View>
                  {profile.notes && (
                    <Text style={styles.countryNotes}>{profile.notes}</Text>
                  )}
                </View>
                {currentCountry === profile.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            {/* Custom Override Option */}
            <TouchableOpacity
              style={[styles.countryItem, styles.customOption]}
              onPress={() => setShowCustom(true)}
            >
              <View style={styles.countryContent}>
                <Text style={styles.customOptionText}>⚙️ Set Custom Tax Rate</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    ...TYPOGRAPHY.headingSmall,
    color: COLORS.textPrimary,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.textSecondary,
    width: 30,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    paddingHorizontal: SIZES.md,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    marginVertical: SIZES.xs,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countryItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  countryContent: {
    flex: 1,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  flag: {
    fontSize: 24,
    marginRight: SIZES.md,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  countryRate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  countryNotes: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginLeft: 32,
    marginTop: SIZES.xs,
    fontStyle: 'italic',
  },
  checkmark: {
    fontSize: 20,
    color: COLORS.primary,
    marginLeft: SIZES.md,
  },
  customOption: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.primary,
    marginTop: SIZES.lg,
    marginBottom: SIZES.xxl,
  },
  customOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  customContainer: {
    flex: 1,
    padding: SIZES.lg,
    justifyContent: 'center',
  },
  customLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  customInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    color: COLORS.textPrimary,
    fontSize: 16,
    marginBottom: SIZES.lg,
  },
  customButtonGroup: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  customCancelButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customCancelButtonText: {
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  customSubmitButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  customSubmitButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
