/**
 * add-asset.tsx — 자산 추가 화면 (30초 등록 UX)
 *
 * Orchestrator: delegates all business logic to useAddAsset hook
 * and all UI sections to sub-components in src/components/add-asset/
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Keyboard,
  Platform,
  InputAccessoryView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../src/hooks/useTheme';
import { useLocale } from '../src/context/LocaleContext';

import {
  AssetCategoryTabs,
  InfoBanner,
  QuickImportCard,
  CashInputForm,
  BondQuickSelect,
  AssetSearchBar,
  StockInputForm,
  RecentAssetsBar,
  ExistingAssetsList,
  ScreenshotParseModal,
  runDiagnostic,
  useAddAsset,
  INPUT_ACCESSORY_ID,
} from '../src/components/add-asset';

export default function AddAssetScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();

  const {
    // Category
    assetCategory,
    handleCategoryChange,
    // Cash
    cashType, setCashType,
    cashAmount, setCashAmount,
    cashSaving,
    handleCashSave,
    // Search
    searchQuery, setSearchQuery,
    searchResults,
    showDropdown, setShowDropdown,
    // Selected stock
    selectedStock,
    selectStock,
    handleClearSelection,
    // Input
    quantity, setQuantity,
    price, setPrice,
    totalValue,
    matchingExisting,
    // Edit
    editingAsset,
    startEditAsset,
    deleteAsset,
    // Save
    saving,
    handleSave,
    resetForm,
    // Recent
    recentAssets,
    selectRecentAsset,
    // Existing
    existingAssets,
    loadingAssets,
    authFailed,
    loadExistingAssets,
    // Screenshot
    screenshotParsing,
    handleScreenshotParse,
    parsedAssets,
    setParsedAssets,
    handleBulkSave,
  } = useAddAsset();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* iOS number keyboard "Done" button */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
          <View style={[styles.keyboardToolbar, { backgroundColor: colors.surfaceLight, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.keyboardDoneButton}>
              <Text style={[styles.keyboardDoneText, { color: colors.primary }]}>{t('add_asset.keyboard_done')}</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('add_asset.title')}</Text>
          <TouchableOpacity onPress={runDiagnostic}>
            <Ionicons name="pulse-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Real estate shortcut */}
        <TouchableOpacity
          style={[styles.realEstateShortcut, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/add-realestate')}
        >
          <View style={[styles.realEstateIcon, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="home" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.realEstateTitle, { color: colors.primary }]}>{t('add_asset.real_estate_shortcut_title')}</Text>
            <Text style={[styles.realEstateDesc, { color: colors.textSecondary }]}>{t('add_asset.real_estate_shortcut_desc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Category tabs */}
        {!editingAsset && (
          <AssetCategoryTabs assetCategory={assetCategory} onCategoryChange={handleCategoryChange} />
        )}

        {/* Info banner (stock tab only) */}
        {assetCategory === 'stock' && !editingAsset && <InfoBanner />}

        {/* Quick import */}
        {!editingAsset && (
          <QuickImportCard screenshotParsing={screenshotParsing} onScreenshotParse={handleScreenshotParse} />
        )}

        {/* Main input section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {editingAsset
              ? t('add_asset.section_title_edit')
              : assetCategory === 'cash'
                ? t('add_asset.section_title_cash')
                : assetCategory === 'bond'
                  ? t('add_asset.section_title_bond')
                  : t('add_asset.section_title_quick')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {editingAsset
              ? t('add_asset.section_subtitle_edit')
              : assetCategory === 'cash'
                ? t('add_asset.section_subtitle_cash')
                : assetCategory === 'bond'
                  ? t('add_asset.section_subtitle_bond')
                  : t('add_asset.section_subtitle_stock')}
          </Text>

          {/* Cash form */}
          {assetCategory === 'cash' && !editingAsset && (
            <CashInputForm
              cashType={cashType}
              onCashTypeChange={setCashType}
              cashAmount={cashAmount}
              onCashAmountChange={setCashAmount}
              cashSaving={cashSaving}
              onCashSave={handleCashSave}
            />
          )}

          {/* Bond quick select */}
          {assetCategory === 'bond' && !editingAsset && (
            <BondQuickSelect selectedTicker={selectedStock?.ticker ?? null} onSelectBond={selectStock} />
          )}

          {/* Stock/ETF/Crypto/Bond search form */}
          {(assetCategory !== 'cash' || editingAsset) && (
            <>
              <AssetSearchBar
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchResults={searchResults}
                showDropdown={showDropdown}
                onShowDropdown={setShowDropdown}
                selectedStock={selectedStock}
                onSelectStock={selectStock}
                onClearSelection={handleClearSelection}
              />
              <StockInputForm
                selectedStock={selectedStock}
                quantity={quantity}
                onQuantityChange={setQuantity}
                price={price}
                onPriceChange={setPrice}
                totalValue={totalValue}
                matchingExisting={matchingExisting}
                editingAsset={editingAsset}
                saving={saving}
                onSave={handleSave}
                onCancelEdit={resetForm}
              />
            </>
          )}
        </View>

        {/* Recent assets */}
        {recentAssets.length > 0 && !editingAsset && (
          <RecentAssetsBar recentAssets={recentAssets} onSelectRecent={selectRecentAsset} />
        )}

        {/* Existing assets list */}
        <ExistingAssetsList
          existingAssets={existingAssets}
          loadingAssets={loadingAssets}
          authFailed={authFailed}
          onRetryLoad={loadExistingAssets}
          onEditAsset={startEditAsset}
          onDeleteAsset={deleteAsset}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Screenshot parse modal */}
      <ScreenshotParseModal
        parsedAssets={parsedAssets}
        onClose={() => setParsedAssets(null)}
        onBulkSave={handleBulkSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '700',
  },
  realEstateShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
  },
  realEstateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  realEstateTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  realEstateDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  keyboardToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  keyboardDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  keyboardDoneText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
