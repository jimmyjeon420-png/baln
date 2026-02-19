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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DiagnosisSkeletonLoader } from '../../src/components/SkeletonLoader';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { useSharedAnalysis } from '../../src/hooks/useSharedAnalysis';
import { usePeerPanicScore, getAssetBracket } from '../../src/hooks/usePortfolioSnapshots';
import { calculateHealthScore, DALIO_TARGET, BUFFETT_TARGET, CATHIE_WOOD_TARGET, KOSTOLANY_TARGETS, DEFAULT_TARGET } from '../../src/services/rebalanceScore';
import type { AssetCategory } from '../../src/services/rebalanceScore';
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
import supabase, { getCurrentUser } from '../../src/services/supabase';

// ── 단일 통합 뷰 컴포넌트 (P2-A) ──
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

// ── 분석 탭 진단 함수 (맥박 버튼) ──

async function runAnalysisDiagnostic() {
  const results: string[] = [];
  const startTotal = Date.now();

  // [이승건: 캐시 무효화 단축키 추가]
  // 맥박 버튼 2초 길게 누르면 캐시 삭제

  // 1. Supabase raw fetch 테스트 (SDK 우회)
  try {
    const t1 = Date.now();
    const res = await Promise.race([
      fetch('https://ruqeinfcqhgexrckonsy.supabase.co/rest/v1/', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cWVpbmZjcWhnZXhyY2tvbnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMTE4MDksImV4cCI6MjA4NDc4NzgwOX0.NJmOH_uF59nYaSmjebGMNHlBwvqx5MHIwXOoqzITsXc',
        },
      }),
      new Promise<null>((r) => setTimeout(() => r(null), 5000)),
    ]);
    if (res) {
      results.push(`1. Supabase fetch: ${res.status} (${Date.now() - t1}ms)`);
    } else {
      results.push(`1. Supabase fetch: TIMEOUT 5s`);
    }
  } catch (e: any) {
    results.push(`1. Supabase fetch ERROR: ${e.message}`);
  }

  // 2. Auth 세션 상태
  try {
    const t2 = Date.now();
    const { data } = await supabase.auth.getSession();
    const hasSession = !!data?.session;
    const token = data?.session?.access_token;
    let expInfo = 'no token';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        expInfo = exp > now ? `valid (${exp - now}s left)` : `EXPIRED (${now - exp}s ago)`;
      } catch { expInfo = 'parse error'; }
    }
    results.push(`2. Auth: ${hasSession ? 'OK' : 'NO'} / ${expInfo} (${Date.now() - t2}ms)`);
  } catch (e: any) {
    results.push(`2. Auth ERROR: ${e.message}`);
  }

  // 2.5. DB 직접 조회: daily_market_insights (이승건: 데이터가 실제로 있는지 확인)
  try {
    const t25 = Date.now();
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayKST = kst.toISOString().split('T')[0];
    const { data: dbData, error: dbError } = await supabase
      .from('daily_market_insights')
      .select('date, market_sentiment, macro_summary')
      .eq('date', todayKST)
      .single();

    if (dbError) {
      results.push(`2.5. DB 조회 (${todayKST}): ERROR ${dbError.message} (${Date.now() - t25}ms)`);
    } else if (dbData) {
      const isMacroString = typeof dbData.macro_summary === 'string';
      const title = isMacroString
        ? (JSON.parse(dbData.macro_summary as string))?.title || 'NO TITLE'
        : (dbData.macro_summary as any)?.title || 'NO TITLE';
      results.push(`2.5. DB 조회 (${todayKST}): ✅ ${dbData.market_sentiment} "${title}" ${isMacroString ? '(문자열)' : '(객체)'} (${Date.now() - t25}ms)`);
    } else {
      results.push(`2.5. DB 조회 (${todayKST}): 데이터 없음 (${Date.now() - t25}ms)`);
    }
  } catch (e: any) {
    results.push(`2.5. DB 조회 ERROR: ${e.message}`);
  }

  // 3. Gemini 프록시 Edge Function 헬스 체크
  try {
    const t3 = Date.now();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const res = await Promise.race([
      fetch('https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/gemini-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || ''}`,
        },
        body: JSON.stringify({ type: 'health-check' }),
      }),
      new Promise<null>((r) => setTimeout(() => r(null), 15000)),
    ]);
    if (res) {
      const json = await res.json().catch(() => null);
      const hc = json?.data;
      if (hc?.geminiApi === 'OK') {
        results.push(`3. Gemini proxy: OK ✅ API실제호출 성공 (${Date.now() - t3}ms)`);
      } else if (hc?.geminiApi) {
        results.push(`3. Gemini proxy: ⚠️ ${hc.geminiApi} ${hc.geminiError?.substring(0, 60) || ''} (${Date.now() - t3}ms)`);
      } else {
        results.push(`3. Gemini proxy: ${res.status} (${Date.now() - t3}ms) ${JSON.stringify(json).substring(0, 60)}`);
      }
    } else {
      results.push(`3. Gemini proxy: TIMEOUT 8s`);
    }
  } catch (e: any) {
    results.push(`3. Gemini proxy ERROR: ${e.message}`);
  }

  // 4. 포트폴리오 데이터 존재 여부
  try {
    const t4 = Date.now();
    const user = await getCurrentUser();
    if (!user) {
      results.push(`4. Portfolio: user=NULL (${Date.now() - t4}ms)`);
    } else {
      const { data: portfolioData, error } = await Promise.race([
        supabase
          .from('portfolios')
          .select('id, name')
          .eq('user_id', user.id)
          .limit(10),
        new Promise<{ data: null; error: { message: string } }>((r) =>
          setTimeout(() => r({ data: null, error: { message: 'TIMEOUT 5s' } }), 5000)
        ),
      ]) as any;
      if (error) {
        results.push(`4. Portfolio: ERROR ${error.message} (${Date.now() - t4}ms)`);
      } else {
        const count = portfolioData?.length ?? 0;
        const names = (portfolioData || []).slice(0, 3).map((p: any) => p.name).join(', ');
        results.push(`4. Portfolio: ${count}개 [${names}${count > 3 ? '...' : ''}] (${Date.now() - t4}ms)`);
      }
    }
  } catch (e: any) {
    results.push(`4. Portfolio ERROR: ${e.message}`);
  }

  // 4.5. loadMorningBriefing() 실제 호출 테스트 (이승건: 근본 원인 파악)
  try {
    const t45 = Date.now();
    // 포트폴리오 데이터 가져오기
    const user = await getCurrentUser();
    if (!user) {
      results.push(`4.5. loadMorningBriefing: user=NULL`);
    } else {
      const { data: portfolioData } = await supabase
        .from('portfolios')
        .select('ticker, name, quantity, avg_price, current_price, current_value')
        .eq('user_id', user.id)
        .limit(10);

      const testPortfolio = (portfolioData || []).map((p: any) => ({
        ticker: p.ticker,
        name: p.name,
        quantity: p.quantity || 0,
        avgPrice: p.avg_price || 0,
        currentPrice: p.current_price || 0,
        currentValue: p.current_value || 0,
      }));

      const { loadMorningBriefing } = await import('../../src/services/centralKitchen');
      const result = await loadMorningBriefing(testPortfolio);
      const hasBriefing = !!result.morningBriefing;
      const hasTitle = !!result.morningBriefing?.macroSummary?.title;
      const title = result.morningBriefing?.macroSummary?.title || 'NO TITLE';
      results.push(`4.5. loadMorningBriefing: ${hasBriefing ? '✅' : '❌'} title=${hasTitle ? `"${title}"` : 'MISSING'} source=${result.source} (${Date.now() - t45}ms)`);
    }
  } catch (e: any) {
    results.push(`4.5. loadMorningBriefing ERROR: ${e.message?.substring(0, 60)}`);
  }

  // 5. 클라이언트 Gemini SDK 직접 테스트 (딥다이브/리스크 분석에서 사용)
  try {
    const t5 = Date.now();
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    const model = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3-flash-preview';
    if (!apiKey) {
      results.push(`5. Gemini SDK: NO API KEY`);
    } else {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const testRes = await Promise.race([
        fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reply OK' }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }),
        new Promise<null>((r) => setTimeout(() => r(null), 10000)),
      ]);
      if (!testRes) {
        results.push(`5. Gemini SDK: TIMEOUT 10s`);
      } else if (testRes.ok) {
        const json = await testRes.json();
        const txt = json?.candidates?.[0]?.content?.parts?.[0]?.text || 'empty';
        results.push(`5. Gemini SDK: OK "${txt.substring(0, 20)}" (${Date.now() - t5}ms)`);
      } else {
        const errText = await testRes.text().catch(() => '');
        results.push(`5. Gemini SDK: ERROR ${testRes.status} ${errText.substring(0, 80)} (${Date.now() - t5}ms)`);
      }
    }
  } catch (e: any) {
    results.push(`5. Gemini SDK ERROR: ${e.message?.substring(0, 80)}`);
  }

  const totalMs = Date.now() - startTotal;
  Alert.alert('분석 탭 진단', results.join('\n') + `\n\n총: ${totalMs}ms`);
}

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

  // 저장된 구루 철학 로드 → 건강 점수 계산 기준 목표 배분
  const [philosophyTarget, setPhilosophyTarget] = useState<Record<AssetCategory, number>>(DEFAULT_TARGET);

  const loadPhilosophyTarget = useCallback(() => {
    Promise.all([
      AsyncStorage.getItem('@investment_philosophy'),
      AsyncStorage.getItem('@baln:guru_style'),
    ]).then(([storedPhil, guruStyle]) => {
      // 우선순위: @baln:guru_style > @investment_philosophy > 'dalio'
      const guruPhils = ['dalio', 'buffett', 'cathie_wood', 'kostolany'];
      let phil: string | null = null;
      if (guruStyle && guruPhils.includes(guruStyle)) phil = guruStyle;
      if (!phil) phil = storedPhil === 'consensus' ? 'dalio' : storedPhil;
      if (!phil) phil = 'dalio';

      const targetMap: Record<string, Record<AssetCategory, number>> = {
        dalio: DALIO_TARGET,
        buffett: BUFFETT_TARGET,
        cathie_wood: CATHIE_WOOD_TARGET,
      };
      setPhilosophyTarget(targetMap[phil] ?? DEFAULT_TARGET);
    });
  }, []);

  // 초기 마운트 시 로드
  useEffect(() => { loadPhilosophyTarget(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 분석 탭 포커스 시 재로드 — 전체 탭에서 구루 변경 후 돌아왔을 때 건강점수 즉시 반영
  useFocusEffect(useCallback(() => { loadPhilosophyTarget(); }, [loadPhilosophyTarget]));

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
  // philosophyTarget: 저장된 구루 철학(달리오/버핏/캐시우드)의 목표 배분 기준으로 이탈도 계산
  const healthScore = useMemo(
    () => calculateHealthScore(allAssets, totalAssets, philosophyTarget),
    [allAssets, totalAssets, philosophyTarget],
  );

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

      {/* 진단 헤더 (맥박 버튼) */}
      <View style={s.diagnosticHeader}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={runAnalysisDiagnostic} style={s.diagnosticButton}>
          <Ionicons name="pulse-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

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

        {/* ══ 단일 통합 뷰 (P2-A: 레벨 시스템 제거) ══ */}
        {hasAssets && (
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
            onTargetUpdate={setPhilosophyTarget}
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
  diagnosticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 0,
  },
  diagnosticButton: {
    padding: 6,
  },
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
