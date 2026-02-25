/**
 * 마이클 세일러 캐릭터 — 비트코인 늑대 (2.5D 동물의숲 × 주토피아 스타일)
 *
 * 디자인: 뾰족한 늑대 귀, 날카로운 주둥이, 어두운 회색 털,
 *   레이저 눈 (오렌지 글로우), 가슴에 ₿ 심볼, 야성적이지만 귀여운 분위기
 *   두 발로 서 있는 주토피아 늑대 — 짧고 통통한 다리 + 둥근 발
 * 표정: bullish(하울링+반짝임) / bearish(방어적) / cautious(곁눈질) / neutral(강렬한 응시)
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect, Line,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

/* 머리+몸체를 위로 올리는 오프셋 (다리 공간 확보) */
const DY = -7;

export function SaylorCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return `M 38 ${66 + DY} Q 42 ${60 + DY} 50 ${58 + DY} Q 58 ${60 + DY} 62 ${66 + DY} Q 50 ${72 + DY} 38 ${66 + DY} Z`;
      case 'bearish':
        return `M 42 ${66 + DY} Q 50 ${62 + DY} 58 ${66 + DY}`;
      case 'cautious':
        return `M 43 ${64 + DY} L 57 ${65 + DY}`;
      case 'neutral':
      default:
        return `M 40 ${64 + DY} Q 50 ${70 + DY} 60 ${64 + DY}`;
    }
  })();

  const isBullish = expression === 'bullish';
  const isBearish = expression === 'bearish';
  const isCautious = expression === 'cautious';
  const eyeOffsetX = isCautious ? 2 : 0;

  /* 주요 Y좌표 (DY 적용) */
  const bodyY = 80 + DY;    // 73
  const faceY = 42 + DY;    // 35
  const eyeY = 40 + DY;     // 33

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="wolfFace" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#6E6E78" />
          <Stop offset="60%" stopColor="#515158" />
          <Stop offset="100%" stopColor="#3A3A42" />
        </RadialGradient>
        <LinearGradient id="wolfBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1E1E26" />
          <Stop offset="100%" stopColor="#111118" />
        </LinearGradient>
        <RadialGradient id="laserGlow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor={accentColor} stopOpacity="0.45" />
          <Stop offset="70%" stopColor={accentColor} stopOpacity="0.12" />
          <Stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="wolfEarInner" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#8A8A94" />
          <Stop offset="100%" stopColor="#6E6E78" />
        </LinearGradient>
        {/* 다리 그라데이션 — 바지 느낌 */}
        <LinearGradient id="wolfLeg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1E1E26" />
          <Stop offset="100%" stopColor="#141418" />
        </LinearGradient>
      </Defs>

      {/* ── 바닥 그림자 (발 아래) ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.15} />

      {/* ── 다리 (짧고 통통한 늑대 다리) ── */}
      {/* 왼쪽 다리 */}
      <Rect x={36} y={82} width={9} height={10} rx={4} fill="url(#wolfLeg)" />
      {/* 오른쪽 다리 */}
      <Rect x={55} y={82} width={9} height={10} rx={4} fill="url(#wolfLeg)" />

      {/* ── 발 (둥근 발바닥 — 약간 넓게) ── */}
      {/* 왼쪽 발 */}
      <Ellipse cx={40.5} cy={93} rx={7} ry={3.5} fill="#2A2A32" />
      <Ellipse cx={40.5} cy={92.5} rx={5} ry={2.2} fill="#3A3A44" opacity={0.4} />
      {/* 발가락 패드 (귀여움 포인트) */}
      <Circle cx={36} cy={92} r={1.2} fill="#4A4A54" opacity={0.35} />
      <Circle cx={40.5} cy={91} r={1.2} fill="#4A4A54" opacity={0.35} />
      <Circle cx={45} cy={92} r={1.2} fill="#4A4A54" opacity={0.35} />
      {/* 오른쪽 발 */}
      <Ellipse cx={59.5} cy={93} rx={7} ry={3.5} fill="#2A2A32" />
      <Ellipse cx={59.5} cy={92.5} rx={5} ry={2.2} fill="#3A3A44" opacity={0.4} />
      {/* 발가락 패드 */}
      <Circle cx={55} cy={92} r={1.2} fill="#4A4A54" opacity={0.35} />
      <Circle cx={59.5} cy={91} r={1.2} fill="#4A4A54" opacity={0.35} />
      <Circle cx={64} cy={92} r={1.2} fill="#4A4A54" opacity={0.35} />

      {/* ── 몸체 (검은 재킷) ── */}
      <Ellipse cx={50} cy={bodyY} rx={26} ry={17} fill="url(#wolfBody)" />
      <Ellipse cx={50} cy={bodyY - 2} rx={14} ry={10} fill="#C0C0CA" opacity={0.15} />
      {/* ₿ 메달 */}
      <Circle cx={50} cy={bodyY} r={6} fill={accentColor} opacity={0.85} />
      <Circle cx={50} cy={bodyY} r={4.5} fill="none" stroke="#FFFFFF" strokeWidth={0.8} opacity={0.5} />
      <Path
        d={`M 48.2 ${bodyY - 2.5} L 48.2 ${bodyY + 2.5} M 48.2 ${bodyY - 2.5} Q 53 ${bodyY - 3} 53 ${bodyY - 1} Q 53 ${bodyY} 50 ${bodyY} M 48.2 ${bodyY} Q 53.5 ${bodyY} 53.5 ${bodyY + 1.5} Q 53.5 ${bodyY + 3} 48.2 ${bodyY + 2.5}`}
        fill="none" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round"
      />
      {/* 라펠 */}
      <Path d={`M 36 ${70 + DY} L 48 ${82 + DY} L 44 ${70 + DY} Z`} fill="#2A2A34" />
      <Path d={`M 64 ${70 + DY} L 52 ${82 + DY} L 56 ${70 + DY} Z`} fill="#2A2A34" />

      {/* ── 얼굴 ── */}
      <Ellipse cx={50} cy={faceY} rx={28} ry={30} fill="url(#wolfFace)" />
      <Ellipse cx={46} cy={26 + DY} rx={12} ry={6} fill="#FFFFFF" opacity={0.08} />
      <Ellipse cx={50} cy={68 + DY} rx={18} ry={5} fill="#2A2A30" opacity={0.25} />

      {/* ── 늑대 귀 (뾰족한 삼각형) ── */}
      <Path d={`M 27 ${32 + DY} L 18 ${4 + DY} L 38 ${22 + DY} Z`} fill="#515158" />
      <Path d={`M 28 ${28 + DY} L 22 ${10 + DY} L 36 ${24 + DY} Z`} fill="url(#wolfEarInner)" />
      <Path d={`M 73 ${32 + DY} L 82 ${4 + DY} L 62 ${22 + DY} Z`} fill="#515158" />
      <Path d={`M 72 ${28 + DY} L 78 ${10 + DY} L 64 ${24 + DY} Z`} fill="url(#wolfEarInner)" />

      {/* ── 주둥이 (밝은 영역) ── */}
      <Ellipse cx={50} cy={55 + DY} rx={14} ry={11} fill="#8A8A94" opacity={0.5} />
      <Ellipse cx={50} cy={53 + DY} rx={10} ry={7} fill="#9E9EA8" opacity={0.35} />

      {/* ── 코 (삼각형 늑대 코) ── */}
      <Path d={`M 46 ${50 + DY} Q 50 ${46 + DY} 54 ${50 + DY} Q 50 ${53 + DY} 46 ${50 + DY} Z`} fill="#1A1A20" />
      <Ellipse cx={49} cy={49 + DY} rx={1.5} ry={1} fill="#FFFFFF" opacity={0.25} />

      {/* ── 레이저 눈 글로우 ── */}
      {!isBearish && blinkPhase < 0.5 && (
        <G>
          <Circle cx={37} cy={eyeY} r={10} fill="url(#laserGlow)" />
          <Circle cx={63} cy={eyeY} r={10} fill="url(#laserGlow)" />
        </G>
      )}
      {isBullish && blinkPhase < 0.5 && (
        <G>
          <Line x1={27} y1={eyeY} x2={22} y2={eyeY} stroke={accentColor} strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
          <Line x1={73} y1={eyeY} x2={78} y2={eyeY} stroke={accentColor} strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
          <Line x1={28} y1={eyeY - 3} x2={24} y2={eyeY - 5} stroke={accentColor} strokeWidth={1} opacity={0.3} strokeLinecap="round" />
          <Line x1={72} y1={eyeY - 3} x2={76} y2={eyeY - 5} stroke={accentColor} strokeWidth={1} opacity={0.3} strokeLinecap="round" />
        </G>
      )}

      {/* ── 눈 ── */}
      {blinkPhase >= 0.5 ? (
        <G>
          <Path d={`M 31 ${eyeY} Q 37 ${eyeY + 2} 43 ${eyeY}`} fill="none" stroke="#1A1A20" strokeWidth={2.5} strokeLinecap="round" />
          <Path d={`M 57 ${eyeY} Q 63 ${eyeY + 2} 69 ${eyeY}`} fill="none" stroke="#1A1A20" strokeWidth={2.5} strokeLinecap="round" />
        </G>
      ) : isBearish ? (
        <G>
          <Ellipse cx={37} cy={eyeY} rx={5} ry={2.5} fill="#FFFFFF" />
          <Circle cx={38} cy={eyeY} r={2.2} fill="#1A1A20" />
          <Ellipse cx={63} cy={eyeY} rx={5} ry={2.5} fill="#FFFFFF" />
          <Circle cx={64} cy={eyeY} r={2.2} fill="#1A1A20" />
        </G>
      ) : (
        <G>
          <Circle cx={37} cy={eyeY} r={isBullish ? 6.5 : 5.5} fill="#FFFFFF" />
          <Circle cx={37 + eyeOffsetX} cy={eyeY - 1} r={isBullish ? 4.5 : 3.8} fill="#1A1A20" />
          <Circle cx={38.5 + eyeOffsetX} cy={eyeY - 2.5} r={1.5} fill="#FFFFFF" />
          <Circle cx={36 + eyeOffsetX} cy={eyeY - 1.5} r={0.7} fill="#FFFFFF" opacity={0.5} />
          <Circle cx={63} cy={eyeY} r={isBullish ? 6.5 : 5.5} fill="#FFFFFF" />
          <Circle cx={63 + eyeOffsetX} cy={eyeY - 1} r={isBullish ? 4.5 : 3.8} fill="#1A1A20" />
          <Circle cx={64.5 + eyeOffsetX} cy={eyeY - 2.5} r={1.5} fill="#FFFFFF" />
          <Circle cx={62 + eyeOffsetX} cy={eyeY - 1.5} r={0.7} fill="#FFFFFF" opacity={0.5} />
        </G>
      )}

      {/* ── bullish 눈 반짝임 (골드 별 스파클) ── */}
      {isBullish && blinkPhase < 0.5 && (
        <G>
          <Path d={`M 30 ${eyeY - 6} L 31.5 ${eyeY - 9} L 33 ${eyeY - 6} L 30 ${eyeY - 7} L 33 ${eyeY - 7} Z`} fill="#FFD54F" opacity={0.7} />
          <Path d={`M 60 ${eyeY - 6} L 61.5 ${eyeY - 9} L 63 ${eyeY - 6} L 60 ${eyeY - 7} L 63 ${eyeY - 7} Z`} fill="#FFD54F" opacity={0.7} />
          {/* 작은 보조 스파클 */}
          <Path d={`M 44 ${eyeY - 8} L 44.8 ${eyeY - 10} L 45.6 ${eyeY - 8} L 44 ${eyeY - 9} L 45.6 ${eyeY - 9} Z`} fill="#FFD54F" opacity={0.45} />
          <Path d={`M 55 ${eyeY - 8} L 55.8 ${eyeY - 10} L 56.6 ${eyeY - 8} L 55 ${eyeY - 9} L 56.6 ${eyeY - 9} Z`} fill="#FFD54F" opacity={0.45} />
        </G>
      )}

      {/* ── 눈썹 ── */}
      {isBearish ? (
        <G>
          <Path d={`M 29 ${34 + DY} Q 35 ${30 + DY} 43 ${35 + DY}`} fill="none" stroke="#3A3A42" strokeWidth={2.5} strokeLinecap="round" />
          <Path d={`M 57 ${35 + DY} Q 65 ${30 + DY} 71 ${34 + DY}`} fill="none" stroke="#3A3A42" strokeWidth={2.5} strokeLinecap="round" />
        </G>
      ) : isBullish ? (
        <G>
          <Path d={`M 28 ${34 + DY} Q 34 ${28 + DY} 44 ${32 + DY}`} fill="none" stroke="#3A3A42" strokeWidth={2.5} strokeLinecap="round" />
          <Path d={`M 56 ${32 + DY} Q 66 ${28 + DY} 72 ${34 + DY}`} fill="none" stroke="#3A3A42" strokeWidth={2.5} strokeLinecap="round" />
        </G>
      ) : (
        <G>
          <Path d={`M 29 ${34 + DY} Q 36 ${31 + DY} 43 ${33 + DY}`} fill="none" stroke="#3A3A42" strokeWidth={2} strokeLinecap="round" />
          <Path d={`M 57 ${33 + DY} Q 64 ${31 + DY} 71 ${34 + DY}`} fill="none" stroke="#3A3A42" strokeWidth={2} strokeLinecap="round" />
        </G>
      )}

      {/* ── 입 (표정별) ── */}
      {isBullish ? (
        <G>
          <Path d={mouthPath} fill="#2A1520" stroke="#3A3A42" strokeWidth={1.5} />
          <Path d={`M 43 ${62 + DY} L 45 ${65 + DY} L 47 ${62 + DY}`} fill="#FFFFFF" opacity={0.8} />
          <Path d={`M 53 ${62 + DY} L 55 ${65 + DY} L 57 ${62 + DY}`} fill="#FFFFFF" opacity={0.8} />
        </G>
      ) : (
        <Path d={mouthPath} fill="none" stroke="#3A3A42" strokeWidth={2} strokeLinecap="round" />
      )}

      {/* ── 볼터치 ── */}
      <Circle cx={24} cy={50 + DY} r={5} fill={accentColor} opacity={0.1} />
      <Circle cx={76} cy={50 + DY} r={5} fill={accentColor} opacity={0.1} />

      {/* ── 수염 (늑대 뺨 털) ── */}
      <Line x1={30} y1={54 + DY} x2={18} y2={52 + DY} stroke="#9E9EA8" strokeWidth={0.8} opacity={0.3} />
      <Line x1={30} y1={57 + DY} x2={17} y2={58 + DY} stroke="#9E9EA8" strokeWidth={0.8} opacity={0.3} />
      <Line x1={70} y1={54 + DY} x2={82} y2={52 + DY} stroke="#9E9EA8" strokeWidth={0.8} opacity={0.3} />
      <Line x1={70} y1={57 + DY} x2={83} y2={58 + DY} stroke="#9E9EA8" strokeWidth={0.8} opacity={0.3} />

      {/* ── 땀방울 (bearish) ── */}
      {isBearish && (
        <G>
          <Path d={`M 80 ${24 + DY} Q 82 ${18 + DY} 84 ${24 + DY} Q 84 ${30 + DY} 82 ${30 + DY} Q 80 ${30 + DY} 80 ${24 + DY} Z`} fill="#64B5F6" opacity={0.6} />
          <Ellipse cx={81.5} cy={23 + DY} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
        </G>
      )}

      {/* ── 생각 거품 (cautious) ── */}
      {isCautious && (
        <G>
          <Circle cx={82} cy={22 + DY} r={3} fill="#E0E0E0" opacity={0.4} />
          <Circle cx={87} cy={15 + DY} r={4} fill="#E0E0E0" opacity={0.3} />
          <Circle cx={91} cy={7 + DY} r={5.5} fill="#E0E0E0" opacity={0.25} />
          <Circle cx={90} cy={5 + DY} r={2} fill="#FFFFFF" opacity={0.15} />
        </G>
      )}
    </Svg>
  );
}
