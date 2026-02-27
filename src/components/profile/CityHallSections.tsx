/**
 * CityHallSections — 전체 탭 메뉴 섹션 목록
 *
 * 기능:
 * - 전체 탭의 각 섹션 (크레딧, 마켓, VIP 등) 정의
 * - 이모지 + 이름 + 설명 반환
 * - profile.tsx에서 map하여 사용
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { t } from '../../locales';

// ============================================================================
// Types
// ============================================================================

export interface CityHallSection {
  id: string;
  emoji: string;
  nameKey: string;
  descriptionKey: string;
  route?: string;
}

// ============================================================================
// Section data
// ============================================================================

export const CITY_HALL_SECTIONS: CityHallSection[] = [
  {
    id: 'credits',
    emoji: '💰',
    nameKey: 'profile.sections.acorn_vault',
    descriptionKey: 'profile.sections.acorn_vault_desc',
    route: 'settings/marketplace',
  },
  {
    id: 'marketplace',
    emoji: '🛒',
    nameKey: 'profile.sections.village_shop',
    descriptionKey: 'profile.sections.village_shop_desc',
    route: 'settings/marketplace',
  },
  {
    id: 'subscription',
    emoji: '💳',
    nameKey: 'profile.sections.vip_card',
    descriptionKey: 'profile.sections.vip_card_desc',
    route: 'settings/subscription',
  },
  {
    id: 'badges',
    emoji: '🏆',
    nameKey: 'profile.sections.hall_of_fame',
    descriptionKey: 'profile.sections.hall_of_fame_desc',
    route: 'settings/badges',
  },
  {
    id: 'mentor',
    emoji: '📈',
    nameKey: 'profile.sections.mentor_office',
    descriptionKey: 'profile.sections.mentor_office_desc',
    route: 'settings/gurus',
  },
  {
    id: 'realestate',
    emoji: '🏢',
    nameKey: 'profile.sections.land_management',
    descriptionKey: 'profile.sections.land_management_desc',
    route: 'settings/realestate',
  },
  {
    id: 'settings',
    emoji: '⚙️',
    nameKey: 'profile.sections.service_center',
    descriptionKey: 'profile.sections.service_center_desc',
    route: 'settings/general',
  },
];

// ============================================================================
// Props
// ============================================================================

interface CityHallSectionsProps {
  /** @deprecated Use t() from locales instead. Kept for backward compatibility. */
  locale?: string;
  onNavigate: (route: string) => void;
  colors: {
    surface: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
  };
}

// ============================================================================
// Component
// ============================================================================

export function CityHallSections({ onNavigate, colors }: CityHallSectionsProps) {
  return (
    <View style={styles.container}>
      {CITY_HALL_SECTIONS.map(section => (
        <TouchableOpacity
          key={section.id}
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => section.route && onNavigate(section.route)}
          activeOpacity={0.7}
        >
          <Text style={styles.emoji}>{section.emoji}</Text>
          <View style={styles.textCol}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {t(section.nameKey)}
            </Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              {t(section.descriptionKey)}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  emoji: {
    fontSize: 26,
    width: 36,
    textAlign: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  desc: {
    fontSize: 12,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
  },
});
