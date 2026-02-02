# Tax Calculation Implementation - Manual Test Cases

## Test 1: Simple Tax Calculation (Korea 22%)

**Setup:**
- Asset: NVDA Stock
- Type: Liquid
- Current Value: $10,000
- Cost Basis: $6,000
- Purchase Date: 1 year ago (365 days)
- Target: 20% of $50,000 portfolio = $10,000 (balanced, no action needed)

**Change target to 10%:**
- Should trigger SELL action: $5,000

**Expected Tax Impact:**
- Capital Gains: $2,000 (proportional: $5k/$10k * $4k gain = $2,000)
- Tax Rate: 22% (Korea)
- Tax Amount: $440 (22% of $2,000)
- Trade Fee: $5 (0.1% of $5,000)
- Net Proceeds: $4,555 ($5,000 - $440 - $5)
- Holding Period: ~365 days

**Calculation Verification:**
```
Sell amount: $5,000
Cost basis (proportional): $5,000 / $10,000 * $6,000 = $3,000
Capital gains: $5,000 - $3,000 = $2,000
Tax (22%): $2,000 * 0.22 = $440
Trade fee (0.1%): $5,000 * 0.001 = $5
Net proceeds: $5,000 - $440 - $5 = $4,555 ✓
```

---

## Test 2: Loss Scenario

**Setup:**
- Asset: Bitcoin
- Type: Liquid
- Current Value: $5,000
- Cost Basis: $8,000
- Sell: $2,000

**Expected Tax Impact:**
- Capital Gains: -$1,200 (loss: $2,000 - $2,400 cost basis)
  - Proportional cost: ($2,000 / $5,000) * $8,000 = $3,200
  - Capital gain: $2,000 - $3,200 = -$1,200
- Tax: $0 (no tax on losses in simplified model)
- Trade Fee: $2 (0.1% of $2,000)
- Net Proceeds: $1,998

**Verification:**
```
Sell amount: $2,000
Proportional cost basis: ($2,000 / $5,000) * $8,000 = $3,200
Capital gains: $2,000 - $3,200 = -$1,200
Tax: max(0, -$1,200 * rate) = $0 ✓
Trade fee: $2,000 * 0.001 = $2 ✓
Net proceeds: $2,000 - $0 - $2 = $1,998 ✓
```

---

## Test 3: Illiquid Asset Exclusion

**Setup:**
- Portfolio with 3 liquid assets and 1 real estate (illiquid)
- Rebalancing should only suggest actions for liquid assets
- Illiquid asset should appear in totals but not be included in rebalancing calculations

**Expected Behavior:**
- Real estate shows in "Illiquid Value" section
- Real estate does NOT appear in "Rebalancing Actions"
- Rebalancing calculations only use liquid asset values
- Portfolio summary shows both liquid and illiquid breakdowns

---

## Test 4: Country Switch

**Setup:**
- Asset with $10,000 gain to realize
- Test with multiple countries

**Expected Tax Impact:**
- USA (20%): Tax = $2,000
- Korea (22%): Tax = $2,200
- France (30%): Tax = $3,000
- UI should update tax impact when country changed

**Verification:**
```
Capital gains: $10,000
USA tax (20%): $10,000 * 0.20 = $2,000 ✓
Korea tax (22%): $10,000 * 0.22 = $2,200 ✓
France tax (30%): $10,000 * 0.30 = $3,000 ✓
```

---

## Test 5: Custom Tax Rate Override

**Setup:**
- Country: USA (default 20%)
- Override: 35% (high earner bracket)
- Asset: $10,000 gain

**Expected Behavior:**
- Tax calculated as 35%, not 20%
- Tax amount: $3,500

**Verification:**
```
Capital gains: $10,000
Custom tax rate: 35%
Tax: $10,000 * 0.35 = $3,500 ✓
Custom rate takes precedence over country default ✓
```

---

## Test 6: No Cost Basis Scenario

**Setup:**
- Asset added without cost basis
- Try to trigger SELL action

**Expected Behavior:**
- TaxImpact returns zeros (can't calculate without basis)
- SELL action still appears but with no tax impact
- TaxImpactBadge doesn't render (null check)

---

## Test 7: Tax Settings Persistence

**Setup:**
1. Set country to Korea with 25% custom override
2. Close and reopen app
3. Verify settings are persisted

**Expected Behavior:**
- Tax settings loaded from AsyncStorage
- Country remains Korea
- Custom rate remains 25%
- UI reflects saved settings

---

## Test 8: Multi-Asset Portfolio (E2E)

**Scenario: Korean investor with US tech stocks**

**Portfolio:**
```
1. NVDA Stock (Liquid)
   - Current: $15,000
   - Cost Basis: $10,000 (gain $5,000)
   - Target: 20%

2. Tesla Stock (Liquid)
   - Current: $10,000
   - Cost Basis: $12,000 (loss $2,000)
   - Target: 20%

3. VTI ETF (Liquid)
   - Current: $25,000
   - Cost Basis: $20,000 (gain $5,000)
   - Target: 40%

4. Real Estate (Illiquid)
   - Current: $200,000
   - Target: 0% (excluded from rebalancing)

Total Liquid: $50,000
Total Portfolio: $250,000
```

**Country:** South Korea (22%)

**Expected Actions:**

NVDA currently 30% (target 20%) → Sell $5,000
```
Capital gains: ($5,000 / $15,000) * $5,000 = $1,666.67
Tax (22%): $366.67
Trade fee: $5
Net: $4,628.33
```

Tesla currently 20% (target 20%) → HOLD (no action)

VTI currently 50% (target 40%) → Sell $5,000
```
Capital gains: ($5,000 / $25,000) * $5,000 = $1,000
Tax (22%): $220
Trade fee: $5
Net: $4,775
```

**Portfolio Summary:**
- Total Liquid Value: $50,000
- Total Illiquid Value: $200,000
- Est. Tax Impact: -$587 (approx)
- Total Trade Fees: -$10
- Status: Rebalance needed (2 actions)

**Verification Checklist:**
- [ ] Real estate appears in illiquid total
- [ ] Real estate does NOT appear in rebalancing actions
- [ ] NVDA shows SELL with tax badge
- [ ] Tesla shows HOLD (no badge)
- [ ] VTI shows SELL with tax badge
- [ ] Portfolio summary shows correct totals
- [ ] Tax country badge shows "🇰🇷 South Korea (22%)"
- [ ] Switching country recalculates taxes

---

## Implementation Checklist

### Phase 1: Data Models
- [x] Extended Asset interface with assetType, costBasis, purchaseDate
- [x] TaxImpact interface created
- [x] TaxSettings interface created
- [x] CountryTaxProfile interface created

### Phase 2: Tax Engine
- [x] calculateTaxImpact() function
- [x] calculateAfterTaxRebalancing() function
- [x] Tax profiles for 11 countries

### Phase 3: Storage
- [x] saveTaxSettings() / loadTaxSettings()
- [x] usePortfolio hook updated with tax settings
- [x] Tax settings auto-persist

### Phase 4: UI Components
- [x] CountrySelectModal
- [x] TaxImpactBadge
- [x] AssetTypeSelector
- [x] AssetForm updated with new fields
- [x] ActionCard updated with tax display
- [x] PortfolioSummary updated with tax metrics

### Phase 5: Integration
- [x] Country selector in header
- [x] Tax settings toggle in summary
- [x] Tax impact on SELL actions
- [x] Liquid/Illiquid breakdown display

---

## Known Limitations (By Design)

1. **No wash sale rules** - Not implemented for Week 1 MVP
2. **No short-term vs long-term distinction** - Uses flat rate
3. **No loss harvesting optimization** - Simplified model
4. **No tax bracket adjustments** - Custom override available
5. **Tax calculations are estimates** - Disclaimer needed in UI
6. **Single portfolio only** - Week 2+ feature

---

## Success Criteria

- [x] User can add liquid/illiquid assets
- [x] User can enter cost basis + purchase date
- [x] User can select from 11 countries
- [x] User can override default tax rate
- [x] SELL actions display tax impact breakdown
- [x] Portfolio summary shows total tax impact
- [x] Liquid/illiquid breakdown works correctly
- [x] Tax settings persist across sessions
- [ ] Manual test scenario passes (see Test 8)
- [ ] UI clearly communicates pre-tax vs post-tax values
