/**
 * MarketTicker - 글로벌 시장 현황 전광판
 *
 * 역할: 증권사 대기실 LED 전광판처럼 KOSPI, NASDAQ, BTC 등
 *       주요 시장 지표가 오른쪽에서 왼쪽으로 무한 스크롤되는 위젯
 *
 * 기술: React Native Animated API + 무한 루프 애니메이션
 * 구조: 동일한 아이템 목록을 2번 렌더링 → 첫 번째가 빠지면 두 번째가 이어받음
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useMarketTicker, MarketTickerItem } from '../../hooks/useMarketTicker';

// ═══════════════════════════════════════
// 가격 포맷 유틸 (toLocaleString 미사용 → Android 호환)
// ═══════════════════════════════════════

/** 숫자에 천 단위 콤마 추가 */
const addCommas = (str: string): string => {
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

/** 심볼별 적절한 가격 포맷 */
const formatPrice = (price: number, symbol: string): string => {
  // USD/KRW 환율
  if (symbol === 'KRW=X') {
    return `\u20A9${addCommas(Math.round(price).toString())}`;
  }
  // 암호화폐 (USD)
  if (symbol.includes('-USD')) {
    return price >= 100
      ? `$${addCommas(Math.round(price).toString())}`
      : `$${addCommas(price.toFixed(2))}`;
  }
  // 금 (USD)
  if (symbol === 'GC=F') {
    return `$${addCommas(price.toFixed(1))}`;
  }
  // 한국 지수 (소수점 2자리)
  if (symbol.startsWith('^KS') || symbol.startsWith('^KQ')) {
    return addCommas(price.toFixed(2));
  }
  // 미국 지수 (소수점 2자리)
  return addCommas(price.toFixed(2));
};

// ═══════════════════════════════════════
// 전광판 아이템 렌더링
// ═══════════════════════════════════════

interface TickerItemProps {
  item: MarketTickerItem;
  isLast: boolean;
}

const TickerItemView = ({ item, isLast }: TickerItemProps) => {
  const positive = item.changePercent >= 0;
  const changeColor = positive ? '#4CAF50' : '#CF6679';
  const arrow = positive ? '\u25B2' : '\u25BC'; // ▲ ▼

  return (
    <View style={s.item}>
      <Text style={s.label}>{item.label}</Text>
      <Text style={s.price}>{formatPrice(item.price, item.symbol)}</Text>
      <Text style={[s.change, { color: changeColor }]}>
        {arrow}{Math.abs(item.changePercent).toFixed(2)}%
      </Text>
      <Text style={s.dot}>{'\u00B7'}</Text>
    </View>
  );
};

// ═══════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════

export default function MarketTicker() {
  const { items, isLoading } = useMarketTicker();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // 무한 스크롤 애니메이션
  useEffect(() => {
    if (contentWidth <= 0 || items.length === 0) return;

    // 이전 애니메이션 정리
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }

    scrollX.setValue(0);

    // 속도: 1px당 25ms ≈ 40px/s (편안하게 읽을 수 있는 속도)
    animRef.current = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -contentWidth,
        duration: contentWidth * 25,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animRef.current.start();

    return () => {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
    };
  }, [contentWidth, items.length, scrollX]);

  // ─── 로딩 스켈레톤 ───
  if (isLoading) {
    return (
      <View style={s.container}>
        <View style={s.loadingRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={s.loadingBlock} />
          ))}
        </View>
      </View>
    );
  }

  // 데이터 없으면 숨김
  if (items.length === 0) return null;

  return (
    <View style={s.container}>
      <Animated.View style={[s.row, { transform: [{ translateX: scrollX }] }]}>

        {/* 복사본 1: 너비 측정 + 표시 */}
        <View
          style={s.innerRow}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setContentWidth(w);
          }}
        >
          {items.map((item, i) => (
            <TickerItemView
              key={`a-${i}`}
              item={item}
              isLast={i === items.length - 1}
            />
          ))}
        </View>

        {/* 복사본 2: 무한 루프 이음새 */}
        <View style={s.innerRow}>
          {items.map((item, i) => (
            <TickerItemView
              key={`b-${i}`}
              item={item}
              isLast={i === items.length - 1}
            />
          ))}
        </View>

      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════
// 스타일
// ═══════════════════════════════════════

const s = StyleSheet.create({
  container: {
    height: 38,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E1E1E',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  // ── 개별 아이템 ──
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777',
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  change: {
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    fontSize: 14,
    color: '#333',
    marginLeft: 6,
  },

  // ── 로딩 ──
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 24,
  },
  loadingBlock: {
    width: 80,
    height: 14,
    backgroundColor: '#1A1A1A',
    borderRadius: 4,
  },
});
