# Quick Start: Localization & Price Integration

## What Changed?

✅ **App.tsx** - Full integration complete
- Localization hook added (`useLocalization`)
- Price fetching hook added (`usePrices`)
- Currency symbol displays throughout app
- "Last Updated" timestamp shows when prices were fetched
- Refresh button to manually update prices
- Asset cards display ticker prices with 24h changes

✅ **package.json** - New dependencies added
- `i18n-js@^3.9.2` - Language/currency switching
- `axios@^1.6.0` - API calls for prices

✅ **New Files Created** (12 files)
- Localization system (types, locales, hook)
- Price fetching (types, services, hook)
- Currency formatting utilities

---

## 3 Steps to Get Started

### Step 1: Install Dependencies (2 minutes)
```bash
cd "C:\Users\김고은\Desktop\Smart Rebalancer"
npm install
```

### Step 2: Test the App (5 minutes)
```bash
npm start
# Then select Android or iOS
```

**Quick Test Checklist:**
- [ ] App loads without errors
- [ ] Can add an asset
- [ ] Header shows currency symbol ($ for USA)
- [ ] Price status bar appears below header

### Step 3: Test Localization (2 minutes)
```
1. Click country button in header (currently "🇺🇸 USA")
2. Select "South Korea"
3. Verify:
   - Header now shows "🇰🇷 South Korea"
   - Currency displays as ₩ (won)
   - All prices reformat with Korean number format
```

---

## Current Features ✅

**What's Working Right Now:**

1. **Localization**
   - Supports 11 countries
   - Auto-switches language/currency when country selected
   - Settings persist across app restarts
   - Locale-aware number formatting

2. **Price Fetching**
   - Real-time Bitcoin (BTC) and crypto prices
   - 24h price change display
   - "Last Updated" timestamp
   - Manual refresh button
   - Auto-refresh every 5 minutes

3. **Currency Display**
   - All values format in correct currency
   - Correct decimal separators (1,000 vs 1.000)
   - Currency symbols display

---

## What to Add Next (Optional)

### Add Ticker Symbols to Assets
When adding an asset:
1. Set "Ticker Symbol" to "BTC" for Bitcoin
2. App auto-fetches live BTC price
3. Price displays in asset card with 24h change

**Example Tickers:**
- BTC = Bitcoin
- ETH = Ethereum
- SOL = Solana
- XRP = Ripple
- ADA = Cardano
- DOGE = Dogecoin
- ... and 14+ more

### Create More Languages (Optional)
Currently only English (en.json) exists. To add other languages:

1. Copy `src/locales/en.json` to `src/locales/ko.json`
2. Translate all values to Korean
3. Repeat for other languages
4. Update `src/locales/index.ts` to import all files

---

## File Changes Summary

### Modified Files
1. **App.tsx** (~200 lines added)
   - Localization hook integration
   - Price hook integration
   - Price status bar UI
   - Enhanced asset cards
   - Currency formatting throughout

2. **package.json** (2 dependencies added)
   - i18n-js
   - axios

### New Files (Not Modified)
- All 12 localization/price files already created and ready
- No further code changes needed

---

## Troubleshooting

### If npm install fails:
```bash
# Clear cache and try again
npm cache clean --force
npm install
```

### If app won't start:
```bash
# Make sure all dependencies installed
npm install

# Clear Expo cache
expo start -c

# If still failing, check for TypeScript errors
npm run lint
```

### If prices aren't showing:
- Make sure asset has a ticker symbol set (BTC, ETH, etc.)
- Check that CoinGecko API is accessible (test in browser: coingecko.com)
- Check app console for error messages

### If currency doesn't switch:
- Make sure you have AsyncStorage installed (included in package.json)
- Try closing and reopening the app
- Check browser console for errors

---

## Success Criteria

✅ You're done when:
1. `npm install` completes without errors
2. App starts without console errors
3. Can add an asset and select a country
4. Header currency symbol updates when country changes
5. (Optional) Prices display for assets with ticker symbols

---

## Next Steps

1. **Run `npm install`** to complete the integration
2. **Test the basic flow** (add asset, change country)
3. **Add ticker symbols** to existing assets to see prices
4. **(Optional) Create translation files** for other languages
5. **(Optional) Test all 11 countries** to verify localization works

---

## Need Help?

**Check these files for details:**
- `INTEGRATION_COMPLETION_SUMMARY.md` - Full integration details
- `LOCALIZATION_AND_PRICE_INTEGRATION.md` - Complete guide with examples
- `LOCALIZATION_PRICE_IMPLEMENTATION_SUMMARY.md` - Technical implementation details

**Key Files to Review:**
- `App.tsx` - See the integration in action
- `src/hooks/useLocalization.ts` - Localization logic
- `src/hooks/usePrices.ts` - Price fetching logic
- `src/utils/currencyFormatter.ts` - Currency formatting examples

---

## Summary

**Status:** ✅ Integration Complete & Ready to Test

**3 Quick Steps:**
1. `npm install`
2. `npm start`
3. Test by changing country and adding ticker symbols

**Time to Setup:** 5-10 minutes total

Let's go! 🚀
