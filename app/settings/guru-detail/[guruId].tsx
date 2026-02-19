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
  kostolany: {
    id: 'kostolany',
    fullName: '앙드레 코스톨라니 (André Kostolany)',
    org: '독립 투자자',
    emoji: '📈',
    accentColor: '#FFB74D',
    philosophy: '시장 사이클 투자 — 군중 심리를 역이용하는 달걀 모형입니다. 공황기에 매수하고 호황기에 매도하는 인내심이 최고의 수익을 만듭니다.',
    strategy: '공황기(달걀 바닥) → 전량 매수 → 호황기(달걀 꼭대기) → 전량 매도. 중간 과정은 무시. 수면제 전략: 사고 자고 나중에 부자로 깨어나라.',
    keyPrinciple: '"주식을 사고 수면제를 먹어라 — 몇 년 후에 깨어나 부자가 되어 있을 것이다." 인내심이 최고의 투자 전략.',
    track: '60년 투자 경력. 2차 세계대전 전후 독일 재건 수혜로 대부호 달성. 유럽 최고의 시장 예언자로 불림.',
    matchKeywords: ['코스톨라니', 'kostolany', 'kostolanyi'],
  },
};

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────

export default function GuruDetailScreen() {
  const router = useRouter();
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
          <Text style={styles.notFoundText}>프로필을 찾을 수 없습니다</Text>
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
  const sentimentColors: Record<string, string> = {
    BULLISH: '#4CAF50',
    BEARISH: '#CF6679',
    CAUTIOUS: '#FF9800',
    NEUTRAL: '#FFD700',
  };
  const sentimentLabels: Record<string, string> = {
    BULLISH: '강세',
    BEARISH: '약세',
    CAUTIOUS: '신중',
    NEUTRAL: '중립',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>거장 딥다이브</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* ── 히어로 카드 ── */}
        <View style={[styles.heroCard, { borderColor: profile.accentColor + '40' }]}>
          <View style={[styles.emojiCircle, { backgroundColor: profile.accentColor + '20', borderColor: profile.accentColor + '60' }]}>
            <Text style={styles.heroEmoji}>{profile.emoji}</Text>
          </View>
          <Text style={styles.heroName}>{profile.fullName}</Text>
          <Text style={styles.heroOrg}>{profile.org}</Text>

          {isMyPhilosophy && (
            <View style={[styles.myPhilosophyBadge, { backgroundColor: profile.accentColor + '20', borderColor: profile.accentColor }]}>
              <Ionicons name="checkmark-circle" size={14} color={profile.accentColor} />
              <Text style={[styles.myPhilosophyText, { color: profile.accentColor }]}>
                현재 선택된 철학
              </Text>
            </View>
          )}
        </View>

        {/* ── 철학 카드 ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>🎯</Text>
            <Text style={styles.cardTitle}>핵심 철학</Text>
          </View>
          <Text style={styles.cardBody}>{profile.philosophy}</Text>
        </View>

        {/* ── 전략 카드 ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>⚙️</Text>
            <Text style={styles.cardTitle}>투자 전략</Text>
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
            <Text style={styles.cardTitle}>실적 기록</Text>
          </View>
          <Text style={styles.cardBody}>{profile.track}</Text>
        </View>

        {/* ── 오늘의 인사이트 ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>🔴</Text>
            <Text style={styles.cardTitle}>오늘의 인사이트</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          {insightsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={profile.accentColor} />
              <Text style={styles.loadingText}>업데이트 중...</Text>
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
                  {sentimentLabels[todayInsight.sentiment] || '중립'} 포지션
                </Text>
              </View>

              {/* 최근 행동 */}
              <Text style={styles.insightLabel}>최근 행동</Text>
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
                  <Text style={styles.insightLabel}>AI 분석</Text>
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
                <Text style={styles.sourceText}>출처: {todayInsight.source}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.noInsightText}>
              오늘 인사이트가 아직 업데이트되지 않았습니다.{'\n'}매일 아침 7시에 자동 업데이트됩니다.
            </Text>
          )}
        </View>

        {/* ── 면책 조항 ── */}
        <View style={styles.disclaimer}>
          <Ionicons name="warning-outline" size={12} color="#555" />
          <Text style={styles.disclaimerText}>
            본 정보는 AI가 공개 데이터를 기반으로 생성한 교육 목적의 분석이며, 실제 거장의 공식 의견이 아닙니다. 투자 결정은 본인의 판단에 따라 이루어져야 합니다.
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
    fontSize: 17,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroOrg: {
    fontSize: 13,
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
    fontSize: 12,
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
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
  },
  cardBody: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  quoteBox: {
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
  },
  quoteText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    lineHeight: 20,
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
    fontSize: 10,
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
    fontSize: 13,
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
    fontSize: 12,
    fontWeight: '700',
  },
  insightLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  insightBody: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 21,
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
    fontSize: 12,
    fontWeight: '700',
  },
  sourceText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 10,
  },
  noInsightText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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
    fontSize: 15,
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
    fontSize: 10,
    color: '#555',
    lineHeight: 15,
  },
});
