/**
 * whatIfScenarios.ts - Extreme scenario definitions
 *
 * All user-facing strings are i18n-aware via t() function.
 * Scenario browsing is free; portfolio simulation costs 2 credits.
 * Philosophy: "Sell peace of mind, not fear" (Buffett)
 */

import type { WhatIfScenario } from '../types/marketplace';

// ============================================================================
// Type definitions
// ============================================================================

export interface SectorImpact {
  name: string;
  change: string;
}

export interface HistoricalParallel {
  event: string;
  year: string;
  initialDrop: string;
  recoveryTime: string;
  lesson: string;
}

export interface MarketImpactMetrics {
  kospi: string;
  usdkrw: string;
  /** Global index fields (optional, used by global/en scenarios) */
  sp500?: string;
  nasdaq?: string;
  btc?: string;
  gold?: string;
  dxy?: string;
}

export interface ExtremeScenario {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  category: 'geopolitical' | 'natural_disaster' | 'economic' | 'tech' | 'corporate' | 'policy';
  categoryLabel: string;
  shareTitle: string;
  impactChain: string[];
  /** ko scenarios use kospi/usdkrw; global/en scenarios add sp500/nasdaq etc. */
  marketImpact: MarketImpactMetrics & {
    upSectors: SectorImpact[];
    downSectors: SectorImpact[];
  };
  historicalParallel: HistoricalParallel;
  actionGuide: string[];
  /** 'ko' = Korea-only, 'en' = English-only, 'global' = everyone. undefined = everyone */
  locale?: 'ko' | 'en' | 'global';
  /** Input for generateWhatIf */
  whatIfInput: {
    scenario: WhatIfScenario;
    description: string;
    magnitude: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFunc = (key: string, options?: any) => string;

// ============================================================================
// Scenario data (i18n-aware)
// ============================================================================

export function getExtremeScenarios(t: TFunc): ExtremeScenario[] {
  const s = (key: string) => t(`whatIf.scenarios.${key}`);

  return [
    // 1. Baekdu Eruption (Korea-only)
    {
      id: 'baekdu_eruption',
      locale: 'ko',
      emoji: '\u{1F30B}',
      title: s('baekdu.title'),
      subtitle: s('baekdu.subtitle'),
      category: 'natural_disaster',
      categoryLabel: s('category.naturalDisaster'),
      shareTitle: s('baekdu.shareTitle'),
      impactChain: [
        s('baekdu.chain1'),
        s('baekdu.chain2'),
        s('baekdu.chain3'),
        s('baekdu.chain4'),
        s('baekdu.chain5'),
        s('baekdu.chain6'),
      ],
      marketImpact: {
        kospi: '-15~25%',
        usdkrw: '+150~200\u{20A9}',
        upSectors: [
          { name: s('baekdu.upSector1'), change: '+15~30%' },
          { name: s('baekdu.upSector2'), change: '+10~20%' },
          { name: s('baekdu.upSector3'), change: '+10~15%' },
        ],
        downSectors: [
          { name: s('baekdu.downSector1'), change: '-30~50%' },
          { name: s('baekdu.downSector2'), change: '-20~35%' },
          { name: s('baekdu.downSector3'), change: '-15~25%' },
        ],
      },
      historicalParallel: {
        event: s('baekdu.histEvent'),
        year: '2011',
        initialDrop: s('baekdu.histDrop'),
        recoveryTime: s('baekdu.histRecovery'),
        lesson: s('baekdu.histLesson'),
      },
      actionGuide: [
        s('baekdu.action1'),
        s('baekdu.action2'),
        s('baekdu.action3'),
        s('baekdu.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('baekdu.aiPrompt'),
        magnitude: -20,
      },
    },

    // 2. NK Invasion (Korea-only)
    {
      id: 'nk_invasion',
      locale: 'ko',
      emoji: '\u{2694}\u{FE0F}',
      title: s('nkInvasion.title'),
      subtitle: s('nkInvasion.subtitle'),
      category: 'geopolitical',
      categoryLabel: s('category.geopolitical'),
      shareTitle: s('nkInvasion.shareTitle'),
      impactChain: [
        s('nkInvasion.chain1'),
        s('nkInvasion.chain2'),
        s('nkInvasion.chain3'),
        s('nkInvasion.chain4'),
        s('nkInvasion.chain5'),
        s('nkInvasion.chain6'),
      ],
      marketImpact: {
        kospi: '-30~50%',
        usdkrw: '+400~600\u{20A9}',
        upSectors: [
          { name: s('nkInvasion.upSector1'), change: '+30~50%' },
          { name: s('nkInvasion.upSector2'), change: '+20~40%' },
          { name: s('nkInvasion.upSector3'), change: '+30~45%' },
        ],
        downSectors: [
          { name: s('nkInvasion.downSector1'), change: '-30~50%' },
          { name: s('nkInvasion.downSector2'), change: '-40~60%' },
          { name: s('nkInvasion.downSector3'), change: '-30~50%' },
        ],
      },
      historicalParallel: {
        event: s('nkInvasion.histEvent'),
        year: '2010/2017',
        initialDrop: s('nkInvasion.histDrop'),
        recoveryTime: s('nkInvasion.histRecovery'),
        lesson: s('nkInvasion.histLesson'),
      },
      actionGuide: [
        s('nkInvasion.action1'),
        s('nkInvasion.action2'),
        s('nkInvasion.action3'),
        s('nkInvasion.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('nkInvasion.aiPrompt'),
        magnitude: -40,
      },
    },

    // 3. Taiwan Blockade (global)
    {
      id: 'taiwan_blockade',
      locale: 'global',
      emoji: '\u{1F6A2}',
      title: s('taiwan.title'),
      subtitle: s('taiwan.subtitle'),
      category: 'geopolitical',
      categoryLabel: s('category.geopolitical'),
      shareTitle: s('taiwan.shareTitle'),
      impactChain: [
        s('taiwan.chain1'),
        s('taiwan.chain2'),
        s('taiwan.chain3'),
        s('taiwan.chain4'),
        s('taiwan.chain5'),
        s('taiwan.chain6'),
      ],
      marketImpact: {
        kospi: '-15~25%',
        usdkrw: '+200~300\u{20A9}',
        upSectors: [
          { name: s('taiwan.upSector1'), change: '+10~20%' },
          { name: s('taiwan.upSector2'), change: '+15~30%' },
          { name: s('taiwan.upSector3'), change: '+20~35%' },
        ],
        downSectors: [
          { name: s('taiwan.downSector1'), change: '-20~30%' },
          { name: s('taiwan.downSector2'), change: '-20~35%' },
          { name: s('taiwan.downSector3'), change: '-15~25%' },
        ],
      },
      historicalParallel: {
        event: s('taiwan.histEvent'),
        year: '1979',
        initialDrop: 'S&P 500 -17%',
        recoveryTime: s('taiwan.histRecovery'),
        lesson: s('taiwan.histLesson'),
      },
      actionGuide: [
        s('taiwan.action1'),
        s('taiwan.action2'),
        s('taiwan.action3'),
        s('taiwan.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('taiwan.aiPrompt'),
        magnitude: -20,
      },
    },

    // 4. AI Bubble Burst (global)
    {
      id: 'ai_bubble_burst',
      locale: 'global',
      emoji: '\u{1F916}',
      title: s('aiBubble.title'),
      subtitle: s('aiBubble.subtitle'),
      category: 'tech',
      categoryLabel: s('category.tech'),
      shareTitle: s('aiBubble.shareTitle'),
      impactChain: [
        s('aiBubble.chain1'),
        s('aiBubble.chain2'),
        s('aiBubble.chain3'),
        s('aiBubble.chain4'),
        s('aiBubble.chain5'),
        s('aiBubble.chain6'),
      ],
      marketImpact: {
        kospi: '-10~20%',
        usdkrw: '+100~150\u{20A9}',
        upSectors: [
          { name: s('aiBubble.upSector1'), change: '+10~20%' },
          { name: s('aiBubble.upSector2'), change: '+5~15%' },
          { name: s('aiBubble.upSector3'), change: '+10~15%' },
        ],
        downSectors: [
          { name: s('aiBubble.downSector1'), change: '-30~50%' },
          { name: s('aiBubble.downSector2'), change: '-40~60%' },
          { name: s('aiBubble.downSector3'), change: '-25~40%' },
        ],
      },
      historicalParallel: {
        event: s('aiBubble.histEvent'),
        year: '2000',
        initialDrop: s('aiBubble.histDrop'),
        recoveryTime: s('aiBubble.histRecovery'),
        lesson: s('aiBubble.histLesson'),
      },
      actionGuide: [
        s('aiBubble.action1'),
        s('aiBubble.action2'),
        s('aiBubble.action3'),
        s('aiBubble.action4'),
      ],
      whatIfInput: {
        scenario: 'market_crash',
        description: s('aiBubble.aiPrompt'),
        magnitude: -35,
      },
    },

    // 5. AGI Arrival (global)
    {
      id: 'agi_mass_unemployment',
      locale: 'global',
      emoji: '\u{1F9E0}',
      title: s('agi.title'),
      subtitle: s('agi.subtitle'),
      category: 'tech',
      categoryLabel: s('category.tech'),
      shareTitle: s('agi.shareTitle'),
      impactChain: [
        s('agi.chain1'),
        s('agi.chain2'),
        s('agi.chain3'),
        s('agi.chain4'),
        s('agi.chain5'),
        s('agi.chain6'),
      ],
      marketImpact: {
        kospi: '-10~20%',
        usdkrw: '+100~200\u{20A9}',
        upSectors: [
          { name: s('agi.upSector1'), change: '+50~100%' },
          { name: s('agi.upSector2'), change: '+30~50%' },
          { name: s('agi.upSector3'), change: '+40~80%' },
        ],
        downSectors: [
          { name: s('agi.downSector1'), change: '-30~50%' },
          { name: s('agi.downSector2'), change: '-50~70%' },
          { name: s('agi.downSector3'), change: '-20~40%' },
        ],
      },
      historicalParallel: {
        event: s('agi.histEvent'),
        year: '1760-1840',
        initialDrop: s('agi.histDrop'),
        recoveryTime: s('agi.histRecovery'),
        lesson: s('agi.histLesson'),
      },
      actionGuide: [
        s('agi.action1'),
        s('agi.action2'),
        s('agi.action3'),
        s('agi.action4'),
        s('agi.action5'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('agi.aiPrompt'),
        magnitude: -15,
      },
    },

    // 6. Seoul Earthquake (Korea-only)
    {
      id: 'seoul_earthquake',
      locale: 'ko',
      emoji: '\u{1F3DA}\u{FE0F}',
      title: s('seoulQuake.title'),
      subtitle: s('seoulQuake.subtitle'),
      category: 'natural_disaster',
      categoryLabel: s('category.naturalDisaster'),
      shareTitle: s('seoulQuake.shareTitle'),
      impactChain: [
        s('seoulQuake.chain1'),
        s('seoulQuake.chain2'),
        s('seoulQuake.chain3'),
        s('seoulQuake.chain4'),
        s('seoulQuake.chain5'),
        s('seoulQuake.chain6'),
      ],
      marketImpact: {
        kospi: '-20~30%',
        usdkrw: '+200~300\u{20A9}',
        upSectors: [
          { name: s('seoulQuake.upSector1'), change: '+30~50%' },
          { name: s('seoulQuake.upSector2'), change: '+20~35%' },
          { name: s('seoulQuake.upSector3'), change: '+25~40%' },
        ],
        downSectors: [
          { name: s('seoulQuake.downSector1'), change: '-30~50%' },
          { name: s('seoulQuake.downSector2'), change: '-25~40%' },
          { name: s('seoulQuake.downSector3'), change: '-20~35%' },
        ],
      },
      historicalParallel: {
        event: s('seoulQuake.histEvent'),
        year: '2011',
        initialDrop: s('seoulQuake.histDrop'),
        recoveryTime: s('seoulQuake.histRecovery'),
        lesson: s('seoulQuake.histLesson'),
      },
      actionGuide: [
        s('seoulQuake.action1'),
        s('seoulQuake.action2'),
        s('seoulQuake.action3'),
        s('seoulQuake.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('seoulQuake.aiPrompt'),
        magnitude: -25,
      },
    },

    // 7. Trump Tariff War 2.0 (global)
    {
      id: 'trump_tariff_war',
      locale: 'global',
      emoji: '\u{1F1FA}\u{1F1F8}',
      title: s('tariffWar.title'),
      subtitle: s('tariffWar.subtitle'),
      category: 'policy',
      categoryLabel: s('category.tradePolicy'),
      shareTitle: s('tariffWar.shareTitle'),
      impactChain: [
        s('tariffWar.chain1'),
        s('tariffWar.chain2'),
        s('tariffWar.chain3'),
        s('tariffWar.chain4'),
        s('tariffWar.chain5'),
        s('tariffWar.chain6'),
      ],
      marketImpact: {
        kospi: '-8~15%',
        usdkrw: '+100~180\u{20A9}',
        upSectors: [
          { name: s('tariffWar.upSector1'), change: '+15~25%' },
          { name: s('tariffWar.upSector2'), change: '+10~20%' },
          { name: s('tariffWar.upSector3'), change: '+10~15%' },
        ],
        downSectors: [
          { name: s('tariffWar.downSector1'), change: '-20~35%' },
          { name: s('tariffWar.downSector2'), change: '-10~20%' },
          { name: s('tariffWar.downSector3'), change: '-15~25%' },
        ],
      },
      historicalParallel: {
        event: s('tariffWar.histEvent'),
        year: '2018',
        initialDrop: 'KOSPI -17%, S&P -20%',
        recoveryTime: s('tariffWar.histRecovery'),
        lesson: s('tariffWar.histLesson'),
      },
      actionGuide: [
        s('tariffWar.action1'),
        s('tariffWar.action2'),
        s('tariffWar.action3'),
        s('tariffWar.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('tariffWar.aiPrompt'),
        magnitude: -15,
      },
    },

    // 8. BOJ Rate Shock (global)
    {
      id: 'boj_rate_shock',
      locale: 'global',
      emoji: '\u{1F1EF}\u{1F1F5}',
      title: s('bojShock.title'),
      subtitle: s('bojShock.subtitle'),
      category: 'policy',
      categoryLabel: s('category.monetaryPolicy'),
      shareTitle: s('bojShock.shareTitle'),
      impactChain: [
        s('bojShock.chain1'),
        s('bojShock.chain2'),
        s('bojShock.chain3'),
        s('bojShock.chain4'),
        s('bojShock.chain5'),
        s('bojShock.chain6'),
      ],
      marketImpact: {
        kospi: '-10~18%',
        usdkrw: '-50~+80\u{20A9}',
        upSectors: [
          { name: s('bojShock.upSector1'), change: '+20~35%' },
          { name: s('bojShock.upSector2'), change: '+10~15%' },
          { name: s('bojShock.upSector3'), change: '+5~12%' },
        ],
        downSectors: [
          { name: s('bojShock.downSector1'), change: '-12~25%' },
          { name: s('bojShock.downSector2'), change: '-15~25%' },
          { name: s('bojShock.downSector3'), change: '-20~40%' },
        ],
      },
      historicalParallel: {
        event: s('bojShock.histEvent'),
        year: '2024',
        initialDrop: s('bojShock.histDrop'),
        recoveryTime: s('bojShock.histRecovery'),
        lesson: s('bojShock.histLesson'),
      },
      actionGuide: [
        s('bojShock.action1'),
        s('bojShock.action2'),
        s('bojShock.action3'),
        s('bojShock.action4'),
      ],
      whatIfInput: {
        scenario: 'interest_rate_change',
        description: s('bojShock.aiPrompt'),
        magnitude: -18,
      },
    },

    // 9. Fed Emergency Hike (global)
    {
      id: 'fed_emergency_hike',
      locale: 'global',
      emoji: '\u{1F3E6}',
      title: s('fedHike.title'),
      subtitle: s('fedHike.subtitle'),
      category: 'economic',
      categoryLabel: s('category.interestRate'),
      shareTitle: s('fedHike.shareTitle'),
      impactChain: [
        s('fedHike.chain1'),
        s('fedHike.chain2'),
        s('fedHike.chain3'),
        s('fedHike.chain4'),
        s('fedHike.chain5'),
        s('fedHike.chain6'),
      ],
      marketImpact: {
        kospi: '-15~25%',
        usdkrw: '+200~300\u{20A9}',
        upSectors: [
          { name: s('fedHike.upSector1'), change: '+15~25%' },
          { name: s('fedHike.upSector2'), change: '+3~5%' },
          { name: s('fedHike.upSector3'), change: '+8~15%' },
        ],
        downSectors: [
          { name: s('fedHike.downSector1'), change: '-20~35%' },
          { name: s('fedHike.downSector2'), change: '-25~40%' },
          { name: s('fedHike.downSector3'), change: '-30~50%' },
        ],
      },
      historicalParallel: {
        event: s('fedHike.histEvent'),
        year: '1980',
        initialDrop: s('fedHike.histDrop'),
        recoveryTime: s('fedHike.histRecovery'),
        lesson: s('fedHike.histLesson'),
      },
      actionGuide: [
        s('fedHike.action1'),
        s('fedHike.action2'),
        s('fedHike.action3'),
        s('fedHike.action4'),
      ],
      whatIfInput: {
        scenario: 'interest_rate_change',
        description: s('fedHike.aiPrompt'),
        magnitude: -22,
      },
    },

    // 10. Samsung Scandal (Korea-only)
    {
      id: 'samsung_scandal',
      locale: 'ko',
      emoji: '\u{1F4F1}',
      title: s('samsungScandal.title'),
      subtitle: s('samsungScandal.subtitle'),
      category: 'corporate',
      categoryLabel: s('category.corporateRisk'),
      shareTitle: s('samsungScandal.shareTitle'),
      impactChain: [
        s('samsungScandal.chain1'),
        s('samsungScandal.chain2'),
        s('samsungScandal.chain3'),
        s('samsungScandal.chain4'),
        s('samsungScandal.chain5'),
        s('samsungScandal.chain6'),
      ],
      marketImpact: {
        kospi: '-12~20%',
        usdkrw: '+150~200\u{20A9}',
        upSectors: [
          { name: s('samsungScandal.upSector1'), change: '+10~20%' },
          { name: s('samsungScandal.upSector2'), change: '+5~15%' },
          { name: s('samsungScandal.upSector3'), change: '+8~12%' },
        ],
        downSectors: [
          { name: s('samsungScandal.downSector1'), change: '-30~50%' },
          { name: s('samsungScandal.downSector2'), change: '-15~30%' },
          { name: s('samsungScandal.downSector3'), change: '-10~18%' },
        ],
      },
      historicalParallel: {
        event: s('samsungScandal.histEvent'),
        year: '2015',
        initialDrop: s('samsungScandal.histDrop'),
        recoveryTime: s('samsungScandal.histRecovery'),
        lesson: s('samsungScandal.histLesson'),
      },
      actionGuide: [
        s('samsungScandal.action1'),
        s('samsungScandal.action2'),
        s('samsungScandal.action3'),
        s('samsungScandal.action4'),
      ],
      whatIfInput: {
        scenario: 'stock_crash',
        description: s('samsungScandal.aiPrompt'),
        magnitude: -25,
      },
    },

    // 11. China Property Collapse (global)
    {
      id: 'china_property_collapse',
      locale: 'global',
      emoji: '\u{1F1E8}\u{1F1F3}',
      title: s('chinaCollapse.title'),
      subtitle: s('chinaCollapse.subtitle'),
      category: 'economic',
      categoryLabel: s('category.financialCrisis'),
      shareTitle: s('chinaCollapse.shareTitle'),
      impactChain: [
        s('chinaCollapse.chain1'),
        s('chinaCollapse.chain2'),
        s('chinaCollapse.chain3'),
        s('chinaCollapse.chain4'),
        s('chinaCollapse.chain5'),
        s('chinaCollapse.chain6'),
      ],
      marketImpact: {
        kospi: '-15~25%',
        usdkrw: '+200~300\u{20A9}',
        upSectors: [
          { name: s('chinaCollapse.upSector1'), change: '+15~25%' },
          { name: s('chinaCollapse.upSector2'), change: '+20~30%' },
          { name: s('chinaCollapse.upSector3'), change: '+5~10%' },
        ],
        downSectors: [
          { name: s('chinaCollapse.downSector1'), change: '-20~35%' },
          { name: s('chinaCollapse.downSector2'), change: '-25~40%' },
          { name: s('chinaCollapse.downSector3'), change: '-15~30%' },
        ],
      },
      historicalParallel: {
        event: s('chinaCollapse.histEvent'),
        year: '1990',
        initialDrop: s('chinaCollapse.histDrop'),
        recoveryTime: s('chinaCollapse.histRecovery'),
        lesson: s('chinaCollapse.histLesson'),
      },
      actionGuide: [
        s('chinaCollapse.action1'),
        s('chinaCollapse.action2'),
        s('chinaCollapse.action3'),
        s('chinaCollapse.action4'),
      ],
      whatIfInput: {
        scenario: 'market_crash',
        description: s('chinaCollapse.aiPrompt'),
        magnitude: -22,
      },
    },

    // 12. CEO Sudden Exit (global)
    {
      id: 'ceo_sudden_exit',
      locale: 'global',
      emoji: '\u{1F454}',
      title: s('ceoExit.title'),
      subtitle: s('ceoExit.subtitle'),
      category: 'corporate',
      categoryLabel: s('category.managementRisk'),
      shareTitle: s('ceoExit.shareTitle'),
      impactChain: [
        s('ceoExit.chain1'),
        s('ceoExit.chain2'),
        s('ceoExit.chain3'),
        s('ceoExit.chain4'),
        s('ceoExit.chain5'),
        s('ceoExit.chain6'),
      ],
      marketImpact: {
        kospi: '-2~5%',
        usdkrw: '+30~50\u{20A9}',
        upSectors: [
          { name: s('ceoExit.upSector1'), change: '+10~20%' },
          { name: s('ceoExit.upSector2'), change: '+3~8%' },
          { name: s('ceoExit.upSector3'), change: '+5~10%' },
        ],
        downSectors: [
          { name: s('ceoExit.downSector1'), change: '-25~40%' },
          { name: s('ceoExit.downSector2'), change: '-10~20%' },
          { name: s('ceoExit.downSector3'), change: '-5~10%' },
        ],
      },
      historicalParallel: {
        event: s('ceoExit.histEvent'),
        year: '2011',
        initialDrop: s('ceoExit.histDrop'),
        recoveryTime: s('ceoExit.histRecovery'),
        lesson: s('ceoExit.histLesson'),
      },
      actionGuide: [
        s('ceoExit.action1'),
        s('ceoExit.action2'),
        s('ceoExit.action3'),
        s('ceoExit.action4'),
      ],
      whatIfInput: {
        scenario: 'stock_crash',
        description: s('ceoExit.aiPrompt'),
        magnitude: -20,
      },
    },

    // 13. Crypto Global Ban (global)
    {
      id: 'crypto_global_ban',
      locale: 'global',
      emoji: '\u{20BF}',
      title: s('cryptoBan.title'),
      subtitle: s('cryptoBan.subtitle'),
      category: 'policy',
      categoryLabel: s('category.regulation'),
      shareTitle: s('cryptoBan.shareTitle'),
      impactChain: [
        s('cryptoBan.chain1'),
        s('cryptoBan.chain2'),
        s('cryptoBan.chain3'),
        s('cryptoBan.chain4'),
        s('cryptoBan.chain5'),
        s('cryptoBan.chain6'),
      ],
      marketImpact: {
        kospi: '-3~5%',
        usdkrw: '+20~50\u{20A9}',
        upSectors: [
          { name: s('cryptoBan.upSector1'), change: '+25~40%' },
          { name: s('cryptoBan.upSector2'), change: '+10~15%' },
          { name: s('cryptoBan.upSector3'), change: '+5~8%' },
        ],
        downSectors: [
          { name: s('cryptoBan.downSector1'), change: '-60~80%' },
          { name: s('cryptoBan.downSector2'), change: '-80~95%' },
          { name: s('cryptoBan.downSector3'), change: '-70~90%' },
        ],
      },
      historicalParallel: {
        event: s('cryptoBan.histEvent'),
        year: '2021',
        initialDrop: 'BTC -53% (64K\u{2192}29K)',
        recoveryTime: s('cryptoBan.histRecovery'),
        lesson: s('cryptoBan.histLesson'),
      },
      actionGuide: [
        s('cryptoBan.action1'),
        s('cryptoBan.action2'),
        s('cryptoBan.action3'),
        s('cryptoBan.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('cryptoBan.aiPrompt'),
        magnitude: -30,
      },
    },

    // 14. Korea FX Crisis (Korea-only)
    {
      id: 'korea_fx_crisis',
      locale: 'ko',
      emoji: '\u{1F1F0}\u{1F1F7}',
      title: s('koreaFx.title'),
      subtitle: s('koreaFx.subtitle'),
      category: 'economic',
      categoryLabel: s('category.financialCrisis'),
      shareTitle: s('koreaFx.shareTitle'),
      impactChain: [
        s('koreaFx.chain1'),
        s('koreaFx.chain2'),
        s('koreaFx.chain3'),
        s('koreaFx.chain4'),
        s('koreaFx.chain5'),
        s('koreaFx.chain6'),
      ],
      marketImpact: {
        kospi: '-40~60%',
        usdkrw: '+800~1000\u{20A9}',
        upSectors: [
          { name: s('koreaFx.upSector1'), change: '+60~80%' },
          { name: s('koreaFx.upSector2'), change: '+30~50%' },
          { name: s('koreaFx.upSector3'), change: '+10~20%' },
        ],
        downSectors: [
          { name: s('koreaFx.downSector1'), change: '-40~60%' },
          { name: s('koreaFx.downSector2'), change: '-30~50%' },
          { name: s('koreaFx.downSector3'), change: '-50~70%' },
        ],
      },
      historicalParallel: {
        event: s('koreaFx.histEvent'),
        year: '1997',
        initialDrop: s('koreaFx.histDrop'),
        recoveryTime: s('koreaFx.histRecovery'),
        lesson: s('koreaFx.histLesson'),
      },
      actionGuide: [
        s('koreaFx.action1'),
        s('koreaFx.action2'),
        s('koreaFx.action3'),
        s('koreaFx.action4'),
      ],
      whatIfInput: {
        scenario: 'currency_change',
        description: s('koreaFx.aiPrompt'),
        magnitude: -45,
      },
    },

    // 15. Pandemic 2.0 (global)
    {
      id: 'pandemic_2',
      locale: 'global',
      emoji: '\u{1F9A0}',
      title: s('pandemic.title'),
      subtitle: s('pandemic.subtitle'),
      category: 'natural_disaster',
      categoryLabel: s('category.pandemic'),
      shareTitle: s('pandemic.shareTitle'),
      impactChain: [
        s('pandemic.chain1'),
        s('pandemic.chain2'),
        s('pandemic.chain3'),
        s('pandemic.chain4'),
        s('pandemic.chain5'),
        s('pandemic.chain6'),
      ],
      marketImpact: {
        kospi: '-20~35%',
        usdkrw: '+150~250\u{20A9}',
        upSectors: [
          { name: s('pandemic.upSector1'), change: '+50~200%' },
          { name: s('pandemic.upSector2'), change: '+30~60%' },
          { name: s('pandemic.upSector3'), change: '+25~50%' },
        ],
        downSectors: [
          { name: s('pandemic.downSector1'), change: '-40~70%' },
          { name: s('pandemic.downSector2'), change: '-50~70%' },
          { name: s('pandemic.downSector3'), change: '-30~50%' },
        ],
      },
      historicalParallel: {
        event: 'COVID-19 (2020)',
        year: '2020',
        initialDrop: 'S&P 500 -34%, KOSPI -35%',
        recoveryTime: s('pandemic.histRecovery'),
        lesson: s('pandemic.histLesson'),
      },
      actionGuide: [
        s('pandemic.action1'),
        s('pandemic.action2'),
        s('pandemic.action3'),
        s('pandemic.action4'),
      ],
      whatIfInput: {
        scenario: 'market_crash',
        description: s('pandemic.aiPrompt'),
        magnitude: -30,
      },
    },

    // 16. Trump Impeachment (global)
    {
      id: 'trump_impeachment',
      locale: 'global',
      emoji: '\u{1F3DB}\u{FE0F}',
      title: s('trumpImpeach.title'),
      subtitle: s('trumpImpeach.subtitle'),
      category: 'policy',
      categoryLabel: s('category.politicalRisk'),
      shareTitle: s('trumpImpeach.shareTitle'),
      impactChain: [
        s('trumpImpeach.chain1'),
        s('trumpImpeach.chain2'),
        s('trumpImpeach.chain3'),
        s('trumpImpeach.chain4'),
        s('trumpImpeach.chain5'),
        s('trumpImpeach.chain6'),
      ],
      marketImpact: {
        kospi: '-5~12%',
        usdkrw: '-50~120\u{20A9}',
        upSectors: [
          { name: s('trumpImpeach.upSector1'), change: '+10~20%' },
          { name: s('trumpImpeach.upSector2'), change: '+5~15%' },
          { name: s('trumpImpeach.upSector3'), change: '+5~10%' },
        ],
        downSectors: [
          { name: s('trumpImpeach.downSector1'), change: '-40~70%' },
          { name: s('trumpImpeach.downSector2'), change: '-10~20%' },
          { name: s('trumpImpeach.downSector3'), change: '-10~15%' },
        ],
      },
      historicalParallel: {
        event: s('trumpImpeach.histEvent'),
        year: '1974',
        initialDrop: s('trumpImpeach.histDrop'),
        recoveryTime: s('trumpImpeach.histRecovery'),
        lesson: s('trumpImpeach.histLesson'),
      },
      actionGuide: [
        s('trumpImpeach.action1'),
        s('trumpImpeach.action2'),
        s('trumpImpeach.action3'),
        s('trumpImpeach.action4'),
        s('trumpImpeach.action5'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('trumpImpeach.aiPrompt'),
        magnitude: -10,
      },
    },

    // 17. EU Energy Crisis (global)
    {
      id: 'eu_energy_crisis',
      locale: 'global',
      emoji: '\u{26FD}',
      title: s('euEnergy.title'),
      subtitle: s('euEnergy.subtitle'),
      category: 'geopolitical',
      categoryLabel: s('category.energy'),
      shareTitle: s('euEnergy.shareTitle'),
      impactChain: [
        s('euEnergy.chain1'),
        s('euEnergy.chain2'),
        s('euEnergy.chain3'),
        s('euEnergy.chain4'),
        s('euEnergy.chain5'),
        s('euEnergy.chain6'),
      ],
      marketImpact: {
        kospi: '-10~18%',
        usdkrw: '+100~180\u{20A9}',
        upSectors: [
          { name: s('euEnergy.upSector1'), change: '+30~60%' },
          { name: s('euEnergy.upSector2'), change: '+25~45%' },
          { name: s('euEnergy.upSector3'), change: '+15~30%' },
        ],
        downSectors: [
          { name: s('euEnergy.downSector1'), change: '-20~35%' },
          { name: s('euEnergy.downSector2'), change: '-25~40%' },
          { name: s('euEnergy.downSector3'), change: '-15~25%' },
        ],
      },
      historicalParallel: {
        event: s('euEnergy.histEvent'),
        year: '2022',
        initialDrop: s('euEnergy.histDrop'),
        recoveryTime: s('euEnergy.histRecovery'),
        lesson: s('euEnergy.histLesson'),
      },
      actionGuide: [
        s('euEnergy.action1'),
        s('euEnergy.action2'),
        s('euEnergy.action3'),
        s('euEnergy.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('euEnergy.aiPrompt'),
        magnitude: -18,
      },
    },
    // ========================================================================
    // 18~25: English-only global scenarios (locale: 'en')
    // These replace Korea-specific scenarios for non-Korean users.
    // ========================================================================

    // 18. US Debt Ceiling Crisis (English-only)
    {
      id: 'us_debt_ceiling',
      locale: 'en',
      emoji: '\u{1F4B8}',
      title: s('usDebtCeiling.title'),
      subtitle: s('usDebtCeiling.subtitle'),
      category: 'economic',
      categoryLabel: s('category.financialCrisis'),
      shareTitle: s('usDebtCeiling.shareTitle'),
      impactChain: [
        s('usDebtCeiling.chain1'),
        s('usDebtCeiling.chain2'),
        s('usDebtCeiling.chain3'),
        s('usDebtCeiling.chain4'),
        s('usDebtCeiling.chain5'),
        s('usDebtCeiling.chain6'),
      ],
      marketImpact: {
        kospi: '-8~15%',
        usdkrw: '+150~250\u{20A9}',
        sp500: '-15~20%',
        nasdaq: '-18~25%',
        btc: '-10~20%',
        gold: '+10~20%',
        upSectors: [
          { name: s('usDebtCeiling.upSector1'), change: '+15~25%' },
          { name: s('usDebtCeiling.upSector2'), change: '+10~20%' },
          { name: s('usDebtCeiling.upSector3'), change: '+20~35%' },
        ],
        downSectors: [
          { name: s('usDebtCeiling.downSector1'), change: '-15~25%' },
          { name: s('usDebtCeiling.downSector2'), change: '-20~30%' },
          { name: s('usDebtCeiling.downSector3'), change: '-10~18%' },
        ],
      },
      historicalParallel: {
        event: s('usDebtCeiling.histEvent'),
        year: '2011',
        initialDrop: 'S&P 500 -17%',
        recoveryTime: s('usDebtCeiling.histRecovery'),
        lesson: s('usDebtCeiling.histLesson'),
      },
      actionGuide: [
        s('usDebtCeiling.action1'),
        s('usDebtCeiling.action2'),
        s('usDebtCeiling.action3'),
        s('usDebtCeiling.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('usDebtCeiling.aiPrompt'),
        magnitude: -18,
      },
    },

    // 19. Dollar Collapse (English-only)
    {
      id: 'dollar_collapse',
      locale: 'en',
      emoji: '\u{1F4B5}',
      title: s('dollarCollapse.title'),
      subtitle: s('dollarCollapse.subtitle'),
      category: 'economic',
      categoryLabel: s('category.financialCrisis'),
      shareTitle: s('dollarCollapse.shareTitle'),
      impactChain: [
        s('dollarCollapse.chain1'),
        s('dollarCollapse.chain2'),
        s('dollarCollapse.chain3'),
        s('dollarCollapse.chain4'),
        s('dollarCollapse.chain5'),
        s('dollarCollapse.chain6'),
      ],
      marketImpact: {
        kospi: '+5~15%',
        usdkrw: '-300~500\u{20A9}',
        sp500: '-10~20%',
        nasdaq: '-15~25%',
        btc: '+25~40%',
        gold: '+40~60%',
        dxy: '-25~35%',
        upSectors: [
          { name: s('dollarCollapse.upSector1'), change: '+40~60%' },
          { name: s('dollarCollapse.upSector2'), change: '+25~40%' },
          { name: s('dollarCollapse.upSector3'), change: '+20~35%' },
        ],
        downSectors: [
          { name: s('dollarCollapse.downSector1'), change: '-15~25%' },
          { name: s('dollarCollapse.downSector2'), change: '-20~30%' },
          { name: s('dollarCollapse.downSector3'), change: '-10~20%' },
        ],
      },
      historicalParallel: {
        event: s('dollarCollapse.histEvent'),
        year: '1971',
        initialDrop: s('dollarCollapse.histDrop'),
        recoveryTime: s('dollarCollapse.histRecovery'),
        lesson: s('dollarCollapse.histLesson'),
      },
      actionGuide: [
        s('dollarCollapse.action1'),
        s('dollarCollapse.action2'),
        s('dollarCollapse.action3'),
        s('dollarCollapse.action4'),
      ],
      whatIfInput: {
        scenario: 'currency_change',
        description: s('dollarCollapse.aiPrompt'),
        magnitude: -25,
      },
    },

    // 20. Oil Price Shock (English-only)
    {
      id: 'oil_price_shock',
      locale: 'en',
      emoji: '\u{1F6E2}\u{FE0F}',
      title: s('oilShock.title'),
      subtitle: s('oilShock.subtitle'),
      category: 'geopolitical',
      categoryLabel: s('category.energy'),
      shareTitle: s('oilShock.shareTitle'),
      impactChain: [
        s('oilShock.chain1'),
        s('oilShock.chain2'),
        s('oilShock.chain3'),
        s('oilShock.chain4'),
        s('oilShock.chain5'),
        s('oilShock.chain6'),
      ],
      marketImpact: {
        kospi: '-10~18%',
        usdkrw: '+100~200\u{20A9}',
        sp500: '-12~18%',
        nasdaq: '-15~22%',
        gold: '+10~20%',
        upSectors: [
          { name: s('oilShock.upSector1'), change: '+40~80%' },
          { name: s('oilShock.upSector2'), change: '+25~45%' },
          { name: s('oilShock.upSector3'), change: '+20~35%' },
        ],
        downSectors: [
          { name: s('oilShock.downSector1'), change: '-35~50%' },
          { name: s('oilShock.downSector2'), change: '-20~35%' },
          { name: s('oilShock.downSector3'), change: '-15~25%' },
        ],
      },
      historicalParallel: {
        event: s('oilShock.histEvent'),
        year: '1973',
        initialDrop: s('oilShock.histDrop'),
        recoveryTime: s('oilShock.histRecovery'),
        lesson: s('oilShock.histLesson'),
      },
      actionGuide: [
        s('oilShock.action1'),
        s('oilShock.action2'),
        s('oilShock.action3'),
        s('oilShock.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('oilShock.aiPrompt'),
        magnitude: -18,
      },
    },

    // 21. Global Supply Chain Collapse (English-only)
    {
      id: 'supply_chain_collapse',
      locale: 'en',
      emoji: '\u{1F4E6}',
      title: s('supplyChain.title'),
      subtitle: s('supplyChain.subtitle'),
      category: 'economic',
      categoryLabel: s('category.financialCrisis'),
      shareTitle: s('supplyChain.shareTitle'),
      impactChain: [
        s('supplyChain.chain1'),
        s('supplyChain.chain2'),
        s('supplyChain.chain3'),
        s('supplyChain.chain4'),
        s('supplyChain.chain5'),
        s('supplyChain.chain6'),
      ],
      marketImpact: {
        kospi: '-10~20%',
        usdkrw: '+100~180\u{20A9}',
        sp500: '-12~20%',
        nasdaq: '-15~25%',
        gold: '+8~15%',
        upSectors: [
          { name: s('supplyChain.upSector1'), change: '+20~35%' },
          { name: s('supplyChain.upSector2'), change: '+15~25%' },
          { name: s('supplyChain.upSector3'), change: '+10~20%' },
        ],
        downSectors: [
          { name: s('supplyChain.downSector1'), change: '-20~35%' },
          { name: s('supplyChain.downSector2'), change: '-25~40%' },
          { name: s('supplyChain.downSector3'), change: '-15~30%' },
        ],
      },
      historicalParallel: {
        event: s('supplyChain.histEvent'),
        year: '2021',
        initialDrop: s('supplyChain.histDrop'),
        recoveryTime: s('supplyChain.histRecovery'),
        lesson: s('supplyChain.histLesson'),
      },
      actionGuide: [
        s('supplyChain.action1'),
        s('supplyChain.action2'),
        s('supplyChain.action3'),
        s('supplyChain.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('supplyChain.aiPrompt'),
        magnitude: -18,
      },
    },

    // 22. US Regional Bank Crisis (English-only)
    {
      id: 'us_bank_crisis',
      locale: 'en',
      emoji: '\u{1F3E6}',
      title: s('usBankCrisis.title'),
      subtitle: s('usBankCrisis.subtitle'),
      category: 'economic',
      categoryLabel: s('category.financialCrisis'),
      shareTitle: s('usBankCrisis.shareTitle'),
      impactChain: [
        s('usBankCrisis.chain1'),
        s('usBankCrisis.chain2'),
        s('usBankCrisis.chain3'),
        s('usBankCrisis.chain4'),
        s('usBankCrisis.chain5'),
        s('usBankCrisis.chain6'),
      ],
      marketImpact: {
        kospi: '-8~15%',
        usdkrw: '+80~150\u{20A9}',
        sp500: '-15~25%',
        nasdaq: '-18~28%',
        btc: '+10~25%',
        gold: '+12~20%',
        upSectors: [
          { name: s('usBankCrisis.upSector1'), change: '+15~25%' },
          { name: s('usBankCrisis.upSector2'), change: '+10~18%' },
          { name: s('usBankCrisis.upSector3'), change: '+8~15%' },
        ],
        downSectors: [
          { name: s('usBankCrisis.downSector1'), change: '-30~50%' },
          { name: s('usBankCrisis.downSector2'), change: '-20~35%' },
          { name: s('usBankCrisis.downSector3'), change: '-15~25%' },
        ],
      },
      historicalParallel: {
        event: s('usBankCrisis.histEvent'),
        year: '2023',
        initialDrop: s('usBankCrisis.histDrop'),
        recoveryTime: s('usBankCrisis.histRecovery'),
        lesson: s('usBankCrisis.histLesson'),
      },
      actionGuide: [
        s('usBankCrisis.action1'),
        s('usBankCrisis.action2'),
        s('usBankCrisis.action3'),
        s('usBankCrisis.action4'),
      ],
      whatIfInput: {
        scenario: 'market_crash',
        description: s('usBankCrisis.aiPrompt'),
        magnitude: -22,
      },
    },

    // 23. Japan Debt Bomb (English-only)
    {
      id: 'japan_debt_bomb',
      locale: 'en',
      emoji: '\u{1F1EF}\u{1F1F5}',
      title: s('japanDebt.title'),
      subtitle: s('japanDebt.subtitle'),
      category: 'economic',
      categoryLabel: s('category.financialCrisis'),
      shareTitle: s('japanDebt.shareTitle'),
      impactChain: [
        s('japanDebt.chain1'),
        s('japanDebt.chain2'),
        s('japanDebt.chain3'),
        s('japanDebt.chain4'),
        s('japanDebt.chain5'),
        s('japanDebt.chain6'),
      ],
      marketImpact: {
        kospi: '-12~20%',
        usdkrw: '+100~200\u{20A9}',
        sp500: '-10~18%',
        nasdaq: '-12~20%',
        btc: '+5~15%',
        gold: '+15~25%',
        upSectors: [
          { name: s('japanDebt.upSector1'), change: '+15~25%' },
          { name: s('japanDebt.upSector2'), change: '+10~18%' },
          { name: s('japanDebt.upSector3'), change: '+8~12%' },
        ],
        downSectors: [
          { name: s('japanDebt.downSector1'), change: '-25~40%' },
          { name: s('japanDebt.downSector2'), change: '-15~25%' },
          { name: s('japanDebt.downSector3'), change: '-20~30%' },
        ],
      },
      historicalParallel: {
        event: s('japanDebt.histEvent'),
        year: '2012',
        initialDrop: s('japanDebt.histDrop'),
        recoveryTime: s('japanDebt.histRecovery'),
        lesson: s('japanDebt.histLesson'),
      },
      actionGuide: [
        s('japanDebt.action1'),
        s('japanDebt.action2'),
        s('japanDebt.action3'),
        s('japanDebt.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('japanDebt.aiPrompt'),
        magnitude: -18,
      },
    },

    // 24. India-Pakistan Nuclear Escalation (English-only)
    {
      id: 'india_pakistan_nuclear',
      locale: 'en',
      emoji: '\u{2622}\u{FE0F}',
      title: s('indiaPakistan.title'),
      subtitle: s('indiaPakistan.subtitle'),
      category: 'geopolitical',
      categoryLabel: s('category.geopolitical'),
      shareTitle: s('indiaPakistan.shareTitle'),
      impactChain: [
        s('indiaPakistan.chain1'),
        s('indiaPakistan.chain2'),
        s('indiaPakistan.chain3'),
        s('indiaPakistan.chain4'),
        s('indiaPakistan.chain5'),
        s('indiaPakistan.chain6'),
      ],
      marketImpact: {
        kospi: '-10~18%',
        usdkrw: '+150~250\u{20A9}',
        sp500: '-12~20%',
        nasdaq: '-15~22%',
        btc: '-5~15%',
        gold: '+25~40%',
        upSectors: [
          { name: s('indiaPakistan.upSector1'), change: '+25~40%' },
          { name: s('indiaPakistan.upSector2'), change: '+15~30%' },
          { name: s('indiaPakistan.upSector3'), change: '+20~35%' },
        ],
        downSectors: [
          { name: s('indiaPakistan.downSector1'), change: '-40~60%' },
          { name: s('indiaPakistan.downSector2'), change: '-30~50%' },
          { name: s('indiaPakistan.downSector3'), change: '-20~35%' },
        ],
      },
      historicalParallel: {
        event: s('indiaPakistan.histEvent'),
        year: '2019',
        initialDrop: s('indiaPakistan.histDrop'),
        recoveryTime: s('indiaPakistan.histRecovery'),
        lesson: s('indiaPakistan.histLesson'),
      },
      actionGuide: [
        s('indiaPakistan.action1'),
        s('indiaPakistan.action2'),
        s('indiaPakistan.action3'),
        s('indiaPakistan.action4'),
      ],
      whatIfInput: {
        scenario: 'custom',
        description: s('indiaPakistan.aiPrompt'),
        magnitude: -20,
      },
    },

    // 25. Global Sovereign Debt Crisis (English-only)
    {
      id: 'sovereign_debt_crisis',
      locale: 'en',
      emoji: '\u{1F30D}',
      title: s('sovereignDebt.title'),
      subtitle: s('sovereignDebt.subtitle'),
      category: 'economic',
      categoryLabel: s('category.financialCrisis'),
      shareTitle: s('sovereignDebt.shareTitle'),
      impactChain: [
        s('sovereignDebt.chain1'),
        s('sovereignDebt.chain2'),
        s('sovereignDebt.chain3'),
        s('sovereignDebt.chain4'),
        s('sovereignDebt.chain5'),
        s('sovereignDebt.chain6'),
      ],
      marketImpact: {
        kospi: '-15~25%',
        usdkrw: '+200~350\u{20A9}',
        sp500: '-20~30%',
        nasdaq: '-25~35%',
        btc: '+15~30%',
        gold: '+30~50%',
        upSectors: [
          { name: s('sovereignDebt.upSector1'), change: '+30~50%' },
          { name: s('sovereignDebt.upSector2'), change: '+15~30%' },
          { name: s('sovereignDebt.upSector3'), change: '+10~20%' },
        ],
        downSectors: [
          { name: s('sovereignDebt.downSector1'), change: '-25~40%' },
          { name: s('sovereignDebt.downSector2'), change: '-30~50%' },
          { name: s('sovereignDebt.downSector3'), change: '-20~35%' },
        ],
      },
      historicalParallel: {
        event: s('sovereignDebt.histEvent'),
        year: '2010-2012',
        initialDrop: s('sovereignDebt.histDrop'),
        recoveryTime: s('sovereignDebt.histRecovery'),
        lesson: s('sovereignDebt.histLesson'),
      },
      actionGuide: [
        s('sovereignDebt.action1'),
        s('sovereignDebt.action2'),
        s('sovereignDebt.action3'),
        s('sovereignDebt.action4'),
      ],
      whatIfInput: {
        scenario: 'market_crash',
        description: s('sovereignDebt.aiPrompt'),
        magnitude: -25,
      },
    },
  ];
}

// ============================================================================
// Locale-based filtering
// ============================================================================

/**
 * Returns scenarios filtered by user locale.
 * - 'ko' users see: locale=ko + locale=global + locale=undefined
 * - 'en' (or other) users see: locale=en + locale=global + locale=undefined
 */
export function getScenariosByLocale(t: TFunc, lang: string = 'ko'): ExtremeScenario[] {
  const all = getExtremeScenarios(t);
  return all.filter((s) => {
    if (!s.locale) return true;           // no locale = show to everyone
    if (s.locale === 'global') return true; // global = show to everyone
    return s.locale === lang;              // ko or en = show only to matching
  });
}

/** Legacy export for backward compatibility */
export const EXTREME_SCENARIOS: ExtremeScenario[] = [];

/** Category colors */
export const CATEGORY_COLORS: Record<ExtremeScenario['category'], string> = {
  geopolitical: '#F59E0B',
  natural_disaster: '#EF4444',
  economic: '#3B82F6',
  tech: '#8B5CF6',
  corporate: '#10B981',
  policy: '#EC4899',
};
