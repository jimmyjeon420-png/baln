/**
 * 레이 달리오 캐릭터 — 균형과 원칙의 현자
 *
 * 디자인 키워드: 차분한 헤지펀드 매니저, 명상/젠 스타일, 네이비 터틀넥
 * 컨셉: 원칙(Principles) 기반 사고 — 어떤 시장에서도 중심을 잃지 않는 현자
 * 입체감: RadialGradient + 하이라이트 + 부드러운 그림자
 * SD 비율: 큰 머리 + 짧은 다리 (치비/SD 스타일)
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

export function DalioCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return 'M 40 60 Q 50 68 60 60';        // warm wide smile
      case 'bearish':
        return 'M 42 62 Q 50 58 58 62';         // tight worried line
      case 'cautious':
        return 'M 44 60 Q 50 62 56 60';         // serene small curve
      case 'neutral':
      default:
        return 'M 41 60 Q 50 65 59 60';         // gentle calm smile
    }
  })();

  const isBlink = blinkPhase >= 0.5;
  const showSweat = expression === 'bearish';
  const showZen = expression === 'cautious';
  const showSparkle = expression === 'bullish';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 입체감 — 따뜻한 인간 피부톤 */}
        <RadialGradient id="dalioFace" cx="45%" cy="38%" rx="52%" ry="52%">
          <Stop offset="0%" stopColor="#FFE0C0" />
          <Stop offset="55%" stopColor="#F5CBA7" />
          <Stop offset="100%" stopColor="#D4A574" />
        </RadialGradient>
        {/* 네이비 터틀넥 */}
        <LinearGradient id="dalioSweater" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1A237E" />
          <Stop offset="100%" stopColor="#0D1642" />
        </LinearGradient>
        {/* 머리카락 — 은발 (thinning gray/silver) */}
        <LinearGradient id="dalioHair" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#C0C0C0" />
          <Stop offset="100%" stopColor="#9E9E9E" />
        </LinearGradient>
        {/* 바지 네이비 */}
        <LinearGradient id="dalioPants" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1A237E" />
          <Stop offset="100%" stopColor="#0D1642" />
        </LinearGradient>
      </Defs>

      {/* ── 바닥 그림자 ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.1} />

      {/* ── 다리 (짧고 둥근 SD 비율) ── */}
      <Rect x={37} y={84} width={8} height={10} rx={4} fill="url(#dalioPants)" />
      <Rect x={55} y={84} width={8} height={10} rx={4} fill="url(#dalioPants)" />
      {/* 다리 하이라이트 */}
      <Rect x={38.5} y={85} width={3} height={7} rx={1.5} fill="#FFFFFF" opacity={0.06} />
      <Rect x={56.5} y={85} width={3} height={7} rx={1.5} fill="#FFFFFF" opacity={0.06} />
      {/* 구두 (다크 브라운) */}
      <Ellipse cx={41} cy={95} rx={6} ry={3.5} fill="#3E2723" />
      <Ellipse cx={59} cy={95} rx={6} ry={3.5} fill="#3E2723" />
      {/* 구두 하이라이트 */}
      <Ellipse cx={40} cy={94} rx={2.5} ry={1.2} fill="#FFFFFF" opacity={0.08} />
      <Ellipse cx={58} cy={94} rx={2.5} ry={1.2} fill="#FFFFFF" opacity={0.08} />

      {/* ── 몸체 + 머리 그룹 (위로 올림) ── */}
      <G transform="translate(0, -5)">

        {/* ── 몸체 (네이비 터틀넥 스웨터) ── */}
        <Ellipse cx={50} cy={80} rx={22} ry={15} fill="url(#dalioSweater)" />
        {/* 스웨터 하이라이트 */}
        <Ellipse cx={42} cy={76} rx={8} ry={5} fill="#FFFFFF" opacity={0.05} />
        {/* 터틀넥 칼라 */}
        <Path d="M 40 68 Q 50 65 60 68 Q 58 72 50 71 Q 42 72 40 68 Z" fill="#1A237E" />
        <Path d="M 42 68 Q 50 66 58 68" fill="none" stroke="#283593" strokeWidth={0.8} opacity={0.5} />
        {/* 작은 핀 장식 (accentColor) */}
        <Circle cx={37} cy={74} r={2.5} fill={accentColor} opacity={0.7} />
        <Circle cx={37} cy={74} r={1} fill="#FFFFFF" opacity={0.3} />

        {/* ── 얼굴 (큰 둥근 머리 — SD 비율) ── */}
        <Circle cx={50} cy={42} r={29} fill="url(#dalioFace)" />
        {/* 이마 하이라이트 */}
        <Ellipse cx={44} cy={28} rx={14} ry={8} fill="#FFFFFF" opacity={0.1} />
        {/* 턱 그림자 */}
        <Ellipse cx={50} cy={66} rx={18} ry={5} fill="#D4A574" opacity={0.3} />

        {/* ── 머리카락 (은발, 가르마, 후퇴한 헤어라인) ── */}
        {/* 윗머리 — 양옆은 풍성, 정수리는 얇음 */}
        <Path
          d="M 22 38 Q 20 22 30 16 Q 38 12 44 15 Q 48 13 56 15 Q 62 12 70 16 Q 80 22 78 38"
          fill="url(#dalioHair)"
        />
        {/* 후퇴한 헤어라인 (이마가 넓게 보임) — 정수리 얇은 표현 */}
        <Path
          d="M 34 20 Q 42 16 50 17 Q 58 16 66 20"
          fill="#F5CBA7"
          opacity={0.4}
        />
        {/* 옆머리 (귀 위쪽에 살짝) */}
        <Path d="M 22 38 Q 20 32 22 26" fill="url(#dalioHair)" opacity={0.8} />
        <Path d="M 78 38 Q 80 32 78 26" fill="url(#dalioHair)" opacity={0.8} />
        {/* 머리 하이라이트 */}
        <Path
          d="M 30 18 Q 42 12 56 13 Q 68 15 74 20"
          fill="none" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.1}
        />

        {/* ── 눈 (크고 온화한 인간 눈) ── */}
        {isBlink ? (
          <G>
            <Path d="M 32 42 Q 38 45 44 42" fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M 56 42 Q 62 45 68 42" fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            {/* 왼쪽 눈 */}
            <Ellipse cx={38} cy={42} rx={7} ry={6.5} fill="#FFFFFF" />
            <Circle cx={39} cy={42} r={4.2} fill="#5D4037" />
            <Circle cx={38.5} cy={42.5} r={2.5} fill="#3E2723" />
            {/* 하이라이트 */}
            <Circle cx={40.5} cy={40} r={1.8} fill="#FFFFFF" />
            <Circle cx={37.5} cy={40.5} r={0.9} fill="#FFFFFF" opacity={0.6} />
            {/* 오른쪽 눈 */}
            <Ellipse cx={62} cy={42} rx={7} ry={6.5} fill="#FFFFFF" />
            <Circle cx={63} cy={42} r={4.2} fill="#5D4037" />
            <Circle cx={62.5} cy={42.5} r={2.5} fill="#3E2723" />
            {/* 하이라이트 */}
            <Circle cx={64.5} cy={40} r={1.8} fill="#FFFFFF" />
            <Circle cx={61.5} cy={40.5} r={0.9} fill="#FFFFFF" opacity={0.6} />
          </G>
        )}

        {/* cautious: 반쯤 감은 명상 눈 덮개 */}
        {showZen && !isBlink && (
          <G>
            <Rect x={31} y={36} width={14} height={6} rx={3} fill="#F5CBA7" opacity={0.6} />
            <Rect x={55} y={36} width={14} height={6} rx={3} fill="#F5CBA7" opacity={0.6} />
          </G>
        )}

        {/* ── 눈썹 ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 30 34 Q 36 30 44 34" fill="none" stroke="#9E9E9E" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M 56 34 Q 64 30 70 34" fill="none" stroke="#9E9E9E" strokeWidth={1.8} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 30 34 Q 36 31 44 33" fill="none" stroke="#9E9E9E" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M 56 33 Q 64 31 70 34" fill="none" stroke="#9E9E9E" strokeWidth={1.8} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (부드러운 인간 코) ── */}
        <Ellipse cx={50} cy={52} rx={2.8} ry={2.2} fill="#D4A574" />
        <Ellipse cx={49} cy={51.2} rx={1.3} ry={0.8} fill="#FFE0C0" opacity={0.4} />

        {/* ── 미소 주름 (나이 표현) ── */}
        <Path d="M 29 48 Q 30 52 31 55" fill="none" stroke="#D4A574" strokeWidth={0.8} opacity={0.3} />
        <Path d="M 71 48 Q 70 52 69 55" fill="none" stroke="#D4A574" strokeWidth={0.8} opacity={0.3} />

        {/* ── 볼터치 (따뜻한 복숭아색) ── */}
        <Circle cx={27} cy={50} r={6.5} fill="#FFAB91" opacity={0.18} />
        <Circle cx={73} cy={50} r={6.5} fill="#FFAB91" opacity={0.18} />
        <Circle cx={27} cy={49} r={4} fill="#FFAB91" opacity={0.1} />
        <Circle cx={73} cy={49} r={4} fill="#FFAB91" opacity={0.1} />

        {/* ── 입 (표정별) ── */}
        <Path d={mouthPath} fill="none" stroke="#A1887F" strokeWidth={1.8} strokeLinecap="round" />
        {expression === 'bullish' && (
          <Path d="M 44 62 Q 50 66 56 62" fill="#FFFFFF" opacity={0.3} />
        )}

        {/* ── 땀방울 (bearish) ── */}
        {showSweat && (
          <G>
            <Path d="M 79 25 Q 81 19 83 25 Q 83 30 81 30 Q 79 30 79 25 Z" fill="#64B5F6" opacity={0.5} />
            <Ellipse cx={80.5} cy={23} rx={1} ry={0.7} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* ── 젠/명상 이펙트 (cautious) — 작은 원 떠다님 ── */}
        {showZen && (
          <G>
            <Circle cx={14} cy={18} r={2.5} fill={accentColor} opacity={0.3} />
            <Circle cx={86} cy={20} r={2} fill={accentColor} opacity={0.25} />
            <Circle cx={10} cy={30} r={1.8} fill={accentColor} opacity={0.2} />
            <Circle cx={90} cy={12} r={1.5} fill={accentColor} opacity={0.18} />
            <Circle cx={14} cy={17} r={0.8} fill="#FFFFFF" opacity={0.15} />
            <Circle cx={86} cy={19} r={0.7} fill="#FFFFFF" opacity={0.12} />
          </G>
        )}

        {/* ── 반짝임 (bullish) ── */}
        {showSparkle && (
          <G>
            <Path d="M 34 34 L 35 31.5 L 36 34 L 33.5 33 L 36.5 33 Z" fill="#FFD54F" opacity={0.5} />
            <Path d="M 64 34 L 65 31.5 L 66 34 L 63.5 33 L 66.5 33 Z" fill="#FFD54F" opacity={0.5} />
            <Path d="M 50 12 L 50.8 10 L 51.6 12 L 49.5 11.2 L 52.1 11.2 Z" fill="#FFD54F" opacity={0.35} />
          </G>
        )}

      </G>{/* end translate group */}
    </Svg>
  );
}
