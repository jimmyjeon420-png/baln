/**
 * ContextCardTabbed - 탭 전환 방식 맥락 카드
 *
 * 역할: 4겹 레이어를 탭으로 전환하며 보는 맥락 카드
 * 비유: 기존 ContextCard.tsx의 탭 전환 버전 (토글 → 탭)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContextCard } from '../../hooks/useContextCard';
import { convertToContextCardData } from '../../services/contextCardService';
import { ContextLayerTabs, type ContextLayer } from './ContextLayerTabs';
import { SentimentBadge } from './SentimentBadge';
import { PortfolioImpactSection } from './PortfolioImpactSection';

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
  const [activeLayer, setActiveLayer] = useState<ContextLayer>('historical');

  // 로딩 상태
  if (isLoading) {
    return (
      <View className="bg-white dark:bg-gray-900 rounded-2xl p-6 mx-4 my-2 shadow-lg">
        <View className="flex-row items-center">
          <View className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <View className="ml-4 flex-1">
            <View className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <View className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </View>
        </View>
      </View>
    );
  }

  // 에러 상태
  if (error || !data) {
    return (
      <View className="bg-white dark:bg-gray-900 rounded-2xl p-6 mx-4 my-2 shadow-lg">
        <View className="items-center py-8">
          <Ionicons name="cloud-offline-outline" size={48} color="#9E9E9E" />
          <Text className="text-gray-600 dark:text-gray-400 mt-4 text-center">
            맥락 카드를 불러올 수 없습니다.
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-500 mt-1 text-center">
            네트워크 연결을 확인해주세요.
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

  // 날짜 포맷 (2026-02-08 → 2월 8일)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <View className="bg-white dark:bg-gray-900 rounded-2xl mx-4 my-2 shadow-lg overflow-hidden">
      {/* 상단 색상 바 (Sentiment) */}
      <View
        className="h-1"
        style={{
          backgroundColor:
            cardData.sentiment === 'calm'
              ? '#4CAF50'
              : cardData.sentiment === 'caution'
              ? '#FFC107'
              : '#CF6679',
        }}
      />

      {/* 카드 헤더 */}
      <View className="p-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-start justify-between">
          {/* 좌측: Sentiment + 헤드라인 */}
          <View className="flex-1 mr-3">
            <SentimentBadge sentiment={cardData.sentiment} size="small" />
            <Text className="text-lg font-bold mt-2 text-gray-900 dark:text-white leading-snug">
              {cardData.headline}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatDate(cardData.date)}
            </Text>
          </View>

          {/* 우측: 공유 버튼 */}
          <TouchableOpacity
            className="p-2"
            onPress={() => {
              // TODO: 공유 기능 구현
              console.log('공유 기능');
            }}
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
        className="p-4"
        style={{ maxHeight: 400 }}
        showsVerticalScrollIndicator={false}
      >
        {activeLayer === 'historical' && (
          <LayerContent
            icon="time-outline"
            title="역사적 맥락"
            color="#4CAF50"
          >
            <Text className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
              {cardData.historicalContext}
            </Text>
          </LayerContent>
        )}

        {activeLayer === 'macro' && (
          <LayerContent
            icon="git-network-outline"
            title="거시경제 체인"
            color="#2196F3"
          >
            <View>
              {cardData.macroChain.map((step, index) => (
                <View key={index}>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3" />
                    <Text className="flex-1 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                      {step}
                    </Text>
                  </View>
                  {index < cardData.macroChain.length - 1 && (
                    <View className="ml-1 mb-2">
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
            title="기관 행동"
            color="#FF9800"
            isLocked={lockedLayers.includes('institution')}
            onPressPremium={onPressPremium}
          >
            <Text className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
              {cardData.institutionalBehavior}
            </Text>
          </LayerContent>
        )}

        {activeLayer === 'portfolio' && (
          <LayerContent
            icon="trending-up-outline"
            title="내 포트폴리오 영향"
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
  if (isLocked) {
    return (
      <View>
        {/* 흐릿한 콘텐츠 미리보기 */}
        <View className="opacity-30 mb-4">
          {children}
        </View>

        {/* Premium 잠금 CTA */}
        <TouchableOpacity
          onPress={onPressPremium}
          className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 flex-row items-center"
        >
          <Ionicons name="lock-closed" size={20} color="#FFC107" />
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-yellow-700 dark:text-yellow-400">
              Premium 전용 콘텐츠
            </Text>
            <Text className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
              기관 행동과 포트폴리오 영향을 확인하려면 Premium이 필요합니다.
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
