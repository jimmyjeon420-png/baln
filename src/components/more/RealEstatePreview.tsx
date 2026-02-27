/**
 * RealEstatePreview - 부동산 자산 미리보기 카드
 *
 * 비유: "부동산 서랍 미리보기"
 * - 보유 부동산 건수 + 총 시세 한 줄 요약
 * - 탭하면 전체 목록(add-realestate)으로 이동
 * - useSharedPortfolio의 realEstateAssets, totalRealEstate 활용
 *
 * 위치: profile.tsx (전체 탭) — 커뮤니티 미리보기 아래
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSharedPortfolio } from '../../hooks/useSharedPortfolio';
import { useTheme } from '../../hooks/useTheme';
import { t } from '../../locales';

export default function RealEstatePreview() {
  const router = useRouter();
  const { colors } = useTheme();
  const { realEstateAssets, totalRealEstate, isLoading } = useSharedPortfolio();
  const styles = createStyles(colors);

  /** 금액 포맷: 억/만원 (localized) */
  const formatAmount = (amount: number): string => {
    if (amount >= 100000000) {
      return t('format.amount_eok', { n: (amount / 100000000).toFixed(1) });
    }
    if (amount >= 10000) {
      return t('format.amount_manwon', { n: (amount / 10000).toFixed(0) });
    }
    return t('format.amount_won', { n: amount.toLocaleString() });
  };

  // 부동산 자산이 없으면 미리보기 카드 표시 안 함
  if (isLoading || realEstateAssets.length === 0) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/add-realestate')}
      activeOpacity={0.7}
    >
      {/* 아이콘 */}
      <View style={styles.iconBox}>
        <Ionicons name="business" size={22} color={colors.primaryDark ?? colors.primary} />
      </View>

      {/* 요약 정보 */}
      <View style={styles.info}>
        <Text style={styles.title}>{t('realestate_preview.title')}</Text>
        <Text style={styles.summary}>
          {t('realestate_preview.summary', { count: realEstateAssets.length, total: formatAmount(totalRealEstate) })}
        </Text>
      </View>

      {/* 화살표 */}
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: (colors.primaryDark ?? colors.primary) + '1A',
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: {
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    summary: {
      fontSize: 14,
      color: colors.primaryDark ?? colors.primary,
      fontWeight: '600',
      marginTop: 2,
    },
  });
