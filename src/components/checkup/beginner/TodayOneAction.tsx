/**
 * TodayOneAction - 오늘 할 일 카드
 *
 * AI 분석 결과에서 가장 우선순위 높은 액션 하나만 표시.
 * 초보자가 "지금 뭘 해야 하는지" 바로 알 수 있도록.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

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

const ACTION_CONFIG: Record<ActionType, { label: string; color: string; bgColor: string }> = {
  BUY: { label: '매수', color: '#4CAF50', bgColor: '#4CAF5020' },
  HOLD: { label: '유지', color: '#4CAF50', bgColor: '#4CAF5020' },
  SELL: { label: '매도', color: '#CF6679', bgColor: '#CF667920' },
  WATCH: { label: '관심', color: '#FFB74D', bgColor: '#FFB74D20' },
};

function PulsingDot() {
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
    <Animated.View style={[s.pulsingDot, { opacity }]} />
  );
}

export default function TodayOneAction({ action, isAILoading }: TodayOneActionProps) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{'이번 달 처방전'}</Text>

      {isAILoading && (
        <View style={s.loadingRow}>
          <PulsingDot />
          <Text style={s.loadingText}>AI가 분석 중이에요...</Text>
        </View>
      )}

      {!isAILoading && !action && (
        <Text style={s.emptyText}>
          {'이번 달은 특별히 할 일이 없어요 \uD83D\uDC4D'}
        </Text>
      )}

      {!isAILoading && action && (
        <View style={s.actionContainer}>
          <View style={s.actionHeader}>
            <View
              style={[
                s.badge,
                { backgroundColor: ACTION_CONFIG[action.action].bgColor },
              ]}
            >
              <Text
                style={[
                  s.badgeText,
                  { color: ACTION_CONFIG[action.action].color },
                ]}
              >
                {ACTION_CONFIG[action.action].label}
              </Text>
            </View>

            <View style={s.tickerInfo}>
              <Text style={s.tickerName}>{action.name}</Text>
              <Text style={s.tickerCode}>{action.ticker}</Text>
            </View>
          </View>

          <Text style={s.reason}>{action.reason}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 24,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  loadingText: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  emptyText: {
    fontSize: 16,
    color: '#B0B0B0',
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
    color: '#FFFFFF',
  },
  tickerCode: {
    fontSize: 13,
    color: '#808080',
    marginTop: 2,
  },
  reason: {
    fontSize: 15,
    color: '#B0B0B0',
    lineHeight: 22,
  },
});
