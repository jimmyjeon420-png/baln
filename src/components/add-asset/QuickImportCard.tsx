/**
 * QuickImportCard — Screenshot import card for OCR parsing
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

interface QuickImportCardProps {
  screenshotParsing: boolean;
  onScreenshotParse: () => void;
}

export default function QuickImportCard({ screenshotParsing, onScreenshotParse }: QuickImportCardProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View style={[styles.quickImportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('add_asset.quick_import_title')}</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        {t('add_asset.quick_import_subtitle')}
      </Text>
      <View style={styles.quickImportRow}>
        <TouchableOpacity
          style={[styles.quickImportButton, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
          onPress={onScreenshotParse}
          disabled={screenshotParsing}
        >
          {screenshotParsing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
          )}
          <Text style={[styles.quickImportTitle, { color: colors.textPrimary }]}>{t('add_asset.ocr_button_title')}</Text>
          <Text style={[styles.quickImportDesc, { color: colors.textSecondary }]}>{t('add_asset.ocr_button_desc')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quickImportCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  quickImportRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickImportButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  quickImportTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickImportDesc: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
});
