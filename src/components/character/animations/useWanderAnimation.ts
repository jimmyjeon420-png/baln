/**
 * useWanderAnimation — 동물의숲 NPC 스타일 배회 애니메이션
 *
 * 역할: 마을 구루 캐릭터들이 3~4걸음 걷다가 잠깐 멈추고,
 *       다시 새로운 방향으로 걷는 "뚝뚝 끊기는" 움직임을 구현
 *
 * 비유: 동물의숲에서 NPC가 광장을 돌아다니는 그 느낌 —
 *       부드럽게 미끄러지는 게 아니라, 탁탁탁 걷다가 멈추는 느낌
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { getGuruProfile } from '../../../data/guruMovementProfile';
import type { GuruMovementProfile } from '../../../data/guruMovementProfile';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

interface UseWanderAnimationProps {
  /** 배회 활성화 여부 (기본값: true) */
  enabled?: boolean;
  /**
   * 이동 가능 영역 (부모 크기 대비 비율, 0~1)
   * 픽셀이 아닌 배율이므로 부모 컨테이너 크기와 무관하게 동작
   */
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  /** 속도 배율 (기본값: 1) */
  speed?: number;
  /**
   * 현재 활동 유형 — 활동에 따라 배회 여부/속도가 달라짐
   * 'sleeping' | 'meditating' | 'reading' | 'fishing' → 배회 없음
   * 'exercising' → 빠르게 배회
   * 'dancing'    → 느리게, 방향 전환 잦게
   * 'walking' 또는 기타 → 기본 배회
   */
  activity?: string;
  /** 구루 ID — 동물별 고유 움직임 프로필 적용 */
  guruId?: string;
}

interface WanderAnimationResult {
  /** 위치 오프셋 transform (translateX, translateY) */
  wanderStyle: {
    transform: (
      | { translateX: Animated.Value }
      | { translateY: Animated.Value }
    )[];
  };
  /** 현재 이동 중 여부 (true = 걷는 중, false = 멈춤) */
  isMoving: boolean;
}

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

/** 한 번에 이동할 최소/최대 픽셀 (느리게 — 동물의숲 템포) */
const MIN_MOVE_PX = 6;
const MAX_MOVE_PX = 14;

/** 이동 시 한 "발자국"의 길이 (전체 이동량을 이 단위로 쪼갬) */
const STEP_SIZE_PX = 4;

/** 각 발자국 애니메이션 지속 시간 (ms) — 느린 걸음 */
const STEP_DURATION_MS = 250;

/** 발자국 사이 미세 정지 시간 (ms) */
const STEP_PAUSE_MS = 120;

/** 멈춤 구간 최소/최대 시간 (ms) — 오래 쉬기 */
const MIN_PAUSE_MS = 3000;
const MAX_PAUSE_MS = 8000;

/** "그냥 한 번 더 서 있을" 확률 (0~1) */
const STAY_STILL_CHANCE = 0.45;

/** 기본 이동 가능 영역 (픽셀 오프셋 기준) — 범위 축소 */
const DEFAULT_BOUNDS = { minX: -25, maxX: 25, minY: -15, maxY: 15 };

// ─────────────────────────────────────────────
// 유틸 함수
// ─────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 현재 위치에서 delta만큼 이동했을 때 경계를 벗어나는지 확인.
 * 벗어나면 반대 방향 또는 0으로 클램프한 delta를 반환.
 */
function clampDelta(
  current: number,
  delta: number,
  min: number,
  max: number
): number {
  const next = current + delta;
  if (next > max) return max - current;
  if (next < min) return min - current;
  return delta;
}

/**
 * 활동 유형에 따라 배회 가능 여부와 속도 배율을 반환.
 */
function resolveActivityConfig(activity?: string): {
  shouldWander: boolean;
  speedMultiplier: number;
  directionChangeBias: number; // 방향 전환 빈도 (1 = 보통, 2 = 자주)
} {
  switch (activity) {
    case 'sleeping':
    case 'meditating':
    case 'reading':
    case 'fishing':
      return { shouldWander: false, speedMultiplier: 1, directionChangeBias: 1 };
    case 'exercising':
      return { shouldWander: true, speedMultiplier: 1.3, directionChangeBias: 1 };
    case 'dancing':
      return { shouldWander: true, speedMultiplier: 0.7, directionChangeBias: 2 };
    case 'walking':
    default:
      return { shouldWander: true, speedMultiplier: 1, directionChangeBias: 1 };
  }
}

// ─────────────────────────────────────────────
// 메인 훅
// ─────────────────────────────────────────────

export function useWanderAnimation({
  enabled = true,
  bounds = DEFAULT_BOUNDS,
  speed = 1,
  activity,
  guruId,
}: UseWanderAnimationProps = {}): WanderAnimationResult {

  // 구루별 동물 프로필 — 거북이는 아주 느리게, 치타는 빠르게
  const profile: GuruMovementProfile = guruId ? getGuruProfile(guruId) : getGuruProfile('default');
  // 프로필 속도를 기본 speed에 곱함 (0.3 거북이 ~ 1.8 치타)
  const effectiveSpeed = speed * profile.wanderSpeed;

  // Animated.Value — useNativeDriver: true 사용
  const offsetX = useRef(new Animated.Value(0)).current;
  const offsetY = useRef(new Animated.Value(0)).current;

  // 현재 실제 위치 (Ref로 관리 — setState 없이 mutable 추적)
  const positionRef = useRef({ x: 0, y: 0 });

  // 현재 이동 중 여부
  const [isMoving, setIsMoving] = useState(false);

  // 타이머/애니메이션 cleanup용
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // mounted 여부 (cleanup 시 setState 방지)
  const mountedRef = useRef(true);

  // ── enabled=false 시 원점으로 복귀 ──────────────────
  const returnToOrigin = useCallback(() => {
    if (activeAnimationRef.current) {
      activeAnimationRef.current.stop();
      activeAnimationRef.current = null;
    }
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    if (mountedRef.current) setIsMoving(false);

    const returnAnim = Animated.parallel([
      Animated.timing(offsetX, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(offsetY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    returnAnim.start(() => {
      positionRef.current = { x: 0, y: 0 };
    });
    activeAnimationRef.current = returnAnim;
  }, [offsetX, offsetY]);

  // ── 한 사이클: 이동 → 멈춤 → 반복 ─────────────────
  const runCycle = useCallback(
    (activityConfig: ReturnType<typeof resolveActivityConfig>) => {
      if (!mountedRef.current) return;

      // 프로필 기반 멈춤 확률 (거북이 60%, 여우 15%)
      const idleChance = Math.max(STAY_STILL_CHANCE, profile.idleChance);
      if (Math.random() < idleChance / activityConfig.directionChangeBias) {
        if (mountedRef.current) setIsMoving(false);
        // 프로필 기반 멈춤 시간 (거북이 5~10초, 여우 0.8~2초)
        const [pauseMin, pauseMax] = profile.pauseRange;
        const pauseDuration = randomBetween(
          Math.max(MIN_PAUSE_MS, pauseMin),
          Math.max(MAX_PAUSE_MS, pauseMax),
        );
        cycleTimerRef.current = setTimeout(() => {
          runCycle(activityConfig);
        }, pauseDuration);
        return;
      }

      // ── 이동 방향 및 거리 결정 (프로필 stepSize 기반) ──
      const profileStepPx = profile.stepSize * profile.stepsPerBurst;
      const movePx = randomBetween(
        Math.min(MIN_MOVE_PX, profileStepPx * 0.5),
        Math.max(MAX_MOVE_PX, profileStepPx),
      ) * effectiveSpeed * activityConfig.speedMultiplier;

      // X축과 Y축을 독립적으로 결정 (대각선 이동 포함)
      const rawDx = (Math.random() - 0.5) * 2 * movePx;
      const rawDy = (Math.random() - 0.5) * 2 * (movePx * 0.6); // Y는 X보다 조금 작게

      const dx = clampDelta(positionRef.current.x, rawDx, bounds.minX, bounds.maxX);
      const dy = clampDelta(positionRef.current.y, rawDy, bounds.minY, bounds.maxY);

      // 이동량이 너무 작으면 그냥 멈춤
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
        if (mountedRef.current) setIsMoving(false);
        const [pauseMin, pauseMax] = profile.pauseRange;
        const pauseDuration = randomBetween(
          Math.max(MIN_PAUSE_MS, pauseMin),
          Math.max(MAX_PAUSE_MS, pauseMax),
        );
        cycleTimerRef.current = setTimeout(() => {
          runCycle(activityConfig);
        }, pauseDuration);
        return;
      }

      // ── 발자국 시퀀스 생성 (프로필 stepSize 적용) ──
      const stepPx = Math.max(STEP_SIZE_PX, profile.stepSize);
      const totalSteps = Math.min(
        profile.stepsPerBurst,
        Math.max(Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / stepPx), 1),
      );

      const startX = positionRef.current.x;
      const startY = positionRef.current.y;
      const targetX = startX + dx;
      const targetY = startY + dy;

      // X, Y 각각의 발자국 애니메이션 배열
      const xStepAnims: Animated.CompositeAnimation[] = [];
      const yStepAnims: Animated.CompositeAnimation[] = [];

      for (let i = 1; i <= totalSteps; i++) {
        const progress = i / totalSteps;
        const stepX = startX + dx * progress;
        const stepY = startY + dy * progress;

        // X 발자국 (이동 + 발자국 사이 미세 정지) — 프로필 속도 반영
        const stepDur = Math.round(STEP_DURATION_MS / effectiveSpeed);
        const stepPause = Math.round(STEP_PAUSE_MS / effectiveSpeed);
        xStepAnims.push(
          Animated.timing(offsetX, {
            toValue: stepX,
            duration: stepDur,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        if (i < totalSteps) {
          xStepAnims.push(Animated.delay(stepPause));
        }

        // Y 발자국
        yStepAnims.push(
          Animated.timing(offsetY, {
            toValue: stepY,
            duration: stepDur,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        if (i < totalSteps) {
          yStepAnims.push(Animated.delay(stepPause));
        }
      }

      // X와 Y를 동시에 실행 (parallel), 각 축 내부는 sequence
      const moveAnimation = Animated.parallel([
        Animated.sequence(xStepAnims),
        Animated.sequence(yStepAnims),
      ]);

      if (mountedRef.current) setIsMoving(true);
      activeAnimationRef.current = moveAnimation;

      moveAnimation.start(({ finished }) => {
        if (!mountedRef.current) return;

        if (finished) {
          // 실제 위치 업데이트
          positionRef.current = { x: targetX, y: targetY };
        }

        if (mountedRef.current) setIsMoving(false);

        // ── 멈춤 구간 (프로필 기반) ──
        const [pMin, pMax] = profile.pauseRange;
        const pauseDuration = randomBetween(
          Math.max(MIN_PAUSE_MS, pMin),
          Math.max(MAX_PAUSE_MS, pMax),
        );
        cycleTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            runCycle(activityConfig);
          }
        }, pauseDuration);
      });
    },
    [offsetX, offsetY, bounds, effectiveSpeed, profile]
  );

  // ── 메인 effect ─────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    const activityConfig = resolveActivityConfig(activity);

    if (!enabled || !activityConfig.shouldWander) {
      // 배회 불가 상태 → 원점으로 복귀
      returnToOrigin();
      return () => {
        // cleanup (아래 공통 cleanup에서 처리)
      };
    }

    // 첫 사이클 시작 (약간의 딜레이로 다른 캐릭터들과 타이밍 분산)
    const initialDelay = randomBetween(0, 1500);
    cycleTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        runCycle(activityConfig);
      }
    }, initialDelay);

    return () => {
      mountedRef.current = false;

      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      if (activeAnimationRef.current) {
        activeAnimationRef.current.stop();
        activeAnimationRef.current = null;
      }
    };
  }, [enabled, activity, effectiveSpeed, bounds, runCycle, returnToOrigin]);

  // ── 언마운트 시 mountedRef 초기화 ───────────────────
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    wanderStyle: {
      transform: [
        { translateX: offsetX },
        { translateY: offsetY },
      ],
    },
    isMoving,
  };
}
