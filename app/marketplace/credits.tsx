/**
 * 크레딧 충전소 — 크레딧 패키지 구매 + 거래 내역
 * 현재: 시뮬레이션 / 향후: RevenueCat IAP 연동
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMyCredits, usePurchaseCredits, useCreditHistory } from '../../src/hooks/useCredits';
import { useHaptics } from '../../src/hooks/useHaptics';
import { CREDIT_PACKAGES } from '../../src/types/marketplace';
import type { CreditTransaction } from '../../src/types/marketplace';

export default function CreditsScreen() {
  const router = useRouter();
  const { mediumTap, heavyTap, success } = useHaptics();
  const { data: credits, isLoading: creditsLoading } = useMyCredits();
  const { data: history } = useCreditHistory(20);
  const purchaseMutation = usePurchaseCredits();

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    heavyTap();

    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return;

    Alert.alert(
      '크레딧 구매',
      `${pkg.name} 패키지 (${pkg.credits + pkg.bonus} 크레딧)를\n${pkg.priceLabel}에 구매하시겠습니까?\n\n(현재: 시뮬레이션 모드)`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구매',
          onPress: async () => {
            try {
              await purchaseMutation.mutateAsync({ packageId });
              success();
              Alert.alert(
                '구매 완료!',
                `${pkg.credits + pkg.bonus} 크레딧이 충전되었습니다.`
              );
            } catch (err: any) {
              Alert.alert('오류', err.message || '구매에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  const getTransactionLabel = (tx: CreditTransaction) => {
    const labels: Record<string, string> = {
      purchase: '크레딧 구매',
      spend: '크레딧 사용',
      refund: '환불',
      bonus: '보너스',
      subscription_bonus: '구독 보너스',
    };
    return labels[tx.type] || tx.type;
  };

  const getTransactionIcon = (tx: CreditTransaction) => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      purchase: 'add-circle',
      spend: 'remove-circle',
      refund: 'refresh-circle',
      bonus: 'gift',
      subscription_bonus: 'star',
    };
    return icons[tx.type] || 'ellipse';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>크레딧 충전소</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* 현재 잔액 */}
        <View style={styles.balanceCard}>
          <Ionicons name="diamond" size={32} color="#7C4DFF" />
          <Text style={styles.balanceLabel}>보유 크레딧</Text>
          <Text style={styles.balanceValue}>
            {creditsLoading ? '...' : (credits?.balance ?? 0).toLocaleString()}
          </Text>
        </View>

        {/* 패키지 목록 */}
        <Text style={styles.sectionTitle}>크레딧 패키지</Text>
        <View style={styles.packageList}>
          {CREDIT_PACKAGES.map(pkg => (
            <TouchableOpacity
              key={pkg.id}
              style={[
                styles.packageCard,
                pkg.popular && styles.popularCard,
                selectedPackage === pkg.id && styles.selectedCard,
              ]}
              onPress={() => {
                mediumTap();
                setSelectedPackage(pkg.id);
              }}
              activeOpacity={0.7}
            >
              {pkg.badge && (
                <View style={[styles.badge, pkg.popular && styles.popularBadge]}>
                  <Text style={styles.badgeText}>{pkg.badge}</Text>
                </View>
              )}
              <Text style={styles.packageName}>{pkg.name}</Text>
              <View style={styles.creditRow}>
                <Ionicons name="diamond" size={18} color="#7C4DFF" />
                <Text style={styles.creditAmount}>{pkg.credits}</Text>
                {pkg.bonus > 0 && (
                  <Text style={styles.bonusText}>+{pkg.bonus}</Text>
                )}
              </View>
              <Text style={styles.packagePrice}>{pkg.priceLabel}</Text>
              <Text style={styles.perCredit}>
                크레딧당 ₩{Math.round(pkg.price / (pkg.credits + pkg.bonus)).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 구매 버튼 */}
        {selectedPackage && (
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              purchaseMutation.isPending && styles.disabledButton,
            ]}
            onPress={() => handlePurchase(selectedPackage)}
            disabled={purchaseMutation.isPending}
            activeOpacity={0.7}
          >
            {purchaseMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.purchaseButtonText}>
                {CREDIT_PACKAGES.find(p => p.id === selectedPackage)?.priceLabel} 구매하기
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* 거래 내역 */}
        {history && history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>거래 내역</Text>
            {history.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <Ionicons
                  name={getTransactionIcon(tx)}
                  size={20}
                  color={tx.amount >= 0 ? '#4CAF50' : '#CF6679'}
                />
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel}>{getTransactionLabel(tx)}</Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.amount >= 0 ? '#4CAF50' : '#CF6679' },
                    ]}
                  >
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                  </Text>
                  <Text style={styles.txBalance}>잔액: {tx.balance_after}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 안내 */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>크레딧 안내</Text>
          <Text style={styles.infoText}>
            - 크레딧은 AI 프리미엄 기능 이용에 사용됩니다{'\n'}
            - AI 분석 실패 시 크레딧이 자동 환불됩니다{'\n'}
            - 구독자는 매월 50 크레딧 보너스를 받습니다{'\n'}
            - 등급이 높을수록 할인율이 적용됩니다
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#7C4DFF40',
  },
  balanceLabel: { color: '#888', fontSize: 14, marginTop: 8 },
  balanceValue: { color: '#FFF', fontSize: 36, fontWeight: '800', marginTop: 4 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  packageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  packageCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  popularCard: {
    borderColor: '#7C4DFF',
    borderWidth: 2,
  },
  selectedCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#1A2E1A',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularBadge: {
    backgroundColor: '#7C4DFF',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  packageName: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creditAmount: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  bonusText: { color: '#4CAF50', fontSize: 14, fontWeight: '700' },
  packagePrice: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 8 },
  perCredit: { color: '#666', fontSize: 11, marginTop: 2 },
  purchaseButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  purchaseButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.5 },
  historySection: { marginTop: 8 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2A2A2A',
  },
  txInfo: { flex: 1 },
  txLabel: { color: '#CCC', fontSize: 13, fontWeight: '600' },
  txDate: { color: '#666', fontSize: 11 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txBalance: { color: '#666', fontSize: 11 },
  infoSection: {
    marginTop: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: { color: '#888', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  infoText: { color: '#666', fontSize: 12, lineHeight: 20 },
});
