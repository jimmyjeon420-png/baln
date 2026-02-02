# Smart Rebalancer - Setup & Development Guide

## 🎯 Initial Setup (5 minutes)

### Step 1: Install Expo CLI Globally
```bash
npm install -g expo-cli
```

### Step 2: Navigate to Project Directory
```bash
cd "Smart Rebalancer"
```

### Step 3: Install Dependencies
```bash
npm install
```

This installs:
- `react-native` - Mobile framework
- `expo` - Build system
- `@react-native-async-storage/async-storage` - Local storage
- `typescript` - Type checking
- And supporting dependencies

### Step 4: Start Development Server
```bash
npm start
```

You should see:
```
› Metro waiting on exp://localhost:19000
```

## 📱 Running on Devices

### Option A: Expo Go App (Easiest)
1. Download "Expo Go" from App Store / Play Store on your phone
2. In terminal, after `npm start`, a QR code appears
3. Open Expo Go → Scan QR code
4. App launches on your phone in real-time
5. Changes auto-reload as you edit code

### Option B: iOS Simulator (Mac Only)
```bash
npm run ios
```
- Requires Xcode installed
- Opens iOS Simulator automatically

### Option C: Android Emulator
```bash
npm run android
```
- Requires Android Studio installed
- Must have emulator running first

### Option D: Web Browser (Testing Only)
```bash
npm run web
```
- Opens http://localhost:19006
- Limited React Native compatibility
- Useful for quick layout testing

## 📂 Project Structure Explained

```
smart-rebalancer/
│
├── App.tsx ................................. Main component (all UI for MVP)
├── app.json ................................. Expo configuration
├── babel.config.js .......................... Babel transpiler config
├── tsconfig.json ............................ TypeScript config
├── package.json ............................. Dependencies
│
└── src/
    ├── types/
    │   └── asset.ts ......................... Data interfaces
    │
    ├── utils/
    │   ├── rebalanceCalculator.ts .......... Core math functions
    │   ├── storage.ts ....................... AsyncStorage helpers
    │   └── freemium.ts ...................... Subscription logic
    │
    ├── hooks/
    │   └── usePortfolio.ts ................. State management hook
    │
    └── styles/
        └── theme.ts ......................... Colors, sizes, fonts
```

## 🏗️ Architecture Overview

### Data Flow
```
User Input (Form)
       ↓
usePortfolio Hook (State Management)
       ↓
rebalanceCalculator (Business Logic)
       ↓
AsyncStorage (Persistence)
       ↓
UI Components (Display)
```

### Key Files & Responsibilities

| File | Responsibility |
|------|-----------------|
| `App.tsx` | UI components, form, asset list, rebalancing actions |
| `usePortfolio.ts` | State management, asset CRUD, calculations |
| `rebalanceCalculator.ts` | Math: allocations, buy/sell amounts, validation |
| `storage.ts` | Save/load from AsyncStorage, export/import |
| `freemium.ts` | Check limits (3 free assets, unlimited Pro) |
| `theme.ts` | Design system (colors, spacing, typography) |

## 🧪 Testing Your Setup

### 1. Verify TypeScript Compilation
```bash
npx tsc --noEmit
```
Should output: no errors

### 2. Add a Test Asset
1. Launch app (`npm start`)
2. Tap "+ Add Asset"
3. Enter:
   - Name: "Apple"
   - Value: 10000
   - Allocation: 40
4. Tap "Add Asset"
5. Should appear in list

### 3. Verify Calculations
Check if the math is correct:
- Portfolio Value = Sum of all current values
- Current % = (Asset Value / Portfolio Value) × 100
- Action = Based on difference between Current % and Target %

### 4. Test Asset Limit
- Try adding 4th asset
- Should show: "Reached asset limit"

## 🔧 Common Development Tasks

### Add a New Feature
1. Define types in `src/types/asset.ts`
2. Add logic to `src/utils/`
3. Create hook or use existing `usePortfolio`
4. Add UI component to `App.tsx`
5. Style using `COLORS` from `theme.ts`

### Example: Add Currency Support
```typescript
// 1. Update Asset type
interface Asset {
  id: string;
  currency: 'USD' | 'EUR' | 'GBP'; // NEW
  // ... existing fields
}

// 2. Update calculation logic
// (handle currency conversion)

// 3. Add UI dropdown in AssetForm
// (let user pick currency)
```

### Modify Colors/Theme
Edit `src/styles/theme.ts`:
```typescript
export const COLORS = {
  background: '#0F172A',      // Change background
  buy: '#10B981',             // Change buy color (green)
  sell: '#EF4444',            // Change sell color (red)
  // ...
};
```

### Change Asset Limits
Edit `src/utils/freemium.ts`:
```typescript
const FREE_ASSET_LIMIT = 5;      // Change from 3 to 5
const PRO_ASSET_LIMIT = Infinity;
```

## 📦 Dependencies Explained

| Package | Purpose | Why Used |
|---------|---------|----------|
| `react-native` | Mobile UI framework | Core library |
| `expo` | Build system for RN | Easy setup, no native code |
| `typescript` | Type safety | Catch errors early |
| `@react-native-async-storage/async-storage` | Local data storage | Simple, no backend needed |
| `expo-router` | Navigation (optional) | For multi-screen apps |

### Installing Additional Packages
```bash
npm install package-name
# OR
expo install package-name
```

> **Note**: Always use `expo install` for native Expo packages

## 🐛 Troubleshooting

### Issue: "Cannot find module '@react-native-async-storage'"
```bash
npm install @react-native-async-storage/async-storage
```

### Issue: App crashes on load
1. Check terminal for error messages
2. Run `npx tsc --noEmit` to find TypeScript errors
3. Check AsyncStorage permissions in `app.json`

### Issue: Styling looks wrong
- Check `theme.ts` for color/size definitions
- Verify SafeAreaView is wrapping root component
- Test on actual device (simulator sometimes looks different)

### Issue: Hot reload not working
1. Stop app (press 'q' in terminal)
2. Clear metro cache: `npm start -- -c`
3. Relaunch app

### Issue: AsyncStorage returns empty data
1. Verify `loadAssets()` is called in useEffect
2. Check browser DevTools (if web): Application → AsyncStorage
3. Try clearing app data and restarting

## ✅ Development Checklist

Before starting development:
- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Expo CLI installed (`expo --version`)
- [ ] Project dependencies installed (`npm install`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] App starts (`npm start`)
- [ ] Can see app on device/emulator

## 📚 Learning Resources

### React Native
- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [React Native Paper UI Kit](https://callstack.github.io/react-native-paper/)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React + TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### AsyncStorage
- [AsyncStorage Docs](https://react-native-async-storage.github.io/async-storage/)

## 🚀 Next Steps

1. **Run the app** locally
2. **Add a few test assets** to see calculations in action
3. **Explore the code** - read through `App.tsx` and understand the flow
4. **Customize** colors, fonts, or logic to your preference
5. **Build features** you need

## 📞 Need Help?

- Check error messages in terminal
- Run `npx tsc --noEmit` for type errors
- Read inline code comments in `App.tsx`
- Consult official docs (React Native, Expo, TypeScript)

---

**Happy coding! 🎉**
