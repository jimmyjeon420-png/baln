/**
 * AI 프리미엄 마켓플레이스 — Toss PO 관점 리디자인
 *
 * [핵심 원칙]
 * 1. 개인화: 포트폴리오 기반 맞춤 추천 ("TSLA이 -7% 하락 중")
 * 2. 감정 터치: 불안 → 해결 흐름 ("이 종목, 살까 말까?")
 * 3. 사회적 증거: "1,000+명이 사용 중"
 * 4. 최소 마찰: 원탭으로 AI 분석 시작
 * 5. 점진적 공개: 핵심 추천 → 도구 → 히스토리
 *
 * 구조 (위→아래):
 * 1. 헤더 (뒤로 + 타이틀 + 크레딧 배지)
 * 2. 개인화 추천 히어로 카드
 * 3. AI 분석 도구 2x2 그리드
 * 4. 소셜 프루프 바
 * 5. 크레딧 충전 CTA
 * 6. 티어 할인 안내
 * 7. 최근 분석 내역
 * 8. 면책 문구
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { Ionicons } from '@expo/vector-icons';
import CreditBadge from '../../src/components/CreditBadge';
import { MarketplaceMainSkeleton } from '../../src/components/MarketplaceSkeletonLoader';
import { useMyCredits } from '../../src/hooks/useCredits';
import { useFeatureHistory } from '../../src/hooks/useAIMarketplace';
import { useHaptics } from '../../src/hooks/useHaptics';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import type { UserTier } from '../../src/types/database';
import { FEATURE_LABELS, TIER_DISCOUNTS, type AIFeatureType } from '../../src/types/marketplace';
import { getDiscountedCost } from '../../src/services/creditService';
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';
import { getLocaleCode } from '../../src/utils/formatters';
import { ItemPurchaseModal } from '../../src/components/marketplace/ItemPurchaseModal';
import { type MarketplaceItem, getItemsByTier } from '../../src/data/marketplaceItems';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI 도구 정의 — 토스 스타일 카피 (기능 설명 X, 감정 터치 O)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AIToolDef {
  type: AIFeatureType;
  titleKey: string;
  taglineKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  badgeKey?: string;
}

const AI_TOOLS: AIToolDef[] = [
  {
    type: 'deep_dive',
    titleKey: 'marketplacePage.tool_deep_dive',
    taglineKey: 'marketplacePage.tool_deep_dive_tagline',
    icon: 'search',
    color: '#4FC3F7',
    route: 'deep-dive',
    badgeKey: 'marketplacePage.tool_deep_dive_badge',
  },
  {
    type: 'what_if',
    titleKey: 'marketplacePage.tool_what_if',
    taglineKey: 'marketplacePage.tool_what_if_tagline',
    icon: 'flask',
    color: '#FFA726',
    route: 'what-if',
  },
  {
    type: 'tax_report',
    titleKey: 'marketplacePage.tool_tax_report',
    taglineKey: 'marketplacePage.tool_tax_report_tagline',
    icon: 'receipt',
    color: '#66BB6A',
    route: 'tax-report',
  },
  {
    type: 'ai_cfo_chat',
    titleKey: 'marketplacePage.tool_ai_cfo_chat',
    taglineKey: 'marketplacePage.tool_ai_cfo_chat_tagline',
    icon: 'chatbubbles',
    color: '#7C4DFF',
    route: 'ai-cfo-chat',
    badgeKey: 'NEW',
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 개인화 추천 로직 — 포트폴리오 상태에 따라 가장 적합한 도구 추천
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Recommendation {
  type: AIFeatureType;
  headlineKey: string;
  headlineParams?: Record<string, string>;
  descriptionKey: string;
  ctaKey: string;
  accentColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  sourceLabelKey: string;
  confidenceScore: number; // 추천 신뢰도(클라이언트 추정)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRecommendation(portfolio: any[]): Recommendation {
  // 포트폴리오 없으면 → 범용 추천
  if (portfolio.length === 0) {
    return {
      type: 'deep_dive',
      headlineKey: 'marketplacePage.rec_empty_headline',
      descriptionKey: 'marketplacePage.rec_empty_description',
      ctaKey: 'marketplacePage.rec_empty_cta',
      accentColor: '#4FC3F7',
      icon: 'sparkles',
      sourceLabelKey: 'marketplacePage.rec_empty_source',
      confidenceScore: 52,
    };
  }

  // 가장 많이 하락한 종목 찾기
  const withChange = portfolio
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((p: any) => p.current_price > 0 && p.avg_price > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({
      ...p,
      changePercent: ((p.current_price - p.avg_price) / p.avg_price) * 100,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.changePercent - b.changePercent);

  // -5% 이상 하락 종목 있으면 → 딥다이브 추천
  if (withChange.length > 0 && withChange[0].changePercent < -5) {
    const loser = withChange[0];
    const ticker = loser.ticker || loser.name;
    return {
      type: 'deep_dive',
      headlineKey: 'marketplacePage.rec_loser_headline',
      headlineParams: { ticker, percent: Math.abs(loser.changePercent).toFixed(1) },
      descriptionKey: 'marketplacePage.rec_loser_description',
      ctaKey: 'marketplacePage.rec_loser_cta',
      accentColor: '#4FC3F7',
      icon: 'trending-down',
      sourceLabelKey: 'marketplacePage.rec_loser_source',
      confidenceScore: 84,
    };
  }

  // 자산 5개 이상 → What-If 추천
  if (portfolio.length >= 5) {
    return {
      type: 'what_if',
      headlineKey: 'marketplacePage.rec_many_headline',
      headlineParams: { count: String(portfolio.length) },
      descriptionKey: 'marketplacePage.rec_many_description',
      ctaKey: 'marketplacePage.rec_many_cta',
      accentColor: '#FFA726',
      icon: 'shield-checkmark',
      sourceLabelKey: 'marketplacePage.rec_many_source',
      confidenceScore: 74,
    };
  }

  // 기본 → 세금 리포트
  return {
    type: 'tax_report',
    headlineKey: 'marketplacePage.rec_tax_headline',
    descriptionKey: 'marketplacePage.rec_tax_description',
    ctaKey: 'marketplacePage.rec_tax_cta',
    accentColor: '#66BB6A',
    icon: 'cash',
    sourceLabelKey: 'marketplacePage.rec_tax_source',
    confidenceScore: 70,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 화면
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function MarketplaceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { mediumTap } = useHaptics();
  const { data: credits, refetch: refetchCredits } = useMyCredits();
  const { data: history } = useFeatureHistory(undefined, 5);

  const [userTier, setUserTier] = useState<UserTier>('SILVER');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [recommendationGeneratedAt, setRecommendationGeneratedAt] = useState<string>(new Date().toISOString());

  // 사용자 티어 + 포트폴리오 로드 (개인화 추천에 필요)
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const user = await getCurrentUser();
          if (!user) return;

          const [profileRes, portfolioRes] = await Promise.all([
            supabase.from('profiles').select('tier').eq('id', user.id).single(),
            supabase.from('portfolios').select('*').eq('user_id', user.id),
          ]);

          if (profileRes.data?.tier) setUserTier(profileRes.data.tier as UserTier);
          if (portfolioRes.data) setPortfolio(portfolioRes.data);
        } catch (err) {
          console.warn('[Marketplace] 데이터 로드 실패 (기본값 사용):', err);
        } finally {
          setRecommendationGeneratedAt(new Date().toISOString());
          setInitialLoaded(true);
        }
      };
      load();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchCredits();
    setRefreshing(false);
  };

  const navigateToFeature = (route: string) => {
    mediumTap();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(`/marketplace/${route}` as any);
    } catch (err) {
      Sentry.captureException(err);
    }
  };

  // ── 로딩 상태 (포트폴리오/티어 로드만 대기, 크레딧은 인라인 로딩) ──
  if (!initialLoaded) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <MarketplaceMainSkeleton />
      </SafeAreaView>
    );
  }

  const recommendation = getRecommendation(portfolio);
  const balance = credits?.balance ?? 0;
  const discountPercent = TIER_DISCOUNTS[userTier];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 렌더
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#666" />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* ── 1. 헤더 ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('marketplacePage.header_title')}</Text>
          <CreditBadge size="medium" />
        </View>

        {/* ── 2. 개인화 추천 히어로 카드 ── */}
        <TouchableOpacity
          style={[s.heroCard, { borderColor: recommendation.accentColor + '30' }]}
          onPress={() => navigateToFeature(
            AI_TOOLS.find(tool => tool.type === recommendation.type)?.route || 'deep-dive'
          )}
          activeOpacity={0.85}
        >
          <View style={s.heroTop}>
            <View style={[s.heroIconBg, { backgroundColor: recommendation.accentColor + '15' }]}>
              <Ionicons name={recommendation.icon} size={22} color={recommendation.accentColor} />
            </View>
            <View style={[s.heroBadge, { backgroundColor: recommendation.accentColor + '20' }]}>
              <Text style={[s.heroBadgeText, { color: recommendation.accentColor }]}>
                {t('marketplacePage.hero_badge')}
              </Text>
            </View>
          </View>

          <Text style={s.heroHeadline}>{t(recommendation.headlineKey, recommendation.headlineParams)}</Text>
          <Text style={s.heroDesc}>{t(recommendation.descriptionKey)}</Text>

          <View style={s.heroTrustRow}>
            <Text style={s.heroTrustChip}>{t('marketplacePage.trust_source', { label: t(recommendation.sourceLabelKey) })}</Text>
            <Text style={s.heroTrustChip}>{t('marketplacePage.trust_generated', { time: new Date(recommendationGeneratedAt).toLocaleString(getLocaleCode()) })}</Text>
            <Text style={s.heroTrustChip}>{t('marketplacePage.trust_confidence', { score: String(recommendation.confidenceScore) })}</Text>
          </View>

          <View style={[s.heroCta, { backgroundColor: recommendation.accentColor }]}>
            <Text style={s.heroCtaText}>{t(recommendation.ctaKey)}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* ── 3. AI 분석 도구 2x2 그리드 ── */}
        <Text style={s.sectionTitle}>{t('marketplacePage.section_ai_tools')}</Text>
        <View style={s.toolGrid}>
          {AI_TOOLS.map(tool => {
            const { discountedCost, originalCost } = getDiscountedCost(tool.type, userTier);
            const hasDiscount = discountPercent > 0;

            return (
              <TouchableOpacity
                key={tool.type}
                style={s.toolCard}
                onPress={() => navigateToFeature(tool.route)}
                activeOpacity={0.8}
              >
                {/* 뱃지 (인기 / NEW) */}
                {tool.badgeKey && (
                  <View style={[s.toolBadge, { backgroundColor: tool.color }]}>
                    <Text style={s.toolBadgeText}>{tool.badgeKey === 'NEW' ? 'NEW' : t(tool.badgeKey)}</Text>
                  </View>
                )}

                {/* 아이콘 */}
                <View style={[s.toolIconBg, { backgroundColor: tool.color + '15' }]}>
                  <Ionicons name={tool.icon} size={24} color={tool.color} />
                </View>

                {/* 기능명 (작게) */}
                <Text style={s.toolTitle}>{t(tool.titleKey)}</Text>

                {/* 감정 터치 카피 (크게, 핵심) */}
                <Text style={s.toolTagline}>{t(tool.taglineKey)}</Text>

                {/* 크레딧 비용 */}
                <View style={s.toolCostRow}>
                  <Text style={{ fontSize: 22 }}>🌰</Text>
                  {hasDiscount && (
                    <Text style={s.toolOriginalCost}>{originalCost}</Text>
                  )}
                  <Text style={s.toolCost}>{discountedCost}</Text>
                  {tool.type === 'ai_cfo_chat' && (
                    <Text style={s.toolCostUnit}>{t('marketplacePage.per_use')}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 4. 소셜 프루프 ── */}
        <View style={s.socialProof}>
          <View style={s.socialIconBg}>
            <Ionicons name="people" size={14} color="#4CAF50" />
          </View>
          <Text style={s.socialText}>
            {t('marketplacePage.social_proof_prefix')}<Text style={s.socialHighlight}>{t('marketplacePage.social_proof_count')}</Text>{t('marketplacePage.social_proof_suffix')}
          </Text>
        </View>

        {/* ── 5. 크레딧 충전 CTA ── */}
        <TouchableOpacity
          style={s.creditCard}
          onPress={() => {
            mediumTap();
            router.push('/marketplace/credits');
          }}
          activeOpacity={0.8}
        >
          <View style={s.creditLeft}>
            <View style={s.creditIconBg}>
              <Text style={{ fontSize: 44 }}>🌰</Text>
            </View>
            <View>
              <Text style={s.creditLabel}>{t('marketplacePage.credit_label')}</Text>
              <Text style={s.creditBalance}>{balance.toLocaleString()}</Text>
            </View>
          </View>
          <View style={s.creditCta}>
            <Text style={s.creditCtaText}>{t('marketplacePage.credit_cta')}</Text>
            <Ionicons name="arrow-forward" size={14} color="#7C4DFF" />
          </View>
        </TouchableOpacity>

        {/* ── 6. 티어 할인 안내 ── */}
        {discountPercent > 0 && (
          <View style={s.tierBanner}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={s.tierText}>
              {t('marketplacePage.tier_discount', { tier: userTier, discount: String(discountPercent) })}
            </Text>
          </View>
        )}

        {/* ── 7. 최근 분석 내역 ── */}
        {history && history.length > 0 && (
          <View style={s.historySection}>
            <Text style={s.sectionTitle}>{t('marketplacePage.section_history')}</Text>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {history.map((item: any) => {
              const toolInfo = AI_TOOLS.find(tool => tool.type === item.feature_type);
              return (
                <View key={item.id} style={s.historyItem}>
                  <View style={[s.historyIcon, { backgroundColor: (toolInfo?.color || '#888') + '15' }]}>
                    <Ionicons
                      name={toolInfo?.icon || 'ellipse'}
                      size={14}
                      color={toolInfo?.color || '#888'}
                    />
                  </View>
                  <View style={s.historyInfo}>
                    <Text style={s.historyLabel}>
                      {FEATURE_LABELS[item.feature_type as AIFeatureType]}
                    </Text>
                    <Text style={s.historyDate}>
                      {new Date(item.created_at).toLocaleDateString(getLocaleCode())}
                    </Text>
                  </View>
                  <View style={s.historyCostBadge}>
                    <Text style={{ fontSize: 20 }}>🌰</Text>
                    <Text style={s.historyCost}>{item.credits_charged}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── 7.5. 크레딧 상점 (Tier 1/2 아이템) ── */}
        <View style={s.shopSection}>
          <Text style={s.sectionTitle}>{t('marketplacePage.section_shop')}</Text>
          {[...getItemsByTier('instant'), ...getItemsByTier('experience')].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.shopItem}
              onPress={() => {
                mediumTap();
                setSelectedItem(item);
                setShowPurchaseModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={s.shopItemIcon}>{item.icon}</Text>
              <View style={s.shopItemInfo}>
                <Text style={s.shopItemName}>{item.name}</Text>
                <Text style={s.shopItemDesc} numberOfLines={1}>{item.description}</Text>
              </View>
              <View style={s.shopItemPrice}>
                <Text style={{ fontSize: 22 }}>🌰</Text>
                <Text style={s.shopItemPriceText}>{t('marketplacePage.acorn_count', { count: String(item.price) })}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 8. 면책 문구 ── */}
        <View style={s.footerBox}>
          <Text style={s.footerNote}>
            {t('marketplacePage.disclaimer')}
          </Text>
        </View>

      </ScrollView>

      {/* ── 아이템 구매 모달 ── */}
      <ItemPurchaseModal
        item={selectedItem}
        visible={showPurchaseModal}
        balance={balance}
        onClose={() => {
          setShowPurchaseModal(false);
          setSelectedItem(null);
        }}
        onSuccess={() => {
          setShowPurchaseModal(false);
          setSelectedItem(null);
          refetchCredits();
        }}
      />
    </SafeAreaView>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 스타일 — 토스 디자인 원칙: 넓은 여백, 깔끔한 타이포, 절제된 색상
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const s = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor는 동적으로 적용됨 (colors.background)
  },
  scroll: {
    paddingBottom: 40,
  },

  // ── 헤더 ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 19,
    fontWeight: '800',
  },

  // ── 개인화 추천 히어로 카드 ──
  heroCard: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 28,
    backgroundColor: '#141414',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  heroIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroHeadline: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 33,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroDesc: {
    color: '#888',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  heroTrustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  heroTrustChip: {
    fontSize: 11,
    color: '#8B8B8B',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    borderRadius: 14,
  },
  heroCtaText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── 섹션 타이틀 ──
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 20,
    marginBottom: 14,
  },

  // ── AI 도구 2x2 그리드 ──
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: CARD_GAP,
    marginBottom: 24,
  },
  toolCard: {
    width: CARD_WIDTH,
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    minHeight: 190,
  },
  toolBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 1,
  },
  toolBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  toolIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  toolTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  toolTagline: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
    marginBottom: 14,
  },
  toolCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  toolOriginalCost: {
    color: '#555',
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  toolCost: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '700',
  },
  toolCostUnit: {
    color: '#666',
    fontSize: 12,
  },

  // ── 소셜 프루프 ──
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    paddingVertical: 14,
    marginHorizontal: 20,
    backgroundColor: '#4CAF5008',
    borderRadius: 12,
  },
  socialIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF5015',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  socialHighlight: {
    color: '#4CAF50',
    fontWeight: '800',
  },

  // ── 크레딧 충전 CTA ──
  creditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#7C4DFF20',
    marginBottom: 12,
  },
  creditLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  creditIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#7C4DFF12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 2,
  },
  creditBalance: {
    color: '#FFF',
    fontSize: 23,
    fontWeight: '800',
  },
  creditCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C4DFF15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  creditCtaText: {
    color: '#7C4DFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── 티어 할인 ──
  tierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    backgroundColor: '#FFD70008',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  tierText: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '500',
  },
  tierHighlight: {
    color: '#FFD700',
    fontWeight: '700',
  },

  // ── 최근 분석 내역 ──
  historySection: {
    marginTop: 4,
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1A1A1A',
    gap: 12,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyLabel: {
    color: '#CCC',
    fontSize: 15,
    fontWeight: '600',
  },
  historyDate: {
    color: '#555',
    fontSize: 12,
    marginTop: 2,
  },
  historyCostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#7C4DFF10',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  historyCost: {
    color: '#7C4DFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── 푸터 면책 ──
  // ── 크레딧 상점 ──
  shopSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  shopItemIcon: {
    fontSize: 29,
    marginRight: 12,
  },
  shopItemInfo: {
    flex: 1,
  },
  shopItemName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  shopItemDesc: {
    color: '#6B7280',
    fontSize: 12,
  },
  shopItemPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#7C4DFF20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  shopItemPriceText: {
    color: '#7C4DFF',
    fontSize: 14,
    fontWeight: '700',
  },

  footerBox: {
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  footerNote: {
    color: '#444',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
  },
});
