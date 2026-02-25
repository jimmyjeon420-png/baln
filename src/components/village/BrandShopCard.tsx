/**
 * BrandShopCard — 마을 브랜드 상점 카드
 *
 * 역할: "동물의숲 상점 간판" — 실제 기업을 마을 상점으로 패러디하여 표시
 * 비유: "마을 상점 거리의 간판" — 어닝 스트라이프, 상점 느낌의 상단 테두리
 *
 * 기능:
 * - 카테고리별 색상 어닝 (상단 강조선)
 * - 실시간 주가 등락 표시 (stockChange props)
 * - 상점 설명 + 티커 심볼 표시
 * - React.memo + StyleSheet.create 최적화
 *
 * 피터 린치 철학: "마트에서 종목을 찾아라" — 상점 UI로 투자 연결
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import type { BrandShop, BrandCategory } from '../../types/village';

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

interface BrandShopCardProps {
  brand: BrandShop;
  onPress: (brand: BrandShop) => void;
  colors: any;
  locale?: string;
  /** 실시간 주가 등락률 (%) — 있으면 표시, 없으면 숨김 */
  stockChange?: number;
}

// ---------------------------------------------------------------------------
// 카테고리별 어닝 색상 (상단 강조 바)
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<BrandCategory, string> = {
  tech:          '#5DADE2',   // 파랑 (첨단)
  fashion:       '#E88B96',   // 핑크 (패션)
  food:          '#F0C060',   // 골드 (음식)
  finance:       '#5DBB63',   // 그린 (금융)
  auto:          '#8E9EB0',   // 회색 (자동차)
  entertainment: '#9B7DFF',   // 퍼플 (엔터)
};

const CATEGORY_LABEL_KO: Record<BrandCategory, string> = {
  tech:          '기술',
  fashion:       '패션',
  food:          '식음',
  finance:       '금융',
  auto:          '자동차',
  entertainment: '엔터',
};

const CATEGORY_LABEL_EN: Record<BrandCategory, string> = {
  tech:          'Tech',
  fashion:       'Fashion',
  food:          'Food',
  finance:       'Finance',
  auto:          'Auto',
  entertainment: 'Entertainment',
};

// ---------------------------------------------------------------------------
// 주가 등락 포맷 헬퍼
// ---------------------------------------------------------------------------

function formatStockChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// 메인 컴포넌트
// ---------------------------------------------------------------------------

const BrandShopCard = React.memo(function BrandShopCard({
  brand,
  onPress,
  colors,
  locale = 'ko',
  stockChange,
}: BrandShopCardProps) {
  const isKo = locale === 'ko';

  const categoryColor = CATEGORY_COLORS[brand.category] ?? '#8E9EB0';
  const categoryLabel = isKo
    ? CATEGORY_LABEL_KO[brand.category]
    : CATEGORY_LABEL_EN[brand.category];

  const shopName = isKo ? brand.villageName : brand.villageNameEn;
  const description = isKo ? brand.description : brand.descriptionEn;

  // 주가 등락 색상
  const stockColor =
    stockChange === undefined ? colors.textTertiary
    : stockChange > 0 ? colors.buy
    : stockChange < 0 ? colors.sell
    : colors.neutral;

  const handlePress = useCallback(() => {
    onPress(brand);
  }, [brand, onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          // 상단 어닝 색을 테두리로 강조
          borderTopColor: categoryColor,
          borderTopWidth: 3,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {/* 상단 어닝 줄무늬 장식 */}
      <View style={[styles.awning, { backgroundColor: categoryColor + '18' }]}>
        {/* 어닝 줄무늬 (SVG 대신 패턴 View로 표현) */}
        {[0, 1, 2, 3, 4].map(i => (
          <View
            key={i}
            style={[styles.awningStripe, { backgroundColor: categoryColor + '30' }]}
          />
        ))}
      </View>

      {/* 카드 본문 */}
      <View style={styles.cardBody}>
        {/* 상단 행: 이모지 + 상점명 + 카테고리 배지 */}
        <View style={styles.topRow}>
          <Text style={styles.shopEmoji}>{brand.emoji}</Text>
          <View style={styles.nameWrapper}>
            <Text
              style={[styles.shopName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {shopName}
            </Text>
            {/* 카테고리 배지 */}
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryColor + '22', borderColor: categoryColor + '55' },
              ]}
            >
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {categoryLabel}
              </Text>
            </View>
          </View>

          {/* 주가 등락 (있을 때만) */}
          {stockChange !== undefined && (
            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor:
                    stockChange > 0 ? colors.buy + '18'
                    : stockChange < 0 ? colors.sell + '18'
                    : colors.neutral + '18',
                },
              ]}
            >
              <Text style={[styles.stockText, { color: stockColor }]}>
                {formatStockChange(stockChange)}
              </Text>
            </View>
          )}
        </View>

        {/* 상점 설명 */}
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {description}
        </Text>

        {/* 하단 행: 동물 + 티커 */}
        <View style={styles.bottomRow}>
          {/* 상점 주인 동물 */}
          <View style={[styles.animalTag, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.animalText, { color: colors.textTertiary }]}>
              {brand.animal}
            </Text>
          </View>

          {/* 주식 티커 (있을 때만) */}
          {brand.ticker && (
            <View style={[styles.tickerTag, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.tickerText, { color: colors.primary }]}>
                {brand.ticker}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export { BrandShopCard };

// ---------------------------------------------------------------------------
// 스타일
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  // 어닝 영역 (상단 반투명 줄무늬 배경)
  awning: {
    height: 20,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  awningStripe: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  cardBody: {
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shopEmoji: {
    fontSize: 28,
    flexShrink: 0,
  },
  nameWrapper: {
    flex: 1,
    gap: 4,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  animalTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  animalText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tickerTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tickerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
