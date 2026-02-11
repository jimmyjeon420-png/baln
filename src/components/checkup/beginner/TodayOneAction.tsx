/**
 * TodayOneAction - 오늘 할 일 카드
 *
 * AI 분석 결과에서 가장 우선순위 높은 액션 하나만 표시.
 * 초보자가 "지금 뭘 해야 하는지" 바로 알 수 있도록.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';

type ActionType = 'BUY' | 'HOLD' | 'SELL' | 'WATCH';

interface ActionItem {
  ticker: string;
  name: string;
  action: ActionType;
  reason: string;
  priority: string;
}

interface TodayOneActionProps {
  action: ActionItem | null;
  isAILoading: boolean;
}

function getActionConfig(actionType: ActionType, colors: any) {
  const config: Record<ActionType, { label: string; color: string; bgColor: string }> = {
    BUY: { label: '매수', color: colors.buy, bgColor: `${colors.buy}20` },
    HOLD: { label: '유지', color: colors.hold, bgColor: `${colors.hold}20` },
    SELL: { label: '매도', color: colors.sell, bgColor: `${colors.sell}20` },
    WATCH: { label: '관심', color: colors.warning, bgColor: `${colors.warning}20` },
  };
  return config[actionType];
}

function PulsingDot({ dotColor }: { dotColor: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[{ backgroundColor: dotColor }, pulsingDotStyle, { opacity }]} />
  );
}

const pulsingDotStyle = {
  width: 10,
  height: 10,
  borderRadius: 5,
};

export default function TodayOneAction({ action, isAILoading }: TodayOneActionProps) {
  const { colors } = useTheme();

  const actionConfig = useMemo(
    () => (action ? getActionConfig(action.action, colors) : null),
    [action, colors],
  );

  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{'이번 달 처방전'}</Text>

      {isAILoading && (
        <View style={styles.loadingRow}>
          <PulsingDot dotColor={colors.primary} />
          <Text style={styles.loadingText}>AI가 분석 중이에요...</Text>
        </View>
      )}

      {!isAILoading && !action && (
        <Text style={styles.emptyText}>
          {'이번 달은 특별히 할 일이 없어요 \uD83D\uDC4D'}
        </Text>
      )}

      {!isAILoading && action && actionConfig && (
        <View style={styles.actionContainer}>
          <View style={styles.actionHeader}>
            <View
              style={[
                styles.badge,
                { backgroundColor: actionConfig.bgColor },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: actionConfig.color },
                ]}
              >
                {actionConfig.label}
              </Text>
            </View>

            <View style={styles.tickerInfo}>
              <Text style={styles.tickerName}>{action.name}</Text>
              <Text style={styles.tickerCode}>{action.ticker}</Text>
            </View>
          </View>

          <Text style={styles.reason}>{action.reason}</Text>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: 24,
      marginHorizontal: 16,
      marginTop: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    actionContainer: {
      gap: 12,
    },
    actionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 14,
      fontWeight: '700',
    },
    tickerInfo: {
      flex: 1,
    },
    tickerName: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    tickerCode: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 2,
    },
    reason: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
  });
}
