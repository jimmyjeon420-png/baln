/**
 * MarketplaceGrid - 마켓플레이스 메인 화면
 *
 * 역할: "상품 쇼룸"
 * - Tier 1 (즉시 효용): AI 분석, 예측 해설
 * - Tier 2 (경험 확장): Premium 체험, VIP 라운지
 * - Tier 3 (충성 보상): 할인권, 창립 멤버 뱃지 (출시 후 오픈)
 *
 * 철학:
 * - 이승건: "보상으로 교육을 감싼다"
 * - 달리오: "이름보다 가치를 명확히"
 * - 버핏: "원화를 항상 병기"
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MarketplaceCard } from './MarketplaceCard';
import { useMyCredits } from '../../hooks/useCredits';
import { MARKETPLACE_ITEMS, getItemsByTier } from '../../data/marketplaceItems';
import { spendCredits } from '../../services/creditService';
import queryClient from '../../services/queryClient';
import { useLocale } from '../../context/LocaleContext';

export function MarketplaceGrid() {
  const { data: credits } = useMyCredits();
  const router = useRouter();
  const { t } = useLocale();
  const currentBalance = credits?.balance ?? 0;

  // Tier별 상품 필터링
  const tier1Items = getItemsByTier('instant');
  const tier2Items = getItemsByTier('experience');
  const tier3Items = MARKETPLACE_ITEMS.filter((item) => item.tier === 'loyalty');

  const handlePurchase = (itemId: string) => {
    const item = MARKETPLACE_ITEMS.find((i) => i.id === itemId);
    if (!item) return;

    // 비활성화 상품
    if (!item.enabled) {
      Alert.alert(
        t('marketplace.alert_coming_soon_title'),
        t('marketplace.alert_coming_soon_msg'),
        [{ text: t('common.confirm') }]
      );
      return;
    }

    // 잔액 부족
    if (currentBalance < item.price) {
      Alert.alert(
        t('marketplace.alert_insufficient_title'),
        t('marketplace.alert_insufficient_msg', { name: item.name, amount: item.price - currentBalance }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('marketplace.alert_insufficient_charge'), onPress: () => router.push('/marketplace/credits') },
        ]
      );
      return;
    }

    // 구매 확인
    Alert.alert(
      t('marketplace.alert_confirm_title'),
      t('marketplace.alert_confirm_msg', { name: item.name, price: item.price, krw: `₩${item.priceKRW.toLocaleString()}` }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('marketplace.buy_button'),
          onPress: async () => {
            const result = await spendCredits(item.price, 'deep_dive', item.id);
            if (result.success) {
              queryClient.invalidateQueries({ queryKey: ['credits'] });
              Alert.alert(t('marketplace.alert_success_title'), t('marketplace.alert_success_msg', { name: item.name }));
            } else {
              Alert.alert(t('marketplace.alert_fail_title'), result.errorMessage || t('marketplace.alert_fail_retry'));
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('marketplace.title')}</Text>
        <Text style={styles.subtitle}>{t('marketplace.subtitle')}</Text>
      </View>

      {/* Tier 1: 즉시 효용 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>⚡</Text>
          <View>
            <Text style={styles.sectionTitle}>{t('marketplace.tier_instant')}</Text>
            <Text style={styles.sectionSubtitle}>{t('marketplace.tier_instant_sub')}</Text>
          </View>
        </View>
        {tier1Items.map((item) => (
          <MarketplaceCard
            key={item.id}
            item={item}
            canAfford={currentBalance >= item.price}
            currentBalance={currentBalance}
            onPurchase={handlePurchase}
          />
        ))}
      </View>

      {/* Tier 2: 경험 확장 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🎁</Text>
          <View>
            <Text style={styles.sectionTitle}>{t('marketplace.tier_experience')}</Text>
            <Text style={styles.sectionSubtitle}>{t('marketplace.tier_experience_sub')}</Text>
          </View>
        </View>
        {tier2Items.map((item) => (
          <MarketplaceCard
            key={item.id}
            item={item}
            canAfford={currentBalance >= item.price}
            currentBalance={currentBalance}
            onPurchase={handlePurchase}
          />
        ))}
      </View>

      {/* Tier 3: 충성 보상 (출시 후 오픈) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>👑</Text>
          <View>
            <Text style={styles.sectionTitle}>{t('marketplace.tier_loyalty')}</Text>
            <Text style={styles.sectionSubtitle}>{t('marketplace.tier_loyalty_sub')}</Text>
          </View>
        </View>
        {tier3Items.map((item) => (
          <MarketplaceCard
            key={item.id}
            item={item}
            canAfford={currentBalance >= item.price}
            currentBalance={currentBalance}
            onPurchase={handlePurchase}
          />
        ))}
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 33,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});
