/**
 * 마켓플레이스 메인 — AI 프리미엄 기능 매장
 * 크레딧 잔액 + 4개 AI 기능 카드 + 히스토리 + 충전 CTA
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CreditBadge from '../../src/components/CreditBadge';
import AIFeatureCard from '../../src/components/AIFeatureCard';
import { MarketplaceMainSkeleton } from '../../src/components/MarketplaceSkeletonLoader';
import { useMyCredits } from '../../src/hooks/useCredits';
import { useFeatureHistory } from '../../src/hooks/useAIMarketplace';
import { useHaptics } from '../../src/hooks/useHaptics';
import supabase from '../../src/services/supabase';
import type { UserTier } from '../../src/types/database';
import { FEATURE_LABELS } from '../../src/types/marketplace';
import type { AIFeatureType } from '../../src/types/marketplace';

export default function MarketplaceScreen() {
  const router = useRouter();
  const { mediumTap } = useHaptics();
  const { data: credits, isLoading: creditsLoading, refetch: refetchCredits } = useMyCredits();
  const { data: history, isLoading: historyLoading } = useFeatureHistory(undefined, 5);

  const [userTier, setUserTier] = useState<UserTier>('SILVER');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 사용자 티어 로드
  useFocusEffect(
    useCallback(() => {
      const loadTier = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('tier')
          .eq('id', user.id)
          .single();
        if (data?.tier) setUserTier(data.tier as UserTier);
        setInitialLoaded(true);
      };
      loadTier();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchCredits();
    setRefreshing(false);
  };

  const navigateToFeature = (feature: string) => {
    mediumTap();
    router.push(`/marketplace/${feature}` as any);
  };

  if (!initialLoaded || (creditsLoading && !credits)) {
    return (
      <SafeAreaView style={styles.container}>
        <MarketplaceMainSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#666" />
        }
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>AI 프리미엄</Text>
          <CreditBadge size="medium" />
        </View>

        {/* 설명 */}
        <Text style={styles.subtitle}>
          AI가 분석하는 프리미엄 투자 인사이트
        </Text>

        {/* 기능 카드 리스트 */}
        <View style={styles.featureList}>
          <AIFeatureCard
            featureType="deep_dive"
            title="AI 종목 딥다이브"
            description="재무제표 + 뉴스 + 기술적 분석 + AI 의견"
            icon="search"
            iconColor="#4FC3F7"
            userTier={userTier}
            onPress={() => navigateToFeature('deep-dive')}
          />
          <AIFeatureCard
            featureType="what_if"
            title="What-If 시뮬레이터"
            description="가상 시나리오별 포트폴리오 영향 분석"
            icon="flask"
            iconColor="#FFA726"
            userTier={userTier}
            onPress={() => navigateToFeature('what-if')}
          />
          <AIFeatureCard
            featureType="tax_report"
            title="세금 최적화 리포트"
            description="양도세/종합소득세 절세 전략 + 매도 타이밍"
            icon="receipt"
            iconColor="#66BB6A"
            userTier={userTier}
            onPress={() => navigateToFeature('tax-report')}
          />
          <AIFeatureCard
            featureType="ai_cfo_chat"
            title="AI CFO 1:1 채팅"
            description="포트폴리오 맞춤 AI 재무 상담 (메시지당 과금)"
            icon="chatbubbles"
            iconColor="#7C4DFF"
            userTier={userTier}
            onPress={() => navigateToFeature('ai-cfo-chat')}
          />
        </View>

        {/* 충전 CTA */}
        <TouchableOpacity
          style={styles.chargeCta}
          onPress={() => {
            mediumTap();
            router.push('/marketplace/credits');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="diamond" size={20} color="#7C4DFF" />
          <Text style={styles.chargeCtaText}>크레딧 충전하기</Text>
          <Ionicons name="arrow-forward" size={16} color="#666" />
        </TouchableOpacity>

        {/* 과거 분석 히스토리 */}
        {history && history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>최근 분석 내역</Text>
            {history.map((item: any) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Ionicons
                    name={
                      item.feature_type === 'deep_dive' ? 'search' :
                      item.feature_type === 'what_if' ? 'flask' : 'receipt'
                    }
                    size={16}
                    color="#888"
                  />
                  <Text style={styles.historyLabel}>
                    {FEATURE_LABELS[item.feature_type as AIFeatureType]}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyCost}>-{item.credits_charged}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 티어 할인 안내 */}
        {userTier !== 'SILVER' && (
          <View style={styles.tierBanner}>
            <Ionicons name="star" size={16} color="#4CAF50" />
            <Text style={styles.tierBannerText}>
              {userTier} 등급 할인이 적용되고 있습니다
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  featureList: {
    gap: 12,
  },
  chargeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#7C4DFF40',
  },
  chargeCtaText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  historySection: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyLabel: {
    color: '#CCC',
    fontSize: 13,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyCost: {
    color: '#CF6679',
    fontSize: 13,
    fontWeight: '600',
  },
  historyDate: {
    color: '#666',
    fontSize: 11,
  },
  tierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4CAF5015',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  tierBannerText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
});
