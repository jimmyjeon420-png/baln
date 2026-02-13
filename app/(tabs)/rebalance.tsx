/**
 * rebalance.tsx - 처방전 탭
 *
 * Anti-Toss 적용 (Phase 6):
 * - Gateway: 건강 점수 + 오늘의 액션 + AI 제안 (핵심 3개)
 * - 빼기 전략: 복잡한 차트/표 제거, 텍스트 중심
 * - One Page One Card: 각 섹션 접을 수 있도록
 *
 * [아키텍처] 3탭 구조 전환
 * 기존 diagnosis.tsx + rebalance.tsx 통합 → 한 화면에서 진단+처방+실행
 *
 * 섹션 구성:
 * 1. CheckupHeader — 진단 요약 + 건강 등급 뱃지
 * 2. HealthScoreSection — 6팩터 건강 점수
 * 3. AllocationDriftSection — 배분 이탈도 (목표 vs 현재)
 * 4. TodayActionsSection — 처방전 액션 (BUY/SELL/WATCH)
 * 5. RiskDashboardSection — Panic Shield + FOMO Vaccine
 * 6. AIAnalysisCTA — AI 심화분석 유도 카드
 * 7. 면책 문구
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  AppState,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DiagnosisSkeletonLoader } from '../../src/components/SkeletonLoader';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { useSharedAnalysis } from '../../src/hooks/useSharedAnalysis';
import { usePeerPanicScore, getAssetBracket } from '../../src/hooks/usePortfolioSnapshots';
import { calculateHealthScore } from '../../src/services/rebalanceScore';
import FreePeriodBanner from '../../src/components/FreePeriodBanner';
import { usePrices } from '../../src/hooks/usePrices';
import { AssetType } from '../../src/types/asset';
import { useScreenTracking } from '../../src/hooks/useAnalytics';
import { useCheckupLevel } from '../../src/hooks/useCheckupLevel';
import { useHoldingPeriod } from '../../src/hooks/useHoldingPeriod';
import { useEmotionCheck } from '../../src/hooks/useEmotionCheck';
import { useTheme } from '../../src/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DisclaimerBanner from '../../src/components/common/DisclaimerBanner';

// ── 레벨별 뷰 컴포넌트 ──
import BeginnerCheckupView from '../../src/components/checkup/BeginnerCheckupView';
import IntermediateCheckupView from '../../src/components/checkup/IntermediateCheckupView';
import AdvancedCheckupView from '../../src/components/checkup/AdvancedCheckupView';


// 새로고침 완료 토스트 (페이드인/아웃)
function RefreshToast({ visible }: { visible: boolean }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.delay(1500),
        RNAnimated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <RNAnimated.View style={[toastStyles.container, { opacity }]}>
      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
      <Text style={toastStyles.text}>최신 데이터로 갱신됨</Text>
    </RNAnimated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,20,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
  },
  text: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
});

// 포그라운드 복귀 자동 갱신 최소 간격 (5분)
const AUTO_REFRESH_THRESHOLD = 5 * 60 * 1000;

// ── 티어 계산 ──
function getTierInfo(totalAssets: number): { label: string; color: string } {
  const assets = totalAssets / 100000000; // 억 단위 변환
  if (assets >= 3) return { label: 'DIAMOND', color: '#64B5F6' };
  if (assets >= 1.5) return { label: 'PLATINUM', color: '#9E9E9E' };
  if (assets >= 1) return { label: 'GOLD', color: '#FFC107' };
  return { label: 'SILVER', color: '#B0BEC5' };
}

// ── 날짜 포맷팅 ──
function formatTodayDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[now.getDay()];
  return `${month}월 ${day}일 ${weekday}요일`;
}

const DISCLAIMER_STORAGE_KEY = '@baln:disclaimer_dismissed';

export default function CheckupScreen() {
  useScreenTracking('checkup');
  const router = useRouter();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const lastRefreshRef = useRef(Date.now());
  const toastKeyRef = useRef(0);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(true); // 기본 숨김 → 로드 후 표시

  // AsyncStorage에서 면책 배너 해제 여부 확인
  useEffect(() => {
    AsyncStorage.getItem(DISCLAIMER_STORAGE_KEY).then((value) => {
      setDisclaimerDismissed(value === 'true');
    });
  }, []);

  // ══════════════════════════════════════════
  // 데이터 수집 (공유 훅)
  // ══════════════════════════════════════════

  const {
    assets: allAssets,
    portfolioAssets: portfolio,
    totalAssets,
    isLoading: portfolioLoading,
    isFetched: initialCheckDone,
    isError: portfolioError,
    hasAssets,
    refresh: refreshPortfolio,
  } = useSharedPortfolio();

  const {
    morningBriefing,
    riskAnalysis: analysisResult,
    isFetched: analysisReady,
    refresh: refreshAnalysis,
  } = useSharedAnalysis(portfolio);

  // ── 레벨별 뷰 (초급/중급/고급) ──
  const { level, isLoading: levelLoading, setLevel } = useCheckupLevel();
  const { label: holdingLabel } = useHoldingPeriod();
  const {
    todayEmotion,
    todayMemo,
    setEmotion,
    setMemo,
    saveEmotionWithMemo,
    rewardCredits: emotionRewardCredits,
  } = useEmotionCheck();

  const myBracket = getAssetBracket(totalAssets);
  const { data: peerPanicData } = usePeerPanicScore(myBracket);

  // ── 투자원금 대비 총 수익 (주 지표) ──
  // 평단가 × 수량 = 원금, 현재가 × 수량 = 평가금액
  const { totalCostBasis, totalGainLoss, gainPercent } = useMemo(() => {
    let costBasis = 0;
    let marketValue = 0;
    for (const asset of allAssets) {
      const qty = asset.quantity ?? 0;
      const avg = asset.avgPrice ?? 0;
      const cur = asset.currentPrice ?? 0;
      if (qty > 0 && avg > 0) {
        costBasis += qty * avg;
        marketValue += qty * cur;
      } else {
        // 평단가 없는 자산 (부동산 등) → 수익률 계산 불가, 중립 처리
        costBasis += asset.currentValue;
        marketValue += asset.currentValue;
      }
    }
    const gl = marketValue - costBasis;
    const pct = costBasis > 0 ? (gl / costBasis) * 100 : 0;
    return { totalCostBasis: costBasis, totalGainLoss: gl, gainPercent: pct };
  }, [allAssets]);


  const onRefresh = useCallback(async (showRefreshToast = true) => {
    setRefreshing(true);
    await Promise.all([refreshPortfolio(), refreshAnalysis()]);
    lastRefreshRef.current = Date.now();
    setRefreshing(false);
    if (showRefreshToast) {
      toastKeyRef.current += 1;
      setShowToast(false);
      // 약간의 딜레이 후 토스트 표시 (상태 리셋 보장)
      setTimeout(() => setShowToast(true), 50);
    }
  }, [refreshPortfolio, refreshAnalysis]);

  // 포그라운드 복귀 시 5분 이상 경과하면 자동 갱신
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const elapsed = Date.now() - lastRefreshRef.current;
        if (elapsed >= AUTO_REFRESH_THRESHOLD) {
          onRefresh(true);
        }
      }
    });
    return () => sub.remove();
  }, [onRefresh]);

  // ══════════════════════════════════════════
  // 파생 데이터 (Hook은 반드시 early return 위에 위치해야 함)
  // ══════════════════════════════════════════

  // 6팩터 건강 점수 (순수 함수, AI 미사용, 즉시 계산)
  const healthScore = useMemo(() => calculateHealthScore(allAssets, totalAssets), [allAssets, totalAssets]);

  // 액션 정렬: HIGH → MEDIUM → LOW, SELL/WATCH → BUY → HOLD
  const sortedActions = useMemo(() =>
    [...(morningBriefing?.portfolioActions ?? [])].sort((a, b) => {
      const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const actionOrder: Record<string, number> = { SELL: 0, WATCH: 1, BUY: 2, HOLD: 3 };
      const pDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return (actionOrder[a.action] ?? 3) - (actionOrder[b.action] ?? 3);
    }),
  [morningBriefing]);

  // 오늘의 액션 종목: 실시간 가격 조회
  const priceTargets = useMemo(() => {
    if (sortedActions.length === 0) return [];
    const seen = new Set<string>();
    return sortedActions
      .filter(a => {
        if (!a.ticker || seen.has(a.ticker)) return false;
        seen.add(a.ticker);
        return true;
      })
      .map(a => ({
        id: a.ticker,
        name: a.name || a.ticker,
        ticker: a.ticker,
        currentValue: 0,
        targetAllocation: 0,
        createdAt: Date.now(),
        assetType: AssetType.LIQUID,
      }));
  }, [sortedActions]);

  const { prices: livePrices } = usePrices(priceTargets, {
    currency: 'KRW',
    autoRefreshMs: 300000,
  });

  // Panic Shield 점수
  const panicScore = analysisResult?.panicShieldIndex;

  // 히어로 섹션 데이터
  const tierInfo = getTierInfo(totalAssets);
  const dateString = formatTodayDate();
  const cfoWeather = morningBriefing?.cfoWeather || null;

  // ══════════════════════════════════════════
  // 로딩 / 빈 상태
  // ══════════════════════════════════════════

  // [이승건 원칙] "스켈레톤은 첫 방문만"
  // 영속 캐시에 데이터가 있으면 스켈레톤 스킵 → 이전 데이터 즉시 표시
  const hasCachedData = allAssets.length > 0 || totalAssets > 0;
  const isPortfolioLoading = !initialCheckDone || (portfolioLoading && !hasCachedData);
  const isAILoading = hasAssets && !analysisReady;
  const analysisFailed = analysisReady && hasAssets && !morningBriefing && !analysisResult;

  if (isPortfolioLoading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScrollView><DiagnosisSkeletonLoader /></ScrollView>
      </SafeAreaView>
    );
  }

  if (initialCheckDone && totalAssets === 0 && portfolio.length === 0) {
    // 네트워크 에러로 데이터를 못 가져온 경우 vs 실제로 자산이 없는 경우 구분
    const isNetworkIssue = portfolioError;
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={s.emptyContainer}>
          <View style={s.emptyIcon}>
            <Ionicons
              name={isNetworkIssue ? 'cloud-offline-outline' : 'analytics-outline'}
              size={48}
              color={isNetworkIssue ? '#FF9800' : '#4CAF50'}
            />
          </View>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>
            {isNetworkIssue ? '데이터를 불러올 수 없습니다' : '포트폴리오를 등록해주세요'}
          </Text>
          <Text style={s.emptyDesc}>
            {isNetworkIssue
              ? 'WiFi 연결을 확인하고\n아래 버튼을 눌러 다시 시도해주세요'
              : <>보유 자산을 등록하시면{'\n'}<Text style={{ color: '#4CAF50', fontWeight: '700' }}>AI 진단 + 맞춤 처방전</Text>을 받아보실 수 있습니다</>
            }
          </Text>
          {isNetworkIssue ? (
            <TouchableOpacity style={[s.emptyButton, { backgroundColor: '#FF9800' }]} onPress={() => refreshPortfolio()}>
              <Ionicons name="refresh" size={20} color="#000" />
              <Text style={s.emptyButtonText}>다시 시도</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.emptyButton} onPress={() => router.push('/add-asset')}>
              <Ionicons name="add-circle" size={20} color="#000" />
              <Text style={s.emptyButtonText}>자산 등록하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════
  // 렌더 — 분석 탭 섹션 구성
  // ══════════════════════════════════════════

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 새로고침 완료 토스트 */}
      <RefreshToast key={toastKeyRef.current} visible={showToast} />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => onRefresh(true)} tintColor="#4CAF50" />}
      >

        {/* 무료 기간 배너 */}
        <View style={s.freeBannerWrap}>
          <FreePeriodBanner compact={true} />
        </View>

        {/* 면책 고지 배너 */}
        {!disclaimerDismissed && (
          <View style={s.disclaimerBannerWrap}>
            <DisclaimerBanner
              message="본 서비스는 투자 자문이 아닙니다. AI 분석 결과는 참고 자료이며, 투자 결정에 대한 책임은 사용자에게 있습니다."
              type="legal"
              dismissible
              onDismiss={() => {
                setDisclaimerDismissed(true);
                AsyncStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true');
              }}
            />
          </View>
        )}

        {/* AI 로딩 배너 */}
        {isAILoading && (
          <View style={s.aiLoadingBanner}>
            <View style={s.aiLoadingDot} />
            <Text style={s.aiLoadingText}>AI가 포트폴리오를 분석하고 있습니다...</Text>
          </View>
        )}

        {/* AI 분석 실패 */}
        {analysisFailed && (
          <View style={s.aiErrorBanner}>
            <Ionicons name="alert-circle" size={16} color="#CF6679" />
            <Text style={s.aiErrorText}>AI 분석 실패</Text>
            <TouchableOpacity onPress={() => onRefresh(true)} style={s.aiRetryButton}>
              <Text style={s.aiRetryText}>재시도</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══ 레벨별 뷰 전환 ══ */}
        {hasAssets && level === 'beginner' && (
          <BeginnerCheckupView
            healthScore={healthScore}
            morningBriefing={morningBriefing}
            totalGainLoss={totalGainLoss}
            cfoWeather={cfoWeather}
            isAILoading={isAILoading}
            allAssets={allAssets}
            todayEmotion={todayEmotion}
            todayMemo={todayMemo}
            onEmotionSelect={setEmotion}
            onMemoChange={setMemo}
            onEmotionSave={saveEmotionWithMemo}
            emotionRewardCredits={emotionRewardCredits}
            onLevelChange={setLevel}
          />
        )}

        {hasAssets && level === 'intermediate' && (
          <IntermediateCheckupView
            healthScore={healthScore}
            allAssets={allAssets}
            totalAssets={totalAssets}
            morningBriefing={morningBriefing}
            analysisResult={analysisResult}
            sortedActions={sortedActions}
            portfolio={portfolio}
            livePrices={livePrices}
            isAILoading={isAILoading}
            peerPanicData={peerPanicData}
            totalGainLoss={totalGainLoss}
            cfoWeather={cfoWeather}
            todayEmotion={todayEmotion}
            todayMemo={todayMemo}
            onEmotionSelect={setEmotion}
            onMemoChange={setMemo}
            onEmotionSave={saveEmotionWithMemo}
            emotionRewardCredits={emotionRewardCredits}
            onLevelChange={setLevel}
          />
        )}

        {hasAssets && level === 'advanced' && (
          <AdvancedCheckupView
            healthScore={healthScore}
            allAssets={allAssets}
            totalAssets={totalAssets}
            morningBriefing={morningBriefing}
            analysisResult={analysisResult}
            sortedActions={sortedActions}
            portfolio={portfolio}
            livePrices={livePrices}
            isAILoading={isAILoading}
            peerPanicData={peerPanicData}
            dateString={dateString}
            tierLabel={tierInfo.label}
            tierColor={tierInfo.color}
            totalGainLoss={totalGainLoss}
            gainPercent={gainPercent}
            cfoWeather={cfoWeather}
            panicScore={panicScore}
            holdingLabel={holdingLabel}
            todayEmotion={todayEmotion}
            todayMemo={todayMemo}
            onEmotionSelect={setEmotion}
            onMemoChange={setMemo}
            onEmotionSave={saveEmotionWithMemo}
            emotionRewardCredits={emotionRewardCredits}
            onLevelChange={setLevel}
          />
        )}

        {/* AI 심화 분석 도구 */}
        <View style={s.aiSection}>
          <Text style={[s.aiSectionTitle, { color: colors.textPrimary }]}>
            🤖 AI 심화 분석
          </Text>
          <Text style={[s.aiSectionSubtitle, { color: colors.textTertiary }]}>
            더 깊은 인사이트가 필요하신가요?
          </Text>

          <View style={s.aiButtonList}>
            {/* 종목 딥다이브 */}
            <TouchableOpacity
              onPress={() => router.push('/analysis/deep-dive')}
              style={[s.aiButton, { backgroundColor: colors.surface }]}
            >
              <Text style={s.aiButtonEmoji}>📈</Text>
              <View style={s.aiButtonTextWrap}>
                <Text style={[s.aiButtonTitle, { color: colors.textPrimary }]}>
                  종목 딥다이브
                </Text>
                <Text style={[s.aiButtonDesc, { color: colors.textSecondary }]}>
                  개별 주식 심층 분석
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* What-If 시뮬레이션 */}
            <TouchableOpacity
              onPress={() => router.push('/analysis/what-if')}
              style={[s.aiButton, { backgroundColor: colors.surface }]}
            >
              <Text style={s.aiButtonEmoji}>🧪</Text>
              <View style={s.aiButtonTextWrap}>
                <Text style={[s.aiButtonTitle, { color: colors.textPrimary }]}>
                  What-If 시뮬레이션
                </Text>
                <Text style={[s.aiButtonDesc, { color: colors.textSecondary }]}>
                  시장 폭락 시나리오 테스트
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* 세금 리포트 */}
            <TouchableOpacity
              onPress={() => router.push('/analysis/tax-report')}
              style={[s.aiButton, { backgroundColor: colors.surface }]}
            >
              <Text style={s.aiButtonEmoji}>🧾</Text>
              <View style={s.aiButtonTextWrap}>
                <Text style={[s.aiButtonTitle, { color: colors.textPrimary }]}>
                  세금 리포트
                </Text>
                <Text style={[s.aiButtonDesc, { color: colors.textSecondary }]}>
                  절세 전략 제안
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* AI 버핏과 티타임 */}
            <TouchableOpacity
              onPress={() => router.push('/analysis/cfo-chat')}
              style={[s.aiButton, { backgroundColor: colors.surface }]}
            >
              <Text style={s.aiButtonEmoji}>☕</Text>
              <View style={s.aiButtonTextWrap}>
                <Text style={[s.aiButtonTitle, { color: colors.textPrimary }]}>
                  AI 버핏과 티타임
                </Text>
                <Text style={[s.aiButtonDesc, { color: colors.textSecondary }]}>
                  실시간 대화형 조언
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 면책 문구 */}
        <View style={s.disclaimerBox}>
          <Text style={s.disclaimer}>
            본 서비스는 금융위원회에 등록된 투자자문업·투자일임업이 아니며, 제공되는 정보는 투자 권유가 아닙니다. AI 분석 결과는 과거 데이터 기반이며 미래 수익을 보장하지 않습니다. 투자 원금의 일부 또는 전부를 잃을 수 있으며, 투자 결정은 전적으로 본인의 판단과 책임 하에 이루어져야 합니다. 본 서비스는 예금자보호법에 따른 보호 대상이 아닙니다.
          </Text>
        </View>

        <View style={s.bottomSpacer} />
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
    // backgroundColor는 동적으로 적용됨
  },
  scroll: {
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    // color는 동적으로 적용됨 (라이트: 어두운 텍스트, 다크: 밝은 텍스트)
    marginBottom: 12,
  },
  emptyDesc: {
    fontSize: 15,
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  aiLoadingBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontWeight: '600',
  },
  aiErrorBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    backgroundColor: 'rgba(207, 102, 121, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(207, 102, 121, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiErrorText: {
    fontSize: 13,
    color: '#CF6679',
    fontWeight: '600',
    flex: 1,
  },
  aiRetryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(207, 102, 121, 0.2)',
    borderRadius: 8,
  },
  aiRetryText: {
    fontSize: 12,
    color: '#CF6679',
    fontWeight: '600',
  },
  disclaimerBox: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(255, 193, 7, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  disclaimer: {
    fontSize: 11,
    color: '#9E9E9E',
    lineHeight: 16,
  },
  // ── AI 심화 분석 섹션 (인라인 스타일 → StyleSheet 추출) ──
  freeBannerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  disclaimerBannerWrap: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 100,
  },
  aiSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  aiSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  aiSectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  aiButtonList: {
    gap: 12,
  },
  aiButton: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiButtonEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  aiButtonTextWrap: {
    flex: 1,
  },
  aiButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  aiButtonDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
