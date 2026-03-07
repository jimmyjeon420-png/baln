import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { TIER_THRESHOLDS } from '../../types/community';
import { useLocale } from '../../context/LocaleContext';
import { getCurrencySymbol } from '../../utils/formatters';

interface SilverMotivationBannerProps {
  totalAssets: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatAmount(amount: number, t: (key: string, opts?: any) => string, isKo: boolean): string {
  if (isKo) {
    const manWon = Math.floor(amount / 10000);
    if (manWon >= 10000) {
      const eok = Math.floor(manWon / 10000);
      const remainder = manWon % 10000;
      if (remainder === 0) {
        return t('silverBanner.format_eok', { eok: eok.toLocaleString() });
      }
      return t('silverBanner.format_eok_man', { eok: eok.toLocaleString(), man: remainder.toLocaleString() });
    }
    return t('silverBanner.format_man', { man: manWon.toLocaleString() });
  } else {
    if (amount >= 1_000_000_000) return `${getCurrencySymbol()}${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `${getCurrencySymbol()}${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${getCurrencySymbol()}${(amount / 1_000).toFixed(0)}K`;
    return `${getCurrencySymbol()}${amount.toLocaleString()}`;
  }
}

export default function SilverMotivationBanner({
  totalAssets,
}: SilverMotivationBannerProps) {
  const { t, language } = useLocale();
  const isKo = language === 'ko';
  const goldThreshold = TIER_THRESHOLDS?.GOLD ?? 100_000_000;
  const progress = Math.min(totalAssets / goldThreshold, 1);
  const progressPercent = Math.round(progress * 100);
  const remaining = Math.max(goldThreshold - totalAssets, 0);

  const handleAddAsset = () => {
    router.push('/add-asset');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.crownEmoji}>👑</Text>
        <Text style={styles.title}>{t('silverBanner.title')}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
        <Text style={styles.percentText}>{progressPercent}%</Text>
      </View>

      {/* Remaining amount */}
      {remaining > 0 ? (
        <Text style={styles.remainingText}>
          {t('silverBanner.remaining', { amount: formatAmount(remaining, t, isKo) })}
        </Text>
      ) : (
        <Text style={[styles.remainingText, { color: '#4CAF50' }]}>
          {t('silverBanner.achieved')}
        </Text>
      )}

      {/* CTA button */}
      <TouchableOpacity style={styles.ctaButton} onPress={handleAddAsset}>
        <Text style={styles.ctaButtonText}>{t('silverBanner.cta')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF5033',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  crownEmoji: {
    fontSize: 18,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#2A2A3E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  percentText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  remainingText: {
    color: '#CCCCCC',
    fontSize: 13,
    marginBottom: 12,
  },
  ctaButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
