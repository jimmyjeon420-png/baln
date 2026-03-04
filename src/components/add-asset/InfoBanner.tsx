/**
 * InfoBanner — Expandable info banner about return rate differences
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

export default function InfoBanner() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => setExpanded(v => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.infoBannerHeader}>
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={[styles.infoBannerTitle, { color: colors.textPrimary }]}>
          {t('add_asset.info_banner_title')}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textSecondary}
        />
      </View>
      {expanded && (
        <View style={styles.infoBannerBody}>
          <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
            {t('add_asset.info_banner_text')}
          </Text>
          <Text style={[styles.infoBannerHint, { color: colors.primary }]}>
            {t('add_asset.info_banner_hint')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  infoBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  infoBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  infoBannerBody: {
    marginTop: 10,
  },
  infoBannerText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  infoBannerHint: {
    fontSize: 12,
    fontWeight: '600',
  },
});
