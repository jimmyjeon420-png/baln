/**
 * AI 진단 화면 - Panic Shield & FOMO Vaccine
 * 행동재무학 기반 포트폴리오 리스크 분석
 * 티어별 맞춤 처방 제공
 *
 * [성능 최적화] useSharedPortfolio + useSharedAnalysis 공유 훅 사용
 * → 탭 전환 시 0ms (TanStack Query 캐시), Gemini 병렬 호출
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PanicShieldCard from '../../src/components/PanicShieldCard';
import FomoVaccineCard from '../../src/components/FomoVaccineCard';
import { DiagnosisSkeletonLoader } from '../../src/components/SkeletonLoader';
import ShareableCard from '../../src/components/ShareableCard';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useDailyCheckIn } from '../../src/hooks/useRewards';
import {
  TIER_LABELS,
  TIER_DESCRIPTIONS,
} from '../../src/hooks/useGatherings';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { useSharedAnalysis } from '../../src/hooks/useSharedAnalysis';
import { useTheme } from '../../src/hooks/useTheme';
import { usePeerPanicScore, getAssetBracket } from '../../src/hooks/usePortfolioSnapshots';
import { TIER_STRATEGIES } from '../../src/constants/tierStrategy';
import FreePeriodBanner from '../../src/components/FreePeriodBanner';
import { isFreePeriod } from '../../src/config/freePeriod';

export default function DiagnosisScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const { mediumTap } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);

  // 매일 출석 체크 (진단 탭 진입 시 자동 실행)
  const { checkedIn, streak, checkIn } = useDailyCheckIn();
  const [checkInToast, setCheckInToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const checkInTriggered = useRef(false);

  useEffect(() => {
    if (checkedIn || checkInTriggered.current) return;
    checkInTriggered.current = true;

    checkIn().then((result) => {
      if (result.success) {
        const streakText = result.newStreak > 1 ? ` (${result.newStreak}일 연속!)` : '';
        const freeNote = isFreePeriod() ? ' → 6월 이후 사용 가능' : '';
        setCheckInToast(`출석 완료! +${result.creditsEarned} 크레딧${streakText}${freeNote}`);
        // 페이드인 → 3초 후 페이드아웃
        Animated.sequence([
          Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(3000),
          Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setCheckInToast(null));
      }
    });
  }, [checkedIn]);

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

  // 또래 비교: 내 자산 구간의 Panic Shield 평균 점수
  const myBracket = getAssetBracket(totalAssets);
  const { data: peerPanicData } = usePeerPanicScore(myBracket);

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshPortfolio(), refreshAnalysis()]);
    setRefreshing(false);
  };

  // [점진적 로딩] 포트폴리오만 기다림 (100ms), AI 분석(3-8초)은 인라인 로딩
  const analysisFailed = analysisReady && hasAssets && !morningBriefing && !analysisResult;
  const isAILoading = hasAssets && !analysisReady;

  // Phase 1: 포트폴리오 DB 확인 전 → 전체 스켈레톤 (100ms 이내)
  if (!initialCheckDone || portfolioLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <ScrollView>
          <DiagnosisSkeletonLoader />
        </ScrollView>
      </SafeAreaView>
    );
  }
  // Phase 2: 포트폴리오 로드됨 → 헤더+전략 즉시 표시, AI 섹션은 인라인 로딩

  // 빈 포트폴리오 상태
  if (initialCheckDone && totalAssets === 0 && portfolio.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI 진단</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>맞춤형 투자 처방을 받아보세요</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="document-text-outline" size={64} color="#4CAF50" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>자산을 등록해주세요</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            보유 자산을 등록하시면{'\n'}
            <Text style={[styles.emptyHighlight, { color: colors.textPrimary }]}>당신만을 위한 맞춤 처방전</Text>을{'\n'}
            AI가 분석해드립니다.
          </Text>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/add-asset')}
          >
            <Ionicons name="add-circle" size={20} color="#000000" />
            <Text style={styles.registerButtonText}>자산 등록하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 에러 상태: 분석 완료되었지만 결과 없음
  if (analysisFailed) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI 진단</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#CF6679" />
          <Text style={styles.errorText}>AI 분석 중 오류가 발생했습니다.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tierStrategy = TIER_STRATEGIES[userTier];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* 출석 체크 토스트 */}
      {checkInToast && (
        <Animated.View style={[styles.checkInToast, { opacity: toastOpacity }]}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.checkInToastText}>{checkInToast}</Text>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
      >
        {/* 무료 기간 프로모션 배너 */}
        <FreePeriodBanner compact={false} />

        {/* 헤더 - 티어 정보 포함 */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI 진단</Text>
            <View style={[styles.tierBadge, { backgroundColor: tierStrategy.color + '30' }]}>
              <Ionicons
                name={userTier === 'DIAMOND' ? 'diamond' : userTier === 'PLATINUM' ? 'star' : userTier === 'GOLD' ? 'trophy' : 'medal'}
                size={14}
                color={tierStrategy.color}
              />
              <Text style={[styles.tierBadgeText, { color: tierStrategy.color }]}>
                {TIER_LABELS[userTier]}
              </Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {TIER_DESCRIPTIONS[userTier]} 회원 맞춤 처방
          </Text>
        </View>

        {/* AI 분석 인라인 로딩 (포트폴리오는 이미 표시, AI만 대기) */}
        {isAILoading && (
          <View style={[styles.aiLoadingBanner, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm]}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <View style={styles.aiLoadingTextWrap}>
              <Text style={[styles.aiLoadingTitle, { color: colors.textPrimary }]}>AI가 포트폴리오를 분석하고 있어요</Text>
              <Text style={[styles.aiLoadingDesc, { color: colors.textSecondary }]}>
                시장 데이터를 수집하고 맞춤 처방전을 준비 중입니다...
              </Text>
            </View>
          </View>
        )}

        {/* Morning Briefing 카드 */}
        {morningBriefing && (
          <View style={[styles.briefingCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.md]}>
            {/* CFO 날씨 헤더 */}
            <View style={styles.briefingHeader}>
              <Text style={styles.briefingWeatherEmoji}>{morningBriefing.cfoWeather.emoji}</Text>
              <View style={styles.briefingHeaderText}>
                <Text style={[styles.briefingTitle, { color: colors.textPrimary }]}>오늘의 AI 브리핑</Text>
                <Text style={[styles.briefingStatus, { color: colors.textSecondary }]}>{ morningBriefing.cfoWeather.status}</Text>
              </View>
              <View style={[
                styles.sentimentBadge,
                {
                  backgroundColor:
                    morningBriefing.macroSummary.marketSentiment === 'BULLISH'
                      ? 'rgba(76, 175, 80, 0.2)'
                      : morningBriefing.macroSummary.marketSentiment === 'BEARISH'
                      ? 'rgba(207, 102, 121, 0.2)'
                      : 'rgba(255, 215, 0, 0.2)',
                },
              ]}>
                <Text
                  style={[
                    styles.sentimentText,
                    {
                      color:
                        morningBriefing.macroSummary.marketSentiment === 'BULLISH'
                          ? '#4CAF50'
                          : morningBriefing.macroSummary.marketSentiment === 'BEARISH'
                          ? '#CF6679'
                          : '#FFD700',
                    },
                  ]}
                >
                  {morningBriefing.macroSummary.marketSentiment}
                </Text>
              </View>
            </View>

            {/* 매크로 요약 */}
            <View style={styles.briefingSection}>
              <Text style={[styles.briefingSectionTitle, { color: colors.textPrimary }]}>📊 {morningBriefing.macroSummary.title}</Text>
              {morningBriefing.macroSummary.highlights.map((highlight, idx) => (
                <View key={`highlight-${highlight.substring(0, 20)}-${idx}`} style={styles.highlightItem}>
                  <Text style={[styles.highlightBullet, { color: colors.textSecondary }]}>•</Text>
                  <Text style={[styles.highlightText, { color: colors.textSecondary }]}>{highlight}</Text>
                </View>
              ))}
              <View style={[styles.interestRateBox, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="trending-up" size={14} color="#FFD700" />
                <Text style={[styles.interestRateText, { color: colors.textPrimary }]}>
                  금리 전망: {morningBriefing.macroSummary.interestRateProbability}
                </Text>
              </View>
            </View>

            {/* 포트폴리오 액션 */}
            <View style={styles.briefingSection}>
              <Text style={[styles.briefingSectionTitle, { color: colors.textPrimary }]}>🎯 오늘의 포트폴리오 액션</Text>
              {morningBriefing.portfolioActions.slice(0, 5).map((action, idx) => (
                <View key={`action-${action.ticker}-${idx}`} style={styles.actionItem}>
                  <View style={styles.actionLeft}>
                    <View
                      style={[
                        styles.actionBadge,
                        {
                          backgroundColor:
                            action.action === 'BUY'
                              ? '#4CAF50'
                              : action.action === 'SELL'
                              ? '#CF6679'
                              : action.action === 'WATCH'
                              ? '#FFD700'
                              : '#666666',
                        },
                      ]}
                    >
                      <Text style={styles.actionBadgeText}>{action.action}</Text>
                    </View>
                    <View>
                      <Text style={[styles.actionTicker, { color: colors.textPrimary }]}>{action.ticker}</Text>
                      <Text style={[styles.actionName, { color: colors.textSecondary }]}>{action.name}</Text>
                    </View>
                  </View>
                  <Text style={[styles.actionReason, { color: colors.textSecondary }]} numberOfLines={2}>
                    {action.reason}
                  </Text>
                </View>
              ))}
            </View>

            {/* CFO 한마디 */}
            <View style={[styles.cfoMessageBox, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="chatbubble-ellipses" size={16} color="#4CAF50" />
              <Text style={[styles.cfoMessageText, { color: colors.textPrimary }]}>{morningBriefing.cfoWeather.message}</Text>
            </View>
          </View>
        )}

        {/* 티어별 맞춤 전략 카드 (탭 → 상세 페이지) */}
        <TouchableOpacity
          style={[styles.strategyCard, { backgroundColor: colors.surface, borderColor: tierStrategy.color + '50' }, shadows.md]}
          onPress={() => {
            mediumTap();
            router.push('/tier-strategy');
          }}
          activeOpacity={0.7}
        >
          <View style={styles.strategyHeader}>
            <Ionicons name="bulb" size={24} color={tierStrategy.color} />
            <View style={styles.strategyHeaderText}>
              <Text style={[styles.strategyLabel, { color: colors.textSecondary }]}>맞춤 전략</Text>
              <Text style={[styles.strategyTitle, { color: tierStrategy.color }]}>
                {tierStrategy.title}
              </Text>
            </View>
          </View>
          <View style={styles.strategyFocusList}>
            {tierStrategy.focus.map((item, idx) => (
              <View key={`focus-${item.substring(0, 10)}-${idx}`} style={styles.strategyFocusItem}>
                <View style={[styles.strategyBullet, { backgroundColor: tierStrategy.color }]} />
                <Text style={[styles.strategyFocusText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
          {/* 전략 상세 보기 링크 */}
          <View style={styles.strategyDetailLink}>
            <Text style={[styles.strategyDetailText, { color: tierStrategy.color }]}>
              전략 상세 보기
            </Text>
            <Ionicons name="chevron-forward" size={14} color={tierStrategy.color} />
          </View>
        </TouchableOpacity>

        {/* Panic Shield 카드 */}
        {analysisResult && (
          <PanicShieldCard
            index={analysisResult.panicShieldIndex ?? 50}
            level={analysisResult.panicShieldLevel ?? 'CAUTION'}
            stopLossGuidelines={analysisResult.stopLossGuidelines ?? []}
            peerComparison={peerPanicData}
          />
        )}

        {/* FOMO Vaccine 카드 */}
        {analysisResult && (
          <FomoVaccineCard alerts={analysisResult.fomoAlerts ?? []} />
        )}

        {/* 맞춤 조언 섹션 */}
        {analysisResult && analysisResult.personalizedAdvice.length > 0 && (
          <View style={styles.adviceContainer}>
            <View style={styles.adviceHeader}>
              <Ionicons name="person-circle" size={24} color="#4CAF50" />
              <Text style={styles.adviceTitle}>{TIER_LABELS[userTier]} 투자자를 위한 조언</Text>
            </View>
            {analysisResult.personalizedAdvice.map((advice, idx) => (
              <View key={`advice-${advice.substring(0, 20)}-${idx}`} style={styles.adviceItem}>
                <Text style={styles.adviceNumber}>{idx + 1}</Text>
                <Text style={styles.adviceText}>{advice}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 포트폴리오 스냅샷 */}
        {analysisResult && (
          <View style={styles.snapshotContainer}>
            <Text style={styles.snapshotTitle}>📊 포트폴리오 스냅샷</Text>
            <View style={styles.snapshotGrid}>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>총 자산</Text>
                <Text style={styles.snapshotValue}>
                  ₩{Math.floor(analysisResult.portfolioSnapshot?.totalValue ?? 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>총 손익</Text>
                <Text
                  style={[
                    styles.snapshotValue,
                    {
                      color:
                        (analysisResult.portfolioSnapshot?.totalGainLoss ?? 0) >= 0
                          ? '#4CAF50'
                          : '#CF6679',
                    },
                  ]}
                >
                  {(analysisResult.portfolioSnapshot?.totalGainLoss ?? 0) >= 0 ? '+' : ''}
                  ₩{Math.floor(Math.abs(analysisResult.portfolioSnapshot?.totalGainLoss ?? 0)).toLocaleString()}
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>수익률</Text>
                <Text
                  style={[
                    styles.snapshotValue,
                    {
                      color:
                        (analysisResult.portfolioSnapshot?.gainLossPercent ?? 0) >= 0
                          ? '#4CAF50'
                          : '#CF6679',
                    },
                  ]}
                >
                  {(analysisResult.portfolioSnapshot?.gainLossPercent ?? 0) >= 0 ? '+' : ''}
                  {(analysisResult.portfolioSnapshot?.gainLossPercent ?? 0).toFixed(2)}%
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>분산 점수</Text>
                <Text style={styles.snapshotValue}>
                  {analysisResult.portfolioSnapshot?.diversificationScore ?? 0}/100
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 부동산 인사이트 (Silver 유저 잠금 - 무료 기간에는 해제) */}
        <TouchableOpacity
          style={styles.realEstateSection}
          onPress={() => {
            mediumTap();
            if (userTier === 'SILVER' && !isFreePeriod()) {
              router.push('/subscription/paywall');
            }
          }}
          activeOpacity={userTier === 'SILVER' && !isFreePeriod() ? 0.7 : 1}
          disabled={!(userTier === 'SILVER' && !isFreePeriod())}
        >
          <View style={styles.realEstateHeader}>
            <Ionicons name="business" size={20} color={userTier === 'SILVER' && !isFreePeriod() ? '#555555' : '#4CAF50'} />
            <Text style={[
              styles.realEstateTitleText,
              userTier === 'SILVER' && !isFreePeriod() && { color: '#555555' },
            ]}>
              부동산 인사이트
            </Text>
            {userTier === 'SILVER' && !isFreePeriod() && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={12} color="#FFD700" />
                <Text style={styles.lockBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          {userTier === 'SILVER' && !isFreePeriod() ? (
            <View style={styles.lockedContent}>
              <Ionicons name="lock-closed" size={32} color="#333333" />
              <Text style={styles.lockedText}>
                Premium 구독으로 AI 부동산 분석을 이용하세요
              </Text>
              <View style={styles.unlockButton}>
                <Text style={styles.unlockButtonText}>잠금 해제</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.realEstateContent}>
              {morningBriefing?.cfoWeather?.message || '부동산 시장 데이터를 분석 중입니다...'}
            </Text>
          )}
        </TouchableOpacity>

        {/* 인스타그램 공유 카드 */}
        <View style={styles.shareSection}>
          <Text style={styles.shareSectionTitle}>📱 처방전 공유</Text>
          <ShareableCard
            tier={userTier}
            totalAssets={totalAssets}
            morningBriefing={morningBriefing}
            panicShieldIndex={analysisResult?.panicShieldIndex}
          />
        </View>

        {/* 보유 자산 리스트 */}
        <View style={styles.assetListContainer}>
          <Text style={styles.assetListTitle}>
            📦 보유 자산 ({portfolio.length}개)
          </Text>
          {portfolio.map((asset, idx) => {
            const gainLoss = asset.currentPrice - asset.avgPrice;
            const gainLossPercent =
              asset.avgPrice > 0 ? (gainLoss / asset.avgPrice) * 100 : 0;
            return (
              <View key={`asset-${asset.ticker}`} style={styles.assetItem}>
                <View style={styles.assetLeft}>
                  <View style={styles.assetIcon}>
                    <Text style={styles.assetIconText}>
                      {asset.ticker[0]}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.assetTicker}>{asset.ticker}</Text>
                    <Text style={styles.assetName}>{asset.name}</Text>
                  </View>
                </View>
                <View style={styles.assetRight}>
                  <Text style={styles.assetValue}>
                    ₩{Math.floor(asset.currentValue).toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.assetGain,
                      { color: gainLossPercent >= 0 ? '#4CAF50' : '#CF6679' },
                    ]}
                  >
                    {gainLossPercent >= 0 ? '+' : ''}
                    {gainLossPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* 면책 문구 */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            본 서비스는 금융위원회에 등록된 투자자문업이 아닙니다. AI 분석 결과는 과거 데이터 기반의 참고 정보이며, 미래 수익을 보장하지 않습니다. 투자 원금의 일부 또는 전부를 잃을 수 있으며, 최종 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다. 본 서비스는 예금자보호법에 따른 보호 대상이 아닙니다.
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
  // 출석 체크 토스트
  checkInToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  checkInToastText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  strategyCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  strategyHeaderText: {
    flex: 1,
  },
  strategyLabel: {
    fontSize: 11,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  strategyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  strategyFocusList: {
    gap: 10,
  },
  strategyFocusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  strategyBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  strategyFocusText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  strategyDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    gap: 4,
  },
  strategyDetailText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Morning Briefing 스타일
  briefingCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50' + '30',
  },
  briefingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  briefingWeatherEmoji: {
    fontSize: 32,
  },
  briefingHeaderText: {
    flex: 1,
  },
  briefingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  briefingStatus: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  sentimentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sentimentText: {
    fontSize: 10,
    fontWeight: '700',
  },
  briefingSection: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  briefingSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  highlightBullet: {
    color: '#4CAF50',
    fontSize: 14,
  },
  highlightText: {
    flex: 1,
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  interestRateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  interestRateText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '500',
  },
  actionItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  actionTicker: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionName: {
    fontSize: 11,
    color: '#888888',
  },
  actionReason: {
    fontSize: 12,
    color: '#AAAAAA',
    lineHeight: 18,
  },
  cfoMessageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    marginTop: 4,
  },
  cfoMessageText: {
    flex: 1,
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  emptyHighlight: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 32,
  },
  registerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#CF6679',
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  adviceContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  adviceNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  adviceText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  snapshotContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  snapshotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  snapshotItem: {
    width: '47%',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
  },
  snapshotLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
  },
  snapshotValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assetListContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
  },
  assetListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  assetTicker: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assetName: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assetGain: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  // 부동산 인사이트 잠금
  realEstateSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  realEstateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  realEstateTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFD700',
  },
  lockedContent: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  lockedText: {
    fontSize: 13,
    color: '#555555',
    textAlign: 'center',
  },
  unlockButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  unlockButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  realEstateContent: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  // 면책 문구
  disclaimerBox: {
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  disclaimerText: {
    fontSize: 10,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 16,
  },
  // 공유 섹션
  shareSection: {
    marginBottom: 16,
  },
  shareSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  // AI 인라인 로딩 배너
  aiLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  aiLoadingTextWrap: {
    flex: 1,
  },
  aiLoadingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aiLoadingDesc: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
});
