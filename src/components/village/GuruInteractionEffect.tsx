/**
 * GuruInteractionEffect -- 구루 관계 상호작용 시각 효과
 *
 * 역할: 마을에서 구루 간 관계를 시각적으로 표현
 *       동맹 = 하트 파티클 루프, 라이벌 = 번개 스파크, 파벌 회의 = 회의 표시
 * 비유: "구루들 사이의 보이지 않는 연결선" -- 관계를 눈에 보이게 만드는 이펙트
 *
 * 사용처:
 * - 마을 탭에서 구루 위치 기반으로 관계 이펙트 오버레이
 * - GuruVillage 컴포넌트에서 구루 쌍별 관계 데이터를 전달
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

export interface InteractionPair {
  /** 구루 1 ID */
  guru1Id: string;
  /** 구루 2 ID */
  guru2Id: string;
  /** 관계 유형 */
  relation: 'ally' | 'rival' | 'neutral';
  /** 두 구루 중간점 x (0~1 비율) */
  midX: number;
  /** 두 구루 중간점 y (0~1 비율) */
  midY: number;
  /** 두 구루 사이 거리 (0~1 비율) */
  distance: number;
  /** 같은 파벌 3인 회의 여부 (상위에서 계산) */
  isFactionMeeting?: boolean;
}

interface GuruInteractionEffectProps {
  /** 상호작용 쌍 목록 */
  interactions: InteractionPair[];
  /** 화면 너비 (좌표 변환용) */
  screenWidth: number;
}

// ============================================================================
// 개별 이펙트 컴포넌트들
// ============================================================================

/** 동맹 하트 이펙트 -- 초록 하트가 위로 떠올라 사라짐 (3초 루프) */
function AllyHeartEffect({ x, y }: { x: number; y: number }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        // 하트 등장 + 떠오름
        Animated.parallel([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 1600,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // 리셋 대기
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim, opacityAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, -24],
  });

  return (
    <Animated.View
      style={[
        styles.effectBase,
        {
          left: x - 10,
          top: y - 10,
          opacity: opacityAnim,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.heartEmoji}>{'\uD83D\uDC9A'}</Text>
    </Animated.View>
  );
}

/** 라이벌 번개 이펙트 -- 번개가 주기적으로 번쩍 (2초 루프) */
function RivalSparkEffect({ x, y }: { x: number; y: number }) {
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1700),
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flashAnim]);

  return (
    <Animated.View
      style={[
        styles.effectBase,
        {
          left: x - 8,
          top: y - 8,
          opacity: flashAnim,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.sparkEmoji}>{'\u26A1'}</Text>
    </Animated.View>
  );
}

/** 파벌 회의 표시 -- 부드러운 펄스 스케일 애니메이션 */
function FactionMeetingEffect({
  x,
  y,
  isKo,
}: {
  x: number;
  y: number;
  isKo: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.meetingContainer,
        {
          left: x - 50,
          top: y - 12,
          transform: [{ scale: pulseAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.meetingText}>
        {isKo ? '\uD83E\uDD1D 파벌 회의 중' : '\uD83E\uDD1D Faction meeting'}
      </Text>
    </Animated.View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function GuruInteractionEffect({
  interactions,
  screenWidth,
}: GuruInteractionEffectProps) {
  const { language } = useLocale();
  const isKo = language === 'ko';
  const screenHeight = Dimensions.get('window').height;

  // 이펙트 렌더링 목록 메모이제이션
  const effects = useMemo(() => {
    if (!interactions || interactions.length === 0) return [];

    return interactions
      .filter((pair) => {
        // 동맹: 거리 0.12 이내, 라이벌: 거리 0.10 이내
        if (pair.relation === 'ally' && pair.distance < 0.12) return true;
        if (pair.relation === 'rival' && pair.distance < 0.10) return true;
        if (pair.isFactionMeeting) return true;
        return false;
      })
      .map((pair) => ({
        ...pair,
        pixelX: pair.midX * screenWidth,
        pixelY: pair.midY * screenHeight * 0.5, // 마을 영역은 상단 50% 정도
      }));
  }, [interactions, screenWidth, screenHeight]);

  if (effects.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {effects.map((effect, idx) => {
        if (effect.isFactionMeeting) {
          return (
            <FactionMeetingEffect
              key={`meeting-${idx}`}
              x={effect.pixelX}
              y={effect.pixelY}
              isKo={isKo}
            />
          );
        }

        if (effect.relation === 'ally') {
          return (
            <AllyHeartEffect
              key={`ally-${effect.guru1Id}-${effect.guru2Id}`}
              x={effect.pixelX}
              y={effect.pixelY}
            />
          );
        }

        if (effect.relation === 'rival') {
          return (
            <RivalSparkEffect
              key={`rival-${effect.guru1Id}-${effect.guru2Id}`}
              x={effect.pixelX}
              y={effect.pixelY}
            />
          );
        }

        return null;
      })}
    </View>
  );
}

export default GuruInteractionEffect;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
  effectBase: {
    position: 'absolute',
  },
  heartEmoji: {
    fontSize: 18,
  },
  sparkEmoji: {
    fontSize: 16,
  },
  meetingContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  meetingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
