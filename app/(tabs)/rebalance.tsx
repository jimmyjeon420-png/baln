/**
 * 처방전 화면 — "아침에 가장 먼저 보고 싶은 화면"
 *
 * 구조 (위→아래):
 * 1. 히어로: 내 자산 총액 + 전일 변동 (감정 즉시 해소)
 * 2. 시장 날씨: CFO 이모지 + 센티먼트 + 1줄 요약
 * 3. 오늘의 액션: BUY/SELL/WATCH (화면의 주인공)
 * 4. 리스크 대시보드: Panic + FOMO 요약 (위험 시만 강조)
 * 5. 비트코인 확신점수 (보유 시)
 * 6. 보유 자산 (접기 가능)
 * 7. 맞춤 전략 & 조언 (접기 가능)
 *
 * [성능 최적화] useSharedPortfolio + useSharedAnalysis + useSharedBitcoin 공유 훅 사용
 * → 탭 전환 시 0ms (TanStack Query 캐시), Gemini 병렬 호출
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DiagnosisSkeletonLoader, SkeletonBlock } from '../../src/components/SkeletonLoader';
import PanicShieldCard from '../../src/components/PanicShieldCard';
import FomoVaccineCard from '../../src/components/FomoVaccineCard';
import BitcoinConvictionCard from '../../src/components/BitcoinConvictionCard';
import KostolanyEggCard from '../../src/components/KostolanyEggCard';
import { KostolanyLogic } from '../../src/services/KostolanyLogic';
import { TIER_LABELS } from '../../src/hooks/useGatherings';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { useSharedAnalysis, useSharedBitcoin } from '../../src/hooks/useSharedAnalysis';
import { usePeerPanicScore, getAssetBracket } from '../../src/hooks/usePortfolioSnapshots';
import { TIER_STRATEGIES } from '../../src/constants/tierStrategy';

// 요일 이름
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 액션 색상
const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  BUY:   { bg: 'rgba(76,175,80,0.15)',  text: '#4CAF50', label: '매수' },
  SELL:  { bg: 'rgba(207,102,121,0.15)', text: '#CF6679', label: '매도' },
  HOLD:  { bg: 'rgba(136,136,136,0.15)', text: '#888888', label: '보유' },
  WATCH: { bg: 'rgba(255,193,7,0.15)',   text: '#FFC107', label: '주시' },
};

export default function RebalanceScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // 접기/펼치기 상태
  const [showMarketDetail, setShowMarketDetail] = useState(false);
  const [showRiskDetail, setShowRiskDetail] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);

  // 오늘의 액션: 확장된 항목 인덱스 (null = 모두 접힘)
  const [expandedActionIdx, setExpandedActionIdx] = useState<number | null>(null);

  // [성능 최적화] 공유 훅: 3개 탭이 같은 캐시 사용 → 탭 전환 시 0ms
  const {
    portfolioAssets: portfolio,
    totalAssets,
    userTier,
    isLoading: portfolioLoading,
    isFetched: initialCheckDone,
    hasAssets,
    refresh: refreshPortfolio,
  } = useSharedPortfolio();

  // [성능 최적화] AI 분석 공유: Morning Briefing + Risk Analysis 병렬 실행
  const {
    morningBriefing,
    riskAnalysis: analysisResult,
    isFetched: analysisReady,
    refresh: refreshAnalysis,
  } = useSharedAnalysis(portfolio);

  // 비트코인 인텔리전스 (선택적, 별도 쿼리)
  const { data: bitcoinIntelligence } = useSharedBitcoin();

  // 또래 비교: 내 자산 구간의 Panic Shield 평균 점수
  const myBracket = getAssetBracket(totalAssets);
  const { data: peerPanicData } = usePeerPanicScore(myBracket);

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshPortfolio(), refreshAnalysis()]);
    setRefreshing(false);
  };

  // ══════════════════════════════════════════
  // 로딩 / 빈 상태 / 에러
  // ══════════════════════════════════════════

  const analysisFailed = analysisReady && hasAssets && !morningBriefing && !analysisResult;
  // 포트폴리오만 기다림 (AI 분석은 기다리지 않음 → 점진적 로딩)
  const isPortfolioLoading = !initialCheckDone || portfolioLoading;
  const isAILoading = hasAssets && !analysisReady;

  if (isPortfolioLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ScrollView><DiagnosisSkeletonLoader /></ScrollView>
      </SafeAreaView>
    );
  }

  if (initialCheckDone && totalAssets === 0 && portfolio.length === 0) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.emptyContainer}>
          <View style={s.emptyIcon}>
            <Ionicons name="scan-outline" size={48} color="#4CAF50" />
          </View>
          <Text style={s.emptyTitle}>포트폴리오를 등록해주세요</Text>
          <Text style={s.emptyDesc}>
            보유 자산을 등록하시면{'\n'}
            <Text style={{ color: '#4CAF50', fontWeight: '700' }}>매일 아침 맞춤 브리핑</Text>을 받아보실 수 있습니다
          </Text>
          <TouchableOpacity style={s.emptyButton} onPress={() => router.push('/add-asset')}>
            <Ionicons name="add-circle" size={20} color="#000" />
            <Text style={s.emptyButtonText}>자산 등록하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════
  // 파생 데이터 계산
  // ══════════════════════════════════════════

  const now = new Date();
  const dateString = `${now.getMonth() + 1}월 ${now.getDate()}일 (${DAY_NAMES[now.getDay()]})`;

  const snapshot = analysisResult?.portfolioSnapshot;
  const totalGainLoss = snapshot?.totalGainLoss ?? 0;
  const gainPercent = snapshot?.gainLossPercent ?? 0;
  const isPositive = totalGainLoss >= 0;

  const sentiment = morningBriefing?.macroSummary.marketSentiment ?? 'NEUTRAL';
  const sentimentColor = sentiment === 'BULLISH' ? '#4CAF50' : sentiment === 'BEARISH' ? '#CF6679' : '#FFC107';
  const sentimentLabel = sentiment === 'BULLISH' ? '낙관' : sentiment === 'BEARISH' ? '비관' : '중립';

  const tierStrategy = TIER_STRATEGIES[userTier];

  // 액션 우선순위 정렬: HIGH → MEDIUM → LOW, SELL/WATCH → BUY → HOLD
  const sortedActions = [...(morningBriefing?.portfolioActions ?? [])].sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const actionOrder: Record<string, number> = { SELL: 0, WATCH: 1, BUY: 2, HOLD: 3 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return (actionOrder[a.action] ?? 3) - (actionOrder[b.action] ?? 3);
  });

  // 코스톨라니 달걀 분석 (morningBriefing 금리 데이터 기반)
  const eggAnalysis = useMemo(() => {
    if (!morningBriefing) return null;
    const logic = KostolanyLogic.getInstance();
    return logic.analyzeFromBriefing({
      interestRateProbability: morningBriefing.macroSummary.interestRateProbability,
      marketSentiment: morningBriefing.macroSummary.marketSentiment,
    });
  }, [morningBriefing]);

  // FOMO 경고 중 HIGH 개수
  const highFomoCount = analysisResult?.fomoAlerts.filter(a => a.severity === 'HIGH').length ?? 0;
  const panicLevel = analysisResult?.panicShieldLevel ?? 'SAFE';
  const panicIndex = analysisResult?.panicShieldIndex ?? 0;

  // ══════════════════════════════════════════
  // 렌더
  // ══════════════════════════════════════════

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
      >

        {/* ─── 1. 히어로: 내 자산 현황 ─── */}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <Text style={s.heroDate}>{dateString}</Text>
            <View style={[s.tierChip, { backgroundColor: tierStrategy.color + '20' }]}>
              <Text style={[s.tierChipText, { color: tierStrategy.color }]}>{TIER_LABELS[userTier]}</Text>
            </View>
          </View>

          <Text style={s.heroAmount}>₩{totalAssets.toLocaleString()}</Text>

          <View style={s.heroChangeRow}>
            <View style={[s.heroChangeBadge, { backgroundColor: isPositive ? 'rgba(76,175,80,0.12)' : 'rgba(207,102,121,0.12)' }]}>
              <Ionicons
                name={isPositive ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={isPositive ? '#4CAF50' : '#CF6679'}
              />
              <Text style={[s.heroChangeText, { color: isPositive ? '#4CAF50' : '#CF6679' }]}>
                {isPositive ? '+' : ''}₩{Math.abs(totalGainLoss).toLocaleString()}
              </Text>
              <Text style={[s.heroChangePercent, { color: isPositive ? '#4CAF50' : '#CF6679' }]}>
                ({isPositive ? '+' : ''}{gainPercent.toFixed(2)}%)
              </Text>
            </View>
          </View>

          {/* CFO 한줄 코멘트 */}
          {morningBriefing?.cfoWeather && (
            <View style={s.cfoLine}>
              <Text style={s.cfoEmoji}>{morningBriefing.cfoWeather.emoji}</Text>
              <Text style={s.cfoMessage} numberOfLines={2}>{morningBriefing.cfoWeather.message}</Text>
            </View>
          )}
        </View>

        {/* ─── AI 분석 로딩 인디케이터 ─── */}
        {isAILoading && (
          <View style={s.aiLoadingBanner}>
            <View style={s.aiLoadingDot} />
            <Text style={s.aiLoadingText}>AI가 시장을 분석하고 있습니다...</Text>
          </View>
        )}

        {/* ─── AI 분석 실패 ─── */}
        {analysisFailed && (
          <View style={s.aiErrorBanner}>
            <Ionicons name="alert-circle" size={16} color="#CF6679" />
            <Text style={s.aiErrorText}>AI 분석 실패</Text>
            <TouchableOpacity onPress={onRefresh} style={s.aiRetryButton}>
              <Text style={s.aiRetryText}>재시도</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── 2. 시장 날씨 ─── */}
        {morningBriefing && (
          <View style={s.card}>
            <View style={s.marketHeader}>
              <View style={s.marketLeft}>
                <Text style={s.cardLabel}>시장 날씨</Text>
                <Text style={s.cardLabelEn}>Market Sentiment</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[s.sentimentChip, { backgroundColor: sentimentColor + '20' }]}>
                  <View style={[s.sentimentDot, { backgroundColor: sentimentColor }]} />
                  <Text style={[s.sentimentText, { color: sentimentColor }]}>{sentimentLabel}</Text>
                </View>
                <TouchableOpacity
                  style={s.expandButton}
                  onPress={() => setShowMarketDetail(!showMarketDetail)}
                >
                  <Text style={s.expandButtonText}>{showMarketDetail ? '접기' : '상세'}</Text>
                  <Ionicons name={showMarketDetail ? 'chevron-up' : 'chevron-down'} size={14} color="#888" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 매크로 요약 제목 */}
            {morningBriefing.macroSummary.title && (
              <Text style={s.marketTitle}>{morningBriefing.macroSummary.title}</Text>
            )}

            {/* 매크로 하이라이트 (접힌 상태: 3개, 펼친 상태: 전체) */}
            <View style={s.highlights}>
              {(showMarketDetail
                ? morningBriefing.macroSummary.highlights
                : morningBriefing.macroSummary.highlights.slice(0, 3)
              ).map((h, i) => (
                <View key={i} style={s.highlightRow}>
                  <Text style={s.highlightDot}>•</Text>
                  <Text style={s.highlightText} numberOfLines={showMarketDetail ? undefined : 2}>{h}</Text>
                </View>
              ))}
            </View>

            {/* 금리 전망 */}
            {morningBriefing.macroSummary.interestRateProbability && (
              <View style={s.rateBadge}>
                <Ionicons name="trending-up" size={12} color="#FFC107" />
                <Text style={s.rateText} numberOfLines={showMarketDetail ? undefined : 1}>
                  {morningBriefing.macroSummary.interestRateProbability}
                </Text>
              </View>
            )}

            {/* ─── 상세 펼침 영역 ─── */}
            {showMarketDetail && (
              <View style={s.marketDetailContainer}>
                {/* 부동산 인사이트 (있으면 표시) */}
                {morningBriefing.realEstateInsight && (
                  <View style={s.realEstateSection}>
                    <View style={s.realEstateHeader}>
                      <Ionicons name="home" size={14} color="#64B5F6" />
                      <Text style={s.realEstateTitle}>{morningBriefing.realEstateInsight.title}</Text>
                    </View>
                    <Text style={s.realEstateAnalysis}>{morningBriefing.realEstateInsight.analysis}</Text>
                    <View style={s.realEstateRecBadge}>
                      <Ionicons name="bulb" size={12} color="#4CAF50" />
                      <Text style={s.realEstateRecText}>{morningBriefing.realEstateInsight.recommendation}</Text>
                    </View>
                  </View>
                )}

                {/* CFO 날씨 상세 */}
                <View style={s.cfoDetailSection}>
                  <View style={s.cfoDetailHeader}>
                    <Text style={s.cfoDetailEmoji}>{morningBriefing.cfoWeather.emoji}</Text>
                    <Text style={s.cfoDetailStatus}>{morningBriefing.cfoWeather.status}</Text>
                  </View>
                  <Text style={s.cfoDetailMessage}>{morningBriefing.cfoWeather.message}</Text>
                </View>

                {/* 생성 시간 */}
                <Text style={s.marketDetailTime}>
                  분석 시간: {new Date(morningBriefing.generatedAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}

            {/* 접힌 상태에서 "더보기" 힌트 */}
            {!showMarketDetail && morningBriefing.macroSummary.highlights.length > 3 && (
              <TouchableOpacity
                style={s.showMoreHint}
                onPress={() => setShowMarketDetail(true)}
              >
                <Text style={s.showMoreHintText}>
                  +{morningBriefing.macroSummary.highlights.length - 3}개 항목 더보기
                </Text>
                <Ionicons name="chevron-down" size={12} color="#4CAF50" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* AI 로딩 중 시장 날씨 스켈레톤 */}
        {isAILoading && !morningBriefing && (
          <View style={s.card}>
            <SkeletonBlock width={100} height={16} />
            <View style={{ marginTop: 12, gap: 8 }}>
              <SkeletonBlock width="90%" height={14} />
              <SkeletonBlock width="75%" height={14} />
              <SkeletonBlock width="80%" height={14} />
            </View>
          </View>
        )}

        {/* ─── 2.5. 금리 사이클 나침반 (코스톨라니 달걀) ─── */}
        {eggAnalysis && (
          <KostolanyEggCard
            analysis={eggAnalysis}
            interestRateText={morningBriefing?.macroSummary.interestRateProbability}
          />
        )}

        {/* AI 로딩 중 달걀 스켈레톤 */}
        {isAILoading && !eggAnalysis && (
          <View style={s.card}>
            <SkeletonBlock width={140} height={16} />
            <View style={{ marginTop: 14, flexDirection: 'row', gap: 12 }}>
              <SkeletonBlock width={150} height={120} style={{ borderRadius: 12 }} />
              <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
                <SkeletonBlock width={80} height={14} />
                <SkeletonBlock width="100%" height={14} />
                <SkeletonBlock width={100} height={28} style={{ borderRadius: 8 }} />
              </View>
            </View>
          </View>
        )}

        {/* ─── 3. 오늘의 액션 (주인공) ─── */}
        {sortedActions.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View>
                <Text style={s.cardLabel}>오늘의 액션</Text>
                <Text style={s.cardLabelEn}>Today's Actions</Text>
              </View>
              <View style={s.actionCount}>
                <Text style={s.actionCountText}>{sortedActions.length}건</Text>
              </View>
            </View>

            {sortedActions.slice(0, 5).map((action, idx) => {
              const ac = ACTION_COLORS[action.action] || ACTION_COLORS.HOLD;
              const isHighPriority = action.priority === 'HIGH';
              const isExpanded = expandedActionIdx === idx;

              // 포트폴리오에서 해당 종목 찾기 (보유 현황 표시용)
              const matchedAsset = portfolio.find(
                a => a.ticker.toUpperCase() === action.ticker.toUpperCase()
              );
              const assetGl = matchedAsset && matchedAsset.avgPrice > 0
                ? ((matchedAsset.currentPrice - matchedAsset.avgPrice) / matchedAsset.avgPrice) * 100
                : null;
              const assetWeight = matchedAsset && totalAssets > 0
                ? ((matchedAsset.currentValue / totalAssets) * 100).toFixed(1)
                : null;

              // 우선순위 라벨 & 색상
              const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
                HIGH:   { label: '긴급', color: '#CF6679', bg: 'rgba(207,102,121,0.12)' },
                MEDIUM: { label: '보통', color: '#FFC107', bg: 'rgba(255,193,7,0.12)' },
                LOW:    { label: '참고', color: '#888888', bg: 'rgba(136,136,136,0.12)' },
              };
              const pc = priorityConfig[action.priority] || priorityConfig.LOW;

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => setExpandedActionIdx(isExpanded ? null : idx)}
                  style={[
                    s.actionItem,
                    isHighPriority && { borderLeftWidth: 3, borderLeftColor: ac.text },
                    isExpanded && s.actionItemExpanded,
                  ]}
                >
                  {/* 상단: 액션 뱃지 + 종목명 + 펼침 화살표 */}
                  <View style={s.actionTop}>
                    <View style={[s.actionBadge, { backgroundColor: ac.bg }]}>
                      <Text style={[s.actionBadgeText, { color: ac.text }]}>{ac.label}</Text>
                    </View>
                    <Text style={s.actionTicker}>{action.ticker}</Text>
                    <Text style={s.actionName} numberOfLines={1}>{action.name}</Text>
                    {isHighPriority && (
                      <View style={s.urgentDot}>
                        <Text style={s.urgentDotText}>!</Text>
                      </View>
                    )}
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color="#555"
                    />
                  </View>

                  {/* 접힌 상태: 사유 2줄 미리보기 */}
                  {!isExpanded && (
                    <Text style={s.actionReason} numberOfLines={2}>{action.reason}</Text>
                  )}

                  {/* ─── 펼친 상태: 상세 정보 ─── */}
                  {isExpanded && (
                    <View style={s.actionDetail}>
                      {/* 우선순위 뱃지 */}
                      <View style={[s.actionPriorityBadge, { backgroundColor: pc.bg }]}>
                        <View style={[s.actionPriorityDot, { backgroundColor: pc.color }]} />
                        <Text style={[s.actionPriorityText, { color: pc.color }]}>
                          우선순위: {pc.label}
                        </Text>
                      </View>

                      {/* 전체 사유 (줄수 제한 없음) */}
                      <View style={s.actionReasonFull}>
                        <Ionicons name="chatbubble-outline" size={13} color="#666" />
                        <Text style={s.actionReasonFullText}>{action.reason}</Text>
                      </View>

                      {/* 내 보유 현황 (해당 종목이 포트폴리오에 있을 때만) */}
                      {matchedAsset && (
                        <View style={s.actionPortfolioInfo}>
                          <Text style={s.actionPortfolioTitle}>내 보유 현황</Text>
                          <View style={s.actionPortfolioRow}>
                            <View style={s.actionPortfolioItem}>
                              <Text style={s.actionPortfolioLabel}>현재가</Text>
                              <Text style={s.actionPortfolioValue}>
                                ₩{matchedAsset.currentPrice.toLocaleString()}
                              </Text>
                            </View>
                            <View style={s.actionPortfolioDivider} />
                            <View style={s.actionPortfolioItem}>
                              <Text style={s.actionPortfolioLabel}>수익률</Text>
                              <Text style={[
                                s.actionPortfolioValue,
                                { color: (assetGl ?? 0) >= 0 ? '#4CAF50' : '#CF6679' },
                              ]}>
                                {(assetGl ?? 0) >= 0 ? '+' : ''}{(assetGl ?? 0).toFixed(1)}%
                              </Text>
                            </View>
                            <View style={s.actionPortfolioDivider} />
                            <View style={s.actionPortfolioItem}>
                              <Text style={s.actionPortfolioLabel}>비중</Text>
                              <Text style={s.actionPortfolioValue}>{assetWeight}%</Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* AI 딥다이브 바로가기 */}
                      <TouchableOpacity
                        style={s.actionDeepDiveBtn}
                        activeOpacity={0.7}
                        onPress={() => router.push({
                          pathname: '/marketplace',
                          params: { ticker: action.ticker, feature: 'deep_dive' },
                        })}
                      >
                        <Ionicons name="sparkles" size={14} color="#7C4DFF" />
                        <Text style={s.actionDeepDiveText}>AI 딥다이브 분석 보기</Text>
                        <Ionicons name="chevron-forward" size={14} color="#7C4DFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* AI 로딩 중 액션 스켈레톤 */}
        {isAILoading && sortedActions.length === 0 && (
          <View style={s.card}>
            <SkeletonBlock width={120} height={16} />
            <View style={{ marginTop: 12, gap: 8 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14 }}>
                  <SkeletonBlock width={60} height={14} style={{ marginBottom: 6 }} />
                  <SkeletonBlock width="85%" height={12} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── 4. 리스크 대시보드 (요약) ─── */}
        {analysisResult && (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View>
                <Text style={s.cardLabel}>리스크 체크</Text>
                <Text style={s.cardLabelEn}>Risk Dashboard</Text>
              </View>
              <TouchableOpacity
                style={s.expandButton}
                onPress={() => setShowRiskDetail(!showRiskDetail)}
              >
                <Text style={s.expandButtonText}>{showRiskDetail ? '접기' : '상세'}</Text>
                <Ionicons name={showRiskDetail ? 'chevron-up' : 'chevron-down'} size={14} color="#888" />
              </TouchableOpacity>
            </View>

            {/* 요약 2줄 */}
            <View style={s.riskSummaryRow}>
              {/* Panic Shield 요약 */}
              <View style={[s.riskSummaryItem, { backgroundColor: panicLevel === 'DANGER' ? 'rgba(207,102,121,0.08)' : panicLevel === 'CAUTION' ? 'rgba(255,193,7,0.08)' : 'rgba(76,175,80,0.08)' }]}>
                <Ionicons name="shield" size={18} color={panicLevel === 'DANGER' ? '#CF6679' : panicLevel === 'CAUTION' ? '#FFC107' : '#4CAF50'} />
                <View style={s.riskSummaryText}>
                  <Text style={s.riskSummaryLabel}>Panic Shield</Text>
                  <Text style={[s.riskSummaryValue, { color: panicLevel === 'DANGER' ? '#CF6679' : panicLevel === 'CAUTION' ? '#FFC107' : '#4CAF50' }]}>
                    {panicIndex}/100 {panicLevel === 'SAFE' ? '안전' : panicLevel === 'CAUTION' ? '주의' : '위험'}
                  </Text>
                </View>
              </View>

              {/* FOMO Vaccine 요약 */}
              <View style={[s.riskSummaryItem, { backgroundColor: highFomoCount > 0 ? 'rgba(207,102,121,0.08)' : 'rgba(76,175,80,0.08)' }]}>
                <Ionicons name="medical" size={18} color={highFomoCount > 0 ? '#CF6679' : '#4CAF50'} />
                <View style={s.riskSummaryText}>
                  <Text style={s.riskSummaryLabel}>FOMO Vaccine</Text>
                  <Text style={[s.riskSummaryValue, { color: highFomoCount > 0 ? '#CF6679' : '#4CAF50' }]}>
                    {highFomoCount > 0 ? `경고 ${analysisResult.fomoAlerts.length}건` : '경고 없음'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 상세 펼침: 기존 PanicShieldCard + FomoVaccineCard */}
            {showRiskDetail && (
              <View style={s.riskDetailContainer}>
                <PanicShieldCard
                  index={analysisResult.panicShieldIndex}
                  level={analysisResult.panicShieldLevel}
                  stopLossGuidelines={analysisResult.stopLossGuidelines}
                  subScores={analysisResult.panicSubScores}
                  peerComparison={peerPanicData}
                />
                <FomoVaccineCard alerts={analysisResult.fomoAlerts} />
              </View>
            )}
          </View>
        )}

        {/* ─── 5. Bitcoin Conviction Score ─── */}
        {bitcoinIntelligence && (
          <BitcoinConvictionCard data={bitcoinIntelligence} />
        )}

        {/* ─── 6. 보유 자산 (접기/펼치기) ─── */}
        <TouchableOpacity
          style={s.collapsibleHeader}
          onPress={() => setShowAssets(!showAssets)}
          activeOpacity={0.7}
        >
          <View style={s.collapsibleLeft}>
            <Ionicons name="pie-chart-outline" size={16} color="#4CAF50" />
            <Text style={s.collapsibleTitle}>보유 자산</Text>
            <Text style={s.collapsibleCount}>{portfolio.length}개</Text>
          </View>
          <Ionicons name={showAssets ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
        </TouchableOpacity>

        {showAssets && (
          <View style={s.collapsibleBody}>
            {/* 포트폴리오 스냅샷 */}
            {snapshot && (
              <View style={s.snapshotRow}>
                <View style={s.snapshotItem}>
                  <Text style={s.snapshotLabel}>총 손익</Text>
                  <Text style={[s.snapshotValue, { color: isPositive ? '#4CAF50' : '#CF6679' }]}>
                    {isPositive ? '+' : ''}₩{totalGainLoss.toLocaleString()}
                  </Text>
                </View>
                <View style={s.snapshotDivider} />
                <View style={s.snapshotItem}>
                  <Text style={s.snapshotLabel}>분산 점수</Text>
                  <Text style={s.snapshotValue}>{snapshot.diversificationScore}/100</Text>
                </View>
              </View>
            )}

            {/* 종목 리스트 */}
            {portfolio.map((asset, idx) => {
              const gl = asset.avgPrice > 0 ? ((asset.currentPrice - asset.avgPrice) / asset.avgPrice) * 100 : 0;
              const glPositive = gl >= 0;
              const weight = totalAssets > 0 ? ((asset.currentValue / totalAssets) * 100).toFixed(1) : '0';
              return (
                <View key={idx} style={s.assetItem}>
                  <View style={s.assetLeft}>
                    <View style={s.assetIcon}>
                      <Text style={s.assetIconText}>{asset.ticker[0]}</Text>
                    </View>
                    <View>
                      <Text style={s.assetTicker}>{asset.ticker}</Text>
                      <Text style={s.assetName}>{asset.name}</Text>
                    </View>
                  </View>
                  <View style={s.assetRight}>
                    <Text style={s.assetWeight}>{weight}%</Text>
                    <Text style={[s.assetGain, { color: glPositive ? '#4CAF50' : '#CF6679' }]}>
                      {glPositive ? '+' : ''}{gl.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ─── 7. 맞춤 전략 (배너 카드 → 상세 페이지) ─── */}
        <TouchableOpacity
          style={[s.strategyBanner, { borderColor: tierStrategy.color + '30' }]}
          onPress={() => router.push('/tier-strategy')}
          activeOpacity={0.7}
        >
          <View style={[s.strategyBannerIcon, { backgroundColor: tierStrategy.color + '15' }]}>
            <Ionicons name="bulb" size={20} color={tierStrategy.color} />
          </View>
          <View style={s.strategyBannerText}>
            <Text style={s.strategyBannerLabel}>{TIER_LABELS[userTier]} 맞춤 전략</Text>
            <Text style={[s.strategyBannerTitle, { color: tierStrategy.color }]}>{tierStrategy.title}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#666" />
        </TouchableOpacity>

        {/* ─── 8. AI 맞춤 조언 (접기/펼치기) ─── */}
        {analysisResult && analysisResult.personalizedAdvice.length > 0 && (
          <>
            <TouchableOpacity
              style={s.collapsibleHeader}
              onPress={() => setShowAdvice(!showAdvice)}
              activeOpacity={0.7}
            >
              <View style={s.collapsibleLeft}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#4CAF50" />
                <Text style={s.collapsibleTitle}>AI 맞춤 조언</Text>
                <Text style={s.collapsibleCount}>{analysisResult.personalizedAdvice.length}건</Text>
              </View>
              <Ionicons name={showAdvice ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
            </TouchableOpacity>

            {showAdvice && (
              <View style={s.collapsibleBody}>
                {analysisResult.personalizedAdvice.map((advice, idx) => (
                  <View key={idx} style={s.adviceItem}>
                    <View style={s.adviceNumber}>
                      <Text style={s.adviceNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={s.adviceText}>{advice}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ─── 9. AI 프리미엄 마켓플레이스 배너 ─── */}
        <TouchableOpacity
          style={s.marketplaceBanner}
          onPress={() => router.push('/marketplace')}
          activeOpacity={0.7}
        >
          <View style={s.marketplaceBannerLeft}>
            <Ionicons name="sparkles" size={20} color="#7C4DFF" />
            <View>
              <Text style={s.marketplaceBannerTitle}>AI 프리미엄 마켓</Text>
              <Text style={s.marketplaceBannerDesc}>종목 딥다이브 · What-If · 세금 리포트 · AI CFO</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#666" />
        </TouchableOpacity>

        {/* ─── 면책 문구 ─── */}
        <View style={s.disclaimerBox}>
          <Text style={s.disclaimer}>
            본 서비스는 금융위원회에 등록된 투자자문업·투자일임업이 아니며, 제공되는 정보는 투자 권유가 아닙니다. AI 분석 결과는 과거 데이터 기반이며 미래 수익을 보장하지 않습니다. 투자 원금의 일부 또는 전부를 잃을 수 있으며, 투자 결정은 전적으로 본인의 판단과 책임 하에 이루어져야 합니다. 본 서비스는 예금자보호법에 따른 보호 대상이 아닙니다.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scroll: {
    paddingBottom: 100,
  },

  // ── 히어로 ──
  hero: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tierChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tierChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 6,
  },
  heroChangeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  heroChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  heroChangeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroChangePercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  cfoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76,175,80,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.08)',
  },
  cfoEmoji: {
    fontSize: 20,
    marginTop: -2,
  },
  cfoMessage: {
    flex: 1,
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 20,
    fontWeight: '500',
  },

  // ── 카드 공통 ──
  card: {
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardLabelEn: {
    fontSize: 10,
    color: '#555',
    marginTop: 1,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  // ── 시장 날씨 ──
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  marketLeft: {},
  sentimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  sentimentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  highlights: {
    gap: 6,
    marginBottom: 10,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  highlightDot: {
    color: '#4CAF50',
    fontSize: 13,
    lineHeight: 20,
  },
  highlightText: {
    flex: 1,
    fontSize: 13,
    color: '#BBB',
    lineHeight: 20,
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,193,7,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  rateText: {
    fontSize: 12,
    color: '#FFC107',
    fontWeight: '500',
    flex: 1,
  },
  // ── 시장 날씨 상세 ──
  marketTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DDD',
    marginBottom: 10,
  },
  marketDetailContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#222',
    gap: 14,
  },
  realEstateSection: {
    backgroundColor: 'rgba(100,181,246,0.06)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(100,181,246,0.1)',
  },
  realEstateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  realEstateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64B5F6',
  },
  realEstateAnalysis: {
    fontSize: 13,
    color: '#BBB',
    lineHeight: 20,
    marginBottom: 10,
  },
  realEstateRecBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  realEstateRecText: {
    flex: 1,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    lineHeight: 18,
  },
  cfoDetailSection: {
    backgroundColor: 'rgba(76,175,80,0.06)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.08)',
  },
  cfoDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cfoDetailEmoji: {
    fontSize: 20,
  },
  cfoDetailStatus: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  cfoDetailMessage: {
    fontSize: 13,
    color: '#CCC',
    lineHeight: 20,
  },
  marketDetailTime: {
    fontSize: 11,
    color: '#555',
    textAlign: 'right',
  },
  showMoreHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 4,
  },
  showMoreHintText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },

  // ── 오늘의 액션 ──
  actionCount: {
    backgroundColor: 'rgba(76,175,80,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  actionCountText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  actionItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  actionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionTicker: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionName: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  urgentDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CF6679',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentDotText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  actionReason: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },

  // ── 액션 상세 (펼침) ──
  actionItemExpanded: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
  },
  actionDetail: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    gap: 10,
  },
  actionPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  actionPriorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionPriorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionReasonFull: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 10,
  },
  actionReasonFullText: {
    flex: 1,
    fontSize: 13,
    color: '#CCC',
    lineHeight: 20,
  },
  actionPortfolioInfo: {
    backgroundColor: 'rgba(76,175,80,0.06)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.1)',
  },
  actionPortfolioTitle: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    marginBottom: 8,
  },
  actionPortfolioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPortfolioItem: {
    flex: 1,
    alignItems: 'center',
  },
  actionPortfolioDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(76,175,80,0.15)',
  },
  actionPortfolioLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 3,
  },
  actionPortfolioValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  actionDeepDiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,77,255,0.08)',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(124,77,255,0.15)',
  },
  actionDeepDiveText: {
    fontSize: 12,
    color: '#7C4DFF',
    fontWeight: '600',
  },

  // ── 리스크 대시보드 ──
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandButtonText: {
    fontSize: 12,
    color: '#888',
  },
  riskSummaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  riskSummaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  riskSummaryText: {},
  riskSummaryLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  riskSummaryValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  riskDetailContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },

  // ── 접기/펼치기 공통 ──
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#141414',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  collapsibleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsibleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  collapsibleCount: {
    fontSize: 12,
    color: '#666',
  },
  collapsibleBody: {
    marginHorizontal: 16,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    marginTop: -4,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },

  // ── 포트폴리오 스냅샷 ──
  snapshotRow: {
    flexDirection: 'row',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  snapshotItem: {
    flex: 1,
    alignItems: 'center',
  },
  snapshotDivider: {
    width: 1,
    backgroundColor: '#222',
  },
  snapshotLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  snapshotValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── 보유 자산 ──
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  assetIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  assetTicker: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  assetName: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetWeight: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAA',
  },
  assetGain: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // ── 맞춤 전략 배너 ──
  strategyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  strategyBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strategyBannerText: {
    flex: 1,
  },
  strategyBannerLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  strategyBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },

  // ── AI 조언 ──
  adviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  adviceNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adviceNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    color: '#BBB',
    lineHeight: 20,
  },

  // ── 빈 상태 ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(76,175,80,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 28,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },

  // ── AI 로딩 배너 ──
  aiLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.06)',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.1)',
  },
  aiLoadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  aiLoadingText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  aiErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(207,102,121,0.06)',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,102,121,0.1)',
  },
  aiErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#CF6679',
    fontWeight: '500',
  },
  aiRetryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(207,102,121,0.15)',
  },
  aiRetryText: {
    fontSize: 12,
    color: '#CF6679',
    fontWeight: '600',
  },

  // ── 면책 ──
  disclaimerBox: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  disclaimer: {
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── AI 프리미엄 마켓플레이스 배너 ──
  marketplaceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7C4DFF30',
  },
  marketplaceBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  marketplaceBannerTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  marketplaceBannerDesc: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
});
