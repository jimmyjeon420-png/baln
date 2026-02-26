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
import { useLocale } from '../../src/context/LocaleContext';

// 자산 유형별 색상
const ASSET_COLORS = {
  stock: '#4CAF50',
  crypto: '#F7931A',
  realestate: '#2196F3',
  cash: '#9E9E9E',
  other: '#7C4DFF',
  btc: '#F7931A',
};

// 자산 유형별 라벨 (fallback — actual labels provided via t() at render time)
const ASSET_LABELS = {
  stock: 'Stocks',
  crypto: 'Crypto',
  realestate: 'Real Estate',
  cash: 'Cash',
  other: 'Other',
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
  const { colors } = useTheme();
  const barWidth = maxWeight > 0 ? Math.max((weight / maxWeight) * 100, 2) : 2;

  return (
    <View style={styles.weightBarRow}>
      <Text style={[styles.weightBarLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.weightBarTrack, { backgroundColor: colors.surfaceLight }]}>
        <View style={[styles.weightBarFill, { width: `${barWidth}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.weightBarValue, { color }]}>{weight.toFixed(1)}%</Text>
    </View>
  );
}

// 등급별 배분 카드 컴포넌트
function TierAllocationCard({ stat, isMyTier }: { stat: TierAllocationStat; isMyTier: boolean }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const tierColor = TIER_COLORS[stat.tier] || '#FFFFFF';
  const tierLabel = TIER_LABELS[stat.tier] || stat.tier;
  const maxWeight = Math.max(
    stat.avg_stock_weight, stat.avg_crypto_weight,
    stat.avg_realestate_weight, stat.avg_cash_weight, stat.avg_other_weight, 1
  );

  return (
    <View style={[styles.tierCard, { backgroundColor: colors.surface }, isMyTier && { borderColor: tierColor, borderWidth: 1 }]}>
      {/* 헤더 */}
      <View style={styles.tierCardHeader}>
        <View style={styles.tierCardTitle}>
          <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
          <Text style={[styles.tierCardName, { color: tierColor }]}>{tierLabel}</Text>
          {isMyTier && (
            <View style={[styles.myBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.myBadgeText}>MY</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tierCardUsers, { color: colors.textTertiary }]}>{t('tier_insights.members_count', { count: String(stat.user_count) })}</Text>
      </View>

      {/* 배분 비중 바 차트 */}
      <View style={styles.weightBars}>
        <WeightBar label={t('tier_insights.asset_stock')} weight={stat.avg_stock_weight} color={ASSET_COLORS.stock} maxWeight={maxWeight} />
        <WeightBar label={t('tier_insights.asset_crypto')} weight={stat.avg_crypto_weight} color={ASSET_COLORS.crypto} maxWeight={maxWeight} />
        {stat.avg_realestate_weight > 0.1 && (
          <WeightBar label={t('tier_insights.asset_realestate')} weight={stat.avg_realestate_weight} color={ASSET_COLORS.realestate} maxWeight={maxWeight} />
        )}
        {stat.avg_cash_weight > 0.1 && (
          <WeightBar label={t('tier_insights.asset_cash')} weight={stat.avg_cash_weight} color={ASSET_COLORS.cash} maxWeight={maxWeight} />
        )}
      </View>

      {/* BTC 비중 (있는 경우) */}
      {stat.avg_btc_weight > 0.1 && (
        <View style={[styles.btcRow, { borderTopColor: colors.surfaceLight }]}>
          <Text style={[styles.btcLabel, { color: colors.textSecondary }]}>{t('tier_insights.btc_weight')}</Text>
          <Text style={[styles.btcValue, { color: ASSET_COLORS.btc }]}>{stat.avg_btc_weight.toFixed(1)}%</Text>
        </View>
      )}

      {/* 인기 종목 TOP 5 */}
      {stat.top_holdings && stat.top_holdings.length > 0 && (
        <View style={[styles.topHoldingsSection, { borderTopColor: colors.surfaceLight }]}>
          <Text style={[styles.topHoldingsTitle, { color: colors.textSecondary }]}>{t('tier_insights.popular_holdings')}</Text>
          <View style={styles.topHoldingsList}>
            {stat.top_holdings.slice(0, 5).map((h, i) => (
              <View key={h.ticker} style={styles.topHoldingItem}>
                <Text style={[styles.topHoldingRank, { color: colors.textTertiary }]}>{i + 1}</Text>
                <Text style={[styles.topHoldingTicker, { color: colors.textPrimary }]}>{h.ticker}</Text>
                <Text style={[styles.topHoldingHolders, { color: colors.textTertiary }]}>{h.holders}명</Text>
                <Text style={[styles.topHoldingWeight, { color: colors.primary }]}>{h.avg_weight.toFixed(1)}%</Text>
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
  const { t } = useLocale();
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
        t('tier_insights.insufficient_credits_title'),
        t('tier_insights.insufficient_credits_message', { cost: String(actualCost), balance: String(balance) }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('tier_insights.charge_credits'), onPress: () => router.push('/marketplace/credits' as any) },
        ]
      );
      return;
    }

    Alert.alert(
      t('tier_insights.unlock_confirm_title'),
      t('tier_insights.unlock_confirm_message', { cost: String(actualCost) }) +
        (discountPercent > 0 ? `\n${t('tier_insights.discount_note', { tier: myTier, pct: String(discountPercent) })}` : ''),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tier_insights.use_credits', { cost: String(actualCost) }),
          onPress: async () => {
            try {
              await unlockMutation.mutateAsync(myTier as any);
              setIsUnlocked(true);
            } catch (error: any) {
              Alert.alert(t('tier_insights.unlock_error_title'), error.message || t('tier_insights.unlock_error_default'));
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
      return t('tier_insights.hook_crypto', { tier: TIER_LABELS[myTier] || myTier, pct: avgCrypto.toFixed(0) });
    }
    const avgStock = myTierData.avg_stock_weight;
    return t('tier_insights.hook_stock', { tier: TIER_LABELS[myTier] || myTier, pct: avgStock.toFixed(0) });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('tier_insights.title')}</Text>
        <View style={[styles.creditBadge, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name="diamond" size={14} color="#7C4DFF" />
          <Text style={[styles.creditBadgeText, { color: colors.textPrimary }]}>{credits?.balance || 0}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 히어로 섹션: Hook 텍스트 */}
        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>🧬</Text>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>{t('tier_insights.hero_title')}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textTertiary }]}>
            {t('tier_insights.hero_subtitle')}
          </Text>
        </View>

        {/* 무료 티저: 내 등급 배분 */}
        {myLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>{t('tier_insights.loading_my_tier')}</Text>
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
              <Ionicons name="people" size={14} color={colors.textTertiary} />
              <Text style={[styles.socialProofText, { color: colors.textTertiary }]}>
                {t('tier_insights.social_proof', { count: String(myTierData.user_count), tier: TIER_LABELS[myTier] || myTier })}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noDataBox}>
            <Ionicons name="analytics-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.noDataText, { color: colors.textPrimary }]}>{t('tier_insights.no_data_title')}</Text>
            <Text style={[styles.noDataSubtext, { color: colors.textTertiary }]}>{t('tier_insights.no_data_subtitle')}</Text>
          </View>
        )}

        {/* 잠금 구간: 다른 등급 비교 */}
        {!isUnlocked ? (
          <View style={[styles.lockedSection, { backgroundColor: colors.surface }]}>
            <View style={styles.lockedHeader}>
              <Ionicons name="lock-closed" size={20} color="#FFC107" />
              <Text style={styles.lockedTitle}>{t('tier_insights.locked_title')}</Text>
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
                      { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                      isMyTierItem && { borderColor: tierColor, borderWidth: 1 },
                    ]}
                  >
                    <View style={[styles.previewDot, { backgroundColor: tierColor }]} />
                    <Text style={[styles.previewTier, { color: isMyTierItem ? tierColor : colors.textTertiary }]}>
                      {TIER_LABELS[tier]}
                    </Text>
                    {isMyTierItem ? (
                      <Text style={[styles.previewUnlocked, { color: colors.primary }]}>{t('tier_insights.my_tier_label')}</Text>
                    ) : (
                      <View style={[styles.previewBlur, { backgroundColor: colors.border }]}>
                        <Text style={[styles.previewBlurText, { color: colors.textTertiary }]}>??%</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* CTA: 궁금증 유발 */}
            <Text style={[styles.lockedCta, { color: colors.textPrimary }]}>
              {t('tier_insights.locked_cta')}
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
                    {t('tier_insights.unlock_button', { cost: String(actualCost) })}
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
            <Text style={[styles.lockedNote, { color: colors.textTertiary }]}>
              {t('tier_insights.locked_note')}
            </Text>
          </View>
        ) : (
          /* 잠금 해제 후: 전체 등급 비교 */
          <View style={styles.unlockedSection}>
            <View style={styles.unlockedHeader}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={[styles.unlockedTitle, { color: colors.primary }]}>{t('tier_insights.unlocked_title')}</Text>
            </View>

            {allLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : allTierData && allTierData.length > 0 ? (
              <>
                {/* 비트코인 비중 하이라이트 */}
                <View style={[styles.btcHighlight, { backgroundColor: colors.surface }]}>
                  <Text style={styles.btcHighlightTitle}>{t('tier_insights.btc_highlight_title')}</Text>
                  <View style={styles.btcBarsContainer}>
                    {allTierData.map((stat) => {
                      const tierColor = TIER_COLORS[stat.tier] || '#888';
                      const tierLabel = TIER_LABELS[stat.tier] || stat.tier;
                      const isMe = stat.tier === myTier;
                      const maxBtc = Math.max(...allTierData.map(s => s.avg_btc_weight), 1);
                      const barW = Math.max((stat.avg_btc_weight / maxBtc) * 100, 3);
                      return (
                        <View key={stat.tier} style={styles.btcBarRow}>
                          <Text style={[styles.btcBarLabel, { color: colors.textSecondary }, isMe && { color: tierColor, fontWeight: '700' }]}>
                            {tierLabel}{isMe ? ` ${t('tier_insights.me_label')}` : ''}
                          </Text>
                          <View style={[styles.btcBarTrack, { backgroundColor: colors.surfaceLight }]}>
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
                  <Ionicons name="people" size={14} color={colors.textTertiary} />
                  <Text style={[styles.socialProofText, { color: colors.textTertiary }]}>
                    {t('tier_insights.social_proof_total', { count: String(allTierData.reduce((s, item) => s + item.user_count, 0)) })}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.noDataBox}>
                <Text style={[styles.noDataText, { color: colors.textPrimary }]}>{t('tier_insights.no_data_yet')}</Text>
              </View>
            )}
          </View>
        )}

        {/* 면책 문구 */}
        <View style={[styles.disclaimerBox, { borderColor: colors.border }]}>
          <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
            {t('tier_insights.disclaimer')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creditBadgeText: {
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 23,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#FFC107',
    lineHeight: 21,
  },

  // 로딩
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  // 데이터 없음
  noDataBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
  },
  noDataSubtext: {
    fontSize: 14,
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
    fontSize: 13,
  },

  // 등급 카드
  tierCard: {
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
    fontSize: 17,
    fontWeight: '700',
  },
  myBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  myBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },
  tierCardUsers: {
    fontSize: 13,
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
    fontSize: 13,
  },
  weightBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  weightBarValue: {
    width: 45,
    fontSize: 13,
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
  },
  btcLabel: {
    fontSize: 13,
  },
  btcValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // 인기 종목
  topHoldingsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  topHoldingsTitle: {
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 12,
    fontWeight: '700',
  },
  topHoldingTicker: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  topHoldingHolders: {
    fontSize: 12,
  },
  topHoldingWeight: {
    width: 40,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },

  // 잠금 구간
  lockedSection: {
    marginTop: 24,
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
    fontSize: 17,
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
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    width: 75,
    borderWidth: 1,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  previewTier: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewUnlocked: {
    fontSize: 10,
    fontWeight: '700',
  },
  previewBlur: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  previewBlurText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lockedCta: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 23,
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
    fontSize: 16,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lockedNote: {
    fontSize: 12,
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
    fontSize: 17,
    fontWeight: '700',
  },

  // BTC 하이라이트
  btcHighlight: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  btcHighlightTitle: {
    fontSize: 15,
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
    fontSize: 13,
  },
  btcBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  btcBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  btcBarValue: {
    width: 40,
    fontSize: 13,
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
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
  },
});
