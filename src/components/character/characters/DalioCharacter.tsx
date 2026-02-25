/**
 * 레이 달리오 캐릭터 — 우아한 사슴 (Zootopia × Animal Crossing SD스타일)
 *
 * 디자인 키워드: 균형, 우아함, 자연과의 조화 = All Weather 전략, 원칙 기반
 * 컨셉: 뿔 달린 온화한 사슴 — 어떤 시장에서도 중심을 잃지 않는 현자
 * 입체감: RadialGradient + 하이라이트 + 부드러운 그림자
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
        {/* 얼굴 입체감 — 따뜻한 사슴 갈색 */}
        <RadialGradient id="deerFace" cx="45%" cy="38%" rx="52%" ry="52%">
          <Stop offset="0%" stopColor="#D7CCC8" />
          <Stop offset="55%" stopColor="#BCAAA4" />
          <Stop offset="100%" stopColor="#A1887F" />
        </RadialGradient>
        {/* 몸체 로브 */}
        <LinearGradient id="deerRobe" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#5D4037" />
          <Stop offset="100%" stopColor="#4E342E" />
        </LinearGradient>
        {/* 뿔 그라데이션 */}
        <LinearGradient id="deerAntler" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0%" stopColor="#795548" />
          <Stop offset="100%" stopColor="#A1887F" />
        </LinearGradient>
        {/* 귀 안쪽 핑크 */}
        <LinearGradient id="deerEarInner" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F8BBD0" />
          <Stop offset="100%" stopColor="#FFCDD2" />
        </LinearGradient>
        {/* 배/가슴 크림색 */}
        <RadialGradient id="deerBelly" cx="50%" cy="40%" rx="50%" ry="60%">
          <Stop offset="0%" stopColor="#EFEBE9" />
          <Stop offset="100%" stopColor="#D7CCC8" stopOpacity="0.6" />
        </RadialGradient>
      </Defs>

      {/* ── 바닥 그림자 ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.1} />

      {/* ── 다리 (짧고 둥근 SD 비율) ── */}
      <Rect x={37} y={84} width={8} height={10} rx={4} fill="#8D6E63" />
      <Rect x={55} y={84} width={8} height={10} rx={4} fill="#8D6E63" />
      {/* 다리 하이라이트 */}
      <Rect x={38.5} y={85} width={3} height={7} rx={1.5} fill="#A1887F" opacity={0.35} />
      <Rect x={56.5} y={85} width={3} height={7} rx={1.5} fill="#A1887F" opacity={0.35} />
      {/* 발굽 (어두운 갈색, 살짝 갈라진 모양) */}
      <Ellipse cx={41} cy={95} rx={6} ry={3.5} fill="#4E342E" />
      <Ellipse cx={59} cy={95} rx={6} ry={3.5} fill="#4E342E" />
      {/* 발굽 중앙 갈라짐 */}
      <Rect x={40.2} y={92.5} width={1.2} height={4} fill="#3E2723" opacity={0.4} />
      <Rect x={58.2} y={92.5} width={1.2} height={4} fill="#3E2723" opacity={0.4} />

      {/* ── 몸체 + 머리 그룹 (위로 올림) ── */}
      <G transform="translate(0, -5)">

        {/* ── 몸체 (젠 로브) ── */}
        <Ellipse cx={50} cy={80} rx={22} ry={15} fill="url(#deerRobe)" />
        {/* 크림색 배 */}
        <Ellipse cx={50} cy={78} rx={13} ry={10} fill="url(#deerBelly)" />
        {/* 로브 V라인 */}
        <Path d="M 44 70 L 50 79 L 56 70" fill="none" stroke="#3E2723" strokeWidth={1.2} opacity={0.4} />
        {/* 작은 잎 핀 장식 (밸런스 상징) */}
        <Path
          d="M 36 74 Q 38 70 40 74 Q 38 76 36 74 Z"
          fill={accentColor}
          opacity={0.6}
        />

        {/* ── 얼굴 (큰 둥근 머리 — SD 비율) ── */}
        <Circle cx={50} cy={42} r={29} fill="url(#deerFace)" />
        {/* 이마 하이라이트 */}
        <Ellipse cx={44} cy={28} rx={14} ry={8} fill="#FFFFFF" opacity={0.1} />
        {/* 크림색 주둥이/턱 영역 */}
        <Ellipse cx={50} cy={55} rx={12} ry={8} fill="#EFEBE9" opacity={0.6} />

        {/* ── 귀 (뾰족하고 길쭉한 사슴 귀) ── */}
        {/* 왼쪽 귀 — 바깥 */}
        <Path
          d={expression === 'bearish'
            ? 'M 24 30 Q 16 18 22 10 Q 28 16 30 30 Z'   // 살짝 눕힘
            : 'M 24 28 Q 14 12 18 4 Q 26 10 30 28 Z'}    // 쫑긋
          fill="#A1887F"
        />
        {/* 왼쪽 귀 — 안쪽 핑크 */}
        <Path
          d={expression === 'bearish'
            ? 'M 25 28 Q 19 19 23 13 Q 27 18 29 28 Z'
            : 'M 25 26 Q 17 14 20 7 Q 26 13 29 26 Z'}
          fill="url(#deerEarInner)"
          opacity={0.7}
        />
        {/* 오른쪽 귀 — 바깥 */}
        <Path
          d={expression === 'bearish'
            ? 'M 76 30 Q 84 18 78 10 Q 72 16 70 30 Z'
            : 'M 76 28 Q 86 12 82 4 Q 74 10 70 28 Z'}
          fill="#A1887F"
        />
        {/* 오른쪽 귀 — 안쪽 핑크 */}
        <Path
          d={expression === 'bearish'
            ? 'M 75 28 Q 81 19 77 13 Q 73 18 71 28 Z'
            : 'M 75 26 Q 83 14 80 7 Q 74 13 71 26 Z'}
          fill="url(#deerEarInner)"
          opacity={0.7}
        />

        {/* ── 뿔 (작고 우아한 가지) ── */}
        {/* 왼쪽 뿔 — 줄기 + 가지 2개 */}
        <Path
          d="M 32 22 Q 30 14 28 6"
          fill="none" stroke="url(#deerAntler)" strokeWidth={2.5} strokeLinecap="round"
        />
        <Path d="M 29 12 Q 25 8 23 5" fill="none" stroke="#795548" strokeWidth={2} strokeLinecap="round" />
        <Path d="M 29 16 Q 24 14 22 11" fill="none" stroke="#795548" strokeWidth={1.8} strokeLinecap="round" />
        {/* 오른쪽 뿔 — 줄기 + 가지 2개 */}
        <Path
          d="M 68 22 Q 70 14 72 6"
          fill="none" stroke="url(#deerAntler)" strokeWidth={2.5} strokeLinecap="round"
        />
        <Path d="M 71 12 Q 75 8 77 5" fill="none" stroke="#795548" strokeWidth={2} strokeLinecap="round" />
        <Path d="M 71 16 Q 76 14 78 11" fill="none" stroke="#795548" strokeWidth={1.8} strokeLinecap="round" />

        {/* ── 눈 (크고 온화한 사슴 눈) ── */}
        {isBlink ? (
          <G>
            <Path d="M 32 42 Q 38 45 44 42" fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M 56 42 Q 62 45 68 42" fill="none" stroke="#5D4037" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            {/* 왼쪽 눈 */}
            <Ellipse cx={38} cy={42} rx={7} ry={6.5} fill="#FFFFFF" />
            <Circle cx={39} cy={42} r={4.2} fill="#4E342E" />
            <Circle cx={38.5} cy={42.5} r={2.5} fill="#3E2723" />
            {/* 속눈썹 힌트 (위쪽 라인) */}
            <Path d="M 31 37 Q 36 35 44 37" fill="none" stroke="#5D4037" strokeWidth={1.3} strokeLinecap="round" />
            {/* 하이라이트 2개 */}
            <Circle cx={40.5} cy={40} r={1.8} fill="#FFFFFF" />
            <Circle cx={37.5} cy={40.5} r={0.9} fill="#FFFFFF" opacity={0.6} />
            {/* 오른쪽 눈 */}
            <Ellipse cx={62} cy={42} rx={7} ry={6.5} fill="#FFFFFF" />
            <Circle cx={63} cy={42} r={4.2} fill="#4E342E" />
            <Circle cx={62.5} cy={42.5} r={2.5} fill="#3E2723" />
            {/* 속눈썹 힌트 */}
            <Path d="M 56 37 Q 62 35 69 37" fill="none" stroke="#5D4037" strokeWidth={1.3} strokeLinecap="round" />
            {/* 하이라이트 2개 */}
            <Circle cx={64.5} cy={40} r={1.8} fill="#FFFFFF" />
            <Circle cx={61.5} cy={40.5} r={0.9} fill="#FFFFFF" opacity={0.6} />
          </G>
        )}

        {/* cautious: 반쯤 감은 명상 눈 덮개 */}
        {showZen && !isBlink && (
          <G>
            <Rect x={31} y={36} width={14} height={6} rx={3} fill="#BCAAA4" opacity={0.55} />
            <Rect x={55} y={36} width={14} height={6} rx={3} fill="#BCAAA4" opacity={0.55} />
          </G>
        )}

        {/* ── 눈썹 ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 30 34 Q 36 30 44 34" fill="none" stroke="#795548" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M 56 34 Q 64 30 70 34" fill="none" stroke="#795548" strokeWidth={1.8} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 30 34 Q 36 31 44 33" fill="none" stroke="#795548" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M 56 33 Q 64 31 70 34" fill="none" stroke="#795548" strokeWidth={1.8} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (작고 어두운 삼각형 사슴 코) ── */}
        <Path d="M 47 53 L 50 56 L 53 53 Z" fill="#5D4037" />
        <Ellipse cx={49} cy={53.5} rx={1.2} ry={0.7} fill="#8D6E63" opacity={0.4} />

        {/* ── 볼터치 (복숭아색 블러시) ── */}
        <Circle cx={27} cy={50} r={6.5} fill="#FFAB91" opacity={0.2} />
        <Circle cx={73} cy={50} r={6.5} fill="#FFAB91" opacity={0.2} />
        <Circle cx={27} cy={49} r={4} fill="#FFAB91" opacity={0.12} />
        <Circle cx={73} cy={49} r={4} fill="#FFAB91" opacity={0.12} />

        {/* ── 입 (표정별) ── */}
        <Path d={mouthPath} fill="none" stroke="#795548" strokeWidth={1.8} strokeLinecap="round" />
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
            {/* 하이라이트 */}
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
