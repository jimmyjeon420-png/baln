/**
 * 종목 딥다이브 - 개별 주식 심층 분석
 *
 * 역할: AI 기반 개별 종목 분석 제공
 * 사용자 흐름: 종목명/티커 입력 → AI 분석 → 4섹션 리포트
 *
 * [수정] Edge Function 대신 클라이언트 Gemini 직접 호출
 * [수정] 한국어 기업명 검색 지원 (삼성전자, SK하이닉스 등)
 */

import React, { useState, useCallback } from 'react';
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
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { generateDeepDive } from '../../src/services/gemini';
import DeepDiveResultCard from '../../src/components/DeepDiveResultCard';
import type { DeepDiveInput, DeepDiveResult } from '../../src/types/marketplace';

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
// 메인 화면
// ============================================================================

export default function DeepDiveScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [result, setResult] = useState<DeepDiveResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const handleAnalyze = async () => {
    // 선택된 종목이 없으면 직접 입력된 텍스트를 종목명으로 사용
    const targetName = selectedStock?.name || query.trim();
    const targetTicker = selectedStock?.ticker || query.trim().toUpperCase();

    if (!targetName) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log(`[DeepDive] 분석 시작: ${targetName} (${targetTicker})`);

      const input: DeepDiveInput = {
        ticker: targetTicker,
        name: targetName,
      };

      const analysisResult = await generateDeepDive(input);
      console.log(`[DeepDive] 분석 완료`);
      setResult(analysisResult);

    } catch (err: any) {
      console.error('[DeepDive] 분석 실패:', err);
      const errorMsg = err.message || '알 수 없는 오류가 발생했습니다';
      setError(errorMsg);
      Alert.alert('분석 실패', errorMsg);
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
    <>
      <Stack.Screen
        options={{
          title: '종목 딥다이브',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8, padding: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
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
              <Text style={s.analyzeButtonText}>AI가 분석 중... (10~20초)</Text>
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

        {/* 분석 결과 — 기존 DeepDiveResultCard 활용 */}
        {result && !isLoading && (
          <DeepDiveResultCard result={result} />
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
    </>
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
    fontSize: 16,
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
    fontSize: 15,
    fontWeight: '600',
  },
  suggestionTicker: {
    fontSize: 12,
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
    fontSize: 13,
    lineHeight: 18,
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
    fontSize: 16,
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
    fontSize: 14,
    lineHeight: 20,
  },
  guideSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  guideText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
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
    fontSize: 13,
    marginRight: 4,
  },
  exampleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  exampleChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
