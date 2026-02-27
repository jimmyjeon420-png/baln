/**
 * 짐 로저스 캐릭터 — 세계를 누비는 모험 투자가
 *
 * 디자인 키워드: 백발/은발, 카키 사파리 재킷, 보타이, 나침반 핀, 갈색 부츠
 * 컨셉: "중국과 아시아를 봐야 합니다" — 오토바이로 세계 일주한 모험가
 * 입체감: RadialGradient + 하이라이트 + 그림자 레이어
 * 표정 변화: bullish(호기심 폭발) / bearish(경계 찌푸림) / cautious(사냥 모드) / neutral(여유 탐험가)
 * 바디: SD/치비 비율 — 큰 머리 + 짧은 다리 + 사파리 스타일 (직립 보행)
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
  const showThinking = expression === 'cautious';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 피부 그라데이션 — 백인 톤 */}
        <RadialGradient id="rogersFace" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE0C0" />
          <Stop offset="55%" stopColor="#F5CBA7" />
          <Stop offset="100%" stopColor="#D4A574" />
        </RadialGradient>
        {/* 사파리 재킷 그라데이션 — 카키 */}
        <LinearGradient id="rogersJacket" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#C8B07A" />
          <Stop offset="100%" stopColor="#A08050" />
        </LinearGradient>
        {/* 백발/은발 그라데이션 */}
        <RadialGradient id="rogersHair" cx="50%" cy="30%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="40%" stopColor="#F0F0F0" />
          <Stop offset="100%" stopColor="#D8D8D8" />
        </RadialGradient>
        {/* 바지 그라데이션 — 카키 */}
        <LinearGradient id="rogersLeg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#B8A06A" />
          <Stop offset="100%" stopColor="#8C7040" />
        </LinearGradient>
        {/* 부츠 그라데이션 — 갈색 어드벤처 부츠 */}
        <RadialGradient id="rogersBoot" cx="45%" cy="35%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#6D4C41" />
          <Stop offset="100%" stopColor="#3E2723" />
        </RadialGradient>
      </Defs>

      {/* ── 그림자 (바닥, 발 아래) ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.15} />

      {/* ── 다리 (카키 바지) ── */}
      <G>
        {/* 왼쪽 다리 */}
        <Rect x={36} y={80} width={9} height={10} rx={3} fill="url(#rogersLeg)" />
        {/* 오른쪽 다리 */}
        <Rect x={55} y={80} width={9} height={10} rx={3} fill="url(#rogersLeg)" />
      </G>

      {/* ── 발 (갈색 어드벤처 부츠) ── */}
      <G>
        {/* 왼쪽 부츠 */}
        <Ellipse cx={40} cy={92} rx={7.5} ry={4} fill="url(#rogersBoot)" />
        <Path d="M 33 92 Q 33 90 36 89.5 L 36 92 Z" fill="#4E342E" opacity={0.5} />
        <Ellipse cx={39} cy={91} rx={3} ry={1.5} fill="#8D6E63" opacity={0.25} />
        {/* 부츠 솔 */}
        <Rect x={33} y={93.5} width={14} height={1.5} rx={0.5} fill="#2E1B0E" opacity={0.6} />

        {/* 오른쪽 부츠 */}
        <Ellipse cx={60} cy={92} rx={7.5} ry={4} fill="url(#rogersBoot)" />
        <Path d="M 67 92 Q 67 90 64 89.5 L 64 92 Z" fill="#4E342E" opacity={0.5} />
        <Ellipse cx={59} cy={91} rx={3} ry={1.5} fill="#8D6E63" opacity={0.25} />
        {/* 부츠 솔 */}
        <Rect x={53} y={93.5} width={14} height={1.5} rx={0.5} fill="#2E1B0E" opacity={0.6} />
      </G>

      {/* ── 몸체 + 머리 그룹 (위로 DY 이동) ── */}
      <G transform={`translate(0, ${DY})`}>
        {/* ── 몸체 (카키 사파리 재킷) ── */}
        <Ellipse cx={50} cy={80} rx={26} ry={17} fill="url(#rogersJacket)" />
        {/* 재킷 라펠 (카키색 접힌 옷깃) */}
        <Path d="M 36 70 L 50 82 L 44 70 Z" fill="#A08050" />
        <Path d="M 64 70 L 50 82 L 56 70 Z" fill="#A08050" />
        {/* 셔츠 V (안쪽 흰 셔츠) */}
        <Path d="M 46 70 L 50 78 L 54 70" fill="#FFFFFF" opacity={0.3} />

        {/* ── 보타이 (시그니처 — accentColor 적용) ── */}
        <G>
          {/* 보타이 좌우 날개 */}
          <Path d={`M 50 69 L 44 66.5 L 44 71.5 Z`} fill={accentColor} />
          <Path d={`M 50 69 L 56 66.5 L 56 71.5 Z`} fill={accentColor} />
          {/* 보타이 중앙 매듭 */}
          <Circle cx={50} cy={69} r={1.8} fill={accentColor} />
          <Circle cx={50} cy={69} r={1.8} fill="#000000" opacity={0.15} />
        </G>

        {/* ── 재킷 주머니 (사파리 스타일) ── */}
        <Rect x={34} y={76} width={10} height={6} rx={1.5} fill="#8C7040" opacity={0.4} />
        <Line x1={34} y1={79} x2={44} y2={79} stroke="#6D5530" strokeWidth={0.7} opacity={0.5} />
        <Rect x={56} y={76} width={10} height={6} rx={1.5} fill="#8C7040" opacity={0.4} />
        <Line x1={56} y1={79} x2={66} y2={79} stroke="#6D5530" strokeWidth={0.7} opacity={0.5} />

        {/* ── 나침반 핀 (왼쪽 가슴) — accentColor 활용 ── */}
        <Circle cx={39} cy={74} r={3} fill={accentColor} opacity={0.8} />
        <Circle cx={39} cy={74} r={3} fill="none" stroke="#FFD54F" strokeWidth={0.7} />
        <Line x1={39} y1={71.5} x2={39} y2={76.5} stroke="#FFFFFF" strokeWidth={0.5} opacity={0.7} />
        <Line x1={36.5} y1={74} x2={41.5} y2={74} stroke="#FFFFFF" strokeWidth={0.5} opacity={0.7} />

        {/* ── 얼굴 (큰 둥근 원) ── */}
        <Circle cx={50} cy={43} r={30} fill="url(#rogersFace)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={68} rx={20} ry={5} fill="#C4956A" opacity={0.25} />
        {/* 이마 하이라이트 */}
        <Ellipse cx={46} cy={28} rx={13} ry={7} fill="#FFFFFF" opacity={0.1} />

        {/* ── 머리카락 (백발, 약간 흐트러진 모험가 스타일) ── */}
        <G>
          {/* 메인 헤어 (윗머리 — 풍성한 백발) */}
          <Path
            d="M 22 40 Q 18 22 30 14 Q 42 6 50 5 Q 58 6 70 14 Q 82 22 78 40"
            fill="url(#rogersHair)"
          />
          {/* 모험가 느낌 — 살짝 뻗친 머리카락 */}
          <Path d="M 26 18 Q 24 12 28 10" fill="none" stroke="#E8E8E8" strokeWidth={2.5} strokeLinecap="round" opacity={0.6} />
          <Path d="M 72 20 Q 76 14 74 10" fill="none" stroke="#E0E0E0" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
          <Path d="M 48 8 Q 46 3 50 2" fill="none" stroke="#F0F0F0" strokeWidth={2} strokeLinecap="round" opacity={0.45} />
          {/* 옆머리 (귀 옆) */}
          <Path d="M 22 40 Q 19 46 21 50 Q 23 52 25 50" fill="#E0E0E0" opacity={0.7} />
          <Path d="M 78 40 Q 81 46 79 50 Q 77 52 75 50" fill="#E0E0E0" opacity={0.7} />
          {/* 머리 광택 */}
          <Path
            d="M 30 18 Q 42 8 56 10 Q 66 12 72 20"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            opacity={0.3}
          />
        </G>

        {/* ── 귀 (사람 귀) ── */}
        <Ellipse cx={21} cy={44} rx={4} ry={6} fill="#F5CBA7" />
        <Ellipse cx={21} cy={44} rx={2.5} ry={4} fill="#E8BE8A" opacity={0.5} />
        <Ellipse cx={79} cy={44} rx={4} ry={6} fill="#F5CBA7" />
        <Ellipse cx={79} cy={44} rx={2.5} ry={4} fill="#E8BE8A" opacity={0.5} />

        {/* ── 눈 ── */}
        {blinkPhase >= 0.5 ? (
          /* 눈 감은 상태 — 곡선으로 표현 */
          <G>
            <Path d="M 31 43 Q 37 46 43 43" fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 57 43 Q 63 46 69 43" fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : (
          /* 눈 뜬 상태 — 큰 호기심 가득한 눈 */
          <G>
            {/* 왼쪽 눈 */}
            <Ellipse cx={37} cy={43} rx={6.5} ry={expression === 'bullish' ? 7 : 5.5} fill="#FFFFFF" />
            <Circle cx={38} cy={42.5} r={4} fill="#5D7B3A" />
            <Circle cx={38} cy={42.5} r={2.2} fill="#1A1A1A" />
            <Circle cx={39.5} cy={41} r={1.5} fill="#FFFFFF" />
            <Circle cx={37} cy={41.5} r={0.7} fill="#FFFFFF" opacity={0.5} />
            {/* 오른쪽 눈 */}
            <Ellipse cx={63} cy={43} rx={6.5} ry={expression === 'bullish' ? 7 : 5.5} fill="#FFFFFF" />
            <Circle cx={64} cy={42.5} r={4} fill="#5D7B3A" />
            <Circle cx={64} cy={42.5} r={2.2} fill="#1A1A1A" />
            <Circle cx={65.5} cy={41} r={1.5} fill="#FFFFFF" />
            <Circle cx={63} cy={41.5} r={0.7} fill="#FFFFFF" opacity={0.5} />
          </G>
        )}

        {/* cautious: 반쯤 감은 눈 (분석 모드) */}
        {showThinking && blinkPhase < 0.5 && (
          <G>
            <Rect x={30} y={37} width={15} height={5} rx={2.5} fill="#F5CBA7" opacity={0.65} />
            <Rect x={56} y={37} width={15} height={5} rx={2.5} fill="#F5CBA7" opacity={0.65} />
          </G>
        )}

        {/* ── 눈썹 ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 28 36 Q 34 31 44 35" fill="none" stroke="#A0A0A0" strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M 56 35 Q 66 31 72 36" fill="none" stroke="#A0A0A0" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ) : expression === 'bullish' ? (
          <G>
            <Path d="M 28 35 Q 34 29 44 33" fill="none" stroke="#A0A0A0" strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M 56 33 Q 66 29 72 35" fill="none" stroke="#A0A0A0" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 29 35 Q 36 31 44 34" fill="none" stroke="#A0A0A0" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 56 34 Q 64 31 71 35" fill="none" stroke="#A0A0A0" strokeWidth={2} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (작고 둥근 인간 코) ── */}
        <Ellipse cx={50} cy={52} rx={3.5} ry={2.5} fill="#D4A574" />
        <Ellipse cx={49} cy={51} rx={1.8} ry={1} fill="#F5CBA7" opacity={0.5} />

        {/* ── 볼터치 ── */}
        <Circle cx={27} cy={52} r={6} fill="#E8836B" opacity={0.15} />
        <Circle cx={73} cy={52} r={6} fill="#E8836B" opacity={0.15} />

        {/* ── 입 (표정별) ── */}
        <Path d={mouthPath} fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
        {expression === 'bullish' && (
          <Path d="M 40 66 Q 50 71 60 66" fill="#FFFFFF" opacity={0.35} />
        )}

        {/* ── bullish: 눈 반짝임 (모험 발견!) ── */}
        {expression === 'bullish' && blinkPhase < 0.5 && (
          <G>
            <Path d="M 33 36 L 34 33.5 L 35 36 L 32.5 35 L 35.5 35 Z" fill="#FFD54F" opacity={0.6} />
            <Path d="M 59 36 L 60 33.5 L 61 36 L 58.5 35 L 61.5 35 Z" fill="#FFD54F" opacity={0.6} />
          </G>
        )}

        {/* ── 땀방울 (bearish) ── */}
        {showSweat && (
          <G>
            <Path d="M 79 14 Q 81 8 83 14 Q 83 20 81 20 Q 79 20 79 14 Z" fill="#64B5F6" opacity={0.55} />
            <Ellipse cx={80.5} cy={12.5} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* ── 생각 거품 (cautious) ── */}
        {showThinking && (
          <G>
            <Circle cx={81} cy={24} r={3} fill="#E0E0E0" opacity={0.4} />
            <Circle cx={86} cy={17} r={4} fill="#E0E0E0" opacity={0.3} />
            <Circle cx={90} cy={8} r={5.5} fill="#E0E0E0" opacity={0.25} />
            <Circle cx={89} cy={6} r={2} fill="#FFFFFF" opacity={0.15} />
          </G>
        )}
      </G>
    </Svg>
  );
}
