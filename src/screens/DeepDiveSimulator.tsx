/**
 * DeepDiveSimulator.tsx - 하단 3개 컴포넌트 시뮬레이터
 *
 * 역할: Valuation, Risks, Governance 컴포넌트를 샘플 데이터로 렌더링하여 테스트
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

// 컴포넌트 임포트
import Valuation, { ValuationMetrics } from '../components/deep-dive/Valuation';
import Risks, { RiskItem } from '../components/deep-dive/Risks';
import Governance, { GovernanceData } from '../components/deep-dive/Governance';

export default function DeepDiveSimulator() {
  const { colors } = useTheme();

  // ============================================================================
  // 샘플 데이터
  // ============================================================================

  // 1. Valuation 샘플 데이터 (예: 삼성전자)
  const valuationData: ValuationMetrics = {
    currentPrice: 71000,
    fairValue: 85000,
    targetPrice: 95000,
    currency: 'KRW',

    per: 12.5,
    pbr: 1.2,
    psr: 0.8,

    industryAvgPer: 15.0,
    industryAvgPbr: 1.5,
    industryAvgPsr: 1.0,
  };

  // 2. Risks 샘플 데이터
  const risksData: RiskItem[] = [
    {
      category: '시장 리스크',
      level: 'MEDIUM',
      points: [
        '반도체 시장 사이클 변동성 존재',
        '글로벌 경기 둔화 가능성',
        'AI 수요 증가로 장기 전망 긍정적',
      ],
    },
    {
      category: '경쟁 리스크',
      level: 'HIGH',
      points: [
        'TSMC의 파운드리 점유율 압도적',
        '중국 업체들의 저가 공세',
        '삼성 GAA 기술 우위로 반등 기회',
      ],
    },
    {
      category: '규제 리스크',
      level: 'LOW',
      points: [
        '한국 정부의 반도체 지원 정책 확대',
        '미국 IRA/CHIPS Act 수혜 예상',
        '중국 견제로 인한 간접 수혜',
      ],
    },
    {
      category: '경영 리스크',
      level: 'MEDIUM',
      points: [
        '이재용 회장 사면 후 경영 정상화',
        '사업부 간 시너지 부족 여전',
        '지배구조 개선 요구 지속',
      ],
    },
  ];

  // 3. Governance 샘플 데이터
  const governanceData: GovernanceData = {
    ceoRating: 4.2,
    ceoName: '이재용',
    tenure: 5,

    shareholderFriendly: 3.8,
    dividendYield: 2.1,
    payoutRatio: 25,

    esgRating: 3.5,
    esgGrade: 'B+',

    keyPoints: [
      '반도체 초격차 전략 추진 중 (500조 투자)',
      '배당성향 낮지만 자사주 소각으로 주주환원 확대',
      'ESG 경영 강화 중이나 아직 글로벌 선도 기업 수준은 아님',
      '지배구조 개선 요구 지속 - 지주회사 전환 검토 중',
    ],
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.textPrimary }]}>
            Deep Dive Simulator
          </Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            하단 3개 컴포넌트 렌더링 테스트 (삼성전자 예시)
          </Text>
        </View>

        {/* 1. Valuation */}
        <Valuation data={valuationData} />

        {/* 2. Risks */}
        <Risks risks={risksData} />

        {/* 3. Governance */}
        <Governance data={governanceData} />

        {/* 하단 여백 */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
});
