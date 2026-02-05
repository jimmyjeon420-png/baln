/**
 * 처방전 화면 - Panic Shield & FOMO Vaccine
 * 행동재무학 기반 포트폴리오 리스크 분석
 * 티어별 맞춤 처방 제공
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../src/services/supabase';
import {
  analyzePortfolioRisk,
  RiskAnalysisResult,
  PortfolioAsset,
  generateMorningBriefing,
  MorningBriefingResult,
} from '../../src/services/gemini';

// 진단 트리거 플래그 키
const NEEDS_DIAGNOSIS_KEY = '@smart_rebalancer:needs_diagnosis';
const LAST_SCAN_DATE_KEY = '@smart_rebalancer:last_scan_date';
import PanicShieldCard from '../../src/components/PanicShieldCard';
import FomoVaccineCard from '../../src/components/FomoVaccineCard';
import {
  determineTier,
  formatAssetInBillion,
  syncUserProfileTier,
  TIER_COLORS,
  TIER_LABELS,
  TIER_DESCRIPTIONS,
} from '../../src/hooks/useGatherings';
import { UserTier } from '../../src/types/database';

// 티어별 맞춤 전략
const TIER_STRATEGIES: Record<UserTier, { title: string; focus: string[]; color: string }> = {
  SILVER: {
    title: '공격적 시드머니 확대 전략',
    focus: [
      '고성장 ETF 중심 포트폴리오 구성',
      '월급의 30% 이상 적극적 저축',
      '분산 투자보다 집중 투자 고려',
      '소액으로 시작하는 우량주 적립식 매수',
    ],
    color: '#C0C0C0',
  },
  GOLD: {
    title: '포트폴리오 리밸런싱 & 세금 전략',
    focus: [
      '자산 배분 최적화 (주식 60% / 채권 30% / 현금 10%)',
      '양도세 절세를 위한 손익통산 전략',
      'ISA, 연금저축 한도 활용 극대화',
      '분기별 정기 리밸런싱 실행',
    ],
    color: '#FFD700',
  },
  PLATINUM: {
    title: '자산 보존 & 현금흐름 최적화',
    focus: [
      '배당주 중심 안정적 현금흐름 구축',
      '부동산 간접투자(REITs) 편입 검토',
      '채권 비중 확대로 변동성 관리',
      '세대 간 자산 이전 전략 수립',
    ],
    color: '#E5E4E2',
  },
  DIAMOND: {
    title: '패밀리 오피스 수준 자산 관리',
    focus: [
      '대체투자 (PE, VC, 헤지펀드) 편입',
      '해외 자산 분산으로 환 리스크 관리',
      '가족 재단/신탁 설립 검토',
      '전문 자산관리사 위임 검토',
    ],
    color: '#B9F2FF',
  },
};

export default function RebalanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [userTier, setUserTier] = useState<UserTier>('SILVER');
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysisResult | null>(null);
  const [morningBriefing, setMorningBriefing] = useState<MorningBriefingResult | null>(null);
  const [isNewScan, setIsNewScan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 포트폴리오 데이터 로드 및 티어 계산
  const loadPortfolio = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('로그인이 필요합니다.');
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Portfolio fetch error:', fetchError);
        setError('포트폴리오 데이터를 불러올 수 없습니다.');
        return [];
      }

      if (!data || data.length === 0) {
        setTotalAssets(0);
        setUserTier('SILVER');
        setError(null);
        return [];
      }

      // DB 데이터를 PortfolioAsset 형태로 변환
      const assets: PortfolioAsset[] = data.map((item: any) => ({
        ticker: item.ticker || 'UNKNOWN',
        name: item.name || '알 수 없는 자산',
        quantity: item.quantity || 0,
        avgPrice: item.avg_price || 0,
        currentPrice: item.current_price || item.avg_price || 0,
        currentValue: item.current_value || (item.quantity * (item.current_price || item.avg_price)) || 0,
      }));

      // 총 자산 및 티어 계산
      const total = assets.reduce((sum, a) => sum + a.currentValue, 0);
      const tier = determineTier(total);
      setTotalAssets(total);
      setUserTier(tier);

      // 프로필 티어 동기화 (백그라운드)
      syncUserProfileTier(user.id).catch(console.error);

      setError(null);
      return assets;
    } catch (err) {
      console.error('Load portfolio error:', err);
      setError('데이터 로드 중 오류가 발생했습니다.');
      return [];
    }
  }, []);

  // AI 분석 실행
  const runAnalysis = useCallback(async (assets: PortfolioAsset[]) => {
    if (assets.length === 0) {
      setAnalysisResult(null);
      setMorningBriefing(null);
      return;
    }

    try {
      // Panic Shield & FOMO Vaccine 분석
      const result = await analyzePortfolioRisk(assets);
      setAnalysisResult(result);

      // Morning Briefing 생성 (신규 스캔이거나 첫 로드 시)
      const briefing = await generateMorningBriefing(assets, {
        includeRealEstate: false,
      });
      setMorningBriefing(briefing);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('AI 분석 중 오류가 발생했습니다.');
    }
  }, []);

  // 신규 스캔 확인
  const checkNewScan = useCallback(async () => {
    try {
      const needsDiagnosis = await AsyncStorage.getItem(NEEDS_DIAGNOSIS_KEY);
      const lastScanDate = await AsyncStorage.getItem(LAST_SCAN_DATE_KEY);
      const today = new Date().toISOString().split('T')[0];

      if (needsDiagnosis === 'true' && lastScanDate === today) {
        setIsNewScan(true);
        // 플래그 초기화
        await AsyncStorage.removeItem(NEEDS_DIAGNOSIS_KEY);
      } else {
        setIsNewScan(false);
      }
    } catch (err) {
      console.error('Check new scan error:', err);
    }
  }, []);

  // 데이터 로드 및 분석
  const loadAndAnalyze = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    const assets = await loadPortfolio();
    setPortfolio(assets);

    if (assets.length > 0) {
      await runAnalysis(assets);
    }

    setLoading(false);
    setRefreshing(false);
  }, [loadPortfolio, runAnalysis]);

  // 초기 로드
  useEffect(() => {
    checkNewScan();
    loadAndAnalyze();
  }, []);

  // 화면 포커스 시 새로고침 (즉시 자산 확인으로 플레이스홀더 바이패스)
  useFocusEffect(
    useCallback(() => {
      // [핵심] 즉시 portfolios 테이블 직접 쿼리 - profile sync 대기 안함
      const quickAssetCheckAndAnalyze = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // 직접 쿼리로 빠른 총 자산 계산
          const { data: assets } = await supabase
            .from('portfolios')
            .select('current_value')
            .eq('user_id', user.id);

          const realTotal = assets?.reduce(
            (sum, item) => sum + (item.current_value || 0),
            0
          ) || 0;

          // [핵심 수정] 자산이 있으면 즉시 상태 업데이트 + 분석 강제 실행
          if (realTotal > 0) {
            setTotalAssets(realTotal);
            setIsNewScan(false);

            // morningBriefing이 없거나 portfolio가 비어있으면 즉시 전체 분석 실행
            // 이렇게 해야 탭 진입 시에도 항상 분석 결과가 보장됨
            await loadAndAnalyze(false);
          } else {
            // 자산이 없는 경우에만 로딩 상태 해제
            setTotalAssets(0);
            setLoading(false);
          }
        } catch (err) {
          console.error('Quick asset check failed:', err);
          // 에러 시에도 기존 로직 폴백
          await loadAndAnalyze(false);
        }
      };

      quickAssetCheckAndAnalyze();
    }, [loadAndAnalyze])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAndAnalyze(false);
  }, [loadAndAnalyze]);

  // [핵심 수정] 로딩 상태 - totalAssets > 0인데 분석이 없는 경우도 로딩 처리
  // 자산이 있는 유저에게는 Empty State 대신 로딩 화면을 보여줌
  const isAnalyzing = loading || (totalAssets > 0 && !morningBriefing && portfolio.length === 0);

  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>
            {totalAssets > 0
              ? "오늘의 시장에 맞춘 처방전 준비 중..."
              : "포트폴리오 분석 중..."}
          </Text>
          {totalAssets > 0 && (
            <Text style={styles.loadingSubtext}>
              AI가 매크로 동향을 분석하고 있습니다
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // [핵심 수정] 빈 포트폴리오 상태 - totalAssets 기준으로 판단
  // totalAssets > 0이면 절대로 Empty State를 보여주지 않음
  if (totalAssets === 0 && portfolio.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>처방전</Text>
          <Text style={styles.headerSubtitle}>AI가 제안하는 맞춤형 투자 처방</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="document-text-outline" size={64} color="#4CAF50" />
          </View>
          <Text style={styles.emptyTitle}>자산을 등록해주세요</Text>
          <Text style={styles.emptyText}>
            보유 자산을 등록하시면{'\n'}
            <Text style={styles.emptyHighlight}>당신만을 위한 맞춤 처방전</Text>을{'\n'}
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

  // 에러 상태
  if (error && !analysisResult) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>처방전</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#CF6679" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadAndAnalyze()}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tierStrategy = TIER_STRATEGIES[userTier];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
      >
        {/* 헤더 - 티어 정보 포함 */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>처방전</Text>
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
          <Text style={styles.headerSubtitle}>
            {TIER_DESCRIPTIONS[userTier]} 회원 맞춤 처방
          </Text>
        </View>

        {/* Morning Briefing 카드 */}
        {morningBriefing && (
          <View style={styles.briefingCard}>
            {/* CFO 날씨 헤더 */}
            <View style={styles.briefingHeader}>
              <Text style={styles.briefingWeatherEmoji}>{morningBriefing.cfoWeather.emoji}</Text>
              <View style={styles.briefingHeaderText}>
                <Text style={styles.briefingTitle}>오늘의 CFO 브리핑</Text>
                <Text style={styles.briefingStatus}>{morningBriefing.cfoWeather.status}</Text>
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
              <Text style={styles.briefingSectionTitle}>📊 {morningBriefing.macroSummary.title}</Text>
              {morningBriefing.macroSummary.highlights.map((highlight, idx) => (
                <View key={idx} style={styles.highlightItem}>
                  <Text style={styles.highlightBullet}>•</Text>
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>
              ))}
              <View style={styles.interestRateBox}>
                <Ionicons name="trending-up" size={14} color="#FFD700" />
                <Text style={styles.interestRateText}>
                  금리 전망: {morningBriefing.macroSummary.interestRateProbability}
                </Text>
              </View>
            </View>

            {/* 포트폴리오 액션 */}
            <View style={styles.briefingSection}>
              <Text style={styles.briefingSectionTitle}>🎯 오늘의 포트폴리오 액션</Text>
              {morningBriefing.portfolioActions.slice(0, 5).map((action, idx) => (
                <View key={idx} style={styles.actionItem}>
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
                      <Text style={styles.actionTicker}>{action.ticker}</Text>
                      <Text style={styles.actionName}>{action.name}</Text>
                    </View>
                  </View>
                  <Text style={styles.actionReason} numberOfLines={2}>
                    {action.reason}
                  </Text>
                </View>
              ))}
            </View>

            {/* CFO 한마디 */}
            <View style={styles.cfoMessageBox}>
              <Ionicons name="chatbubble-ellipses" size={16} color="#4CAF50" />
              <Text style={styles.cfoMessageText}>{morningBriefing.cfoWeather.message}</Text>
            </View>
          </View>
        )}

        {/* 티어별 맞춤 전략 카드 */}
        <View style={[styles.strategyCard, { borderColor: tierStrategy.color + '50' }]}>
          <View style={styles.strategyHeader}>
            <Ionicons name="bulb" size={24} color={tierStrategy.color} />
            <View style={styles.strategyHeaderText}>
              <Text style={styles.strategyLabel}>맞춤 전략</Text>
              <Text style={[styles.strategyTitle, { color: tierStrategy.color }]}>
                {tierStrategy.title}
              </Text>
            </View>
          </View>
          <View style={styles.strategyFocusList}>
            {tierStrategy.focus.map((item, idx) => (
              <View key={idx} style={styles.strategyFocusItem}>
                <View style={[styles.strategyBullet, { backgroundColor: tierStrategy.color }]} />
                <Text style={styles.strategyFocusText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Panic Shield 카드 */}
        {analysisResult && (
          <PanicShieldCard
            index={analysisResult.panicShieldIndex}
            level={analysisResult.panicShieldLevel}
            stopLossGuidelines={analysisResult.stopLossGuidelines}
          />
        )}

        {/* FOMO Vaccine 카드 */}
        {analysisResult && (
          <FomoVaccineCard alerts={analysisResult.fomoAlerts} />
        )}

        {/* 맞춤 조언 섹션 */}
        {analysisResult && analysisResult.personalizedAdvice.length > 0 && (
          <View style={styles.adviceContainer}>
            <View style={styles.adviceHeader}>
              <Ionicons name="person-circle" size={24} color="#4CAF50" />
              <Text style={styles.adviceTitle}>{TIER_LABELS[userTier]} 투자자를 위한 조언</Text>
            </View>
            {analysisResult.personalizedAdvice.map((advice, idx) => (
              <View key={idx} style={styles.adviceItem}>
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
                  ₩{analysisResult.portfolioSnapshot.totalValue.toLocaleString()}
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>총 손익</Text>
                <Text
                  style={[
                    styles.snapshotValue,
                    {
                      color:
                        analysisResult.portfolioSnapshot.totalGainLoss >= 0
                          ? '#4CAF50'
                          : '#CF6679',
                    },
                  ]}
                >
                  {analysisResult.portfolioSnapshot.totalGainLoss >= 0 ? '+' : ''}
                  ₩{analysisResult.portfolioSnapshot.totalGainLoss.toLocaleString()}
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>수익률</Text>
                <Text
                  style={[
                    styles.snapshotValue,
                    {
                      color:
                        analysisResult.portfolioSnapshot.gainLossPercent >= 0
                          ? '#4CAF50'
                          : '#CF6679',
                    },
                  ]}
                >
                  {analysisResult.portfolioSnapshot.gainLossPercent >= 0 ? '+' : ''}
                  {analysisResult.portfolioSnapshot.gainLossPercent.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>분산 점수</Text>
                <Text style={styles.snapshotValue}>
                  {analysisResult.portfolioSnapshot.diversificationScore}/100
                </Text>
              </View>
            </View>
          </View>
        )}

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
              <View key={idx} style={styles.assetItem}>
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
                    ₩{asset.currentValue.toLocaleString()}
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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#666666',
    marginTop: 6,
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
});
