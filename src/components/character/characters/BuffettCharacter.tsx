/**
 * 워렌 버핏 캐릭터 — 지혜로운 올빼미 (2.5D 동물의숲 스타일)
 *
 * 디자인 키워드: 통통한 둥근 얼굴, 큰 둥근 안경, 회색 머리, 양복 넥타이
 * 입체감: RadialGradient + 하이라이트 + 그림자 레이어
 * 표정 변화: bullish(밝은 미소) / bearish(걱정, 땀방울) / cautious(생각) / neutral(차분)
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect, Line,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

export function BuffettCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return 'M 36 63 Q 50 75 64 63';
      case 'bearish':
        return 'M 40 67 Q 50 61 60 67';
      case 'cautious':
        return 'M 42 65 L 58 65';
      case 'neutral':
      default:
        return 'M 39 63 Q 50 70 61 63';
    }
  })();

  const showSweat = expression === 'bearish';
  const showThinking = expression === 'cautious';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 입체감 그라데이션 */}
        <RadialGradient id="buffFace" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE8CC" />
          <Stop offset="60%" stopColor="#FFDAB0" />
          <Stop offset="100%" stopColor="#E8BE8A" />
        </RadialGradient>
        {/* 몸체(양복) 그라데이션 */}
        <LinearGradient id="buffSuit" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#2A2A3E" />
          <Stop offset="100%" stopColor="#1A1A2E" />
        </LinearGradient>
        {/* 머리카락 그라데이션 — 할아버지 흰머리 */}
        <RadialGradient id="buffHair" cx="50%" cy="30%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#F5F5F5" />
          <Stop offset="40%" stopColor="#EEEEEE" />
          <Stop offset="100%" stopColor="#D0D0D0" />
        </RadialGradient>
        {/* 안경 렌즈 반사 */}
        <RadialGradient id="buffLens" cx="35%" cy="35%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        {/* 다리 그라데이션 (양복 바지) */}
        <LinearGradient id="buffLeg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1A1A2E" />
          <Stop offset="100%" stopColor="#12122A" />
        </LinearGradient>
        {/* 구두 그라데이션 */}
        <RadialGradient id="buffShoe" cx="45%" cy="35%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#3E2723" />
          <Stop offset="100%" stopColor="#1B0F0B" />
        </RadialGradient>
      </Defs>

      {/* ── 그림자 (바닥 — 발 아래) ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.15} />

      {/* ── 다리 & 발 (양복 바지 + 구두) ── */}
      <G>
        {/* 왼쪽 다리 */}
        <Rect x={36} y={80} width={8} height={10} rx={3} fill="url(#buffLeg)" />
        {/* 오른쪽 다리 */}
        <Rect x={56} y={80} width={8} height={10} rx={3} fill="url(#buffLeg)" />
        {/* 왼쪽 구두 */}
        <Ellipse cx={39} cy={92} rx={7} ry={3.5} fill="url(#buffShoe)" />
        <Ellipse cx={38} cy={91} rx={3} ry={1.5} fill="#5D4037" opacity={0.25} />
        {/* 오른쪽 구두 */}
        <Ellipse cx={61} cy={92} rx={7} ry={3.5} fill="url(#buffShoe)" />
        <Ellipse cx={60} cy={91} rx={3} ry={1.5} fill="#5D4037" opacity={0.25} />
      </G>

      {/* ── 몸체 + 머리 그룹 (위로 7 이동) ── */}
      <G transform="translate(0, -7)">
        {/* ── 몸체 (양복) ── */}
        <Ellipse cx={50} cy={80} rx={26} ry={17} fill="url(#buffSuit)" />
        {/* 양복 라펠 */}
        <Path d="M 38 70 L 50 82 L 46 70 Z" fill="#353550" />
        <Path d="M 62 70 L 50 82 L 54 70 Z" fill="#353550" />
        {/* 넥타이 */}
        <Path d="M 48 70 L 50 84 L 52 70 Z" fill={accentColor} />
        <Rect x={47} y={67} width={6} height={4} rx={1.5} fill={accentColor} />
        {/* 셔츠 V */}
        <Path d="M 47 70 L 50 76 L 53 70" fill="#FFFFFF" opacity={0.15} />

        {/* ── 얼굴 (큰 둥근 원) ── */}
        <Circle cx={50} cy={43} r={31} fill="url(#buffFace)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={68} rx={22} ry={6} fill="#D4A574" opacity={0.3} />
        {/* 이마 하이라이트 */}
        <Ellipse cx={46} cy={28} rx={14} ry={8} fill="#FFFFFF" opacity={0.12} />

        {/* ── 머리카락 (할아버지 흰머리 — 옆머리 풍성) ── */}
        <Path
          d="M 21 38 Q 18 18 34 12 Q 50 5 66 12 Q 82 18 79 38"
          fill="url(#buffHair)"
        />
        {/* 옆머리 (귀 옆으로 살짝 나온 흰머리) */}
        <Path d="M 21 38 Q 18 44 20 48 Q 22 50 24 48" fill="#E8E8E8" opacity={0.7} />
        <Path d="M 79 38 Q 82 44 80 48 Q 78 50 76 48" fill="#E8E8E8" opacity={0.7} />
        {/* 머리 위 흰머리 볼륨 라인 */}
        <Path
          d="M 28 22 Q 38 10 50 9 Q 62 10 72 22"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2}
          opacity={0.25}
        />
        {/* 머리 하이라이트 (은발 광택) */}
        <Path
          d="M 32 20 Q 42 12 55 14 Q 64 16 68 22"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1.5}
          opacity={0.3}
        />

        {/* ── 안경 (둥근 원형) — 버핏의 시그니처 ── */}
        <G>
          {/* 안경 렌즈 배경 */}
          <Circle cx={37} cy={42} r={12} fill="#1A1A2E" opacity={0.08} />
          <Circle cx={63} cy={42} r={12} fill="#1A1A2E" opacity={0.08} />
          {/* 렌즈 반사 */}
          <Circle cx={37} cy={42} r={12} fill="url(#buffLens)" />
          <Circle cx={63} cy={42} r={12} fill="url(#buffLens)" />
          {/* 프레임 */}
          <Circle cx={37} cy={42} r={12} fill="none" stroke="#5D4037" strokeWidth={2.5} />
          <Circle cx={63} cy={42} r={12} fill="none" stroke="#5D4037" strokeWidth={2.5} />
          {/* 브릿지 */}
          <Path d="M 49 42 Q 50 39 51 42" fill="none" stroke="#5D4037" strokeWidth={2} />
          {/* 다리 */}
          <Line x1={25} y1={40} x2={20} y2={38} stroke="#5D4037" strokeWidth={2} />
          <Line x1={75} y1={40} x2={80} y2={38} stroke="#5D4037" strokeWidth={2} />
        </G>

        {/* ── 눈 (안경 안에서 큰 동그란 눈) ── */}
        {blinkPhase >= 1 ? (
          /* 눈 감은 상태 — 동물의숲 NPC 깜빡임 (선으로 표현) */
          <G>
            <Path d="M 31 42 Q 37 44 43 42" fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 57 42 Q 63 44 69 42" fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : (
          /* 눈 뜬 상태 (기존) */
          <G>
            {/* 왼쪽 눈 */}
            <Circle cx={37} cy={42} r={6} fill="#FFFFFF" />
            <Circle cx={38} cy={41} r={4} fill="#3E2723" />
            <Circle cx={39.5} cy={39.5} r={1.5} fill="#FFFFFF" />
            <Circle cx={37} cy={40} r={0.8} fill="#FFFFFF" opacity={0.6} />
            {/* 오른쪽 눈 */}
            <Circle cx={63} cy={42} r={6} fill="#FFFFFF" />
            <Circle cx={64} cy={41} r={4} fill="#3E2723" />
            <Circle cx={65.5} cy={39.5} r={1.5} fill="#FFFFFF" />
            <Circle cx={63} cy={40} r={0.8} fill="#FFFFFF" opacity={0.6} />
          </G>
        )}

        {/* bullish일 때 눈 반짝임 */}
        {expression === 'bullish' && (
          <G>
            <Path d="M 34 36 L 35 34 L 36 36 L 34 35 L 36 35 Z" fill="#FFD54F" opacity={0.6} />
            <Path d="M 60 36 L 61 34 L 62 36 L 60 35 L 62 35 Z" fill="#FFD54F" opacity={0.6} />
          </G>
        )}

        {/* ── 눈썹 ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 28 33 Q 34 29 44 33" fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 56 33 Q 66 29 72 33" fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
          </G>
        ) : expression === 'bullish' ? (
          <G>
            <Path d="M 28 34 Q 34 28 44 32" fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 56 32 Q 66 28 72 34" fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 29 33 Q 36 30 44 32" fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 56 32 Q 64 30 71 33" fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (작고 동그란) ── */}
        <Ellipse cx={50} cy={52} rx={3} ry={2.5} fill="#E8BE8A" />
        <Ellipse cx={49} cy={51} rx={1.5} ry={1} fill="#FFDAB0" opacity={0.5} />

        {/* ── 볼터치 (로즈 핑크, 입체감) ── */}
        <Circle cx={26} cy={52} r={7} fill="#FF8A80" opacity={0.2} />
        <Circle cx={74} cy={52} r={7} fill="#FF8A80" opacity={0.2} />
        <Circle cx={26} cy={51} r={4} fill="#FF8A80" opacity={0.1} />
        <Circle cx={74} cy={51} r={4} fill="#FF8A80" opacity={0.1} />

        {/* ── 입 (표정별) ── */}
        <Path d={mouthPath} fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
        {expression === 'bullish' && (
          <Path d="M 42 66 Q 50 70 58 66" fill="#FFFFFF" opacity={0.4} />
        )}

        {/* ── 땀방울 (bearish) ── */}
        {showSweat && (
          <G>
            <Path d="M 78 26 Q 80 20 82 26 Q 82 32 80 32 Q 78 32 78 26 Z" fill="#64B5F6" opacity={0.6} />
            <Ellipse cx={79.5} cy={25} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* ── 생각 거품 (cautious) ── */}
        {showThinking && (
          <G>
            <Circle cx={81} cy={24} r={3} fill="#E0E0E0" opacity={0.4} />
            <Circle cx={86} cy={17} r={4} fill="#E0E0E0" opacity={0.3} />
            <Circle cx={90} cy={8} r={5.5} fill="#E0E0E0" opacity={0.25} />
            {/* 거품 하이라이트 */}
            <Circle cx={89} cy={6} r={2} fill="#FFFFFF" opacity={0.15} />
          </G>
        )}
      </G>
    </Svg>
  );
}
