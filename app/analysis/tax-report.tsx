/**
 * 세금 리포트 - 절세 전략 제공
 *
 * 역할: 포트폴리오 기반 세금 계산 및 절세 전략 제시
 * 사용자 흐름: 자동 계산 → 절세 전략 확인 → 실행 가이드
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useTheme } from '../../src/hooks/useTheme';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { AssetType } from '../../src/types/asset';
import { estimateTax, inferTaxAssetType, type TaxAssetType } from '../../src/utils/taxEstimator';

interface TaxReport {
  totalTax: number;
  capitalGainsTax: number;
  dividendTax: number;
  potentialSavings: number;
  savingsStrategy: string;
  assumptions: string[];
  actionItems: Array<{
    title: string;
    description: string;
    deadline: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export default function TaxReportScreen() {
  const { colors } = useTheme();
  const { assets, isLoading: isPortfolioLoading } = useSharedPortfolio();
  const [taxReport, setTaxReport] = useState<TaxReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isPortfolioLoading) {
      loadTaxReport();
    }
  }, [isPortfolioLoading, assets]);

  const loadTaxReport = () => {
    setIsLoading(true);
    try {
      const liquidAssets = assets.filter((asset) => asset.assetType === AssetType.LIQUID);
      const currentYear = new Date().getFullYear();
      const yearEnd = `${currentYear}-12-31`;
      const nextYearStart = `${currentYear + 1}-01-31`;

      if (liquidAssets.length === 0) {
        setTaxReport({
          totalTax: 0,
          capitalGainsTax: 0,
          dividendTax: 0,
          potentialSavings: 0,
          savingsStrategy: '보유한 유동자산이 없어 세금 분석 대상이 없습니다. 자산 등록 후 다시 확인해주세요.',
          assumptions: ['유동자산 기준으로만 계산합니다.', '부동산은 현금화 시점이 달라 본 계산에서 제외됩니다.'],
          actionItems: [
            {
              title: '유동자산 등록',
              description: '주식/ETF/암호화폐를 등록하면 종목별 절세 타이밍을 계산할 수 있습니다.',
              deadline: nextYearStart,
              priority: 'medium',
            },
          ],
        });
        return;
      }

      const perTypeYield: Record<TaxAssetType, number> = {
        kr_stock: 0.015, // 1.5% 가정
        us_stock: 0.018, // 1.8% 가정
        crypto: 0,
        other: 0.005,
      };

      const taxRows = liquidAssets.map((asset) => {
        const currentValue = Math.max(0, Number(asset.currentValue) || 0);
        const quantity =
          asset.quantity && asset.quantity > 0
            ? asset.quantity
            : asset.currentPrice && asset.currentPrice > 0
              ? currentValue / asset.currentPrice
              : 1;
        const currentPrice =
          asset.currentPrice && asset.currentPrice > 0
            ? asset.currentPrice
            : quantity > 0
              ? currentValue / quantity
              : 0;
        const avgPrice =
          asset.avgPrice && asset.avgPrice > 0
            ? asset.avgPrice
            : asset.costBasis && quantity > 0
              ? asset.costBasis / quantity
              : currentPrice;
        const ticker = asset.ticker || asset.name || 'UNKNOWN';
        const type = inferTaxAssetType(ticker);
        const estimate = estimateTax(ticker, currentValue, avgPrice, currentPrice, quantity);

        return {
          name: asset.name,
          ticker,
          type,
          currentValue,
          quantity,
          avgPrice,
          currentPrice,
          estimate,
          gainRate: avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0,
        };
      });

      const capitalGainsTax = Math.round(
        taxRows.reduce((sum, row) => sum + (row.estimate.capitalGainsTax || 0), 0)
      );

      const estimatedDividendTax = Math.round(
        taxRows.reduce((sum, row) => sum + (row.currentValue * perTypeYield[row.type] * 0.154), 0)
      );

      const usPositiveGain = taxRows
        .filter((row) => row.type === 'us_stock')
        .reduce((sum, row) => sum + Math.max(0, row.estimate.gain), 0);
      const usLossAmount = taxRows
        .filter((row) => row.type === 'us_stock')
        .reduce((sum, row) => sum + Math.max(0, -row.estimate.gain), 0);
      const taxableUsGainAfterDeduction = Math.max(0, usPositiveGain - 2_500_000);
      const potentialSavings = Math.round(Math.min(usLossAmount, taxableUsGainAfterDeduction) * 0.22);

      const biggestLoss = [...taxRows]
        .filter((row) => row.estimate.gain < 0)
        .sort((a, b) => a.estimate.gain - b.estimate.gain)[0];

      const biggestGain = [...taxRows]
        .filter((row) => row.estimate.gain > 0)
        .sort((a, b) => b.estimate.gain - a.estimate.gain)[0];

      const actionItems: TaxReport['actionItems'] = [];

      if (biggestLoss && potentialSavings > 0) {
        actionItems.push({
          title: '손실 종목 손익상계',
          description: `${biggestLoss.name}은(는) 현재 ${biggestLoss.gainRate.toFixed(1)}% 손실 구간입니다. 연말 전 일부 매도로 과세 대상 이익을 상쇄하면 추정 ₩${potentialSavings.toLocaleString()} 절세 여지가 있습니다.`,
          deadline: yearEnd,
          priority: 'high',
        });
      }

      if (biggestGain) {
        actionItems.push({
          title: '수익 종목 분할 매도 계획',
          description: `${biggestGain.name}의 평가이익이 큽니다. 한 번에 전량 매도보다 분할 매도로 연도별 과세표준을 분산하면 세금 급증을 줄일 수 있습니다.`,
          deadline: yearEnd,
          priority: 'medium',
        });
      }

      actionItems.push({
        title: '배당 내역 연동 점검',
        description: '현재 배당소득세는 보유자산 유형별 평균 배당수익률 가정치로 추정됩니다. 실제 배당 내역 연동 시 정확도가 높아집니다.',
        deadline: nextYearStart,
        priority: 'low',
      });

      const totalTax = capitalGainsTax + estimatedDividendTax;
      const summary =
        potentialSavings > 0
          ? `해외주식 손익상계 기준으로 최대 ₩${potentialSavings.toLocaleString()} 절세 여지가 있습니다.`
          : '현재 데이터 기준 손익상계 절세 여지는 제한적입니다. 분할매도와 과세연도 분산 전략을 우선 검토하세요.';

      setTaxReport({
        totalTax,
        capitalGainsTax,
        dividendTax: estimatedDividendTax,
        potentialSavings,
        savingsStrategy: summary,
        assumptions: [
          '유동자산(주식/ETF/코인) 기준 추정치이며, 부동산은 제외됩니다.',
          '배당소득세는 종목별 실제 배당내역이 없어 평균 배당수익률 가정치(국내 1.5%, 해외 1.8%)로 계산합니다.',
          '세법/공제한도/개인 공제항목에 따라 실제 신고세액은 달라질 수 있습니다.',
        ],
        actionItems: actionItems.slice(0, 3),
      });
    } catch (error) {
      console.error('[TaxReport] 리포트 생성 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#CF6679';
      case 'medium':
        return '#FFB74D';
      case 'low':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '긴급';
      case 'medium':
        return '중요';
      case 'low':
        return '참고';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <HeaderBar title="세금 리포트" />
        <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#7C4DFF" />
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>
            세금 리포트 생성 중...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!taxReport) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar title="세금 리포트" />
      <ScrollView
        style={[s.container, { backgroundColor: colors.background }]}
        contentContainerStyle={s.content}
      >
        {/* 헤더 */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.textPrimary }]}>🧾 2026년 세금 리포트</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            현재 포트폴리오 기준 추정치(가정 포함)입니다
          </Text>
        </View>

        {/* 총 예상 세금 */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.cardLabel, { color: colors.textSecondary }]}>올해 예상 세금</Text>
          <Text style={[s.totalTax, { color: '#FF9800' }]}>
            ₩{taxReport.totalTax.toLocaleString()}
          </Text>
          <View style={s.taxBreakdown}>
            <View style={s.breakdownItem}>
              <Text style={[s.breakdownLabel, { color: colors.textTertiary }]}>양도소득세</Text>
              <Text style={[s.breakdownValue, { color: colors.textSecondary }]}>
                ₩{taxReport.capitalGainsTax.toLocaleString()}
              </Text>
            </View>
            <View style={s.breakdownItem}>
              <Text style={[s.breakdownLabel, { color: colors.textTertiary }]}>배당소득세</Text>
              <Text style={[s.breakdownValue, { color: colors.textSecondary }]}>
                ₩{taxReport.dividendTax.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* 절세 가능 금액 */}
        <View style={[s.savingsCard, { backgroundColor: colors.surface }]}>
          <View style={s.savingsHeader}>
            <Ionicons name="trophy" size={24} color="#4CAF50" />
            <View style={{ flex: 1 }}>
              <Text style={[s.savingsLabel, { color: colors.textSecondary }]}>절세 가능 금액</Text>
              <Text style={[s.savingsAmount, { color: '#4CAF50' }]}>
                ₩{taxReport.potentialSavings.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* AI 절세 전략 */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <View style={s.cardHeader}>
            <Ionicons name="bulb" size={18} color="#7C4DFF" />
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>💡 AI 절세 전략</Text>
          </View>
          <Text style={[s.strategyText, { color: colors.textSecondary }]}>
            {taxReport.savingsStrategy}
          </Text>
        </View>

        {/* 실행 체크리스트 */}
        <View style={s.actionSection}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>📋 실행 체크리스트</Text>
          {taxReport.actionItems.map((item, index) => (
            <View key={index} style={[s.actionCard, { backgroundColor: colors.surface }]}>
              <View style={s.actionHeader}>
                <View
                  style={[
                    s.priorityBadge,
                    { backgroundColor: getPriorityColor(item.priority) + '20' },
                  ]}
                >
                  <Text style={[s.priorityText, { color: getPriorityColor(item.priority) }]}>
                    {getPriorityLabel(item.priority)}
                  </Text>
                </View>
                <Text style={[s.actionTitle, { color: colors.textPrimary }]}>{item.title}</Text>
              </View>
              <Text style={[s.actionDesc, { color: colors.textSecondary }]}>
                {item.description}
              </Text>
              <View style={s.actionFooter}>
                <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                <Text style={[s.deadline, { color: colors.textTertiary }]}>
                  마감: {item.deadline}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 면책 고지 */}
        <View style={[s.disclaimer, { backgroundColor: colors.surface }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.disclaimerText, { color: colors.textTertiary }]}>
              본 리포트는 참고용이며, 세무 전문가 상담을 권장합니다.
            </Text>
            {taxReport.assumptions.map((line, idx) => (
              <Text key={idx} style={[s.disclaimerText, { color: colors.textTertiary }]}>
                • {line}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  totalTax: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 16,
  },
  taxBreakdown: {
    flexDirection: 'row',
    gap: 20,
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 17,
    fontWeight: '600',
  },
  savingsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savingsLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  savingsAmount: {
    fontSize: 25,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  strategyText: {
    fontSize: 16,
    lineHeight: 23,
  },
  actionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 12,
  },
  actionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  actionDesc: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 8,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadline: {
    fontSize: 13,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
  },
  disclaimerText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
});
