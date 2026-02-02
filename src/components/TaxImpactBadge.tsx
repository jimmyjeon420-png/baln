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
import { COLORS, SIZES, TYPOGRAPHY } from '../styles/theme';

interface Props {
  taxImpact: TaxImpact;
  showDetails?: boolean;
}

export const TaxImpactBadge: React.FC<Props> = ({ taxImpact, showDetails = false }) => {
  const [expanded, setExpanded] = useState(showDetails);

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
      style={styles.container}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      {/* Compact view */}
      <View style={styles.compactRow}>
        <Text style={styles.label}>🧾 Tax ({taxImpact.effectiveTaxRate.toFixed(1)}%)</Text>
        <View style={styles.amountGroup}>
          <Text style={styles.taxAmount}>-{formatCurrency(taxImpact.taxAmount)}</Text>
          <Text style={styles.netAmount}>→ {formatCurrency(taxImpact.netProceeds)}</Text>
        </View>
      </View>

      {/* Expanded view */}
      {expanded && (
        <View style={styles.expandedContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gross Proceeds</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(taxImpact.netProceeds + taxImpact.taxAmount + taxImpact.tradeFee)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Capital Gains</Text>
            <Text style={[
              styles.detailValue,
              taxImpact.capitalGains >= 0 ? styles.positive : styles.negative
            ]}>
              {formatCurrency(taxImpact.capitalGains)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tax ({taxImpact.effectiveTaxRate.toFixed(1)}%)</Text>
            <Text style={styles.negative}>
              -{formatCurrency(taxImpact.taxAmount)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trade Fee</Text>
            <Text style={styles.negative}>
              -{formatCurrency(taxImpact.tradeFee)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Net Proceeds</Text>
            <Text style={[styles.detailValue, styles.highlight]}>
              {formatCurrency(taxImpact.netProceeds)}
            </Text>
          </View>

          {taxImpact.holdingPeriodDays !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Holding Period</Text>
              <Text style={styles.detailValue}>
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
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SIZES.md,
    marginVertical: SIZES.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.sell,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
  },
  amountGroup: {
    alignItems: 'flex-end',
  },
  taxAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.sell,
  },
  netAmount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  expandedContainer: {
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.xs,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  positive: {
    color: COLORS.buy,
  },
  negative: {
    color: COLORS.sell,
  },
  highlight: {
    color: COLORS.buy,
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.xs,
  },
});
