import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import supabase from '../../src/services/supabase';
import { Asset, AssetType } from '../../src/types/asset';
import { transformDbRowToAsset } from '../../src/utils/assetTransform';
import { COLORS, SIZES } from '../../src/styles/theme';
import RollingNumber from '../../src/components/RollingNumber';
import { HomeSkeletonLoader, SkeletonBlock } from '../../src/components/SkeletonLoader';
import { useHaptics } from '../../src/hooks/useHaptics';
import {
  getQuickMarketSentiment,
  getTodayStockReports,
  type StockQuantReport,
} from '../../src/services/centralKitchen';

// ============================================================================
// 유틸리티 함수
// ============================================================================

/** 시간대별 인사말 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '좋은 아침이에요';
  if (hour < 18) return '좋은 오후예요';
  return '좋은 저녁이에요';
}

/** 오늘 날짜 포맷 (예: 2월 6일 목요일) */
function getTodayDateString(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${month}월 ${day}일 ${weekdays[now.getDay()]}`;
}

/** 시장 심리 → 한국어 라벨 + 색상 */
function getSentimentDisplay(sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL') {
  switch (sentiment) {
    case 'BULLISH':
      return { label: '강세', color: COLORS.primary, bgColor: 'rgba(76,175,80,0.15)' };
    case 'BEARISH':
      return { label: '약세', color: COLORS.error, bgColor: 'rgba(207,102,121,0.15)' };
    default:
      return { label: '보합', color: COLORS.neutral, bgColor: 'rgba(158,158,158,0.15)' };
  }
}

/** 퀀트 신호 → 한국어 라벨 + 색상 */
function getSignalDisplay(signal: string) {
  switch (signal) {
    case 'STRONG_BUY':
      return { label: 'STRONG BUY', color: '#FFFFFF', bgColor: COLORS.primary };
    case 'BUY':
      return { label: 'BUY', color: '#FFFFFF', bgColor: COLORS.primary };
    case 'SELL':
      return { label: 'SELL', color: '#FFFFFF', bgColor: COLORS.error };
    case 'STRONG_SELL':
      return { label: 'STRONG SELL', color: '#FFFFFF', bgColor: COLORS.error };
    case 'WATCH':
      return { label: 'WATCH', color: '#FFFFFF', bgColor: COLORS.warning };
    default:
      return { label: 'HOLD', color: '#FFFFFF', bgColor: '#555555' };
  }
}

/** 리밸런싱 이탈도 계산 (각 자산의 |실제비중 - 목표비중| 합 / 2) */
function calculateDriftScore(assets: Asset[], total: number): number {
  if (total === 0) return 0;
  return assets.reduce((sum, asset) => {
    const currentValue = asset.quantity && asset.currentPrice
      ? asset.quantity * asset.currentPrice
      : asset.currentValue;
    const actualPct = (currentValue / total) * 100;
    const targetPct = asset.targetAllocation || 0;
    return sum + Math.abs(actualPct - targetPct);
  }, 0) / 2;
}

/** 이탈도 → 상태 (균형/주의/조정 필요) */
function getDriftStatus(drift: number) {
  if (drift < 5) return { label: '균형', color: COLORS.primary, bgColor: 'rgba(76,175,80,0.15)' };
  if (drift <= 15) return { label: '주의', color: COLORS.warning, bgColor: 'rgba(255,183,77,0.15)' };
  return { label: '조정 필요', color: COLORS.error, bgColor: 'rgba(207,102,121,0.15)' };
}

/** 리밸런싱 점수 계산 (100 - drift, 최소 0점) */
function calculateRebalanceScore(drift: number): number {
  return Math.max(0, Math.round(100 - drift * 2));
}

/** 점수 → 등급 라벨 */
function getScoreGrade(score: number): string {
  if (score >= 90) return '최적';
  if (score >= 70) return '양호';
  if (score >= 50) return '보통';
  return '개선 필요';
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function HomeScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  // 포트폴리오 상태
  const [isLoading, setIsLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);

  // Central Kitchen 상태
  const [marketSentiment, setMarketSentiment] = useState<{
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    cfoWeather: { emoji: string; status: string; message: string } | null;
  } | null>(null);
  const [stockReports, setStockReports] = useState<StockQuantReport[]>([]);

  // 파생 데이터: 유동 자산만 필터 (주식/코인/ETF)
  const liquidAssets = useMemo(
    () => allAssets.filter(a => a.assetType === AssetType.LIQUID),
    [allAssets]
  );

  // P&L 계산 (costBasis 기반 총 손익)
  const totalPnL = useMemo(() => {
    return liquidAssets.reduce((sum, asset) => {
      const currentValue = asset.quantity && asset.currentPrice
        ? asset.quantity * asset.currentPrice
        : asset.currentValue;
      const costBasis = asset.costBasis || asset.currentValue;
      return sum + (currentValue - costBasis);
    }, 0);
  }, [liquidAssets]);

  const totalPnLPercent = useMemo(() => {
    const totalCost = liquidAssets.reduce((sum, asset) => {
      return sum + (asset.costBasis || asset.currentValue);
    }, 0);
    return totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  }, [liquidAssets, totalPnL]);

  // 이탈도 & 리밸런싱 점수
  const driftScore = useMemo(() => calculateDriftScore(allAssets, totalAssets), [allAssets, totalAssets]);
  const rebalanceScore = useMemo(() => calculateRebalanceScore(driftScore), [driftScore]);

  // 보유 종목과 매칭된 시그널 목록
  const matchedSignals = useMemo(() => {
    if (stockReports.length === 0) return [];
    return stockReports.map(report => {
      const asset = liquidAssets.find(a => a.ticker === report.ticker);
      return { ...report, asset };
    }).filter(r => r.asset);
  }, [stockReports, liquidAssets]);

  // ======== 데이터 로딩 ========
  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1) 유저 인증 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setTotalAssets(0);
        setAllAssets([]);
        setMarketSentiment(null);
        setStockReports([]);
        return;
      }

      // 2) 포트폴리오 로드
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('current_value', { ascending: false });

      if (error) {
        console.error('포트폴리오 데이터 로드 오류:', error);
        setTotalAssets(0);
        setAllAssets([]);
        return;
      }

      let assets: Asset[] = [];
      let total = 0;

      if (data && data.length > 0) {
        assets = data.map(transformDbRowToAsset);
        total = assets.reduce((sum, asset) => {
          if (asset.quantity && asset.currentPrice) {
            return sum + (asset.quantity * asset.currentPrice);
          }
          return sum + asset.currentValue;
        }, 0);
      }

      setTotalAssets(total);
      setAllAssets(assets);

      // 3) Central Kitchen 데이터 병렬 로드
      const tickers = assets
        .filter(a => a.assetType === AssetType.LIQUID && a.ticker)
        .map(a => a.ticker!);

      const [sentimentResult, reportsResult] = await Promise.all([
        getQuickMarketSentiment().catch(() => null),
        tickers.length > 0 ? getTodayStockReports(tickers).catch(() => []) : Promise.resolve([]),
      ]);

      setMarketSentiment(sentimentResult);
      setStockReports(reportsResult);
    } catch (err) {
      console.error('홈 화면 데이터 로드 오류:', err);
      setTotalAssets(0);
      setAllAssets([]);
    } finally {
      setIsLoading(false);
      setInitialCheckDone(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  // ======== 네비게이션 핸들러 ========
  const handleOCR = () => {
    haptics.lightTap();
    router.push('/add-asset');
  };

  const handleDiagnosis = () => {
    haptics.lightTap();
    router.push('/(tabs)/diagnosis');
  };

  const handleRebalance = () => {
    haptics.lightTap();
    router.push('/(tabs)/rebalance');
  };

  // ======== 로딩 중: 스켈레톤 표시 ========
  if (!initialCheckDone) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeSkeletonLoader />
      </SafeAreaView>
    );
  }

  const hasAssets = allAssets.length > 0;
  const driftStatus = getDriftStatus(driftScore);
  const weatherEmoji = marketSentiment?.cfoWeather?.emoji || '📊';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ====== Section 1: 인사 + 시장 날씨 ====== */}
        <View style={styles.greetingSection}>
          <View>
            <Text style={styles.greetingText}>
              {getGreeting()} {weatherEmoji}
            </Text>
            <Text style={styles.dateText}>{getTodayDateString()}</Text>
          </View>
          {marketSentiment ? (
            <View style={[
              styles.sentimentBadge,
              { backgroundColor: getSentimentDisplay(marketSentiment.sentiment).bgColor },
            ]}>
              <View style={[
                styles.sentimentDot,
                { backgroundColor: getSentimentDisplay(marketSentiment.sentiment).color },
              ]} />
              <Text style={[
                styles.sentimentText,
                { color: getSentimentDisplay(marketSentiment.sentiment).color },
              ]}>
                시장: {getSentimentDisplay(marketSentiment.sentiment).label}
              </Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleOCR} style={styles.cameraButton}>
              <Ionicons name="camera-outline" size={20} color={COLORS.textPrimary} />
              <Text style={styles.cameraText}>캡처</Text>
            </TouchableOpacity>
          )}
        </View>

        {hasAssets ? (
          <>
            {/* ====== Section 2: 포트폴리오 Pulse 카드 (Hero) ====== */}
            <View style={styles.pulseCard}>
              <Text style={styles.pulseLabel}>총 평가금액</Text>
              <RollingNumber
                value={totalAssets}
                format="currency"
                prefix="₩"
                style={styles.pulseValue}
                duration={1000}
              />
              <View style={styles.pnlRow}>
                <Text style={[
                  styles.pnlText,
                  { color: totalPnL >= 0 ? COLORS.primary : COLORS.error },
                ]}>
                  {totalPnL >= 0 ? '+' : ''}₩{Math.abs(Math.round(totalPnL)).toLocaleString('ko-KR')}
                  {' '}({totalPnL >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
                  {' '}{totalPnL >= 0 ? '▲' : '▼'}
                </Text>
              </View>

              <View style={styles.pulseActions}>
                <TouchableOpacity
                  style={styles.pulseActionBtn}
                  onPress={handleRebalance}
                >
                  <Text style={styles.pulseActionLabel}>리밸런싱 점수</Text>
                  <View style={styles.pulseScoreRow}>
                    <Text style={[styles.pulseScore, { color: driftStatus.color }]}>
                      {rebalanceScore}점
                    </Text>
                    <View style={[styles.scoreGradeBadge, { backgroundColor: driftStatus.bgColor }]}>
                      <Text style={[styles.scoreGradeText, { color: driftStatus.color }]}>
                        {getScoreGrade(rebalanceScore)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pulseActionBtn, styles.diagnosisBtn]}
                  onPress={handleDiagnosis}
                >
                  <Text style={styles.pulseActionLabel}>AI 진단</Text>
                  <View style={styles.diagnosisArrow}>
                    <Ionicons name="analytics-outline" size={20} color={COLORS.primary} />
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* ====== Section 3: 오늘의 시그널 ====== */}
            {matchedSignals.length > 0 && (
              <View style={styles.signalCard}>
                <View style={styles.signalHeader}>
                  <Text style={styles.signalTitle}>📡 오늘의 시그널</Text>
                  <Text style={styles.signalCount}>
                    {matchedSignals.length}개 종목 분석
                  </Text>
                </View>

                {matchedSignals.map((report) => {
                  const signalDisplay = getSignalDisplay(report.signal);
                  const signal = report.signal as string;
                  const desc = signal === 'BUY' || signal === 'STRONG_BUY'
                    ? `밸류에이션 ${report.valuation_score}점`
                    : signal === 'SELL' || signal === 'STRONG_SELL'
                    ? `밸류에이션 ${report.valuation_score}점`
                    : signal === 'WATCH'
                    ? report.analysis?.slice(0, 20) || '주시 필요'
                    : report.analysis?.slice(0, 20) || '유지';

                  return (
                    <TouchableOpacity
                      key={report.ticker}
                      style={styles.signalRow}
                      onPress={handleDiagnosis}
                    >
                      <Text style={styles.signalTicker}>{report.ticker}</Text>
                      <View style={[styles.signalBadge, { backgroundColor: signalDisplay.bgColor }]}>
                        <Text style={[styles.signalBadgeText, { color: signalDisplay.color }]}>
                          {signalDisplay.label}
                        </Text>
                      </View>
                      <Text style={styles.signalDesc} numberOfLines={1}>
                        {desc}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ====== Section 4: 내 활성 자산 ====== */}
            <View style={styles.holdingsSection}>
              <View style={styles.holdingsHeader}>
                <Text style={styles.holdingsTitle}>내 활성 자산</Text>
                <Text style={styles.holdingsCount}>{liquidAssets.length}개</Text>
              </View>

              {liquidAssets.map((asset) => {
                const currentValue = asset.quantity && asset.currentPrice
                  ? asset.quantity * asset.currentPrice
                  : asset.currentValue;
                const costBasis = asset.costBasis || asset.currentValue;
                const gainLoss = currentValue - costBasis;
                const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
                const report = stockReports.find(r => r.ticker === asset.ticker);
                const signalDisplay = report ? getSignalDisplay(report.signal) : null;

                return (
                  <TouchableOpacity
                    key={asset.id}
                    style={styles.holdingItem}
                    onPress={handleDiagnosis}
                    activeOpacity={0.7}
                  >
                    <View style={styles.holdingIcon}>
                      <Text style={styles.holdingIconText}>
                        {asset.ticker ? asset.ticker[0] : asset.name[0]}
                      </Text>
                    </View>

                    <View style={styles.holdingInfo}>
                      <Text style={styles.holdingTicker}>
                        {asset.ticker || asset.name}
                      </Text>
                      <Text style={styles.holdingQuantity}>
                        {asset.quantity
                          ? `${asset.quantity % 1 === 0 ? asset.quantity : asset.quantity.toFixed(2)}주`
                          : asset.name
                        }
                      </Text>
                    </View>

                    <View style={styles.holdingRight}>
                      <Text style={styles.holdingValue}>
                        ₩{currentValue.toLocaleString('ko-KR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </Text>
                      <View style={styles.holdingPnlRow}>
                        <Text style={[
                          styles.holdingPnl,
                          { color: gainLoss >= 0 ? COLORS.primary : COLORS.error },
                        ]}>
                          {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%
                        </Text>
                        {signalDisplay && (
                          <View style={[styles.miniSignalBadge, { backgroundColor: signalDisplay.bgColor }]}>
                            <Text style={[styles.miniSignalText, { color: signalDisplay.color }]}>
                              {signalDisplay.label}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ====== Section 5: 리밸런싱 알림 배너 ====== */}
            <TouchableOpacity
              style={[styles.rebalanceBanner, { borderColor: driftStatus.color + '40' }]}
              onPress={handleRebalance}
              activeOpacity={0.8}
            >
              <View style={styles.bannerLeft}>
                <Text style={styles.bannerIcon}>⚖️</Text>
                <View>
                  <Text style={styles.bannerTitle}>포트폴리오 균형 상태</Text>
                  <Text style={styles.bannerDesc}>
                    {driftScore < 5
                      ? '목표 배분과 잘 맞고 있어요!'
                      : `목표 배분에서 ${Math.round(driftScore)}% 이탈 → ${driftStatus.label}`
                    }
                  </Text>
                </View>
              </View>
              <View style={[styles.bannerBtn, { backgroundColor: driftStatus.bgColor }]}>
                <Text style={[styles.bannerBtnText, { color: driftStatus.color }]}>처방전</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          /* ====== Section 6: Empty State ====== */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="pie-chart-outline" size={56} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>포트폴리오를 시작하세요</Text>
            <Text style={styles.emptyDesc}>
              증권사 앱 스크린샷을 캡처하면{'\n'}AI가 자동으로 자산을 등록해요
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleOCR}>
              <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>자산 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.lg, paddingBottom: 100 },

  // Section 1: 인사 + 시장 날씨
  greetingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.xl,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sentimentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SIZES.rMd,
    gap: 4,
  },
  cameraText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },

  // Section 2: Pulse Hero 카드
  pulseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rXl,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  pulseLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  pulseValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  pnlRow: {
    marginTop: 4,
    marginBottom: SIZES.lg,
  },
  pnlText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pulseActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pulseActionBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
  },
  diagnosisBtn: {},
  pulseActionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  pulseScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseScore: {
    fontSize: 20,
    fontWeight: '800',
  },
  scoreGradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scoreGradeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  diagnosisArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Section 3: 오늘의 시그널
  signalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rXl,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  signalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  signalCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 10,
  },
  signalTicker: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    width: 55,
  },
  signalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  signalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  signalDesc: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Section 4: 활성 자산
  holdingsSection: {
    marginBottom: SIZES.lg,
  },
  holdingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  holdingsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  holdingsCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  holdingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: SIZES.rLg,
    marginBottom: 8,
  },
  holdingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  holdingIconText: {
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 16,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingTicker: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  holdingQuantity: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  holdingPnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  holdingPnl: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniSignalBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniSignalText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // Section 5: 리밸런싱 배너
  rebalanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rXl,
    padding: SIZES.lg,
    borderWidth: 1,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bannerIcon: {
    fontSize: 24,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  bannerDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bannerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Section 6: Empty State
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rXl,
    padding: 40,
    alignItems: 'center',
    marginTop: SIZES.xl,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(76,175,80,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
