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
  Modal,
  Text,
} from 'react-native';
import { Country } from '../types/tax';
import { COUNTRY_TAX_PROFILES } from '../constants/taxProfiles';
import { SIZES, TYPOGRAPHY } from '../styles/theme';
import { useTheme } from '../hooks/useTheme';

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
  const { colors } = useTheme();

  const handleCountrySelect = (country: Country) => {
    onSelect(country);
    setShowCustom(false);
    setCustomRate('');
    onClose();
  };

  const handleCustomRateSubmit = () => {
    const rate = parseFloat(customRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('입력 오류', '세율은 0에서 100 사이의 숫자로 입력해주세요.');
      return;
    }
    onSelect(currentCountry, rate);
    setShowCustom(false);
    setCustomRate('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Tax Jurisdiction</Text>
          <View style={{ width: 30 }} />
        </View>

        {showCustom ? (
          // Custom Tax Rate Input
          <View style={styles.customContainer}>
            <Text style={[styles.customLabel, { color: colors.textPrimary }]}>Enter Custom Tax Rate (%)</Text>
            <TextInput
              style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g., 35"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              value={customRate}
              onChangeText={setCustomRate}
              maxLength={5}
            />
            <View style={styles.customButtonGroup}>
              <TouchableOpacity
                style={[styles.customCancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setShowCustom(false);
                  setCustomRate('');
                }}
              >
                <Text style={[styles.customCancelButtonText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customSubmitButton, { backgroundColor: colors.primary }]}
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
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  currentCountry === profile.code && { borderColor: colors.primary, backgroundColor: colors.surfaceLight },
                ]}
                onPress={() => handleCountrySelect(profile.code)}
              >
                <View style={styles.countryContent}>
                  <View style={styles.countryHeader}>
                    <Text style={styles.flag}>{profile.flag}</Text>
                    <View style={styles.countryInfo}>
                      <Text style={[styles.countryName, { color: colors.textPrimary }]}>{profile.name}</Text>
                      <Text style={[styles.countryRate, { color: colors.textSecondary }]}>
                        {profile.capitalGainsTaxRate}% Capital Gains Tax
                      </Text>
                    </View>
                  </View>
                  {profile.notes && (
                    <Text style={[styles.countryNotes, { color: colors.textTertiary }]}>{profile.notes}</Text>
                  )}
                </View>
                {currentCountry === profile.code && (
                  <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            {/* Custom Override Option */}
            <TouchableOpacity
              style={[styles.countryItem, styles.customOption, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}
              onPress={() => setShowCustom(true)}
            >
              <View style={styles.countryContent}>
                <Text style={[styles.customOptionText, { color: colors.primary }]}>⚙️ Set Custom Tax Rate</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
  },
  title: {
    ...TYPOGRAPHY.headingSmall,
  },
  closeButton: {
    fontSize: 25,
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
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 25,
    marginRight: SIZES.md,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  countryRate: {
    fontSize: 14,
  },
  countryNotes: {
    fontSize: 13,
    marginLeft: 32,
    marginTop: SIZES.xs,
    fontStyle: 'italic',
  },
  checkmark: {
    fontSize: 21,
    marginLeft: SIZES.md,
  },
  customOption: {
    marginTop: SIZES.lg,
    marginBottom: SIZES.xxl,
  },
  customOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customContainer: {
    flex: 1,
    padding: SIZES.lg,
    justifyContent: 'center',
  },
  customLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: SIZES.md,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    fontSize: 17,
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
    borderWidth: 1,
  },
  customCancelButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
  customSubmitButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: 8,
  },
  customSubmitButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
