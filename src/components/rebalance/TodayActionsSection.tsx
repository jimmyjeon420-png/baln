/**
 * 오늘의 액션 섹션 — BUY/SELL/WATCH 종목별 액션 + 실시간 가격 + AI 딥다이브
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkeletonBlock } from '../SkeletonLoader';
import { estimateTax } from '../../utils/taxEstimator';
import type { PortfolioAction, RebalancePortfolioAsset, LivePriceData } from '../../types/rebalanceTypes';

// ── 액션 체크리스트 (오늘 날짜 기준 AsyncStorage) ──

const CHECKLIST_KEY = '@action_checklist';

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function useActionChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHECKLIST_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // 오늘 날짜 데이터만 로드 (하루 지나면 자동 리셋)
          if (parsed.date === getTodayKey()) {
            setChecked(parsed.items || {});
          }
        }
      } catch {}
    })();
  }, []);

  const toggle = useCallback(async (ticker: string) => {
    setChecked(prev => {
      const next = { ...prev, [ticker]: !prev[ticker] };
      AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify({
        date: getTodayKey(),
        items: next,
      })).catch(() => {});
      return next;
    });
  }, []);

  return { checked, toggle };
}

// 액션 색상 매핑
const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  BUY:   { bg: 'rgba(76,175,80,0.15)',  text: '#4CAF50', label: '매수' },
  SELL:  { bg: 'rgba(207,102,121,0.15)', text: '#CF6679', label: '매도' },
  HOLD:  { bg: 'rgba(136,136,136,0.15)', text: '#888888', label: '보유' },
  WATCH: { bg: 'rgba(255,193,7,0.15)',   text: '#FFC107', label: '주시' },
};

interface TodayActionsSectionProps {
  sortedActions: PortfolioAction[];
  portfolio: RebalancePortfolioAsset[];
  livePrices: Record<string, LivePriceData | undefined>;
  totalAssets: number;
  isAILoading: boolean;
}

export default function TodayActionsSection({
  sortedActions,
  portfolio,
  livePrices,
  totalAssets,
  isAILoading,
}: TodayActionsSectionProps) {
  const router = useRouter();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const { checked, toggle } = useActionChecklist();

  // 완료 카운트
  const completedCount = sortedActions.filter(a => checked[a.ticker]).length;

  // AI 로딩 중 스켈레톤
  if (isAILoading && sortedActions.length === 0) {
    return (
      <View style={s.card}>
        <SkeletonBlock width={120} height={16} />
        <View style={{ marginTop: 12, gap: 8 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{ backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14 }}>
              <SkeletonBlock width={60} height={14} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="85%" height={12} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (sortedActions.length === 0) return null;

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.cardLabel}>오늘의 액션</Text>
          <Text style={s.cardLabelEn}>Today's Actions</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {completedCount > 0 && (
            <View style={s.completedCount}>
              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={s.completedCountText}>{completedCount}완료</Text>
            </View>
          )}
          <View style={s.actionCount}>
            <Text style={s.actionCountText}>{sortedActions.length}건</Text>
          </View>
        </View>
      </View>

      {sortedActions.slice(0, 5).map((action, idx) => {
        const ac = ACTION_COLORS[action.action] || ACTION_COLORS.HOLD;
        const isHighPriority = action.priority === 'HIGH';
        const isExpanded = expandedIdx === idx;
        const isDone = !!checked[action.ticker];

        // 포트폴리오에서 해당 종목 찾기
        const matchedAsset = portfolio.find(
          a => a.ticker.toUpperCase() === action.ticker.toUpperCase()
        );

        // 실시간 가격
        const liveData = livePrices[action.ticker];
        const displayPrice = liveData?.currentPrice || matchedAsset?.currentPrice || 0;
        const isLive = !!liveData?.currentPrice;

        const assetGl = matchedAsset && matchedAsset.avgPrice > 0 && displayPrice > 0
          ? ((displayPrice - matchedAsset.avgPrice) / matchedAsset.avgPrice) * 100
          : null;
        const assetWeight = matchedAsset && totalAssets > 0
          ? ((matchedAsset.currentValue / totalAssets) * 100).toFixed(1)
          : null;

        // 우선순위 설정
        const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
          HIGH:   { label: '긴급', color: '#CF6679', bg: 'rgba(207,102,121,0.12)' },
          MEDIUM: { label: '보통', color: '#FFC107', bg: 'rgba(255,193,7,0.12)' },
          LOW:    { label: '참고', color: '#888888', bg: 'rgba(136,136,136,0.12)' },
        };
        const pc = priorityConfig[action.priority] || priorityConfig.LOW;

        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.7}
            onPress={() => setExpandedIdx(isExpanded ? null : idx)}
            style={[
              s.actionItem,
              isHighPriority && { borderLeftWidth: 3, borderLeftColor: ac.text },
              isExpanded && s.actionItemExpanded,
              isDone && { opacity: 0.5 },
            ]}
          >
            {/* 상단: 액션 뱃지 + 종목명 + 체크박스 */}
            <View style={s.actionTop}>
              <View style={[s.actionBadge, { backgroundColor: ac.bg }]}>
                <Text style={[s.actionBadgeText, { color: ac.text }]}>{ac.label}</Text>
              </View>
              <Text style={s.actionTicker}>{isDone ? '✓ ' : ''}{action.ticker}</Text>
              <Text style={s.actionName} numberOfLines={1}>{action.name}</Text>
              {isHighPriority && !isDone && (
                <View style={s.urgentDot}>
                  <Text style={s.urgentDotText}>!</Text>
                </View>
              )}
              {/* 실행 완료 체크 버튼 */}
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); toggle(action.ticker); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[s.checkBtn, isDone && s.checkBtnDone]}
              >
                <Ionicons
                  name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={isDone ? '#4CAF50' : '#444'}
                />
              </TouchableOpacity>
            </View>

            {/* 현재가 + 등락률 (접힌 상태) */}
            {!isExpanded && displayPrice > 0 && (
              <View style={s.priceRow}>
                <Text style={s.priceText}>₩{displayPrice.toLocaleString()}</Text>
                {assetGl !== null && (
                  <Text style={[s.changeText, { color: (assetGl ?? 0) >= 0 ? '#4CAF50' : '#CF6679' }]}>
                    {(assetGl ?? 0) >= 0 ? '+' : ''}{(assetGl ?? 0).toFixed(1)}%
                  </Text>
                )}
                {isLive && (
                  <View style={s.liveIndicator}>
                    <View style={s.liveDotSmall} />
                    <Text style={s.liveLabel}>LIVE</Text>
                  </View>
                )}
              </View>
            )}

            {/* 접힌 상태: 사유 2줄 */}
            {!isExpanded && (
              <Text style={s.actionReason} numberOfLines={2}>{action.reason}</Text>
            )}

            {/* 펼친 상태: 상세 정보 */}
            {isExpanded && (
              <View style={s.detail}>
                {/* 우선순위 뱃지 */}
                <View style={[s.priorityBadge, { backgroundColor: pc.bg }]}>
                  <View style={[s.priorityDot, { backgroundColor: pc.color }]} />
                  <Text style={[s.priorityText, { color: pc.color }]}>우선순위: {pc.label}</Text>
                </View>

                {/* 전체 사유 */}
                <View style={s.reasonFull}>
                  <Ionicons name="chatbubble-outline" size={13} color="#666" />
                  <Text style={s.reasonFullText}>{action.reason}</Text>
                </View>

                {/* 내 보유 현황 */}
                {matchedAsset && (
                  <View style={s.portfolioInfo}>
                    <Text style={s.portfolioTitle}>내 보유 현황</Text>
                    <View style={s.portfolioRow}>
                      <View style={s.portfolioItem}>
                        <Text style={s.portfolioLabel}>현재가{isLive ? ' (실시간)' : ''}</Text>
                        <Text style={s.portfolioValue}>₩{displayPrice.toLocaleString()}</Text>
                      </View>
                      <View style={s.portfolioDivider} />
                      <View style={s.portfolioItem}>
                        <Text style={s.portfolioLabel}>수익률</Text>
                        <Text style={[s.portfolioValue, { color: (assetGl ?? 0) >= 0 ? '#4CAF50' : '#CF6679' }]}>
                          {(assetGl ?? 0) >= 0 ? '+' : ''}{(assetGl ?? 0).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={s.portfolioDivider} />
                      <View style={s.portfolioItem}>
                        <Text style={s.portfolioLabel}>비중</Text>
                        <Text style={s.portfolioValue}>{assetWeight}%</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 제안 금액/수량 */}
                {displayPrice > 0 && (action.action === 'BUY' || action.action === 'SELL') && (
                  <View style={s.suggestBox}>
                    <Ionicons name="calculator-outline" size={13} color="#FFC107" />
                    <Text style={s.suggestText}>
                      {action.action === 'BUY'
                        ? `제안: ${displayPrice > 0 ? Math.floor(totalAssets * 0.02 / displayPrice) : 0}주 (₩${Math.floor(totalAssets * 0.02).toLocaleString()}, 총자산 2%)`
                        : matchedAsset
                          ? `보유 ${matchedAsset.quantity ?? 0}주 중 일부 매도 검토`
                          : '매도 수량은 보유량에 따라 결정'
                      }
                    </Text>
                  </View>
                )}

                {/* 세금/수수료 시뮬레이션 (SELL 액션만) */}
                {action.action === 'SELL' && matchedAsset && displayPrice > 0 && (() => {
                  const qty = matchedAsset.quantity ?? 0;
                  if (qty <= 0) return null;
                  const sellAmt = displayPrice * qty;
                  const tax = estimateTax(action.ticker, sellAmt, matchedAsset.avgPrice, displayPrice, qty);
                  return (
                    <View style={s.taxBox}>
                      <View style={s.taxHeader}>
                        <Ionicons name="receipt-outline" size={13} color="#64B5F6" />
                        <Text style={s.taxHeaderText}>전량 매도 시 예상 비용</Text>
                        <Text style={s.taxAssetType}>{tax.assetTypeLabel}</Text>
                      </View>
                      <View style={s.taxRows}>
                        {tax.transactionTax > 0 && (
                          <View style={s.taxRow}>
                            <Text style={s.taxLabel}>거래세</Text>
                            <Text style={s.taxValue}>₩{tax.transactionTax.toLocaleString()}</Text>
                          </View>
                        )}
                        <View style={s.taxRow}>
                          <Text style={s.taxLabel}>수수료</Text>
                          <Text style={s.taxValue}>₩{tax.brokerageFee.toLocaleString()}</Text>
                        </View>
                        {tax.capitalGainsTax > 0 && (
                          <View style={s.taxRow}>
                            <Text style={s.taxLabel}>양도소득세</Text>
                            <Text style={[s.taxValue, { color: '#CF6679' }]}>₩{tax.capitalGainsTax.toLocaleString()}</Text>
                          </View>
                        )}
                        <View style={[s.taxRow, s.taxTotalRow]}>
                          <Text style={s.taxTotalLabel}>실수령 예상</Text>
                          <Text style={s.taxTotalValue}>₩{tax.netProceeds.toLocaleString()}</Text>
                        </View>
                      </View>
                      {tax.note ? <Text style={s.taxNote}>{tax.note}</Text> : null}
                      <Text style={s.taxDisclaimer}>* 참고용이며 실제 세금은 개인 상황에 따라 다릅니다</Text>
                    </View>
                  );
                })()}

                {/* 실행 완료 기록 (BUY/SELL만) */}
                {(action.action === 'BUY' || action.action === 'SELL') && displayPrice > 0 && (
                  <TouchableOpacity
                    style={s.logExecutionBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      const suggestedQty = action.action === 'BUY'
                        ? Math.floor(totalAssets * 0.02 / displayPrice)
                        : matchedAsset?.quantity ?? 0;
                      router.push({
                        pathname: '/log-trade',
                        params: {
                          ticker: action.ticker,
                          name: action.name,
                          action: action.action,
                          suggestedPrice: displayPrice.toString(),
                          suggestedQty: suggestedQty.toString(),
                        },
                      });
                    }}
                  >
                    <Ionicons name="checkbox-outline" size={14} color="#4CAF50" />
                    <Text style={s.logExecutionText}>실행 완료 기록</Text>
                    <Ionicons name="chevron-forward" size={14} color="#4CAF50" />
                  </TouchableOpacity>
                )}

                {/* AI 딥다이브 */}
                <TouchableOpacity
                  style={s.deepDiveBtn}
                  activeOpacity={0.7}
                  onPress={() => router.push({
                    pathname: '/marketplace',
                    params: { ticker: action.ticker, feature: 'deep_dive' },
                  })}
                >
                  <Ionicons name="sparkles" size={14} color="#7C4DFF" />
                  <Text style={s.deepDiveText}>AI 딥다이브 분석 보기</Text>
                  <Ionicons name="chevron-forward" size={14} color="#7C4DFF" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

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
  actionCount: { backgroundColor: 'rgba(76,175,80,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actionCountText: { fontSize: 11, color: '#4CAF50', fontWeight: '600' },
  completedCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  completedCountText: { fontSize: 10, color: '#4CAF50', fontWeight: '500' },
  actionItem: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, marginBottom: 8 },
  actionItemExpanded: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: 'rgba(76,175,80,0.2)' },
  actionTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  checkBtn: { padding: 2 },
  checkBtnDone: {},
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionBadgeText: { fontSize: 11, fontWeight: '800' },
  actionTicker: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  actionName: { flex: 1, fontSize: 12, color: '#666' },
  urgentDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#CF6679', justifyContent: 'center', alignItems: 'center' },
  urgentDotText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  actionReason: { fontSize: 12, color: '#999', lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  priceText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  changeText: { fontSize: 12, fontWeight: '600' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  liveDotSmall: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#4CAF50' },
  liveLabel: { fontSize: 9, fontWeight: '700', color: '#4CAF50', letterSpacing: 0.5 },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#2A2A2A', gap: 10 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  reasonFull: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 },
  reasonFullText: { flex: 1, fontSize: 13, color: '#CCC', lineHeight: 20 },
  portfolioInfo: { backgroundColor: 'rgba(76,175,80,0.06)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(76,175,80,0.1)' },
  portfolioTitle: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 8 },
  portfolioRow: { flexDirection: 'row', alignItems: 'center' },
  portfolioItem: { flex: 1, alignItems: 'center' },
  portfolioDivider: { width: 1, height: 28, backgroundColor: 'rgba(76,175,80,0.15)' },
  portfolioLabel: { fontSize: 10, color: '#666', marginBottom: 3 },
  portfolioValue: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  logExecutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76,175,80,0.08)',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.15)',
  },
  logExecutionText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
  deepDiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,77,255,0.08)',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(124,77,255,0.15)',
  },
  deepDiveText: { fontSize: 12, color: '#7C4DFF', fontWeight: '600' },
  suggestBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,193,7,0.06)', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, gap: 8, borderWidth: 1, borderColor: 'rgba(255,193,7,0.1)' },
  suggestText: { flex: 1, fontSize: 12, color: '#FFC107', fontWeight: '500', lineHeight: 18 },

  // 세금/수수료 시뮬레이션
  taxBox: {
    backgroundColor: 'rgba(100,181,246,0.06)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(100,181,246,0.1)',
  },
  taxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  taxHeaderText: { fontSize: 11, color: '#64B5F6', fontWeight: '600' },
  taxAssetType: { fontSize: 10, color: '#888', marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  taxRows: { gap: 6 },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taxLabel: { fontSize: 11, color: '#888' },
  taxValue: { fontSize: 12, color: '#CCC', fontWeight: '500' },
  taxTotalRow: { borderTopWidth: 1, borderTopColor: 'rgba(100,181,246,0.15)', paddingTop: 8, marginTop: 4 },
  taxTotalLabel: { fontSize: 12, color: '#64B5F6', fontWeight: '700' },
  taxTotalValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  taxNote: { fontSize: 10, color: '#64B5F6', marginTop: 8 },
  taxDisclaimer: { fontSize: 9, color: '#555', marginTop: 4 },
});
