# Rebalancing Calculation Reference

## Core Formulas

### 1. Portfolio Total Value
```
TotalPortfolioValue = Σ(Asset.currentValue) for all assets
```

**Example:**
```
Asset 1: $10,000
Asset 2: $5,000
Asset 3: $5,000
─────────────────
Total: $20,000
```

---

### 2. Current Allocation Percentage
```
CurrentAllocation% = (AssetValue / TotalPortfolioValue) × 100
```

**Example:**
```
Apple: $5,000 / $20,000 × 100 = 25%
Bitcoin: $10,000 / $20,000 × 100 = 50%
Bond ETF: $5,000 / $20,000 × 100 = 25%
```

---

### 3. Target Value (Dollar Amount)
```
TargetValue$ = (TargetAllocation% / 100) × TotalPortfolioValue
```

**Example:**
```
Apple (Target 30%): (30 / 100) × $20,000 = $6,000
Bitcoin (Target 50%): (50 / 100) × $20,000 = $10,000
Bond ETF (Target 20%): (20 / 100) × $20,000 = $4,000
```

---

### 4. Rebalancing Amount
```
Amount$ = TargetValue$ - CurrentValue$
```

**Example:**
```
Apple: $6,000 - $5,000 = +$1,000 (BUY)
Bitcoin: $10,000 - $10,000 = $0 (HOLD)
Bond ETF: $4,000 - $5,000 = -$1,000 (SELL)
```

---

### 5. Allocation Difference Percentage
```
AllocationDifference% = TargetAllocation% - CurrentAllocation%
```

**Example:**
```
Apple: 30% - 25% = +5%
Bitcoin: 50% - 50% = 0%
Bond ETF: 20% - 25% = -5%
```

---

### 6. Action Decision (with 0.5% Tolerance)
```
if |AllocationDifference%| ≤ 0.5%:
    Action = HOLD
else if AllocationDifference% > 0:
    Action = BUY (need to increase allocation)
else:
    Action = SELL (need to decrease allocation)
```

**Why 0.5% Tolerance?**
- Prevents unnecessary micro-rebalancing
- Accounts for rounding differences
- Reduces transaction costs
- Improves user experience

---

## Complete Example Walkthrough

### Input Data
```
Portfolio:
┌─────────┬──────────┬─────────────┐
│ Asset   │ Current  │ Target %    │
├─────────┼──────────┼─────────────┤
│ APPL    │ $5,000   │ 30%         │
│ BTC     │ $10,000  │ 50%         │
│ BOND    │ $5,000   │ 20%         │
└─────────┴──────────┴─────────────┘
```

### Step-by-Step Calculation

**Step 1: Calculate Total Value**
```
Total = $5,000 + $10,000 + $5,000 = $20,000
```

**Step 2: Calculate Current Allocations**
```
APPL Current%:  $5,000 / $20,000 × 100 = 25%
BTC Current%:   $10,000 / $20,000 × 100 = 50%
BOND Current%:  $5,000 / $20,000 × 100 = 25%
```

**Step 3: Calculate Target Values**
```
APPL Target$:   (30 / 100) × $20,000 = $6,000
BTC Target$:    (50 / 100) × $20,000 = $10,000
BOND Target$:   (20 / 100) × $20,000 = $4,000
```

**Step 4: Calculate Differences**
```
APPL Difference:  $6,000 - $5,000 = +$1,000
BTC Difference:   $10,000 - $10,000 = $0
BOND Difference:  $4,000 - $5,000 = -$1,000
```

**Step 5: Calculate Allocation Differences**
```
APPL: 30% - 25% = +5%
BTC:  50% - 50% = 0%
BOND: 20% - 25% = -5%
```

**Step 6: Determine Actions**
```
APPL: |+5%| > 0.5% → BUY $1,000
BTC:  |0%| ≤ 0.5% → HOLD
BOND: |-5%| > 0.5% → SELL $1,000
```

### Output (Rebalancing Summary)
```
┌──────────┬─────────┬──────────┬─────────┬─────────┐
│ Asset    │ Action  │ Amount   │ Target$ │ Target% │
├──────────┼─────────┼──────────┼─────────┼─────────┤
│ APPL     │ BUY     │ $1,000   │ $6,000  │ 30%     │
│ BTC      │ HOLD    │ $0       │ $10,000 │ 50%     │
│ BOND     │ SELL    │ $1,000   │ $4,000  │ 20%     │
└──────────┴─────────┴──────────┴─────────┴─────────┘

Portfolio Balance: ✓ Balanced after rebalancing
```

---

## Edge Cases & Validation

### Case 1: Total Allocation ≠ 100%
```
Input:
APPL: 40%
BTC:  45%
BOND: 10%
───────────
Total: 95% ❌ (not 100%)

Warning: "Total allocation is 95%. Adjust to 100% for optimal results."
```

### Case 2: Zero or Negative Asset Values
```
Input: Asset Value = $0 or negative

Action:
- Skip calculation for that asset
- Show warning to user
- Require valid positive value
```

### Case 3: Zero Portfolio Value
```
Input: All assets = $0

Action:
- Total Value = $0
- All allocations = undefined
- Show empty state: "Add your first asset to get started"
```

### Case 4: Very Small Differences (Tolerance Test)
```
Target: 30%
Current: 30.3%
Difference: +0.3% (less than 0.5%)

Action: HOLD ✓ (no rebalancing needed)
```

---

## Implementation in Code

### Location
`src/utils/rebalanceCalculator.ts`

### Key Functions
```typescript
calculateRebalancing(assets: Asset[]): PortfolioSummary
// Returns: all calculations + actions

isValidAllocation(assets: Asset[]): boolean
// Checks if total allocation ≈ 100%

getTotalAllocation(assets: Asset[]): number
// Returns sum of all target allocations
```

### Usage
```typescript
import { calculateRebalancing } from './utils/rebalanceCalculator';

const summary = calculateRebalancing(myAssets);
// summary.actions → Array of buy/sell/hold actions
// summary.totalValue → Portfolio value
// summary.isBalanced → True if no actions needed
```

---

## Real-World Example: Quarterly Rebalancing

### Scenario
3 months have passed, market prices changed:

**Before Rebalancing:**
```
APPL Stock:    $5,000 (was 25%, now 38%)  ⬆ Market went up
BTC:           $5,000 (was 50%, now 38%)  ⬇ Market went down
Bond ETF:      $3,200 (was 25%, now 24%)  ⬇ Market went down
─────────────────────────────────────────
Total:         $13,200
```

**After Calculation:**
```
New Allocation%:
APPL: $5,000 / $13,200 × 100 = 37.9% (target was 30%)
BTC:  $5,000 / $13,200 × 100 = 37.9% (target was 50%)
BOND: $3,200 / $13,200 × 100 = 24.2% (target was 20%)

Target Values:
APPL: (30 / 100) × $13,200 = $3,960
BTC:  (50 / 100) × $13,200 = $6,600
BOND: (20 / 100) × $13,200 = $2,640

Actions:
APPL: $3,960 - $5,000 = -$1,040 (SELL)
BTC:  $6,600 - $5,000 = +$1,600 (BUY)
BOND: $2,640 - $3,200 = -$560 (SELL)
```

**Rebalancing Summary:**
```
✓ SELL $1,040 of APPL (down from 38% to 30%)
→ BUY $1,600 of BTC (up from 38% to 50%)
✓ SELL $560 of Bond ETF (down from 24% to 20%)
```

After executing these trades, allocations match targets!

---

## Why These Calculations Matter

1. **Risk Management**: Maintaining target allocations keeps risk level consistent
2. **Prevents Drift**: Without rebalancing, winners become overweight
3. **Behavioral Finance**: Forces systematic selling (hard to do emotionally)
4. **Cost Awareness**: Tolerance prevents excessive trading
5. **Transparency**: Users understand exactly what to do

---

## Recommended Reading

- "The Intelligent Investor" by Benjamin Graham (asset allocation)
- "Bogleheads' Guide to Investing" (rebalancing strategy)
- "A Random Walk Down Wall Street" by Burton Malkiel (portfolio theory)

---

**Math is the foundation of smart investing! 📊**
