/**
 * PremiumBenefitCard.tsx - 프리미엄 혜택 비교 카드
 *
 * 역할: "무료 vs Premium 비교 테이블"
 * - 무료/프리미엄 기능 비교 표시
 * - 연간 할인 토글 (월 ₩4,900 vs 연 ₩39,000, 33% 할인)
 * - CTA 버튼: "월 ₩4,900으로 시작하기"
 *
 * useTheme()으로 다크/라이트 모드 대응
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatCredits } from '../../utils/formatters';

// ============================================================================
// Props 인터페이스
// ============================================================================

export interface PremiumBenefitCardProps {
  currentPlan: 'free' | 'premium';
  onSubscribe: () => void;
  monthlyPrice: number;
  yearlyPrice: number;
}

// ============================================================================
// 혜택 비교 데이터
// ============================================================================

interface BenefitRow {
  feature: string;
  free: string;
  premium: string;
  icon: string;
}

const BENEFIT_ROWS: BenefitRow[] = [
  {
    feature: '맥락 카드',
    free: '요약만',
    premium: '전체 4겹 + 기관행동',
    icon: 'layers-outline',
  },
  {
    feature: 'AI 진단',
    free: '1회/일',
    premium: '3회/일',
    icon: 'analytics-outline',
  },
  {
    feature: '예측 게임',
    free: '3문제/일',
    premium: '3문제 + 해설 + 복기',
    icon: 'game-controller-outline',
  },
  {
    feature: '크레딧 보너스',
    free: '-',
    premium: `${formatCredits(30)}/월`,
    icon: 'star-outline',
  },
  {
    feature: '또래 비교',
    free: '내 등급만',
    premium: '전체 등급 비교',
    icon: 'people-outline',
  },
];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PremiumBenefitCard({
  currentPlan,
  onSubscribe,
  monthlyPrice,
  yearlyPrice,
}: PremiumBenefitCardProps) {
  const { colors, shadows } = useTheme();
  const [isYearly, setIsYearly] = useState(false);
  const isPremium = currentPlan === 'premium';

  // CTA 버튼 스케일 애니메이션
  const ctaScale = useRef(new Animated.Value(1)).current;

  const handleCtaPressIn = useCallback(() => {
    Animated.spring(ctaScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, [ctaScale]);

  const handleCtaPressOut = useCallback(() => {
    Animated.spring(ctaScale, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [ctaScale]);

  // 가격 계산
  const monthlyEquivalent = isYearly
    ? Math.round(yearlyPrice / 12)
    : monthlyPrice;
  const discountPercent = Math.round(
    ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="diamond"
            size={22}
            color={colors.premium.gold}
          />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Premium 혜택
          </Text>
        </View>
        {isPremium && (
          <View
            style={[
              styles.currentBadge,
              { backgroundColor: colors.primary + '20' },
            ]}
          >
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <Text style={[styles.currentBadgeText, { color: colors.primary }]}>
              이용 중
            </Text>
          </View>
        )}
      </View>

      {/* 비교 테이블 */}
      <View
        style={[
          styles.table,
          { borderColor: colors.border },
        ]}
      >
        {/* 테이블 헤더 */}
        <View
          style={[
            styles.tableHeader,
            { backgroundColor: colors.surfaceElevated },
          ]}
        >
          <Text
            style={[styles.tableHeaderCell, styles.featureCell, { color: colors.textSecondary }]}
          >
            기능
          </Text>
          <Text
            style={[styles.tableHeaderCell, styles.planCell, { color: colors.textTertiary }]}
          >
            무료
          </Text>
          <Text
            style={[
              styles.tableHeaderCell,
              styles.planCell,
              { color: colors.premium.gold },
            ]}
          >
            Premium
          </Text>
        </View>

        {/* 테이블 바디 */}
        {BENEFIT_ROWS.map((row, index) => (
          <View
            key={row.feature}
            style={[
              styles.tableRow,
              {
                borderTopColor: colors.border,
                backgroundColor:
                  index % 2 === 0 ? 'transparent' : colors.surfaceElevated + '40',
              },
            ]}
          >
            {/* 기능 이름 */}
            <View style={[styles.featureCell, styles.featureCellContent]}>
              <Ionicons
                name={row.icon as any}
                size={16}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.featureText, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {row.feature}
              </Text>
            </View>

            {/* 무료 */}
            <View style={styles.planCell}>
              <Text
                style={[
                  styles.planValue,
                  {
                    color:
                      row.free === '-' ? colors.textQuaternary : colors.textSecondary,
                  },
                ]}
                numberOfLines={2}
              >
                {row.free}
              </Text>
            </View>

            {/* 프리미엄 */}
            <View style={styles.planCell}>
              <Text
                style={[
                  styles.planValue,
                  styles.premiumValue,
                  { color: colors.premium.gold },
                ]}
                numberOfLines={2}
              >
                {row.premium}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* 연간/월간 토글 */}
      {!isPremium && (
        <View style={styles.billingToggle}>
          <Text
            style={[
              styles.billingLabel,
              { color: !isYearly ? colors.textPrimary : colors.textTertiary },
            ]}
          >
            월간
          </Text>
          <Switch
            value={isYearly}
            onValueChange={setIsYearly}
            trackColor={{
              false: colors.border,
              true: colors.premium.gold + '60',
            }}
            thumbColor={isYearly ? colors.premium.gold : colors.textTertiary}
          />
          <Text
            style={[
              styles.billingLabel,
              { color: isYearly ? colors.textPrimary : colors.textTertiary },
            ]}
          >
            연간
          </Text>
          {isYearly && (
            <View
              style={[
                styles.discountBadge,
                { backgroundColor: colors.error + '20' },
              ]}
            >
              <Text style={[styles.discountText, { color: colors.error }]}>
                {discountPercent}% 할인
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 가격 표시 */}
      {!isPremium && (
        <View style={styles.priceSection}>
          {isYearly ? (
            <View style={styles.priceRow}>
              <Text style={[styles.priceStrike, { color: colors.textQuaternary }]}>
                ₩{(monthlyPrice * 12).toLocaleString()}/년
              </Text>
              <Text style={[styles.priceMain, { color: colors.premium.gold }]}>
                ₩{yearlyPrice.toLocaleString()}/년
              </Text>
              <Text style={[styles.priceMonthly, { color: colors.textSecondary }]}>
                (월 ₩{monthlyEquivalent.toLocaleString()})
              </Text>
            </View>
          ) : (
            <View style={styles.priceRow}>
              <Text style={[styles.priceMain, { color: colors.premium.gold }]}>
                ₩{monthlyPrice.toLocaleString()}/월
              </Text>
            </View>
          )}
        </View>
      )}

      {/* CTA 버튼 */}
      {!isPremium && (
        <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              {
                backgroundColor: colors.premium.gold,
              },
            ]}
            onPress={onSubscribe}
            onPressIn={handleCtaPressIn}
            onPressOut={handleCtaPressOut}
            activeOpacity={0.8}
          >
            <Ionicons name="diamond" size={18} color="#1A1A1A" />
            <Text style={styles.ctaText}>
              {isYearly
                ? `연 ₩${yearlyPrice.toLocaleString()}으로 시작하기`
                : `월 ₩${monthlyPrice.toLocaleString()}으로 시작하기`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // 비교 테이블
  table: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  featureCell: {
    flex: 2,
  },
  featureCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  planCell: {
    flex: 2,
    alignItems: 'center',
  },
  planValue: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  premiumValue: {
    fontWeight: '600',
  },

  // 과금 주기 토글
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  billingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // 가격
  priceSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  priceRow: {
    alignItems: 'center',
    gap: 4,
  },
  priceStrike: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  priceMain: {
    fontSize: 24,
    fontWeight: '800',
  },
  priceMonthly: {
    fontSize: 13,
  },

  // CTA 버튼
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
});
