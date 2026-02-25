/**
 * useActivityAnimation — 구루 활동별 전용 애니메이션
 *
 * 역할: 구루가 현재 하고 있는 활동(춤, 독서, 낚시 등)을 몸동작으로 표현
 * - 활동이 바뀌면 이전 애니메이션을 멈추고 새 애니메이션으로 교체
 * - isActive=false 이거나 activity가 없으면 변형 없이 정지
 * - 모든 애니메이션은 useNativeDriver: true 사용
 *
 * 비유: "캐릭터의 동작 연출 감독" — 춤출 때는 리듬감 있게, 낚시 때는
 *       기다리다가 가끔 찌가 당기는 느낌으로 각 활동에 맞는 몸짓을 만들어줌
 */

import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import type { GuruActivity } from '../../../types/village';

// ---------------------------------------------------------------------------
// Props & Return Types
// ---------------------------------------------------------------------------

interface UseActivityAnimationProps {
  /** 현재 구루 활동 */
  activity?: GuruActivity;
  /** false이면 애니메이션 없이 정지 (기본값 true) */
  isActive?: boolean;
}

interface ActivityAnimationResult {
  /** 캐릭터 몸체에 적용할 transform 스타일 */
  activityStyle: {
    transform: (
      | { rotate: Animated.AnimatedInterpolation<string> }
      | { translateX: Animated.Value | Animated.AnimatedInterpolation<number> }
      | { translateY: Animated.Value | Animated.AnimatedInterpolation<number> }
      | { scale: Animated.Value | Animated.AnimatedInterpolation<number> }
    )[];
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActivityAnimation({
  activity,
  isActive = true,
}: UseActivityAnimationProps): ActivityAnimationResult {
  // 모든 Animated.Value를 ref로 보관 (재렌더링 없이 유지)
  const rotateValue = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  // 현재 실행 중인 루프 애니메이션 참조
  const currentAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  // 낚시 전용 : 랜덤 타이밍 jerk 타이머
  const fishingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 모든 값을 identity(변형 없음) 상태로 초기화
  const resetValues = () => {
    rotateValue.setValue(0);
    translateX.setValue(0);
    translateY.setValue(0);
    scaleValue.setValue(1);
  };

  // 현재 실행 중인 애니메이션 + 타이머 전부 정지
  const stopAll = () => {
    currentAnimRef.current?.stop();
    currentAnimRef.current = null;
    if (fishingTimerRef.current) {
      clearTimeout(fishingTimerRef.current);
      fishingTimerRef.current = null;
    }
  };

  // ---------------------------------------------------------------------------
  // 활동별 애니메이션 팩토리
  // ---------------------------------------------------------------------------

  const buildAnimation = (act: GuruActivity): Animated.CompositeAnimation | null => {
    switch (act) {
      // -----------------------------------------------------------------------
      // 1. dancing — 리듬감 있는 좌우 회전 + 위아래 바운스
      //    느낌: 클럽 댄스처럼 신나고 통통 튐
      // -----------------------------------------------------------------------
      case 'dancing': {
        const rotateLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, {
              toValue: 1,      // → +8deg
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: -1,     // → -8deg
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ])
        );
        const bounceLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -6,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([rotateLoop, bounceLoop]);
      }

      // -----------------------------------------------------------------------
      // 2. singing — 부드러운 좌우 흔들림 + 미세 scale 펄스
      //    느낌: 자기 음악에 취해 천천히 몸을 흔드는 모습
      // -----------------------------------------------------------------------
      case 'singing': {
        const swayLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: 3,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: -3,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        );
        const pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleValue, {
              toValue: 1.04,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 1.0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([swayLoop, pulseLoop]);
      }

      // -----------------------------------------------------------------------
      // 3. exercising — 빠른 위아래 바운스 (점핑잭 느낌)
      //    느낌: 에너지 넘치게 뛰고 있는 모습
      // -----------------------------------------------------------------------
      case 'exercising': {
        const jumpLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -10,
              duration: 175,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 175,
              useNativeDriver: true,
            }),
          ])
        );
        // 착지할 때 살짝 납작해지는 스케일 연출
        const squishLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleValue, {
              toValue: 1.0,
              duration: 175,
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 0.96,   // 착지 순간 살짝 수직으로 눌림
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 1.0,
              duration: 115,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([jumpLoop, squishLoop]);
      }

      // -----------------------------------------------------------------------
      // 4. reading — 매우 느리고 조용한 끄덕임 + 미세 앞기울기
      //    느낌: 조용히 책에 집중하는 모습
      // -----------------------------------------------------------------------
      case 'reading': {
        const nodLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );
        const leanLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, {
              toValue: 0.25,    // → ~2deg
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([nodLoop, leanLoop]);
      }

      // -----------------------------------------------------------------------
      // 5. fishing — 느긋한 대기 (앞기울기 3deg) + 주기적 찌 당김 jerk
      //    느낌: 기다리다가 가끔 물고기가 물었을 때 깜짝 반응
      //    * jerk는 setInterval 대신 recursive setTimeout으로 구현
      // -----------------------------------------------------------------------
      case 'fishing': {
        // 기본 앞기울기 (3deg 고정)
        Animated.timing(rotateValue, {
          toValue: 0.375,   // → ~3deg (inputRange 기준 /8)
          duration: 600,
          useNativeDriver: true,
        }).start();

        // 낚싯대 찌 당김 — 4~6초 랜덤 간격으로 translateY -4 jerk
        const scheduleJerk = () => {
          const delay = 4000 + Math.random() * 2000;
          fishingTimerRef.current = setTimeout(() => {
            Animated.sequence([
              Animated.timing(translateY, {
                toValue: -4,
                duration: 80,
                useNativeDriver: true,
              }),
              Animated.timing(translateY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => scheduleJerk());
          }, delay);
        };
        scheduleJerk();

        // 루프 애니메이션 없음 → null 반환
        return null;
      }

      // -----------------------------------------------------------------------
      // 6. cooking — 냄비 젓는 팔 동작 (좌우 회전 + 위아래 bob)
      //    느낌: 냄비를 열심히 젓고 있는 모습
      // -----------------------------------------------------------------------
      case 'cooking': {
        const stirLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, {
              toValue: -0.625,  // → -5deg
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0.625,   // → +5deg
              duration: 250,
              useNativeDriver: true,
            }),
          ])
        );
        const bobLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -2,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 2,
              duration: 250,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([stirLoop, bobLoop]);
      }

      // -----------------------------------------------------------------------
      // 7. debating (roundtable용 별도 활동에 없지만 teaching/chess에 유사)
      //    실제로 village.ts에 없으므로 default로 빠지지만, 방어 목적으로 유지
      //    느낌: 열정적인 논쟁, 앞뒤로 흔들리며 강조 동작
      // -----------------------------------------------------------------------

      // -----------------------------------------------------------------------
      // 8. meditating — 매우 느린 심호흡 scale + 거의 없는 흔들림
      //    느낌: 선(禪), 평화로운 집중 상태
      // -----------------------------------------------------------------------
      case 'meditating': {
        const breathLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleValue, {
              toValue: 1.03,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 1.0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        );
        const microSwayLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, {
              toValue: 0.1,    // → 0.8deg, 거의 미동
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: -0.1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([breathLoop, microSwayLoop]);
      }

      // -----------------------------------------------------------------------
      // 9. yoga — 균형 잡기 동작: 느린 좌우 기울기 + 약간의 scale 호흡
      //    느낌: 나무 자세처럼 균형을 유지하려는 느낌
      // -----------------------------------------------------------------------
      case 'yoga': {
        const balanceLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, {
              toValue: 0.375,   // 3deg
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: -0.375,
              duration: 2400,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ])
        );
        const yogaBreathLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleValue, {
              toValue: 1.025,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 1.0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([balanceLoop, yogaBreathLoop]);
      }

      // -----------------------------------------------------------------------
      // 10. napping (sleeping) — 아주 느린 scale 호흡 + 아주 느린 Y 드리프트
      //     느낌: 낮잠 중의 부드러운 숨쉬기
      // -----------------------------------------------------------------------
      case 'napping': {
        const sleepBreathLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleValue, {
              toValue: 1.02,
              duration: 1250,
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 1.0,
              duration: 1250,
              useNativeDriver: true,
            }),
          ])
        );
        const driftLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: 1,
              duration: 1250,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: -1,
              duration: 2500,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 1250,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([sleepBreathLoop, driftLoop]);
      }

      // -----------------------------------------------------------------------
      // 11. debugging (trading-like) — 빠른 회전 jerk + 탭 느낌 Y
      //     느낌: 데이터/차트를 미친 듯이 분석하며 타이핑하는 모습 (머스크 스타일)
      // -----------------------------------------------------------------------
      case 'debugging': {
        const typingRotateLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, {
              toValue: -0.25,   // -2deg
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0.25,    // +2deg
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ])
        );
        const tapLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([typingRotateLoop, tapLoop]);
      }

      // -----------------------------------------------------------------------
      // 12. writing — 앞으로 살짝 기울고 집중하는 고개 끄덕임
      //     느낌: 메모/일기 쓰는 모습, reading보다 조금 더 앞으로 기울어짐
      // -----------------------------------------------------------------------
      case 'writing': {
        const writeNodLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: 1.5,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        );
        const writeLeanLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, {
              toValue: 0.375,   // ~3deg 앞기울기
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([writeNodLoop, writeLeanLoop]);
      }

      // -----------------------------------------------------------------------
      // 13. chess — 전략적 고민, 느린 좌우 머리 기울기 + 가끔 앞기울기
      //     느낌: 다음 수를 계산하며 체스판을 응시하는 모습
      // -----------------------------------------------------------------------
      case 'chess': {
        const thinkTiltLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, {
              toValue: -0.5,    // -4deg (왼쪽으로 고민 기울기)
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0.375,   // +3deg
              duration: 2400,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ])
        );
        return thinkTiltLoop;
      }

      // -----------------------------------------------------------------------
      // 14. tea_ceremony — 느리고 우아한 앞기울기 + 부드러운 scale 호흡
      //     느낌: 차를 천천히 마시며 평온한 시간을 즐기는 모습
      // -----------------------------------------------------------------------
      case 'tea_ceremony': {
        const teaSipLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, {
              toValue: 0.25,    // 2deg 앞기울기 (홀짝)
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0,
              duration: 1600,
              useNativeDriver: true,
            }),
          ])
        );
        const teaBreathLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleValue, {
              toValue: 1.02,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 1.0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([teaSipLoop, teaBreathLoop]);
      }

      // -----------------------------------------------------------------------
      // 15. birdwatching — 매우 느린 좌우 고개 돌리기
      //     느낌: 쌍안경으로 새를 찾듯 천천히 시선을 이동하는 모습
      // -----------------------------------------------------------------------
      case 'birdwatching': {
        const scanLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: -2,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: 2,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        );
        return scanLoop;
      }

      // -----------------------------------------------------------------------
      // 16. photography — 가끔 앞으로 살짝 기울며 셔터 누르는 느낌
      //     느낌: 뷰파인더를 들여다보며 순간을 포착하는 모습
      // -----------------------------------------------------------------------
      case 'photography': {
        const shutterLoop = Animated.loop(
          Animated.sequence([
            // 대기
            Animated.delay(1200),
            // 셔터 — 미세한 앞기울기 + scale 클릭
            Animated.parallel([
              Animated.timing(rotateValue, {
                toValue: 0.25,
                duration: 80,
                useNativeDriver: true,
              }),
              Animated.timing(scaleValue, {
                toValue: 0.98,
                duration: 80,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(rotateValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(scaleValue, {
                toValue: 1.0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
          ])
        );
        return shutterLoop;
      }

      // -----------------------------------------------------------------------
      // 17. surfing — 균형 잡기 (dancing처럼 강하지만 더 낮고 넓게)
      //     느낌: 파도 위에서 균형 잡는 모습
      // -----------------------------------------------------------------------
      case 'surfing': {
        const surfRockLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, {
              toValue: 0.75,    // 6deg
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: -0.75,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        );
        const surfBobLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -4,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 4,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([surfRockLoop, surfBobLoop]);
      }

      // -----------------------------------------------------------------------
      // 18. painting / gardening / stargazing — 기본 gentle sway (idle+)
      //     느낌: 무언가에 집중하면서 자연스럽게 몸을 조금씩 흔드는 모습
      // -----------------------------------------------------------------------
      case 'painting':
      case 'gardening':
      case 'stargazing':
      default: {
        // 기본 gentle sway — idle보다 약간 더 뚜렷한 좌우 흔들림
        const gentleSwayLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: 2,
              duration: 900,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: -2,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: 0,
              duration: 900,
              useNativeDriver: true,
            }),
          ])
        );
        const gentleBreathLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleValue, {
              toValue: 1.02,
              duration: 900,
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 1.0,
              duration: 900,
              useNativeDriver: true,
            }),
          ])
        );
        return Animated.parallel([gentleSwayLoop, gentleBreathLoop]);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Effect: activity 변경 시 애니메이션 교체
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // 이전 애니메이션 정지 + 값 초기화
    stopAll();
    resetValues();

    // 비활성 상태이거나 activity가 없으면 정지
    if (!isActive || !activity) {
      return;
    }

    const anim = buildAnimation(activity);
    if (anim) {
      currentAnimRef.current = anim;
      anim.start();
    }

    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, isActive]);

  // ---------------------------------------------------------------------------
  // rotate 값 → deg 문자열 보간 (useNativeDriver 호환)
  // inputRange: -1 ~ +1 → outputRange: '-8deg' ~ '+8deg'
  // ---------------------------------------------------------------------------
  const rotate = rotateValue.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  return {
    activityStyle: {
      transform: [
        { rotate },
        { translateX },
        { translateY },
        { scale: scaleValue },
      ],
    },
  };
}
