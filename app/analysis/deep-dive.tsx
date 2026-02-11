/**
 * 종목 딥다이브 - 개별 주식 심층 분석
 *
 * 역할: AI 기반 개별 종목 분석 제공
 * 사용자 흐름: 종목명 입력 → AI 분석 → 매수/매도/보유 추천
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { PriceService } from '../../src/services/PriceService';
import { AssetClass } from '../../src/types/price';
import supabase from '../../src/services/supabase';
import InvestmentReportModal from '../../src/components/deep-dive/InvestmentReportModal';

interface AnalysisResult {
  name: string;
  ticker: string;
  currentPrice: number;
  change: number;
  overview: string;
  marketCap: string;
  per: number;
  pbr: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
}

export default function DeepDiveScreen() {
  const { colors } = useTheme();
  const [ticker, setTicker] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceService = new PriceService();

  // 투자심사보고서 모달 상태
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const handleAnalyze = async () => {
    if (!ticker.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1단계: Yahoo Finance로 실시간 가격 조회
      console.log(`[DeepDive] 가격 조회 시작: ${ticker}`);
      let priceData;
      try {
        priceData = await priceService.fetchPrice(ticker, AssetClass.STOCK, 'KRW');
        console.log(`[DeepDive] 가격 조회 성공:`, priceData);
      } catch (priceError) {
        console.warn(`[DeepDive] 가격 조회 실패, AI만으로 분석:`, priceError);
        // 가격 조회 실패해도 AI 분석은 시도 (Gemini가 Google Search로 찾음)
      }

      // 2단계: Gemini AI로 종목 분석
      console.log(`[DeepDive] AI 분석 시작: ${ticker}`);
      const { data, error: geminiError } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          type: 'deep-dive',
          data: {
            ticker,
            currentPrice: priceData?.currentPrice,
            previousPrice: priceData?.previousPrice,
            percentChange: priceData?.percentChange24h,
          },
        },
      });

      if (geminiError) {
        throw new Error(`AI 분석 실패: ${geminiError.message}`);
      }

      if (!data?.data) {
        throw new Error('AI 응답이 비어있습니다');
      }

      console.log(`[DeepDive] AI 분석 완료:`, data.data);
      setResult(data.data);

    } catch (err: any) {
      console.error('[DeepDive] 분석 실패:', err);
      const errorMsg = err.message || '알 수 없는 오류가 발생했습니다';

      // 🎨 개발용: API 실패 시 Mock 데이터 사용 (UI 테스트용)
      if (__DEV__ && errorMsg.includes('Edge Function')) {
        console.log('[DeepDive] Mock 데이터 사용 (UI 테스트 모드)');
        setResult({
          name: ticker === 'AAPL' ? 'Apple Inc.' : '삼성전자',
          ticker: ticker,
          currentPrice: ticker === 'AAPL' ? 175.50 : 71000,
          change: 2.3,
          overview: ticker === 'AAPL'
            ? '세계 최대 기술 기업으로, iPhone, Mac, iPad 등을 제조합니다.'
            : '대한민국 대표 전자제품 제조사로, 반도체와 스마트폰 시장을 선도합니다.',
          marketCap: ticker === 'AAPL' ? '$2.8T' : '400조원',
          per: 28.5,
          pbr: 45.2,
          recommendation: 'BUY',
          reason: 'AI와 서비스 부문 성장으로 장기 투자 매력도가 높습니다.',
        });
        Alert.alert('✅ Mock 데이터 로드', 'API 오류로 인해 샘플 데이터를 표시합니다.');
      } else {
        setError(errorMsg);
        Alert.alert('분석 실패', errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'BUY':
        return '#4CAF50';
      case 'SELL':
        return '#CF6679';
      default:
        return '#FFB74D';
    }
  };

  const getRecommendationLabel = (rec: string) => {
    switch (rec) {
      case 'BUY':
        return '매수';
      case 'SELL':
        return '매도';
      default:
        return '보유';
    }
  };

  // 투자심사보고서 요청
  const handleOpenReport = async () => {
    if (!ticker.trim()) {
      Alert.alert('알림', '종목을 먼저 검색해주세요');
      return;
    }

    setReportModalVisible(true);
    setIsLoadingReport(true);
    setReportData(null);

    try {
      console.log(`[InvestmentReport] 보고서 생성 시작: ${ticker}`);
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          type: 'investment-report',
          data: {
            ticker,
            currentPrice: result?.currentPrice,
          },
        },
      });

      if (error) {
        throw new Error(`보고서 생성 실패: ${error.message}`);
      }

      if (!data?.data) {
        throw new Error('보고서 응답이 비어있습니다');
      }

      console.log(`[InvestmentReport] 보고서 생성 완료`, data.data);
      setReportData(data.data);
    } catch (err: any) {
      console.error('[InvestmentReport] 에러:', err);

      // 🎨 개발용: API 실패 시 Mock 데이터 사용 (UI 테스트용)
      if (__DEV__ && err.message?.includes('보고서 생성 실패')) {
        console.log('[InvestmentReport] Mock 데이터 사용 (UI 테스트 모드)');
        setReportData({
          executiveSummary: {
            recommendation: 'BUY',
            confidenceRating: 4,
            currentPrice: result?.currentPrice || 71000,
            targetPrice: (result?.currentPrice || 71000) * 1.25,
            keyPoints: [
              'AI 반도체 수요 증가로 실적 개선 전망',
              '갤럭시 S25 출시로 스마트폰 부문 회복 예상',
              '파운드리 사업 수익성 개선 중',
              '배당 수익률 3.2%로 안정적 수익 제공',
              '글로벌 기술 리더십 유지',
            ],
            analystName: 'Claude AI Analyst',
            publishedDate: new Date().toLocaleDateString('ko-KR'),
          },
          companyOverview: {
            companyName: ticker === 'AAPL' ? 'Apple Inc.' : '삼성전자',
            foundedYear: ticker === 'AAPL' ? 1976 : 1969,
            ceo: ticker === 'AAPL' ? 'Tim Cook' : '한종희',
            headquarters: ticker === 'AAPL' ? 'Cupertino, CA' : '수원, 경기도',
            industry: ticker === 'AAPL' ? '기술 하드웨어' : '전자제품 제조',
            marketCap: ticker === 'AAPL' ? 2800000000000 : 400000000000000,
            employeeCount: ticker === 'AAPL' ? 164000 : 267937,
            ipoDate: ticker === 'AAPL' ? '1980-12-12' : '1975-06-11',
            website: ticker === 'AAPL' ? 'www.apple.com' : 'www.samsung.com',
            ticker: ticker,
          },
          businessModel: {
            revenueModel: ticker === 'AAPL'
              ? 'iPhone 50%, 서비스 20%, Mac 10%, iPad 8%, 웨어러블 12%'
              : 'DX부문 55% (반도체), DS부문 30% (스마트폰), 가전 15%',
            moat: [
              '강력한 브랜드 파워와 생태계',
              '기술적 우위 (반도체, AI)',
              '글로벌 공급망 네트워크',
              '대규모 R&D 투자 (매출의 8%)',
            ],
            tam: ticker === 'AAPL'
              ? '글로벌 스마트폰 시장 $500B, 서비스 시장 $1T+'
              : '글로벌 반도체 시장 $600B, 스마트폰 시장 $500B',
            growthStrategy: [
              'AI 기능 탑재로 프리미엄 제품 강화',
              '신흥 시장 진출 확대',
              '서비스 부문 비중 확대',
              '자율주행 및 로봇 사업 진출',
            ],
            notes: '장기 성장 동력 확보를 위한 신규 사업 투자 진행 중',
          },
          financialAnalysis: {
            yearlyData: [
              {
                year: '2022',
                revenue: ticker === 'AAPL' ? 394328000000 : 302231000000000,
                operatingIncome: ticker === 'AAPL' ? 119437000000 : 43376000000000,
                netIncome: ticker === 'AAPL' ? 99803000000 : 55652000000000,
              },
              {
                year: '2023',
                revenue: ticker === 'AAPL' ? 383285000000 : 258938000000000,
                operatingIncome: ticker === 'AAPL' ? 114301000000 : 6562000000000,
                netIncome: ticker === 'AAPL' ? 96995000000 : 15471000000000,
              },
              {
                year: '2024',
                revenue: ticker === 'AAPL' ? 391035000000 : 285000000000000,
                operatingIncome: ticker === 'AAPL' ? 123217000000 : 22000000000000,
                netIncome: ticker === 'AAPL' ? 101956000000 : 25000000000000,
              },
            ],
            keyMetrics: {
              roe: ticker === 'AAPL' ? 147.3 : 9.8,
              roic: ticker === 'AAPL' ? 52.6 : 12.3,
              debtRatio: ticker === 'AAPL' ? 36.5 : 28.7,
            },
            cashFlowSummary:
              '영업활동현금흐름 안정적, 자본지출 증가 중 (신규 팹 투자), 자사주 매입 및 배당 지속',
          },
          valuation: {
            currentPrice: result?.currentPrice || 71000,
            fairValue: (result?.currentPrice || 71000) * 1.15,
            targetPrice: (result?.currentPrice || 71000) * 1.25,
            currency: 'KRW',
            per: ticker === 'AAPL' ? 28.5 : 12.3,
            pbr: ticker === 'AAPL' ? 45.2 : 1.2,
            psr: ticker === 'AAPL' ? 7.3 : 0.9,
            industryAvgPer: ticker === 'AAPL' ? 25.0 : 15.0,
            industryAvgPbr: ticker === 'AAPL' ? 40.0 : 1.5,
            industryAvgPsr: ticker === 'AAPL' ? 6.5 : 1.2,
          },
          risks: [
            {
              category: '시장 리스크',
              level: 'MEDIUM',
              points: [
                '글로벌 경기 둔화 시 수요 감소 가능',
                '환율 변동에 따른 수익성 변동',
                '반도체 업황 사이클 영향',
              ],
            },
            {
              category: '경쟁 리스크',
              level: 'MEDIUM',
              points: [
                ticker === 'AAPL'
                  ? '중국 브랜드의 점유율 상승'
                  : 'TSMC, 인텔 등 파운드리 경쟁 심화',
                '신규 경쟁자 진입 가능성',
                '가격 경쟁 심화로 마진 하락 우려',
              ],
            },
            {
              category: '규제 리스크',
              level: 'LOW',
              points: [
                '미중 무역 분쟁 장기화 가능성',
                '반독점 규제 강화 추세',
                '환경 규제 강화로 비용 증가',
              ],
            },
            {
              category: '경영 리스크',
              level: 'LOW',
              points: [
                '핵심 인재 유출 리스크',
                '대규모 투자 실패 가능성',
                '후계 구도 불확실성',
              ],
            },
          ],
          governance: {
            ceoRating: 4.2,
            ceoName: ticker === 'AAPL' ? 'Tim Cook' : '한종희',
            tenure: ticker === 'AAPL' ? 13 : 2,
            shareholderFriendly: 4.5,
            dividendYield: ticker === 'AAPL' ? 0.5 : 3.2,
            payoutRatio: ticker === 'AAPL' ? 15.0 : 25.0,
            esgRating: 4.0,
            esgGrade: 'A',
            keyPoints: [
              '투명한 지배구조와 외부이사 비율 높음',
              '주주 친화적 배당 정책 유지',
              'ESG 경영 강화 중 (탄소중립 2030 목표)',
              '정기적인 IR 활동과 소통',
            ],
          },
          debate: {
            warren: ticker === 'AAPL'
              ? 'Apple은 강력한 브랜드와 생태계를 가진 훌륭한 기업입니다. 다만 현재 밸류에이션이 다소 높아 보입니다. 장기 투자자라면 좋은 선택이지만, 적정 가격을 기다리는 것도 전략입니다.'
              : '삼성전자는 기술력과 글로벌 경쟁력을 갖춘 우량 기업입니다. 특히 AI 반도체 수요 증가는 장기적으로 긍정적입니다. 현재 PER 12배는 합리적인 수준으로 보입니다.',
            dalio: ticker === 'AAPL'
              ? '포트폴리오의 일부로는 좋지만, 기술주 비중이 너무 높으면 위험합니다. 채권, 금 등 다른 자산과 분산하여 리스크를 관리하세요.'
              : '한국 대표주로서 포트폴리오에 편입할 가치가 있습니다. 다만 반도체 사이클을 고려하여 분할 매수하는 것이 좋겠습니다. 배당도 3%대로 안정적입니다.',
            lee: ticker === 'AAPL'
              ? 'AI 혁신의 선두주자입니다. Apple Intelligence가 본격화되면 아이폰 교체 수요가 급증할 것입니다. 서비스 매출도 지속 성장 중이라 장기 성장성이 탁월합니다.'
              : 'AI 시대의 최대 수혜주입니다. HBM, GAA, 파운드리 모두 기술 우위를 확보하고 있습니다. 단기 변동성은 있겠지만 3년 후를 보고 투자하면 보상이 클 것입니다.',
            summary: ticker === 'AAPL'
              ? '세 분 모두 Apple의 장기 경쟁력을 인정합니다. 다만 밸류에이션과 분산투자 관점에서 신중한 접근이 필요합니다. 제 생각에는 기술 혁신이 계속되는 한 장기 보유 가치가 있는 기업입니다. 다만 한 번에 몰아서 사기보다는 분할 매수를 권장합니다.'
              : '세 분 모두 삼성전자의 펀더멘털을 긍정적으로 평가합니다. AI 반도체 수요 증가와 기술 우위를 고려하면 현재 밸류에이션은 매력적입니다. 제 조언은 반도체 사이클을 고려하여 분할 매수하되, 배당 재투자로 복리 효과를 노리는 것입니다.',
          },
        });
        Alert.alert('✅ Mock 보고서 로드', 'API 오류로 인해 샘플 보고서를 표시합니다.');
      } else {
        Alert.alert('보고서 생성 실패', err.message || '알 수 없는 오류가 발생했습니다');
        setReportModalVisible(false);
      }
    } finally {
      setIsLoadingReport(false);
    }
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
      >
        {/* 검색 바 */}
        <View style={[s.searchCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={22} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            value={ticker}
            onChangeText={setTicker}
            placeholder="종목 검색 (예: 삼성전자, AAPL)"
            placeholderTextColor={colors.textTertiary}
            style={[s.input, { color: colors.textPrimary }]}
            returnKeyType="search"
            onSubmitEditing={handleAnalyze}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          onPress={handleAnalyze}
          disabled={isLoading || !ticker.trim()}
          style={[
            s.analyzeButton,
            { backgroundColor: isLoading || !ticker.trim() ? colors.disabled : '#7C4DFF' },
          ]}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={s.analyzeButtonText}>분석 중...</Text>
            </View>
          ) : (
            <Text style={s.analyzeButtonText}>🔍 AI 분석 시작</Text>
          )}
        </TouchableOpacity>

        {/* 에러 메시지 */}
        {error && !isLoading && (
          <View style={[s.errorCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="warning" size={20} color="#CF6679" />
            <Text style={[s.errorText, { color: '#CF6679' }]}>{error}</Text>
          </View>
        )}

        {/* 결과 */}
        {result && !isLoading && (
          <View style={s.resultContainer}>
            {/* 기본 정보 */}
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.stockName, { color: colors.textPrimary }]}>{result.name}</Text>
              <Text style={[s.ticker, { color: colors.textSecondary }]}>
                {result.ticker} | ₩{result.currentPrice.toLocaleString()}
              </Text>
              <Text style={[s.overview, { color: colors.textSecondary }]}>{result.overview}</Text>
            </View>

            {/* 핵심 지표 */}
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <View style={s.cardHeader}>
                <Ionicons name="bar-chart" size={18} color="#7C4DFF" style={{ marginRight: 8 }} />
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>📊 핵심 지표</Text>
              </View>
              <View style={s.metricsGrid}>
                <View style={s.metricItem}>
                  <Text style={[s.metricLabel, { color: colors.textSecondary }]}>시가총액</Text>
                  <Text style={[s.metricValue, { color: colors.textPrimary }]}>
                    {result.marketCap}
                  </Text>
                </View>
                <View style={s.metricItem}>
                  <Text style={[s.metricLabel, { color: colors.textSecondary }]}>PER</Text>
                  <Text style={[s.metricValue, { color: colors.textPrimary }]}>
                    {result.per}
                  </Text>
                </View>
                <View style={s.metricItem}>
                  <Text style={[s.metricLabel, { color: colors.textSecondary }]}>PBR</Text>
                  <Text style={[s.metricValue, { color: colors.textPrimary }]}>
                    {result.pbr}
                  </Text>
                </View>
              </View>
            </View>

            {/* AI 의견 */}
            <View
              style={[
                s.card,
                {
                  backgroundColor: colors.surface,
                  borderLeftWidth: 4,
                  borderLeftColor: getRecommendationColor(result.recommendation),
                },
              ]}
            >
              <View style={s.cardHeader}>
                <Ionicons
                  name="bulb"
                  size={18}
                  color={getRecommendationColor(result.recommendation)}
                  style={{ marginRight: 8 }}
                />
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>🎯 AI 의견</Text>
              </View>
              <Text
                style={[
                  s.recommendation,
                  { color: getRecommendationColor(result.recommendation) },
                ]}
              >
                {getRecommendationLabel(result.recommendation)}
              </Text>
              <Text style={[s.reason, { color: colors.textSecondary }]}>{result.reason}</Text>
            </View>

            {/* 투자심사보고서 버튼 */}
            <TouchableOpacity
              onPress={handleOpenReport}
              style={[s.reportButton, { backgroundColor: '#7C4DFF' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={s.reportButtonText}>📊 전문 투자심사보고서 보기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 투자심사보고서 모달 */}
      <InvestmentReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        data={reportData}
        isLoading={isLoadingReport}
        ticker={ticker}
      />
    </>
  );
}

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
    marginBottom: 16,
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
  analyzeButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  stockName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  ticker: {
    fontSize: 14,
    marginBottom: 12,
  },
  overview: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  recommendation: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  reason: {
    fontSize: 15,
    lineHeight: 22,
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
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
