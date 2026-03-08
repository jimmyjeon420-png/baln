/**
 * MoodParticles — 기분/활동 파티클 이펙트 오버레이
 *
 * 역할: 구루 캐릭터 주변에 감정과 활동을 표현하는 파티클을 띄우는 "이펙트 발생기"
 * 비유: "캐릭터 주변에 작은 아이콘들이 떠다니는 것 — 스타듀 밸리나 동물의숲 NPC 감정 표현"
 *
 * 파티클 배치 원칙:
 * - 캐릭터 얼굴/몸 위에 직접 올라오지 않음 → 가장자리 주변에 배치
 * - 최대 4~5개 파티클 (성능 고려)
 * - 활동(activity) 파티클이 있으면 기분(mood) 파티클보다 우선
 * - SvgText로 이모지 렌더링 (react-native-svg 지원)
 */

import React from 'react';
import Svg, { G, Circle, Path, Ellipse, Text as SvgText } from 'react-native-svg';
import type { GuruMood, GuruActivity } from '../../../types/village';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MoodParticlesProps {
  /** 캐릭터와 동일한 픽셀 크기 */
  size: number;
  /** 구루의 현재 기분 */
  mood: GuruMood;
  /** 구루의 현재 활동 (있으면 기분 파티클보다 우선) */
  activity?: GuruActivity;
}

// ---------------------------------------------------------------------------
// SVG 도형 기반 파티클 (이모지 대신 직접 그려서 크로스 플랫폼 안정성 확보)
// 파티클 위치는 캐릭터 외곽 (x: 4~18 또는 82~96, y: 4~30 범위)
// ---------------------------------------------------------------------------

/** 반짝임 별 (4방향 뾰족 별) */
function Sparkle({ x, y, size: s = 4, color = '#FFD54F', opacity = 0.8 }: {
  x: number; y: number; size?: number; color?: string; opacity?: number;
}) {
  const h = s * 2;
  return (
    <Path
      d={`M ${x} ${y - h} L ${x + s * 0.4} ${y - s * 0.4} L ${x + h} ${y} L ${x + s * 0.4} ${y + s * 0.4} L ${x} ${y + h} L ${x - s * 0.4} ${y + s * 0.4} L ${x - h} ${y} L ${x - s * 0.4} ${y - s * 0.4} Z`}
      fill={color}
      opacity={opacity}
    />
  );
}

/** 작은 하트 */
function _HeartParticle({ x, y, color = '#FF4081', opacity = 0.75 }: {
  x: number; y: number; color?: string; opacity?: number;
}) {
  return (
    <Path
      d={`M ${x} ${y + 3} Q ${x - 6} ${y - 2} ${x - 6} ${y - 4} Q ${x - 6} ${y - 8} ${x} ${y - 4} Q ${x + 6} ${y - 8} ${x + 6} ${y - 4} Q ${x + 6} ${y - 2} ${x} ${y + 3} Z`}
      fill={color}
      opacity={opacity}
    />
  );
}

/** 음표 (동그라미 + 기둥) */
function MusicNote({ x, y, color = '#CE93D8', opacity = 0.8 }: {
  x: number; y: number; color?: string; opacity?: number;
}) {
  return (
    <G opacity={opacity}>
      {/* 음표 머리 */}
      <Ellipse cx={x} cy={y + 4} rx={3} ry={2.5} fill={color} />
      {/* 음표 기둥 */}
      <Path d={`M ${x + 3} ${y + 4} L ${x + 3} ${y - 4}`} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* 음표 꼬리 */}
      <Path d={`M ${x + 3} ${y - 4} Q ${x + 7} ${y - 2} ${x + 5} ${y + 1}`} stroke={color} strokeWidth={1.2} strokeLinecap="round" fill="none" />
    </G>
  );
}

/** 번개 (지그재그) */
function Lightning({ x, y, color = '#FFD54F', opacity = 0.85 }: {
  x: number; y: number; color?: string; opacity?: number;
}) {
  return (
    <Path
      d={`M ${x + 2} ${y - 6} L ${x - 2} ${y} L ${x + 1} ${y} L ${x - 2} ${y + 6} L ${x + 4} ${y - 1} L ${x + 1} ${y - 1} Z`}
      fill={color}
      opacity={opacity}
    />
  );
}

/** 물방울 (눈물/땀) */
function WaterDrop({ x, y, color = '#64B5F6', opacity = 0.7 }: {
  x: number; y: number; color?: string; opacity?: number;
}) {
  return (
    <Path
      d={`M ${x} ${y - 5} Q ${x + 4} ${y} ${x} ${y + 5} Q ${x - 4} ${y} ${x} ${y - 5} Z`}
      fill={color}
      opacity={opacity}
    />
  );
}

/** 작은 녹색 잎 */
function Leaf({ x, y, color = '#66BB6A', opacity = 0.75 }: {
  x: number; y: number; color?: string; opacity?: number;
}) {
  return (
    <Path
      d={`M ${x} ${y + 5} Q ${x - 6} ${y - 2} ${x} ${y - 5} Q ${x + 6} ${y - 2} ${x} ${y + 5} Z`}
      fill={color}
      opacity={opacity}
    />
  );
}

/** 생각 거품 (작은 원 3개) */
function ThoughtBubbles({ x, y, color = '#E0E0E0', opacity = 0.6 }: {
  x: number; y: number; color?: string; opacity?: number;
}) {
  return (
    <G opacity={opacity}>
      <Circle cx={x} cy={y + 3} r={2} fill={color} />
      <Circle cx={x + 3} cy={y - 1} r={2.8} fill={color} />
      <Circle cx={x + 7} cy={y - 5} r={4} fill={color} />
      {/* 가장 큰 거품 하이라이트 */}
      <Circle cx={x + 6} cy={y - 7} r={1.5} fill="#FFFFFF" opacity={0.3} />
    </G>
  );
}

/** 걱정 선 (물결 모양) */
function WorryLines({ x, y, color = '#B0BEC5', opacity = 0.55 }: {
  x: number; y: number; color?: string; opacity?: number;
}) {
  return (
    <G opacity={opacity}>
      <Path d={`M ${x - 4} ${y - 2} Q ${x} ${y - 4} ${x + 4} ${y - 2}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d={`M ${x - 4} ${y + 2} Q ${x} ${y} ${x + 4} ${y + 2}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </G>
  );
}

/** 분노 마크 (# 기호 느낌의 흥분 마크) */
function AngerMark({ x, y, color = '#FF5252', opacity = 0.8 }: {
  x: number; y: number; color?: string; opacity?: number;
}) {
  return (
    <G opacity={opacity}>
      <Path d={`M ${x - 3} ${y - 3} Q ${x} ${y} ${x + 3} ${y - 3}`} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d={`M ${x - 3} ${y + 3} Q ${x} ${y} ${x + 3} ${y + 3}`} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </G>
  );
}

/** Zzz 수면 텍스트 */
function SleepZzz({ x, y, opacity = 0.6 }: { x: number; y: number; opacity?: number }) {
  return (
    <G opacity={opacity}>
      <SvgText x={x} y={y} fontSize={7} fill="#9575CD" fontWeight="bold">z</SvgText>
      <SvgText x={x + 5} y={y - 5} fontSize={9} fill="#7E57C2" fontWeight="bold">z</SvgText>
      <SvgText x={x + 11} y={y - 11} fontSize={11} fill="#673AB7" fontWeight="bold">Z</SvgText>
    </G>
  );
}

/** 별 (5방향 별 — 놀람/별보기용) */
function Star({ x, y, r = 4, color = '#FFD54F', opacity = 0.8 }: {
  x: number; y: number; r?: number; color?: string; opacity?: number;
}) {
  // 5각형 별 경로 계산
  const points: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outer = { x: x + r * Math.cos((i * 4 * Math.PI) / 5 - Math.PI / 2), y: y + r * Math.sin((i * 4 * Math.PI) / 5 - Math.PI / 2) };
    const inner = { x: x + (r * 0.4) * Math.cos(((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2), y: y + (r * 0.4) * Math.sin(((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2) };
    points.push(`${outer.x},${outer.y}`);
    points.push(`${inner.x},${inner.y}`);
  }
  return (
    <Path
      d={`M ${points.join(' L ')} Z`}
      fill={color}
      opacity={opacity}
    />
  );
}

/** 불꽃 (흥분 — 세모 불꽃) */
function Fire({ x, y, opacity = 0.75 }: { x: number; y: number; opacity?: number }) {
  return (
    <G opacity={opacity}>
      {/* 큰 불꽃 (주황) */}
      <Path
        d={`M ${x} ${y + 6} Q ${x - 5} ${y - 1} ${x} ${y - 6} Q ${x + 1} ${y - 2} ${x + 3} ${y - 5} Q ${x + 5} ${y - 1} ${x} ${y + 6} Z`}
        fill="#FF6F00"
      />
      {/* 안쪽 불꽃 (노랑) */}
      <Path
        d={`M ${x} ${y + 4} Q ${x - 3} ${y} ${x} ${y - 3} Q ${x + 2} ${y} ${x} ${y + 4} Z`}
        fill="#FFD54F"
      />
    </G>
  );
}

/** 작은 물고기 (낚시 활동용) */
function FishSplash({ x, y, opacity = 0.7 }: { x: number; y: number; opacity?: number }) {
  return (
    <G opacity={opacity}>
      {/* 물고기 몸통 */}
      <Ellipse cx={x} cy={y} rx={6} ry={3.5} fill="#4FC3F7" />
      {/* 물고기 꼬리 */}
      <Path d={`M ${x + 5} ${y} L ${x + 9} ${y - 4} L ${x + 9} ${y + 4} Z`} fill="#4FC3F7" />
      {/* 물고기 눈 */}
      <Circle cx={x - 3} cy={y - 1} r={1} fill="#FFFFFF" />
      {/* 물 튀김 */}
      <Path d={`M ${x - 4} ${y + 4} Q ${x} ${y + 7} ${x + 4} ${y + 4}`} fill="none" stroke="#81D4FA" strokeWidth={1.2} />
    </G>
  );
}

/** 증기 (요리 활동용) */
function Steam({ x, y, opacity = 0.5 }: { x: number; y: number; opacity?: number }) {
  return (
    <G opacity={opacity}>
      <Path d={`M ${x} ${y} Q ${x - 3} ${y - 4} ${x} ${y - 8} Q ${x + 3} ${y - 12} ${x} ${y - 16}`} fill="none" stroke="#CFD8DC" strokeWidth={2} strokeLinecap="round" />
      <Path d={`M ${x + 6} ${y - 2} Q ${x + 3} ${y - 6} ${x + 6} ${y - 10} Q ${x + 9} ${y - 14} ${x + 6} ${y - 18}`} fill="none" stroke="#CFD8DC" strokeWidth={2} strokeLinecap="round" />
    </G>
  );
}

/** 페인트 방울 (그림 그리기 활동용) */
function PaintDrops({ x, y, color = '#AB47BC', opacity = 0.75 }: {
  x: number; y: number; color?: string; opacity?: number;
}) {
  return (
    <G opacity={opacity}>
      <Circle cx={x} cy={y} r={3.5} fill={color} />
      <Circle cx={x + 7} cy={y + 4} r={2.5} fill="#66BB6A" />
      <Circle cx={x + 3} cy={y + 9} r={2} fill="#FFB74D" />
    </G>
  );
}

// ---------------------------------------------------------------------------
// 기분별 파티클 배치 설정
// ---------------------------------------------------------------------------

/** 기쁨 (joy / joyful) — 반짝임 + 음표 */
function JoyParticles() {
  return (
    <G>
      <Sparkle x={16} y={18} size={3.5} color="#FFD54F" opacity={0.85} />
      <Sparkle x={84} y={14} size={4} color="#FFD54F" opacity={0.8} />
      <MusicNote x={78} y={28} color="#CE93D8" opacity={0.75} />
      <Sparkle x={12} y={32} size={2.5} color="#FFFFFF" opacity={0.6} />
    </G>
  );
}

/** 흥분 (excited) — 번개 + 불꽃 */
function ExcitedParticles() {
  return (
    <G>
      <Lightning x={15} y={18} color="#FFD54F" opacity={0.9} />
      <Lightning x={83} y={22} color="#FFA726" opacity={0.85} />
      <Fire x={12} y={38} opacity={0.75} />
      <Sparkle x={86} y={36} size={3} color="#FF7043" opacity={0.7} />
    </G>
  );
}

/** 평온 (calm) — 잎사귀 + 녹색 점 */
function CalmParticles() {
  return (
    <G>
      <Leaf x={14} y={22} color="#66BB6A" opacity={0.7} />
      <Leaf x={82} y={26} color="#81C784" opacity={0.65} />
      <Circle cx={10} cy={38} r={2.5} fill="#A5D6A7" opacity={0.5} />
      <Circle cx={88} cy={40} r={2} fill="#C8E6C9" opacity={0.45} />
      <Leaf x={18} y={40} color="#4CAF50" opacity={0.55} />
    </G>
  );
}

/** 고민/사색 (thinking / thoughtful) — 생각 거품 + 미니 차트 */
function ThinkingParticles() {
  return (
    <G>
      <ThoughtBubbles x={72} y={20} color="#E0E0E0" opacity={0.65} />
      {/* 미니 바 차트 (3개 막대) */}
      <G opacity={0.5}>
        <Path d="M 12 34 L 12 24" stroke="#90A4AE" strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M 16 34 L 16 28" stroke="#78909C" strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M 20 34 L 20 20" stroke="#546E7A" strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M 9 34 L 23 34" stroke="#607D8B" strokeWidth={1} />
      </G>
    </G>
  );
}

/** 걱정 (worried) — 물방울 + 걱정 선 */
function WorriedParticles() {
  return (
    <G>
      <WaterDrop x={80} y={22} color="#64B5F6" opacity={0.7} />
      <WaterDrop x={86} y={32} color="#90CAF9" opacity={0.55} />
      <WorryLines x={15} y={24} color="#B0BEC5" opacity={0.6} />
      <WorryLines x={13} y={34} color="#CFD8DC" opacity={0.45} />
    </G>
  );
}

/** 짜증/화남 (angry / grumpy) — 분노 마크 + 어두운 구름 */
function GrumpyParticles() {
  return (
    <G>
      <AngerMark x={16} y={18} color="#FF5252" opacity={0.85} />
      <AngerMark x={82} y={22} color="#FF1744" opacity={0.8} />
      {/* 어두운 작은 구름 */}
      <G opacity={0.45}>
        <Ellipse cx={15} cy={34} rx={7} ry={4.5} fill="#90A4AE" />
        <Ellipse cx={11} cy={33} rx={4} ry={3} fill="#90A4AE" />
        <Ellipse cx={19} cy={32} rx={4} ry={3} fill="#90A4AE" />
      </G>
    </G>
  );
}

/** 졸림 (sleepy) — Zzz + 별 */
function SleepyParticles() {
  return (
    <G>
      <SleepZzz x={72} y={30} opacity={0.65} />
      <Star x={14} y={18} r={3} color="#B39DDB" opacity={0.55} />
      <Star x={82} y={42} r={2.5} color="#CE93D8" opacity={0.45} />
    </G>
  );
}

/** 놀람 (surprised) — 느낌표 + 별 */
function SurprisedParticles() {
  return (
    <G>
      {/* 느낌표 (왼쪽) */}
      <G opacity={0.8}>
        <Circle cx={14} cy={14} r={3.5} fill="#FF5722" />
        <Path d="M 14 19 L 14 28" stroke="#FF5722" strokeWidth={2.5} strokeLinecap="round" />
      </G>
      {/* 느낌표 (오른쪽) */}
      <G opacity={0.7}>
        <Circle cx={86} cy={16} r={3} fill="#FF7043" />
        <Path d="M 86 21 L 86 28" stroke="#FF7043" strokeWidth={2.5} strokeLinecap="round" />
      </G>
      <Star x={16} y={36} r={3} color="#FFD54F" opacity={0.65} />
      <Star x={84} y={34} r={2.5} color="#FFEB3B" opacity={0.55} />
    </G>
  );
}

/** 슬픔 (sad) — 물방울 3개 + 어두운 구름 */
function SadParticles() {
  return (
    <G>
      <WaterDrop x={14} y={24} color="#5C6BC0" opacity={0.65} />
      <WaterDrop x={80} y={20} color="#64B5F6" opacity={0.6} />
      <WaterDrop x={84} y={32} color="#90CAF9" opacity={0.5} />
      {/* 작은 어두운 구름 */}
      <G opacity={0.35}>
        <Ellipse cx={50} cy={10} rx={10} ry={5} fill="#78909C" />
        <Ellipse cx={44} cy={9} rx={5} ry={4} fill="#78909C" />
        <Ellipse cx={56} cy={9} rx={5} ry={4} fill="#78909C" />
      </G>
    </G>
  );
}

// ---------------------------------------------------------------------------
// 활동별 파티클 (기분 파티클보다 우선 표시)
// ---------------------------------------------------------------------------

function FishingParticles() {
  return (
    <G>
      <FishSplash x={78} y={68} opacity={0.75} />
      <WaterDrop x={14} y={72} color="#81D4FA" opacity={0.5} />
      <WaterDrop x={84} y={58} color="#4FC3F7" opacity={0.4} />
    </G>
  );
}

function CookingParticles() {
  return (
    <G>
      <Steam x={72} y={62} opacity={0.55} />
      <Steam x={60} y={64} opacity={0.45} />
    </G>
  );
}

function PaintingParticles() {
  return (
    <G>
      <PaintDrops x={10} y={68} color="#AB47BC" opacity={0.7} />
      <PaintDrops x={76} y={72} color="#EF5350" opacity={0.6} />
    </G>
  );
}

function StargazingParticles() {
  return (
    <G>
      <Star x={14} y={14} r={4} color="#FFD54F" opacity={0.8} />
      <Star x={82} y={10} r={3} color="#FFEE58" opacity={0.7} />
      <Star x={88} y={24} r={2.5} color="#FFF176" opacity={0.6} />
      <Star x={10} y={28} r={2} color="#FFD54F" opacity={0.5} />
    </G>
  );
}

function ReadingParticles() {
  return (
    <G>
      {/* 떠다니는 텍스트 줄 (책 읽기 느낌) */}
      <G opacity={0.4}>
        <Path d="M 8 18 L 20 18" stroke="#90A4AE" strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M 8 22 L 22 22" stroke="#B0BEC5" strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M 8 26 L 16 26" stroke="#CFD8DC" strokeWidth={1.5} strokeLinecap="round" />
      </G>
      <MusicNote x={80} y={20} color="#CE93D8" opacity={0.5} />
      <Sparkle x={84} y={34} size={2.5} color="#B39DDB" opacity={0.55} />
    </G>
  );
}

// ---------------------------------------------------------------------------
// 기분 → 파티클 라우터
// ---------------------------------------------------------------------------

function MoodParticleRenderer({ mood }: { mood: GuruMood }) {
  switch (mood) {
    case 'joy':
    case 'joyful':
      return <JoyParticles />;
    case 'excited':
      return <ExcitedParticles />;
    case 'calm':
      return <CalmParticles />;
    case 'thinking':
    case 'thoughtful':
      return <ThinkingParticles />;
    case 'worried':
      return <WorriedParticles />;
    case 'angry':
    case 'grumpy':
      return <GrumpyParticles />;
    case 'sleepy':
      return <SleepyParticles />;
    case 'surprised':
      return <SurprisedParticles />;
    case 'sad':
      return <SadParticles />;
    default:
      return null;
  }
}

/** 활동 → 파티클 라우터 (기분 파티클보다 우선) */
function ActivityParticleRenderer({ activity }: { activity: GuruActivity }) {
  switch (activity) {
    case 'fishing':
      return <FishingParticles />;
    case 'cooking':
      return <CookingParticles />;
    case 'painting':
      return <PaintingParticles />;
    case 'stargazing':
      return <StargazingParticles />;
    case 'reading':
      return <ReadingParticles />;
    // 기타 활동은 기분 파티클 사용 (null 반환 → MoodParticles 폴백)
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * MoodParticles
 *
 * 사용법:
 *   <View style={{ position: 'relative', width: size, height: size }}>
 *     <SomeGuruCharacter size={size} ... />
 *     <ClothingOverlay ... />
 *     <MoodParticles size={size} mood={guru.mood} activity={guru.activity} />
 *   </View>
 *
 * 우선순위: activity 파티클 > mood 파티클
 * activity가 null이거나 파티클 없는 활동이면 mood 파티클 표시
 */
export const MoodParticles = React.memo(({
  size,
  mood,
  activity,
}: MoodParticlesProps) => {
  // 활동 파티클이 있으면 활동 우선, 없으면 기분 파티클 렌더링
  const hasActivityParticles =
    activity !== undefined &&
    ['fishing', 'cooking', 'painting', 'stargazing', 'reading'].includes(activity);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {hasActivityParticles && activity ? (
        <ActivityParticleRenderer activity={activity} />
      ) : (
        <MoodParticleRenderer mood={mood} />
      )}
    </Svg>
  );
});
