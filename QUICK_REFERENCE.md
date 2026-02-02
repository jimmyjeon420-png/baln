# Quick Reference Card

## 🚀 Get Started in 3 Commands

```bash
cd "Smart Rebalancer"
npm install
npm start
```

Then scan the QR code with **Expo Go** on your phone!

---

## 📁 File Locations

| What | File |
|------|------|
| **Main App** | `App.tsx` |
| **Portfolio Hook** | `src/hooks/usePortfolio.ts` |
| **Calculations** | `src/utils/rebalanceCalculator.ts` |
| **Storage** | `src/utils/storage.ts` |
| **Freemium Logic** | `src/utils/freemium.ts` |
| **Types** | `src/types/asset.ts` |
| **Design System** | `src/styles/theme.ts` |
| **Expo Config** | `app.json` |
| **TypeScript Config** | `tsconfig.json` |

---

## 🎯 Key Functions

### usePortfolio Hook
```typescript
const {
  assets,              // Asset[] - all assets
  summary,             // PortfolioSummary - calculations
  addAsset,            // (asset) => Promise<bool>
  updateAsset,         // (id, asset) => Promise<void>
  deleteAsset,         // (id) => Promise<void>
  isLoading,           // boolean
  isPro,               // boolean
  canAddMore,          // boolean
} = usePortfolio();
```

### Rebalancing Calculator
```typescript
import { calculateRebalancing } from './utils/rebalanceCalculator';

const summary = calculateRebalancing(assets);
// Returns: { totalValue, totalAllocationPercentage, actions, isBalanced }
```

### Storage
```typescript
import { saveAssets, loadAssets } from './utils/storage';

await saveAssets(assets);
const loaded = await loadAssets();
```

---

## 🎨 Colors Quick Reference

```typescript
import { COLORS } from './src/styles/theme';

COLORS.background    // Dark blue background
COLORS.surface       // Dark slate cards
COLORS.textPrimary   // White text
COLORS.buy           // Green #10B981
COLORS.sell          // Red #EF4444
COLORS.hold          // Amber #F59E0B
COLORS.primary       // Blue #3B82F6
```

---

## 📊 Data Structures

### Asset
```typescript
{
  id: "1234-567",
  name: "Apple",
  currentValue: 5000,
  targetAllocation: 30,
  createdAt: 1234567890
}
```

### RebalanceAction
```typescript
{
  assetId: "1234-567",
  assetName: "Apple",
  currentValue: 5000,
  targetValue: 6000,
  action: "BUY",
  amount: 1000,
  percentage: 5.2
}
```

---

## ⚙️ Configuration

### Change Asset Limits
File: `src/utils/freemium.ts`
```typescript
const FREE_ASSET_LIMIT = 3;     // Free users
const PRO_ASSET_LIMIT = Infinity; // Pro users
```

### Change Tolerance
File: `src/utils/rebalanceCalculator.ts`
```typescript
const TOLERANCE = 0.5; // ±0.5% before recommending rebalance
```

### Change App Name
File: `app.json`
```json
"name": "Smart Rebalancer",
"slug": "smart-rebalancer"
```

---

## 🧪 Testing Commands

```bash
# Type checking
npx tsc --noEmit

# Start dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Web version
npm run web
```

---

## 📱 App Structure

```
App.tsx (Root Component)
├─ Header
├─ ScrollView (Content)
│  ├─ Portfolio Summary (if assets exist)
│  ├─ Asset Cards
│  └─ Rebalancing Actions
├─ Footer (with Add Button)
└─ AssetForm Modal
```

---

## 🔄 Data Flow Summary

```
User adds asset
    ↓
AssetForm validates
    ↓
usePortfolio.addAsset()
    ↓
saveAssets() to AsyncStorage
    ↓
State updates → UI re-renders
    ↓
calculateRebalancing() runs
    ↓
Summary displays buy/sell actions
```

---

## 🧠 Core Algorithm (Simple Version)

```
For each asset:
  Current% = (Value / Total) × 100
  Target$ = (Target% / 100) × Total

  If difference is small (±0.5%):
    HOLD
  Else if need more:
    BUY
  Else if have too much:
    SELL
```

---

## 🔐 Privacy Features

✅ All data stays on device
✅ No login required
✅ No servers contacted
✅ No tracking
✅ No permissions

---

## 💡 Common Tasks

### Add a New Asset Field
1. Update interface in `src/types/asset.ts`
2. Add input in `AssetForm` component
3. Update calculations if needed
4. Update UI display

### Change Colors
Edit `src/styles/theme.ts` → COLORS object

### Modify Calculation
Edit `src/utils/rebalanceCalculator.ts` → `calculateRebalancing()` function

### Add New Feature
1. Add logic to appropriate `src/utils/` file
2. Update `src/types/` if needed
3. Use in `usePortfolio` hook
4. Add UI in `App.tsx`

---

## 🚨 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| Module not found | Run `npm install` |
| AsyncStorage error | Run `expo install @react-native-async-storage/async-storage` |
| Type errors | Run `npx tsc --noEmit` to see all errors |
| App crashes | Check terminal output for error message |
| Hot reload not working | Press 'q' in terminal, then restart |

---

## 📚 Documentation Map

| Doc | Purpose |
|-----|---------|
| `README.md` | Project overview & features |
| `SETUP_GUIDE.md` | Detailed setup instructions |
| `CALCULATIONS.md` | Algorithm explanation with examples |
| `ARCHITECTURE.md` | System design & patterns |
| `PROJECT_SUMMARY.md` | What was built |
| `QUICK_REFERENCE.md` | This file! |

---

## ✨ Features At a Glance

✓ Add/edit/delete assets
✓ Automatic rebalancing calculations
✓ Visual portfolio dashboard
✓ Dark mode UI
✓ Local data persistence
✓ 3 free assets limit
✓ TypeScript type safety
✓ No login required

---

## 🎯 MVP Checklist

- [x] Asset management (CRUD)
- [x] Rebalancing calculations
- [x] Portfolio summary
- [x] Buy/Sell recommendations
- [x] Dark mode UI
- [x] Local storage
- [x] Freemium limits
- [x] Type safety (TypeScript)
- [x] Error handling
- [x] Documentation

---

## 🔜 Next Phase Ideas

- Multi-currency support
- Export/import portfolio
- Asset categories
- Pro subscription integration
- Real-time price feeds
- Performance analytics
- Cloud backup

---

## 📞 Quick Help

**How do I run the app?**
```bash
npm install && npm start
```

**Can I modify the code?**
Yes! Edit any file and hot reload will update the app.

**Is my data safe?**
Yes! Everything stays on your device locally.

**How do I add more assets?**
Tap the "+ Add Asset" button in the footer.

**What's the free limit?**
3 assets. Edit `freemium.ts` to change.

---

**You're all set! Start building! 🚀**

For more details:
- See `README.md` for features
- See `SETUP_GUIDE.md` for detailed setup
- See `CALCULATIONS.md` for algorithm details
- See `ARCHITECTURE.md` for system design
