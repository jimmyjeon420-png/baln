/**
 * useSignatureMove — 구루별 시그니처 무브 애니메이션
 *
 * 역할: 각 동물 캐릭터가 주기적으로 고유의 특수 동작을 수행
 * 비유: 동물의숲 NPC가 가끔씩 하는 "특기 동작" — 올빼미는 머리를 돌리고,
 *       치타는 꼬리를 탁 치고, 거북이는 등껍질 안으로 숨는 것처럼
 *
 * guruMovementProfile.ts의 signatureMove / signatureMoveInterval /
 * signatureMoveDuration 데이터를 읽어서 React Native Animated로 실행
 *
 * 사용처:
 * - 마을 탭: 캐릭터 컨테이너에 signatureStyle 적용
 * - 구루 상세: triggerMove()로 수동 실행
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Animated } from 'react-native';
import { getGuruProfile } from '../../../data/guruMovementProfile';

// ============================================================================
// 타입
// ============================================================================

interface UseSignatureMoveOptions {
  guruId: string;
  /** 애니메이션 활성 여부 (기본: true) */
  enabled?: boolean;
}

interface UseSignatureMoveResult {
  /** 캐릭터 컨테이너에 적용할 Animated 스타일 */
  signatureStyle: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transform: any[];
    opacity?: Animated.Value;
  };
  /** 시그니처 무브 재생 중 여부 */
  isPlaying: boolean;
  /** 시그니처 무브 수동 실행 */
  triggerMove: () => void;
}

// ============================================================================
// 애니메이션 빌더
// ============================================================================

/**
 * signatureMove 문자열에 따라 적절한 Animated.CompositeAnimation 생성
 *
 * 모든 애니메이션은 useNativeDriver: true를 사용하며,
 * rotate 값은 interpolate로 string 변환 (예: '45deg')
 */
function buildAnimation(
  move: string,
  duration: number,
  values: {
    scale: Animated.Value;
    rotate: Animated.Value;
    translateY: Animated.Value;
    opacity: Animated.Value;
  },
): Animated.CompositeAnimation | null {
  const { scale, rotate, translateY, opacity } = values;
  const nd = { useNativeDriver: true as const };

  switch (move) {
    // 올빼미: 머리 회전 45도 → 유지 → 복귀
    case 'headTurn': {
      const t1 = duration * 0.3;
      const t2 = duration * 0.4;
      const t3 = duration * 0.3;
      return Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: t1, ...nd }),
        Animated.delay(t2),
        Animated.timing(rotate, { toValue: 0, duration: t3, ...nd }),
      ]);
    }

    // 사슴: 귀 떨기 — 빠른 3회 진동
    case 'earTwitch': {
      const step = duration / 6;
      return Animated.sequence([
        Animated.timing(rotate, { toValue: 0.2, duration: step, ...nd }),
        Animated.timing(rotate, { toValue: -0.2, duration: step, ...nd }),
        Animated.timing(rotate, { toValue: 0.2, duration: step, ...nd }),
        Animated.timing(rotate, { toValue: -0.2, duration: step, ...nd }),
        Animated.timing(rotate, { toValue: 0.2, duration: step, ...nd }),
        Animated.timing(rotate, { toValue: 0, duration: step, ...nd }),
      ]);
    }

    // 여우: 꼬리 흔들기 — 빠른 3회 좌우
    case 'tailSwish': {
      const step = duration / 6;
      return Animated.sequence([
        Animated.timing(rotate, { toValue: 0.5, duration: step, ...nd }),
        Animated.timing(rotate, { toValue: -0.5, duration: step, ...nd }),
        Animated.timing(rotate, { toValue: 0.5, duration: step, ...nd }),
        Animated.timing(rotate, { toValue: -0.5, duration: step, ...nd }),
        Animated.timing(rotate, { toValue: 0.5, duration: step, ...nd }),
        Animated.timing(rotate, { toValue: 0, duration: step, ...nd }),
      ]);
    }

    // 치타: 꼬리 탁 — 한 번의 날카로운 움직임
    case 'tailFlick': {
      const half = duration / 2;
      return Animated.sequence([
        Animated.timing(rotate, { toValue: 0.67, duration: half * 0.4, ...nd }),
        Animated.timing(rotate, { toValue: 0, duration: half * 1.6, ...nd }),
      ]);
    }

    // 늑대: 하울 — 위로 올라가면서 살짝 커짐
    case 'howl': {
      const half = duration / 2;
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(translateY, { toValue: -12, duration: half, ...nd }),
          Animated.timing(translateY, { toValue: 0, duration: half, ...nd }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.1, duration: half, ...nd }),
          Animated.timing(scale, { toValue: 1, duration: half, ...nd }),
        ]),
      ]);
    }

    // 사자: 갈기 흔들기 — 크기 펄스 + 미세 회전
    case 'maneShake': {
      const quarter = duration / 4;
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.08, duration: quarter, ...nd }),
          Animated.timing(scale, { toValue: 1, duration: quarter, ...nd }),
          Animated.timing(scale, { toValue: 1.06, duration: quarter, ...nd }),
          Animated.timing(scale, { toValue: 1, duration: quarter, ...nd }),
        ]),
        Animated.sequence([
          Animated.timing(rotate, { toValue: 0.1, duration: quarter, ...nd }),
          Animated.timing(rotate, { toValue: -0.1, duration: quarter, ...nd }),
          Animated.timing(rotate, { toValue: 0.1, duration: quarter, ...nd }),
          Animated.timing(rotate, { toValue: 0, duration: quarter, ...nd }),
        ]),
      ]);
    }

    // 카멜레온: 색상 변환 — 크기 떨림 + 투명도 깜빡임
    case 'colorShift': {
      const fifth = duration / 5;
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 0.95, duration: fifth, ...nd }),
          Animated.timing(scale, { toValue: 1.05, duration: fifth, ...nd }),
          Animated.timing(scale, { toValue: 1, duration: fifth, ...nd }),
          Animated.delay(fifth * 2),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.7, duration: fifth, ...nd }),
          Animated.timing(opacity, { toValue: 1, duration: fifth, ...nd }),
          Animated.timing(opacity, { toValue: 0.8, duration: fifth, ...nd }),
          Animated.timing(opacity, { toValue: 1, duration: fifth, ...nd }),
          Animated.delay(fifth),
        ]),
      ]);
    }

    // 곰: 일어서기 — 위로 올라가서 잠시 멈춤 후 복귀
    case 'standUp': {
      const rise = duration * 0.3;
      const hold = duration * 0.4;
      const fall = duration * 0.3;
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(translateY, { toValue: -15, duration: rise, ...nd }),
          Animated.delay(hold),
          Animated.timing(translateY, { toValue: 0, duration: fall, ...nd }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.15, duration: rise, ...nd }),
          Animated.delay(hold),
          Animated.timing(scale, { toValue: 1, duration: fall, ...nd }),
        ]),
      ]);
    }

    // 거북이: 등껍질 숨기 — 느리게 줄어들기, 오래 유지, 느리게 복원
    case 'shellRetreat': {
      const shrink = duration * 0.2;
      const hold = duration * 0.6;
      const restore = duration * 0.2;
      return Animated.sequence([
        Animated.timing(scale, { toValue: 0.7, duration: shrink, ...nd }),
        Animated.delay(hold),
        Animated.timing(scale, { toValue: 1, duration: restore, ...nd }),
      ]);
    }

    // 호랑이: 스트레칭 — 옆으로 커졌다가 살짝 아래로 눌렸다 복원
    case 'stretch': {
      const third = duration / 3;
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.2, duration: third, ...nd }),
          Animated.timing(scale, { toValue: 1, duration: third * 2, ...nd }),
        ]),
        Animated.sequence([
          Animated.delay(third),
          Animated.timing(translateY, { toValue: 3, duration: third, ...nd }),
          Animated.timing(translateY, { toValue: 0, duration: third, ...nd }),
        ]),
      ]);
    }

    // 기본: 아무 동작 없음
    case 'idle':
    default:
      return null;
  }
}

// ============================================================================
// 훅
// ============================================================================

export function useSignatureMove(
  options: UseSignatureMoveOptions,
): UseSignatureMoveResult {
  const { guruId, enabled = true } = options;
  const profile = getGuruProfile(guruId);

  // Animated 값 (useRef로 안정적 참조)
  const scaleVal = useRef(new Animated.Value(1)).current;
  const rotateVal = useRef(new Animated.Value(0)).current;
  const translateYVal = useRef(new Animated.Value(0)).current;
  const opacityVal = useRef(new Animated.Value(1)).current;

  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // 모든 Animated 값을 초기 상태로 리셋
  const resetValues = useCallback(() => {
    scaleVal.setValue(1);
    rotateVal.setValue(0);
    translateYVal.setValue(0);
    opacityVal.setValue(1);
  }, [scaleVal, rotateVal, translateYVal, opacityVal]);

  // 시그니처 무브 1회 실행
  const triggerMove = useCallback(() => {
    if (isPlaying) return;

    const animation = buildAnimation(
      profile.signatureMove,
      profile.signatureMoveDuration,
      { scale: scaleVal, rotate: rotateVal, translateY: translateYVal, opacity: opacityVal },
    );

    if (!animation) return;

    setIsPlaying(true);
    animation.start(() => {
      if (mountedRef.current) {
        resetValues();
        setIsPlaying(false);
      }
    });
  }, [isPlaying, profile, scaleVal, rotateVal, translateYVal, opacityVal, resetValues]);

  // 주기적 자동 실행 타이머
  const scheduleNext = useCallback(() => {
    if (!enabled) return;

    const [min, max] = profile.signatureMoveInterval;
    const delay = min + Math.random() * (max - min);

    timerRef.current = setTimeout(() => {
      if (!mountedRef.current || !enabled) return;
      triggerMove();
      // 다음 예약은 애니메이션 완료 후 (duration + 약간의 여유)
      setTimeout(() => {
        if (mountedRef.current && enabled) {
          scheduleNext();
        }
      }, profile.signatureMoveDuration + 100);
    }, delay);
  }, [enabled, profile, triggerMove]);

  // 타이머 라이프사이클
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && profile.signatureMove !== 'idle') {
      scheduleNext();
    }

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      resetValues();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- resetValues and scheduleNext are stable refs
  }, [enabled, guruId]); // guruId 변경 시 재시작

  // rotate 보간 (숫자 → 문자열 각도)
  // rotateVal 범위: -1 ~ 0 ~ 1, move별로 다른 toValue 사용
  // headTurn: 0→1 = 0→45deg
  // earTwitch: 0→0.2 = 0→5deg
  // tailSwish: 0→0.5 = 0→15deg
  // tailFlick: 0→0.67 = 0→20deg
  // maneShake: 0→0.1 = 0→3deg
  // → 통일: rotateVal * 45 = 최종 각도
  const rotateInterpolation = rotateVal.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-45deg', '0deg', '45deg'],
  });

  return {
    signatureStyle: {
      transform: [
        { scale: scaleVal },
        { translateY: translateYVal },
        { rotate: rotateInterpolation },
      ],
      opacity: opacityVal,
    },
    isPlaying,
    triggerMove,
  };
}
