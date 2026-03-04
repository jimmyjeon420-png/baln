/**
 * LynchMartTour — 린치의 화요 마트 순찰
 *
 * 역할: "마을 마트 투어 안내문" — 매주 화요일 피터 린치가 마을 상점을 순찰
 * 비유: 피터 린치의 철학 "마트에서 종목을 찾아라"를 게임화한 것
 *
 * 기능:
 * - 화요일에만 표시
 * - 린치가 방문하는 3개 브랜드 상점 표시
 * - 각 상점에 대한 미니 코멘트
 *
 * WORLD_DESIGN.md 섹션 31-8
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { BRAND_SHOPS } from '../../data/brandWorldConfig';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// Comments per shop category
// ============================================================================

const COMMENTS_KO: Record<string, string[]> = {
  tech: ['반도체 수요가 궁금하군...', '기술주의 실적을 확인해봐야겠어', '혁신 기업은 항상 흥미로워'],
  fashion: ['이 브랜드 진열대가 3칸이야!', '사람들이 여기서 많이 사는군', '소비 트렌드가 보여'],
  food: ['이 음식 브랜드 매출이 좋아 보여', '식품은 경기 불황에도 강하지', '맛있는 회사가 좋은 회사야'],
  finance: ['금융 서비스 수요가 늘고 있어', '핀테크가 변화를 주도하고 있군', '은행의 디지털 전환이 가속화돼'],
  auto: ['전기차 전환이 빨라지고 있어', '자동차 산업의 변곡점이야', '모빌리티가 미래야'],
  entertainment: ['엔터테인먼트 소비가 늘고 있어', '콘텐츠가 왕이야', '구독 경제가 성장 중이야'],
};

const COMMENTS_EN: Record<string, string[]> = {
  tech: ['Semiconductor demand is interesting...', "Need to check tech earnings", 'Innovation companies are always fascinating'],
  fashion: ['This brand has 3 shelf spaces!', 'People buy a lot here', 'Consumer trends are visible'],
  food: ['This food brand looks profitable', 'Food is recession-resistant', 'Tasty companies are good companies'],
  finance: ['Financial services demand growing', 'Fintech driving change', 'Banking digital transformation accelerating'],
  auto: ['EV transition accelerating', 'Inflection point for auto industry', 'Mobility is the future'],
  entertainment: ['Entertainment spending up', 'Content is king', 'Subscription economy growing'],
};

// ============================================================================
// Props
// ============================================================================

interface LynchMartTourProps {
  colors: {
    surface: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    primary: string;
    border: string;
  };
}

// ============================================================================
// Component
// ============================================================================

export function LynchMartTour({ colors }: LynchMartTourProps) {
  const { t, language } = useLocale();
  const isKo = language === 'ko';
  const comments = isKo ? COMMENTS_KO : COMMENTS_EN;

  // Only visible on Tuesdays
  const isTuesday = new Date().getDay() === 2;

  // Deterministic selection of 3 shops based on current week
  const shops = useMemo(() => {
    const now = new Date();
    const weekNum = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
    const selected: typeof BRAND_SHOPS[number][] = [];
    for (let i = 0; i < 3; i++) {
      const idx = (weekNum * 7 + i * 13) % BRAND_SHOPS.length;
      if (!selected.includes(BRAND_SHOPS[idx])) {
        selected.push(BRAND_SHOPS[idx]);
      }
    }
    // Ensure we have 3
    while (selected.length < 3) {
      const idx = selected.length;
      if (!selected.includes(BRAND_SHOPS[idx])) {
        selected.push(BRAND_SHOPS[idx]);
      }
    }
    return selected;
  }, []);

  if (!isTuesday) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🐻</Text>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('lynchMartTour.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{t('lynchMartTour.subtitle')}</Text>
        </View>
      </View>

      {shops.map((shop, i) => {
        const categoryComments = comments[shop.category] || comments.tech;
        const comment = categoryComments[i % categoryComments.length];
        return (
          <View key={shop.brandId} style={[styles.shopRow, { borderColor: colors.border }]}>
            <Text style={styles.shopEmoji}>{shop.emoji}</Text>
            <View style={styles.shopInfo}>
              <Text style={[styles.shopName, { color: colors.textPrimary }]}>
                {isKo ? shop.villageName : shop.villageNameEn}
              </Text>
              <Text style={[styles.shopComment, { color: colors.textSecondary }]}>
                "{comment}"
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shopEmoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  shopInfo: {
    flex: 1,
    gap: 2,
  },
  shopName: {
    fontSize: 13,
    fontWeight: '600',
  },
  shopComment: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
