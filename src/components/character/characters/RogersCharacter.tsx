/**
 * 짐 로저스 캐릭터 — 탐험가 호랑이 (2.5D 동물의숲 × 주토피아 스타일)
 *
 * 디자인 키워드: 주황 호랑이, 검은 줄무늬, 카키 탐험 모자, 나침반 핀
 * 컨셉: "중국과 아시아를 봐야 합니다" — 세계를 누비는 모험가, 인디아나 존스 + 티거
 * 입체감: RadialGradient + 하이라이트 + 줄무늬 레이어
 * 표정 변화: bullish(호기심 폭발) / bearish(경계 찌푸림) / cautious(사냥 모드) / neutral(여유 탐험가)
 * 바디: SD 비율 — 큰 머리 + 짧은 다리 + 둥근 발 (주토피아 스타일 직립 보행)
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect, Line,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

/* ── Y-offset: 모든 머리+몸통 요소를 -7 올림 (다리 공간 확보) ── */
const DY = -7;

export function RogersCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return `M 34 ${62 + DY} Q 50 ${76 + DY} 66 ${62 + DY}`;   // wide adventurous grin
      case 'bearish':
        return `M 40 ${66 + DY} Q 50 ${60 + DY} 60 ${66 + DY}`;   // concerned tight lips
      case 'cautious':
        return `M 42 ${64 + DY} L 58 ${64 + DY}`;                   // alert flat line
      case 'neutral':
      default:
        return `M 38 ${62 + DY} Q 50 ${72 + DY} 62 ${62 + DY}`;   // calm confident smile
    }
  })();

  const showSweat = expression === 'bearish';
  const showAlert = expression === 'cautious';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 호랑이 얼굴 그라데이션 — 주황/앰버 */}
        <RadialGradient id="rogersFace" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFB74D" />
          <Stop offset="55%" stopColor="#FF9800" />
          <Stop offset="100%" stopColor="#E65100" />
        </RadialGradient>
        {/* 몸체 (탐험가 재킷) */}
        <LinearGradient id="rogersJacket" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#5D4037" />
          <Stop offset="100%" stopColor="#3E2723" />
        </LinearGradient>
        {/* 모자 그라데이션 — 카키/탐험가 */}
        <LinearGradient id="rogersHat" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#C8B07A" />
          <Stop offset="100%" stopColor="#A08050" />
        </LinearGradient>
        {/* 주둥이/턱 흰색 */}
        <RadialGradient id="rogersMuzzle" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFFDE7" />
          <Stop offset="100%" stopColor="#FFF9C4" />
        </RadialGradient>
        {/* 다리 호랑이 털 그라데이션 */}
        <LinearGradient id="rogersLeg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FF9800" />
          <Stop offset="100%" stopColor="#E65100" />
        </LinearGradient>
      </Defs>

      {/* ── 그림자 (바닥, 발 아래) ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.15} />

      {/* ── 꼬리 (몸 뒤쪽에서 살짝 곡선, 호랑이 줄무늬) ── */}
      <G>
        <Path
          d={`M 72 ${73 + DY} Q 82 ${68 + DY} 84 ${78 + DY} Q 86 ${88 + DY} 78 ${84 + DY}`}
          fill="none"
          stroke="#FF9800"
          strokeWidth={5}
          strokeLinecap="round"
        />
        {/* 꼬리 줄무늬 */}
        <Path
          d={`M 78 ${70 + DY} Q 80 ${69 + DY} 82 ${72 + DY}`}
          fill="none"
          stroke="#3E2723"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.5}
        />
        <Path
          d={`M 83 ${76 + DY} Q 85 ${75 + DY} 85 ${79 + DY}`}
          fill="none"
          stroke="#3E2723"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* 꼬리 끝 (더 어두운 주황) */}
        <Circle cx={78} cy={84 + DY} r={3} fill="#E65100" opacity={0.6} />
      </G>

      {/* ── 다리 (짧고 통통한 호랑이 다리) ── */}
      <G>
        {/* 왼쪽 다리 */}
        <Rect x={36} y={82} width={10} height={10} rx={4} fill="url(#rogersLeg)" />
        {/* 왼쪽 다리 줄무늬 */}
        <Path d="M 37 84 Q 41 83 44 84" fill="none" stroke="#3E2723" strokeWidth={1.5} strokeLinecap="round" opacity={0.4} />
        <Path d="M 37 88 Q 41 87 44 88" fill="none" stroke="#3E2723" strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />

        {/* 오른쪽 다리 */}
        <Rect x={54} y={82} width={10} height={10} rx={4} fill="url(#rogersLeg)" />
        {/* 오른쪽 다리 줄무늬 */}
        <Path d="M 55 84 Q 59 83 62 84" fill="none" stroke="#3E2723" strokeWidth={1.5} strokeLinecap="round" opacity={0.4} />
        <Path d="M 55 88 Q 59 87 62 88" fill="none" stroke="#3E2723" strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
      </G>

      {/* ── 발 (둥근 호랑이 발바닥, 다리보다 살짝 넓음) ── */}
      <G>
        {/* 왼발 */}
        <Ellipse cx={41} cy={93.5} rx={7} ry={3.5} fill="#FF9800" />
        <Ellipse cx={41} cy={93.5} rx={5.5} ry={2.5} fill="#FFB74D" opacity={0.5} />
        {/* 왼발 발가락 패드 (3개) */}
        <Circle cx={37} cy={92} r={1.2} fill="#FFCC80" opacity={0.6} />
        <Circle cx={41} cy={91.5} r={1.2} fill="#FFCC80" opacity={0.6} />
        <Circle cx={45} cy={92} r={1.2} fill="#FFCC80" opacity={0.6} />

        {/* 오른발 */}
        <Ellipse cx={59} cy={93.5} rx={7} ry={3.5} fill="#FF9800" />
        <Ellipse cx={59} cy={93.5} rx={5.5} ry={2.5} fill="#FFB74D" opacity={0.5} />
        {/* 오른발 발가락 패드 (3개) */}
        <Circle cx={55} cy={92} r={1.2} fill="#FFCC80" opacity={0.6} />
        <Circle cx={59} cy={91.5} r={1.2} fill="#FFCC80" opacity={0.6} />
        <Circle cx={63} cy={92} r={1.2} fill="#FFCC80" opacity={0.6} />
      </G>

      {/* ── 몸체 (탐험가 가죽 재킷) ── */}
      <Ellipse cx={50} cy={80 + DY} rx={26} ry={17} fill="url(#rogersJacket)" />
      {/* 재킷 라펠 */}
      <Path d={`M 38 ${70 + DY} L 50 ${82 + DY} L 46 ${70 + DY} Z`} fill="#4E342E" />
      <Path d={`M 62 ${70 + DY} L 50 ${82 + DY} L 54 ${70 + DY} Z`} fill="#4E342E" />
      {/* 셔츠 V */}
      <Path d={`M 46 ${70 + DY} L 50 ${77 + DY} L 54 ${70 + DY}`} fill="#FFF8E1" opacity={0.2} />
      {/* 나침반/지구본 핀 (가슴) — accentColor 활용 */}
      <Circle cx={40} cy={76 + DY} r={3.5} fill={accentColor} opacity={0.8} />
      <Circle cx={40} cy={76 + DY} r={3.5} fill="none" stroke="#FFD54F" strokeWidth={0.8} />
      <Line x1={40} y1={73 + DY} x2={40} y2={79 + DY} stroke="#FFFFFF" strokeWidth={0.6} opacity={0.7} />
      <Line x1={37} y1={76 + DY} x2={43} y2={76 + DY} stroke="#FFFFFF" strokeWidth={0.6} opacity={0.7} />

      {/* ── 귀 (호랑이 둥근 귀, 어두운 끝) ── */}
      <Ellipse cx={27} cy={18 + DY} rx={10} ry={9} fill="#FF9800" />
      <Ellipse cx={27} cy={17 + DY} rx={7} ry={6} fill="#3E2723" opacity={0.6} />
      <Ellipse cx={27} cy={17 + DY} rx={4.5} ry={4} fill="#FFB74D" opacity={0.5} />
      <Ellipse cx={73} cy={18 + DY} rx={10} ry={9} fill="#FF9800" />
      <Ellipse cx={73} cy={17 + DY} rx={7} ry={6} fill="#3E2723" opacity={0.6} />
      <Ellipse cx={73} cy={17 + DY} rx={4.5} ry={4} fill="#FFB74D" opacity={0.5} />

      {/* ── 얼굴 (둥글고 통통한 주황 호랑이) ── */}
      <Circle cx={50} cy={44 + DY} r={30} fill="url(#rogersFace)" />
      {/* 턱 아래 그림자 */}
      <Ellipse cx={50} cy={68 + DY} rx={20} ry={5} fill="#BF360C" opacity={0.2} />
      {/* 이마 하이라이트 */}
      <Ellipse cx={46} cy={28 + DY} rx={13} ry={7} fill="#FFFFFF" opacity={0.1} />

      {/* ── 흰색 주둥이/턱 영역 ── */}
      <Ellipse cx={50} cy={56 + DY} rx={16} ry={12} fill="url(#rogersMuzzle)" opacity={0.7} />

      {/* ── 호랑이 줄무늬 (이마에 2-3줄) ── */}
      <Path d={`M 42 ${24 + DY} Q 44 ${20 + DY} 46 ${24 + DY}`} fill="none" stroke="#3E2723" strokeWidth={2.5} strokeLinecap="round" opacity={0.6} />
      <Path d={`M 50 ${22 + DY} Q 52 ${17 + DY} 54 ${22 + DY}`} fill="none" stroke="#3E2723" strokeWidth={2.5} strokeLinecap="round" opacity={0.6} />
      <Path d={`M 57 ${24 + DY} Q 59 ${20 + DY} 61 ${24 + DY}`} fill="none" stroke="#3E2723" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      {/* 볼 옆 줄무늬 */}
      <Path d={`M 22 ${40 + DY} Q 26 ${38 + DY} 28 ${42 + DY}`} fill="none" stroke="#3E2723" strokeWidth={1.8} strokeLinecap="round" opacity={0.35} />
      <Path d={`M 21 ${46 + DY} Q 25 ${44 + DY} 27 ${48 + DY}`} fill="none" stroke="#3E2723" strokeWidth={1.8} strokeLinecap="round" opacity={0.3} />
      <Path d={`M 72 ${42 + DY} Q 74 ${38 + DY} 78 ${40 + DY}`} fill="none" stroke="#3E2723" strokeWidth={1.8} strokeLinecap="round" opacity={0.35} />
      <Path d={`M 73 ${48 + DY} Q 75 ${44 + DY} 79 ${46 + DY}`} fill="none" stroke="#3E2723" strokeWidth={1.8} strokeLinecap="round" opacity={0.3} />

      {/* ── 탐험가 모자 (카키 돔, 차양) ── */}
      <G>
        {/* 모자 본체 (돔) */}
        <Path
          d={`M 28 ${28 + DY} Q 28 ${8 + DY} 50 ${6 + DY} Q 72 ${8 + DY} 72 ${28 + DY}`}
          fill="url(#rogersHat)"
        />
        {/* 모자 차양 (챙) */}
        <Ellipse cx={50} cy={28 + DY} rx={28} ry={5} fill="#A08050" />
        <Ellipse cx={50} cy={27 + DY} rx={26} ry={3} fill="#C8B07A" opacity={0.4} />
        {/* 모자 밴드 — accentColor */}
        <Rect x={29} y={23 + DY} width={42} height={4} rx={2} fill={accentColor} opacity={0.7} />
        {/* 모자 하이라이트 */}
        <Path
          d={`M 36 ${14 + DY} Q 44 ${8 + DY} 56 ${10 + DY} Q 64 ${12 + DY} 68 ${18 + DY}`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1.5}
          opacity={0.2}
        />
      </G>

      {/* ── 눈 (호랑이 눈, 앰버 홍채) ── */}
      {blinkPhase >= 0.5 ? (
        /* 눈 감은 상태 — 곡선으로 표현 */
        <G>
          <Path d={`M 31 ${43 + DY} Q 37 ${46 + DY} 43 ${43 + DY}`} fill="none" stroke="#3E2723" strokeWidth={2.5} strokeLinecap="round" />
          <Path d={`M 57 ${43 + DY} Q 63 ${46 + DY} 69 ${43 + DY}`} fill="none" stroke="#3E2723" strokeWidth={2.5} strokeLinecap="round" />
        </G>
      ) : (
        /* 눈 뜬 상태 */
        <G>
          {/* 왼쪽 눈 */}
          <Ellipse cx={37} cy={43 + DY} rx={6.5} ry={expression === 'bullish' ? 7 : 5.5} fill="#FFFFFF" />
          <Circle cx={38} cy={42.5 + DY} r={4} fill="#FF8F00" />
          <Circle cx={38} cy={42.5 + DY} r={2.2} fill="#1A1A1A" />
          <Circle cx={39.5} cy={41 + DY} r={1.5} fill="#FFFFFF" />
          <Circle cx={37} cy={41.5 + DY} r={0.7} fill="#FFFFFF" opacity={0.5} />
          {/* 오른쪽 눈 */}
          <Ellipse cx={63} cy={43 + DY} rx={6.5} ry={expression === 'bullish' ? 7 : 5.5} fill="#FFFFFF" />
          <Circle cx={64} cy={42.5 + DY} r={4} fill="#FF8F00" />
          <Circle cx={64} cy={42.5 + DY} r={2.2} fill="#1A1A1A" />
          <Circle cx={65.5} cy={41 + DY} r={1.5} fill="#FFFFFF" />
          <Circle cx={63} cy={41.5 + DY} r={0.7} fill="#FFFFFF" opacity={0.5} />
        </G>
      )}

      {/* cautious: 반쯤 감은 눈 (사냥 모드, 눈 위를 가림) */}
      {showAlert && blinkPhase < 0.5 && (
        <G>
          <Rect x={30} y={37 + DY} width={15} height={5} rx={2.5} fill="#FF9800" opacity={0.65} />
          <Rect x={56} y={37 + DY} width={15} height={5} rx={2.5} fill="#FF9800" opacity={0.65} />
        </G>
      )}

      {/* ── 눈썹 ── */}
      {expression === 'bearish' ? (
        <G>
          <Path d={`M 28 ${36 + DY} Q 34 ${31 + DY} 44 ${35 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
          <Path d={`M 56 ${35 + DY} Q 66 ${31 + DY} 72 ${36 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
        </G>
      ) : expression === 'bullish' ? (
        <G>
          <Path d={`M 28 ${35 + DY} Q 34 ${29 + DY} 44 ${33 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
          <Path d={`M 56 ${33 + DY} Q 66 ${29 + DY} 72 ${35 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
        </G>
      ) : (
        <G>
          <Path d={`M 29 ${35 + DY} Q 36 ${31 + DY} 44 ${34 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2} strokeLinecap="round" />
          <Path d={`M 56 ${34 + DY} Q 64 ${31 + DY} 71 ${35 + DY}`} fill="none" stroke="#5D4037" strokeWidth={2} strokeLinecap="round" />
        </G>
      )}

      {/* ── 코 (호랑이 삼각 코) ── */}
      <Path d={`M 47 ${52 + DY} L 50 ${49 + DY} L 53 ${52 + DY} Q 50 ${54 + DY} 47 ${52 + DY} Z`} fill="#3E2723" />
      <Ellipse cx={50} cy={50 + DY} rx={1.2} ry={0.8} fill="#5D4037" opacity={0.5} />

      {/* ── 볼터치 ── */}
      <Circle cx={27} cy={52 + DY} r={6} fill="#FF5722" opacity={0.15} />
      <Circle cx={73} cy={52 + DY} r={6} fill="#FF5722" opacity={0.15} />

      {/* ── 수염 (호랑이 수염 3쌍) ── */}
      <G opacity={0.3}>
        <Line x1={30} y1={53 + DY} x2={16} y2={50 + DY} stroke="#5D4037" strokeWidth={1} strokeLinecap="round" />
        <Line x1={30} y1={56 + DY} x2={15} y2={57 + DY} stroke="#5D4037" strokeWidth={1} strokeLinecap="round" />
        <Line x1={30} y1={59 + DY} x2={16} y2={63 + DY} stroke="#5D4037" strokeWidth={1} strokeLinecap="round" />
        <Line x1={70} y1={53 + DY} x2={84} y2={50 + DY} stroke="#5D4037" strokeWidth={1} strokeLinecap="round" />
        <Line x1={70} y1={56 + DY} x2={85} y2={57 + DY} stroke="#5D4037" strokeWidth={1} strokeLinecap="round" />
        <Line x1={70} y1={59 + DY} x2={84} y2={63 + DY} stroke="#5D4037" strokeWidth={1} strokeLinecap="round" />
      </G>

      {/* ── 입 (표정별) ── */}
      <Path d={mouthPath} fill="none" stroke="#5D4037" strokeWidth={2} strokeLinecap="round" />
      {expression === 'bullish' && (
        <Path d={`M 40 ${66 + DY} Q 50 ${71 + DY} 60 ${66 + DY}`} fill="#FFFFFF" opacity={0.35} />
      )}

      {/* ── bullish: 눈 반짝임 (모험 발견!) ── */}
      {expression === 'bullish' && blinkPhase < 0.5 && (
        <G>
          <Path d={`M 33 ${36 + DY} L 34 ${33.5 + DY} L 35 ${36 + DY} L 32.5 ${35 + DY} L 35.5 ${35 + DY} Z`} fill="#FFD54F" opacity={0.6} />
          <Path d={`M 59 ${36 + DY} L 60 ${33.5 + DY} L 61 ${36 + DY} L 58.5 ${35 + DY} L 61.5 ${35 + DY} Z`} fill="#FFD54F" opacity={0.6} />
        </G>
      )}

      {/* ── 땀방울 (bearish) ── */}
      {showSweat && (
        <G>
          <Path d={`M 79 ${14 + DY} Q 81 ${8 + DY} 83 ${14 + DY} Q 83 ${20 + DY} 81 ${20 + DY} Q 79 ${20 + DY} 79 ${14 + DY} Z`} fill="#64B5F6" opacity={0.55} />
          <Ellipse cx={80.5} cy={12.5 + DY} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
        </G>
      )}

      {/* ── cautious: 경계 이펙트 (사냥 본능 스캔 라인) ── */}
      {showAlert && (
        <G>
          <Circle cx={14} cy={38 + DY} r={2} fill={accentColor} opacity={0.3} />
          <Circle cx={86} cy={38 + DY} r={2} fill={accentColor} opacity={0.3} />
          <Circle cx={10} cy={28 + DY} r={1.5} fill={accentColor} opacity={0.2} />
          <Circle cx={90} cy={28 + DY} r={1.5} fill={accentColor} opacity={0.2} />
        </G>
      )}
    </Svg>
  );
}
