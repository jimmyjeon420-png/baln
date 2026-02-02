/**
 * 픽토그램 아이콘 컴포넌트
 * 간단한 기하학적 디자인의 아이콘들 (React Native 전용)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';

interface PictogramIconProps {
  name: 'home' | 'invest' | 'strategy' | 'journal' | 'menu';
  size?: number;
  focused?: boolean;
}

const PictogramIcon: React.FC<PictogramIconProps> = ({
  name,
  size = 24,
  focused = false,
}) => {
  const iconColor = focused ? COLORS.textPrimary : COLORS.textSecondary;

  switch (name) {
    case 'home': // 집 모양
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          {/* 지붕 (삼각형) */}
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size * 0.5,
              borderRightWidth: size * 0.5,
              borderBottomWidth: size * 0.35,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: iconColor,
            }}
          />
          {/* 본체 (정사각형) */}
          <View
            style={{
              width: size * 0.7,
              height: size * 0.4,
              backgroundColor: iconColor,
            }}
          />
          {/* 문 (가는 사각형) */}
          <View
            style={{
              width: 2,
              height: size * 0.2,
              backgroundColor: COLORS.surface,
              position: 'absolute',
              bottom: size * 0.05,
            }}
          />
        </View>
      );

    case 'invest': // 상승 차트 (계단 모양)
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          {/* 첫번째 막대 */}
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.1,
              left: size * 0.05,
              width: 3,
              height: size * 0.3,
              backgroundColor: iconColor,
            }}
          />
          {/* 두번째 막대 */}
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.35,
              left: size * 0.35,
              width: 3,
              height: size * 0.55,
              backgroundColor: iconColor,
            }}
          />
          {/* 세번째 막대 */}
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.2,
              right: size * 0.05,
              width: 3,
              height: size * 0.7,
              backgroundColor: iconColor,
            }}
          />
        </View>
      );

    case 'strategy': // 전략 - 체스 말 모양
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          {/* 왕관 */}
          <View
            style={{
              width: size * 0.6,
              height: size * 0.25,
              backgroundColor: iconColor,
              borderRadius: size * 0.05,
              marginBottom: -2,
            }}
          />
          {/* 몸체 */}
          <View
            style={{
              width: size * 0.5,
              height: size * 0.35,
              backgroundColor: iconColor,
              borderRadius: size * 0.08,
              marginBottom: -2,
            }}
          />
          {/* 받침대 */}
          <View
            style={{
              width: size * 0.7,
              height: 2,
              backgroundColor: iconColor,
            }}
          />
        </View>
      );

    case 'journal': // 기록 - 노트 모양
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          {/* 외곽 (책 모양) */}
          <View
            style={{
              width: size * 0.65,
              height: size * 0.75,
              borderWidth: 2,
              borderColor: iconColor,
              borderRadius: size * 0.05,
              padding: size * 0.08,
              justifyContent: 'space-around',
            }}
          >
            {/* 첫번째 줄 */}
            <View
              style={{
                height: 2,
                width: '80%',
                backgroundColor: iconColor,
              }}
            />
            {/* 두번째 줄 */}
            <View
              style={{
                height: 2,
                width: '100%',
                backgroundColor: iconColor,
              }}
            />
            {/* 세번째 줄 */}
            <View
              style={{
                height: 2,
                width: '90%',
                backgroundColor: iconColor,
              }}
            />
          </View>
        </View>
      );

    case 'menu': // 메뉴 - 세로 줄들
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          {/* 위 줄 */}
          <View
            style={{
              width: size * 0.6,
              height: 2,
              backgroundColor: iconColor,
              marginBottom: size * 0.15,
            }}
          />
          {/* 중간 줄 */}
          <View
            style={{
              width: size * 0.6,
              height: 2,
              backgroundColor: iconColor,
              marginBottom: size * 0.15,
            }}
          />
          {/* 아래 줄 */}
          <View
            style={{
              width: size * 0.6,
              height: 2,
              backgroundColor: iconColor,
            }}
          />
        </View>
      );

    default:
      return null;
  }
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PictogramIcon;
