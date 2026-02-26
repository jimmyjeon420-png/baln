/**
 * CityHallSections — 전체 탭 시청 테마 섹션 매핑
 *
 * 역할: "마을 시청 안내도" — 프로필/전체 탭의 각 섹션을 시청 부서로 매핑
 * 비유: 시청 로비에 있는 "몇 층에 무슨 부서" 안내판
 *
 * 기능:
 * - 프로필 각 섹션을 시청 방(room)으로 테마화
 * - 이모지 + 테마 이름 + 설명 반환
 * - profile.tsx에서 map하여 사용
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

// ============================================================================
// Types
// ============================================================================

export interface CityHallSection {
  id: string;
  emoji: string;
  nameKo: string;
  nameEn: string;
  descriptionKo: string;
  descriptionEn: string;
  route?: string;
}

// ============================================================================
// Section data
// ============================================================================

export const CITY_HALL_SECTIONS: CityHallSection[] = [
  {
    id: 'credits',
    emoji: '🏦',
    nameKo: '도토리 금고',
    nameEn: 'Acorn Vault',
    descriptionKo: '보유 크레딧과 거래 내역',
    descriptionEn: 'Your credits and transaction history',
    route: 'settings/marketplace',
  },
  {
    id: 'marketplace',
    emoji: '🏪',
    nameKo: '마을 상점',
    nameEn: 'Village Shop',
    descriptionKo: '크레딧으로 살 수 있는 아이템',
    descriptionEn: 'Items you can buy with credits',
    route: 'settings/marketplace',
  },
  {
    id: 'subscription',
    emoji: '💳',
    nameKo: 'VIP 카드',
    nameEn: 'VIP Card',
    descriptionKo: 'Premium 구독 관리',
    descriptionEn: 'Manage Premium subscription',
    route: 'settings/subscription',
  },
  {
    id: 'badges',
    emoji: '🏆',
    nameKo: '명예의 전당',
    nameEn: 'Hall of Fame',
    descriptionKo: '획득한 뱃지와 업적',
    descriptionEn: 'Earned badges and achievements',
    route: 'settings/badges',
  },
  {
    id: 'mentor',
    emoji: '👨‍🏫',
    nameKo: '멘토 사무실',
    nameEn: 'Mentor Office',
    descriptionKo: '투자 거장 인사이트',
    descriptionEn: 'Investment guru insights',
    route: 'settings/gurus',
  },
  {
    id: 'realestate',
    emoji: '🏠',
    nameKo: '토지 관리',
    nameEn: 'Land Management',
    descriptionKo: '부동산 자산 관리',
    descriptionEn: 'Real estate asset management',
    route: 'settings/realestate',
  },
  {
    id: 'settings',
    emoji: '📋',
    nameKo: '민원실',
    nameEn: 'Service Center',
    descriptionKo: '앱 설정, 알림, 계정 관리',
    descriptionEn: 'App settings, notifications, account',
    route: 'settings/general',
  },
];

// ============================================================================
// Props
// ============================================================================

interface CityHallSectionsProps {
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

export function CityHallSections({ locale = 'ko', onNavigate, colors }: CityHallSectionsProps) {
  const isKo = locale === 'ko';

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
              {isKo ? section.nameKo : section.nameEn}
            </Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              {isKo ? section.descriptionKo : section.descriptionEn}
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
