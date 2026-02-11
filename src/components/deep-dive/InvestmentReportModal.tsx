/**
 * 투자심사보고서 모달
 *
 * 역할: 전문 투자심사보고서를 전체 화면 모달로 표시
 * 구조: 7개 섹션 + 3인 토론
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// Agent 2-4 컴포넌트
import ExecutiveSummary from './ExecutiveSummary';
import CompanyOverview from './CompanyOverview';
import { BusinessModel } from './BusinessModel';
import { FinancialAnalysis } from './FinancialAnalysis';
import Valuation from './Valuation';
import Risks from './Risks';
import Governance from './Governance';

interface InvestmentReportData {
  executiveSummary: {
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    confidenceRating: 1 | 2 | 3 | 4 | 5;
    currentPrice: number;
    targetPrice: number;
    keyPoints: string[];
    analystName?: string;
    publishedDate?: string;
  };
  companyOverview: {
    companyName: string;
    foundedYear?: number;
    ceo?: string;
    headquarters?: string;
    industry?: string;
    marketCap?: number;
    employeeCount?: number;
    ipoDate?: string;
    website?: string;
    ticker?: string;
  };
  businessModel: {
    revenueModel: string;
    moat: string[];
    tam: string;
    growthStrategy: string[];
    notes?: string;
  };
  financialAnalysis: {
    yearlyData: Array<{
      year: string;
      revenue: number;
      operatingIncome: number;
      netIncome: number;
    }>;
    keyMetrics: {
      roe: number;
      roic: number;
      debtRatio: number;
    };
    cashFlowSummary: string;
  };
  valuation: {
    currentPrice: number;
    fairValue: number;
    targetPrice: number;
    currency: string;
    per: number;
    pbr: number;
    psr: number;
    industryAvgPer: number;
    industryAvgPbr: number;
    industryAvgPsr: number;
  };
  risks: Array<{
    category: '시장 리스크' | '경쟁 리스크' | '규제 리스크' | '경영 리스크';
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    points: string[];
  }>;
  governance: {
    ceoRating: number;
    ceoName: string;
    tenure: number;
    shareholderFriendly: number;
    dividendYield: number;
    payoutRatio: number;
    esgRating: number;
    esgGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D';
    keyPoints: string[];
  };
  debate: {
    warren: string;
    dalio: string;
    lee: string;
    summary: string;
  };
}

interface InvestmentReportModalProps {
  visible: boolean;
  onClose: () => void;
  data: InvestmentReportData | null;
  isLoading: boolean;
  ticker: string;
}

export default function InvestmentReportModal({
  visible,
  onClose,
  data,
  isLoading,
  ticker,
}: InvestmentReportModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* 헤더 */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                📊 투자심사보고서
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {ticker}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 콘텐츠 */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7C4DFF" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                전문 투자심사보고서 생성 중...
              </Text>
              <Text style={[styles.loadingSubtext, { color: colors.textTertiary }]}>
                Google Search로 최신 정보를 수집하고 있습니다 (20-30초 소요)
              </Text>
            </View>
          ) : data ? (
            <>
              {/* Executive Summary */}
              <ExecutiveSummary
                recommendation={data.executiveSummary.recommendation}
                confidenceRating={data.executiveSummary.confidenceRating}
                currentPrice={data.executiveSummary.currentPrice}
                targetPrice={data.executiveSummary.targetPrice}
                keyPoints={data.executiveSummary.keyPoints}
                analystName={data.executiveSummary.analystName}
                publishedDate={data.executiveSummary.publishedDate}
                initiallyExpanded={true}
              />

              {/* Company Overview */}
              <CompanyOverview
                companyName={data.companyOverview.companyName}
                foundedYear={data.companyOverview.foundedYear}
                ceo={data.companyOverview.ceo}
                headquarters={data.companyOverview.headquarters}
                industry={data.companyOverview.industry}
                marketCap={data.companyOverview.marketCap}
                employeeCount={data.companyOverview.employeeCount}
                ipoDate={data.companyOverview.ipoDate}
                website={data.companyOverview.website}
                ticker={data.companyOverview.ticker}
                initiallyExpanded={true}
              />

              {/* Business Model */}
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <BusinessModel
                  revenueModel={data.businessModel.revenueModel}
                  moat={data.businessModel.moat}
                  tam={data.businessModel.tam}
                  growthStrategy={data.businessModel.growthStrategy}
                  notes={data.businessModel.notes}
                />
              </View>

              {/* Financial Analysis */}
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <FinancialAnalysis
                  yearlyData={data.financialAnalysis.yearlyData}
                  keyMetrics={data.financialAnalysis.keyMetrics}
                  cashFlowSummary={data.financialAnalysis.cashFlowSummary}
                />
              </View>

              {/* Valuation */}
              <Valuation data={data.valuation} />

              {/* Risks */}
              <Risks risks={data.risks} />

              {/* Governance */}
              <Governance data={data.governance} />

              {/* Debate (3인 토론) */}
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  💬 투자 의견 토론
                </Text>

                {/* 워렌 버핏 */}
                <View style={[styles.debateCard, { backgroundColor: '#E3F2FD', borderLeftColor: '#2196F3' }]}>
                  <Text style={[styles.investorName, { color: '#1976D2' }]}>💼 워렌 버핏</Text>
                  <Text style={[styles.debateText, { color: colors.textPrimary }]}>
                    {data.debate.warren}
                  </Text>
                </View>

                {/* 레이 달리오 */}
                <View style={[styles.debateCard, { backgroundColor: '#F3E5F5', borderLeftColor: '#9C27B0' }]}>
                  <Text style={[styles.investorName, { color: '#7B1FA2' }]}>📊 레이 달리오</Text>
                  <Text style={[styles.debateText, { color: colors.textPrimary }]}>
                    {data.debate.dalio}
                  </Text>
                </View>

                {/* 이승관 */}
                <View style={[styles.debateCard, { backgroundColor: '#FFF3E0', borderLeftColor: '#FF9800' }]}>
                  <Text style={[styles.investorName, { color: '#F57C00' }]}>🚀 이승관</Text>
                  <Text style={[styles.debateText, { color: colors.textPrimary }]}>
                    {data.debate.lee}
                  </Text>
                </View>

                {/* 최종 정리 */}
                <View style={[styles.summaryCard, { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' }]}>
                  <Text style={[styles.summaryTitle, { color: '#F57F17' }]}>
                    ✨ 워렌 버핏의 최종 정리
                  </Text>
                  <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
                    {data.debate.summary}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#CF6679" />
              <Text style={[styles.errorText, { color: colors.textPrimary }]}>
                보고서를 불러올 수 없습니다
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  debateCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  investorName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  debateText: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 6,
    borderWidth: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
