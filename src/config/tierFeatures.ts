export interface TierFeatureSet {
  exclusiveFeed: boolean;
  priorityGuru: boolean;
  crownBadge: boolean;
}

export const TIER_FEATURES: Record<string, TierFeatureSet> = {
  DIAMOND: { exclusiveFeed: true, priorityGuru: true, crownBadge: true },
  PLATINUM: { exclusiveFeed: false, priorityGuru: false, crownBadge: true },
  GOLD: { exclusiveFeed: false, priorityGuru: false, crownBadge: false },
  SILVER: { exclusiveFeed: false, priorityGuru: false, crownBadge: false },
};

export function getTierFeatures(tier: string): TierFeatureSet {
  return TIER_FEATURES[tier] || TIER_FEATURES.SILVER;
}
