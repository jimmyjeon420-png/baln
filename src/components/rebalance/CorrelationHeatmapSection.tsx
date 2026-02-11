/**
 * 상관관계 히트맵 섹션 — 포트폴리오 자산 간 상관도 시각화
 *
 * 비유: "자산 궁합 차트" — 자산들이 서로 같이 움직이는지, 반대로 움직이는지 색상으로 표시
 * 빨강: 같이 움직임 (위험 집중) → 분산 효과 낮음
 * 파랑: 반대로 움직임 (헤지 효과) → 분산 효과 높음
 *
 * AI 의존 없이 정적 상관 계수 매트릭스 사용 (rebalanceScore.ts 재사용)
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from '../../types/asset';
import { classifyAsset, AssetCategory } from '../../services/rebalanceScore';

// ── 상관 계수 매트릭스 (rebalanceScore.ts와 동일, 직접 참조 대신 복사 — export 안 됨) ──

const CORR: Record<AssetCategory, Record<AssetCategory, number>> = {
  cash:      { cash: 1.00, bond: 0.10, large_cap: -0.05, realestate: 0.05, bitcoin: 0.00, altcoin: 0.00 },
  bond:      { cash: 0.10, bond: 1.00, large_cap: -0.20, realestate: 0.15, bitcoin: 0.05, altcoin: 0.05 },
  large_cap: { cash: -0.05, bond: -0.20, large_cap: 1.00, realestate: 0.55, bitcoin: 0.35, altcoin: 0.45 },
  realestate:{ cash: 0.05, bond: 0.15, large_cap: 0.55, realestate: 1.00, bitcoin: 0.15, altcoin: 0.15 },
  bitcoin:   { cash: 0.00, bond: 0.05, large_cap: 0.35, realestate: 0.15, bitcoin: 1.00, altcoin: 0.85 },
  altcoin:   { cash: 0.00, bond: 0.05, large_cap: 0.45, realestate: 0.15, altcoin: 1.00, bitcoin: 0.85 },
};

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash: '현금',
  bond: '채권',
  large_cap: '주식',
  realestate: '부동산',
  bitcoin: 'BTC',
  altcoin: '알트',
};

const CATEGORY_SHORT: Record<AssetCategory, string> = {
  cash: '현금',
  bond: '채권',
  large_cap: '주식',
  realestate: '부산',
  bitcoin: 'BTC',
  altcoin: '알트',
};

// ── 상관 계수 → 색상 변환 ──

function corrToColor(corr: number): string {
  // -1(진한파랑) ~ 0(회색) ~ +1(진한빨강)
  if (corr >= 0.7) return 'rgba(207,102,121,0.6)';   // 강한 양의 상관
  if (corr >= 0.4) return 'rgba(207,102,121,0.3)';   // 중간 양의 상관
  if (corr >= 0.1) return 'rgba(207,102,121,0.12)';  // 약한 양의 상관
  if (corr > -0.1) return 'rgba(255,255,255,0.04)';  // 거의 무상관
  if (corr > -0.4) return 'rgba(100,181,246,0.15)';  // 약한 음의 상관
  return 'rgba(100,181,246,0.35)';                     // 강한 음의 상관 (헤지)
}

function corrToTextColor(corr: number): string {
  if (corr >= 0.4) return '#CF6679';
  if (corr <= -0.1) return '#64B5F6';
  return '#888';
}

// ── Props ──

interface CorrelationHeatmapSectionProps {
  assets: Asset[];
  totalAssets: number;
}

const CorrelationHeatmapSection = ({ assets, totalAssets }: CorrelationHeatmapSectionProps) => {
  const [showDetail, setShowDetail] = useState(false);

  // 보유 중인 자산 카테고리만 추출 (비중 > 0)
  const activeCategories = useMemo(() => {
    if (totalAssets <= 0) return [];
    const catSet = new Set<AssetCategory>();
    for (const asset of assets) {
      const cat = classifyAsset(asset);
      catSet.add(cat);
    }
    // 최소 2개 카테고리 필요 (1개면 상관관계 의미 없음)
    return Array.from(catSet);
  }, [assets, totalAssets]);

  // 평균 상관 계수 계산
  const avgCorrelation = useMemo(() => {
    if (activeCategories.length < 2) return 0;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < activeCategories.length; i++) {
      for (let j = i + 1; j < activeCategories.length; j++) {
        sum += CORR[activeCategories[i]][activeCategories[j]];
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }, [activeCategories]);

  // 2개 카테고리 미만이면 표시 안 함
  if (activeCategories.length < 2) return null;

  const diversificationLevel = avgCorrelation < 0.15 ? '우수' : avgCorrelation < 0.35 ? '양호' : '개선 필요';
  const divColor = avgCorrelation < 0.15 ? '#4CAF50' : avgCorrelation < 0.35 ? '#FFC107' : '#CF6679';

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.cardLabel}>자산 상관관계</Text>
          <Text style={s.cardLabelEn}>Correlation Matrix</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[s.divBadge, { backgroundColor: divColor + '20' }]}>
            <Text style={[s.divBadgeText, { color: divColor }]}>분산 {diversificationLevel}</Text>
          </View>
          <TouchableOpacity
            style={s.expandButton}
            onPress={() => setShowDetail(!showDetail)}
          >
            <Text style={s.expandButtonText}>{showDetail ? '접기' : '상세'}</Text>
            <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 요약: 평균 상관 계수 + 해석 */}
      <View style={s.summaryRow}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>평균 상관계수</Text>
          <Text style={[s.summaryValue, { color: corrToTextColor(avgCorrelation) }]}>
            {avgCorrelation >= 0 ? '+' : ''}{avgCorrelation.toFixed(2)}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>보유 자산군</Text>
          <Text style={s.summaryValue}>{activeCategories.length}종류</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>해석</Text>
          <Text style={[s.summaryValue, { color: divColor, fontSize: 11 }]}>
            {avgCorrelation < 0.15 ? '헤지 효과 큼' : avgCorrelation < 0.35 ? '적정 분산' : '쏠림 위험'}
          </Text>
        </View>
      </View>

      {/* 상세: 히트맵 그리드 */}
      {showDetail && (
        <View style={s.detailContainer}>
          {/* 범례 */}
          <View style={s.legend}>
            <View style={[s.legendItem, { backgroundColor: 'rgba(100,181,246,0.35)' }]}>
              <Text style={s.legendText}>음(-) 헤지</Text>
            </View>
            <View style={[s.legendItem, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
              <Text style={s.legendText}>무상관</Text>
            </View>
            <View style={[s.legendItem, { backgroundColor: 'rgba(207,102,121,0.6)' }]}>
              <Text style={[s.legendText, { color: '#FFF' }]}>양(+) 집중</Text>
            </View>
          </View>

          {/* 히트맵 그리드 */}
          <View style={s.grid}>
            {/* 헤더 행 (빈칸 + 카테고리 라벨) */}
            <View style={s.gridRow}>
              <View style={s.gridCorner} />
              {activeCategories.map(cat => (
                <View key={cat} style={s.gridHeaderCell}>
                  <Text style={s.gridHeaderText}>{CATEGORY_SHORT[cat]}</Text>
                </View>
              ))}
            </View>

            {/* 데이터 행 */}
            {activeCategories.map(rowCat => (
              <View key={rowCat} style={s.gridRow}>
                <View style={s.gridRowLabel}>
                  <Text style={s.gridRowLabelText}>{CATEGORY_LABELS[rowCat]}</Text>
                </View>
                {activeCategories.map(colCat => {
                  const corr = CORR[rowCat][colCat];
                  const isDiagonal = rowCat === colCat;
                  return (
                    <View
                      key={colCat}
                      style={[
                        s.gridCell,
                        { backgroundColor: isDiagonal ? 'rgba(255,255,255,0.08)' : corrToColor(corr) },
                      ]}
                    >
                      <Text style={[
                        s.gridCellText,
                        { color: isDiagonal ? '#555' : corrToTextColor(corr) },
                      ]}>
                        {isDiagonal ? '—' : corr.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* 해석 가이드 */}
          <View style={s.guideBox}>
            <Text style={s.guideText}>
              {avgCorrelation < 0.15
                ? '자산 간 상관관계가 낮아 분산 효과가 우수합니다. 한 자산이 하락해도 다른 자산이 방어할 수 있습니다.'
                : avgCorrelation < 0.35
                  ? '적정 수준의 분산입니다. 채권이나 현금 비중을 늘리면 상관관계를 더 낮출 수 있습니다.'
                  : '자산들이 비슷하게 움직여 동반 하락 위험이 있습니다. 채권/현금 등 음의 상관 자산을 추가하세요.'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

// ──────────────────────────────────────
// React.memo 최적화: assets 배열과 totalAssets 비교
// ──────────────────────────────────────

export default React.memo(CorrelationHeatmapSection, (prev, next) => {
  // totalAssets 비교
  if (prev.totalAssets !== next.totalAssets) return false;

  // assets 배열 길이 비교
  if (prev.assets.length !== next.assets.length) return false;

  // 각 자산의 ID와 currentValue만 비교 (카테고리 분류에 영향을 주는 필드)
  return prev.assets.every((asset, i) => {
    const nextAsset = next.assets[i];
    return (
      asset.id === nextAsset.id &&
      asset.currentValue === nextAsset.currentValue &&
      asset.assetType === nextAsset.assetType
    );
  });
});

const CELL_SIZE = 48;

const s = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cardLabelEn: { fontSize: 10, color: '#555', marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  expandButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandButtonText: { fontSize: 12, color: '#888' },
  divBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  divBadgeText: { fontSize: 11, fontWeight: '700' },

  // 요약 행
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: '#2A2A2A' },
  summaryLabel: { fontSize: 10, color: '#666', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // 상세
  detailContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#222', gap: 12 },

  // 범례
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  legendItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  legendText: { fontSize: 10, color: '#AAA', fontWeight: '500' },

  // 그리드
  grid: { alignSelf: 'center' },
  gridRow: { flexDirection: 'row' },
  gridCorner: { width: CELL_SIZE, height: 28 },
  gridHeaderCell: { width: CELL_SIZE, height: 28, justifyContent: 'center', alignItems: 'center' },
  gridHeaderText: { fontSize: 10, color: '#888', fontWeight: '600' },
  gridRowLabel: { width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 },
  gridRowLabelText: { fontSize: 10, color: '#888', fontWeight: '600' },
  gridCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    margin: 1,
  },
  gridCellText: { fontSize: 11, fontWeight: '600' },

  // 가이드
  guideBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
  },
  guideText: { fontSize: 12, color: '#999', lineHeight: 18 },
});
