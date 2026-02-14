/**
 * VIP 라운지 - 준비 중
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';

export default function LoungeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>VIP 라운지</Text>
        <View style={styles.vipBadge}>
          <Ionicons name="diamond" size={14} color="#B9F2FF" />
          <Text style={styles.vipBadgeText}>PRIVATE</Text>
        </View>
      </View>

      {/* 준비 중 */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="construct-outline" size={64} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          VIP 라운지 준비 중
        </Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          인증된 자산가들만의 프라이빗 커뮤니티를{'\n'}
          더 완벽하게 준비하고 있습니다
        </Text>

        <View style={[styles.featureList, { backgroundColor: colors.surface }]}>
          <FeatureItem icon="chatbubbles" text="자산 인증 커뮤니티" color={colors} />
          <FeatureItem icon="people" text="VIP 네트워킹 모임" color={colors} />
          <FeatureItem icon="trending-up" text="실시간 투자 인사이트 공유" color={colors} />
        </View>

        <Text style={[styles.comingSoon, { color: colors.primary }]}>
          Coming Soon
        </Text>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text, color }: { icon: any; text: string; color: any }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={20} color={color.primary} />
      <Text style={[styles.featureText, { color: color.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 242, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  vipBadgeText: { fontSize: 11, fontWeight: '700', color: '#B9F2FF' },
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
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
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
