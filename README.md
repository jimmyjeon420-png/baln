# Smart Rebalancer - Portfolio Rebalancing Calculator

A privacy-focused, mobile-first portfolio rebalancing calculator built with React Native and TypeScript. Perfect for global investors who want to maintain their target asset allocations.

## 🎯 Features

### MVP Features
- **Asset Management**: Add, edit, and delete portfolio assets
- **Rebalancing Calculations**: Automatic calculation of buy/sell actions to reach target allocations
- **Visual Portfolio Summary**: View total portfolio value, allocation percentages, and balance status
- **Dark Mode UI**: Modern, clean interface optimized for financial data visualization
- **Local Storage**: All data stored locally (no login, no servers, 100% private)
- **Freemium Model**: 3 free assets, unlimited with Pro upgrade

### Key Metrics
- Current vs Target Allocation
- Amount to Buy/Sell
- Portfolio Balance Status
- Real-time Summary Dashboard

## 🛠 Tech Stack

- **Framework**: React Native (Expo SDK 50+)
- **Language**: TypeScript
- **Storage**: AsyncStorage (local-first)
- **Styling**: React Native StyleSheet
- **Navigation**: Ready for Expo Router integration

## 📋 Project Structure

```
smart-rebalancer/
├── App.tsx                          # Main app & UI components
├── src/
│   ├── types/
│   │   └── asset.ts                # TypeScript interfaces
│   ├── utils/
│   │   ├── rebalanceCalculator.ts   # Core rebalancing logic
│   │   ├── storage.ts               # AsyncStorage helpers
│   │   └── freemium.ts              # Monetization logic
│   ├── hooks/
│   │   └── usePortfolio.ts          # Custom portfolio hook
│   └── styles/
│       └── theme.ts                 # Colors, sizes, typography
├── app.json                         # Expo configuration
├── tsconfig.json                    # TypeScript config
├── package.json                     # Dependencies
└── babel.config.js                  # Babel configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS: Xcode (Mac) or Android Studio

### Installation

```bash
# 1. Navigate to project directory
cd "Smart Rebalancer"

# 2. Install dependencies
npm install

# 3. Start development server
npm start
```

### Running on Devices

```bash
# iOS Simulator (Mac only)
npm run ios

# Android Emulator
npm run android

# Web (for testing)
npm run web

# Expo Go App (scan QR code with phone)
npm start
# Then press 'i' for iOS or 'a' for Android
```

## 📱 App Walkthrough

### 1. **Add Your First Asset**
- Tap "+ Add Asset"
- Enter asset name (e.g., "Apple", "Bitcoin")
- Enter current market value
- Enter target allocation % (should sum to ~100%)
- Asset saved locally

### 2. **View Portfolio Summary**
- Total portfolio value calculated
- Current allocations shown
- Balance status displayed
- Total allocation % verified

### 3. **Get Rebalancing Actions**
- 🟢 **BUY**: Assets below target allocation
- 🔴 **SELL**: Assets above target allocation
- 🟡 **HOLD**: Assets within tolerance (±0.5%)

### 4. **Freemium Limits**
- Free: Max 3 assets
- Pro: Unlimited assets
- Upgrade modal shows when limit reached

## 💡 Core Logic

### Rebalancing Algorithm

```typescript
// For each asset:
CurrentPercentage = (CurrentValue / TotalValue) × 100
TargetValue = (TargetAllocation / 100) × TotalValue
Difference = TargetValue - CurrentValue

if |Difference| > $0.5:
  if Difference > 0: BUY
  else: SELL
else: HOLD
```

### Data Persistence
- AsyncStorage saves all assets on any change
- Auto-loads on app startup
- Survives app restarts and crashes

## 🔐 Privacy & Security

✅ **Privacy-First Design**
- No login required
- No data sent to servers
- All calculations local
- No analytics or tracking
- Data stored only on device

⚠️ **Important**
- If user clears app data, portfolio is lost
- Recommend users export data periodically
- No cloud backup (future Pro feature)

## 📊 Data Structure

### Asset Interface
```typescript
interface Asset {
  id: string;                    // Unique identifier
  name: string;                  // Asset name
  currentValue: number;          // USD value
  targetAllocation: number;      // Target %
  createdAt: number;             // Timestamp
}
```

### RebalanceAction Interface
```typescript
interface RebalanceAction {
  assetId: string;
  assetName: string;
  currentValue: number;
  targetValue: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: number;                // $ to buy/sell
  percentage: number;            // % difference
}
```

## 🎨 Design System

### Colors (Dark Mode)
- **Background**: #0F172A (Very Dark Blue)
- **Surface**: #1E293B (Dark Slate)
- **Buy**: #10B981 (Green)
- **Sell**: #EF4444 (Red)
- **Hold**: #F59E0B (Amber)
- **Text Primary**: #F1F5F9 (Almost White)

### Spacing Scale
- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 20px, xxl: 24px

### Typography
- **Heading Large**: 28px, Bold
- **Heading Medium**: 24px, Bold
- **Body**: 14-16px, Regular
- **Label**: Bold variants

## 🧪 Testing

### Manual Testing Checklist
- [ ] Add asset with valid values
- [ ] Try to add 4th asset (should show limit warning)
- [ ] Edit asset allocation
- [ ] Delete asset (with confirmation)
- [ ] Verify calculations are correct
- [ ] Test with 100% allocation vs imbalanced
- [ ] Clear app data and restart
- [ ] Test on both iOS and Android

## 🔄 Future Enhancements

### Phase 2 (Post-MVP)
- Export/Import portfolio data
- Asset categories (Stocks, Bonds, Crypto, etc.)
- Historical price tracking
- Pro subscription integration
- Cloud backup (Pro)
- Multi-currency support

### Phase 3 (Advanced)
- Real-time price feeds
- Tax-aware rebalancing
- Portfolio performance analytics
- Custom rebalancing schedules
- Alerts for allocation drift

## 📝 Code Examples

### Adding an Asset Programmatically
```typescript
const { addAsset } = usePortfolio();

await addAsset({
  name: 'Apple',
  currentValue: 5000,
  targetAllocation: 30
});
```

### Calculating Rebalancing
```typescript
import { calculateRebalancing } from './src/utils/rebalanceCalculator';

const summary = calculateRebalancing(assets);
// Returns: { totalValue, actions, isBalanced, ... }
```

### Accessing Portfolio Data
```typescript
import { loadAssets, saveAssets } from './src/utils/storage';

const assets = await loadAssets();
const newAssets = [...assets, newAsset];
await saveAssets(newAssets);
```

## 🛠 Development Commands

```bash
# Start dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web

# Type checking
npx tsc --noEmit

# Format code (configure ESLint)
npm run lint
```

## 📄 License

MIT License - Feel free to use this as a template for your own apps.

## 👨‍💻 Author

Built as a portfolio rebalancing tool for global investors who value privacy and simplicity.

## 🤝 Contributing

Want to improve Smart Rebalancer? Feel free to fork, submit issues, or create pull requests.

---

**Built with ❤️ using React Native & TypeScript**
