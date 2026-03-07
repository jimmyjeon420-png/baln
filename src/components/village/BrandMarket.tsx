/**
 * BrandMarket — 브랜드 시장 거리 전체 목록 모달
 *
 * 역할: "마을 쇼핑가 지도" — 20개 브랜드 상점 전체를 한눈에 보여주는
 *       전체화면 모달. 피터 린치 철학 "마트에서 종목 찾기"를 구현.
 *
 * 비유: "발른 마을 상점 디렉토리" — 동물의숲의 상점 거리를 걸어다니는 느낌
 *
 * 기능:
 * - 카테고리 탭 필터 (전체/기술/패션/식음/금융/자동차/엔터)
 * - 검색 바 (상점명·실제 기업명·티커 검색)
 * - "오늘의 인기 상점" 섹션 (주가 등락 상위 3개)
 * - 2열 그리드 BrandShopCard
 * - 실시간 주가 등락률 연동 (stockChanges props)
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import type { BrandShop, BrandCategory } from '../../types/village';
import { BRAND_SHOPS } from '../../data/brandWorldConfig';
import { BrandShopCard } from './BrandShopCard';
import type { ThemeColors } from '../../styles/colors';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

interface BrandMarketProps {
  /** 모달 표시 여부 */
  isVisible: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 브랜드 카드 탭 콜백 */
  onBrandPress: (brand: BrandShop) => void;
  /** 테마 색상 */
  colors: ThemeColors;
  /**
   * 실시간 주가 등락률 맵 (ticker → %)
   * 예: { 'AAPL': 1.23, 'TSLA': -2.5 }
   */
  stockChanges?: Record<string, number>;
}

// ============================================================================
// 카테고리 탭 정의
// ============================================================================

type CategoryFilter = 'all' | BrandCategory;

interface CategoryTab {
  id: CategoryFilter;
  labelKo: string;
  labelEn: string;
  emoji: string;
  color: string;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: 'all',           labelKo: '전체',    labelEn: 'All',           emoji: '🏘️', color: '#8E9EB0' },
  { id: 'tech',          labelKo: '기술',    labelEn: 'Tech',          emoji: '💻', color: '#5DADE2' },
  { id: 'fashion',       labelKo: '패션',    labelEn: 'Fashion',       emoji: '👗', color: '#E88B96' },
  { id: 'food',          labelKo: '식음',    labelEn: 'Food',          emoji: '🍔', color: '#F0C060' },
  { id: 'finance',       labelKo: '금융',    labelEn: 'Finance',       emoji: '🏦', color: '#5DBB63' },
  { id: 'auto',          labelKo: '자동차',  labelEn: 'Auto',          emoji: '🚗', color: '#8E9EB0' },
  { id: 'entertainment', labelKo: '엔터',    labelEn: 'Entertainment', emoji: '🎬', color: '#9B7DFF' },
];

// ============================================================================
// "오늘의 인기 상점" — 주가 등락 기준 상위 3개 계산
// ============================================================================

/**
 * stockChanges 맵에서 절댓값 기준 상위 3개 브랜드 추출
 * (등락이 클수록 "이슈" 상점으로 분류)
 */
function getPopularBrands(
  brands: BrandShop[],
  stockChanges: Record<string, number>,
): BrandShop[] {
  const withChange = brands
    .filter((b) => b.ticker && stockChanges[b.ticker] !== undefined)
    .sort((a, b) => {
      const absA = Math.abs(stockChanges[a.ticker ?? ''] ?? 0);
      const absB = Math.abs(stockChanges[b.ticker ?? ''] ?? 0);
      return absB - absA;
    });
  return withChange.slice(0, 3);
}

// ============================================================================
// 헬퍼: 텍스트 검색 (상점명, 실제 기업명, 티커)
// ============================================================================

function matchesSearch(brand: BrandShop, query: string, isKo: boolean): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return (
    brand.villageName.toLowerCase().includes(q) ||
    brand.villageNameEn.toLowerCase().includes(q) ||
    brand.realName.toLowerCase().includes(q) ||
    (brand.ticker?.toLowerCase().includes(q) ?? false) ||
    (isKo ? brand.description.toLowerCase().includes(q) : brand.descriptionEn.toLowerCase().includes(q))
  );
}

// ============================================================================
// 컴포넌트: 카테고리 탭 버튼
// ============================================================================

interface CategoryTabButtonProps {
  tab: CategoryTab;
  isActive: boolean;
  onPress: (id: CategoryFilter) => void;
  colors: ThemeColors;
  isKo: boolean;
}

function CategoryTabButton({ tab, isActive, onPress, colors, isKo: _isKo }: CategoryTabButtonProps) {
  const { t } = useLocale();
  const handlePress = useCallback(() => onPress(tab.id), [tab.id, onPress]);
  return (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        isActive
          ? { backgroundColor: tab.color + '25', borderColor: tab.color }
          : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <Text style={styles.categoryTabEmoji}>{tab.emoji}</Text>
      <Text
        style={[
          styles.categoryTabLabel,
          { color: isActive ? tab.color : colors.textSecondary },
        ]}
      >
        {t(`brandMarket.category_${tab.id}`)}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// 컴포넌트: "오늘의 인기 상점" 가로 스크롤 섹션
// ============================================================================

interface PopularSectionProps {
  brands: BrandShop[];
  stockChanges: Record<string, number>;
  onBrandPress: (brand: BrandShop) => void;
  colors: ThemeColors;
}

function PopularSection({ brands, stockChanges, onBrandPress, colors }: PopularSectionProps) {
  const { t } = useLocale();
  if (brands.length === 0) return null;
  return (
    <View style={styles.popularSection}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('brandMarket.popularToday')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.popularScroll}
      >
        {brands.map((brand) => (
          <View key={brand.brandId} style={styles.popularCardWrapper}>
            <BrandShopCard
              brand={brand}
              onPress={onBrandPress}
              colors={colors}
              stockChange={brand.ticker ? stockChanges[brand.ticker] : undefined}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

const BrandMarket = React.memo(({
  isVisible,
  onClose,
  onBrandPress,
  colors,
  stockChanges = {},
}: BrandMarketProps) => {
  const { t, language } = useLocale();

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  // 카테고리 + 검색 필터 적용
  const filteredBrands = useMemo(() => {
    return BRAND_SHOPS.filter((brand) => {
      const categoryMatch =
        activeCategory === 'all' || brand.category === activeCategory;
      const searchMatch = matchesSearch(brand, searchQuery, language === 'ko');
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, searchQuery, language]);

  // 오늘의 인기 상점 (stockChanges 있을 때만)
  const popularBrands = useMemo(() => {
    if (Object.keys(stockChanges).length === 0) return [];
    return getPopularBrands(BRAND_SHOPS, stockChanges);
  }, [stockChanges]);

  const handleCategoryPress = useCallback((id: CategoryFilter) => {
    setActiveCategory(id);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    searchRef.current?.blur();
  }, []);

  const handleBrandPress = useCallback(
    (brand: BrandShop) => {
      onBrandPress(brand);
    },
    [onBrandPress],
  );

  if (__DEV__) {
    // console.log('[BrandMarket] visible=%s filtered=%d', isVisible, filteredBrands.length);
  }

  // 2열 그리드 렌더러
  const renderBrandItem = useCallback(
    ({ item }: { item: BrandShop }) => (
      <View style={styles.gridItem}>
        <BrandShopCard
          brand={item}
          onPress={handleBrandPress}
          colors={colors}
          stockChange={item.ticker ? stockChanges[item.ticker] : undefined}
        />
      </View>
    ),
    [handleBrandPress, colors, stockChanges],
  );

  const keyExtractor = useCallback((item: BrandShop) => item.brandId, []);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* ── 헤더 ── */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {t('brandMarket.title')}
            </Text>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            {t('brandMarket.subtitle', { count: BRAND_SHOPS.length })}
          </Text>
        </View>

        {/* ── 검색 바 ── */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.searchIcon, { color: colors.textTertiary }]}>🔍</Text>
          <TextInput
            ref={searchRef}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('brandMarket.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleSearchClear} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={[styles.clearText, { color: colors.textTertiary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 카테고리 탭 ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabRow}
          style={[styles.categoryTabContainer, { borderBottomColor: colors.border }]}
        >
          {CATEGORY_TABS.map((tab) => (
            <CategoryTabButton
              key={tab.id}
              tab={tab}
              isActive={activeCategory === tab.id}
              onPress={handleCategoryPress}
              colors={colors}
              isKo={language === 'ko'}
            />
          ))}
        </ScrollView>

        {/* ── 컨텐츠 영역 ── */}
        <FlatList
          data={filteredBrands}
          keyExtractor={keyExtractor}
          renderItem={renderBrandItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            popularBrands.length > 0 && !searchQuery ? (
              <PopularSection
                brands={popularBrands}
                stockChanges={stockChanges}
                onBrandPress={handleBrandPress}
                colors={colors}
              />
            ) : null
          }
          ListHeaderComponentStyle={styles.listHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {t('brandMarket.noResults', { query: searchQuery })}
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
});

BrandMarket.displayName = 'BrandMarket';

export default BrandMarket;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // 헤더
  header: {
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // 검색 바
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 14,
    marginBottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 카테고리 탭
  categoryTabContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
  },
  categoryTabRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryTabEmoji: {
    fontSize: 13,
  },
  categoryTabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // FlatList 그리드
  listHeader: {
    paddingTop: 4,
  },
  gridContent: {
    padding: 12,
    paddingBottom: 32,
    gap: 10,
  },
  gridRow: {
    gap: 10,
  },
  gridItem: {
    flex: 1,
  },

  // 오늘의 인기 상점 섹션
  popularSection: {
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 2,
  },
  popularScroll: {
    gap: 10,
    paddingRight: 4,
  },
  popularCardWrapper: {
    width: 200,
  },

  // 빈 상태
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});
