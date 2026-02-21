/**
 * NewsDetailSheet — 뉴스 상세 바텀 시트
 *
 * 역할: "뉴스 깊이 보기" 창구
 * - 뉴스 제목, 요약, 카테고리, 태그 표시
 * - 내 포트폴리오 관련 종목 매칭 & 비중 표시
 * - AI 한줄 분석 (pick_reason)
 * - "원문 보기" 버튼 → 브라우저 열기
 *
 * 비유: 신문 기사를 펼쳐서 "이 기사가 내 지갑에 어떤 영향인지" 같이 보여주는 돋보기
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { type MarketNewsItem, getTimeAgo } from '../../hooks/useMarketNews';
import { useNewsPortfolioMatch } from '../../hooks/useNewsPortfolioMatch';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// ============================================================================
// 카테고리 설정
// ============================================================================

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  crypto: { icon: 'logo-bitcoin', color: '#F7931A', label: '크립토' },
  stock: { icon: 'trending-up', color: '#4CAF50', label: '주식' },
  macro: { icon: 'globe-outline', color: '#29B6F6', label: '매크로' },
  general: { icon: 'newspaper-outline', color: '#9E9E9E', label: '일반' },
};

// ============================================================================
// Props
// ============================================================================

interface NewsDetailSheetProps {
  item: MarketNewsItem | null;
  visible: boolean;
  onClose: () => void;
}

// ============================================================================
// 컴포넌트
// ============================================================================

export default function NewsDetailSheet({ item, visible, onClose }: NewsDetailSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { matchedAssets, totalExposure, hasMatch } = useNewsPortfolioMatch(item?.tags ?? []);
  const catConfig = CATEGORY_CONFIG[item?.category ?? 'general'] || CATEGORY_CONFIG.general;

  const handleOpenURL = () => {
    if (item?.source_url) {
      Linking.openURL(item.source_url).catch(() => {});
    }
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* 배경 탭 → 닫기 */}
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        {/* 바텀 시트 본체 */}
        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          {/* 핸들 바 */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 카테고리 + 시간 */}
            <View style={styles.topMeta}>
              <View style={[styles.categoryChip, { backgroundColor: catConfig.color + '20' }]}>
                <Ionicons name={catConfig.icon as any} size={12} color={catConfig.color} />
                <Text style={[styles.categoryLabel, { color: catConfig.color }]}>{catConfig.label}</Text>
              </View>
              {item.is_pick && (
                <View style={styles.pickBadge}>
                  <Ionicons name="flash" size={10} color="#000" />
                  <Text style={styles.pickText}>PiCK</Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <Text style={[styles.timeText, { color: colors.textTertiary }]}>
                {getTimeAgo(item.published_at)}
              </Text>
            </View>

            {/* 제목 */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>

            {/* 출처 */}
            <Text style={[styles.source, { color: colors.textSecondary }]}>
              {item.source_name}
            </Text>

            {/* 요약 */}
            {item.summary && (
              <Text style={[styles.summary, { color: colors.textSecondary }]}>
                {item.summary}
              </Text>
            )}

            {/* AI 한줄 분석 */}
            {item.pick_reason && (
              <View style={[styles.aiBox, { backgroundColor: '#FFC10715' }]}>
                <Ionicons name="bulb-outline" size={14} color="#FFC107" />
                <Text style={[styles.aiText, { color: '#FFC107' }]}>
                  {item.pick_reason}
                </Text>
              </View>
            )}

            {/* 태그 */}
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {item.tags.map((tag) => (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: colors.surfaceLight }]}>
                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── 내 포트폴리오 영향도 ── */}
            <View style={[styles.impactSection, { backgroundColor: colors.surface }]}>
              <View style={styles.impactHeader}>
                <Ionicons name="pie-chart-outline" size={16} color={colors.primary} />
                <Text style={[styles.impactTitle, { color: colors.textPrimary }]}>
                  내 포트폴리오 영향
                </Text>
              </View>

              {hasMatch ? (
                <>
                  <Text style={[styles.impactDesc, { color: colors.textSecondary }]}>
                    이 뉴스는 보유 자산 중 {matchedAssets.map(a => a.name).join(', ')}에 영향을 줄 수 있습니다
                  </Text>
                  {matchedAssets.map((asset) => (
                    <View key={asset.ticker} style={styles.assetRow}>
                      <Text style={[styles.assetName, { color: colors.textPrimary }]}>
                        {asset.name}
                      </Text>
                      <Text style={[styles.assetTicker, { color: colors.textTertiary }]}>
                        {asset.ticker}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Text style={[styles.assetWeight, { color: colors.primary }]}>
                        {asset.weight}%
                      </Text>
                    </View>
                  ))}
                  <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                      관련 자산 비중 합계
                    </Text>
                    <Text style={[styles.totalValue, { color: colors.primary }]}>
                      {totalExposure}%
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={[styles.impactDesc, { color: colors.textTertiary }]}>
                  현재 보유 자산과 직접적인 관련이 없는 뉴스입니다
                </Text>
              )}
            </View>
          </ScrollView>

          {/* 원문 보기 버튼 */}
          <TouchableOpacity
            style={[styles.openButton, { backgroundColor: colors.primary }]}
            onPress={handleOpenURL}
            activeOpacity={0.8}
          >
            <Ionicons name="open-outline" size={16} color="#000" />
            <Text style={styles.openButtonText}>원문 보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // 상단 메타
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  pickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pickText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  timeText: {
    fontSize: 12,
  },

  // 제목 + 출처
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 6,
  },
  source: {
    fontSize: 12,
    marginBottom: 12,
  },

  // 요약
  summary: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },

  // AI 분석
  aiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  aiText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // 태그
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // 포트폴리오 영향
  impactSection: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  impactDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '600',
  },
  assetTicker: {
    fontSize: 12,
  },
  assetWeight: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  // 원문 보기 버튼
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  openButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
});
