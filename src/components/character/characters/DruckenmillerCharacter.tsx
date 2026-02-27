/**
 * 스탠리 드러킨밀러 캐릭터 — 매크로 트레이딩의 전설
 *
 * 디자인 키워드: 회색 은발(약간 후퇴), 날카로운 분석가 눈매, 가늘고 길쭉한 얼굴,
 *   차콜 그레이 핀스트라이프 정장, 흰 셔츠, 넥타이(accentColor), 프로페셔널 슬림 실루엣
 * 컨셉: 매크로 기회를 누구보다 빨리 포착하는 냉철한 분석가
 * 비율: 치비/SD (큰 머리, 작은 몸) — 100x100 viewBox
 * 표정: bullish(밝은 미소) / bearish(걱정+땀방울) / cautious(생각) / neutral(차분)
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

/* ── Y-offset: 머리+몸체를 위로 올려 다리 공간 확보 ── */
const DY = -6;

export function DruckenmillerCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return `M 40 ${60 + DY} Q 50 ${67 + DY} 60 ${60 + DY}`;
      case 'bearish':
        return `M 42 ${63 + DY} Q 50 ${58 + DY} 58 ${63 + DY}`;
      case 'cautious':
        return `M 43 ${61 + DY} L 57 ${61 + DY}`;
      case 'neutral':
      default:
        return `M 42 ${60 + DY} Q 50 ${63 + DY} 58 ${60 + DY}`;
    }
  })();

  const showSweat = expression === 'bearish';
  const showThinking = expression === 'cautious';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 피부 그라데이션 */}
        <RadialGradient id="druckFace" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE0C0" />
          <Stop offset="55%" stopColor="#F5CBA7" />
          <Stop offset="100%" stopColor="#D4A574" />
        </RadialGradient>
        {/* 정장 그라데이션 — 차콜 그레이 */}
        <LinearGradient id="druckSuit" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#3A3A44" />
          <Stop offset="100%" stopColor="#2A2A32" />
        </LinearGradient>
        {/* 머리카락 — 은발/회색 */}
        <RadialGradient id="druckHair" cx="50%" cy="30%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#D0D0D8" />
          <Stop offset="50%" stopColor="#B8B8C0" />
          <Stop offset="100%" stopColor="#909098" />
        </RadialGradient>
        {/* 바지 그라데이션 */}
        <LinearGradient id="druckPants" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#2A2A32" />
          <Stop offset="100%" stopColor="#1E1E26" />
        </LinearGradient>
        {/* 구두 그라데이션 */}
        <RadialGradient id="druckShoe" cx="45%" cy="35%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#2C2C2C" />
          <Stop offset="100%" stopColor="#111111" />
        </RadialGradient>
      </Defs>

      {/* ── 바닥 그림자 ── */}
      <Ellipse cx={50} cy={97} rx={20} ry={3} fill="#000000" opacity={0.13} />

      {/* ── 다리 (차콜 바지) ── */}
      <Rect x={37} y={81} width={8} height={10} rx={3} fill="url(#druckPants)" />
      <Rect x={55} y={81} width={8} height={10} rx={3} fill="url(#druckPants)" />

      {/* ── 구두 (블랙 옥스포드) ── */}
      <Ellipse cx={41} cy={92} rx={6.5} ry={3.2} fill="url(#druckShoe)" />
      <Ellipse cx={40} cy={91} rx={2.8} ry={1.3} fill="#3A3A3A" opacity={0.25} />
      <Ellipse cx={59} cy={92} rx={6.5} ry={3.2} fill="url(#druckShoe)" />
      <Ellipse cx={58} cy={91} rx={2.8} ry={1.3} fill="#3A3A3A" opacity={0.25} />

      {/* ── 몸체+머리 그룹 (DY offset) ── */}
      <G>
        {/* ── 몸체 (차콜 그레이 정장, 슬림) ── */}
        <Ellipse cx={50} cy={78 + DY} rx={23} ry={15} fill="url(#druckSuit)" />
        {/* 핀스트라이프 (미세한 줄) */}
        <Path d={`M 35 ${68 + DY} L 35 ${88 + DY}`} fill="none" stroke="#505060" strokeWidth={0.4} opacity={0.25} />
        <Path d={`M 42 ${66 + DY} L 42 ${90 + DY}`} fill="none" stroke="#505060" strokeWidth={0.4} opacity={0.25} />
        <Path d={`M 58 ${66 + DY} L 58 ${90 + DY}`} fill="none" stroke="#505060" strokeWidth={0.4} opacity={0.25} />
        <Path d={`M 65 ${68 + DY} L 65 ${88 + DY}`} fill="none" stroke="#505060" strokeWidth={0.4} opacity={0.25} />
        {/* 라펠 */}
        <Path d={`M 37 ${68 + DY} L 49 ${80 + DY} L 44 ${68 + DY} Z`} fill="#444450" />
        <Path d={`M 63 ${68 + DY} L 51 ${80 + DY} L 56 ${68 + DY} Z`} fill="#444450" />
        {/* 흰 셔츠 V */}
        <Path d={`M 46 ${68 + DY} L 50 ${76 + DY} L 54 ${68 + DY}`} fill="#FFFFFF" opacity={0.15} />
        {/* 넥타이 (accentColor) */}
        <Path d={`M 48 ${68 + DY} L 50 ${83 + DY} L 52 ${68 + DY} Z`} fill={accentColor} />
        <Rect x={47.5} y={65 + DY} width={5} height={3.5} rx={1.2} fill={accentColor} />

        {/* ── 얼굴 (약간 길쭉한 타원 — 마른 얼굴) ── */}
        <Ellipse cx={50} cy={42 + DY} rx={26} ry={28} fill="url(#druckFace)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={65 + DY} rx={18} ry={5} fill="#D4A574" opacity={0.25} />
        {/* 이마 하이라이트 */}
        <Ellipse cx={46} cy={22 + DY} rx={12} ry={7} fill="#FFFFFF" opacity={0.1} />

        {/* ── 머리카락 (은발, 약간 후퇴한 헤어라인, 깔끔한 빗어넘김) ── */}
        <Path
          d={`M 26 ${36 + DY} Q 24 ${18 + DY} 38 ${14 + DY} Q 50 ${10 + DY} 62 ${14 + DY} Q 76 ${18 + DY} 74 ${36 + DY}`}
          fill="url(#druckHair)"
        />
        {/* 후퇴한 헤어라인 (이마 양옆 피부 드러냄) */}
        <Ellipse cx={32} cy={22 + DY} rx={6} ry={8} fill="url(#druckFace)" />
        <Ellipse cx={68} cy={22 + DY} rx={6} ry={8} fill="url(#druckFace)" />
        {/* 옆머리 살짝 */}
        <Path d={`M 26 ${36 + DY} Q 24 ${42 + DY} 25 ${44 + DY}`} fill="#B8B8C0" opacity={0.5} />
        <Path d={`M 74 ${36 + DY} Q 76 ${42 + DY} 75 ${44 + DY}`} fill="#B8B8C0" opacity={0.5} />
        {/* 은발 광택 */}
        <Path
          d={`M 36 ${16 + DY} Q 48 ${11 + DY} 60 ${16 + DY}`}
          fill="none" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.2}
        />

        {/* ── 귀 (인간 귀) ── */}
        <Ellipse cx={24} cy={44 + DY} rx={4} ry={6} fill="#F5CBA7" />
        <Ellipse cx={24.5} cy={44 + DY} rx={2.5} ry={4} fill="#E8BE8A" opacity={0.4} />
        <Ellipse cx={76} cy={44 + DY} rx={4} ry={6} fill="#F5CBA7" />
        <Ellipse cx={75.5} cy={44 + DY} rx={2.5} ry={4} fill="#E8BE8A" opacity={0.4} />

        {/* ── 눈 (날카롭고 분석적, 약간 좁은 타원) ── */}
        {blinkPhase >= 0.5 ? (
          <G>
            <Path d={`M 32 ${42 + DY} Q 38 ${44 + DY} 44 ${42 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
            <Path d={`M 56 ${42 + DY} Q 62 ${44 + DY} 68 ${42 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            {/* 왼쪽 눈 — 약간 좁은 아몬드형 */}
            <Ellipse cx={38} cy={42 + DY} rx={6} ry={expression === 'cautious' ? 3.5 : 4.5} fill="#FFFFFF" />
            <Circle cx={39} cy={41.5 + DY} r={3} fill="#4A6E5A" />
            <Circle cx={39} cy={41.5 + DY} r={1.6} fill="#1A1A1A" />
            <Circle cx={40.2} cy={40 + DY} r={1.1} fill="#FFFFFF" />
            <Circle cx={38} cy={40.5 + DY} r={0.5} fill="#FFFFFF" opacity={0.5} />
            {/* 오른쪽 눈 */}
            <Ellipse cx={62} cy={42 + DY} rx={6} ry={expression === 'cautious' ? 3.5 : 4.5} fill="#FFFFFF" />
            <Circle cx={63} cy={41.5 + DY} r={3} fill="#4A6E5A" />
            <Circle cx={63} cy={41.5 + DY} r={1.6} fill="#1A1A1A" />
            <Circle cx={64.2} cy={40 + DY} r={1.1} fill="#FFFFFF" />
            <Circle cx={62} cy={40.5 + DY} r={0.5} fill="#FFFFFF" opacity={0.5} />
          </G>
        )}

        {/* cautious — 눈 반쯤 감은 효과 */}
        {showThinking && blinkPhase < 0.5 && (
          <G>
            <Rect x={31} y={37 + DY} width={14} height={4} rx={2} fill="url(#druckFace)" opacity={0.6} />
            <Rect x={55} y={37 + DY} width={14} height={4} rx={2} fill="url(#druckFace)" opacity={0.6} />
          </G>
        )}

        {/* ── 눈썹 (진하고 날카로운 — 분석가 인상) ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d={`M 30 ${36 + DY} Q 37 ${32 + DY} 44 ${36 + DY}`} fill="none" stroke="#6B6B70" strokeWidth={2.2} strokeLinecap="round" />
            <Path d={`M 56 ${36 + DY} Q 63 ${32 + DY} 70 ${36 + DY}`} fill="none" stroke="#6B6B70" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ) : expression === 'bullish' ? (
          <G>
            <Path d={`M 30 ${36 + DY} Q 36 ${31 + DY} 44 ${34 + DY}`} fill="none" stroke="#6B6B70" strokeWidth={2.2} strokeLinecap="round" />
            <Path d={`M 56 ${34 + DY} Q 64 ${31 + DY} 70 ${36 + DY}`} fill="none" stroke="#6B6B70" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d={`M 31 ${35 + DY} Q 37 ${32 + DY} 44 ${34 + DY}`} fill="none" stroke="#6B6B70" strokeWidth={2} strokeLinecap="round" />
            <Path d={`M 56 ${34 + DY} Q 63 ${32 + DY} 69 ${35 + DY}`} fill="none" stroke="#6B6B70" strokeWidth={2} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (prominent, 길쭉한 — 드러킨밀러 특징) ── */}
        <Path d={`M 50 ${46 + DY} Q 48 ${52 + DY} 50 ${55 + DY} Q 52 ${52 + DY} 50 ${46 + DY}`} fill="#E8BE8A" />
        <Ellipse cx={49} cy={50 + DY} rx={1.5} ry={1} fill="#F5CBA7" opacity={0.5} />

        {/* ── 볼터치 (자연스러운 핑크) ── */}
        <Circle cx={28} cy={50 + DY} r={5.5} fill="#FF8A80" opacity={0.15} />
        <Circle cx={72} cy={50 + DY} r={5.5} fill="#FF8A80" opacity={0.15} />

        {/* ── 입 (표정별) ── */}
        <Path d={mouthPath} fill="none" stroke="#8D6E63" strokeWidth={1.5} strokeLinecap="round" />
        {expression === 'bullish' && (
          <Path d={`M 44 ${62 + DY} Q 50 ${65 + DY} 56 ${62 + DY}`} fill="#FFFFFF" opacity={0.3} />
        )}

        {/* ── 땀방울 (bearish) ── */}
        {showSweat && (
          <G>
            <Path d={`M 79 ${26 + DY} Q 81 ${20 + DY} 83 ${26 + DY} Q 83 ${32 + DY} 81 ${32 + DY} Q 79 ${32 + DY} 79 ${26 + DY} Z`} fill="#64B5F6" opacity={0.55} />
            <Ellipse cx={80.5} cy={24 + DY} rx={1} ry={0.7} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* ── 생각 거품 (cautious) ── */}
        {showThinking && (
          <G>
            <Circle cx={81} cy={24 + DY} r={3} fill="#E0E0E0" opacity={0.4} />
            <Circle cx={86} cy={17 + DY} r={4} fill="#E0E0E0" opacity={0.3} />
            <Circle cx={90} cy={9 + DY} r={5.5} fill="#E0E0E0" opacity={0.25} />
            <Circle cx={89} cy={7 + DY} r={2} fill="#FFFFFF" opacity={0.15} />
          </G>
        )}

        {/* ── bullish 반짝임 스타 ── */}
        {expression === 'bullish' && (
          <G>
            <Path d={`M 20 ${22 + DY} L 21 ${19.5 + DY} L 22 ${22 + DY} L 19.5 ${21 + DY} L 22.5 ${21 + DY} Z`} fill="#FFD54F" opacity={0.6} />
            <Path d={`M 78 ${30 + DY} L 79 ${27.5 + DY} L 80 ${30 + DY} L 77.5 ${29 + DY} L 80.5 ${29 + DY} Z`} fill="#FFD54F" opacity={0.5} />
          </G>
        )}
      </G>
    </Svg>
  );
}
