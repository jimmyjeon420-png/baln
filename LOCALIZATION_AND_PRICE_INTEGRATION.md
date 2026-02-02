# Localization & Real-Time Price Integration Guide

**Status:** ✅ Implementation Ready
**Date:** January 27, 2026
**Scope:** Integration of i18n and real-time price fetching into existing Smart Rebalancer MVP

---

## 📋 Implementation Summary

This guide covers integration of two critical features:

1. **Localization (i18n)** - Auto-switching language/currency based on country selection
2. **Real-Time Prices** - CoinGecko API integration for cryptocurrency prices

---

## 🎯 Quick Start: Files Created

### Localization Files (6 files)
```
src/types/i18n.ts                    # Type definitions
src/locales/index.ts                 # i18n initialization
src/locales/languages.ts             # Country-to-language mappings
src/locales/en.json                  # English translations
src/hooks/useLocalization.ts         # Localization hook
```

### Price Service Files (5 files)
```
src/types/price.ts                   # Price type definitions
src/services/priceCache.ts           # In-memory caching
src/services/PriceService.ts         # Main orchestrator
src/services/priceProviders/CoinGeckoProvider.ts  # Crypto prices
src/hooks/usePrices.ts               # Price fetching hook
```

### Utilities (1 file)
```
src/utils/currencyFormatter.ts       # Currency formatting helpers
```

---

## 🔧 Integration Steps

### Step 1: Update CountrySelectModal to Auto-Switch Localization

**File:** `App.tsx` (in CountrySelectModal or in your country selection logic)

```typescript
import { useLocalization } from './src/hooks/useLocalization';

const YourCountrySelector = () => {
  const { updateLocalizationForCountry } = useLocalization();

  const handleCountrySelect = async (country: Country) => {
    try {
      // Update tax settings (existing code)
      await updateTaxSettings({...});

      // NEW: Auto-switch language/currency
      await updateLocalizationForCountry(country);

      // Close modal or continue
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  return (
    // Your country selection UI
  );
};
```

### Step 2: Update App Header to Show Currency Symbol

**File:** `App.tsx` (Header component)

```typescript
import { useLocalization } from './src/hooks/useLocalization';
import { formatCurrency } from './src/utils/currencyFormatter';

const AppHeader = () => {
  const { settings } = useLocalization();
  const { summary } = usePortfolio();

  return (
    <View style={styles.header}>
      <Text style={styles.title}>Portfolio Rebalancer</Text>

      {/* NEW: Show currency symbol */}
      {settings && (
        <Text style={styles.currency}>
          {settings.currencySymbol} {settings.currency}
        </Text>
      )}

      {/* Show total portfolio value with correct currency formatting */}
      <Text style={styles.totalValue}>
        {formatCurrency(summary.totalValue, settings)}
      </Text>
    </View>
  );
};
```

### Step 3: Add Refresh Prices Button to Dashboard

**File:** `App.tsx` (in main component, after PortfolioSummary)

```typescript
import { usePrices } from './src/hooks/usePrices';
import { formatTimeDelta } from './src/utils/currencyFormatter';

const App = () => {
  const { assets, summary } = usePortfolio();
  const { settings } = useLocalization();
  const {
    prices,
    isLoading,
    isRefreshing,
    error,
    refresh,
    lastRefreshTime
  } = usePrices(assets, {
    currency: settings?.currency || 'USD',
    autoRefreshMs: 300000, // 5 minutes
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Existing code */}

        {/* NEW: Price refresh section */}
        <View style={styles.priceSection}>
          <View style={styles.priceHeader}>
            <Text style={styles.priceTitle}>Asset Prices</Text>

            <TouchableOpacity
              style={[
                styles.refreshButton,
                (isLoading || isRefreshing) && styles.refreshButtonDisabled
              ]}
              onPress={() => refresh()}
              disabled={isLoading || isRefreshing}
            >
              <Text style={styles.refreshButtonText}>
                {isRefreshing ? '⟳ Updating...' : '⟳ Refresh'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Last updated badge */}
          {lastRefreshTime && (
            <Text style={styles.lastUpdated}>
              {`Last updated: ${formatTimeDelta(lastRefreshTime)}`}
            </Text>
          )}

          {/* Error display */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          )}

          {/* Price list */}
          {Object.entries(prices).length > 0 && (
            <View style={styles.priceList}>
              {Object.entries(prices).map(([ticker, priceData]) => (
                <View key={ticker} style={styles.priceItem}>
                  <Text style={styles.ticker}>{ticker}</Text>
                  <Text style={styles.price}>
                    {formatCurrency(priceData.currentPrice, settings)}
                  </Text>
                  {priceData.percentChange24h !== undefined && (
                    <Text style={[
                      styles.change,
                      priceData.percentChange24h >= 0
                        ? styles.changePositive
                        : styles.changeNegative
                    ]}>
                      {priceData.percentChange24h >= 0 ? '+' : ''}
                      {priceData.percentChange24h.toFixed(2)}%
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Existing code continues */}
      </ScrollView>
    </SafeAreaView>
  );
};
```

### Step 4: Update Asset Card to Display Price

**File:** `App.tsx` (in AssetCard component)

```typescript
const AssetCard: React.FC<AssetCardProps> = ({ asset, totalValue, onDelete }) => {
  const { prices } = usePrices([asset]);
  const { settings } = useLocalization();

  const priceData = prices[asset.ticker!];

  return (
    <View style={[styles.card, SHADOWS.small]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleSection}>
          <Text style={styles.cardTitle}>
            {asset.name} {asset.ticker && `(${asset.ticker})`}
          </Text>

          {/* NEW: Show fetched price if available */}
          {priceData ? (
            <Text style={styles.cardPrice}>
              {formatCurrency(priceData.currentPrice, settings)}
            </Text>
          ) : (
            <Text style={styles.cardPrice}>
              {formatCurrency(asset.currentValue, settings)}
            </Text>
          )}
        </View>

        {/* Existing delete button */}
      </View>

      {/* Existing allocation display */}
    </View>
  );
};
```

### Step 5: Update PortfolioSummary to Use Correct Currency

**File:** `App.tsx` (in PortfolioSummary component)

```typescript
const PortfolioSummary: React.FC<SummaryProps> = ({...}) => {
  const { settings } = useLocalization();

  return (
    <View style={[styles.summaryCard, SHADOWS.medium]}>
      <Text style={styles.summaryTitle}>Portfolio Summary</Text>

      <View style={styles.summaryGrid}>
        {/* Total Value - with correct currency */}
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Value</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(summary.totalValue, settings)}
          </Text>
        </View>

        {/* Other summary items using formatCurrency */}
        {/* ... */}
      </View>
    </View>
  );
};
```

### Step 6: Create AssetSearch Component (Optional)

**File:** `src/components/AssetSearch.tsx`

```typescript
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useLocalization } from '../hooks/useLocalization';
import { priceService } from '../services/PriceService';
import { formatCurrency } from '../utils/currencyFormatter';
import { COLORS, SIZES } from '../styles/theme';

const COMMON_TICKERS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Google' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'META', name: 'Meta' },
];

interface AssetSearchProps {
  onSelectAsset: (symbol: string, name: string) => void;
  assetType?: 'crypto' | 'stock' | 'etf';
}

export const AssetSearch: React.FC<AssetSearchProps> = ({
  onSelectAsset,
  assetType = 'crypto',
}) => {
  const [query, setQuery] = useState('');
  const [isLoadingPrice, setIsLoadingPrice] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const { settings, translate } = useLocalization();

  const filteredAssets = useMemo(() => {
    if (!query.trim()) {
      return COMMON_TICKERS;
    }

    const lowerQuery = query.toLowerCase();
    return COMMON_TICKERS.filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(lowerQuery) ||
        asset.name.toLowerCase().includes(lowerQuery)
    );
  }, [query]);

  const handleSelectAsset = useCallback(
    async (symbol: string, name: string) => {
      try {
        setIsLoadingPrice(symbol);

        // Fetch current price
        // Note: This is async for demo purposes
        // In real usage, you'd fetch the actual price

        onSelectAsset(symbol, name);
      } catch (error) {
        console.error('Failed to fetch price:', error);
      } finally {
        setIsLoadingPrice(null);
      }
    },
    [onSelectAsset]
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder={translate('prices.searchPlaceholder')}
        placeholderTextColor={COLORS.textTertiary}
        value={query}
        onChangeText={setQuery}
      />

      {filteredAssets.length > 0 ? (
        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
          {filteredAssets.map((asset) => (
            <TouchableOpacity
              key={asset.symbol}
              style={styles.resultItem}
              onPress={() => handleSelectAsset(asset.symbol, asset.name)}
              disabled={isLoadingPrice === asset.symbol}
            >
              <View style={styles.resultContent}>
                <Text style={styles.resultSymbol}>{asset.symbol}</Text>
                <Text style={styles.resultName}>{asset.name}</Text>
              </View>

              {isLoadingPrice === asset.symbol ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.resultArrow}>›</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>
            {translate('prices.noResults', { query })}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchInput: {
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: SIZES.md,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    marginBottom: SIZES.xs,
    borderRadius: 8,
  },
  resultContent: {
    flex: 1,
  },
  resultSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  resultName: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  resultArrow: {
    fontSize: 20,
    color: COLORS.primary,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
```

---

## 📦 Installation Instructions

### 1. Install Dependencies

```bash
npm install i18n-js axios

# TypeScript types
npm install --save-dev @types/i18n-js
```

### 2. Create Translation Files for Other Languages

For production, create JSON files in `src/locales/` for each language:
- `ko.json` (Korean)
- `zh.json` (Simplified Chinese)
- `ja.json` (Japanese)
- `de.json` (German)
- `fr.json` (French)
- `it.json` (Italian)
- `es.json` (Spanish/Other)
- `hi.json` (Hindi)
- `pt.json` (Portuguese/Brazil)
- `ca.json` (Canadian English)

Template structure for each file:
```json
{
  "app": { "title": "Portfolio Rebalancer", "subtitle": "..." },
  "common": { ... },
  "assets": { ... },
  "prices": { ... },
  ...
}
```

### 3. Update `src/locales/index.ts`

Once you create the JSON files, import them:

```typescript
import enTranslations from './en.json';
import koTranslations from './ko.json';
import zhTranslations from './zh.json';
// ... etc

I18n.translations = {
  [Language.ENGLISH]: enTranslations,
  [Language.KOREAN]: koTranslations,
  [Language.CHINESE]: zhTranslations,
  // ... etc
};
```

---

## 🎯 Key Features

### Localization (i18n)

✅ **Auto-switching** - Language/currency switches when user selects country
✅ **Persistent** - Settings saved to AsyncStorage
✅ **Type-safe** - Full TypeScript support
✅ **11 countries** - All 11 target countries supported
✅ **Number formatting** - Locale-aware decimal/thousands separators
✅ **Currency symbols** - Correct symbols for each currency

### Real-Time Prices

✅ **CoinGecko API** - Free cryptocurrency prices (no auth required)
✅ **Caching** - 5-minute in-memory cache
✅ **Auto-refresh** - Configurable refresh interval (default 5 minutes)
✅ **Error handling** - Graceful degradation on API failures
✅ **Rate limiting** - Respects API rate limits
✅ **Last updated** - Shows when prices were last fetched

---

## 🔄 Data Flow

### Localization Flow

```
User Selects Country
        ↓
CountrySelectModal.handleSelect()
        ↓
useLocalization.updateLocalizationForCountry(country)
        ↓
getLanguageMappingForCountry(country) → Language + Currency
        ↓
AsyncStorage.setItem() + setLanguage()
        ↓
All UI components re-render with new currency symbols
```

### Price Fetching Flow

```
Component mounts with assets
        ↓
usePrices hook initializes
        ↓
Separates assets by class (crypto, stock, etf)
        ↓
Checks priceCache for cached prices
        ↓
Fetches uncached prices from CoinGecko
        ↓
Updates cache and component state
        ↓
UI displays formatted prices with correct currency
        ↓
Auto-refresh timer triggers refetch every 5 minutes
```

---

## 💡 Usage Examples

### In Components

```typescript
// Get localization settings
const { settings, translate, updateLocalizationForCountry } = useLocalization();

// Format currency
<Text>{formatCurrency(1000, settings)}</Text>
// Output: $1,000.00 (or ₩1,000 if Korea selected)

// Format with timestamp
<Text>{formatTimeDelta(priceData.lastUpdated)}</Text>
// Output: "5m ago"

// Get translated string
<Text>{translate('assets.name')}</Text>
// Output: "Asset Name"

// Fetch and display prices
const { prices, isLoading, refresh, lastRefreshTime } = usePrices(assets);

<TouchableOpacity onPress={() => refresh()}>
  <Text>Refresh Prices</Text>
</TouchableOpacity>

{Object.entries(prices).map(([ticker, priceData]) => (
  <Text key={ticker}>
    {ticker}: {formatCurrency(priceData.currentPrice, settings)}
  </Text>
))}
```

---

## 🧪 Testing Checklist

- [ ] User adds asset with ticker symbol (e.g., "BTC")
- [ ] Asset price automatically fetches from CoinGecko
- [ ] Refresh button works and updates prices
- [ ] "Last updated" timestamp displays correctly
- [ ] User selects different country
- [ ] Currency symbol changes globally
- [ ] All numbers re-format with new locale
- [ ] Prices re-fetch in new currency (if applicable)
- [ ] Price refresh continues working
- [ ] App works offline with cached prices
- [ ] Error handling shows graceful message on API failure

---

## 🚀 Performance Optimization

### Built-in Optimizations

1. **Caching** - Prices cached for 5 minutes by default
2. **Request Deduplication** - Duplicate requests within 100ms prevented
3. **Batch Fetching** - Multiple prices fetched in single API call
4. **Lazy Initialization** - Locale data loads on demand
5. **Memory Management** - Old cache entries auto-cleaned

### Additional Optimization Tips

```typescript
// Adjust cache TTL based on needs
const { prices } = usePrices(assets, {
  currency: 'USD',
  autoRefreshMs: 600000, // 10 minutes instead of 5
  enableCache: true,
});

// Disable auto-refresh for specific assets
const { prices } = usePrices(assets, {
  autoRefreshMs: 0, // Manual refresh only
});

// Clear cache when not needed
priceService.clearCache('BTC'); // Clear single ticker
priceService.clearCache(); // Clear all
```

---

## 📚 Additional Resources

- **CoinGecko API Docs**: https://www.coingecko.com/en/api/documentation
- **i18n-js Docs**: https://github.com/fnando/i18n-js
- **CLDR Locale Data**: https://cldr.unicode.org/

---

## ⚠️ Known Limitations

1. **Stock Prices** - Free tier APIs require authentication. Implement with API key or use premium service
2. **Real Estate** - Must be entered manually (no public API available)
3. **Rate Limits** - CoinGecko free tier has ~10-50 calls/minute
4. **Offline Mode** - Uses cached prices only, no real-time updates
5. **Translation Files** - Only English provided. Create translations for other languages.

---

## 🎓 Next Steps

1. ✅ Install packages
2. ✅ Import hooks and utilities in components
3. ✅ Wire up country selection to localization
4. ✅ Add refresh button and price display
5. ⏳ Create translation files for other languages
6. ⏳ Add stock price API integration (requires API key)
7. ⏳ Implement price history/charts

---

**Status:** Ready for Production Integration
**Last Updated:** January 27, 2026
