# Architecture & Design Patterns

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          APP LAYER                          │
│                        (App.tsx)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  UI Components                                       │  │
│  │  ├─ AssetForm (Modal)                               │  │
│  │  ├─ AssetCard (List Item)                           │  │
│  │  ├─ ActionCard (Rebalancing Action)                 │  │
│  │  ├─ PortfolioSummary (Dashboard)                    │  │
│  │  └─ Empty/Loading States                            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬─────────────────────────────────────────────┘
                 │ Uses
┌────────────────▼─────────────────────────────────────────────┐
│                     HOOK LAYER                               │
│                   (usePortfolio.ts)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ State Management (useState)                          │  │
│  │ ├─ assets: Asset[]                                  │  │
│  │ ├─ summary: PortfolioSummary                        │  │
│  │ └─ isLoading: boolean                               │  │
│  │                                                      │  │
│  │ Methods                                              │  │
│  │ ├─ addAsset()                                       │  │
│  │ ├─ updateAsset()                                    │  │
│  │ ├─ deleteAsset()                                    │  │
│  │ └─ clearAll()                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬─────────────────────────────────────────────┘
                 │ Calls
┌────────────────▼─────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                       │
│          (rebalanceCalculator.ts + freemium.ts)             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Calculations                                         │  │
│  │ ├─ calculateRebalancing()  [Main Algorithm]         │  │
│  │ ├─ getTotalAllocation()                             │  │
│  │ ├─ isValidAllocation()                              │  │
│  │ └─ generateAssetId()                                │  │
│  │                                                      │  │
│  │ Freemium Logic                                       │  │
│  │ ├─ isProUser()                                      │  │
│  │ ├─ canAddAsset()                                    │  │
│  │ └─ getAssetLimit()                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬─────────────────────────────────────────────┘
                 │ Persists to
┌────────────────▼─────────────────────────────────────────────┐
│                    STORAGE LAYER                             │
│                    (storage.ts)                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ AsyncStorage Operations                             │  │
│  │ ├─ saveAssets()                                     │  │
│  │ ├─ loadAssets()                                     │  │
│  │ ├─ clearAssets()                                    │  │
│  │ ├─ exportPortfolioData()                            │  │
│  │ └─ importPortfolioData()                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ▼                                    │
│          ┌──────────────────────────────┐                   │
│          │   Device Storage (Local)     │                   │
│          │   AsyncStorage JSON          │                   │
│          └──────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Adding a New Asset
```
User Input
   ↓
AssetForm Component
   │
   ├─ Validate Input
   │  ├─ Check name not empty
   │  ├─ Check value is positive
   │  └─ Check allocation 0-100%
   │
   └─ On Valid Input:
      ↓
   usePortfolio.addAsset()
      │
      ├─ Check asset limit (free: 3, pro: ∞)
      │
      ├─ Generate unique ID
      │
      ├─ Add timestamp
      │
      └─ Call storage.saveAssets()
         │
         └─ AsyncStorage saves JSON
            │
            └─ Update local state
               │
               └─ UI updates
```

### Calculating Rebalancing
```
User views Portfolio
   ↓
usePortfolio hook triggers
   ↓
calculateRebalancing(assets)
   │
   ├─ Loop through each asset
   │
   ├─ For each asset:
   │  ├─ Calculate: currentValue / totalValue
   │  ├─ Calculate: (target% / 100) × totalValue
   │  ├─ Determine: BUY / SELL / HOLD action
   │  └─ Store: RebalanceAction object
   │
   └─ Return: PortfolioSummary
      │
      └─ Update state → UI renders
```

---

## Component Hierarchy

```
App (Root)
├─ StatusBar
├─ SafeAreaView
│  ├─ ScrollView
│  │  ├─ Header
│  │  │  ├─ Title
│  │  │  └─ Badges
│  │  │
│  │  ├─ Empty State (if no assets)
│  │  │  └─ Call to Action
│  │  │
│  │  ├─ Portfolio Summary (if assets exist)
│  │  │  ├─ Total Value
│  │  │  ├─ Total Allocation
│  │  │  └─ Balance Status
│  │  │
│  │  ├─ Asset Cards Section
│  │  │  └─ AssetCard[] (list of assets)
│  │  │     └─ AssetCard
│  │  │        ├─ Title + Value
│  │  │        ├─ Progress Bar
│  │  │        ├─ Allocation Rows
│  │  │        └─ Difference
│  │  │
│  │  ├─ Rebalancing Actions Section (if imbalanced)
│  │  │  ├─ Buy Actions Group
│  │  │  │  └─ ActionCard[]
│  │  │  ├─ Sell Actions Group
│  │  │  │  └─ ActionCard[]
│  │  │  └─ Hold Actions Group
│  │  │     └─ ActionCard[]
│  │  │
│  │  └─ Balanced State (if balanced)
│  │
│  ├─ Footer
│  │  ├─ Limit Warning (optional)
│  │  └─ Add Asset Button
│  │
│  └─ AssetForm Modal
│     ├─ Header
│     ├─ Form
│     │  ├─ Name Input
│     │  ├─ Value Input
│     │  ├─ Allocation Input
│     │  └─ Help Text
│     └─ Actions
│        ├─ Cancel Button
│        └─ Add Asset Button
```

---

## State Management Pattern

### Using React Hooks

```typescript
// Custom Hook Pattern
export const usePortfolio = (): UsePortfolioReturn => {
  // 1. Local State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<PortfolioSummary>({...});

  // 2. Side Effects
  useEffect(() => {
    // Load data on mount
    loadAssets().then(setAssets);
  }, []);

  useEffect(() => {
    // Recalculate summary when assets change
    const newSummary = calculateRebalancing(assets);
    setSummary(newSummary);
  }, [assets]);

  // 3. Handlers
  const addAsset = useCallback(async (asset) => {
    const updated = [...assets, newAsset];
    await saveAssets(updated);
    setAssets(updated);
  }, [assets]);

  // 4. Return Computed Values
  return {
    assets,
    summary,
    addAsset,
    // ...
  };
};
```

### Benefits
- No Redux/Context complexity
- Easier to test
- Better performance (no unnecessary re-renders)
- Simpler to understand

---

## Calculation Engine Deep Dive

```typescript
// Main Algorithm
const calculateRebalancing = (assets: Asset[]): PortfolioSummary => {
  // Phase 1: Input Validation
  if (assets.length === 0) return emptyState;

  const totalValue = assets.reduce(sum);
  if (totalValue <= 0) return invalidState;

  // Phase 2: Calculate Actions for Each Asset
  const actions = assets.map(asset => {
    const currentPercentage = (asset.currentValue / totalValue) × 100;
    const targetValue = (asset.targetAllocation / 100) × totalValue;
    const difference = targetValue - asset.currentValue;
    const percentageDifference = asset.targetAllocation - currentPercentage;

    // Phase 3: Determine Action Based on Tolerance
    let action;
    if (Math.abs(percentageDifference) <= TOLERANCE) {
      action = 'HOLD';        // Within tolerance
    } else if (difference > 0) {
      action = 'BUY';         // Under-allocated
    } else {
      action = 'SELL';        // Over-allocated
    }

    return {
      assetId: asset.id,
      action,
      amount: Math.abs(difference),
      percentage: percentageDifference,
      // ...
    };
  });

  // Phase 4: Determine Portfolio Balance Status
  const isBalanced = actions.every(a => a.action === 'HOLD');

  // Phase 5: Return Summary
  return {
    totalValue,
    actions,
    isBalanced,
    // ...
  };
};
```

---

## Storage Architecture

```
AsyncStorage
    ↓
JSON String
    ↓
Serialized Assets Array
    ├─ Asset 1 {id, name, currentValue, targetAllocation, createdAt}
    ├─ Asset 2 {id, name, currentValue, targetAllocation, createdAt}
    └─ Asset 3 {id, name, currentValue, targetAllocation, createdAt}
```

### Storage Operations

```typescript
// SAVE
const assets = [{...}, {...}];
const json = JSON.stringify(assets);
await AsyncStorage.setItem('key', json);

// LOAD
const json = await AsyncStorage.getItem('key');
const assets = JSON.parse(json);

// DELETE
await AsyncStorage.removeItem('key');

// CLEAR ALL
await AsyncStorage.clear();
```

---

## Design System Structure

```
COLORS
├─ Semantic (background, surface, text)
├─ Sentiment (buy, sell, hold, neutral)
├─ Status (success, error, warning, info)
└─ Functional (border, disabled)

SIZES
├─ Spacing (xs, sm, md, lg, xl, xxl, xxxl)
├─ Font (10px to 28px)
├─ Border Radius (0px to 9999px)
└─ Icons (16px, 24px, 32px)

TYPOGRAPHY
├─ Heading Large (28px, bold)
├─ Heading Medium (24px, bold)
├─ Body (14-16px, regular)
└─ Label (bold variants)

SHADOWS
├─ Small (2px offset)
├─ Medium (4px offset)
└─ Large (8px offset)
```

---

## Error Handling Pattern

```
Input Validation
    ↓
    ├─ Empty Check → Alert
    ├─ Format Check → Alert
    ├─ Range Check → Alert
    └─ Logic Check → Alert

Storage Errors
    ↓
    ├─ Save Failure → Log + Alert
    ├─ Load Failure → Default Value
    └─ Permission → Alert

Calculation Errors
    ↓
    ├─ Zero Portfolio → Empty State
    ├─ Invalid Allocation → Warning
    └─ Bad Data → Log + Skip
```

---

## Performance Optimization Strategies

### 1. Memoization
```typescript
const addAsset = useCallback((asset) => {
  // Only recreates when dependencies change
}, [assets, isPro]);
```

### 2. State Separation
```typescript
// ✓ Good: Separate concerns
const [assets, setAssets] = useState([]);
const [isLoading, setIsLoading] = useState(false);

// ✗ Avoid: All in one state object
const [state, setState] = useState({...});
```

### 3. Efficient Calculations
```typescript
// ✓ Good: Only calculate when needed
useEffect(() => {
  const summary = calculateRebalancing(assets);
  setSummary(summary);
}, [assets]); // Only when assets change

// ✗ Avoid: Recalculate on every render
const summary = calculateRebalancing(assets);
```

---

## Extensibility Points

### Adding New Features

**1. Add New Calculation**
```typescript
// 1. Add to rebalanceCalculator.ts
export const calculateMetric = (assets) => {...};

// 2. Call from usePortfolio
const metric = calculateMetric(assets);

// 3. Display in UI
<Text>{metric}</Text>
```

**2. Add New Storage Feature**
```typescript
// 1. Add function to storage.ts
export const savePreferences = async (prefs) => {...};

// 2. Use in usePortfolio
await savePreferences(userPrefs);

// 3. Load on mount
const prefs = await loadPreferences();
```

**3. Add New UI Screen**
```typescript
// Option A: Add to App.tsx (current)
// Option B: Migrate to Expo Router
//   ├─ app/index.tsx (home)
//   ├─ app/portfolio.tsx (detail)
//   └─ app/_layout.tsx (navigation)
```

---

## Testing Strategy

### Unit Tests (Functions)
```typescript
// Test rebalanceCalculator
test('calculateRebalancing returns correct actions', () => {
  const assets = [{...}];
  const result = calculateRebalancing(assets);
  expect(result.isBalanced).toBe(false);
  expect(result.actions[0].action).toBe('BUY');
});
```

### Integration Tests (Hooks)
```typescript
// Test usePortfolio hook
test('addAsset saves to storage', async () => {
  const { addAsset } = usePortfolio();
  await addAsset(newAsset);
  const saved = await loadAssets();
  expect(saved).toContainEqual(newAsset);
});
```

### Component Tests (UI)
```typescript
// Test AssetCard renders correctly
test('AssetCard displays asset name', () => {
  const { getByText } = render(
    <AssetCard asset={mockAsset} />
  );
  expect(getByText('Apple')).toBeTruthy();
});
```

---

## Deployment Architecture

```
Development
    ↓ npm start
Expo Development Server
    ├─ QR Code Scanning
    └─ Hot Module Reloading

Testing
    ↓ npm run ios/android
Local Emulator
    └─ Full Device Testing

Production
    ↓ eas build
Expo Build Service
    ├─ iOS (App Store)
    └─ Android (Google Play)

    ↓ OR

Self-Hosting
    ├─ Firebase Hosting
    └─ Custom Server
```

---

## Security Considerations

✅ **Implemented**
- Local-only storage
- No sensitive data in code
- Type-safe data structures
- Input validation

⚠️ **To Add (Later)**
- Biometric auth (if adding login)
- Encryption at rest
- Secure key storage
- HTTPS for future APIs

---

## Scalability Path

```
Current MVP (1 user, 1 device)
    ↓ Add features
Phase 2 (Multi-portfolio, analytics)
    ↓ Add backend
Phase 3 (Cloud sync, team sharing)
    ↓ Add monetization
Phase 4 (Subscription, API)
    ↓ Scale infrastructure
Enterprise (White-label, B2B)
```

---

**Architecture is designed for clarity, maintainability, and future growth! 🏗️**
