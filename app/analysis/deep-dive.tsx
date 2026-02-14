/**
 * 종목 딥다이브 - 준비 중
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useTheme } from '../../src/hooks/useTheme';

export default function DeepDiveScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar title="종목 딥다이브" />
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="analytics-outline" size={64} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          종목 딥다이브 준비 중
        </Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          AI 기반 개별 종목 심층 분석 기능을{'\n'}
          더 정확하게 준비하고 있습니다
        </Text>

        <View style={[styles.featureList, { backgroundColor: colors.surface }]}>
          <FeatureItem icon="search" text="한국/미국 종목 검색" colors={colors} />
          <FeatureItem icon="bar-chart" text="재무제표 기반 AI 분석" colors={colors} />
          <FeatureItem icon="document-text" text="4섹션 심층 리포트" colors={colors} />
        </View>

        <Text style={[styles.comingSoon, { color: colors.primary }]}>
          Coming Soon
        </Text>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text, colors }: { icon: any; text: string; colors: any }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.featureText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  featureList: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: { fontSize: 15, fontWeight: '500' },
  comingSoon: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
