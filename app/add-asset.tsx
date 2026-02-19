/**
 * add-asset.tsx — 자산 추가 화면 (30초 등록 UX)
 *
 * 역할: "자산 등록 창구"
 * - OCR 제거, 수동 입력 극도로 편리하게 설계
 * - 종목 검색 자동완성 (한글/영문/티커 모두 지원)
 * - 현재가 자동 로드 (Yahoo Finance + CoinGecko)
 * - 최근 추가 종목 빠른 재추가
 * - 유동자산 (주식·ETF·크립토) 수정/삭제
 *
 * 이승건(토스 CEO): "OCR이 1번이라도 틀리면 앱 전체 신뢰를 잃는다"
 * → 결론: 수동 입력을 극도로 편하게 만든다
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  InputAccessoryView,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';

import supabase, { getCurrentUser } from '../src/services/supabase';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/hooks/useTheme';
import { searchStocks, StockItem, getCategoryLabel, getCategoryColor } from '../src/data/stockList';
import { priceService } from '../src/services/PriceService';
import { AssetClass, PriceData } from '../src/types/price';
import { fetchExchangeRate } from '../src/services/stockDataService';
import { SHARED_PORTFOLIO_KEY } from '../src/hooks/useSharedPortfolio';
import { grantAssetRegistrationReward, REWARD_AMOUNTS } from '../src/services/rewardService';
import { classifyTicker } from '../src/services/gemini';
import { getTickerProfile } from '../src/data/tickerProfile';

// ── 상수 ──

// 진단 트리거 플래그 키
const NEEDS_DIAGNOSIS_KEY = '@smart_rebalancer:needs_diagnosis';
const LAST_SCAN_DATE_KEY = '@smart_rebalancer:last_scan_date';
// 최근 추가 종목 저장 키
const RECENT_ASSETS_KEY = '@baln:recent_assets';

// ── 타입 ──

interface RecentAsset {
  ticker: string;
  name: string;
  category: StockItem['category'];
}

interface ExistingAsset {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  avg_price: number;
  current_value: number;
}

interface ParsedAsset {
  name: string;
  ticker: string;
  quantity: number;
  totalCostKRW: number;
  currentValueKRW?: number;
}

// ── 유틸리티 ──

/** 타임아웃 래퍼 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

/** 티커에서 자산 클래스 추론 */
function inferAssetClassFromTicker(ticker: string): AssetClass {
  const upper = ticker.toUpperCase();
  if (/^\d{6}(\.KS|\.KQ)?$/i.test(upper) || upper.endsWith('.KS') || upper.endsWith('.KQ')) {
    return AssetClass.STOCK;
  }
  const cryptoKeywords = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK', 'BNB', 'MATIC', 'LTC', 'BCH', 'XLM', 'ATOM', 'UNI', 'AAVE', 'SUSHI', 'NEAR', 'SHIB'];
  if (cryptoKeywords.some(kw => upper.includes(kw))) return AssetClass.CRYPTO;
  const etfKeywords = ['VTI', 'VOO', 'QQQ', 'AGG', 'SPY', 'IVV', 'ARKK', 'GLD', 'VNQ', 'SCHD', 'JEPI', 'SOXL', 'TQQQ', 'VGT', 'EEM', 'TLT', 'SHY', 'BND'];
  if (etfKeywords.some(kw => upper === kw)) return AssetClass.ETF;
  return AssetClass.STOCK;
}

/** 금액 포맷 (한국원) */
function formatKRW(value: number): string {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (value >= 10000) return `${Math.floor(value / 10000).toLocaleString()}만`;
  return `${value.toLocaleString()}`;
}

/** 통화 심볼 추론 */
function getCurrencySymbol(ticker: string): string {
  const upper = ticker.toUpperCase();
  if (/^\d{6}(\.KS|\.KQ)?$/i.test(upper) || upper.endsWith('.KS') || upper.endsWith('.KQ')) {
    return '₩';
  }
  return '$';
}

// ── 진단 함수 (Supabase 연결 테스트) ──

async function runDiagnostic() {
  const results: string[] = [];
  const startTotal = Date.now();

  // 1. raw fetch 테스트 (SDK 우회)
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
      results.push(`1. fetch: ${res.status} (${Date.now() - t1}ms)`);
    } else {
      results.push(`1. fetch: TIMEOUT 5s`);
    }
  } catch (e: any) {
    results.push(`1. fetch ERROR: ${e.message}`);
  }

  // 2. getSession 테스트
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
    results.push(`2. session: ${hasSession ? 'YES' : 'NO'} / ${expInfo} (${Date.now() - t2}ms)`);
  } catch (e: any) {
    results.push(`2. session ERROR: ${e.message}`);
  }

  // 3. DB 쿼리 테스트 (Supabase SDK)
  try {
    const t3 = Date.now();
    const { data, error } = await Promise.race([
      supabase.from('portfolios').select('id').limit(1),
      new Promise<{ data: null; error: { message: string } }>((r) =>
        setTimeout(() => r({ data: null, error: { message: 'SDK TIMEOUT 5s' } }), 5000)
      ),
    ]) as any;
    if (error) {
      results.push(`3. DB query: ERROR ${error.message} (${Date.now() - t3}ms)`);
    } else {
      results.push(`3. DB query: OK rows=${data?.length ?? 0} (${Date.now() - t3}ms)`);
    }
  } catch (e: any) {
    results.push(`3. DB query ERROR: ${e.message}`);
  }

  // 4. getCurrentUser 테스트
  try {
    const t4 = Date.now();
    const u = await getCurrentUser();
    results.push(`4. getCurrentUser: ${u ? u.id.substring(0, 8) + '...' : 'NULL'} (${Date.now() - t4}ms)`);
  } catch (e: any) {
    results.push(`4. getCurrentUser ERROR: ${e.message}`);
  }

  const totalMs = Date.now() - startTotal;
  Alert.alert('진단 결과', results.join('\n') + `\n\n총: ${totalMs}ms`);
}

// ── 메인 컴포넌트 ──

export default function AddAssetScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { user: authUser } = useAuth();

  // --- 자산 유형 탭 ---
  const [assetCategory, setAssetCategory] = useState<'stock' | 'cash' | 'bond'>('stock');
  // 현금 전용 상태
  const [cashType, setCashType] = useState<'CASH_KRW' | 'CASH_USD' | 'CASH_CMA'>('CASH_KRW');
  const [cashAmount, setCashAmount] = useState('');
  const [cashSaving, setCashSaving] = useState(false);

  // --- 검색 상태 ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // --- 선택된 종목 상태 ---
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(''); // 총 매수금액 (원화)

  // --- 배너/스크린샷 상태 ---
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [screenshotParsing, setScreenshotParsing] = useState(false);
  const [parsedAssets, setParsedAssets] = useState<ParsedAsset[] | null>(null);

  // --- 저장 상태 ---
  const [saving, setSaving] = useState(false);
  const savingRef = React.useRef(false); // 이중 탭 방어 (setState보다 빠른 동기적 가드)

  // --- 최근 추가 종목 ---
  const [recentAssets, setRecentAssets] = useState<RecentAsset[]>([]);

  // --- 보유 자산 ---
  const [existingAssets, setExistingAssets] = useState<ExistingAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [authFailed, setAuthFailed] = useState(false); // 인증 실패 → 사용자에게 안내 표시

  // --- 수정 모드 ---
  const [editingAsset, setEditingAsset] = useState<ExistingAsset | null>(null);

  // ─── 초기 로드 ───

  useEffect(() => {
    loadRecentAssets();
    loadExistingAssets();
  }, []);

  // Safety timeout: 10초 후에도 로딩 중이면 강제 종료
  useEffect(() => {
    if (!loadingAssets) return;
    const timer = setTimeout(() => {
      console.warn('[AddAsset] 10초 안전 타임아웃 — 로딩 강제 종료');
      setLoadingAssets(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [loadingAssets]);

  // Safety timeout: 30초 후에도 저장 중이면 강제 종료
  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => {
      console.warn('[AddAsset] 30초 안전 타임아웃 — 저장 강제 종료');
      setSaving(false);
      savingRef.current = false;
      Alert.alert('저장 시간 초과', '저장이 너무 오래 걸리고 있습니다. 네트워크를 확인하고 다시 시도해주세요.');
    }, 30000);
    return () => clearTimeout(timer);
  }, [saving]);

  // 최근 추가 종목 로드
  const loadRecentAssets = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_ASSETS_KEY);
      if (stored) setRecentAssets(JSON.parse(stored));
    } catch (err) {
      console.warn('[AddAsset] 최근 종목 로드 실패:', err);
    }
  };

  // 최근 추가 종목 저장
  const saveRecentAsset = async (stock: StockItem) => {
    try {
      const newRecent: RecentAsset = {
        ticker: stock.ticker,
        name: stock.name,
        category: stock.category,
      };
      // 중복 제거 후 앞에 추가, 최대 5개
      const updated = [newRecent, ...recentAssets.filter(r => r.ticker !== stock.ticker)].slice(0, 5);
      setRecentAssets(updated);
      await AsyncStorage.setItem(RECENT_ASSETS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[AddAsset] 최근 종목 저장 실패:', err);
    }
  };

  // 보유 자산 로드 (AuthContext 유저 우선, 폴백으로 getCurrentUser)
  const loadExistingAssets = async () => {
    try {
      setLoadingAssets(true);
      const user = authUser ?? await getCurrentUser();
      if (!user) {
        console.warn('[AddAsset] 인증 실패 — AuthContext와 getCurrentUser 모두 null');
        setAuthFailed(true);
        setLoadingAssets(false);
        return;
      }
      setAuthFailed(false);

      const { data, error } = await withTimeout(
        supabase
          .from('portfolios')
          .select('id, ticker, name, quantity, avg_price, current_value')
          .eq('user_id', user.id)
          .not('ticker', 'like', 'RE_%')  // 부동산 제외
          .order('current_value', { ascending: false }),
        15000,
        '자산 목록 조회 시간이 초과되었습니다.',
      );

      if (!error && data) {
        setExistingAssets(data);
      }
    } catch (err) {
      console.warn('[AddAsset] 보유 자산 로드 실패:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  // ─── 검색 로직 ───

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const results = searchStocks(searchQuery);
    setSearchResults(results);
    setShowDropdown(results.length > 0);
  }, [searchQuery]);

  // ─── 종목 선택 ───

  const selectStock = useCallback((stock: StockItem) => {
    setSelectedStock(stock);
    setSearchQuery(stock.name);
    setShowDropdown(false);
    setPrice(''); // 총 매수금액은 사용자만 알 수 있으므로 자동 채우기 없음
    Keyboard.dismiss();
  }, []);

  // 최근 종목 탭으로 자동 입력
  const selectRecentAsset = useCallback((recent: RecentAsset) => {
    const stock: StockItem = {
      ticker: recent.ticker,
      name: recent.name,
      nameEn: '',
      category: recent.category,
    };
    selectStock(stock);
  }, [selectStock]);

  // ─── 기존 자산 수정 모드 ───

  const startEditAsset = useCallback((asset: ExistingAsset) => {
    // 검색 데이터에서 찾기
    const found = searchStocks(asset.ticker)[0] || searchStocks(asset.name)[0];
    setSelectedStock(found || {
      ticker: asset.ticker,
      name: asset.name,
      nameEn: '',
      category: 'kr_stock' as const,
    });
    setSearchQuery(asset.name);
    setQuantity(String(asset.quantity || 0));
    setPrice(String(Math.round((asset.quantity || 0) * (asset.avg_price || 0)))); // 총 매수금액
    setEditingAsset(asset);
  }, []);

  // ─── 자산 삭제 ───

  const deleteAsset = useCallback(async (asset: ExistingAsset) => {
    Alert.alert(
      '자산 삭제',
      `"${asset.name}" (${asset.ticker})을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('portfolios')
                .delete()
                .eq('id', asset.id);

              if (error) throw error;

              setExistingAssets(prev => prev.filter(a => a.id !== asset.id));
              // 캐시 무효화
              queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
            } catch (err) {
              Alert.alert('삭제 실패', '자산을 삭제할 수 없습니다. 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  }, [queryClient]);

  // ─── 총 매수금액 (= price state 자체) ───

  const totalValue = useMemo(() => {
    return parseFloat(price) || 0;
  }, [price]);

  // 기존 동일 종목 찾기 (평균 단가 미리 계산 안내용)
  const matchingExisting = useMemo(() => {
    if (!selectedStock) return null;
    return existingAssets.find(
      a => a.ticker === selectedStock.ticker || a.name === selectedStock.name
    ) ?? null;
  }, [selectedStock, existingAssets]);

  // ─── 현금 저장 ───

  const CASH_META: Record<string, { name: string; symbol: string }> = {
    CASH_KRW: { name: '원화 현금', symbol: '₩' },
    CASH_USD: { name: '달러 예금', symbol: '$' },
    CASH_CMA: { name: 'CMA·MMF', symbol: '₩' },
  };

  const handleCashSave = async () => {
    const amount = parseFloat(cashAmount.replace(/,/g, ''));
    if (!amount || amount <= 0) {
      Alert.alert('금액 입력', '보유 금액을 입력해주세요.');
      return;
    }
    if (cashSaving) return;
    setCashSaving(true);
    try {
      const user = authUser ?? await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      let krwAmount = amount;
      // 달러 예금은 환율 변환
      if (cashType === 'CASH_USD') {
        const rate = await fetchExchangeRate().catch(() => 1450);
        krwAmount = Math.round(amount * rate);
      }

      const meta = CASH_META[cashType];
      const upsertData = {
        user_id: user.id,
        ticker: cashType,
        name: meta.name,
        quantity: 1,
        avg_price: krwAmount,
        current_price: krwAmount,
        current_value: krwAmount,
        target_allocation: 0,
        asset_type: 'liquid' as const,
        currency: 'KRW' as const,
      };

      const { error } = await withTimeout(
        supabase
          .from('portfolios')
          .upsert(upsertData, { onConflict: 'user_id,ticker', ignoreDuplicates: false })
          .select(),
        15000,
        '저장 시간이 초과되었습니다.',
      );
      if (error) throw error;

      await AsyncStorage.setItem(NEEDS_DIAGNOSIS_KEY, 'true');
      queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
      await loadExistingAssets();
      setCashAmount('');

      Alert.alert(
        '등록 완료',
        `${meta.name} ₩${krwAmount.toLocaleString()}이(가) 등록되었습니다.`,
        [
          { text: '처방전 보기', onPress: () => router.push('/(tabs)/rebalance') },
          { text: '더 추가하기', style: 'cancel' },
        ],
      );
    } catch (err) {
      Alert.alert('저장 실패', err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setCashSaving(false);
    }
  };

  // ─── 등록 버튼 ───

  const handleSave = async () => {
    // 이중 탭 방어: ref로 동기적으로 체크 (setState는 비동기라 간극 있음)
    if (savingRef.current) return;
    savingRef.current = true;

    if (!selectedStock) {
      savingRef.current = false;
      Alert.alert('종목 선택', '등록할 종목을 먼저 선택해주세요.');
      return;
    }

    const q = parseFloat(quantity);
    const totalCost = price.trim() ? (parseFloat(price) || 0) : 0; // 총 매수금액(KRW)

    if (!q || q <= 0) {
      savingRef.current = false;
      Alert.alert('수량 입력', '보유 수량을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const user = authUser ?? await getCurrentUser();

      if (!user) throw new Error('로그인이 필요합니다. 앱을 재시작하고 다시 로그인해주세요.');

      const ticker = selectedStock.ticker.trim();
      const name = selectedStock.name.trim();

      // 총 매수금액 ÷ 수량 = 평균 단가 (단위 혼동 원천 차단)
      const existing = existingAssets.find(a => a.ticker === ticker || a.name === name);
      let finalQuantity = q;
      let finalAvgPrice = totalCost > 0 && q > 0 ? Math.round(totalCost / q) : 0;

      if (existing && totalCost > 0 && existing.avg_price > 0) {
        // 기존 보유분이 있으면 가중 평균: (기존총액 + 이번총액) / 합산수량
        const existingTotalCost = existing.quantity * existing.avg_price;
        finalQuantity = existing.quantity + q;
        finalAvgPrice = Math.round((existingTotalCost + totalCost) / finalQuantity);
      } else if (existing && totalCost <= 0) {
        // 총액 미입력 시 기존 평단 유지, 수량만 합산
        finalQuantity = existing.quantity + q;
        finalAvgPrice = existing.avg_price;
      }

      // 단가가 0이면 current_value는 0으로 저장 (분석 제한 없음)
      const currentValue = finalAvgPrice > 0 ? finalQuantity * finalAvgPrice : 0;

      // 항상 KRW로 저장 (USD 종목은 selectStock에서 이미 환율 변환됨)
      const currency = 'KRW';

      const upsertData = {
        user_id: user.id,
        ticker,
        name,
        quantity: finalQuantity,
        avg_price: finalAvgPrice,
        current_price: finalAvgPrice,
        current_value: currentValue,
        target_allocation: 0,
        asset_type: 'liquid',
        currency,
      };

      const { data: savedData, error: upsertError } = await withTimeout(
        supabase
          .from('portfolios')
          .upsert(upsertData, {
            onConflict: 'user_id,name',
            ignoreDuplicates: false,
          })
          .select(),
        15000,
        '저장 시간이 초과되었습니다. 다시 시도해주세요.',
      );

      if (upsertError) throw upsertError;

      // 진단 트리거 설정
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(NEEDS_DIAGNOSIS_KEY, 'true');
      await AsyncStorage.setItem(LAST_SCAN_DATE_KEY, today);

      // 미등록 티커 자동 분류 (fire-and-forget — 저장 흐름 블로킹 없음)
      if (ticker && !getTickerProfile(ticker)) {
        classifyTicker(ticker, name).catch(() => {/* 분류 실패 무시 */});
      }

      // 최근 종목 저장
      await saveRecentAsset(selectedStock);

      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });

      // 상태 초기화
      resetForm();

      // 보유 자산 다시 로드
      await loadExistingAssets();

      // 자산 3개 이상 등록 보상 확인
      const updatedCount = existingAssets.length + 1; // 방금 추가한 것 포함
      let rewardMsg = '';
      try {
        const reward = await grantAssetRegistrationReward(updatedCount);
        if (reward.success) {
          rewardMsg = `\n\n🎉 자산 3개 등록 보상 +${REWARD_AMOUNTS.assetRegistration}C (₩${REWARD_AMOUNTS.assetRegistration * 100}) 적립!`;
        }
      } catch (err) {
        console.warn('[AddAsset] 자산 등록 보상 확인 실패:', err);
      }

      const unit = selectedStock.category === 'crypto' ? '개' : '주';
      const valueInfo = currentValue > 0 ? ` (₩${currentValue.toLocaleString()})` : '';
      Alert.alert(
        '등록 완료',
        `${name} ${finalQuantity}${unit}${valueInfo}이(가) 등록되었습니다.${rewardMsg}`,
        [
          {
            text: '처방전 보기',
            onPress: () => router.push('/(tabs)/rebalance'),
          },
          {
            text: '더 추가하기',
            style: 'cancel',
          },
        ],
      );
    } catch (error) {
      console.error('[AddAsset] 저장 실패:', error);
      Alert.alert(
        '저장 실패',
        error instanceof Error ? error.message : '자산 저장 중 오류가 발생했습니다.',
      );
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setSelectedStock(null);
    setSearchQuery('');
    setQuantity('');
    setPrice('');
    setEditingAsset(null);
  };

  // ─── 스크린샷 파싱 ───

  const handleScreenshotParse = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진 접근 권한이 필요합니다. 설정에서 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;

    setScreenshotParsing(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(
        'https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/gemini-proxy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'parse-screenshot',
            data: {
              imageBase64: result.assets[0].base64,
              mimeType: result.assets[0].mimeType || 'image/jpeg',
            },
          }),
        }
      );
      const json = await response.json();
      if (!json.success || !json.data?.assets?.length) {
        Alert.alert('파싱 실패', '자산 정보를 인식하지 못했어요. 다른 스크린샷을 시도해보세요.');
        return;
      }
      setParsedAssets(json.data.assets);
    } catch (err) {
      Alert.alert('오류', '스크린샷 분석 중 오류가 발생했습니다.');
    } finally {
      setScreenshotParsing(false);
    }
  };

  const handleBulkSave = async (assets: ParsedAsset[]) => {
    const user = authUser ?? await getCurrentUser();
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    let successCount = 0;
    for (const asset of assets) {
      try {
        const avgPrice = asset.totalCostKRW > 0 && asset.quantity > 0
          ? Math.round(asset.totalCostKRW / asset.quantity)
          : 0;
        await supabase.from('portfolios').upsert({
          user_id: user.id,
          ticker: asset.ticker,
          name: asset.name,
          quantity: asset.quantity,
          avg_price: avgPrice,
          current_price: avgPrice,
          current_value: asset.totalCostKRW,
          target_allocation: 0,
          asset_type: 'liquid',
          currency: 'KRW',
        }, { onConflict: 'user_id,name', ignoreDuplicates: false });
        successCount++;
      } catch (err) {
        console.warn(`[AddAsset] 일괄 등록 실패 (${asset.name}):`, err);
      }
    }
    setParsedAssets(null);
    queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
    await loadExistingAssets();
    Alert.alert('등록 완료', `${successCount}개 자산이 등록되었습니다.`);
  };

  // ─── 숫자 키보드 "완료" 버튼 (iOS decimal-pad에는 return 키가 없음) ───
  const INPUT_ACCESSORY_ID = 'baln-number-done';

  // ─── 렌더링 ───

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* iOS 숫자 키보드 위에 "완료" 버튼 추가 */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
          <View style={[styles.keyboardToolbar, { backgroundColor: colors.surfaceLight, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => Keyboard.dismiss()}
              style={styles.keyboardDoneButton}
            >
              <Text style={[styles.keyboardDoneText, { color: colors.primary }]}>완료</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>자산 추가</Text>
          <TouchableOpacity onPress={runDiagnostic}>
            <Ionicons name="pulse-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* 부동산 등록 바로가기 */}
        <TouchableOpacity
          style={[styles.realEstateShortcut, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/add-realestate')}
        >
          <View style={[styles.realEstateIcon, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="home" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.realEstateTitle, { color: colors.primary }]}>부동산 자산 등록</Text>
            <Text style={[styles.realEstateDesc, { color: colors.textSecondary }]}>아파트 검색 → 시세 확인 → 포트폴리오 추가</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* ─── 자산 유형 탭 ─── */}
        {!editingAsset && (
          <View style={[styles.assetCategoryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(
              [
                { key: 'stock', label: '주식·ETF·크립토', icon: 'trending-up-outline' },
                { key: 'cash', label: '현금', icon: 'wallet-outline' },
                { key: 'bond', label: '채권', icon: 'document-text-outline' },
              ] as const
            ).map(({ key, label, icon }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.assetCategoryTab,
                  assetCategory === key && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  { borderColor: colors.border },
                ]}
                onPress={() => {
                  setAssetCategory(key);
                  resetForm();
                  setCashAmount('');
                }}
              >
                <Ionicons
                  name={icon}
                  size={14}
                  color={assetCategory === key ? colors.primary : colors.textSecondary}
                />
                <Text style={[
                  styles.assetCategoryTabText,
                  { color: assetCategory === key ? colors.primary : colors.textSecondary },
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ─── 수익률 차이 안내 배너 (주식·ETF·크립토 탭에서만) ─── */}
        {assetCategory === 'stock' && !editingAsset && (
          <TouchableOpacity
            style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setInfoExpanded(v => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.infoBannerHeader}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.infoBannerTitle, { color: colors.textPrimary }]}>
                증권사 수익률과 차이가 나나요?
              </Text>
              <Ionicons
                name={infoExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textSecondary}
              />
            </View>
            {infoExpanded && (
              <View style={styles.infoBannerBody}>
                <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                  {'1. 총 매수금액(원화)을 직접 입력하면 가장 정확합니다\n'}
                  {'2. 환차익/환차손은 실시간으로 반영되지 않아 차이가 생길 수 있어요\n'}
                  {'3. 코인은 거래소 가격과 글로벌 가격이 다를 수 있어요 (김치 프리미엄)'}
                </Text>
                <TouchableOpacity
                  style={[styles.screenshotBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                  onPress={(e) => { e.stopPropagation(); handleScreenshotParse(); }}
                  disabled={screenshotParsing}
                >
                  {screenshotParsing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={15} color={colors.primary} />
                      <Text style={[styles.screenshotBtnText, { color: colors.primary }]}>
                        📸 스크린샷으로 한 번에 입력 (자동 파싱)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ─── 빠른 추가 섹션 ─── */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {editingAsset ? '자산 수정' : assetCategory === 'cash' ? '현금 등록' : assetCategory === 'bond' ? '채권 등록' : '빠른 추가'}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {editingAsset ? '수량과 가격을 수정하세요' : assetCategory === 'cash' ? '보유 현금 금액을 입력하세요' : assetCategory === 'bond' ? '채권 ETF 검색 또는 아래에서 빠르게 선택하세요' : '종목 검색 → 수량 입력 → 등록 (30초)'}
          </Text>

          {/* ─── 현금 전용 UI ─── */}
          {assetCategory === 'cash' && !editingAsset && (
            <View>
              {/* 현금 종류 선택 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>현금 종류</Text>
                <View style={styles.cashTypeRow}>
                  {([
                    { key: 'CASH_KRW', label: '원화 현금', desc: '은행 예금·현금' },
                    { key: 'CASH_USD', label: '달러 예금', desc: '외화 예금·달러' },
                    { key: 'CASH_CMA', label: 'CMA·MMF', desc: '단기 금융 상품' },
                  ] as const).map(({ key, label, desc }) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.cashTypeBtn,
                        cashType === key
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                      ]}
                      onPress={() => setCashType(key)}
                    >
                      <Text style={[styles.cashTypeBtnLabel, { color: cashType === key ? '#fff' : colors.textPrimary }]}>
                        {label}
                      </Text>
                      <Text style={[styles.cashTypeBtnDesc, { color: cashType === key ? 'rgba(255,255,255,0.8)' : colors.textTertiary }]}>
                        {desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 보유 금액 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  보유 금액{cashType === 'CASH_USD' ? ' (달러)' : ' (원화)'}
                </Text>
                <View style={[styles.priceInputRow, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                  <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>
                    {cashType === 'CASH_USD' ? '$' : '₩'}
                  </Text>
                  <TextInput
                    style={[styles.priceInput, { color: colors.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    value={cashAmount}
                    onChangeText={(t) => setCashAmount(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    inputAccessoryViewID={INPUT_ACCESSORY_ID}
                  />
                </View>
                {cashType === 'CASH_USD' && parseFloat(cashAmount) > 0 && (
                  <Text style={[styles.krwPreview, { color: colors.textSecondary }]}>
                    ≈ ₩{Math.round(parseFloat(cashAmount) * 1450).toLocaleString()} (환율 1,450원 기준)
                  </Text>
                )}
              </View>

              {/* 현금 등록 버튼 */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  (!cashAmount || parseFloat(cashAmount) <= 0) && [styles.saveButtonDisabled, { backgroundColor: colors.surfaceLight }],
                ]}
                onPress={handleCashSave}
                disabled={cashSaving || !cashAmount || parseFloat(cashAmount) <= 0}
              >
                {cashSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>현금 등록</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ─── 채권 빠른 선택 ─── */}
          {assetCategory === 'bond' && !editingAsset && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>인기 채권 빠른 선택</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  { ticker: 'TLT', name: '미국 장기국채' },
                  { ticker: 'SHY', name: '미국 단기국채' },
                  { ticker: 'BND', name: '뱅가드채권' },
                  { ticker: 'AGG', name: '미국종합채권' },
                  { ticker: '148070.KS', name: 'KODEX국채3년' },
                  { ticker: '114820.KS', name: 'KODEX단기채권' },
                ].map((bond) => (
                  <TouchableOpacity
                    key={bond.ticker}
                    style={[
                      styles.bondChip,
                      selectedStock?.ticker === bond.ticker
                        ? { backgroundColor: '#64B5F620', borderColor: '#64B5F6' }
                        : { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                    ]}
                    onPress={() => selectStock({
                      ticker: bond.ticker,
                      name: bond.name,
                      nameEn: bond.ticker,
                      category: 'bond',
                    })}
                  >
                    <Text style={[styles.bondChipTicker, { color: '#64B5F6' }]}>{bond.ticker}</Text>
                    <Text style={[styles.bondChipName, { color: colors.textSecondary }]}>{bond.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ─── 주식·ETF·크립토·채권 공통 검색 폼 ─── */}
          {(assetCategory !== 'cash' || editingAsset) && (<>

          {/* 1. 종목 검색 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>종목 검색</Text>
            <View style={[styles.searchContainer, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="삼성전자, NVDA, 비트코인..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (selectedStock && text !== selectedStock.name) {
                    // 사용자가 텍스트를 변경하면 선택 해제
                    setSelectedStock(null);
                    setPrice('');
                  }
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedStock(null);
                    setPrice('');
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* 검색 드롭다운 */}
            {showDropdown && (
              <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.ticker}
                    style={[styles.dropdownItem, { borderBottomColor: colors.surfaceLight }]}
                    onPress={() => selectStock(item)}
                  >
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                      <Text style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}>
                        {getCategoryLabel(item.category)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dropdownName, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[styles.dropdownTicker, { color: colors.textSecondary }]}>{item.ticker}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 검색 결과 없을 때 직접 입력 버튼 */}
            {searchQuery.trim().length > 0 && searchResults.length === 0 && !selectedStock && (
              <TouchableOpacity
                style={[styles.directInputBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                onPress={() => {
                  const ticker = searchQuery.trim().toUpperCase();
                  const manualStock: StockItem = {
                    ticker,
                    name: ticker,
                    nameEn: ticker,
                    category: 'us_stock',
                  };
                  selectStock(manualStock);
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.directInputText, { color: colors.primary }]}>
                  "{searchQuery.trim().toUpperCase()}" 직접 입력
                </Text>
                <Text style={[styles.directInputHint, { color: colors.textTertiary }]}>
                  목록에 없는 종목
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 선택된 종목 정보 뱃지 */}
          {selectedStock && (
            <View style={styles.selectedBadge}>
              <View style={[styles.selectedBadgeDot, { backgroundColor: getCategoryColor(selectedStock.category) }]} />
              <Text style={[styles.selectedBadgeName, { color: colors.textPrimary }]}>{selectedStock.name}</Text>
              <Text style={[styles.selectedBadgeTicker, { color: colors.textSecondary }]}>({selectedStock.ticker})</Text>
            </View>
          )}

          {/* 2. 수량 입력 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>보유 수량</Text>
            <TextInput
              style={[styles.numberInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="예: 100"
              placeholderTextColor={colors.textTertiary}
              value={quantity}
              onChangeText={(text) => setQuantity(text.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              selectTextOnFocus
              inputAccessoryViewID={INPUT_ACCESSORY_ID}
            />
          </View>

          {/* 3. 총 매수금액 (원화) */}
          <View style={styles.inputGroup}>
            <View style={styles.priceLabelRow}>
              <View style={styles.priceLabelGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>총 매수금액 (원화)</Text>
                <Text style={[styles.priceHelp, { color: colors.textTertiary }]}>선택사항 · 입력 시 수익률 계산</Text>
              </View>
            </View>
            <View style={[styles.priceInputRow, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>₩</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.textPrimary }]}
                placeholder="예: 1,500,000 (증권사 총 매수금액)"
                placeholderTextColor={colors.textTertiary}
                value={price}
                onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                selectTextOnFocus
                inputAccessoryViewID={INPUT_ACCESSORY_ID}
              />
            </View>
          </View>

          {/* 기존 보유 종목 추가 시 평균 단가 계산 안내 */}
          {matchingExisting && parseFloat(quantity) > 0 && parseFloat(price) > 0 && (
            <View style={[styles.avgCalcCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Ionicons name="calculator-outline" size={14} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.avgCalcTitle, { color: colors.textPrimary }]}>평균 단가 자동 계산</Text>
                <Text style={[styles.avgCalcDetail, { color: colors.textSecondary }]}>
                  기존 {matchingExisting.quantity}주 평단 ₩{matchingExisting.avg_price.toLocaleString()}
                  {' '}+ 이번 {parseFloat(quantity) || 0}주 총액 ₩{(parseFloat(price) || 0).toLocaleString()}
                </Text>
                <Text style={[styles.avgCalcResult, { color: colors.primary }]}>
                  {(() => {
                    const newQty = matchingExisting.quantity + (parseFloat(quantity) || 0);
                    const existingTotal = matchingExisting.quantity * matchingExisting.avg_price;
                    const newTotal = parseFloat(price) || 0;
                    const newAvg = newQty > 0 ? Math.round((existingTotal + newTotal) / newQty) : 0;
                    return `→ 새 평단 ₩${newAvg.toLocaleString()} (${newQty}주)`;
                  })()}
                </Text>
              </View>
            </View>
          )}

          {/* 4. 총 매수금액 미리보기 */}
          {totalValue > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>총 매수금액</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.totalValue, { color: colors.primary }]}>
                  ₩{totalValue.toLocaleString()}
                </Text>
                {parseFloat(quantity) > 0 && (
                  <Text style={[styles.totalValueKrw, { color: colors.textSecondary }]}>
                    평단 ₩{Math.round(totalValue / (parseFloat(quantity) || 1)).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* 5. 등록 버튼 */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary },
              (!selectedStock || !quantity) && [styles.saveButtonDisabled, { backgroundColor: colors.surfaceLight }],
            ]}
            onPress={handleSave}
            disabled={saving || !selectedStock || !quantity}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name={editingAsset ? 'checkmark-circle' : 'add-circle'} size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {editingAsset ? '수정 완료' : '등록'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* 수정 모드: 취소 버튼 */}
          {editingAsset && (
            <TouchableOpacity
              style={styles.cancelEditButton}
              onPress={resetForm}
            >
              <Text style={[styles.cancelEditText, { color: colors.textSecondary }]}>수정 취소</Text>
            </TouchableOpacity>
          )}
          </>)}
        </View>

        {/* ─── 최근 추가 종목 ─── */}
        {recentAssets.length > 0 && !editingAsset && (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>최근 추가 종목</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
              {recentAssets.map((recent) => (
                <TouchableOpacity
                  key={recent.ticker}
                  style={[styles.recentChip, { backgroundColor: colors.surfaceLight }]}
                  onPress={() => selectRecentAsset(recent)}
                >
                  <View style={[styles.recentDot, { backgroundColor: getCategoryColor(recent.category) }]} />
                  <Text style={[styles.recentChipText, { color: colors.textSecondary }]}>{recent.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── 보유 자산 목록 ─── */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.existingHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>유동자산 목록</Text>
            {existingAssets.length > 0 && (
              <Text style={[styles.assetCount, { color: colors.textSecondary }]}>{existingAssets.length}개</Text>
            )}
          </View>

          {loadingAssets ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>자산 불러오는 중...</Text>
            </View>
          ) : authFailed ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="log-in-outline" size={40} color={colors.error} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>로그인이 필요합니다</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>자산을 불러오려면 로그인해주세요</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadExistingAssets()}
              >
                <Text style={[styles.retryButtonText, { color: colors.primary }]}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          ) : existingAssets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 자산이 없습니다</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>위에서 종목을 검색하여 추가하세요</Text>
            </View>
          ) : (
            existingAssets.map((asset) => (
              <View key={asset.id} style={[styles.assetRow, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.assetInfo}
                  onPress={() => startEditAsset(asset)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.assetName, { color: colors.textPrimary }]}>{asset.name}</Text>
                    <Text style={[styles.assetTicker, { color: colors.textSecondary }]}>{asset.ticker}</Text>
                  </View>
                  <View style={styles.assetValues}>
                    <Text style={[styles.assetValue, { color: colors.textPrimary }]}>
                      {formatKRW(asset.current_value)}
                    </Text>
                    <Text style={[styles.assetQuantity, { color: colors.textSecondary }]}>
                      {asset.quantity}주 / {getCurrencySymbol(asset.ticker)}{(asset.avg_price || 0).toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.assetActions}>
                  <TouchableOpacity
                    style={[styles.editBtn, { backgroundColor: colors.surfaceLight }]}
                    onPress={() => startEditAsset(asset)}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteAsset(asset)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 하단 여백 */}
        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* 스크린샷 파싱 결과 모달 */}
      <Modal
        visible={parsedAssets !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setParsedAssets(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>📸 스크린샷 파싱 결과</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {parsedAssets?.length}개 자산을 인식했어요. 확인 후 등록하세요
            </Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {parsedAssets?.map((asset, i) => (
                <View key={i} style={[styles.parsedAssetRow, { borderBottomColor: colors.border }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.parsedAssetName, { color: colors.textPrimary }]}>
                      {asset.name} ({asset.ticker})
                    </Text>
                    <Text style={[styles.parsedAssetDetail, { color: colors.textSecondary }]}>
                      {asset.quantity}개 · 총 ₩{asset.totalCostKRW.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setParsedAssets(null)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={() => parsedAssets && handleBulkSave(parsedAssets)}
              >
                <Text style={styles.modalConfirmText}>{parsedAssets?.length}개 전체 등록</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── 스타일 ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  realEstateShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
  },
  realEstateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  realEstateTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  realEstateDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
    zIndex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  clearButton: {
    padding: 10,
  },
  dropdown: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 240,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownTicker: {
    fontSize: 11,
    marginTop: 1,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  selectedBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedBadgeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedBadgeTicker: {
    fontSize: 12,
  },
  numberInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  priceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabelGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceHelp: {
    fontSize: 11,
  },
  priceLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceLoadingText: {
    fontSize: 11,
  },
  autoTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  currencySymbol: {
    fontSize: 15,
    paddingLeft: 14,
    fontWeight: '600',
  },
  priceInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 8,
    fontSize: 15,
  },
  priceHint: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.06)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.12)',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelEditButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  cancelEditText: {
    fontSize: 13,
  },
  recentScroll: {
    marginTop: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  recentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  existingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  assetCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 12,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  assetInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetName: {
    fontSize: 14,
    fontWeight: '600',
  },
  assetTicker: {
    fontSize: 11,
    marginTop: 2,
  },
  assetValues: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  assetValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  assetQuantity: {
    fontSize: 11,
    marginTop: 2,
  },
  assetActions: {
    flexDirection: 'row',
    gap: 6,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(207, 102, 121, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  keyboardDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  keyboardDoneText: {
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  directInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    gap: 8,
  },
  directInputText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  directInputHint: {
    fontSize: 11,
  },
  autoTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exchangeRateText: {
    fontSize: 10,
  },
  priceLabelRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  krwPreview: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: '500',
  },
  totalValueKrw: {
    fontSize: 12,
    marginTop: 2,
  },
  avgCalcCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  avgCalcTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  avgCalcDetail: {
    fontSize: 11,
    marginBottom: 2,
  },
  avgCalcResult: {
    fontSize: 12,
    fontWeight: '700',
  },
  // ── 자산 유형 탭 ──
  assetCategoryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
    gap: 6,
  },
  assetCategoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  assetCategoryTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // ── 현금 UI ──
  cashTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cashTypeBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  cashTypeBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  cashTypeBtnDesc: {
    fontSize: 10,
    textAlign: 'center',
  },
  // ── 수익률 안내 배너 ──
  infoBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  infoBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  infoBannerBody: {
    marginTop: 10,
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  screenshotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  screenshotBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // ── 파싱 결과 모달 ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 14,
  },
  parsedAssetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  parsedAssetName: {
    fontSize: 14,
    fontWeight: '600',
  },
  parsedAssetDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // ── 채권 빠른 선택 ──
  bondChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 90,
  },
  bondChipTicker: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  bondChipName: {
    fontSize: 10,
  },
});
