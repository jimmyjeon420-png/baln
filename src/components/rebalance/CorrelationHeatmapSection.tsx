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
import type { Asset } from '../../types/asset';
import { classifyAsset, type AssetCategory } from '../../services/rebalanceScore';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import { ThemeColors } from '../../styles/colors';
import type { ActiveTheme } from '../../contexts/ThemeContext';

// ── 상관 계수 매트릭스 (rebalanceScore.ts와 동일, 직접 참조 대신 복사 — export 안 됨) ──

const CORR: Record<AssetCategory, Record<AssetCategory, number>> = {
  cash:      { cash: 1.00, bond: 0.10, large_cap: -0.05, realestate: 0.05, bitcoin: 0.00, altcoin: 0.00, gold: 0.05,  commodity: 0.00 },
  bond:      { cash: 0.10, bond: 1.00, large_cap: -0.20, realestate: 0.15, bitcoin: 0.05, altcoin: 0.05, gold: 0.10,  commodity: -0.10 },
  large_cap: { cash: -0.05, bond: -0.20, large_cap: 1.00, realestate: 0.55, bitcoin: 0.35, altcoin: 0.45, gold: 0.00, commodity: 0.25 },
  realestate:{ cash: 0.05, bond: 0.15, large_cap: 0.55, realestate: 1.00, bitcoin: 0.20, altcoin: 0.25, gold: 0.15,  commodity: 0.30 },
  bitcoin:   { cash: 0.00, bond: 0.05, large_cap: 0.35, realestate: 0.20, bitcoin: 1.00, altcoin: 0.80, gold: 0.15,  commodity: 0.10 },
  altcoin:   { cash: 0.00, bond: 0.05, large_cap: 0.45, realestate: 0.25, bitcoin: 0.80, altcoin: 1.00, gold: 0.05,  commodity: 0.05 },
  gold:      { cash: 0.05, bond: 0.10, large_cap: 0.00,  realestate: 0.15, bitcoin: 0.15, altcoin: 0.05, gold: 1.00,  commodity: 0.60 },
  commodity: { cash: 0.00, bond: -0.10, large_cap: 0.25, realestate: 0.30, bitcoin: 0.10, altcoin: 0.05, gold: 0.60,  commodity: 1.00 },
};

const CATEGORY_LABEL_KEYS: Record<AssetCategory, string> = {
  cash: 'correlation_section.cat_label_cash',
  bond: 'correlation_section.cat_label_bond',
  large_cap: 'correlation_section.cat_label_large_cap',
  realestate: 'correlation_section.cat_label_realestate',
  bitcoin: 'correlation_section.cat_label_bitcoin',
  altcoin: 'correlation_section.cat_label_altcoin',
  gold: 'correlation_section.cat_label_gold',
  commodity: 'correlation_section.cat_label_commodity',
};

const CATEGORY_SHORT_KEYS: Record<AssetCategory, string> = {
  cash: 'correlation_section.cat_cash',
  bond: 'correlation_section.cat_bond',
  large_cap: 'correlation_section.cat_large_cap',
  realestate: 'correlation_section.cat_realestate',
  bitcoin: 'correlation_section.cat_bitcoin',
  altcoin: 'correlation_section.cat_altcoin',
  gold: 'correlation_section.cat_gold',
  commodity: 'correlation_section.cat_commodity',
};

// ── 상관 계수 → 색상 변환 (테마 인식) ──

function corrToColor(corr: number, theme: ActiveTheme, colors: ThemeColors): string {
  // -1(진한파랑) ~ 0(회색) ~ +1(진한빨강)
  if (theme === 'light') {
    if (corr >= 0.7) return `${colors.error}30`;       // 강한 양의 상관
    if (corr >= 0.4) return `${colors.error}18`;       // 중간 양의 상관
    if (corr >= 0.1) return `${colors.error}0C`;       // 약한 양의 상관
    if (corr > -0.1) return `${colors.border}40`;      // 거의 무상관 — visible on white
    if (corr > -0.4) return `${colors.info}18`;        // 약한 음의 상관
    return `${colors.info}30`;                          // 강한 음의 상관 (헤지)
  }
  // dark mode
  if (corr >= 0.7) return `${colors.error}99`;        // 강한 양의 상관
  if (corr >= 0.4) return `${colors.error}4D`;        // 중간 양의 상관
  if (corr >= 0.1) return `${colors.error}1F`;        // 약한 양의 상관
  if (corr > -0.1) return `${colors.border}30`;       // 거의 무상관
  if (corr > -0.4) return `${colors.info}26`;         // 약한 음의 상관
  return `${colors.info}59`;                           // 강한 음의 상관 (헤지)
}

function corrToTextColor(corr: number, colors: ThemeColors): string {
  if (corr >= 0.4) return colors.error;
  if (corr <= -0.1) return colors.info;
  return colors.textTertiary;
}

// ── Props ──

interface CorrelationHeatmapSectionProps {
  assets: Asset[];
  totalAssets: number;
}

const CorrelationHeatmapSection = ({ assets, totalAssets }: CorrelationHeatmapSectionProps) => {
  const { colors, theme } = useTheme();
  const { t } = useLocale();
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

  const diversificationLevel = avgCorrelation < 0.15 ? t('correlation_section.div_excellent') : avgCorrelation < 0.35 ? t('correlation_section.div_good') : t('correlation_section.div_needs_improvement');
  const divColor = avgCorrelation < 0.15 ? colors.success : avgCorrelation < 0.35 ? colors.warning : colors.error;

  const styles = createStyles(colors);

  return (
    <View style={[styles.card, { backgroundColor: colors.inverseSurface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.cardLabel, { color: colors.inverseText }]}>{t('correlation_section.title')}</Text>
          <Text style={[styles.cardLabelEn, { color: colors.textTertiary }]}>Correlation Matrix</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.divBadge, { backgroundColor: divColor + '20' }]}>
            <Text style={[styles.divBadgeText, { color: divColor }]}>{t('correlation_section.div_badge', { level: diversificationLevel })}</Text>
          </View>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setShowDetail(!showDetail)}
          >
            <Text style={[styles.expandButtonText, { color: colors.textTertiary }]}>{showDetail ? t('correlation_section.collapse') : t('correlation_section.details')}</Text>
            <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 요약: 평균 상관 계수 + 해석 */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('correlation_section.avg_correlation')}</Text>
          <Text style={[styles.summaryValue, { color: corrToTextColor(avgCorrelation, colors) }]}>
            {avgCorrelation >= 0 ? '+' : ''}{avgCorrelation.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('correlation_section.asset_classes')}</Text>
          <Text style={[styles.summaryValue, { color: colors.inverseText }]}>{t('correlation_section.types_count', { count: String(activeCategories.length) })}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('correlation_section.analysis')}</Text>
          <Text style={[styles.summaryValue, { color: divColor, fontSize: 13 }]}>
            {avgCorrelation < 0.15 ? t('correlation_section.analysis_excellent') : avgCorrelation < 0.35 ? t('correlation_section.analysis_good') : t('correlation_section.analysis_poor')}
          </Text>
        </View>
      </View>

      {/* 상세: 히트맵 그리드 */}
      {showDetail && (
        <View style={[styles.detailContainer, { borderTopColor: colors.border }]}>
          {/* 범례 */}
          <View style={styles.legend}>
            <View style={[styles.legendItem, { backgroundColor: `${colors.info}30` }]}>
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('correlation_section.legend_negative')}</Text>
            </View>
            <View style={[styles.legendItem, { backgroundColor: `${colors.border}40` }]}>
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('correlation_section.legend_neutral')}</Text>
            </View>
            <View style={[styles.legendItem, { backgroundColor: `${colors.error}30` }]}>
              <Text style={[styles.legendText, { color: colors.textPrimary }]}>{t('correlation_section.legend_positive')}</Text>
            </View>
          </View>

          {/* 히트맵 그리드 */}
          <View style={styles.grid}>
            {/* 헤더 행 (빈칸 + 카테고리 라벨) */}
            <View style={styles.gridRow}>
              <View style={styles.gridCorner} />
              {activeCategories.map(cat => (
                <View key={cat} style={styles.gridHeaderCell}>
                  <Text style={[styles.gridHeaderText, { color: colors.textTertiary }]}>{t(CATEGORY_SHORT_KEYS[cat])}</Text>
                </View>
              ))}
            </View>

            {/* 데이터 행 */}
            {activeCategories.map(rowCat => (
              <View key={rowCat} style={styles.gridRow}>
                <View style={styles.gridRowLabel}>
                  <Text style={[styles.gridRowLabelText, { color: colors.textTertiary }]}>{t(CATEGORY_LABEL_KEYS[rowCat])}</Text>
                </View>
                {activeCategories.map(colCat => {
                  const corr = CORR[rowCat][colCat];
                  const isDiagonal = rowCat === colCat;
                  return (
                    <View
                      key={colCat}
                      style={[
                        styles.gridCell,
                        { backgroundColor: isDiagonal ? `${colors.border}40` : corrToColor(corr, theme, colors) },
                      ]}
                    >
                      <Text style={[
                        styles.gridCellText,
                        { color: isDiagonal ? colors.textQuaternary : corrToTextColor(corr, colors) },
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
          <View style={[styles.guideBox, { backgroundColor: `${colors.surfaceElevated}` }]}>
            <Text style={[styles.guideText, { color: colors.textSecondary }]}>
              {avgCorrelation < 0.15
                ? t('correlation_section.guide_excellent')
                : avgCorrelation < 0.35
                  ? t('correlation_section.guide_good')
                  : t('correlation_section.guide_poor')}
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

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  cardLabel: { fontSize: 17, fontWeight: '700' },
  cardLabelEn: { fontSize: 12, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  expandButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandButtonText: { fontSize: 14 },
  divBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  divBadgeText: { fontSize: 13, fontWeight: '700' },

  // 요약 행
  summaryRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700' },

  // 상세
  detailContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 12 },

  // 범례
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  legendItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  legendText: { fontSize: 12, fontWeight: '500' },

  // 그리드
  grid: { alignSelf: 'center' },
  gridRow: { flexDirection: 'row' },
  gridCorner: { width: CELL_SIZE, height: 28 },
  gridHeaderCell: { width: CELL_SIZE, height: 28, justifyContent: 'center', alignItems: 'center' },
  gridHeaderText: { fontSize: 12, fontWeight: '600' },
  gridRowLabel: { width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 },
  gridRowLabelText: { fontSize: 12, fontWeight: '600' },
  gridCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    margin: 1,
  },
  gridCellText: { fontSize: 13, fontWeight: '600' },

  // 가이드
  guideBox: {
    borderRadius: 8,
    padding: 12,
  },
  guideText: { fontSize: 14, lineHeight: 20 },
});
