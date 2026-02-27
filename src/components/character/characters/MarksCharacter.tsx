/**
 * 하워드 막스 캐릭터 — 인내의 가치투자자
 *
 * 디자인: 대머리(옆머리 회색), 사각 안경, 차콜 수트 + 블루 셔츠 + 넥타이
 * 표정: bullish(조심스러운 낙관) / bearish(걱정) / cautious(깊은 사색) / neutral(차분한 지혜)
 * 콘셉트: "2차적 사고의 달인, Oaktree Capital의 현인"
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

export function MarksCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return 'M 38 63 Q 50 71 62 63';
      case 'bearish':
        return 'M 42 66 Q 50 61 58 66';
      case 'cautious':
        return 'M 43 64 L 57 64';
      case 'neutral':
      default:
        return 'M 40 63 Q 50 68 60 63';
    }
  })();

  const showSweat = expression === 'bearish';
  const showThinking = expression === 'cautious';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 — 백인 피부톤 */}
        <RadialGradient id="marksFace" cx="45%" cy="38%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE0C0" />
          <Stop offset="55%" stopColor="#F5CBA7" />
          <Stop offset="100%" stopColor="#D4A574" />
        </RadialGradient>
        {/* 대머리 두피 — 피부톤 약간 밝게 */}
        <RadialGradient id="marksScalp" cx="50%" cy="35%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#FFE8D0" />
          <Stop offset="60%" stopColor="#F5D4B0" />
          <Stop offset="100%" stopColor="#E0B890" />
        </RadialGradient>
        {/* 몸체 — 차콜 수트 */}
        <LinearGradient id="marksSuit" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#3A3A4A" />
          <Stop offset="100%" stopColor="#2A2A38" />
        </LinearGradient>
        {/* 셔츠 — 블루 드레스 셔츠 */}
        <LinearGradient id="marksShirt" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#90B8D8" />
          <Stop offset="100%" stopColor="#6D9CC0" />
        </LinearGradient>
        {/* 안경 렌즈 반사 */}
        <RadialGradient id="marksLens" cx="35%" cy="35%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        {/* 바지 — 차콜 */}
        <LinearGradient id="marksPants" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#2A2A38" />
          <Stop offset="100%" stopColor="#1E1E2A" />
        </LinearGradient>
        {/* 구두 — 다크 드레스슈즈 */}
        <RadialGradient id="marksShoe" cx="45%" cy="35%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#2C2C2C" />
          <Stop offset="100%" stopColor="#141414" />
        </RadialGradient>
      </Defs>

      {/* ── 바닥 그림자 ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.13} />

      {/* ── 다리 & 발 (차콜 바지 + 다크 구두) ── */}
      <G>
        {/* 왼쪽 다리 */}
        <Rect x={36} y={80} width={8} height={11} rx={3} fill="url(#marksPants)" />
        {/* 오른쪽 다리 */}
        <Rect x={56} y={80} width={8} height={11} rx={3} fill="url(#marksPants)" />
        {/* 왼쪽 구두 */}
        <Ellipse cx={40} cy={92.5} rx={7} ry={3.5} fill="url(#marksShoe)" />
        <Ellipse cx={39} cy={91.5} rx={3} ry={1.5} fill="#444" opacity={0.25} />
        {/* 오른쪽 구두 */}
        <Ellipse cx={60} cy={92.5} rx={7} ry={3.5} fill="url(#marksShoe)" />
        <Ellipse cx={59} cy={91.5} rx={3} ry={1.5} fill="#444" opacity={0.25} />
      </G>

      {/* ── 몸체 + 머리 그룹 (위로 7 이동) ── */}
      <G transform="translate(0, -7)">
        {/* ── 몸체 (차콜 수트) ── */}
        <Ellipse cx={50} cy={80} rx={25} ry={16} fill="url(#marksSuit)" />
        {/* 수트 라펠 */}
        <Path d="M 39 70 L 50 82 L 46 70 Z" fill="#454558" />
        <Path d="M 61 70 L 50 82 L 54 70 Z" fill="#454558" />
        {/* 블루 셔츠 V */}
        <Path d="M 46 70 L 50 78 L 54 70 Z" fill="url(#marksShirt)" />
        {/* 넥타이 (accentColor) */}
        <Path d="M 48 70 L 50 83 L 52 70 Z" fill={accentColor} />
        <Rect x={47} y={67} width={6} height={4} rx={1.5} fill={accentColor} />
        {/* 넥타이 패턴 (서틀 대각선) */}
        <Path d="M 49 74 L 51 72" fill="none" stroke="#FFFFFF" strokeWidth={0.4} opacity={0.25} />
        <Path d="M 49 78 L 51 76" fill="none" stroke="#FFFFFF" strokeWidth={0.4} opacity={0.25} />

        {/* ── 얼굴 (큰 둥근 원) ── */}
        <Circle cx={50} cy={43} r={30} fill="url(#marksFace)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={68} rx={20} ry={5} fill="#D4A574" opacity={0.3} />

        {/* ── 대머리 두피 (윗부분 매끈) ── */}
        <Path
          d="M 22 42 Q 20 22 35 15 Q 50 10 65 15 Q 80 22 78 42"
          fill="url(#marksScalp)"
        />
        {/* 두피 하이라이트 (광택) */}
        <Ellipse cx={48} cy={20} rx={12} ry={7} fill="#FFFFFF" opacity={0.15} />
        <Ellipse cx={50} cy={17} rx={8} ry={4} fill="#FFFFFF" opacity={0.08} />

        {/* ── 옆머리 (회색 — 양쪽) ── */}
        <Path d="M 22 42 Q 19 36 21 30 Q 23 26 26 30 Q 24 36 24 42" fill="#B0B0B0" />
        <Path d="M 78 42 Q 81 36 79 30 Q 77 26 74 30 Q 76 36 76 42" fill="#B0B0B0" />
        {/* 옆머리 하이라이트 */}
        <Path d="M 23 34 Q 24 30 25 34" fill="none" stroke="#D0D0D0" strokeWidth={0.8} opacity={0.4} />
        <Path d="M 75 34 Q 76 30 77 34" fill="none" stroke="#D0D0D0" strokeWidth={0.8} opacity={0.4} />
        {/* 귀 (피부색, 옆머리 아래 살짝) */}
        <Ellipse cx={21} cy={44} rx={3.5} ry={5} fill="#F5CBA7" />
        <Ellipse cx={21} cy={44} rx={2} ry={3.5} fill="#E8B890" opacity={0.5} />
        <Ellipse cx={79} cy={44} rx={3.5} ry={5} fill="#F5CBA7" />
        <Ellipse cx={79} cy={44} rx={2} ry={3.5} fill="#E8B890" opacity={0.5} />

        {/* ── 이마 주름 (지혜로운 인상) ── */}
        <Path d="M 36 28 Q 43 26 50 28" fill="none" stroke="#D4A574" strokeWidth={0.8} opacity={0.35} />
        <Path d="M 38 31 Q 44 29 50 31" fill="none" stroke="#D4A574" strokeWidth={0.7} opacity={0.25} />
        <Path d="M 50 28 Q 57 26 64 28" fill="none" stroke="#D4A574" strokeWidth={0.8} opacity={0.35} />

        {/* ── 안경 (사각형 프레임 — 버핏과 차별화) ── */}
        <G>
          {/* 렌즈 배경 */}
          <Rect x={27} y={35} width={20} height={16} rx={3} fill="#1A1A2E" opacity={0.06} />
          <Rect x={53} y={35} width={20} height={16} rx={3} fill="#1A1A2E" opacity={0.06} />
          {/* 렌즈 반사 */}
          <Rect x={27} y={35} width={20} height={16} rx={3} fill="url(#marksLens)" />
          <Rect x={53} y={35} width={20} height={16} rx={3} fill="url(#marksLens)" />
          {/* 프레임 */}
          <Rect x={27} y={35} width={20} height={16} rx={3} fill="none" stroke="#555555" strokeWidth={2.2} />
          <Rect x={53} y={35} width={20} height={16} rx={3} fill="none" stroke="#555555" strokeWidth={2.2} />
          {/* 브릿지 */}
          <Path d="M 47 43 L 53 43" fill="none" stroke="#555555" strokeWidth={2} />
          {/* 다리 */}
          <Path d="M 27 40 L 21 38" fill="none" stroke="#555555" strokeWidth={1.8} />
          <Path d="M 73 40 L 79 38" fill="none" stroke="#555555" strokeWidth={1.8} />
        </G>

        {/* ── 눈 (사각 안경 안에서 지혜로운 눈) ── */}
        {blinkPhase >= 0.5 ? (
          <G>
            <Path d="M 31 43 Q 37 46 43 43" fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 57 43 Q 63 46 69 43" fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            {/* 왼쪽 눈 */}
            <Ellipse cx={37} cy={43} rx={5.5} ry={5} fill="#FFFFFF" />
            <Circle cx={38} cy={42.5} r={3.5} fill="#37474F" />
            <Circle cx={39.5} cy={41} r={1.4} fill="#FFFFFF" />
            <Circle cx={37} cy={41.5} r={0.7} fill="#FFFFFF" opacity={0.5} />
            {/* 오른쪽 눈 */}
            <Ellipse cx={63} cy={43} rx={5.5} ry={5} fill="#FFFFFF" />
            <Circle cx={64} cy={42.5} r={3.5} fill="#37474F" />
            <Circle cx={65.5} cy={41} r={1.4} fill="#FFFFFF" />
            <Circle cx={63} cy={41.5} r={0.7} fill="#FFFFFF" opacity={0.5} />
          </G>
        )}

        {/* bullish: 조심스러운 낙관 반짝임 */}
        {expression === 'bullish' && (
          <G>
            <Path d="M 33 37 L 34 35 L 35 37 L 33 36 L 35 36 Z" fill="#FFD54F" opacity={0.5} />
            <Path d="M 59 37 L 60 35 L 61 37 L 59 36 L 61 36 Z" fill="#FFD54F" opacity={0.5} />
          </G>
        )}

        {/* cautious: 반쯤 감은 사색 눈 */}
        {showThinking && blinkPhase < 0.5 && (
          <G>
            <Rect x={28} y={37} width={18} height={5} rx={2} fill="#F5CBA7" opacity={0.5} />
            <Rect x={54} y={37} width={18} height={5} rx={2} fill="#F5CBA7" opacity={0.5} />
          </G>
        )}

        {/* ── 눈썹 ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 28 33 Q 35 29 46 33" fill="none" stroke="#8D8D8D" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 54 33 Q 65 29 72 33" fill="none" stroke="#8D8D8D" strokeWidth={2} strokeLinecap="round" />
          </G>
        ) : expression === 'cautious' ? (
          <G>
            <Path d="M 29 32 Q 36 29 46 32" fill="none" stroke="#8D8D8D" strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M 54 32 Q 64 29 71 32" fill="none" stroke="#8D8D8D" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 29 33 Q 36 30 46 32" fill="none" stroke="#8D8D8D" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 54 32 Q 64 30 71 33" fill="none" stroke="#8D8D8D" strokeWidth={2} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (작고 둥근 인간형) ── */}
        <Ellipse cx={50} cy={53} rx={3} ry={2.5} fill="#D4A574" />
        <Ellipse cx={49} cy={52.5} rx={1.5} ry={1} fill="#F5CBA7" opacity={0.5} />

        {/* ── 볼터치 (은은한 핑크) ── */}
        <Circle cx={26} cy={52} r={6.5} fill="#FFAB91" opacity={0.18} />
        <Circle cx={74} cy={52} r={6.5} fill="#FFAB91" opacity={0.18} />
        <Circle cx={26} cy={51} r={4} fill="#FFAB91" opacity={0.1} />
        <Circle cx={74} cy={51} r={4} fill="#FFAB91" opacity={0.1} />

        {/* ── 미소 주름 (입 옆 — 지혜로운 인상) ── */}
        <Path d="M 30 57 Q 33 60 32 64" fill="none" stroke="#D4A574" strokeWidth={0.8} opacity={0.3} />
        <Path d="M 70 57 Q 67 60 68 64" fill="none" stroke="#D4A574" strokeWidth={0.8} opacity={0.3} />

        {/* ── 입 (표정별) ── */}
        <Path d={mouthPath} fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
        {expression === 'bullish' && (
          <Path d="M 44 65 Q 50 68 56 65" fill="#FFFFFF" opacity={0.3} />
        )}

        {/* ── 땀방울 (bearish) ── */}
        {showSweat && (
          <G>
            <Path d="M 80 24 Q 82 18 84 24 Q 84 30 82 30 Q 80 30 80 24 Z" fill="#64B5F6" opacity={0.55} />
            <Ellipse cx={81.5} cy={23} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* ── 사색 이펙트 (cautious) — "2차적 사고" 거품 ── */}
        {showThinking && (
          <G>
            <Circle cx={81} cy={22} r={3} fill="#E0E0E0" opacity={0.4} />
            <Circle cx={86} cy={15} r={4} fill="#E0E0E0" opacity={0.3} />
            <Circle cx={91} cy={6} r={5.5} fill="#E0E0E0" opacity={0.25} />
            <Circle cx={90} cy={4} r={2} fill="#FFFFFF" opacity={0.15} />
            {/* 메모 아이콘 힌트 (사색 거품 안) */}
            <Path d="M 89 5 L 91 5 M 89 7 L 93 7" fill="none" stroke={accentColor} strokeWidth={0.7} opacity={0.3} />
          </G>
        )}
      </G>
    </Svg>
  );
}
