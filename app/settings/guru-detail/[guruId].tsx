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

// ─────────────────────────────────────────────
// 정적 구루 프로필 데이터
// ─────────────────────────────────────────────

interface GuruProfile {
  id: string;
  fullName: string;
  org: string;
  emoji: string;
  accentColor: string;
  philosophy: string;
  strategy: string;
  keyPrinciple: string;
  track: string;
  /** Insights DB에서 이 구루를 찾기 위한 키워드 */
  matchKeywords: string[];
}

const GURU_PROFILES: Record<string, GuruProfile> = {
  dalio: {
    id: 'dalio',
    fullName: '레이 달리오 (Ray Dalio)',
    org: 'Bridgewater Associates',
    emoji: '🌊',
    accentColor: '#4CAF50',
    philosophy: 'All Weather 전략 — 어떤 경제 환경에서도 살아남는 분산 포트폴리오를 구성합니다. 성장·침체·인플레이션·디플레이션 4가지 국면 모두를 커버하는 것이 핵심입니다.',
    strategy: '주식 30% + 장기채 40% + 중기채 15% + 금 7.5% + 원자재 7.5%. 상관관계가 낮은 자산을 섞어 어떤 환경에서도 손실을 최소화합니다.',
    keyPrinciple: '"고통 + 성찰 = 진보" — 손실에서 배우고 원칙을 세워라. 진짜 성공은 올바른 의사결정 시스템에서 나온다.',
    track: '2008년 금융위기에 +9.5% 수익 달성. 운용 자산 1,500억 달러, 지난 30년 평균 연 12% 수익률. 모든 헤지펀드 중 역대 최고 수익 기록.',
    matchKeywords: ['달리오', 'dalio', 'bridgewater'],
  },
  buffett: {
    id: 'buffett',
    fullName: '워렌 버핏 (Warren Buffett)',
    org: 'Berkshire Hathaway',
    emoji: '🔴',
    accentColor: '#FF5722',
    philosophy: '가치 투자 — 내재 가치보다 싸게 사서 오래 보유하는 장기 복리 전략입니다. "10년을 보유할 마음이 없으면 10분도 보유하지 마라."',
    strategy: '우량 기업에 집중 투자 (AAPL, OXY, BRK 등). 현금 비중 25% 항상 유지. 이해 못하는 사업엔 절대 투자하지 않는 "능력의 원" 원칙.',
    keyPrinciple: '"남들이 탐욕스러울 때 두려워하고, 남들이 두려울 때 탐욕스러워라." 시장의 공포를 기회로 활용하는 역발상 투자.',
    track: '지난 58년 연평균 +19.8%. 1964년 1만 달러 투자 시 현재 1억 4천만 달러. S&P500 대비 3배 초과 수익.',
    matchKeywords: ['버핏', 'buffett', 'berkshire'],
  },
  cathie_wood: {
    id: 'cathie_wood',
    fullName: '캐시 우드 (Cathie Wood)',
    org: 'ARK Invest',
    emoji: '🚀',
    accentColor: '#9C27B0',
    philosophy: '파괴적 혁신 투자 — AI·블록체인·유전체학·우주 등 5년 후 세상을 바꿀 기술에 집중합니다. 단기 변동성은 혁신의 대가입니다.',
    strategy: '성장주 집중 (TSLA, COIN, ROKU, PATH 등). 분산 최소화, 확신이 클수록 비중 확대. 5년 이상 장기 보유 원칙.',
    keyPrinciple: '"혁신은 선형이 아니라 지수적으로 성장한다." 오늘의 비싼 주식이 내일의 저렴한 주식이 될 수 있다.',
    track: '2020년 ARK Innovation ETF +152% 수익. 장기 AI 낙관론, 비트코인 $1.5M 목표치 제시.',
    matchKeywords: ['캐시', 'cathie', 'ark', '우드'],
  },
  druckenmiller: {
    id: 'druckenmiller',
    fullName: '스탠리 드러킨밀러 (Stanley Druckenmiller)',
    org: 'Duquesne Capital Management',
    emoji: '🦅',
    accentColor: '#FFB74D',
    philosophy: '매크로 트렌드 + 집중 투자 — 거시 경제 흐름을 읽고, 확신이 들면 한 방향에 크게 베팅합니다. "올바른 판단에 소극적으로 베팅하면 의미가 없다."',
    strategy: '탑다운 매크로: 금리·통화·재정 정책 분석 → 승률 높은 비대칭 기회 포착 → 레버리지 집중 투자. 틀리면 즉시 손절, 맞으면 추가 매수.',
    keyPrinciple: '"중요한 건 맞고 틀리는 빈도가 아니라, 맞았을 때 얼마나 버느냐다." 승률보다 수익의 비대칭성이 핵심.',
    track: '30년간 연평균 +30% 수익률, 단 한 해도 마이너스 없음. 1992년 소로스와 영국 파운드 공매도로 $1B 이상 수익. Duquesne 청산 시 자산 $12B.',
    matchKeywords: ['드러킨밀러', 'druckenmiller', 'duquesne', '스탠리'],
  },
};

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────

export default function GuruDetailScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { guruId } = useLocalSearchParams<{ guruId: string }>();
  const { data: insightsData, isLoading: insightsLoading } = useGuruInsights();
  const { guruStyle } = useGuruStyle();

  const profile = guruId ? GURU_PROFILES[guruId] : null;

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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
    <SafeAreaView style={styles.container} edges={['top']}>
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
          <Text style={styles.heroName}>{profile.fullName}</Text>
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
          <Text style={styles.cardBody}>{profile.philosophy}</Text>
        </View>

        {/* ── 전략 카드 ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>⚙️</Text>
            <Text style={styles.cardTitle}>{t('guru.detail.strategy_label')}</Text>
          </View>
          <Text style={styles.cardBody}>{profile.strategy}</Text>
          <View style={[styles.quoteBox, { borderLeftColor: profile.accentColor }]}>
            <Text style={styles.quoteText}>"{profile.keyPrinciple}"</Text>
          </View>
        </View>

        {/* ── 실적 카드 ── */}
        <View style={[styles.card, styles.trackCard]}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardTitle}>{t('guru.detail.track_label')}</Text>
          </View>
          <Text style={styles.cardBody}>{profile.track}</Text>
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
                    <Text key={i} style={[styles.starIcon, { color: i <= todayInsight.conviction_level! ? profile.accentColor : '#333333' }]}>
                      {i <= todayInsight.conviction_level! ? '★' : '☆'}
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
    backgroundColor: '#121212',
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
