/**
 * 피터 린치 캐릭터 — 따뜻한 곰 교수 (주토피아 스타일 2족보행)
 *
 * 디자인: 둥근 갈색 곰, 동그란 귀, 둥근 안경, 나비넥타이, 밝은 배, 짧은 다리+발
 * 표정: bullish(반짝 눈) / bearish(걱정) / cautious(생각) / neutral(따뜻한 미소)
 * 콘셉트: "슈퍼마켓에서 투자 아이디어를 찾는 따뜻한 곰 교수"
 */

import React from 'react';
import Svg, { Circle, Ellipse, Path, G, Rect, Line, Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

export function LynchCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  /* ── 전체 Y 오프셋: 머리+몸을 위로 7 올림 ── */
  const dy = -7;

  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return `M 35 ${64 + dy} Q 50 ${76 + dy} 65 ${64 + dy}`;
      case 'bearish':
        return `M 40 ${67 + dy} Q 50 ${62 + dy} 60 ${67 + dy}`;
      case 'cautious':
        return `M 42 ${65 + dy} L 58 ${65 + dy}`;
      case 'neutral':
      default:
        return `M 38 ${63 + dy} Q 50 ${72 + dy} 62 ${63 + dy}`;
    }
  })();

  const showSweat = expression === 'bearish';
  const showThinking = expression === 'cautious';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 — 따뜻한 갈색 */}
        <RadialGradient id="lynchFace" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#C8956A" />
          <Stop offset="55%" stopColor="#B07D52" />
          <Stop offset="100%" stopColor="#8E6340" />
        </RadialGradient>
        {/* 주둥이 */}
        <RadialGradient id="lynchMuzzle" cx="50%" cy="45%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#F0D6B8" />
          <Stop offset="100%" stopColor="#DDBF9A" />
        </RadialGradient>
        {/* 몸체 — 인디고 니트 조끼 */}
        <LinearGradient id="lynchBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#5C6BC0" />
          <Stop offset="100%" stopColor="#3F51B5" />
        </LinearGradient>
        {/* 배 */}
        <RadialGradient id="lynchBelly" cx="50%" cy="40%" rx="50%" ry="55%">
          <Stop offset="0%" stopColor="#F0D6B8" />
          <Stop offset="100%" stopColor="#DDBF9A" />
        </RadialGradient>
        {/* 렌즈 반사 */}
        <RadialGradient id="lynchLens" cx="35%" cy="35%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        {/* 다리 — 갈색 모피 */}
        <LinearGradient id="lynchLeg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#B07D52" />
          <Stop offset="100%" stopColor="#96693F" />
        </LinearGradient>
        {/* 발바닥 패드 */}
        <RadialGradient id="lynchPawPad" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#E8B88A" />
          <Stop offset="100%" stopColor="#DBBF9E" />
        </RadialGradient>
      </Defs>

      {/* ── 그림자 (발 아래 바닥) ── */}
      <Ellipse cx={50} cy={97} rx={24} ry={3} fill="#000000" opacity={0.13} />

      {/* ── 다리 (짧고 둥근 곰 다리, 몸체 뒤에 일부 겹침) ── */}
      <G>
        {/* 왼쪽 다리 */}
        <Rect x={36} y={83} width={10} height={10} rx={4} ry={4} fill="url(#lynchLeg)" />
        {/* 오른쪽 다리 */}
        <Rect x={54} y={83} width={10} height={10} rx={4} ry={4} fill="url(#lynchLeg)" />
      </G>

      {/* ── 발 (둥근 곰 발바닥 — 다리보다 약간 넓음) ── */}
      <G>
        {/* 왼쪽 발 */}
        <Ellipse cx={41} cy={93.5} rx={7} ry={3.5} fill="#96693F" />
        {/* 왼쪽 발바닥 패드 (큰 패드 1 + 작은 패드 3) */}
        <Ellipse cx={41} cy={94.2} rx={4} ry={2} fill="url(#lynchPawPad)" />
        <Circle cx={38} cy={92.5} r={1.2} fill="#E8B88A" opacity={0.7} />
        <Circle cx={41} cy={92} r={1.2} fill="#E8B88A" opacity={0.7} />
        <Circle cx={44} cy={92.5} r={1.2} fill="#E8B88A" opacity={0.7} />

        {/* 오른쪽 발 */}
        <Ellipse cx={59} cy={93.5} rx={7} ry={3.5} fill="#96693F" />
        {/* 오른쪽 발바닥 패드 (큰 패드 1 + 작은 패드 3) */}
        <Ellipse cx={59} cy={94.2} rx={4} ry={2} fill="url(#lynchPawPad)" />
        <Circle cx={56} cy={92.5} r={1.2} fill="#E8B88A" opacity={0.7} />
        <Circle cx={59} cy={92} r={1.2} fill="#E8B88A" opacity={0.7} />
        <Circle cx={62} cy={92.5} r={1.2} fill="#E8B88A" opacity={0.7} />
      </G>

      {/* ── 몸체 (인디고 니트 조끼) + 배 ── */}
      <Ellipse cx={50} cy={82 + dy} rx={27} ry={16} fill="url(#lynchBody)" />
      <Ellipse cx={50} cy={80 + dy} rx={16} ry={12} fill="url(#lynchBelly)" />
      <Path d={`M 43 ${69 + dy} L 50 ${72 + dy} L 43 ${75 + dy} Z`} fill={accentColor} />
      <Path d={`M 57 ${69 + dy} L 50 ${72 + dy} L 57 ${75 + dy} Z`} fill={accentColor} />
      <Circle cx={50} cy={72 + dy} r={2.5} fill={accentColor} />
      <Circle cx={50} cy={72 + dy} r={1.2} fill="#FFFFFF" opacity={0.3} />

      {/* ── 귀 (둥근 곰 귀, 얼굴 뒤에 위치) ── */}
      <Circle cx={27} cy={22 + dy} r={11} fill="#B07D52" />
      <Circle cx={27} cy={22 + dy} r={7} fill="#E8B88A" />
      <Circle cx={73} cy={22 + dy} r={11} fill="#B07D52" />
      <Circle cx={73} cy={22 + dy} r={7} fill="#E8B88A" />

      {/* ── 얼굴 (큰 둥근 곰 얼굴) ── */}
      <Circle cx={50} cy={43 + dy} r={30} fill="url(#lynchFace)" />
      <Ellipse cx={44} cy={28 + dy} rx={12} ry={7} fill="#FFFFFF" opacity={0.1} />
      <Ellipse cx={50} cy={68 + dy} rx={20} ry={5} fill="#7A5230" opacity={0.25} />

      {/* ── 주둥이 (밝은 타원) ── */}
      <Ellipse cx={50} cy={55 + dy} rx={16} ry={12} fill="url(#lynchMuzzle)" />

      {/* ── 안경 (둥근 원형) — 따뜻한 교수 느낌 ── */}
      <G>
        <Circle cx={37} cy={42 + dy} r={11} fill="#1A1A2E" opacity={0.06} />
        <Circle cx={63} cy={42 + dy} r={11} fill="#1A1A2E" opacity={0.06} />
        <Circle cx={37} cy={42 + dy} r={11} fill="url(#lynchLens)" />
        <Circle cx={63} cy={42 + dy} r={11} fill="url(#lynchLens)" />
        <Circle cx={37} cy={42 + dy} r={11} fill="none" stroke={accentColor} strokeWidth={2.2} />
        <Circle cx={63} cy={42 + dy} r={11} fill="none" stroke={accentColor} strokeWidth={2.2} />
        <Path d={`M 48 ${42 + dy} Q 50 ${39 + dy} 52 ${42 + dy}`} fill="none" stroke={accentColor} strokeWidth={1.8} />
        <Line x1={26} y1={40 + dy} x2={21} y2={37 + dy} stroke={accentColor} strokeWidth={1.8} />
        <Line x1={74} y1={40 + dy} x2={79} y2={37 + dy} stroke={accentColor} strokeWidth={1.8} />
      </G>

      {/* ── 눈 (안경 안에서 크고 따뜻한 눈) ── */}
      {blinkPhase >= 0.5 ? (
        /* 눈 감은 상태 — 동물의숲 NPC 깜빡임 */
        <G>
          <Path d={`M 31 ${42 + dy} Q 37 ${45 + dy} 43 ${42 + dy}`} fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
          <Path d={`M 57 ${42 + dy} Q 63 ${45 + dy} 69 ${42 + dy}`} fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
        </G>
      ) : (
        /* 눈 뜬 상태 */
        <G>
          {/* 왼쪽 눈 */}
          <Circle cx={37} cy={42 + dy} r={5.5} fill="#FFFFFF" />
          <Circle cx={38} cy={41 + dy} r={3.8} fill="#3E2723" />
          <Circle cx={39.5} cy={39.5 + dy} r={1.5} fill="#FFFFFF" />
          <Circle cx={37} cy={40 + dy} r={0.7} fill="#FFFFFF" opacity={0.5} />
          {/* 오른쪽 눈 */}
          <Circle cx={63} cy={42 + dy} r={5.5} fill="#FFFFFF" />
          <Circle cx={64} cy={41 + dy} r={3.8} fill="#3E2723" />
          <Circle cx={65.5} cy={39.5 + dy} r={1.5} fill="#FFFFFF" />
          <Circle cx={63} cy={40 + dy} r={0.7} fill="#FFFFFF" opacity={0.5} />
        </G>
      )}

      {/* bullish일 때 눈 반짝임 */}
      {expression === 'bullish' && (
        <G>
          <Path d={`M 33 ${36 + dy} L 34 ${34 + dy} L 35 ${36 + dy} L 33 ${35 + dy} L 35 ${35 + dy} Z`} fill="#FFD54F" opacity={0.7} />
          <Path d={`M 59 ${36 + dy} L 60 ${34 + dy} L 61 ${36 + dy} L 59 ${35 + dy} L 61 ${35 + dy} Z`} fill="#FFD54F" opacity={0.7} />
        </G>
      )}

      {/* ── 눈썹 ── */}
      {expression === 'bearish' ? (
        <G>
          <Path d={`M 28 ${34 + dy} Q 34 ${30 + dy} 43 ${34 + dy}`} fill="none" stroke="#6D4C33" strokeWidth={2} strokeLinecap="round" />
          <Path d={`M 57 ${34 + dy} Q 66 ${30 + dy} 72 ${34 + dy}`} fill="none" stroke="#6D4C33" strokeWidth={2} strokeLinecap="round" />
        </G>
      ) : expression === 'bullish' ? (
        <G>
          <Path d={`M 28 ${34 + dy} Q 34 ${28 + dy} 43 ${33 + dy}`} fill="none" stroke="#6D4C33" strokeWidth={2} strokeLinecap="round" />
          <Path d={`M 57 ${33 + dy} Q 66 ${28 + dy} 72 ${34 + dy}`} fill="none" stroke="#6D4C33" strokeWidth={2} strokeLinecap="round" />
        </G>
      ) : (
        <G>
          <Path d={`M 29 ${34 + dy} Q 36 ${31 + dy} 43 ${33 + dy}`} fill="none" stroke="#6D4C33" strokeWidth={2} strokeLinecap="round" />
          <Path d={`M 57 ${33 + dy} Q 64 ${31 + dy} 71 ${34 + dy}`} fill="none" stroke="#6D4C33" strokeWidth={2} strokeLinecap="round" />
        </G>
      )}

      {/* ── 코 (곰 코 — 둥글고 귀여운 삼각형) ── */}
      <Ellipse cx={50} cy={52 + dy} rx={4} ry={3} fill="#5D4037" />
      <Ellipse cx={49} cy={51 + dy} rx={1.8} ry={1} fill="#8D6E63" opacity={0.5} />

      {/* ── 볼터치 (로즈 핑크 — 동물의숲 스타일) ── */}
      <Circle cx={24} cy={52 + dy} r={7} fill="#FF8A80" opacity={0.22} />
      <Circle cx={76} cy={52 + dy} r={7} fill="#FF8A80" opacity={0.22} />
      <Circle cx={24} cy={51 + dy} r={4} fill="#FF8A80" opacity={0.12} />
      <Circle cx={76} cy={51 + dy} r={4} fill="#FF8A80" opacity={0.12} />

      {/* ── 입 (표정별) ── */}
      <Path d={mouthPath} fill="none" stroke="#6D4C33" strokeWidth={2} strokeLinecap="round" />
      {expression === 'bullish' && (
        <Path d={`M 41 ${67 + dy} Q 50 ${71 + dy} 59 ${67 + dy}`} fill="#FFFFFF" opacity={0.35} />
      )}

      {/* ── 땀방울 (bearish) ── */}
      {showSweat && (
        <G>
          <Path d={`M 80 ${26 + dy} Q 82 ${20 + dy} 84 ${26 + dy} Q 84 ${32 + dy} 82 ${32 + dy} Q 80 ${32 + dy} 80 ${26 + dy} Z`} fill="#64B5F6" opacity={0.6} />
          <Ellipse cx={81.5} cy={25 + dy} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
        </G>
      )}

      {/* ── 생각 거품 (cautious) ── */}
      {showThinking && (
        <G>
          <Circle cx={82} cy={24 + dy} r={3} fill="#E0E0E0" opacity={0.4} />
          <Circle cx={87} cy={17 + dy} r={4} fill="#E0E0E0" opacity={0.3} />
          <Circle cx={91} cy={8 + dy} r={5.5} fill="#E0E0E0" opacity={0.25} />
          <Circle cx={90} cy={6 + dy} r={2} fill="#FFFFFF" opacity={0.15} />
        </G>
      )}
    </Svg>
  );
}
