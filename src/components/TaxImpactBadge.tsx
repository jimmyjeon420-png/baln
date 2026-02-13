/**
 * Badge component to display tax impact breakdown
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text
} from 'react-native';
import { TaxImpact } from '../types/asset';
import { SIZES } from '../styles/theme';
import { useTheme } from '../hooks/useTheme';

interface Props {
  taxImpact: TaxImpact;
  showDetails?: boolean;
}

export const TaxImpactBadge: React.FC<Props> = ({ taxImpact, showDetails = false }) => {
  const [expanded, setExpanded] = useState(showDetails);
  const { colors } = useTheme();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!taxImpact || taxImpact.taxAmount === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderLeftColor: colors.sell }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      {/* Compact view */}
      <View style={styles.compactRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>🧾 Tax ({(taxImpact.effectiveTaxRate ?? 0).toFixed(1)}%)</Text>
        <View style={styles.amountGroup}>
          <Text style={[styles.taxAmount, { color: colors.sell }]}>-{formatCurrency(taxImpact.taxAmount)}</Text>
          <Text style={[styles.netAmount, { color: colors.textSecondary }]}>→ {formatCurrency(taxImpact.netProceeds)}</Text>
        </View>
      </View>

      {/* Expanded view */}
      {expanded && (
        <View style={[styles.expandedContainer, { borderTopColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gross Proceeds</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {formatCurrency(taxImpact.netProceeds + taxImpact.taxAmount + taxImpact.tradeFee)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Capital Gains</Text>
            <Text style={[
              styles.detailValue,
              { color: taxImpact.capitalGains >= 0 ? colors.buy : colors.sell }
            ]}>
              {formatCurrency(taxImpact.capitalGains)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tax ({(taxImpact.effectiveTaxRate ?? 0).toFixed(1)}%)</Text>
            <Text style={{ color: colors.sell }}>
              -{formatCurrency(taxImpact.taxAmount)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Trade Fee</Text>
            <Text style={{ color: colors.sell }}>
              -{formatCurrency(taxImpact.tradeFee)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Net Proceeds</Text>
            <Text style={[styles.detailValue, { color: colors.buy, fontSize: 13, fontWeight: '700' }]}>
              {formatCurrency(taxImpact.netProceeds)}
            </Text>
          </View>

          {taxImpact.holdingPeriodDays !== undefined && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Holding Period</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {taxImpact.holdingPeriodDays} days
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: SIZES.md,
    marginVertical: SIZES.sm,
    borderLeftWidth: 3,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  amountGroup: {
    alignItems: 'flex-end',
  },
  taxAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  netAmount: {
    fontSize: 12,
    marginTop: 2,
  },
  expandedContainer: {
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.xs,
  },
  detailLabel: {
    fontSize: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginVertical: SIZES.xs,
  },
});
