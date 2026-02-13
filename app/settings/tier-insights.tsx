/**
 * 투자 DNA - 등급별 포트폴리오 비중 비교
 *
 * 토스 PO 전략:
 * 1. 무료 티저: 내 등급 배분 + "평균 대비 차이" 1줄 Hook
 * 2. 잠금: "다른 등급은 뭘 담고 있을까?" → 15크레딧
 * 3. 해제: 전체 4등급 비교 차트 + 인기 종목
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLoungeEligibility } from '../../src/hooks/useCommunity';
import { useMyCredits } from '../../src/hooks/useCredits';
import {
  useMyTierAllocation,
  useAllTierAllocations,
  useUnlockTierInsights,
  TierAllocationStat,
} from '../../src/hooks/useTierAllocation';
import { FEATURE_COSTS, TIER_DISCOUNTS } from '../../src/types/marketplace';
import { TIER_COLORS, TIER_LABELS } from '../../src/types/community';
import { useTheme } from '../../src/hooks/useTheme';

// 자산 유형별 색상
const ASSET_COLORS = {
  stock: '#4CAF50',
  crypto: '#F7931A',
  realestate: '#2196F3',
  cash: '#9E9E9E',
  other: '#7C4DFF',
  btc: '#F7931A',
};

// 자산 유형별 라벨
const ASSET_LABELS = {
  stock: '주식',
  crypto: '코인',
  realestate: '부동산',
  cash: '현금',
  other: '기타',
};

// 티어 결정
const getTier = (totalAssets: number): 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' => {
  if (totalAssets >= 1000000000) return 'DIAMOND';
  if (totalAssets >= 500000000) return 'PLATINUM';
  if (totalAssets >= 100000000) return 'GOLD';
  return 'SILVER';
};

// 비중 바 컴포넌트
function WeightBar({ label, weight, color, maxWeight }: {
  label: string; weight: number; color: string; maxWeight: number;
}) {
  const barWidth = maxWeight > 0 ? Math.max((weight / maxWeight) * 100, 2) : 2;

  return (
    <View style={styles.weightBarRow}>
      <Text style={styles.weightBarLabel}>{label}</Text>
      <View style={styles.weightBarTrack}>
        <View style={[styles.weightBarFill, { width: `${barWidth}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.weightBarValue, { color }]}>{weight.toFixed(1)}%</Text>
    </View>
  );
}

// 등급별 배분 카드 컴포넌트
function TierAllocationCard({ stat, isMyTier }: { stat: TierAllocationStat; isMyTier: boolean }) {
  const tierColor = TIER_COLORS[stat.tier] || '#FFFFFF';
  const tierLabel = TIER_LABELS[stat.tier] || stat.tier;
  const maxWeight = Math.max(
    stat.avg_stock_weight, stat.avg_crypto_weight,
    stat.avg_realestate_weight, stat.avg_cash_weight, stat.avg_other_weight, 1
  );

  return (
    <View style={[styles.tierCard, isMyTier && { borderColor: tierColor, borderWidth: 1 }]}>
      {/* 헤더 */}
      <View style={styles.tierCardHeader}>
        <View style={styles.tierCardTitle}>
          <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
          <Text style={[styles.tierCardName, { color: tierColor }]}>{tierLabel}</Text>
          {isMyTier && (
            <View style={styles.myBadge}>
              <Text style={styles.myBadgeText}>MY</Text>
            </View>
          )}
        </View>
        <Text style={styles.tierCardUsers}>{stat.user_count}명</Text>
      </View>

      {/* 배분 비중 바 차트 */}
      <View style={styles.weightBars}>
        <WeightBar label="주식" weight={stat.avg_stock_weight} color={ASSET_COLORS.stock} maxWeight={maxWeight} />
        <WeightBar label="코인" weight={stat.avg_crypto_weight} color={ASSET_COLORS.crypto} maxWeight={maxWeight} />
        {stat.avg_realestate_weight > 0.1 && (
          <WeightBar label="부동산" weight={stat.avg_realestate_weight} color={ASSET_COLORS.realestate} maxWeight={maxWeight} />
        )}
        {stat.avg_cash_weight > 0.1 && (
          <WeightBar label="현금" weight={stat.avg_cash_weight} color={ASSET_COLORS.cash} maxWeight={maxWeight} />
        )}
      </View>

      {/* BTC 비중 (있는 경우) */}
      {stat.avg_btc_weight > 0.1 && (
        <View style={styles.btcRow}>
          <Text style={styles.btcLabel}>BTC 비중</Text>
          <Text style={[styles.btcValue, { color: ASSET_COLORS.btc }]}>{stat.avg_btc_weight.toFixed(1)}%</Text>
        </View>
      )}

      {/* 인기 종목 TOP 5 */}
      {stat.top_holdings && stat.top_holdings.length > 0 && (
        <View style={styles.topHoldingsSection}>
          <Text style={styles.topHoldingsTitle}>인기 종목</Text>
          <View style={styles.topHoldingsList}>
            {stat.top_holdings.slice(0, 5).map((h, i) => (
              <View key={h.ticker} style={styles.topHoldingItem}>
                <Text style={styles.topHoldingRank}>{i + 1}</Text>
                <Text style={styles.topHoldingTicker}>{h.ticker}</Text>
                <Text style={styles.topHoldingHolders}>{h.holders}명</Text>
                <Text style={styles.topHoldingWeight}>{h.avg_weight.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function TierInsightsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [isUnlocked, setIsUnlocked] = useState(false);

  // 내 자산/등급 정보
  const { eligibility } = useLoungeEligibility();
  const myTier = getTier(eligibility.totalAssets);
  const myTierColor = TIER_COLORS[myTier] || '#C0C0C0';

  // 크레딧 잔액
  const { data: credits } = useMyCredits();

  // 무료: 내 등급 데이터
  const { data: myTierData, isLoading: myLoading } = useMyTierAllocation(myTier);

  // 과금: 전체 등급 데이터 (잠금 해제 후 활성화)
  const { data: allTierData, isLoading: allLoading } = useAllTierAllocations(isUnlocked);

  // 잠금 해제 뮤테이션
  const unlockMutation = useUnlockTierInsights();

  // 비용 계산 (티어 할인 적용)
  const discountPercent = TIER_DISCOUNTS[myTier as keyof typeof TIER_DISCOUNTS] || 0;
  const originalCost = FEATURE_COSTS.tier_insights;
  const actualCost = Math.round(originalCost * (1 - discountPercent / 100));

  // 잠금 해제 핸들러
  const handleUnlock = () => {
    const balance = credits?.balance || 0;

    if (balance < actualCost) {
      Alert.alert(
        '크레딧 부족',
        `${actualCost} 크레딧이 필요합니다.\n현재 잔액: ${balance} 크레딧`,
        [
          { text: '취소', style: 'cancel' },
          { text: '충전하기', onPress: () => router.push('/marketplace/credits' as any) },
        ]
      );
      return;
    }

    Alert.alert(
      '투자 DNA 잠금 해제',
      `${actualCost} 크레딧을 사용하여 전체 등급 비교를 확인하시겠습니까?${
        discountPercent > 0 ? `\n(${myTier} 등급 ${discountPercent}% 할인 적용)` : ''
      }`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: `${actualCost} 크레딧 사용`,
          onPress: async () => {
            try {
              await unlockMutation.mutateAsync(myTier as any);
              setIsUnlocked(true);
            } catch (error: any) {
              Alert.alert('오류', error.message || '잠금 해제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  // 내 비중과 등급 평균 차이 계산
  const getDiffText = (): string => {
    if (!myTierData) return '';
    // 간단히 코인 비중 차이를 Hook으로 사용 (토스 스타일)
    const avgCrypto = myTierData.avg_crypto_weight;
    if (avgCrypto > 15) {
      return `${TIER_LABELS[myTier]} 회원들은 평균적으로 코인을 ${avgCrypto.toFixed(0)}% 담고 있어요`;
    }
    const avgStock = myTierData.avg_stock_weight;
    return `${TIER_LABELS[myTier]} 회원들은 주식을 평균 ${avgStock.toFixed(0)}% 담고 있어요`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투자 DNA</Text>
        <View style={styles.creditBadge}>
          <Ionicons name="diamond" size={14} color="#7C4DFF" />
          <Text style={styles.creditBadgeText}>{credits?.balance || 0}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 히어로 섹션: Hook 텍스트 */}
        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>🧬</Text>
          <Text style={styles.heroTitle}>등급별 투자 DNA</Text>
          <Text style={styles.heroSubtitle}>
            같은 등급 회원들은 어떤 자산에 투자하고 있을까요?
          </Text>
        </View>

        {/* 무료 티저: 내 등급 배분 */}
        {myLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>내 등급 데이터 불러오는 중...</Text>
          </View>
        ) : myTierData ? (
          <View>
            {/* Hook 문구 (토스 스타일 1줄) */}
            <View style={styles.hookBanner}>
              <Ionicons name="bulb" size={18} color="#FFC107" />
              <Text style={styles.hookText}>{getDiffText()}</Text>
            </View>

            {/* 내 등급 카드 */}
            <TierAllocationCard stat={myTierData} isMyTier={true} />

            {/* 소셜 프루프 */}
            <View style={styles.socialProof}>
              <Ionicons name="people" size={14} color="#888888" />
              <Text style={styles.socialProofText}>
                {myTierData.user_count}명의 {TIER_LABELS[myTier]} 회원 데이터 기반
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noDataBox}>
            <Ionicons name="analytics-outline" size={48} color="#444444" />
            <Text style={styles.noDataText}>아직 데이터가 수집되지 않았습니다</Text>
            <Text style={styles.noDataSubtext}>내일부터 등급별 통계가 표시됩니다</Text>
          </View>
        )}

        {/* 잠금 구간: 다른 등급 비교 */}
        {!isUnlocked ? (
          <View style={styles.lockedSection}>
            <View style={styles.lockedHeader}>
              <Ionicons name="lock-closed" size={20} color="#FFC107" />
              <Text style={styles.lockedTitle}>전체 등급 비교</Text>
            </View>

            {/* 미리보기 (블러 효과 모방) */}
            <View style={styles.previewCards}>
              {['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].map((tier) => {
                const isMyTierItem = tier === myTier;
                const tierColor = TIER_COLORS[tier] || '#888';
                return (
                  <View
                    key={tier}
                    style={[
                      styles.previewCard,
                      isMyTierItem && { borderColor: tierColor, borderWidth: 1 },
                    ]}
                  >
                    <View style={[styles.previewDot, { backgroundColor: tierColor }]} />
                    <Text style={[styles.previewTier, { color: isMyTierItem ? tierColor : '#888' }]}>
                      {TIER_LABELS[tier]}
                    </Text>
                    {isMyTierItem ? (
                      <Text style={styles.previewUnlocked}>내 등급</Text>
                    ) : (
                      <View style={styles.previewBlur}>
                        <Text style={styles.previewBlurText}>??%</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* CTA: 궁금증 유발 */}
            <Text style={styles.lockedCta}>
              다이아몬드 회원들은 비트코인을 얼마나 담고 있을까?
            </Text>

            {/* 잠금 해제 버튼 */}
            <TouchableOpacity
              style={styles.unlockButton}
              onPress={handleUnlock}
              disabled={unlockMutation.isPending}
            >
              {unlockMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="diamond" size={16} color="#FFFFFF" />
                  <Text style={styles.unlockButtonText}>
                    {actualCost} 크레딧으로 잠금 해제
                  </Text>
                  {discountPercent > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-{discountPercent}%</Text>
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>

            {/* 안내 */}
            <Text style={styles.lockedNote}>
              * 데이터는 매일 07:00에 업데이트됩니다
            </Text>
          </View>
        ) : (
          /* 잠금 해제 후: 전체 등급 비교 */
          <View style={styles.unlockedSection}>
            <View style={styles.unlockedHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.unlockedTitle}>전체 등급 비교</Text>
            </View>

            {allLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#4CAF50" />
              </View>
            ) : allTierData && allTierData.length > 0 ? (
              <>
                {/* 비트코인 비중 하이라이트 */}
                <View style={styles.btcHighlight}>
                  <Text style={styles.btcHighlightTitle}>등급별 비트코인 비중</Text>
                  <View style={styles.btcBarsContainer}>
                    {allTierData.map((stat) => {
                      const tierColor = TIER_COLORS[stat.tier] || '#888';
                      const tierLabel = TIER_LABELS[stat.tier] || stat.tier;
                      const isMe = stat.tier === myTier;
                      const maxBtc = Math.max(...allTierData.map(s => s.avg_btc_weight), 1);
                      const barW = Math.max((stat.avg_btc_weight / maxBtc) * 100, 3);
                      return (
                        <View key={stat.tier} style={styles.btcBarRow}>
                          <Text style={[styles.btcBarLabel, isMe && { color: tierColor, fontWeight: '700' }]}>
                            {tierLabel}{isMe ? ' (나)' : ''}
                          </Text>
                          <View style={styles.btcBarTrack}>
                            <View style={[styles.btcBarFill, { width: `${barW}%`, backgroundColor: ASSET_COLORS.btc }]} />
                          </View>
                          <Text style={[styles.btcBarValue, { color: ASSET_COLORS.btc }]}>
                            {stat.avg_btc_weight.toFixed(1)}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* 등급별 상세 카드 */}
                {allTierData.map((stat) => (
                  <TierAllocationCard
                    key={stat.tier}
                    stat={stat}
                    isMyTier={stat.tier === myTier}
                  />
                ))}

                {/* 총 데이터 기반 */}
                <View style={styles.socialProof}>
                  <Ionicons name="people" size={14} color="#888888" />
                  <Text style={styles.socialProofText}>
                    총 {allTierData.reduce((s, t) => s + t.user_count, 0)}명의 회원 데이터 기반
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.noDataBox}>
                <Text style={styles.noDataText}>데이터가 아직 준비되지 않았습니다</Text>
              </View>
            )}
          </View>
        )}

        {/* 면책 문구 */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimer}>
            본 통계는 익명화된 사용자 데이터를 기반으로 한 참고 정보이며, 투자자문업에 해당하지 않습니다. 개인 식별 정보는 포함되지 않으며, 과거 데이터가 미래 수익을 보장하지 않습니다. 특정 종목의 매수·매도를 권유하는 것이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creditBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // 히어로
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },

  // Hook 배너 (토스 스타일)
  hookBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2A2A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  hookText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFC107',
    lineHeight: 20,
  },

  // 로딩
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#888888',
  },

  // 데이터 없음
  noDataBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  noDataText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noDataSubtext: {
    fontSize: 13,
    color: '#888888',
  },

  // 소셜 프루프
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  socialProofText: {
    fontSize: 12,
    color: '#888888',
  },

  // 등급 카드
  tierCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  tierCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tierCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tierCardName: {
    fontSize: 16,
    fontWeight: '700',
  },
  myBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  myBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  tierCardUsers: {
    fontSize: 12,
    color: '#888888',
  },

  // 비중 바 차트
  weightBars: {
    gap: 8,
  },
  weightBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightBarLabel: {
    width: 40,
    fontSize: 12,
    color: '#AAAAAA',
  },
  weightBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  weightBarValue: {
    width: 45,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },

  // BTC
  btcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  btcLabel: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  btcValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  // 인기 종목
  topHoldingsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  topHoldingsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    marginBottom: 8,
  },
  topHoldingsList: {
    gap: 4,
  },
  topHoldingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  topHoldingRank: {
    width: 16,
    fontSize: 11,
    color: '#666666',
    fontWeight: '700',
  },
  topHoldingTicker: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  topHoldingHolders: {
    fontSize: 11,
    color: '#888888',
  },
  topHoldingWeight: {
    width: 40,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'right',
  },

  // 잠금 구간
  lockedSection: {
    marginTop: 24,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFC107',
  },
  previewCards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  previewCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    width: 75,
    borderWidth: 1,
    borderColor: '#333333',
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  previewTier: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewUnlocked: {
    fontSize: 9,
    color: '#4CAF50',
    fontWeight: '700',
  },
  previewBlur: {
    backgroundColor: '#333333',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  previewBlurText: {
    fontSize: 11,
    color: '#555555',
    fontWeight: '600',
  },
  lockedCta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  unlockButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  discountBadge: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lockedNote: {
    fontSize: 11,
    color: '#666666',
    marginTop: 12,
  },

  // 잠금 해제 후
  unlockedSection: {
    marginTop: 24,
  },
  unlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  unlockedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },

  // BTC 하이라이트
  btcHighlight: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  btcHighlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F7931A',
    marginBottom: 12,
  },
  btcBarsContainer: {
    gap: 8,
  },
  btcBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btcBarLabel: {
    width: 80,
    fontSize: 12,
    color: '#AAAAAA',
  },
  btcBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  btcBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  btcBarValue: {
    width: 40,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },

  // 면책 문구
  disclaimerBox: {
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  disclaimer: {
    fontSize: 10,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 16,
  },
});
