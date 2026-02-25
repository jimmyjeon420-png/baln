/**
 * 스탠리 드러킨밀러 캐릭터 — 매크로 치타 (주토피아 × 동물의숲 SD 스타일)
 *
 * 디자인 키워드: 골든 앰버 모피, 치타 눈물자국, 날카로운 눈, 반점 패턴
 * 컨셉: 가장 빠른 스트라이크 — 매크로 기회를 포착하는 사냥꾼
 * 입체감: RadialGradient + 하이라이트 + 반점 레이어
 * 다리: 주토피아 SD 스타일 짧은 두 다리 + 둥근 발바닥
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

/* ── Y-offset: 전체를 5유닛 위로 올려 다리 공간 확보 ── */
const DY = -5;

export function DruckenmillerCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return `M 43 ${60 + DY} Q 50 ${65 + DY} 57 ${60 + DY}`;
      case 'bearish':
        return `M 44 ${62 + DY} Q 50 ${58 + DY} 56 ${62 + DY}`;
      case 'cautious':
        return `M 45 ${61 + DY} L 55 ${61 + DY}`;
      case 'neutral':
      default:
        return `M 44 ${60 + DY} Q 50 ${62.5 + DY} 56 ${60 + DY}`;
    }
  })();

  const showSweat = expression === 'bearish';
  const showFocus = expression === 'cautious';
  const tailUp = expression === 'bullish';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 머리 그라데이션: 골든 앰버 */}
        <RadialGradient id="cheetahHead" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE082" />
          <Stop offset="50%" stopColor="#FFCA28" />
          <Stop offset="100%" stopColor="#FFA000" />
        </RadialGradient>
        {/* 몸체 그라데이션 */}
        <LinearGradient id="cheetahBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFC107" />
          <Stop offset="100%" stopColor="#F59E0B" />
        </LinearGradient>
        {/* 가슴 밝은 크림 */}
        <RadialGradient id="cheetahChest" cx="50%" cy="40%" rx="50%" ry="60%">
          <Stop offset="0%" stopColor="#FFF8E1" />
          <Stop offset="100%" stopColor="#FFE082" />
        </RadialGradient>
        {/* 다리 그라데이션 */}
        <LinearGradient id="cheetahLeg" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0%" stopColor="#FFCA28" />
          <Stop offset="100%" stopColor="#F9A825" />
        </LinearGradient>
      </Defs>

      {/* ── 바닥 그림자 ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.13} />

      {/* ── 꼬리 (슬림, 뒤로 커브, 반점 + 검은 끝) ── */}
      <Path
        d={tailUp
          ? `M 72 ${72 + DY} Q 88 ${58 + DY} 86 ${46 + DY}`
          : `M 72 ${72 + DY} Q 86 ${66 + DY} 88 ${74 + DY}`}
        fill="none" stroke="#FFCA28" strokeWidth={4.5} strokeLinecap="round"
      />
      {/* 꼬리 반점 */}
      <Circle cx={tailUp ? 82 : 80} cy={tailUp ? 56 + DY : 68 + DY} r={1.5} fill="#5D4037" opacity={0.6} />
      <Circle cx={tailUp ? 86 : 85} cy={tailUp ? 50 + DY : 72 + DY} r={1.3} fill="#5D4037" opacity={0.6} />
      {/* 꼬리 검은 끝 */}
      <Circle cx={tailUp ? 86 : 88} cy={tailUp ? 46 + DY : 74 + DY} r={3} fill="#3E2723" />

      {/* ── 다리 (짧고 뭉뚝한 SD 두 다리) ── */}
      <Rect x={37} y={82} width={8} height={10} rx={3.5} fill="url(#cheetahLeg)" />
      <Circle cx={37.5} cy={85} r={0.8} fill="#5D4037" opacity={0.4} />
      <Rect x={55} y={82} width={8} height={10} rx={3.5} fill="url(#cheetahLeg)" />
      <Circle cx={59.5} cy={86} r={0.8} fill="#5D4037" opacity={0.4} />

      {/* ── 둥근 발 (발바닥 패드) ── */}
      <Ellipse cx={41} cy={93} rx={6} ry={3.5} fill="#E8A317" />
      <Ellipse cx={41} cy={93.5} rx={2.5} ry={1.5} fill="#D4893B" opacity={0.5} />
      <Ellipse cx={59} cy={93} rx={6} ry={3.5} fill="#E8A317" />
      <Ellipse cx={59} cy={93.5} rx={2.5} ry={1.5} fill="#D4893B" opacity={0.5} />

      {/* ── 몸체 (골든 앰버) ── */}
      <Ellipse cx={50} cy={76 + DY} rx={22} ry={15} fill="url(#cheetahBody)" />
      {/* 가슴 밝은 크림 패치 */}
      <Ellipse cx={50} cy={74 + DY} rx={12} ry={10} fill="url(#cheetahChest)" opacity={0.7} />
      {/* 몸체 반점 */}
      <Circle cx={34} cy={72 + DY} r={1.5} fill="#5D4037" opacity={0.45} />
      <Circle cx={66} cy={72 + DY} r={1.5} fill="#5D4037" opacity={0.45} />
      <Circle cx={38} cy={78 + DY} r={1.2} fill="#5D4037" opacity={0.4} />
      <Circle cx={62} cy={78 + DY} r={1.2} fill="#5D4037" opacity={0.4} />
      {/* 재킷/조끼 라인 */}
      <Path d={`M 38 ${66 + DY} L 42 ${82 + DY}`} fill="none" stroke="#E65100" strokeWidth={0.8} opacity={0.25} />
      <Path d={`M 62 ${66 + DY} L 58 ${82 + DY}`} fill="none" stroke="#E65100" strokeWidth={0.8} opacity={0.25} />
      {/* 재킷 칼라 액센트 */}
      <Circle cx={50} cy={66 + DY} r={2.2} fill={accentColor} opacity={0.65} />
      <Circle cx={50} cy={66 + DY} r={1} fill="#FFFFFF" opacity={0.3} />

      {/* ── 머리 (큰 둥근 골든 앰버 원) ── */}
      <Circle cx={50} cy={38 + DY} r={29} fill="url(#cheetahHead)" />
      {/* 이마 하이라이트 */}
      <Ellipse cx={44} cy={24 + DY} rx={13} ry={7} fill="#FFFFFF" opacity={0.13} />

      {/* ── 귀 (둥근 작은 귀, 검은 팁) ── */}
      {/* 왼쪽 귀 */}
      <Ellipse cx={28} cy={18 + DY} rx={7} ry={9} fill="#FFA000" />
      <Ellipse cx={28} cy={18 + DY} rx={4.5} ry={6} fill="#FFCC80" opacity={0.6} />
      <Ellipse cx={28} cy={17 + DY} rx={3} ry={4} fill="#FFAB91" opacity={0.3} />
      <Ellipse cx={28} cy={12 + DY} rx={5} ry={3.5} fill="#3E2723" opacity={0.75} />
      {/* 오른쪽 귀 */}
      <Ellipse cx={72} cy={18 + DY} rx={7} ry={9} fill="#FFA000" />
      <Ellipse cx={72} cy={18 + DY} rx={4.5} ry={6} fill="#FFCC80" opacity={0.6} />
      <Ellipse cx={72} cy={17 + DY} rx={3} ry={4} fill="#FFAB91" opacity={0.3} />
      <Ellipse cx={72} cy={12 + DY} rx={5} ry={3.5} fill="#3E2723" opacity={0.75} />

      {/* ── 이마 & 볼 반점 (치타 특유 패턴) ── */}
      <Circle cx={40} cy={26 + DY} r={1.4} fill="#5D4037" opacity={0.5} />
      <Circle cx={50} cy={22 + DY} r={1.2} fill="#5D4037" opacity={0.45} />
      <Circle cx={60} cy={26 + DY} r={1.4} fill="#5D4037" opacity={0.5} />
      <Circle cx={35} cy={32 + DY} r={1.1} fill="#5D4037" opacity={0.4} />
      <Circle cx={65} cy={32 + DY} r={1.1} fill="#5D4037" opacity={0.4} />
      <Circle cx={45} cy={30 + DY} r={1.0} fill="#5D4037" opacity={0.35} />
      <Circle cx={55} cy={30 + DY} r={1.0} fill="#5D4037" opacity={0.35} />

      {/* ── 주둥이 (크림색 머즐) ── */}
      <Ellipse cx={50} cy={52 + DY} rx={11} ry={8} fill="#FFF8E1" opacity={0.75} />
      {/* 코 (둥근 삼각형) */}
      <Path d={`M 47 ${49 + DY} Q 50 ${46 + DY} 53 ${49 + DY} Q 50 ${51 + DY} 47 ${49 + DY} Z`} fill="#1A1A1A" />
      <Ellipse cx={49} cy={48 + DY} rx={1} ry={0.6} fill="#FFFFFF" opacity={0.25} />

      {/* ── 눈물자국 (치타 시그니처 — 얇고 귀엽게) ── */}
      <Path d={`M 40 ${42 + DY} Q 39 ${48 + DY} 42 ${54 + DY}`} fill="none" stroke="#3E2723" strokeWidth={1.3} strokeLinecap="round" opacity={0.55} />
      <Path d={`M 60 ${42 + DY} Q 61 ${48 + DY} 58 ${54 + DY}`} fill="none" stroke="#3E2723" strokeWidth={1.3} strokeLinecap="round" opacity={0.55} />

      {/* ── 눈 ── */}
      {blinkPhase >= 0.5 ? (
        <G>
          <Path d={`M 32 ${39 + DY} Q 37 ${41 + DY} 42 ${39 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
          <Path d={`M 58 ${39 + DY} Q 63 ${41 + DY} 68 ${39 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
        </G>
      ) : (
        <G>
          {/* 왼쪽 눈 (아몬드형, 살짝 날카로운) */}
          <Ellipse cx={37} cy={39 + DY} rx={6.5} ry={expression === 'cautious' ? 4 : 5} fill="#FFFFFF" />
          <Circle cx={38} cy={38.5 + DY} r={3.5} fill="#FF8F00" />
          <Circle cx={38} cy={38.5 + DY} r={1.8} fill="#1A1A1A" />
          <Circle cx={39.5} cy={37 + DY} r={1.2} fill="#FFFFFF" />
          <Circle cx={37} cy={37.5 + DY} r={0.6} fill="#FFFFFF" opacity={0.6} />
          {/* 오른쪽 눈 */}
          <Ellipse cx={63} cy={39 + DY} rx={6.5} ry={expression === 'cautious' ? 4 : 5} fill="#FFFFFF" />
          <Circle cx={64} cy={38.5 + DY} r={3.5} fill="#FF8F00" />
          <Circle cx={64} cy={38.5 + DY} r={1.8} fill="#1A1A1A" />
          <Circle cx={65.5} cy={37 + DY} r={1.2} fill="#FFFFFF" />
          <Circle cx={63} cy={37.5 + DY} r={0.6} fill="#FFFFFF" opacity={0.6} />
        </G>
      )}

      {/* cautious — 눈 상단 집중 가리개 (반쯤 감은 눈) */}
      {showFocus && blinkPhase < 0.5 && (
        <G>
          <Rect x={29.5} y={34 + DY} width={15} height={4.5} rx={2} fill="#FFCA28" opacity={0.55} />
          <Rect x={55.5} y={34 + DY} width={15} height={4.5} rx={2} fill="#FFCA28" opacity={0.55} />
        </G>
      )}

      {/* ── 눈썹 ── */}
      {expression === 'bearish' ? (
        <G>
          <Path d={`M 29 ${33 + DY} Q 36 ${29 + DY} 43 ${33 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2} strokeLinecap="round" />
          <Path d={`M 57 ${33 + DY} Q 64 ${29 + DY} 71 ${33 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2} strokeLinecap="round" />
        </G>
      ) : expression === 'bullish' ? (
        <G>
          <Path d={`M 29 ${33 + DY} Q 36 ${28 + DY} 43 ${31 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2} strokeLinecap="round" />
          <Path d={`M 57 ${31 + DY} Q 64 ${28 + DY} 71 ${33 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2} strokeLinecap="round" />
        </G>
      ) : (
        <G>
          <Path d={`M 30 ${32 + DY} Q 36 ${29 + DY} 43 ${31 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2} strokeLinecap="round" />
          <Path d={`M 57 ${31 + DY} Q 64 ${29 + DY} 70 ${32 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2} strokeLinecap="round" />
        </G>
      )}

      {/* ── 볼 블러시 (따뜻한 오렌지) ── */}
      <Circle cx={26} cy={46 + DY} r={5.5} fill="#FF8A65" opacity={0.22} />
      <Circle cx={74} cy={46 + DY} r={5.5} fill="#FF8A65" opacity={0.22} />

      {/* ── 입 ── */}
      <Path d={mouthPath} fill="none" stroke="#5D4037" strokeWidth={1.4} strokeLinecap="round" />
      {expression === 'bullish' && (
        <Path d={`M 46 ${62 + DY} Q 50 ${64 + DY} 54 ${62 + DY}`} fill="#FFFFFF" opacity={0.25} />
      )}

      {/* ── 땀방울 (bearish) ── */}
      {showSweat && (
        <G>
          <Path d={`M 79 ${22 + DY} Q 81 ${16 + DY} 83 ${22 + DY} Q 83 ${28 + DY} 81 ${28 + DY} Q 79 ${28 + DY} 79 ${22 + DY} Z`} fill="#64B5F6" opacity={0.5} />
          <Ellipse cx={80.5} cy={20 + DY} rx={1} ry={0.7} fill="#FFFFFF" opacity={0.4} />
        </G>
      )}

      {/* ── 집중 타깃 이펙트 (cautious) ── */}
      {showFocus && (
        <G>
          <Circle cx={84} cy={16 + DY} r={5} fill="none" stroke={accentColor} strokeWidth={1} opacity={0.3} />
          <Path d={`M 84 ${10 + DY} L 84 ${22 + DY}`} fill="none" stroke={accentColor} strokeWidth={0.7} opacity={0.25} />
          <Path d={`M 78 ${16 + DY} L 90 ${16 + DY}`} fill="none" stroke={accentColor} strokeWidth={0.7} opacity={0.25} />
        </G>
      )}

      {/* ── bullish 반짝임 스타 ── */}
      {expression === 'bullish' && (
        <G>
          <Path d={`M 20 ${22 + DY} L 21 ${19.5 + DY} L 22 ${22 + DY} L 19.5 ${21 + DY} L 22.5 ${21 + DY} Z`} fill="#FFD54F" opacity={0.6} />
          <Path d={`M 78 ${32 + DY} L 79 ${29.5 + DY} L 80 ${32 + DY} L 77.5 ${31 + DY} L 80.5 ${31 + DY} Z`} fill="#FFD54F" opacity={0.6} />
        </G>
      )}
    </Svg>
  );
}
