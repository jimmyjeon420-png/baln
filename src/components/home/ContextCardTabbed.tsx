/**
 * ContextCardTabbed - 탭 전환 방식 맥락 카드
 *
 * 역할: 4겹 레이어를 탭으로 전환하며 보는 맥락 카드
 * 비유: 기존 ContextCard.tsx의 탭 전환 버전 (토글 → 탭)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContextCard } from '../../hooks/useContextCard';
import { convertToContextCardData } from '../../services/contextCardService';
import { ContextLayerTabs, type ContextLayer } from './ContextLayerTabs';
import { SentimentBadge } from './SentimentBadge';
import { PortfolioImpactSection } from './PortfolioImpactSection';
import { useTheme } from '../../hooks/useTheme';
import { shareContent } from '../../services/shareService';
import { useVillageProsperity } from '../../hooks/useVillageProsperity';
import { formatLocalDate } from '../../utils/formatters';
import { useLocale } from '../../context/LocaleContext';

interface ContextCardTabbedProps {
  /** Premium 여부 */
  isPremium?: boolean;
  /** Premium 구매 핸들러 */
  onPressPremium?: () => void;
}

/**
 * 탭 전환 방식 맥락 카드 컴포넌트
 *
 * @example
 * ```tsx
 * <ContextCardTabbed
 *   isPremium={false}
 *   onPressPremium={() => router.push('/subscription')}
 * />
 * ```
 */
export function ContextCardTabbed({ isPremium = false, onPressPremium }: ContextCardTabbedProps) {
  const { data, isLoading, error } = useContextCard();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { addContribution } = useVillageProsperity();
  const [activeLayer, setActiveLayer] = useState<ContextLayer>('historical');

  // 로딩 상태
  if (isLoading) {
    return (
      <View style={[s.card, { backgroundColor: colors.surface }]}>
        <View style={s.loadingRow}>
          <View style={[s.loadingSkeleton, s.loadingCircle, { backgroundColor: colors.surfaceLight }]} />
          <View style={s.loadingTextContainer}>
            <View style={[s.loadingSkeleton, s.loadingTextLong, { backgroundColor: colors.surfaceLight }]} />
            <View style={[s.loadingSkeleton, s.loadingTextShort, { backgroundColor: colors.surfaceLight }]} />
          </View>
        </View>
      </View>
    );
  }

  // 에러 상태
  if (error || !data) {
    return (
      <View style={[s.card, { backgroundColor: colors.surface }]}>
        <View style={s.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9E9E9E" />
          <Text style={[s.errorText, { color: colors.textSecondary }]}>
            {t('format.context_card_error')}
          </Text>
          <Text style={[s.errorSubtext, { color: colors.textTertiary }]}>
            {t('format.context_card_error_sub')}
          </Text>
        </View>
      </View>
    );
  }

  // 데이터 변환
  const cardData = convertToContextCardData(data);

  // Premium 잠금 레이어
  const lockedLayers: ContextLayer[] = cardData.isPremiumContent && !isPremium
    ? ['institution', 'portfolio']
    : [];

  // 날짜 포맷 (로케일 기반)
  const formatDate = (dateStr: string) => formatLocalDate(dateStr);

  return (
    <View style={[s.card, { backgroundColor: colors.surface }]}>
      {/* 상단 색상 바 (Sentiment) */}
      <View
        style={[
          s.sentimentBar,
          {
            backgroundColor:
              cardData.sentiment === 'calm'
                ? '#4CAF50'
                : cardData.sentiment === 'caution'
                ? '#FFC107'
                : '#CF6679',
          },
        ]}
      />

      {/* 카드 헤더 */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View style={s.headerRow}>
          {/* 좌측: Sentiment + 헤드라인 */}
          <View style={s.headerLeft}>
            <SentimentBadge sentiment={cardData.sentiment} size="small" />
            <Text style={[s.headline, { color: colors.textPrimary }]}>
              {cardData.headline}
            </Text>
            <Text style={[s.date, { color: colors.textTertiary }]}>
              {formatDate(cardData.date)}
            </Text>
          </View>

          {/* 우측: 공유 버튼 */}
          <TouchableOpacity
            style={s.shareButton}
            onPress={() => shareContent('context', cardData.date, { headline: cardData.headline }).then(shared => {
              if (shared) addContribution('share').catch(() => {});
            })}
          >
            <Ionicons name="share-outline" size={22} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4겹 레이어 탭 */}
      <ContextLayerTabs
        activeLayer={activeLayer}
        onLayerChange={setActiveLayer}
        lockedLayers={lockedLayers}
        onPressPremium={onPressPremium}
      />

      {/* 레이어별 콘텐츠 */}
      <ScrollView
        style={[s.contentScrollView, { maxHeight: 400 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeLayer === 'historical' && (
          <LayerContent
            icon="time-outline"
            title={t('format.context_layer_historical')}
            color="#4CAF50"
          >
            <Text style={[s.contentText, { color: colors.textSecondary }]}>
              {cardData.historicalContext}
            </Text>
          </LayerContent>
        )}

        {activeLayer === 'macro' && (
          <LayerContent
            icon="git-network-outline"
            title={t('format.context_layer_macro')}
            color="#2196F3"
          >
            <View>
              {(cardData.macroChain ?? []).map((step, index) => (
                <View key={index}>
                  <View style={s.macroStep}>
                    <View style={s.macroBullet} />
                    <Text style={[s.contentText, { color: colors.textSecondary, flex: 1 }]}>
                      {step}
                    </Text>
                  </View>
                  {index < (cardData.macroChain ?? []).length - 1 && (
                    <View style={s.macroArrow}>
                      <Ionicons name="arrow-down" size={18} color="#9E9E9E" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </LayerContent>
        )}

        {activeLayer === 'institution' && (
          <LayerContent
            icon="business-outline"
            title={t('format.context_layer_institution')}
            color="#FF9800"
            isLocked={lockedLayers.includes('institution')}
            onPressPremium={onPressPremium}
          >
            <Text style={[s.contentText, { color: colors.textSecondary }]}>
              {cardData.institutionalBehavior}
            </Text>
          </LayerContent>
        )}

        {activeLayer === 'portfolio' && (
          <LayerContent
            icon="trending-up-outline"
            title={t('format.context_layer_portfolio')}
            color="#9C27B0"
            isLocked={lockedLayers.includes('portfolio')}
            onPressPremium={onPressPremium}
          >
            <PortfolioImpactSection data={cardData.portfolioImpact} />
          </LayerContent>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * 레이어 콘텐츠 래퍼 (Premium 잠금 포함)
 */
interface LayerContentProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  color: string;
  children: React.ReactNode;
  isLocked?: boolean;
  onPressPremium?: () => void;
}

function LayerContent({
  icon,
  title,
  color,
  children,
  isLocked = false,
  onPressPremium,
}: LayerContentProps) {
  const { t } = useLocale();
  if (isLocked) {
    return (
      <View>
        {/* 흐릿한 콘텐츠 미리보기 */}
        <View style={s.lockedPreview}>
          {children}
        </View>

        {/* Premium 잠금 CTA */}
        <TouchableOpacity
          onPress={onPressPremium}
          style={s.premiumCta}
        >
          <Ionicons name="lock-closed" size={20} color="#FFC107" />
          <View style={s.premiumCtaTextContainer}>
            <Text style={s.premiumCtaTitle}>
              {t('format.context_premium_title')}
            </Text>
            <Text style={s.premiumCtaSubtitle}>
              {t('format.context_premium_subtitle')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFC107" />
        </TouchableOpacity>
      </View>
    );
  }

  return <View>{children}</View>;
}

/**
 * 기본 export (호환성)
 */
export default ContextCardTabbed;

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  // 공통 카드
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },

  // 로딩 상태
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  loadingSkeleton: {
    borderRadius: 8,
  },
  loadingCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  loadingTextContainer: {
    marginLeft: 16,
    flex: 1,
    gap: 8,
  },
  loadingTextLong: {
    width: '75%',
    height: 16,
  },
  loadingTextShort: {
    width: '50%',
    height: 12,
  },

  // 에러 상태
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  errorText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
  },
  errorSubtext: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 14,
  },

  // Sentiment bar
  sentimentBar: {
    height: 4,
  },

  // 헤더
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headline: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 8,
    lineHeight: 25,
  },
  date: {
    fontSize: 13,
    marginTop: 4,
  },
  shareButton: {
    padding: 8,
  },

  // 콘텐츠 영역
  contentScrollView: {
    padding: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 25,
  },

  // Macro chain
  macroStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  macroBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginTop: 8,
    marginRight: 12,
  },
  macroArrow: {
    marginLeft: 4,
    marginBottom: 8,
  },

  // Locked 상태
  lockedPreview: {
    opacity: 0.3,
    marginBottom: 16,
  },
  premiumCta: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumCtaTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  premiumCtaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFC107',
  },
  premiumCtaSubtitle: {
    fontSize: 14,
    color: '#FFB300',
    marginTop: 4,
  },
});
