/**
 * 구루 딥다이브 — 투자 거장 프로필 상세 화면
 *
 * 역할: "투자 철학 교과서"
 * - 거장의 핵심 철학, 전략, 명언, 실적을 한 화면에 집약
 * - 오늘의 AI 인사이트(Central Kitchen)와 연동
 * - 내가 선택한 철학이면 "현재 선택된 철학" 배지 표시
 *
 * 지원 구루: dalio | buffett | cathie_wood | kostolany
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGuruInsights } from '../../../src/hooks/useSharedAnalysis';
import { useGuruStyle } from '../../../src/hooks/useGuruStyle';
import type { GuruInsight } from '../../../src/services/centralKitchen';
import { CharacterAvatar } from '../../../src/components/character/CharacterAvatar';
import { sentimentToExpression } from '../../../src/services/characterService';
import { useLocale } from '../../../src/context/LocaleContext';
import { useTheme } from '../../../src/hooks/useTheme';

// ─────────────────────────────────────────────
// 정적 구루 프로필 데이터 (번역 키 포함)
// ─────────────────────────────────────────────

interface GuruProfile {
  id: string;
  org: string;
  emoji: string;
  accentColor: string;
  /** Insights DB에서 이 구루를 찾기 위한 키워드 */
  matchKeywords: string[];
}

const GURU_PROFILES: Record<string, GuruProfile> = {
  dalio: {
    id: 'dalio',
    org: 'Bridgewater Associates',
    emoji: '🌊',
    accentColor: '#4CAF50',
    matchKeywords: ['달리오', 'dalio', 'bridgewater'],
  },
  buffett: {
    id: 'buffett',
    org: 'Berkshire Hathaway',
    emoji: '🔴',
    accentColor: '#FF5722',
    matchKeywords: ['버핏', 'buffett', 'berkshire'],
  },
  cathie_wood: {
    id: 'cathie_wood',
    org: 'ARK Invest',
    emoji: '🚀',
    accentColor: '#9C27B0',
    matchKeywords: ['캐시', 'cathie', 'ark', '우드'],
  },
  druckenmiller: {
    id: 'druckenmiller',
    org: 'Duquesne Capital Management',
    emoji: '🦅',
    accentColor: '#FFB74D',
    matchKeywords: ['드러킨밀러', 'druckenmiller', 'duquesne', '스탠리'],
  },
};

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────

export default function GuruDetailScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const { guruId } = useLocalSearchParams<{ guruId: string }>();
  const { data: insightsData, isLoading: insightsLoading } = useGuruInsights();
  const { guruStyle } = useGuruStyle();

  const profile = guruId ? GURU_PROFILES[guruId] : null;

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('guru.detail.not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 이 구루의 오늘 인사이트 찾기
  const todayInsight: GuruInsight | undefined = insightsData?.insights?.find(
    (g: GuruInsight) =>
      profile.matchKeywords.some((kw) =>
        g.guruName.toLowerCase().includes(kw) || g.guruNameEn.toLowerCase().includes(kw)
      )
  );

  const isMyPhilosophy = guruStyle === profile.id;
  const actionColors: Record<string, string> = {
    BUY: '#4CAF50',
    SELL: '#CF6679',
    HOLD: '#FFD700',
  };
  const sentimentColors: Record<string, string> = {
    BULLISH: '#4CAF50',
    BEARISH: '#CF6679',
    CAUTIOUS: '#FF9800',
    NEUTRAL: '#FFD700',
  };
  const sentimentLabels: Record<string, string> = {
    BULLISH: t('guru.insights.filter_bullish'),
    BEARISH: t('guru.insights.filter_bearish'),
    CAUTIOUS: t('guru.insights.filter_cautious'),
    NEUTRAL: t('guru.insights.filter_neutral'),
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('guru.detail.header_title')}</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* ── 히어로 카드 ── */}
        <View style={[styles.heroCard, { borderColor: profile.accentColor + '40' }]}>
          <View style={[styles.emojiCircle, { backgroundColor: profile.accentColor + '20', borderColor: profile.accentColor + '60' }]}>
            <CharacterAvatar
              guruId={profile.id}
              size="lg"
              expression={sentimentToExpression(todayInsight?.sentiment)}
              fallbackEmoji={profile.emoji}
            />
          </View>
          <Text style={styles.heroName}>{t(`guru.profiles.${profile.id}.full_name`)}</Text>
          <Text style={styles.heroOrg}>{profile.org}</Text>

          {isMyPhilosophy && (
            <View style={[styles.myPhilosophyBadge, { backgroundColor: profile.accentColor + '20', borderColor: profile.accentColor }]}>
              <Ionicons name="checkmark-circle" size={14} color={profile.accentColor} />
              <Text style={[styles.myPhilosophyText, { color: profile.accentColor }]}>
                {t('guru.detail.my_philosophy_badge')}
              </Text>
            </View>
          )}
        </View>

        {/* ── 철학 카드 ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>🎯</Text>
            <Text style={styles.cardTitle}>{t('guru.detail.philosophy_label')}</Text>
          </View>
          <Text style={styles.cardBody}>{t(`guru.profiles.${profile.id}.philosophy`)}</Text>
        </View>

        {/* ── 전략 카드 ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>⚙️</Text>
            <Text style={styles.cardTitle}>{t('guru.detail.strategy_label')}</Text>
          </View>
          <Text style={styles.cardBody}>{t(`guru.profiles.${profile.id}.strategy`)}</Text>
          <View style={[styles.quoteBox, { borderLeftColor: profile.accentColor }]}>
            <Text style={styles.quoteText}>"{t(`guru.profiles.${profile.id}.key_principle`)}"</Text>
          </View>
        </View>

        {/* ── 실적 카드 ── */}
        <View style={[styles.card, styles.trackCard]}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardTitle}>{t('guru.detail.track_label')}</Text>
          </View>
          <Text style={styles.cardBody}>{t(`guru.profiles.${profile.id}.track`)}</Text>
        </View>

        {/* ── 구조화 분석 카드 (structured data 있을 때만) ── */}
        {todayInsight?.action && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>📈</Text>
              <Text style={styles.cardTitle}>{t('guru.detail.structured_analysis_label')}</Text>
            </View>

            {/* 행동 배지 */}
            <View style={styles.structuredRow}>
              <Text style={styles.structuredLabel}>{t('guru.detail.action_label')}</Text>
              <View style={[
                styles.actionBadge,
                {
                  backgroundColor: (actionColors[todayInsight.action] || '#FFD700') + '25',
                  borderColor: actionColors[todayInsight.action] || '#FFD700',
                }
              ]}>
                <Text style={[styles.actionBadgeText, { color: actionColors[todayInsight.action] || '#FFD700' }]}>
                  {todayInsight.action}
                </Text>
              </View>
            </View>

            {/* 주목 종목 */}
            {todayInsight.target_tickers && todayInsight.target_tickers.length > 0 && (
              <View style={styles.structuredRow}>
                <Text style={styles.structuredLabel}>{t('guru.detail.target_tickers_label')}</Text>
                <View style={styles.structuredTickerRow}>
                  {todayInsight.target_tickers.map((ticker: string) => (
                    <View key={ticker} style={[styles.structuredTickerChip, { backgroundColor: profile.accentColor + '20' }]}>
                      <Text style={[styles.structuredTickerText, { color: profile.accentColor }]}>{ticker}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 섹터 */}
            {todayInsight.sector && (
              <View style={styles.structuredRow}>
                <Text style={styles.structuredLabel}>{t('guru.detail.sector_label')}</Text>
                <Text style={styles.structuredValue}>{todayInsight.sector}</Text>
              </View>
            )}

            {/* 확신도 별점 */}
            {todayInsight.conviction_level && (
              <View style={styles.structuredRow}>
                <Text style={styles.structuredLabel}>{t('guru.detail.conviction_label')}</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Text key={i} style={[styles.starIcon, { color: i <= (todayInsight.conviction_level ?? 0) ? profile.accentColor : '#333333' }]}>
                      {i <= (todayInsight.conviction_level ?? 0) ? '★' : '☆'}
                    </Text>
                  ))}
                  <Text style={styles.convictionLabel}>({todayInsight.conviction_level}/5)</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── 오늘의 인사이트 ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>🔴</Text>
            <Text style={styles.cardTitle}>{t('guru.detail.insight_title')}</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>{t('guru.detail.live_badge')}</Text>
            </View>
          </View>

          {insightsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={profile.accentColor} />
              <Text style={styles.loadingText}>{t('guru.detail.loading_text')}</Text>
            </View>
          ) : todayInsight ? (
            <View>
              {/* 센티먼트 */}
              <View style={[
                styles.sentimentBadge,
                {
                  backgroundColor: (sentimentColors[todayInsight.sentiment] || '#FFD700') + '20',
                  borderColor: sentimentColors[todayInsight.sentiment] || '#FFD700',
                }
              ]}>
                <Text style={[styles.sentimentText, { color: sentimentColors[todayInsight.sentiment] || '#FFD700' }]}>
                  {t('guru.detail.sentiment_position', { sentiment: sentimentLabels[todayInsight.sentiment] || t('guru.insights.filter_neutral') })}
                </Text>
              </View>

              {/* 최근 행동 */}
              <Text style={styles.insightLabel}>{t('guru.detail.recent_action_label')}</Text>
              <Text style={styles.insightBody}>{todayInsight.recentAction}</Text>

              {/* 발언 인용 */}
              {todayInsight.quote && (
                <View style={[styles.quoteBox, { borderLeftColor: profile.accentColor }]}>
                  <Text style={styles.quoteText}>"{todayInsight.quote}"</Text>
                </View>
              )}

              {/* AI 분석 */}
              {todayInsight.reasoning && (
                <>
                  <Text style={styles.insightLabel}>{t('guru.detail.analysis_label')}</Text>
                  <Text style={styles.insightBody}>{todayInsight.reasoning}</Text>
                </>
              )}

              {/* 관련 티커 */}
              {todayInsight.relevantAssets && todayInsight.relevantAssets.length > 0 && (
                <View style={styles.tickerRow}>
                  {todayInsight.relevantAssets.slice(0, 5).map((ticker: string) => (
                    <View key={ticker} style={[styles.tickerChip, { backgroundColor: profile.accentColor + '20' }]}>
                      <Text style={[styles.tickerText, { color: profile.accentColor }]}>{ticker}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 출처 */}
              {todayInsight.source && (
                <Text style={styles.sourceText}>{t('guru.detail.source_label')} {todayInsight.source}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.noInsightText}>
              {t('guru.detail.no_insight_text')}
            </Text>
          )}
        </View>

        {/* ── 면책 조항 ── */}
        <View style={styles.disclaimer}>
          <Ionicons name="warning-outline" size={12} color="#555" />
          <Text style={styles.disclaimerText}>
            {t('guru.detail.disclaimer')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via colors.background inline
  },
  scroll: {
    paddingBottom: 20,
  },
  // ── 헤더 ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  backBtn: {
    padding: 4,
    width: 32,
  },
  // ── 히어로 ──
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1E1E2E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emojiCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
  },
  heroEmoji: {
    fontSize: 42,
  },
  heroName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroOrg: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 12,
  },
  myPhilosophyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  myPhilosophyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── 카드 ──
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 18,
  },
  trackCard: {
    backgroundColor: '#1A2A1A',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  cardIcon: {
    fontSize: 19,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
  },
  cardBody: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 23,
  },
  quoteBox: {
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
  },
  quoteText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    lineHeight: 21,
  },
  // ── 구조화 분석 ──
  structuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  structuredLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    minWidth: 60,
  },
  structuredValue: {
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  structuredTickerRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  structuredTickerChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  structuredTickerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starIcon: {
    fontSize: 18,
  },
  convictionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },

  // ── LIVE 뱃지 ──
  liveBadge: {
    backgroundColor: '#FF453A20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF453A50',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF453A',
    letterSpacing: 0.5,
  },
  // ── 인사이트 ──
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  sentimentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  sentimentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  insightLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  insightBody: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  tickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tickerChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tickerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sourceText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
  },
  noInsightText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    paddingVertical: 8,
  },
  // ── 기타 ──
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#555',
    lineHeight: 16,
  },
});
