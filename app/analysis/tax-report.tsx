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

interface TaxReport {
  totalTax: number;
  capitalGainsTax: number;
  dividendTax: number;
  potentialSavings: number;
  savingsStrategy: string;
  actionItems: Array<{
    title: string;
    description: string;
    deadline: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export default function TaxReportScreen() {
  const { colors } = useTheme();
  const [taxReport, setTaxReport] = useState<TaxReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTaxReport();
  }, []);

  const loadTaxReport = async () => {
    setIsLoading(true);
    try {
      // TODO: 실제 포트폴리오 기반 세금 계산
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTaxReport({
        totalTax: 1500000,
        capitalGainsTax: 1200000,
        dividendTax: 300000,
        potentialSavings: 300000,
        savingsStrategy: '연말 전 손실 종목 매도로 양도소득세 절감 가능',
        actionItems: [
          {
            title: '손실 종목 매도',
            description: '현재 -15% 손실 중인 카카오를 12월 중 매도하여 실현손실로 과세표준 감소',
            deadline: '2026-12-31',
            priority: 'high',
          },
          {
            title: 'ISA 계좌 활용',
            description: '내년부터 ISA 계좌로 투자하면 연 200만원까지 비과세 혜택',
            deadline: '2027-01-31',
            priority: 'medium',
          },
          {
            title: '배당소득 분산',
            description: '가족 계좌로 배당주 분산 투자하여 2,000만원 비과세 한도 활용',
            deadline: '2026-11-30',
            priority: 'low',
          },
        ],
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
            현재 포트폴리오 기준 예상치입니다
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
          <Text style={[s.disclaimerText, { color: colors.textTertiary }]}>
            본 리포트는 참고용이며, 세무 전문가 상담을 권장합니다.
          </Text>
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
    fontSize: 14,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 13,
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
    fontSize: 12,
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
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
    fontSize: 13,
    marginBottom: 4,
  },
  savingsAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  strategyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
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
    fontSize: 11,
    fontWeight: '700',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  actionDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadline: {
    fontSize: 12,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
  },
  disclaimerText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
