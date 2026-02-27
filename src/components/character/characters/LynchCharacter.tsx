/**
 * 피터 린치 캐릭터 — 일상 속 투자의 달인
 *
 * 디자인: 은발 웨이브 헤어, 둥근 얼굴, 따뜻한 미소, 브라운 트위드 재킷 + 라이트블루 셔츠
 * 표정: bullish(활짝 웃음) / bearish(걱정) / cautious(생각) / neutral(온화한 미소)
 * 콘셉트: "슈퍼마켓에서 투자 아이디어를 찾는 친근한 할아버지"
 */

import React from 'react';
import Svg, { Circle, Ellipse, Path, G, Rect, Line, Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

export function LynchCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return 'M 36 63 Q 50 74 64 63';
      case 'bearish':
        return 'M 40 66 Q 50 61 60 66';
      case 'cautious':
        return 'M 42 64 L 58 64';
      case 'neutral':
      default:
        return 'M 38 62 Q 50 70 62 62';
    }
  })();

  const showSweat = expression === 'bearish';
  const showThinking = expression === 'cautious';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 — 따뜻한 백인 피부톤 */}
        <RadialGradient id="lynchFace" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE0C0" />
          <Stop offset="55%" stopColor="#F5CBA7" />
          <Stop offset="100%" stopColor="#D4A574" />
        </RadialGradient>
        {/* 머리카락 — 은발/실버 웨이브 */}
        <RadialGradient id="lynchHair" cx="50%" cy="30%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="40%" stopColor="#F0F0F0" />
          <Stop offset="100%" stopColor="#C8C8C8" />
        </RadialGradient>
        {/* 몸체 — 브라운 트위드 재킷 */}
        <LinearGradient id="lynchJacket" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#8D6E4C" />
          <Stop offset="100%" stopColor="#6D5438" />
        </LinearGradient>
        {/* 셔츠 — 라이트 블루 */}
        <LinearGradient id="lynchShirt" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#B3D4F0" />
          <Stop offset="100%" stopColor="#8FBDE0" />
        </LinearGradient>
        {/* 안경 렌즈 반사 */}
        <RadialGradient id="lynchLens" cx="35%" cy="35%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        {/* 바지 — 카키색 */}
        <LinearGradient id="lynchPants" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#C4A96A" />
          <Stop offset="100%" stopColor="#A89050" />
        </LinearGradient>
        {/* 구두 — 브라운 로퍼 */}
        <RadialGradient id="lynchShoe" cx="45%" cy="35%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#6D4C33" />
          <Stop offset="100%" stopColor="#4A3020" />
        </RadialGradient>
      </Defs>

      {/* ── 그림자 (바닥) ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.13} />

      {/* ── 다리 & 발 (카키 바지 + 브라운 로퍼) ── */}
      <G>
        {/* 왼쪽 다리 */}
        <Rect x={36} y={80} width={9} height={11} rx={3.5} fill="url(#lynchPants)" />
        {/* 오른쪽 다리 */}
        <Rect x={55} y={80} width={9} height={11} rx={3.5} fill="url(#lynchPants)" />
        {/* 왼쪽 로퍼 */}
        <Ellipse cx={40} cy={92.5} rx={7.5} ry={3.5} fill="url(#lynchShoe)" />
        <Ellipse cx={39} cy={91.5} rx={3} ry={1.5} fill="#8D6E4C" opacity={0.25} />
        {/* 오른쪽 로퍼 */}
        <Ellipse cx={60} cy={92.5} rx={7.5} ry={3.5} fill="url(#lynchShoe)" />
        <Ellipse cx={59} cy={91.5} rx={3} ry={1.5} fill="#8D6E4C" opacity={0.25} />
      </G>

      {/* ── 몸체 + 머리 그룹 (위로 7 이동) ── */}
      <G transform="translate(0, -7)">
        {/* ── 몸체 (트위드 재킷) ── */}
        <Ellipse cx={50} cy={80} rx={26} ry={17} fill="url(#lynchJacket)" />
        {/* 재킷 라펠 */}
        <Path d="M 38 70 L 50 82 L 46 70 Z" fill="#7A5E42" />
        <Path d="M 62 70 L 50 82 L 54 70 Z" fill="#7A5E42" />
        {/* 라이트블루 셔츠 V */}
        <Path d="M 46 70 L 50 78 L 54 70 Z" fill="url(#lynchShirt)" />
        {/* 포켓 스퀘어 (accentColor) */}
        <Path d="M 34 72 L 36 68 L 39 69 L 38 73 Z" fill={accentColor} opacity={0.8} />
        <Path d="M 35.5 69 L 37 67 L 38.5 68.5" fill="none" stroke="#FFFFFF" strokeWidth={0.5} opacity={0.3} />
        {/* 트위드 패턴 힌트 */}
        <Line x1={35} y1={76} x2={42} y2={78} stroke="#5C4230" strokeWidth={0.5} opacity={0.2} />
        <Line x1={58} y1={76} x2={65} y2={78} stroke="#5C4230" strokeWidth={0.5} opacity={0.2} />

        {/* ── 얼굴 (큰 둥근 원) ── */}
        <Circle cx={50} cy={43} r={30} fill="url(#lynchFace)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={68} rx={20} ry={5} fill="#D4A574" opacity={0.3} />
        {/* 이마 하이라이트 */}
        <Ellipse cx={46} cy={28} rx={14} ry={8} fill="#FFFFFF" opacity={0.12} />

        {/* ── 머리카락 (은발 웨이브 — 풍성한 곱슬) ── */}
        <Path
          d="M 22 40 Q 18 20 32 13 Q 42 7 50 6 Q 58 7 68 13 Q 82 20 78 40"
          fill="url(#lynchHair)"
        />
        {/* 웨이브 볼륨 라인 (곱슬 느낌) */}
        <Path
          d="M 26 28 Q 32 14 42 11 Q 50 9 58 11 Q 68 14 74 28"
          fill="none" stroke="#FFFFFF" strokeWidth={2} opacity={0.3}
        />
        <Path
          d="M 28 22 Q 35 12 50 10 Q 65 12 72 22"
          fill="none" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.2}
        />
        {/* 옆머리 (풍성하게 내려온 은발) */}
        <Path d="M 22 40 Q 19 46 21 50 Q 23 52 25 49" fill="#E0E0E0" opacity={0.75} />
        <Path d="M 78 40 Q 81 46 79 50 Q 77 52 75 49" fill="#E0E0E0" opacity={0.75} />
        {/* 웨이브 텍스처 (곱슬 힌트) */}
        <Path d="M 30 18 Q 34 15 38 18" fill="none" stroke="#D8D8D8" strokeWidth={1.2} opacity={0.3} />
        <Path d="M 42 14 Q 47 11 52 14" fill="none" stroke="#D8D8D8" strokeWidth={1.2} opacity={0.3} />
        <Path d="M 58 16 Q 63 13 68 17" fill="none" stroke="#D8D8D8" strokeWidth={1.2} opacity={0.3} />

        {/* ── 안경 (둥근 원형 — 따뜻한 느낌) ── */}
        <G>
          <Circle cx={37} cy={43} r={11} fill="#1A1A2E" opacity={0.06} />
          <Circle cx={63} cy={43} r={11} fill="#1A1A2E" opacity={0.06} />
          <Circle cx={37} cy={43} r={11} fill="url(#lynchLens)" />
          <Circle cx={63} cy={43} r={11} fill="url(#lynchLens)" />
          <Circle cx={37} cy={43} r={11} fill="none" stroke="#8D6E4C" strokeWidth={2.2} />
          <Circle cx={63} cy={43} r={11} fill="none" stroke="#8D6E4C" strokeWidth={2.2} />
          {/* 브릿지 */}
          <Path d="M 48 43 Q 50 40 52 43" fill="none" stroke="#8D6E4C" strokeWidth={1.8} />
          {/* 다리 */}
          <Line x1={26} y1={41} x2={21} y2={38} stroke="#8D6E4C" strokeWidth={1.8} />
          <Line x1={74} y1={41} x2={79} y2={38} stroke="#8D6E4C" strokeWidth={1.8} />
        </G>

        {/* ── 눈 (안경 안에서 크고 따뜻한 눈) ── */}
        {blinkPhase >= 0.5 ? (
          <G>
            <Path d="M 31 43 Q 37 46 43 43" fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 57 43 Q 63 46 69 43" fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            {/* 왼쪽 눈 */}
            <Circle cx={37} cy={43} r={5.5} fill="#FFFFFF" />
            <Circle cx={38} cy={42} r={3.8} fill="#5D4037" />
            <Circle cx={39.5} cy={40.5} r={1.5} fill="#FFFFFF" />
            <Circle cx={37} cy={41} r={0.7} fill="#FFFFFF" opacity={0.5} />
            {/* 오른쪽 눈 */}
            <Circle cx={63} cy={43} r={5.5} fill="#FFFFFF" />
            <Circle cx={64} cy={42} r={3.8} fill="#5D4037" />
            <Circle cx={65.5} cy={40.5} r={1.5} fill="#FFFFFF" />
            <Circle cx={63} cy={41} r={0.7} fill="#FFFFFF" opacity={0.5} />
          </G>
        )}

        {/* bullish일 때 눈 반짝임 */}
        {expression === 'bullish' && (
          <G>
            <Path d="M 33 37 L 34 35 L 35 37 L 33 36 L 35 36 Z" fill="#FFD54F" opacity={0.7} />
            <Path d="M 59 37 L 60 35 L 61 37 L 59 36 L 61 36 Z" fill="#FFD54F" opacity={0.7} />
          </G>
        )}

        {/* ── 눈썹 ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 28 34 Q 34 30 44 34" fill="none" stroke="#A0A0A0" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 56 34 Q 66 30 72 34" fill="none" stroke="#A0A0A0" strokeWidth={2} strokeLinecap="round" />
          </G>
        ) : expression === 'bullish' ? (
          <G>
            <Path d="M 28 35 Q 34 29 44 33" fill="none" stroke="#A0A0A0" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 56 33 Q 66 29 72 35" fill="none" stroke="#A0A0A0" strokeWidth={2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 29 34 Q 36 31 44 33" fill="none" stroke="#A0A0A0" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 56 33 Q 64 31 71 34" fill="none" stroke="#A0A0A0" strokeWidth={2} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (작고 둥근 인간형) ── */}
        <Ellipse cx={50} cy={52} rx={3} ry={2.5} fill="#D4A574" />
        <Ellipse cx={49} cy={51.5} rx={1.5} ry={1} fill="#F5CBA7" opacity={0.5} />

        {/* ── 볼터치 (로즈 핑크 — 따뜻한 할아버지) ── */}
        <Circle cx={26} cy={52} r={7} fill="#FF8A80" opacity={0.22} />
        <Circle cx={74} cy={52} r={7} fill="#FF8A80" opacity={0.22} />
        <Circle cx={26} cy={51} r={4} fill="#FF8A80" opacity={0.12} />
        <Circle cx={74} cy={51} r={4} fill="#FF8A80" opacity={0.12} />

        {/* ── 미소 주름 (눈가 — 따뜻한 인상) ── */}
        <Path d="M 25 47 Q 27 50 25 53" fill="none" stroke="#D4A574" strokeWidth={0.8} opacity={0.35} />
        <Path d="M 75 47 Q 73 50 75 53" fill="none" stroke="#D4A574" strokeWidth={0.8} opacity={0.35} />

        {/* ── 입 (표정별) ── */}
        <Path d={mouthPath} fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
        {expression === 'bullish' && (
          <Path d="M 42 66 Q 50 70 58 66" fill="#FFFFFF" opacity={0.35} />
        )}

        {/* ── 땀방울 (bearish) ── */}
        {showSweat && (
          <G>
            <Path d="M 80 26 Q 82 20 84 26 Q 84 32 82 32 Q 80 32 80 26 Z" fill="#64B5F6" opacity={0.6} />
            <Ellipse cx={81.5} cy={25} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* ── 생각 거품 (cautious) ── */}
        {showThinking && (
          <G>
            <Circle cx={82} cy={24} r={3} fill="#E0E0E0" opacity={0.4} />
            <Circle cx={87} cy={17} r={4} fill="#E0E0E0" opacity={0.3} />
            <Circle cx={91} cy={8} r={5.5} fill="#E0E0E0" opacity={0.25} />
            <Circle cx={90} cy={6} r={2} fill="#FFFFFF" opacity={0.15} />
          </G>
        )}
      </G>
    </Svg>
  );
}
