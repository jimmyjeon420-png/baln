/**
 * 제이미 다이먼 캐릭터 — 월스트리트의 수호자
 *
 * 디자인 키워드: 실버 머리, 넓은 얼굴, 네이비 핀스트라이프 수트, 레드 넥타이
 * 입체감: RadialGradient + LinearGradient + 하이라이트 + 그림자
 * 표정 변화: bullish(자신감 미소) / bearish(걱정+땀방울) / cautious(생각 중) / neutral(위엄 차분)
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect, Line,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

export function DimonCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return 'M 38 60 Q 50 70 62 60';
      case 'bearish':
        return 'M 40 64 Q 50 58 60 64';
      case 'cautious':
        return 'M 42 62 L 58 62';
      case 'neutral':
      default:
        return 'M 40 60 Q 50 66 60 60';
    }
  })();

  const showSweat = expression === 'bearish';
  const showThinking = expression === 'cautious';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 피부 그라데이션 — 코카시안 톤 */}
        <RadialGradient id="dimonSkin" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE0C0" />
          <Stop offset="55%" stopColor="#F5CBA7" />
          <Stop offset="100%" stopColor="#D4A574" />
        </RadialGradient>
        {/* 머리카락 — 실버/그레이 */}
        <LinearGradient id="dimonHair" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#D0D0D0" />
          <Stop offset="50%" stopColor="#B0B0B0" />
          <Stop offset="100%" stopColor="#909090" />
        </LinearGradient>
        {/* 수트 — 네이비 핀스트라이프 */}
        <LinearGradient id="dimonSuit" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1A237E" />
          <Stop offset="100%" stopColor="#0D1642" />
        </LinearGradient>
        {/* 셔츠 */}
        <LinearGradient id="dimonShirt" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#E8E8E8" />
        </LinearGradient>
        {/* 바지 — 네이비 */}
        <LinearGradient id="dimonPants" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1A237E" />
          <Stop offset="100%" stopColor="#111A5C" />
        </LinearGradient>
        {/* 구두 */}
        <RadialGradient id="dimonShoe" cx="50%" cy="40%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#333333" />
          <Stop offset="100%" stopColor="#1A1A1A" />
        </RadialGradient>
      </Defs>

      {/* ── 바닥 그림자 ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.13} />

      {/* ── 다리 & 구두 ── */}
      <G>
        {/* 왼쪽 바지 다리 */}
        <Rect x={36} y={82} width={10} height={10} rx={4} fill="url(#dimonPants)" />
        {/* 왼쪽 핀스트라이프 */}
        <Line x1={39} y1={82} x2={39} y2={92} stroke="#2A3499" strokeWidth={0.4} opacity={0.3} />
        <Line x1={43} y1={82} x2={43} y2={92} stroke="#2A3499" strokeWidth={0.4} opacity={0.3} />
        {/* 왼쪽 구두 */}
        <Ellipse cx={41} cy={93} rx={7} ry={3.5} fill="url(#dimonShoe)" />
        <Ellipse cx={40} cy={92} rx={4} ry={1.5} fill="#444444" opacity={0.4} />

        {/* 오른쪽 바지 다리 */}
        <Rect x={54} y={82} width={10} height={10} rx={4} fill="url(#dimonPants)" />
        {/* 오른쪽 핀스트라이프 */}
        <Line x1={57} y1={82} x2={57} y2={92} stroke="#2A3499" strokeWidth={0.4} opacity={0.3} />
        <Line x1={61} y1={82} x2={61} y2={92} stroke="#2A3499" strokeWidth={0.4} opacity={0.3} />
        {/* 오른쪽 구두 */}
        <Ellipse cx={59} cy={93} rx={7} ry={3.5} fill="url(#dimonShoe)" />
        <Ellipse cx={60} cy={92} rx={4} ry={1.5} fill="#444444" opacity={0.4} />
      </G>

      {/* ── 머리+몸체 그룹 (SD 비율) ── */}
      <G transform="translate(0, -6)">

        {/* ── 몸체 (넓은 수트) ── */}
        <Ellipse cx={50} cy={82} rx={27} ry={16} fill="url(#dimonSuit)" />
        {/* 핀스트라이프 라인들 */}
        <Line x1={32} y1={72} x2={30} y2={94} stroke="#2A3499" strokeWidth={0.4} opacity={0.25} />
        <Line x1={38} y1={68} x2={37} y2={96} stroke="#2A3499" strokeWidth={0.4} opacity={0.25} />
        <Line x1={44} y1={67} x2={44} y2={97} stroke="#2A3499" strokeWidth={0.4} opacity={0.25} />
        <Line x1={56} y1={67} x2={56} y2={97} stroke="#2A3499" strokeWidth={0.4} opacity={0.25} />
        <Line x1={62} y1={68} x2={63} y2={96} stroke="#2A3499" strokeWidth={0.4} opacity={0.25} />
        <Line x1={68} y1={72} x2={70} y2={94} stroke="#2A3499" strokeWidth={0.4} opacity={0.25} />
        {/* 셔츠 V 라인 */}
        <Path d="M 46 70 L 50 80 L 54 70" fill="url(#dimonShirt)" />
        {/* 라펠 (수트 옷깃) */}
        <Path d="M 37 70 L 48 82 L 46 70 Z" fill="#1E2A8A" />
        <Path d="M 63 70 L 52 82 L 54 70 Z" fill="#1E2A8A" />
        {/* 넥타이 — accentColor 사용 */}
        <Path d="M 48 70 L 50 88 L 52 70 Z" fill={accentColor} />
        <Rect x={47} y={68} width={6} height={3.5} rx={1.5} fill={accentColor} />
        {/* 넥타이 줄무늬 디테일 */}
        <Line x1={49} y1={74} x2={51} y2={74} stroke="#FFFFFF" strokeWidth={0.5} opacity={0.25} />
        <Line x1={49.2} y1={78} x2={50.8} y2={78} stroke="#FFFFFF" strokeWidth={0.5} opacity={0.25} />
        <Line x1={49.4} y1={82} x2={50.6} y2={82} stroke="#FFFFFF" strokeWidth={0.5} opacity={0.25} />
        {/* 가슴 포켓 스퀘어 */}
        <Path d="M 34 74 L 36 72 L 38 74 L 36 73.5 Z" fill="#FFFFFF" opacity={0.5} />

        {/* ── 머리카락 (실버, 뒤로 빗어 넘긴 스타일) ── */}
        <Path
          d="M 20 40 Q 18 22 28 12 Q 38 4 50 3 Q 62 4 72 12 Q 82 22 80 40
             Q 78 32 72 24 Q 62 14 50 13 Q 38 14 28 24 Q 22 32 20 40 Z"
          fill="url(#dimonHair)"
        />
        {/* 머리 볼륨 (두꺼운 헤어) */}
        <Path
          d="M 22 38 Q 20 24 30 14 Q 40 6 50 5 Q 60 6 70 14 Q 80 24 78 38"
          fill="none" stroke="#C8C8C8" strokeWidth={3} opacity={0.4}
        />
        {/* 빗질 결 (comb lines) */}
        <Path d="M 32 14 Q 40 8 50 7 Q 58 8 64 12" fill="none" stroke="#E0E0E0" strokeWidth={0.8} opacity={0.3} />
        <Path d="M 28 20 Q 38 12 50 10 Q 62 12 70 18" fill="none" stroke="#E0E0E0" strokeWidth={0.6} opacity={0.25} />
        {/* 옆머리 (사이드) */}
        <Path d="M 20 40 Q 18 34 20 28" fill="none" stroke="#A0A0A0" strokeWidth={2.5} opacity={0.3} />
        <Path d="M 80 40 Q 82 34 80 28" fill="none" stroke="#A0A0A0" strokeWidth={2.5} opacity={0.3} />

        {/* ── 귀 ── */}
        <Ellipse cx={21} cy={42} rx={4} ry={6} fill="#F5CBA7" />
        <Ellipse cx={21} cy={42} rx={2.5} ry={4} fill="#E8B898" opacity={0.5} />
        <Ellipse cx={79} cy={42} rx={4} ry={6} fill="#F5CBA7" />
        <Ellipse cx={79} cy={42} rx={2.5} ry={4} fill="#E8B898" opacity={0.5} />

        {/* ── 얼굴 (넓은 턱) ── */}
        <Circle cx={50} cy={44} r={28} fill="url(#dimonSkin)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={67} rx={20} ry={5} fill="#C49050" opacity={0.2} />
        {/* 이마 하이라이트 */}
        <Ellipse cx={46} cy={28} rx={12} ry={6} fill="#FFFFFF" opacity={0.08} />
        {/* 넓은 턱 강조 */}
        <Ellipse cx={50} cy={58} rx={22} ry={8} fill="#E8BB8A" opacity={0.15} />

        {/* ── 눈 ── */}
        {blinkPhase >= 0.5 ? (
          <G>
            <Path d="M 32 42 Q 38 44 44 42" fill="none" stroke="#4A3728" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 56 42 Q 62 44 68 42" fill="none" stroke="#4A3728" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : expression === 'cautious' ? (
          <G>
            {/* 좁힌 생각하는 눈 */}
            <Ellipse cx={38} cy={42} rx={5} ry={3.5} fill="#FFFFFF" />
            <Circle cx={39} cy={42} r={2.5} fill="#2C1810" />
            <Circle cx={40} cy={41} r={1} fill="#FFFFFF" />
            <Ellipse cx={62} cy={42} rx={5} ry={3.5} fill="#FFFFFF" />
            <Circle cx={63} cy={42} r={2.5} fill="#2C1810" />
            <Circle cx={64} cy={41} r={1} fill="#FFFFFF" />
          </G>
        ) : (
          <G>
            {/* 자신감 있는 눈 — 약간 좁게 (알파 에너지) */}
            <Ellipse cx={38} cy={42} rx={expression === 'bullish' ? 6 : 5.5} ry={expression === 'bullish' ? 5 : 4.5} fill="#FFFFFF" />
            <Circle cx={39} cy={42} r={3.5} fill="#2C1810" />
            <Circle cx={40} cy={40.5} r={1.5} fill="#FFFFFF" />
            <Circle cx={38} cy={41} r={0.7} fill="#FFFFFF" opacity={0.5} />
            <Ellipse cx={62} cy={42} rx={expression === 'bullish' ? 6 : 5.5} ry={expression === 'bullish' ? 5 : 4.5} fill="#FFFFFF" />
            <Circle cx={63} cy={42} r={3.5} fill="#2C1810" />
            <Circle cx={64} cy={40.5} r={1.5} fill="#FFFFFF" />
            <Circle cx={62} cy={41} r={0.7} fill="#FFFFFF" opacity={0.5} />
          </G>
        )}

        {/* bullish 눈 반짝임 */}
        {expression === 'bullish' && (
          <G>
            <Path d="M 35 36 L 36 34 L 37 36 L 35 35 L 37 35 Z" fill="#FFD700" opacity={0.7} />
            <Path d="M 59 36 L 60 34 L 61 36 L 59 35 L 61 35 Z" fill="#FFD700" opacity={0.7} />
          </G>
        )}

        {/* ── 눈썹 (굵고 권위적) ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 30 35 Q 36 31 45 34" fill="none" stroke="#808080" strokeWidth={2.8} strokeLinecap="round" />
            <Path d="M 55 34 Q 64 31 70 35" fill="none" stroke="#808080" strokeWidth={2.8} strokeLinecap="round" />
          </G>
        ) : expression === 'bullish' ? (
          <G>
            <Path d="M 31 34 Q 36 30 45 33" fill="none" stroke="#909090" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 55 33 Q 64 30 69 34" fill="none" stroke="#909090" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 31 35 Q 36 32 45 34" fill="none" stroke="#909090" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 55 34 Q 64 32 69 35" fill="none" stroke="#909090" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (사람 코 — 세로 라인 + 콧볼) ── */}
        <Path d="M 50 46 L 48 54 Q 50 56 52 54 L 50 46" fill="none" stroke="#D4A574" strokeWidth={1.5} opacity={0.6} />
        <Circle cx={46.5} cy={54} r={2} fill="#E8BB8A" opacity={0.3} />
        <Circle cx={53.5} cy={54} r={2} fill="#E8BB8A" opacity={0.3} />

        {/* ── 볼터치 ── */}
        <Circle cx={27} cy={50} r={6} fill="#FF8A80" opacity={0.12} />
        <Circle cx={73} cy={50} r={6} fill="#FF8A80" opacity={0.12} />

        {/* ── 입 (표정별) ── */}
        <Path d={mouthPath} fill="none" stroke="#B87A5A" strokeWidth={2} strokeLinecap="round" />
        {expression === 'bullish' && (
          <Path d="M 42 63 Q 50 67 58 63" fill="#FFFFFF" opacity={0.3} />
        )}

        {/* ── 땀방울 (bearish) ── */}
        {showSweat && (
          <G>
            <Path d="M 82 28 Q 84 22 86 28 Q 86 34 84 34 Q 82 34 82 28 Z" fill="#64B5F6" opacity={0.6} />
            <Ellipse cx={83.5} cy={27} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* ── 생각 거품 (cautious) ── */}
        {showThinking && (
          <G>
            <Circle cx={83} cy={22} r={3} fill="#E0E0E0" opacity={0.4} />
            <Circle cx={88} cy={15} r={4} fill="#E0E0E0" opacity={0.3} />
            <Circle cx={92} cy={7} r={5.5} fill="#E0E0E0" opacity={0.25} />
            <Circle cx={91} cy={5} r={2} fill="#FFFFFF" opacity={0.15} />
          </G>
        )}
      </G>
    </Svg>
  );
}
