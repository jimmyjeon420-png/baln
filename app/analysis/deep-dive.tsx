/**
 * 종목 딥다이브 - 개별 주식 심층 분석
 *
 * 역할: AI 기반 개별 종목 분석 제공
 * 사용자 흐름: 종목명/티커 입력 → AI 분석 → 4섹션 리포트
 *
 * [수정] 프로덕션은 Edge Function(gemini-proxy) 우선, 직접 호출은 폴백
 * [수정] 한국어 기업명 검색 지원 (삼성전자, SK하이닉스 등)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useTheme } from '../../src/hooks/useTheme';
import { generateDeepDive } from '../../src/services/gemini';
import { fetchStockFundamentals } from '../../src/services/stockDataService';
import DeepDiveReport from '../../src/components/deep-dive/DeepDiveReport';
import type { DeepDiveInput, DeepDiveResult } from '../../src/types/marketplace';
import supabase, { getCurrentUser } from '../../src/services/supabase';

// ============================================================================
// 한국 주요 종목 + 글로벌 인기 종목 DB (오프라인 검색용)
// ============================================================================

interface StockItem {
  ticker: string;
  name: string;
  nameEn?: string;
  market: 'KRX' | 'NASDAQ' | 'NYSE' | 'CRYPTO';
}

const STOCK_DB: StockItem[] = [
  // 한국 대형주
  { ticker: '005930', name: '삼성전자', nameEn: 'Samsung Electronics', market: 'KRX' },
  { ticker: '000660', name: 'SK하이닉스', nameEn: 'SK Hynix', market: 'KRX' },
  { ticker: '373220', name: 'LG에너지솔루션', nameEn: 'LG Energy Solution', market: 'KRX' },
  { ticker: '207940', name: '삼성바이오로직스', nameEn: 'Samsung Biologics', market: 'KRX' },
  { ticker: '005935', name: '삼성전자우', nameEn: 'Samsung Electronics Pref.', market: 'KRX' },
  { ticker: '006400', name: '삼성SDI', nameEn: 'Samsung SDI', market: 'KRX' },
  { ticker: '051910', name: 'LG화학', nameEn: 'LG Chem', market: 'KRX' },
  { ticker: '035420', name: 'NAVER', nameEn: 'Naver Corp', market: 'KRX' },
  { ticker: '000270', name: '기아', nameEn: 'Kia Corp', market: 'KRX' },
  { ticker: '005380', name: '현대자동차', nameEn: 'Hyundai Motor', market: 'KRX' },
  { ticker: '068270', name: '셀트리온', nameEn: 'Celltrion', market: 'KRX' },
  { ticker: '035720', name: '카카오', nameEn: 'Kakao Corp', market: 'KRX' },
  { ticker: '105560', name: 'KB금융', nameEn: 'KB Financial Group', market: 'KRX' },
  { ticker: '055550', name: '신한지주', nameEn: 'Shinhan Financial', market: 'KRX' },
  { ticker: '003670', name: '포스코퓨처엠', nameEn: 'POSCO Future M', market: 'KRX' },
  { ticker: '066570', name: 'LG전자', nameEn: 'LG Electronics', market: 'KRX' },
  { ticker: '028260', name: '삼성물산', nameEn: 'Samsung C&T', market: 'KRX' },
  { ticker: '012330', name: '현대모비스', nameEn: 'Hyundai Mobis', market: 'KRX' },
  { ticker: '003550', name: 'LG', nameEn: 'LG Corp', market: 'KRX' },
  { ticker: '034730', name: 'SK', nameEn: 'SK Inc', market: 'KRX' },
  { ticker: '096770', name: 'SK이노베이션', nameEn: 'SK Innovation', market: 'KRX' },
  { ticker: '030200', name: 'KT', nameEn: 'KT Corp', market: 'KRX' },
  { ticker: '017670', name: 'SK텔레콤', nameEn: 'SK Telecom', market: 'KRX' },
  { ticker: '032830', name: '삼성생명', nameEn: 'Samsung Life', market: 'KRX' },
  { ticker: '009150', name: '삼성전기', nameEn: 'Samsung Electro-Mechanics', market: 'KRX' },
  { ticker: '086790', name: '하나금융지주', nameEn: 'Hana Financial', market: 'KRX' },
  { ticker: '010130', name: '고려아연', nameEn: 'Korea Zinc', market: 'KRX' },
  { ticker: '018260', name: '삼성에스디에스', nameEn: 'Samsung SDS', market: 'KRX' },
  { ticker: '259960', name: '크래프톤', nameEn: 'Krafton', market: 'KRX' },
  { ticker: '352820', name: '하이브', nameEn: 'HYBE', market: 'KRX' },

  // 미국 대형주
  { ticker: 'AAPL', name: '애플', nameEn: 'Apple', market: 'NASDAQ' },
  { ticker: 'MSFT', name: '마이크로소프트', nameEn: 'Microsoft', market: 'NASDAQ' },
  { ticker: 'GOOGL', name: '구글(알파벳)', nameEn: 'Alphabet', market: 'NASDAQ' },
  { ticker: 'AMZN', name: '아마존', nameEn: 'Amazon', market: 'NASDAQ' },
  { ticker: 'NVDA', name: '엔비디아', nameEn: 'NVIDIA', market: 'NASDAQ' },
  { ticker: 'META', name: '메타(페이스북)', nameEn: 'Meta Platforms', market: 'NASDAQ' },
  { ticker: 'TSLA', name: '테슬라', nameEn: 'Tesla', market: 'NASDAQ' },
  { ticker: 'TSM', name: 'TSMC', nameEn: 'Taiwan Semiconductor', market: 'NYSE' },
  { ticker: 'BRK.B', name: '버크셔 해서웨이', nameEn: 'Berkshire Hathaway', market: 'NYSE' },
  { ticker: 'JPM', name: 'JP모건', nameEn: 'JPMorgan Chase', market: 'NYSE' },
  { ticker: 'V', name: '비자', nameEn: 'Visa', market: 'NYSE' },
  { ticker: 'JNJ', name: '존슨앤존슨', nameEn: 'Johnson & Johnson', market: 'NYSE' },
  { ticker: 'WMT', name: '월마트', nameEn: 'Walmart', market: 'NYSE' },
  { ticker: 'MA', name: '마스터카드', nameEn: 'Mastercard', market: 'NYSE' },
  { ticker: 'PG', name: 'P&G', nameEn: 'Procter & Gamble', market: 'NYSE' },
  { ticker: 'DIS', name: '디즈니', nameEn: 'Walt Disney', market: 'NYSE' },
  { ticker: 'NFLX', name: '넷플릭스', nameEn: 'Netflix', market: 'NASDAQ' },
  { ticker: 'AMD', name: 'AMD', nameEn: 'Advanced Micro Devices', market: 'NASDAQ' },
  { ticker: 'INTC', name: '인텔', nameEn: 'Intel', market: 'NASDAQ' },
  { ticker: 'CRM', name: '세일즈포스', nameEn: 'Salesforce', market: 'NYSE' },
  { ticker: 'COST', name: '코스트코', nameEn: 'Costco', market: 'NASDAQ' },
  { ticker: 'AVGO', name: '브로드컴', nameEn: 'Broadcom', market: 'NASDAQ' },
  { ticker: 'COIN', name: '코인베이스', nameEn: 'Coinbase', market: 'NASDAQ' },
  { ticker: 'PLTR', name: '팔란티어', nameEn: 'Palantir', market: 'NASDAQ' },
  { ticker: 'SOFI', name: '소파이', nameEn: 'SoFi Technologies', market: 'NASDAQ' },
];

// ============================================================================
// 진단 함수 (딥다이브 분석 환경 점검)
// ============================================================================

async function runDeepDiveDiagnostic() {
  const results: string[] = [];
  const startTotal = Date.now();

  // 1. raw fetch to Supabase (연결 테스트)
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
      results.push(`1. Supabase: ${res.status} (${Date.now() - t1}ms)`);
    } else {
      results.push(`1. Supabase: TIMEOUT 5s`);
    }
  } catch (e: any) {
    results.push(`1. Supabase ERROR: ${e.message}`);
  }

  // 2. Auth 세션 체크
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
    results.push(`2. Auth: ${hasSession ? 'YES' : 'NO'} / ${expInfo} (${Date.now() - t2}ms)`);
  } catch (e: any) {
    results.push(`2. Auth ERROR: ${e.message}`);
  }

  // 3. Gemini API 프록시 헬스 체크 (Edge Function)
  try {
    const t3 = Date.now();
    const { data, error } = await Promise.race([
      supabase.functions.invoke('gemini-proxy', {
        body: { type: 'health-check' },
      }),
      new Promise<{ data: null; error: { message: string } }>((r) =>
        setTimeout(() => r({ data: null, error: { message: 'TIMEOUT 15s' } }), 15000)
      ),
    ]) as any;
    if (error) {
      results.push(`3. Gemini proxy: ERROR ${error.message} (${Date.now() - t3}ms)`);
    } else {
      const hc = data?.data;
      if (hc?.geminiApi === 'OK') {
        results.push(`3. Gemini proxy: OK ✅ API실제호출 성공 (${Date.now() - t3}ms)`);
      } else if (hc?.geminiApi) {
        results.push(`3. Gemini proxy: ⚠️ ${hc.geminiApi} ${hc.geminiError?.substring(0, 60) || ''} (${Date.now() - t3}ms)`);
      } else {
        results.push(`3. Gemini proxy: OK (${Date.now() - t3}ms)`);
      }
    }
  } catch (e: any) {
    results.push(`3. Gemini proxy ERROR: ${e.message}`);
  }

  // 4. 클라이언트 Gemini API 키 확인 (선택)
  try {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const modelName = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3-flash-preview';
    if (apiKey && apiKey.length > 0) {
      results.push(`4. Client KEY(선택): loaded (${apiKey.length}chars) / model: ${modelName}`);
    } else {
      results.push(`4. Client KEY(선택): 없음 (프록시 모드에서는 정상)`);
    }
  } catch (e: any) {
    results.push(`4. Client KEY(선택) ERROR: ${e.message}`);
  }

  // 5. getCurrentUser 체크
  try {
    const t5 = Date.now();
    const u = await getCurrentUser();
    results.push(`5. User: ${u ? u.id.substring(0, 8) + '...' : 'NULL'} (${Date.now() - t5}ms)`);
  } catch (e: any) {
    results.push(`5. User ERROR: ${e.message}`);
  }

  // 6. 클라이언트 Gemini API 직접 호출 테스트 (참고용)
  try {
    if (!__DEV__) {
      results.push('6. Gemini 직접호출(참고): 프로덕션은 프록시 우선 모드로 스킵');
      Alert.alert('딥다이브 진단 결과', results.join('\n') + `\n\n총: ${Date.now() - startTotal}ms`);
      return;
    }

    const t6 = Date.now();
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    const model = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3-flash-preview';
    if (!apiKey) {
      results.push(`6. Gemini 직접호출: NO API KEY`);
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
        results.push(`6. Gemini 직접호출: TIMEOUT 10s`);
      } else if (testRes.ok) {
        const json = await testRes.json();
        const txt = json?.candidates?.[0]?.content?.parts?.[0]?.text || 'empty';
        results.push(`6. Gemini 직접호출: OK "${txt.substring(0, 20)}" (${Date.now() - t6}ms)`);
      } else {
        const errText = await testRes.text().catch(() => '');
        results.push(`6. Gemini 직접호출: ERROR ${testRes.status} ${errText.substring(0, 80)} (${Date.now() - t6}ms)`);
      }
    }
  } catch (e: any) {
    results.push(`6. Gemini 직접호출 ERROR: ${e.message?.substring(0, 80)}`);
  }

  const totalMs = Date.now() - startTotal;
  Alert.alert('딥다이브 진단 결과', results.join('\n') + `\n\n총: ${totalMs}ms`);
}

// ============================================================================
// 메인 화면
// ============================================================================

export default function DeepDiveScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ ticker?: string; name?: string }>();

  const [query, setQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [result, setResult] = useState<DeepDiveResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 처방전 카드에서 직접 진입 시 자동 분석
  useEffect(() => {
    const autoTicker = params.ticker;
    const autoName = params.name;
    if (!autoTicker) return;

    const stock: StockItem = {
      ticker: autoTicker,
      name: autoName || autoTicker,
      nameEn: '',
      market: 'NASDAQ', // 기본값 (표시용, 분석에는 무관)
    };
    setSelectedStock(stock);
    setQuery(autoName ? `${autoName} (${autoTicker})` : autoTicker);
    setShowSuggestions(false);

    // 약간 지연 후 자동 분석 시작 (화면 마운트 완료 후)
    const timer = setTimeout(() => {
      handleAnalyzeWithStock(stock);
    }, 300);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색 필터 (한국어 이름, 영문 이름, 티커 모두 검색)
  const filteredStocks = query.trim().length > 0
    ? STOCK_DB.filter(s => {
        const q = query.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.ticker.toLowerCase().includes(q) ||
          (s.nameEn && s.nameEn.toLowerCase().includes(q))
        );
      }).slice(0, 8)
    : [];

  const handleSelectStock = useCallback((stock: StockItem) => {
    setSelectedStock(stock);
    setQuery(`${stock.name} (${stock.ticker})`);
    setShowSuggestions(false);
    Keyboard.dismiss();
  }, []);

  // stock 인자를 직접 받는 버전 (자동 분석용 — state가 아직 반영 안 됐을 때 사용)
  const handleAnalyzeWithStock = async (stock: StockItem) => {
    const targetName = stock.name;
    const targetTicker = stock.ticker;
    if (!targetName) return;

    setIsLoading(true);
    setLoadingMessage('재무 데이터 조회 중...');
    setError(null);
    setResult(null);

    try {
      console.log(`[DeepDive] Step 1: 재무 데이터 조회 — ${targetName} (${targetTicker})`);
      let fundamentals: Awaited<ReturnType<typeof fetchStockFundamentals>> = null;
      try {
        fundamentals = await fetchStockFundamentals(targetTicker, targetName);
      } catch (fundErr: any) {
        console.warn(`[DeepDive] 재무 데이터 조회 중 예외 발생 — Gemini 단독 분석으로 fallback:`, fundErr.message);
      }

      setLoadingMessage('AI 분석 중...');
      const input: DeepDiveInput = { ticker: targetTicker, name: targetName, fundamentals: fundamentals || undefined };
      const analysisResult = await generateDeepDive(input);
      setResult(analysisResult);
    } catch (err: any) {
      const rawMsg = err.message || '';
      let userMsg = rawMsg.length > 0 ? rawMsg.substring(0, 120) : '알 수 없는 오류가 발생했습니다';
      if (rawMsg.includes('시간 초과') || err.name === 'AbortError') userMsg = 'AI 분석 시간이 초과되었습니다 (60초).\n다시 시도해주세요.';
      else if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) userMsg = 'AI 요청 한도를 초과했습니다.\n1분 후 다시 시도해주세요.';
      setError(userMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    // 선택된 종목이 없으면 직접 입력된 텍스트를 종목명으로 사용
    const targetName = selectedStock?.name || query.trim();
    const targetTicker = selectedStock?.ticker || query.trim().toUpperCase();

    if (!targetName) return;

    setIsLoading(true);
    setLoadingMessage('재무 데이터 조회 중...');
    setError(null);
    setResult(null);

    try {
      // [Step 1] Yahoo Finance API로 실제 재무 데이터 조회
      // fetchStockFundamentals가 예외를 던져도 딥다이브 자체는 계속 진행
      console.log(`[DeepDive] Step 1: 재무 데이터 조회 — ${targetName} (${targetTicker})`);
      let fundamentals: Awaited<ReturnType<typeof fetchStockFundamentals>> = null;
      try {
        fundamentals = await fetchStockFundamentals(targetTicker, targetName);
      } catch (fundErr: any) {
        console.warn(`[DeepDive] 재무 데이터 조회 중 예외 발생 — Gemini 단독 분석으로 fallback:`, fundErr.message);
      }

      if (fundamentals) {
        console.log(`[DeepDive] 재무 데이터 조회 성공:`, {
          marketCap: fundamentals.marketCap,
          PE: fundamentals.trailingPE,
          PB: fundamentals.priceToBook,
        });
      } else {
        console.log(`[DeepDive] 재무 데이터 없음 — Gemini 단독 분석으로 fallback`);
      }

      // [Step 2] Gemini AI 분석 (팩트 데이터 주입)
      setLoadingMessage('AI 분석 중...');
      console.log(`[DeepDive] Step 2: AI 분석 시작`);
      const input: DeepDiveInput = {
        ticker: targetTicker,
        name: targetName,
        fundamentals: fundamentals || undefined,
      };

      const analysisResult = await generateDeepDive(input);
      console.log(`[DeepDive] 분석 완료`);
      setResult(analysisResult);

    } catch (err: any) {
      console.warn('[DeepDive] 분석 실패:', err.name, err.message, err.code);

      // 사용자 친화적 에러 메시지 생성
      let userMsg: string;
      const rawMsg = err.message || '';
      if (rawMsg.includes('시간 초과') || err.name === 'AbortError') {
        userMsg = 'AI 분석 시간이 초과되었습니다 (60초).\n네트워크 상태를 확인하고 다시 시도해주세요.';
      } else if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('한도 초과')) {
        userMsg = 'AI 요청 한도를 초과했습니다.\n1분 후 다시 시도해주세요.';
      } else if (rawMsg.includes('Network') || rawMsg.includes('network') || rawMsg.includes('fetch failed')) {
        userMsg = '네트워크 연결에 실패했습니다.\nWi-Fi 또는 모바일 데이터를 확인해주세요.';
      } else if (rawMsg.includes('JSON') || rawMsg.includes('응답 형식')) {
        userMsg = 'AI 응답을 해석하지 못했습니다.\n다시 시도하면 해결될 수 있습니다.';
      } else if (rawMsg.includes('403') || rawMsg.includes('PERMISSION')) {
        userMsg = 'API 접근 권한 오류입니다.\n관리자에게 문의해주세요.';
      } else if (rawMsg.includes('빈 응답')) {
        userMsg = 'AI가 빈 응답을 반환했습니다.\n다시 시도해주세요.';
      } else {
        userMsg = rawMsg.length > 0 ? rawMsg.substring(0, 120) : '알 수 없는 오류가 발생했습니다';
      }

      setError(userMsg);
      Alert.alert(
        '딥다이브 분석 실패',
        userMsg,
        [
          { text: '확인', style: 'cancel' },
          { text: '다시 시도', onPress: handleAnalyze },
          { text: '진단 실행', onPress: runDeepDiveDiagnostic },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setSelectedStock(null);
    setShowSuggestions(text.trim().length > 0);
    setError(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar
        title="종목 딥다이브"
        rightElement={
          <TouchableOpacity onPress={runDeepDiveDiagnostic} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="pulse-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={[s.container, { backgroundColor: colors.background }]}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 검색 바 */}
        <View style={[s.searchCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={22} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder="종목 검색 (삼성전자, AAPL, 테슬라...)"
            placeholderTextColor={colors.textTertiary}
            style={[s.input, { color: colors.textPrimary }]}
            returnKeyType="search"
            onSubmitEditing={handleAnalyze}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => query.trim().length > 0 && setShowSuggestions(true)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSelectedStock(null); setShowSuggestions(false); }}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 검색 제안 목록 */}
        {showSuggestions && filteredStocks.length > 0 && (
          <View style={[s.suggestionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {filteredStocks.map((stock, index) => (
              <TouchableOpacity
                key={stock.ticker}
                onPress={() => handleSelectStock(stock)}
                style={[
                  s.suggestionItem,
                  index < filteredStocks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.suggestionName, { color: colors.textPrimary }]}>{stock.name}</Text>
                  <Text style={[s.suggestionTicker, { color: colors.textTertiary }]}>
                    {stock.ticker} · {stock.market}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* DB에 없는 종목 안내 */}
        {showSuggestions && filteredStocks.length === 0 && query.trim().length > 1 && (
          <View style={[s.noResultCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="information-circle" size={18} color={colors.textSecondary} />
            <Text style={[s.noResultText, { color: colors.textSecondary }]}>
              "{query}" — 목록에 없지만 분석 가능합니다. 분석 버튼을 눌러주세요.
            </Text>
          </View>
        )}

        {/* 분석 버튼 */}
        <TouchableOpacity
          onPress={handleAnalyze}
          disabled={isLoading || !query.trim()}
          style={[
            s.analyzeButton,
            { backgroundColor: isLoading || !query.trim() ? colors.disabled : '#7C4DFF' },
          ]}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={s.analyzeButtonText}>{loadingMessage || 'AI가 분석 중...'}</Text>
            </View>
          ) : (
            <Text style={s.analyzeButtonText}>AI 분석 시작</Text>
          )}
        </TouchableOpacity>

        {/* 에러 메시지 */}
        {error && !isLoading && (
          <View style={[s.errorCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="warning" size={20} color="#CF6679" />
            <Text style={[s.errorText, { color: '#CF6679' }]}>{error}</Text>
          </View>
        )}

        {/* 분석 결과 — 통합 리포트 */}
        {result && !isLoading && (
          <>
            <DeepDiveReport result={result} />
            {/* 투자 면책 안내 */}
            <View style={s.disclaimerBanner}>
              <Ionicons name="information-circle-outline" size={14} color="#888" />
              <Text style={s.disclaimerText}>
                본 정보는 투자 참고용이며, 투자 권유가 아닙니다. 투자 판단의 책임은 본인에게 있습니다.
              </Text>
            </View>
          </>
        )}

        {/* 안내 문구 (결과 없을 때) */}
        {!result && !isLoading && !error && (
          <View style={s.guideSection}>
            <Text style={[s.guideTitle, { color: colors.textSecondary }]}>
              어떤 종목이든 분석 가능합니다
            </Text>
            <Text style={[s.guideText, { color: colors.textTertiary }]}>
              한국 주식, 미국 주식, ETF 등{'\n'}
              종목명 또는 티커를 입력하면 AI가 실시간 분석합니다
            </Text>

            <View style={s.exampleSection}>
              <Text style={[s.exampleLabel, { color: colors.textTertiary }]}>예시</Text>
              {['삼성전자', 'NVDA', 'SK하이닉스', 'TSLA'].map((example) => (
                <TouchableOpacity
                  key={example}
                  onPress={() => handleQueryChange(example)}
                  style={[s.exampleChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[s.exampleChipText, { color: colors.textPrimary }]}>{example}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 17,
    height: 44,
    paddingVertical: 8,
  },
  suggestionsCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionTicker: {
    fontSize: 13,
    marginTop: 2,
  },
  noResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  noResultText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  analyzeButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  guideSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  guideTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  guideText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 24,
  },
  exampleSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
  },
  exampleLabel: {
    fontSize: 14,
    marginRight: 4,
  },
  exampleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  exampleChipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#888888',
    lineHeight: 17,
  },
});
