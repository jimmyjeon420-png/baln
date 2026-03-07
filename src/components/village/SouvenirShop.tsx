/**
 * SouvenirShop — 마을 기념품 상점 UI
 *
 * 역할: "마을 기념품 가판대" — 브랜드 상점에서 기념품 구매
 * 비유: 동물의숲에서 에이블 시스터즈 가게처럼 아이템 진열/구매
 *
 * 기능:
 * - 기념품 그리드 (이모지 + 이름 + 가격)
 * - "구매" 버튼
 * - 보유 아이템 하이라이트
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOUVENIR_ITEMS, type SouvenirItem } from '../../data/souvenirConfig';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// Constants
// ============================================================================

const OWNED_KEY = '@baln:owned_souvenirs';

// ============================================================================
// Props
// ============================================================================

interface SouvenirShopProps {
  onPurchase?: (item: SouvenirItem) => void;
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

export function SouvenirShop({ onPurchase, colors }: SouvenirShopProps) {
  const { t, language } = useLocale();

  const [owned, setOwned] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(OWNED_KEY)
      .then(raw => {
        if (raw) {
          try {
            setOwned(new Set(JSON.parse(raw)));
          } catch {
            // corrupted data — ignore
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleBuy = useCallback(
    (item: SouvenirItem) => {
      const name = language === 'ko' ? item.nameKo : item.nameEn;
      const confirmMsg = t('souvenirShop.buyConfirm', { name, cost: item.cost });
      Alert.alert('', confirmMsg, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('souvenirShop.buy'),
          onPress: async () => {
            const newOwned = new Set(owned);
            newOwned.add(item.id);
            setOwned(newOwned);
            try {
              await AsyncStorage.setItem(OWNED_KEY, JSON.stringify([...newOwned]));
            } catch {
              // best effort
            }
            onPurchase?.(item);
          },
        },
      ]);
    },
    [owned, language, t, onPurchase],
  );

  const RARITY_COLORS: Record<string, string> = {
    common: colors.textTertiary,
    rare: '#4FC3F7',
    epic: '#CE93D8',
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('souvenirShop.title')}</Text>

      <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {SOUVENIR_ITEMS.map(item => {
            const isOwned = owned.has(item.id);
            const name = language === 'ko' ? item.nameKo : item.nameEn;
            const rarityLabel = t(`souvenirShop.rarity.${item.rarity}`);

            return (
              <View
                key={item.id}
                style={[
                  styles.cell,
                  { borderColor: isOwned ? colors.primary : colors.border },
                  isOwned && { backgroundColor: colors.primary + '15' },
                ]}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[styles.rarity, { color: RARITY_COLORS[item.rarity] }]}>
                  {rarityLabel}
                </Text>
                {isOwned ? (
                  <Text style={[styles.ownedBadge, { color: colors.primary }]}>{t('souvenirShop.owned')}</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.buyBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleBuy(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buyText}>
                      {t('souvenirShop.buyWithCost', { cost: item.cost })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: '30%',
    minWidth: 95,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    flexGrow: 1,
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  rarity: {
    fontSize: 10,
    fontWeight: '500',
  },
  buyBtn: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  buyText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  ownedBadge: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
