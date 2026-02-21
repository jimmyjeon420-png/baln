/**
 * tier-strategy.tsx - 티어 맞춤 전략 상세 페이지
 *
 * 비유: "나만의 투자 전략 교과서" — 내 자산 등급에 맞는
 * 상세 전략, 할 일 체크리스트, 포트폴리오 적합도까지 한눈에
 *
 * 토스 스타일 6개 섹션:
 * 1. Hero: 티어 아이콘 + 감정 카피 + 자산 총액
 * 2. 핵심 전략 4개 (아코디언 카드)
 * 3. 이번 분기 할 일 (체크리스트)
 * 4. 내 포트폴리오 적합도 (게이지 바)
 * 5. 다음 티어 미리보기 (동기부여)
 * 6. CTA 버튼
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSharedPortfolio } from '../src/hooks/useSharedPortfolio';
import { useSharedAnalysis } from '../src/hooks/useSharedAnalysis';
import { useHaptics } from '../src/hooks/useHaptics';
import { useTheme } from '../src/hooks/useTheme';
import {
  TIER_STRATEGIES,
  TIER_STRATEGY_DETAILS,
} from '../src/constants/tierStrategy';
import {
  TIER_LABELS,
  TIER_ICONS,
  TIER_COLORS,
  TIER_THRESHOLDS,
} from '../src/types/community';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TierStrategyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lightTap, mediumTap } = useHaptics();

  // 공유 훅 데이터
  const {
    portfolioAssets: portfolio,
    totalAssets,
    userTier,
  } = useSharedPortfolio();

  const {
    riskAnalysis: analysisResult,
  } = useSharedAnalysis(portfolio);

  // 현재 티어 데이터
  const tierBasic = TIER_STRATEGIES[userTier];
  const tierDetail = TIER_STRATEGY_DETAILS[userTier];
  const tierColor = TIER_COLORS[userTier] || '#FFD700';
  const tierLabel = TIER_LABELS[userTier] || '골드';
  const tierIcon = TIER_ICONS[userTier] || 'trophy';

  // 아코디언 펼침 상태 (null = 모두 접힘)
  const [expandedStrategy, setExpandedStrategy] = useState<number | null>(null);

  // 체크리스트 상태 (로컬)
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set());

  // 포트폴리오 적합도 계산
  const fitData = useMemo(() => {
    if (!portfolio || portfolio.length === 0) return null;

    // 자산 분류 (간단 분류)
    let stockValue = 0;
    let bondValue = 0;
    let cashValue = 0;

    portfolio.forEach(asset => {
      const ticker = asset.ticker.toUpperCase();
      // 채권 ETF 판별
      if (['TLT', 'IEF', 'SHY', 'BND', 'AGG', 'LQD', 'HYG', 'TIPS', 'KOSEF국고채'].some(b => ticker.includes(b))) {
        bondValue += asset.currentValue;
      // 현금/MMF 판별
      } else if (['CASH', 'MMF', 'CMA', 'TIGER단기', 'KODEX단기'].some(c => ticker.includes(c))) {
        cashValue += asset.currentValue;
      } else {
        stockValue += asset.currentValue;
      }
    });

    const total = stockValue + bondValue + cashValue;
    if (total === 0) return null;

    const stockPct = (stockValue / total) * 100;
    const bondPct = (bondValue / total) * 100;
    const cashPct = (cashValue / total) * 100;

    // 분산도 (분석 결과가 있으면 그것을 사용, 없으면 추정)
    const diversification = analysisResult?.portfolioSnapshot?.diversificationScore ??
      Math.min(100, portfolio.length * 15);

    return [stockPct, bondPct, cashPct, diversification];
  }, [portfolio, analysisResult]);

  // 손익 계산
  const snapshot = analysisResult?.portfolioSnapshot;
  const totalGainLoss = snapshot?.totalGainLoss ?? 0;
  const gainPercent = snapshot?.gainLossPercent ?? 0;
  const isPositive = totalGainLoss >= 0;

  // 체크리스트 토글
  const toggleCheck = (idx: number) => {
    lightTap();
    setCheckedActions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // 다음 티어 진행률 계산
  const nextTier = tierDetail.nextTierPreview;
  const nextTierProgress = nextTier
    ? Math.min(100, (totalAssets / nextTier.requiredAssets) * 100)
    : 100;

  const checkedCount = checkedActions.size;
  const totalActions = tierDetail.quarterlyActions.length;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 상단 네비게이션 */}
      <View style={s.nav}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => {
            lightTap();
            router.back();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.navTitle}>{tierLabel} 맞춤 전략</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ═══ Section 1: Hero 영역 ═══ */}
        <View style={s.hero}>
          {/* 티어 아이콘 */}
          <View style={[s.heroIconCircle, { backgroundColor: tierColor + '20' }]}>
            <Ionicons
              name={tierIcon as any}
              size={32}
              color={tierColor}
            />
          </View>

          {/* 전략 타이틀 */}
          <Text style={[s.heroTitle, { color: tierColor }]}>{tierBasic.title}</Text>

          {/* 감정 카피 */}
          <Text style={s.heroTagline}>{tierDetail.hero.tagline}</Text>
          <Text style={s.heroSubtitle}>{tierDetail.hero.subtitle}</Text>

          {/* 총 자산 + 손익 뱃지 */}
          <Text style={s.heroAmount}>₩{Math.floor(totalAssets).toLocaleString()}</Text>
          {snapshot && (
            <View style={[s.heroBadge, {
              backgroundColor: isPositive ? 'rgba(76,175,80,0.12)' : 'rgba(207,102,121,0.12)',
            }]}>
              <Ionicons
                name={isPositive ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={isPositive ? '#4CAF50' : '#CF6679'}
              />
              <Text style={[s.heroBadgeText, { color: isPositive ? '#4CAF50' : '#CF6679' }]}>
                {isPositive ? '+' : ''}₩{Math.floor(Math.abs(totalGainLoss)).toLocaleString()}
                {' '}({isPositive ? '+' : ''}{gainPercent.toFixed(1)}%)
              </Text>
            </View>
          )}
        </View>

        {/* ═══ Section 2: 핵심 전략 4개 (아코디언) ═══ */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>핵심 전략</Text>
            <Text style={s.sectionSubtitle}>탭하여 상세 내용을 확인하세요</Text>
          </View>

          {tierDetail.strategies.map((strategy, idx) => {
            const isOpen = expandedStrategy === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={[s.accordionCard, isOpen && s.accordionCardOpen]}
                onPress={() => {
                  mediumTap();
                  setExpandedStrategy(isOpen ? null : idx);
                }}
                activeOpacity={0.7}
              >
                {/* 접힌 상태: 아이콘 + 제목 + 핵심 수치 뱃지 */}
                <View style={s.accordionHeader}>
                  <View style={[s.accordionIcon, { backgroundColor: tierColor + '15' }]}>
                    <Ionicons name={strategy.icon as any} size={20} color={tierColor} />
                  </View>
                  <View style={s.accordionHeaderText}>
                    <Text style={s.accordionTitle}>{strategy.title}</Text>
                    <Text style={s.accordionSubtitle}>{strategy.subtitle}</Text>
                  </View>
                  <View style={[s.highlightBadge, { backgroundColor: tierColor + '20' }]}>
                    <Text style={[s.highlightBadgeText, { color: tierColor }]}>{strategy.highlight}</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#666"
                    style={{ marginLeft: 4 }}
                  />
                </View>

                {/* 펼친 상태: 상세 설명 + 실천 팁 */}
                {isOpen && (
                  <View style={s.accordionBody}>
                    <Text style={s.accordionDesc}>{strategy.description}</Text>
                    <View style={s.tipsContainer}>
                      <Text style={s.tipsLabel}>실천 팁</Text>
                      {strategy.tips.map((tip, tidx) => (
                        <View key={tidx} style={s.tipItem}>
                          <View style={[s.tipBullet, { backgroundColor: tierColor }]}>
                            <Text style={s.tipBulletText}>{tidx + 1}</Text>
                          </View>
                          <Text style={s.tipText}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══ Section 3: 이번 분기 할 일 (체크리스트) ═══ */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>이번 분기 할 일</Text>
              <View style={s.progressBadge}>
                <Text style={s.progressText}>{checkedCount}/{totalActions} 완료</Text>
              </View>
            </View>

            {/* 진행률 바 */}
            <View style={s.progressBar}>
              <View style={[s.progressFill, {
                width: `${totalActions > 0 ? (checkedCount / totalActions) * 100 : 0}%`,
                backgroundColor: tierColor,
              }]} />
            </View>
          </View>

          {tierDetail.quarterlyActions.map((action, idx) => {
            const isChecked = checkedActions.has(idx);
            const priorityConfig = {
              HIGH:   { label: '높음', color: '#CF6679', bg: 'rgba(207,102,121,0.12)' },
              MEDIUM: { label: '보통', color: '#FFC107', bg: 'rgba(255,193,7,0.12)' },
              LOW:    { label: '낮음', color: '#888', bg: 'rgba(136,136,136,0.12)' },
            };
            const pc = priorityConfig[action.priority];

            return (
              <TouchableOpacity
                key={idx}
                style={[s.checkItem, isChecked && s.checkItemDone]}
                onPress={() => toggleCheck(idx)}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, isChecked && { backgroundColor: tierColor, borderColor: tierColor }]}>
                  {isChecked && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
                <Text style={[s.checkText, isChecked && s.checkTextDone]}>{action.text}</Text>
                <View style={[s.priorityBadge, { backgroundColor: pc.bg }]}>
                  <Text style={[s.priorityText, { color: pc.color }]}>{pc.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══ Section 4: 내 포트폴리오 적합도 (게이지 바) ═══ */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>포트폴리오 적합도</Text>
            <Text style={s.sectionSubtitle}>녹색 영역이 {tierLabel} 티어 이상 범위입니다</Text>
          </View>

          {tierDetail.fitCriteria.map((criterion, idx) => {
            const currentValue = fitData ? fitData[idx] : 0;
            const isInRange = currentValue >= criterion.idealMin && currentValue <= criterion.idealMax;

            return (
              <View key={idx} style={s.gaugeItem}>
                <View style={s.gaugeHeader}>
                  <View style={s.gaugeLabelRow}>
                    <Ionicons name={criterion.icon as any} size={16} color={isInRange ? '#4CAF50' : '#FFC107'} />
                    <Text style={s.gaugeLabel}>{criterion.label}</Text>
                  </View>
                  <Text style={[s.gaugeValue, { color: isInRange ? '#4CAF50' : '#FFC107' }]}>
                    {currentValue.toFixed(0)}%
                  </Text>
                </View>

                {/* 게이지 바 */}
                <View style={s.gaugeBar}>
                  {/* 이상 범위 (녹색 영역) */}
                  <View style={[
                    s.gaugeIdealRange,
                    {
                      left: `${criterion.idealMin}%`,
                      width: `${criterion.idealMax - criterion.idealMin}%`,
                    },
                  ]} />

                  {/* 현재 값 마커 */}
                  <View style={[
                    s.gaugeMarker,
                    {
                      left: `${Math.min(100, Math.max(0, currentValue))}%`,
                      backgroundColor: isInRange ? '#4CAF50' : '#FFC107',
                    },
                  ]} />
                </View>

                {/* 범위 라벨 */}
                <View style={s.gaugeRangeRow}>
                  <Text style={s.gaugeRangeText}>0%</Text>
                  <Text style={s.gaugeRangeIdeal}>
                    이상: {criterion.idealMin}~{criterion.idealMax}%
                  </Text>
                  <Text style={s.gaugeRangeText}>100%</Text>
                </View>
              </View>
            );
          })}

          {!fitData && (
            <View style={s.noDataCard}>
              <Ionicons name="information-circle-outline" size={20} color="#666" />
              <Text style={s.noDataText}>포트폴리오 데이터가 필요합니다</Text>
            </View>
          )}
        </View>

        {/* ═══ Section 5: 다음 티어 미리보기 ═══ */}
        {nextTier ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>다음 목표</Text>
            </View>

            <View style={[s.nextTierCard, { borderColor: nextTier.tierColor + '40' }]}>
              {/* 잠금 아이콘 + 다음 티어 */}
              <View style={s.nextTierHeader}>
                <View style={[s.nextTierIcon, { backgroundColor: nextTier.tierColor + '15' }]}>
                  <Ionicons name="lock-closed" size={20} color={nextTier.tierColor} />
                </View>
                <View style={s.nextTierHeaderText}>
                  <Text style={[s.nextTierName, { color: nextTier.tierColor }]}>
                    {nextTier.tierName} 등급
                  </Text>
                  <Text style={s.nextTierRequired}>
                    ₩{Math.floor(nextTier.requiredAssets).toLocaleString()} 이상
                  </Text>
                </View>
              </View>

              {/* 혜택 미리보기 */}
              {nextTier.benefits.map((benefit, idx) => (
                <View key={idx} style={s.nextTierBenefit}>
                  <Ionicons name="star" size={14} color={nextTier.tierColor} />
                  <Text style={s.nextTierBenefitText}>{benefit}</Text>
                </View>
              ))}

              {/* 진행 바 */}
              <View style={s.nextTierProgressContainer}>
                <View style={s.nextTierProgressBar}>
                  <View style={[s.nextTierProgressFill, {
                    width: `${nextTierProgress}%`,
                    backgroundColor: nextTier.tierColor,
                  }]} />
                </View>
                <Text style={s.nextTierProgressText}>
                  {nextTierProgress.toFixed(1)}% 달성
                </Text>
              </View>

              {/* 남은 금액 */}
              {totalAssets < nextTier.requiredAssets && (
                <Text style={s.nextTierRemaining}>
                  ₩{Math.floor(nextTier.requiredAssets - totalAssets).toLocaleString()} 더 필요합니다
                </Text>
              )}
            </View>
          </View>
        ) : (
          // DIAMOND: 최고 등급 축하 카드
          <View style={s.section}>
            <View style={[s.diamondCard, { borderColor: tierColor + '40' }]}>
              <View style={s.diamondIconRow}>
                <Ionicons name="diamond" size={28} color={tierColor} />
                <Ionicons name="trophy" size={28} color="#FFD700" />
                <Ionicons name="diamond" size={28} color={tierColor} />
              </View>
              <Text style={[s.diamondTitle, { color: tierColor }]}>최고 등급을 달성하셨습니다</Text>
              <Text style={s.diamondSubtitle}>
                다이아몬드 회원으로서 모든 프리미엄 전략과{'\n'}서비스를 이용하실 수 있습니다
              </Text>
            </View>
          </View>
        )}

        {/* ═══ Section 6: CTA 버튼 ═══ */}
        <View style={s.ctaSection}>
          <TouchableOpacity
            style={[s.ctaButton, { backgroundColor: tierColor }]}
            onPress={() => {
              mediumTap();
              router.push('/(tabs)/rebalance');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="sync" size={20} color="#000" />
            <Text style={s.ctaText}>포트폴리오 조정하기</Text>
          </TouchableOpacity>

          <Text style={s.disclaimer}>
            이 정보는 투자 자문이 아닙니다. 투자 결정은 전적으로 본인의 판단 하에 이루어져야 합니다.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // ── 네비게이션 ──
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },

  scroll: {
    paddingBottom: 100,
  },

  // ── Section 1: Hero ──
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroTagline: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  heroAmount: {
    fontSize: 33,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ── 섹션 공통 ──
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFF',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },

  // ── Section 2: 아코디언 카드 ──
  accordionCard: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  accordionCardOpen: {
    borderColor: 'rgba(76,175,80,0.2)',
    backgroundColor: '#161616',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accordionHeaderText: {
    flex: 1,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  accordionSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  highlightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  highlightBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accordionBody: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  accordionDesc: {
    fontSize: 14,
    color: '#BBB',
    lineHeight: 22,
    marginBottom: 14,
  },
  tipsContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
  },
  tipsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  tipBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipBulletText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#CCC',
    lineHeight: 21,
  },

  // ── Section 3: 체크리스트 ──
  progressBadge: {
    backgroundColor: 'rgba(76,175,80,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#1E1E1E',
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    gap: 12,
  },
  checkItemDone: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
  checkTextDone: {
    textDecorationLine: 'line-through',
    color: '#666',
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

  // ── Section 4: 게이지 바 ──
  gaugeItem: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gaugeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gaugeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  gaugeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  gaugeBar: {
    height: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  gaugeIdealRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(76,175,80,0.25)',
    borderRadius: 4,
  },
  gaugeMarker: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  gaugeRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  gaugeRangeText: {
    fontSize: 11,
    color: '#555',
  },
  gaugeRangeIdeal: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  noDataCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
  },

  // ── Section 5: 다음 티어 ──
  nextTierCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  nextTierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  nextTierIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextTierHeaderText: {},
  nextTierName: {
    fontSize: 19,
    fontWeight: '800',
  },
  nextTierRequired: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  nextTierBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  nextTierBenefitText: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
  nextTierProgressContainer: {
    marginTop: 10,
  },
  nextTierProgressBar: {
    height: 6,
    backgroundColor: '#1E1E1E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nextTierProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  nextTierProgressText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'right',
  },
  nextTierRemaining: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },

  // DIAMOND 축하 카드
  diamondCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
  },
  diamondIconRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  diamondTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
  },
  diamondSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 21,
  },

  // ── Section 6: CTA ──
  ctaSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  disclaimer: {
    fontSize: 11,
    color: '#444',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 16,
  },
});
