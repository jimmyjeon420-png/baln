/**
 * 마이클 세일러 캐릭터 — 비트코인 맥시멀리스트
 *
 * 디자인 키워드: 짙은 갈색/검정 단발 머리, 강한 턱선, 넓은 얼굴, 강렬한 눈빛,
 *   다크 네이비 정장, 노타이 오픈칼라(테크 CEO 스타일), 라펠에 비트코인 핀(accentColor)
 * 컨셉: 비트코인에 올인하는 뚝심의 맥시멀리스트
 * 비율: 치비/SD (큰 머리, 작은 몸) — 100x100 viewBox
 * 표정: bullish(레이저 아이 + 환한 미소) / bearish(걱정+땀) / cautious(생각) / neutral(강렬한 응시)
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect, Line,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

/* 머리+몸체를 위로 올리는 오프셋 (다리 공간 확보) */
const DY = -6;

export function SaylorCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return `M 38 ${62 + DY} Q 50 ${72 + DY} 62 ${62 + DY}`;
      case 'bearish':
        return `M 42 ${65 + DY} Q 50 ${60 + DY} 58 ${65 + DY}`;
      case 'cautious':
        return `M 43 ${63 + DY} L 57 ${63 + DY}`;
      case 'neutral':
      default:
        return `M 40 ${62 + DY} Q 50 ${66 + DY} 60 ${62 + DY}`;
    }
  })();

  const isBullish = expression === 'bullish';
  const isBearish = expression === 'bearish';
  const isCautious = expression === 'cautious';

  const eyeY = 42 + DY;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 피부 그라데이션 */}
        <RadialGradient id="saylorFace" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE0C0" />
          <Stop offset="55%" stopColor="#F5CBA7" />
          <Stop offset="100%" stopColor="#D4A574" />
        </RadialGradient>
        {/* 정장 그라데이션 — 다크 네이비 */}
        <LinearGradient id="saylorSuit" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1A1A3E" />
          <Stop offset="100%" stopColor="#0E0E28" />
        </LinearGradient>
        {/* 머리카락 — 짙은 갈색/검정 */}
        <RadialGradient id="saylorHair" cx="50%" cy="30%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#3A3028" />
          <Stop offset="50%" stopColor="#2A2018" />
          <Stop offset="100%" stopColor="#1A1008" />
        </RadialGradient>
        {/* 레이저 아이 글로우 (bullish 전용) */}
        <RadialGradient id="laserGlow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FF6600" stopOpacity="0.5" />
          <Stop offset="60%" stopColor="#FF6600" stopOpacity="0.15" />
          <Stop offset="100%" stopColor="#FF6600" stopOpacity="0" />
        </RadialGradient>
        {/* 바지 그라데이션 */}
        <LinearGradient id="saylorPants" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#14142E" />
          <Stop offset="100%" stopColor="#0A0A1E" />
        </LinearGradient>
        {/* 구두 그라데이션 */}
        <RadialGradient id="saylorShoe" cx="45%" cy="35%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#2C2C2C" />
          <Stop offset="100%" stopColor="#111111" />
        </RadialGradient>
      </Defs>

      {/* ── 바닥 그림자 ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.15} />

      {/* ── 다리 (네이비 바지) ── */}
      <Rect x={36} y={81} width={9} height={10} rx={3.5} fill="url(#saylorPants)" />
      <Rect x={55} y={81} width={9} height={10} rx={3.5} fill="url(#saylorPants)" />

      {/* ── 구두 (다크 옥스포드) ── */}
      <Ellipse cx={40.5} cy={92} rx={7} ry={3.5} fill="url(#saylorShoe)" />
      <Ellipse cx={39.5} cy={91} rx={3} ry={1.3} fill="#3A3A3A" opacity={0.25} />
      <Ellipse cx={59.5} cy={92} rx={7} ry={3.5} fill="url(#saylorShoe)" />
      <Ellipse cx={58.5} cy={91} rx={3} ry={1.3} fill="#3A3A3A" opacity={0.25} />

      {/* ── 몸체+머리 그룹 ── */}
      <G>
        {/* ── 몸체 (다크 네이비 정장, 넓은 어깨) ── */}
        <Ellipse cx={50} cy={78 + DY} rx={26} ry={16} fill="url(#saylorSuit)" />
        {/* 라펠 */}
        <Path d={`M 36 ${68 + DY} L 49 ${80 + DY} L 44 ${68 + DY} Z`} fill="#22224A" />
        <Path d={`M 64 ${68 + DY} L 51 ${80 + DY} L 56 ${68 + DY} Z`} fill="#22224A" />
        {/* 오픈 칼라 셔츠 (노타이) */}
        <Path d={`M 45 ${68 + DY} L 50 ${76 + DY} L 55 ${68 + DY}`} fill="#FFFFFF" opacity={0.13} />
        <Path d={`M 47 ${66 + DY} Q 50 ${68 + DY} 53 ${66 + DY}`} fill="none" stroke="#DDDDDD" strokeWidth={0.8} opacity={0.3} />
        {/* 비트코인 핀 (accentColor) — 왼쪽 라펠 */}
        <Circle cx={42} cy={72 + DY} r={3.5} fill={accentColor} opacity={0.9} />
        <Circle cx={42} cy={72 + DY} r={2.5} fill="none" stroke="#FFFFFF" strokeWidth={0.6} opacity={0.5} />
        <Path
          d={`M 40.8 ${70.5 + DY} L 40.8 ${73.5 + DY} M 40.8 ${70.5 + DY} Q 43.5 ${70 + DY} 43.5 ${71.2 + DY} Q 43.5 ${71.8 + DY} 42 ${72 + DY} M 40.8 ${72 + DY} Q 44 ${72 + DY} 44 ${73 + DY} Q 44 ${73.8 + DY} 40.8 ${73.5 + DY}`}
          fill="none" stroke="#FFFFFF" strokeWidth={0.7} strokeLinecap="round"
        />

        {/* ── 얼굴 (넓고 강한 턱선) ── */}
        <Ellipse cx={50} cy={42 + DY} rx={28} ry={28} fill="url(#saylorFace)" />
        {/* 턱선 강조 (약간 각진 느낌) */}
        <Path d={`M 26 ${50 + DY} Q 36 ${70 + DY} 50 ${70 + DY} Q 64 ${70 + DY} 74 ${50 + DY}`} fill="url(#saylorFace)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={66 + DY} rx={20} ry={5} fill="#D4A574" opacity={0.25} />
        {/* 이마 하이라이트 */}
        <Ellipse cx={47} cy={24 + DY} rx={12} ry={7} fill="#FFFFFF" opacity={0.1} />

        {/* ── 머리카락 (짙은 갈색/검정, 단정하고 풍성) ── */}
        <Path
          d={`M 24 ${34 + DY} Q 22 ${14 + DY} 36 ${10 + DY} Q 50 ${6 + DY} 64 ${10 + DY} Q 78 ${14 + DY} 76 ${34 + DY}`}
          fill="url(#saylorHair)"
        />
        {/* 앞머리 볼륨 */}
        <Path
          d={`M 28 ${30 + DY} Q 30 ${12 + DY} 50 ${9 + DY} Q 70 ${12 + DY} 72 ${30 + DY}`}
          fill="url(#saylorHair)"
        />
        {/* 옆머리 */}
        <Path d={`M 24 ${34 + DY} Q 22 ${40 + DY} 23 ${44 + DY}`} fill="#2A2018" opacity={0.6} />
        <Path d={`M 76 ${34 + DY} Q 78 ${40 + DY} 77 ${44 + DY}`} fill="#2A2018" opacity={0.6} />
        {/* 머리 광택 */}
        <Path
          d={`M 34 ${14 + DY} Q 48 ${9 + DY} 62 ${14 + DY}`}
          fill="none" stroke="#FFFFFF" strokeWidth={1} opacity={0.15}
        />

        {/* ── 귀 (인간 귀) ── */}
        <Ellipse cx={23} cy={44 + DY} rx={4.5} ry={6.5} fill="#F5CBA7" />
        <Ellipse cx={23.5} cy={44 + DY} rx={2.8} ry={4.5} fill="#E8BE8A" opacity={0.4} />
        <Ellipse cx={77} cy={44 + DY} rx={4.5} ry={6.5} fill="#F5CBA7" />
        <Ellipse cx={76.5} cy={44 + DY} rx={2.8} ry={4.5} fill="#E8BE8A" opacity={0.4} />

        {/* ── 레이저 아이 글로우 (bullish 전용) ── */}
        {isBullish && blinkPhase < 0.5 && (
          <G>
            <Circle cx={38} cy={eyeY} r={11} fill="url(#laserGlow)" />
            <Circle cx={62} cy={eyeY} r={11} fill="url(#laserGlow)" />
            {/* 레이저 빔 선 */}
            <Line x1={28} y1={eyeY} x2={22} y2={eyeY} stroke="#FF6600" strokeWidth={1.5} opacity={0.45} strokeLinecap="round" />
            <Line x1={72} y1={eyeY} x2={78} y2={eyeY} stroke="#FF6600" strokeWidth={1.5} opacity={0.45} strokeLinecap="round" />
            <Line x1={29} y1={eyeY - 3} x2={24} y2={eyeY - 5} stroke="#FF6600" strokeWidth={1} opacity={0.3} strokeLinecap="round" />
            <Line x1={71} y1={eyeY - 3} x2={76} y2={eyeY - 5} stroke="#FF6600" strokeWidth={1} opacity={0.3} strokeLinecap="round" />
          </G>
        )}

        {/* ── 눈 (크고 강렬한, 두꺼운 눈썹) ── */}
        {blinkPhase >= 0.5 ? (
          <G>
            <Path d={`M 31 ${eyeY} Q 38 ${eyeY + 2} 45 ${eyeY}`} fill="none" stroke="#3E2723" strokeWidth={2.5} strokeLinecap="round" />
            <Path d={`M 55 ${eyeY} Q 62 ${eyeY + 2} 69 ${eyeY}`} fill="none" stroke="#3E2723" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : isBearish ? (
          <G>
            {/* bearish: 작고 불안한 눈 */}
            <Ellipse cx={38} cy={eyeY} rx={5.5} ry={3} fill="#FFFFFF" />
            <Circle cx={39} cy={eyeY} r={2.5} fill="#2A1A0A" />
            <Circle cx={39.8} cy={eyeY - 1} r={0.8} fill="#FFFFFF" />
            <Ellipse cx={62} cy={eyeY} rx={5.5} ry={3} fill="#FFFFFF" />
            <Circle cx={63} cy={eyeY} r={2.5} fill="#2A1A0A" />
            <Circle cx={63.8} cy={eyeY - 1} r={0.8} fill="#FFFFFF" />
          </G>
        ) : (
          <G>
            {/* 왼쪽 눈 — 크고 둥글며 강렬 */}
            <Circle cx={38} cy={eyeY} r={isBullish ? 6.5 : 6} fill="#FFFFFF" />
            <Circle cx={39} cy={eyeY - 0.5} r={isBullish ? 4.5 : 4} fill="#2A1A0A" />
            <Circle cx={40.2} cy={eyeY - 2} r={1.5} fill="#FFFFFF" />
            <Circle cx={38} cy={eyeY - 1} r={0.6} fill="#FFFFFF" opacity={0.5} />
            {/* 오른쪽 눈 */}
            <Circle cx={62} cy={eyeY} r={isBullish ? 6.5 : 6} fill="#FFFFFF" />
            <Circle cx={63} cy={eyeY - 0.5} r={isBullish ? 4.5 : 4} fill="#2A1A0A" />
            <Circle cx={64.2} cy={eyeY - 2} r={1.5} fill="#FFFFFF" />
            <Circle cx={62} cy={eyeY - 1} r={0.6} fill="#FFFFFF" opacity={0.5} />
          </G>
        )}

        {/* bullish 눈 반짝임 스파클 */}
        {isBullish && blinkPhase < 0.5 && (
          <G>
            <Path d={`M 30 ${eyeY - 7} L 31.5 ${eyeY - 10} L 33 ${eyeY - 7} L 30 ${eyeY - 8} L 33 ${eyeY - 8} Z`} fill="#FFD54F" opacity={0.7} />
            <Path d={`M 67 ${eyeY - 7} L 68.5 ${eyeY - 10} L 70 ${eyeY - 7} L 67 ${eyeY - 8} L 70 ${eyeY - 8} Z`} fill="#FFD54F" opacity={0.7} />
          </G>
        )}

        {/* ── 눈썹 (두껍고 진한 — 세일러 특징) ── */}
        {isBearish ? (
          <G>
            <Path d={`M 29 ${35 + DY} Q 37 ${30 + DY} 45 ${35 + DY}`} fill="none" stroke="#2A1A0A" strokeWidth={2.8} strokeLinecap="round" />
            <Path d={`M 55 ${35 + DY} Q 63 ${30 + DY} 71 ${35 + DY}`} fill="none" stroke="#2A1A0A" strokeWidth={2.8} strokeLinecap="round" />
          </G>
        ) : isBullish ? (
          <G>
            <Path d={`M 28 ${35 + DY} Q 35 ${29 + DY} 45 ${33 + DY}`} fill="none" stroke="#2A1A0A" strokeWidth={2.8} strokeLinecap="round" />
            <Path d={`M 55 ${33 + DY} Q 65 ${29 + DY} 72 ${35 + DY}`} fill="none" stroke="#2A1A0A" strokeWidth={2.8} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d={`M 29 ${34 + DY} Q 36 ${31 + DY} 45 ${33 + DY}`} fill="none" stroke="#2A1A0A" strokeWidth={2.5} strokeLinecap="round" />
            <Path d={`M 55 ${33 + DY} Q 64 ${31 + DY} 71 ${34 + DY}`} fill="none" stroke="#2A1A0A" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (넓고 존재감 있는) ── */}
        <Ellipse cx={50} cy={52 + DY} rx={3.5} ry={2.8} fill="#E8BE8A" />
        <Ellipse cx={49} cy={51 + DY} rx={1.8} ry={1.2} fill="#F5CBA7" opacity={0.5} />

        {/* ── 볼터치 ── */}
        <Circle cx={26} cy={50 + DY} r={5.5} fill="#FF8A80" opacity={0.15} />
        <Circle cx={74} cy={50 + DY} r={5.5} fill="#FF8A80" opacity={0.15} />

        {/* ── 입 (표정별) ── */}
        {isBullish ? (
          <G>
            <Path d={mouthPath} fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
            <Path d={`M 43 ${64 + DY} Q 50 ${68 + DY} 57 ${64 + DY}`} fill="#FFFFFF" opacity={0.35} />
          </G>
        ) : (
          <Path d={mouthPath} fill="none" stroke="#8D6E63" strokeWidth={1.8} strokeLinecap="round" />
        )}

        {/* ── 5시 그림자 (턱수염 자국 — 세일러 특징) ── */}
        <Ellipse cx={50} cy={60 + DY} rx={14} ry={8} fill="#B0A090" opacity={0.06} />

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
            <Circle cx={82} cy={24 + DY} r={3} fill="#E0E0E0" opacity={0.4} />
            <Circle cx={87} cy={17 + DY} r={4} fill="#E0E0E0" opacity={0.3} />
            <Circle cx={91} cy={9 + DY} r={5.5} fill="#E0E0E0" opacity={0.25} />
            <Circle cx={90} cy={7 + DY} r={2} fill="#FFFFFF" opacity={0.15} />
          </G>
        )}
      </G>
    </Svg>
  );
}
