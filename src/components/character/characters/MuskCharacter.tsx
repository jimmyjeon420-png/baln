/**
 * 일론 머스크 캐릭터 — 장난꾸러기 카멜레온/게코 (Zootopia 스타일 이족보행)
 *
 * 디자인 키워드: 일렉트릭 옐로우, 라임 그린 몸체, 번개 마킹, 돔 볏, 말리는 꼬리
 * 컨셉: 예측불가 혁신가 — Rango meets Zootopia, 장난끼 가득한 트릭스터
 * 표정: 카멜레온 특유의 양눈 독립 움직임 + 번개 액센트
 * 다리: 짧고 통통한 SD 이족보행 + 카멜레온 발가락
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

/* ── 전체 Y 오프셋: 머리+몸을 위로 7유닛 이동 ── */
const DY = -7;

export function MuskCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return `M 34 ${64 + DY} Q 50 ${76 + DY} 66 ${64 + DY}`;
      case 'bearish':
        return `M 40 ${66 + DY} Q 50 ${60 + DY} 60 ${66 + DY}`;
      case 'cautious':
        return `M 42 ${64 + DY} Q 50 ${67 + DY} 58 ${64 + DY}`;
      case 'neutral':
      default:
        return `M 40 ${63 + DY} Q 50 ${69 + DY} 60 ${63 + DY}`;
    }
  })();

  const showSweat = expression === 'bearish';
  const showSpark = expression === 'cautious';

  /* 카멜레온 눈 — 표정별 동공 위치 (양눈 독립!) */
  const leftPupil = (() => {
    switch (expression) {
      case 'bullish':  return { cx: 35, cy: 38 + DY };
      case 'bearish':  return { cx: 34, cy: 41 + DY };
      case 'cautious': return { cx: 32, cy: 38 + DY };
      default:         return { cx: 34, cy: 39 + DY };
    }
  })();
  const rightPupil = (() => {
    switch (expression) {
      case 'bullish':  return { cx: 65, cy: 38 + DY };
      case 'bearish':  return { cx: 67, cy: 42 + DY };
      case 'cautious': return { cx: 68, cy: 37 + DY };
      default:         return { cx: 66, cy: 39 + DY };
    }
  })();

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 머리 입체감 — 라임 그린 */}
        <RadialGradient id="muskHead" cx="44%" cy="38%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#A5D6A7" />
          <Stop offset="55%" stopColor="#81C784" />
          <Stop offset="100%" stopColor="#4CAF50" />
        </RadialGradient>
        {/* 몸체 — 짙은 그린 */}
        <LinearGradient id="muskBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#66BB6A" />
          <Stop offset="100%" stopColor="#388E3C" />
        </LinearGradient>
        {/* 배 — 밝은 연두 */}
        <RadialGradient id="muskBelly" cx="50%" cy="45%" rx="50%" ry="55%">
          <Stop offset="0%" stopColor="#E8F5E9" />
          <Stop offset="100%" stopColor="#C8E6C9" />
        </RadialGradient>
        {/* 번개 글로우 */}
        <LinearGradient id="muskBolt" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FDD835" />
          <Stop offset="100%" stopColor={accentColor} />
        </LinearGradient>
        {/* 다리 그라디언트 */}
        <LinearGradient id="muskLeg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#66BB6A" />
          <Stop offset="100%" stopColor="#43A047" />
        </LinearGradient>
        {/* 발 그라디언트 */}
        <RadialGradient id="muskFoot" cx="50%" cy="40%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#81C784" />
          <Stop offset="100%" stopColor="#388E3C" />
        </RadialGradient>
      </Defs>

      {/* ── 그림자 (발 아래 바닥) ── */}
      <Ellipse cx={50} cy={97} rx={26} ry={3.5} fill="#000000" opacity={0.13} />

      {/* ── 꼬리 (말리는 카멜레온 꼬리) — 위로 DY 이동 ── */}
      <Path
        d={`M 72 ${78 + DY} Q 85 ${72 + DY} 88 ${60 + DY} Q 90 ${52 + DY} 84 ${50 + DY} Q 78 ${49 + DY} 80 ${55 + DY} Q 82 ${60 + DY} 78 ${62 + DY}`}
        fill="none"
        stroke="#4CAF50"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Path
        d={`M 72 ${78 + DY} Q 85 ${72 + DY} 88 ${60 + DY} Q 90 ${52 + DY} 84 ${50 + DY} Q 78 ${49 + DY} 80 ${55 + DY} Q 82 ${60 + DY} 78 ${62 + DY}`}
        fill="none"
        stroke="#81C784"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* ── 몸체 — 위로 DY 이동 ── */}
      <Ellipse cx={50} cy={80 + DY} rx={25} ry={17} fill="url(#muskBody)" />
      {/* 배 (밝은 부분) */}
      <Ellipse cx={50} cy={82 + DY} rx={16} ry={11} fill="url(#muskBelly)" />

      {/* ── 번개 마킹 (가슴) ── */}
      <Path
        d={`M 48 ${72 + DY} L 52 ${72 + DY} L 49 ${78 + DY} L 54 ${78 + DY} L 47 ${87 + DY} L 50 ${80 + DY} L 46 ${80 + DY} Z`}
        fill="url(#muskBolt)"
        opacity={0.7}
      />

      {/* ══════════════════════════════════════════
          ── 다리 & 발 (Zootopia 스타일 SD 이족보행) ──
          ══════════════════════════════════════════ */}

      {/* ── 왼쪽 다리 ── */}
      <Rect x={36} y={82} width={9} height={10} rx={4} fill="url(#muskLeg)" />
      {/* 왼쪽 무릎 하이라이트 */}
      <Ellipse cx={40.5} cy={85} rx={3} ry={2} fill="#A5D6A7" opacity={0.25} />

      {/* ── 오른쪽 다리 ── */}
      <Rect x={55} y={82} width={9} height={10} rx={4} fill="url(#muskLeg)" />
      {/* 오른쪽 무릎 하이라이트 */}
      <Ellipse cx={59.5} cy={85} rx={3} ry={2} fill="#A5D6A7" opacity={0.25} />

      {/* ── 왼쪽 발 (카멜레온 — 3갈래 발가락) ── */}
      <Ellipse cx={39} cy={93} rx={8} ry={3.5} fill="url(#muskFoot)" />
      {/* 발가락 범프 3개 */}
      <Circle cx={33} cy={93.5} r={2} fill="#43A047" />
      <Circle cx={39} cy={94.5} r={2} fill="#43A047" />
      <Circle cx={45} cy={93.5} r={2} fill="#43A047" />
      {/* 발가락 하이라이트 */}
      <Circle cx={33} cy={92.5} r={1} fill="#A5D6A7" opacity={0.35} />
      <Circle cx={39} cy={93.5} r={1} fill="#A5D6A7" opacity={0.35} />
      <Circle cx={45} cy={92.5} r={1} fill="#A5D6A7" opacity={0.35} />

      {/* ── 오른쪽 발 (카멜레온 — 3갈래 발가락) ── */}
      <Ellipse cx={61} cy={93} rx={8} ry={3.5} fill="url(#muskFoot)" />
      {/* 발가락 범프 3개 */}
      <Circle cx={55} cy={93.5} r={2} fill="#43A047" />
      <Circle cx={61} cy={94.5} r={2} fill="#43A047" />
      <Circle cx={67} cy={93.5} r={2} fill="#43A047" />
      {/* 발가락 하이라이트 */}
      <Circle cx={55} cy={92.5} r={1} fill="#A5D6A7" opacity={0.35} />
      <Circle cx={61} cy={93.5} r={1} fill="#A5D6A7" opacity={0.35} />
      <Circle cx={67} cy={92.5} r={1} fill="#A5D6A7" opacity={0.35} />

      {/* ── 머리 (돔형 — 카멜레온 크레스트) ── */}
      <Circle cx={50} cy={42 + DY} r={30} fill="url(#muskHead)" />
      {/* 돔/볏 (머리 위로 솟은 부분) */}
      <Path
        d={`M 30 ${30 + DY} Q 35 ${12 + DY} 50 ${8 + DY} Q 65 ${12 + DY} 70 ${30 + DY}`}
        fill="#81C784"
      />
      {/* 볏 하이라이트 */}
      <Path
        d={`M 36 ${22 + DY} Q 44 ${12 + DY} 54 ${12 + DY} Q 62 ${14 + DY} 66 ${24 + DY}`}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        opacity={0.2}
      />

      {/* ── 머리 위 스파이크 (작은 삼각형 리지) ── */}
      <Path d={`M 38 ${18 + DY} L 40 ${10 + DY} L 42 ${18 + DY} Z`} fill="#66BB6A" />
      <Path d={`M 45 ${14 + DY} L 47 ${6 + DY}  L 49 ${14 + DY} Z`} fill="#66BB6A" />
      <Path d={`M 52 ${14 + DY} L 54 ${6 + DY}  L 56 ${14 + DY} Z`} fill="#66BB6A" />
      <Path d={`M 59 ${18 + DY} L 61 ${10 + DY} L 63 ${18 + DY} Z`} fill="#66BB6A" />

      {/* 이마 하이라이트 */}
      <Ellipse cx={44} cy={28 + DY} rx={14} ry={8} fill="#FFFFFF" opacity={0.1} />
      {/* 턱 아래 그림자 */}
      <Ellipse cx={50} cy={67 + DY} rx={20} ry={5} fill="#388E3C" opacity={0.25} />

      {/* ── 눈 (카멜레온 — 툭 튀어나온 구형 눈) ── */}
      {/* 눈 둥지 (돔형 눈 소켓) */}
      <Circle cx={35} cy={40 + DY} r={12} fill="#4CAF50" />
      <Circle cx={65} cy={40 + DY} r={12} fill="#4CAF50" />
      <Circle cx={35} cy={40 + DY} r={10} fill="#A5D6A7" />
      <Circle cx={65} cy={40 + DY} r={10} fill="#A5D6A7" />

      {blinkPhase >= 0.5 ? (
        /* 눈 감은 상태 */
        <G>
          <Path d={`M 27 ${40 + DY} Q 35 ${43 + DY} 43 ${40 + DY}`} fill="none" stroke="#2E7D32" strokeWidth={2.5} strokeLinecap="round" />
          <Path d={`M 57 ${40 + DY} Q 65 ${43 + DY} 73 ${40 + DY}`} fill="none" stroke="#2E7D32" strokeWidth={2.5} strokeLinecap="round" />
        </G>
      ) : (
        /* 눈 뜬 상태 — 큰 동그란 카멜레온 눈 */
        <G>
          {/* 왼쪽 눈 */}
          <Circle cx={35} cy={40 + DY} r={8} fill="#FFFDE7" />
          <Circle cx={leftPupil.cx} cy={leftPupil.cy} r={4.5} fill="#1B5E20" />
          <Circle cx={leftPupil.cx} cy={leftPupil.cy} r={2.5} fill="#0D3B0D" />
          <Circle cx={leftPupil.cx + 1.5} cy={leftPupil.cy - 1.5} r={1.5} fill="#FFFFFF" />
          {/* 오른쪽 눈 */}
          <Circle cx={65} cy={40 + DY} r={8} fill="#FFFDE7" />
          <Circle cx={rightPupil.cx} cy={rightPupil.cy} r={4.5} fill="#1B5E20" />
          <Circle cx={rightPupil.cx} cy={rightPupil.cy} r={2.5} fill="#0D3B0D" />
          <Circle cx={rightPupil.cx + 1.5} cy={rightPupil.cy - 1.5} r={1.5} fill="#FFFFFF" />
        </G>
      )}

      {/* bullish일 때 눈 반짝임 (별) */}
      {expression === 'bullish' && (
        <G>
          <Path d={`M 28 ${34 + DY} L 29.5 ${31 + DY} L 31 ${34 + DY} L 28 ${33 + DY} L 31 ${33 + DY} Z`} fill="#FDD835" opacity={0.7} />
          <Path d={`M 58 ${34 + DY} L 59.5 ${31 + DY} L 61 ${34 + DY} L 58 ${33 + DY} L 61 ${33 + DY} Z`} fill="#FDD835" opacity={0.7} />
        </G>
      )}

      {/* bearish일 때 오른쪽 눈 반쯤 감김 */}
      {expression === 'bearish' && blinkPhase < 0.5 && (
        <Rect x={57} y={36 + DY} width={16} height={5} rx={2.5} fill="#81C784" opacity={0.55} />
      )}

      {/* ── 콧구멍 (작은 점 2개) ── */}
      <Circle cx={47} cy={53 + DY} r={1.5} fill="#2E7D32" />
      <Circle cx={53} cy={53 + DY} r={1.5} fill="#2E7D32" />

      {/* ── 입 (표정별) ── */}
      <Path d={mouthPath} fill="none" stroke="#2E7D32" strokeWidth={2} strokeLinecap="round" />
      {expression === 'bullish' && (
        <Path d={`M 40 ${67 + DY} Q 50 ${72 + DY} 60 ${67 + DY}`} fill="#FFFFFF" opacity={0.35} />
      )}

      {/* ── 옐로우 스팟 (몸체 무늬) ── */}
      <Circle cx={36} cy={76 + DY} r={2.5} fill="#FDD835" opacity={0.4} />
      <Circle cx={62} cy={74 + DY} r={2} fill="#FDD835" opacity={0.35} />
      <Circle cx={44} cy={86 + DY} r={1.8} fill="#FDD835" opacity={0.3} />

      {/* ── 볼터치 (연두빛) ── */}
      <Circle cx={23} cy={50 + DY} r={6} fill="#FDD835" opacity={0.15} />
      <Circle cx={77} cy={50 + DY} r={6} fill="#FDD835" opacity={0.15} />

      {/* ── 번개 액센트 (accentColor 하이라이트) ── */}
      <Path
        d={`M 14 ${18 + DY} L 17 ${18 + DY} L 15 ${22 + DY} L 19 ${22 + DY} L 13 ${29 + DY} L 15 ${24 + DY} L 12 ${24 + DY} Z`}
        fill={accentColor}
        opacity={0.5}
      />

      {/* ── 땀방울 (bearish) ── */}
      {showSweat && (
        <G>
          <Path d={`M 80 ${28 + DY} Q 82 ${22 + DY} 84 ${28 + DY} Q 84 ${34 + DY} 82 ${34 + DY} Q 80 ${34 + DY} 80 ${28 + DY} Z`} fill="#64B5F6" opacity={0.55} />
          <Ellipse cx={81.5} cy={26.5 + DY} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
        </G>
      )}

      {/* ── 전기 스파크 (cautious — 양눈이 다른 곳을 볼 때) ── */}
      {showSpark && (
        <G>
          <Path d={`M 82 ${16 + DY} L 85 ${16 + DY} L 83 ${20 + DY} L 87 ${20 + DY} L 81 ${27 + DY} L 83 ${22 + DY} L 80 ${22 + DY} Z`} fill={accentColor} opacity={0.45} />
          <Circle cx={86} cy={12 + DY} r={2} fill={accentColor} opacity={0.25} />
          <Circle cx={14} cy={28 + DY} r={1.5} fill={accentColor} opacity={0.2} />
        </G>
      )}

      {/* bullish — 주변 번개 이펙트 */}
      {expression === 'bullish' && (
        <G>
          <Path d={`M 86 ${32 + DY} L 88 ${32 + DY} L 87 ${35 + DY} L 90 ${35 + DY} L 85 ${40 + DY} L 86 ${37 + DY} L 84 ${37 + DY} Z`} fill="#FDD835" opacity={0.4} />
          <Path d={`M 10 ${35 + DY} L 12 ${35 + DY} L 11 ${38 + DY} L 14 ${38 + DY} L 9 ${43 + DY} L 10 ${40 + DY} L 8 ${40 + DY} Z`} fill="#FDD835" opacity={0.35} />
        </G>
      )}
    </Svg>
  );
}
