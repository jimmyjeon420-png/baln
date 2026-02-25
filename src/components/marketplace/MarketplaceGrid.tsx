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

export function MarketplaceGrid() {
  const { data: credits } = useMyCredits();
  const router = useRouter();
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
        '곧 공개 예정',
        'Premium 구독 시스템이 안정화되면 오픈됩니다. 조금만 기다려주세요!',
        [{ text: '확인' }]
      );
      return;
    }

    // 잔액 부족
    if (currentBalance < item.price) {
      Alert.alert(
        '크레딧 부족',
        `${item.name}을(를) 구매하려면 ${item.price - currentBalance}C가 더 필요합니다.`,
        [
          { text: '취소', style: 'cancel' },
          { text: '충전하기', onPress: () => router.push('/marketplace/credits') },
        ]
      );
      return;
    }

    // 구매 확인
    Alert.alert(
      '구매 확인',
      `${item.name}\n${item.price}C (₩${item.priceKRW.toLocaleString()})을(를) 구매하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구매',
          onPress: async () => {
            const result = await spendCredits(item.price, 'deep_dive', item.id);
            if (result.success) {
              queryClient.invalidateQueries({ queryKey: ['credits'] });
              Alert.alert('구매 완료', `${item.name}이(가) 적용되었습니다!`);
            } else {
              Alert.alert('구매 실패', result.errorMessage || '다시 시도해주세요.');
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
        <Text style={styles.title}>마켓플레이스</Text>
        <Text style={styles.subtitle}>크레딧으로 다양한 기능을 이용하세요</Text>
      </View>

      {/* Tier 1: 즉시 효용 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>⚡</Text>
          <View>
            <Text style={styles.sectionTitle}>즉시 효용</Text>
            <Text style={styles.sectionSubtitle}>당장 써볼 수 있는 기능</Text>
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
            <Text style={styles.sectionTitle}>경험 확장</Text>
            <Text style={styles.sectionSubtitle}>새로운 기능 체험</Text>
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
            <Text style={styles.sectionTitle}>충성 보상</Text>
            <Text style={styles.sectionSubtitle}>장기 유저 특전 (출시 후 오픈)</Text>
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
