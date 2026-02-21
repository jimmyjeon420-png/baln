/**
 * CrossTabBanners — 탭 간 유기적 연결 배너 모음
 *
 * 역할: 다른 탭의 이벤트를 홈 탭에 알리는 알림판
 * - 투자 철학 변경 알림 (전체 탭 → 홈)
 * - 뱃지 획득 축하 (전체 탭 → 홈)
 * - 투자 기준 리마인더 (분석 탭 → 홈)
 * - 예측 정답 → 액션 제안 (홈 → 분석)
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useGuruStyleChange } from '../../hooks/useGuruStyleChange';
import { useInvestmentStandards } from '../../hooks/useInvestmentStandards';
import { useBadgeNotification } from '../../hooks/useBadgeNotification';

export default function CrossTabBanners() {
  const router = useRouter();
  const { colors } = useTheme();
  const { hasChange, fromName, toName, dismiss: dismissGuru } = useGuruStyleChange();
  const { standards } = useInvestmentStandards();
  const { notification: badgeNotif, dismiss: dismissBadge } = useBadgeNotification();

  const hasBanners = hasChange || !!standards || !!badgeNotif;
  if (!hasBanners) return null;

  return (
    <View style={styles.container}>
      {/* 투자 철학 변경 알림 */}
      {hasChange && (
        <View style={[styles.banner, { backgroundColor: `${colors.primary}15` }]}>
          <View style={styles.bannerContent}>
            <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
                투자 철학이 변경되었습니다
              </Text>
              <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
                {fromName} → {toName} · 분석 탭에서 재진단받아보세요
              </Text>
            </View>
            <TouchableOpacity onPress={dismissGuru} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.bannerAction, { backgroundColor: colors.primary }]}
            onPress={() => { dismissGuru(); router.push('/(tabs)/rebalance'); }}
          >
            <Text style={styles.bannerActionText}>분석 탭 보기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 뱃지 획득 축하 */}
      {badgeNotif && (
        <View style={[styles.banner, { backgroundColor: '#FFC10715' }]}>
          <View style={styles.bannerContent}>
            <Text style={{ fontSize: 21 }}>{badgeNotif.badgeEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
                {badgeNotif.badgeName} 획득!
              </Text>
              <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
                {badgeNotif.message}
              </Text>
            </View>
            <TouchableOpacity onPress={dismissBadge} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 투자 기준 리마인더 */}
      {standards && (
        <View style={[styles.banner, { backgroundColor: `${colors.info ?? '#29B6F6'}15` }]}>
          <View style={styles.bannerContent}>
            <Ionicons name="bookmark" size={16} color={colors.info ?? '#29B6F6'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
                나의 투자 기준
              </Text>
              <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {standards.actions.slice(0, 2).map(a => `${a.action} ${a.ticker}`).join(', ')}
                {standards.actions.length > 2 ? ` 외 ${standards.actions.length - 2}건` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.bannerAction, { backgroundColor: colors.info ?? '#29B6F6' }]}
            onPress={() => router.push('/(tabs)/rebalance')}
          >
            <Text style={styles.bannerActionText}>처방전 확인</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 100,
    gap: 8,
  },
  banner: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  bannerAction: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
});
