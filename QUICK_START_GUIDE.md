# Quick Start Guide - After-Tax Rebalancing Feature

## Overview

The Smart Rebalancer has been upgraded with sophisticated after-tax rebalancing capabilities. This guide shows how to use the new tax features.

---

## New Features at a Glance

1. **Asset Classification** - Mark assets as Liquid or Illiquid
2. **Tax Tracking** - Enter cost basis and purchase date
3. **11-Country Support** - Automatic tax rates for major economies
4. **Custom Overrides** - Override default tax rates
5. **Tax Impact Visualization** - See exact tax consequences of rebalancing
6. **Portfolio Breakdown** - View liquid vs illiquid split

---

## Step-by-Step Usage

### 1. Adding Your First Asset with Tax Tracking

**Before:**
```
Name: Apple Stock
Current Value: $10,000
Target Allocation: 20%
```

**Now with tax tracking:**
```
Name: Apple Stock
Asset Type: 💧 Liquid (or 🏠 Illiquid)
Current Value: $10,000
Cost Basis: $6,000 (what you paid)
Purchase Date: 2024-01-15 (when you bought)
Ticker: AAPL (optional)
Target Allocation: 20%
```

**Why cost basis matters:**
- Determines your capital gains/losses when selling
- Calculates exact tax impact
- Tracks holding period (1+ year vs short-term)

### 2. Selecting Your Tax Country

**Header:** Look for the country button in top right
```
🇺🇸 United States  → Tap to change
```

**First time?**
1. App defaults to USA (20% capital gains tax)
2. Tap the country button
3. Choose from 11 countries
4. Or set custom rate (% override)

**Available countries:**
| Flag | Country | Default Tax Rate |
|------|---------|------------------|
| 🇺🇸 | USA | 20% |
| 🇨🇳 | China | 20% |
| 🇩🇪 | Germany | 26.375% |
| 🇯🇵 | Japan | 20.315% |
| 🇮🇳 | India | 15% |
| 🇬🇧 | UK | 20% |
| 🇫🇷 | France | 30% |
| 🇮🇹 | Italy | 26% |
| 🇧🇷 | Brazil | 15% |
| 🇨🇦 | Canada | 25% |
| 🇰🇷 | South Korea | 22% |

### 3. Viewing Your Portfolio

**Portfolio Summary now shows:**
```
Total Value: $50,000
Target Allocation: 100%
Status: ⚠ Rebalance needed
Actions: 2

💧 Liquid Assets: $48,000
🏠 Illiquid Assets: $2,000

Est. Tax Impact: -$287
Include in calculations: [Toggle]
```

**What this means:**
- Liquid assets = Can be quickly sold (stocks, ETFs)
- Illiquid assets = Take time to sell (real estate)
- Tax impact = Estimated tax from recommended rebalancing
- Only liquid assets are included in rebalancing

### 4. Understanding Rebalancing Actions

**SELL Action Example:**

```
🔴 SELL Apple Stock
   Amount: -$5,000
   Target: $10,000 (current 30%, target 20%)

   🧾 Tax (22%)
      Capital Gains: $2,000
      Tax Amount: -$440
      Trade Fee: -$5
      → Net Proceeds: $4,555
      Holding Period: 365 days
```

**What this tells you:**
- You'll receive $4,555 after selling $5,000
- Tax eats up $440 of the proceeds
- You've held it 365+ days (long-term for many countries)
- This is the after-tax net you can reinvest

**BUY Action Example:**

```
🟢 BUY Bitcoin
   Amount: +$3,000
   Target: $15,000 (current 10%, target 30%)

   (No tax badge - buying doesn't trigger taxes)
```

### 5. Loss Scenarios

**If an asset is underwater:**

```
🔴 SELL Crypto
   Current: $5,000
   Cost Basis: $8,000 (Loss: -$3,000)

   🧾 Tax (22%)
      Capital Loss: -$3,000
      Tax Amount: $0 (no tax on losses)
      Trade Fee: -$5
      → Net Proceeds: $4,995
```

**Key insight:**
- No tax on capital losses (simplified model)
- You still pay the trading fee
- Good news for loss-making positions!

### 6. Asset Classification - Why It Matters

**Liquid Assets (Can rebalance):**
- Stocks (AAPL, MSFT, etc.)
- ETFs (VTI, SPY, etc.)
- Crypto (Bitcoin, Ethereum)
- Bonds (readily sold)

**Illiquid Assets (Won't rebalance):**
- Real estate
- Private equity
- Art/collectibles
- Startup equity

**Example:**

```
Your portfolio: $250,000
├─ Stocks (Liquid): $50,000 ✓ Can rebalance
├─ Real Estate (Illiquid): $200,000 ✗ No rebalancing
└─ Bonds (Liquid): $30,000 ✓ Can rebalance

Rebalancing only affects the $80,000 in liquid assets
Real estate stays as-is, included in total value only
```

### 7. Customizing Your Tax Rate

**Scenario:** You're a high earner in the USA
- Default USA rate: 20%
- Your actual rate: 37%

**Solution:**
1. Tap country button
2. Select "⚙️ Set Custom Tax Rate"
3. Enter "37"
4. Tap "Apply"

**Your custom rate:**
- Applies to all calculations
- Takes precedence over country default
- Persists even if you switch countries
- Override anytime via country modal

### 8. Toggle Tax Calculations On/Off

**In Portfolio Summary:**
```
Est. Tax Impact: -$287
Include in calculations: [Toggle]
                         ON ← Tap to toggle
```

**Why toggle off?**
- See pre-tax rebalancing amounts
- Compare tax vs no-tax scenarios
- Estimate impact before decision

**Both views:**
```
WITH tax (toggles OFF):
  Sell $5,000
  Proceeds: $5,000 (no tax deduction)

WITH tax (toggles ON):
  Sell $5,000
  Tax: -$440
  Proceeds: $4,555 (after-tax)
```

---

## Real-World Example

### Korean Tech Investor Portfolio

**Current Holdings:**
```
1. Tesla Stock (Liquid)
   Value: $30,000
   Bought at: $20,000 → Gain: $10,000
   Target: 30%

2. Samsung Stock (Liquid)
   Value: $20,000
   Bought at: $22,000 → Loss: $2,000
   Target: 20%

3. Seoul Real Estate (Illiquid)
   Value: $50,000
   (Excluded from rebalancing)

Total: $100,000
Total Liquid: $50,000
```

**Country Setting:** 🇰🇷 South Korea (22% capital gains tax)

**Rebalancing Recommendation:**

```
PORTFOLIO SUMMARY
Total Value: $100,000
Liquid Value: $50,000
Illiquid Value: $50,000
Status: ⚠ Rebalance

💰 REBALANCING ACTIONS

🟢 BUY Samsung
   +$5,000 (target 40% of liquid)
   No tax (purchase)

🔴 SELL Tesla
   -$5,000 (target 30%)
   🧾 Tax Breakdown:
   - Capital Gains: $1,667
   - Tax (22%): -$367
   - Trade Fee: -$5
   - Net Proceeds: $4,628

🏠 Seoul Real Estate
   $50,000 (no action - illiquid)

Est. Total Tax Impact: -$367
```

**After Rebalancing:**
- Tesla: $25,000 (30%)
- Samsung: $25,000 (50% → 40%)
- Real Estate: $50,000 (same)
- Cash received from Tesla sale: $4,628 (after tax)
- Use $4,628 to partially buy Samsung

---

## Troubleshooting

### Q: I added an asset but don't see tax impact

**A:** Check these things:
1. Is it marked as Liquid? (Illiquid assets don't rebalance)
2. Did you enter a Cost Basis? (Required for tax calculation)
3. Is there a rebalancing action? (No action = no tax)
4. Is "Include in calculations" toggled ON?

### Q: Tax seems wrong, why?

**A:** Common reasons:
1. Cost basis = purchase price (not current)
   - WRONG: Cost basis = $10,000, Current = $10,000
   - RIGHT: Cost basis = $6,000, Current = $10,000

2. Purchase date format (YYYY-MM-DD)
   - WRONG: 01/15/2024 or 2024-01-15T12:00:00
   - RIGHT: 2024-01-15

3. Tax rate may differ from your actual rate
   - Solution: Use custom override in country modal

### Q: Why aren't illiquid assets included in rebalancing?

**A:** By design. Illiquid assets:
- Take months/years to sell
- Can't be traded quickly
- Would be impractical to rebalance

We include them in your total portfolio value, but rebalancing suggestions only target liquid assets.

### Q: My settings disappeared after restart

**A:** Settings auto-save. If lost:
1. Clear AsyncStorage cache
2. Restart app
3. Re-enter preferences

Settings are stored locally on your device, not in cloud.

### Q: Can I have different tax rates for different assets?

**A:** Yes! Three options:

1. **Global rate** (country setting)
   - Applies to all assets
   - Change in country modal

2. **Custom global rate** (custom override)
   - One custom rate for all
   - Also in country modal

3. **Per-asset custom rate** (future feature)
   - Set different rate per asset
   - Coming in Week 2+

For now, if you have mixed situation (some assets in different country), you can switch country before selling each one.

---

## Important Disclaimers

⚠️ **Please Read**

1. **Estimates Only**
   - Tax calculations are estimates for educational purposes
   - Actual taxes depend on many factors (filing status, income, etc.)
   - DO NOT use for actual tax filing

2. **Not Tax Advice**
   - This is NOT professional tax advice
   - Consult a tax professional (CPA, tax attorney) before acting
   - Tax laws vary by jurisdiction and change frequently

3. **Accuracy**
   - Rates are approximate and may have changed
   - Some countries have complex rules we simplified
   - Special situations (wash sales, etc.) not modeled

4. **Your Responsibility**
   - You are responsible for accurate tax reporting
   - Verify all calculations independently
   - Keep records of purchases and sales

---

## Tips & Tricks

### Tip 1: Use Cost Basis for Better Insights
- With cost basis → See exact tax impact
- Without cost basis → Can't calculate impact
- **Do this:** Keep receipts of all purchases

### Tip 2: Check Holding Period
- Purchase date → Holding period calculated
- Helps understand long-term vs short-term implications
- **Pro tip:** Hold 1+ year in most countries for better rates

### Tip 3: Explore Different Countries
- Try switching between countries
- See how tax impact changes
- Helpful if you're moving or planning expat moves

### Tip 4: Use Custom Override Strategically
- 10% gains tax in your area? Override to 10%
- 50% bracket as high earner? Override to 50%
- **Note:** This affects ALL assets at once

### Tip 5: Compare Pre/Post Tax
- Toggle tax calculations off/on
- See pre-tax rebalancing amounts
- Make decisions knowing both numbers

### Tip 6: Document Your Assumptions
- Note your tax rate and country in portfolio
- Explain why you chose that rate
- Helps when you review later

---

## Keyboard Shortcuts (Coming Soon)

In Week 2, we'll add:
- Swipe left to delete asset
- Swipe right to edit asset
- Long-press for quick copy
- Keyboard shortcuts for navigation

---

## Getting Help

**In-app Help:**
- Tap the "?" icon (coming soon)
- Hover over any field for tooltip

**Documentation:**
- See TEST_VERIFICATION.md for examples
- See IMPLEMENTATION_SUMMARY.md for technical details
- See src/components/ for component examples

**Contact Support:**
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Email: (coming soon)

---

## Next Steps

Once you're comfortable with basic usage:

### Week 2 (Coming Soon):
- [ ] Try multi-portfolio support
- [ ] Export portfolio as PDF
- [ ] Share with financial advisor
- [ ] Sync with Supabase backend
- [ ] Real-time price updates
- [ ] Advanced tax strategies

### Week 3+:
- [ ] AI copilot recommendations
- [ ] Automated rebalancing
- [ ] Tax-loss harvesting
- [ ] Risk analysis
- [ ] Performance tracking

---

## FAQ

**Q: Can I use this internationally?**
A: Yes! 11 countries supported. More coming in Week 2.

**Q: Does this work with crypto?**
A: Yes! Mark crypto as Liquid, add cost basis, rebalance. Tax impact calculated.

**Q: Can I export my data?**
A: Not yet. Coming in Week 2 with CSV/PDF export.

**Q: Is my data secure?**
A: Currently stored locally on your device (AsyncStorage). Cloud sync coming Week 2.

**Q: Can I undo a mistake?**
A: These are recommendations only - nothing is executed. You control all trades.

**Q: What if I forget my cost basis?**
A: You can always edit it later. Without it, no tax shown (return to add cost basis).

---

## Success Checklist

By the end of using this feature, you should be able to:

- [ ] Add both liquid and illiquid assets
- [ ] Understand the difference between them
- [ ] Enter cost basis and purchase date
- [ ] Switch between different countries
- [ ] Override your country's default tax rate
- [ ] Read and understand tax impact badges
- [ ] See the liquid/illiquid breakdown
- [ ] Toggle tax calculations on/off
- [ ] Explain the tax impact to someone else
- [ ] Make informed rebalancing decisions considering taxes

If you can do all of these, you're ready to optimize your portfolio!

---

**Last Updated:** January 27, 2026
**Version:** 1.0 (Week 1 MVP)
**Next Update:** February 3, 2026 (Week 2)
