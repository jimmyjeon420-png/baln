/**
 * Market Drivers List 컴포넌트
 * 현재 시장을 움직이는 Top 3 요인 표시
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ViewStyle,
} from 'react-native';
import { MarketDriver } from '../types/kostolany';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../styles/theme';
import { useLocale } from '../context/LocaleContext';

interface MarketDriversListProps {
  drivers: MarketDriver[];
  containerStyle?: ViewStyle;
}

const MarketDriversList: React.FC<MarketDriversListProps> = ({
  drivers,
  containerStyle,
}) => {
  const { t } = useLocale();
  /**
   * 영향도 색상 매핑
   */
  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'HIGH':
        return COLORS.error;
      case 'MEDIUM':
        return COLORS.warning;
      case 'LOW':
      default:
        return COLORS.info;
    }
  };

  /**
   * 영향도 라벨
   */
  const getImpactLabel = (impact: string): string => {
    switch (impact) {
      case 'HIGH':
        return t('impact_level.high');
      case 'MEDIUM':
        return t('impact_level.medium');
      case 'LOW':
        return t('impact_level.low');
      default:
        return t('impact_level.info');
    }
  };

  /**
   * 개별 드라이버 카드
   */
  const renderDriver = ({ item, index }: { item: MarketDriver; index: number }) => {
    const impactColor = getImpactColor(item.impactLevel);

    return (
      <View
        style={[
          styles.driverCard,
          {
            backgroundColor: COLORS.surfaceLight,
            borderColor: COLORS.border,
            borderWidth: 1,
            marginBottom: index < drivers.length - 1 ? SIZES.md : 0,
          },
        ]}
      >
        {/* 순위 + 이모지 */}
        <View style={styles.headerRow}>
          <View style={styles.rankBadge}>
            <Text style={[TYPOGRAPHY.labelLarge, { color: COLORS.primary }]}>
              #{item.rank}
            </Text>
          </View>

          <Text style={styles.emojiIcon}>{item.emoji}</Text>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                TYPOGRAPHY.labelMedium,
                { color: COLORS.textPrimary },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>

          {/* 영향도 배지 */}
          <View
            style={[
              styles.impactBadge,
              {
                backgroundColor: impactColor + '30',
                borderColor: impactColor,
              },
            ]}
          >
            <Text
              style={[
                TYPOGRAPHY.labelSmall,
                {
                  color: impactColor,
                  fontWeight: '700',
                },
              ]}
            >
              {getImpactLabel(item.impactLevel)}
            </Text>
          </View>
        </View>

        {/* 설명 */}
        <Text
          style={[
            TYPOGRAPHY.bodySmall,
            {
              color: COLORS.textSecondary,
              marginTop: SIZES.md,
              lineHeight: 21,
            },
          ]}
        >
          {item.description}
        </Text>

        {/* 영향받는 자산 태그 */}
        {(item.affectedAssets ?? []).length > 0 && (
          <View style={{ marginTop: SIZES.md, flexDirection: 'row', flexWrap: 'wrap' }}>
            {(item.affectedAssets ?? []).map((asset, i) => (
              <View
                key={`${item.rank}-asset-${i}`}
                style={[
                  styles.assetTag,
                  {
                    backgroundColor: COLORS.border,
                    marginRight: SIZES.sm,
                    marginBottom: SIZES.xs,
                  },
                ]}
              >
                <Text
                  style={[
                    TYPOGRAPHY.labelSmall,
                    { color: COLORS.textTertiary },
                  ]}
                >
                  {asset}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (!drivers || drivers.length === 0) {
    return (
      <View style={[styles.container, containerStyle]}>
        <Text
          style={[
            TYPOGRAPHY.headingSmall,
            { color: COLORS.textPrimary, marginBottom: SIZES.lg },
          ]}
        >
          📰 시장 드라이버
        </Text>
        <View
          style={[
            styles.emptyBox,
            {
              backgroundColor: COLORS.surfaceLight,
              borderColor: COLORS.border,
            },
          ]}
        >
          <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textTertiary }]}>
            시장 데이터를 불러오는 중입니다...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Text
        style={[
          TYPOGRAPHY.headingSmall,
          { color: COLORS.textPrimary, marginBottom: SIZES.lg },
        ]}
      >
        📰 시장 드라이버
      </Text>

      <Text
        style={[
          TYPOGRAPHY.bodySmall,
          { color: COLORS.textTertiary, marginBottom: SIZES.md },
        ]}
      >
        오늘 시장을 움직이는 Top 3 요인
      </Text>

      <FlatList
        data={drivers}
        renderItem={renderDriver}
        keyExtractor={(item) => `driver-${item.rank}`}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        scrollEnabled={false}
        nestedScrollEnabled={false}
      />

      {/* 정보 박스 */}
      <View
        style={[
          styles.infoBox,
          {
            backgroundColor: COLORS.info + '10',
            borderColor: COLORS.info,
            marginTop: SIZES.lg,
          },
        ]}
      >
        <Text
          style={[
            TYPOGRAPHY.bodySmall,
            { color: COLORS.info, fontStyle: 'italic' },
          ]}
        >
          💡 이 정보는 교육용 Mock 데이터입니다. 실제 투자 결정은 신중하게 하세요.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  driverCard: {
    borderRadius: SIZES.rMd,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: SIZES.rMd,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  emojiIcon: {
    fontSize: SIZES.fXxl,
    marginRight: SIZES.md,
    lineHeight: SIZES.fXxl + 4,
  },
  impactBadge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.rSm,
    borderWidth: 1,
    marginLeft: SIZES.md,
  },
  assetTag: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.rSm,
  },
  emptyBox: {
    borderRadius: SIZES.rMd,
    borderWidth: 1,
    padding: SIZES.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    borderRadius: SIZES.rMd,
    borderWidth: 1,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
  },
});

export default MarketDriversList;
