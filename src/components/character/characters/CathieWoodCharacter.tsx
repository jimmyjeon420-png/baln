/**
 * 캐시 우드 캐릭터 — 로켓 파일럿 (2.5D 동물의숲 스타일)
 *
 * 디자인 키워드: 보라+분홍 톤, 미래형 바이저, 별/로켓 모티프, 에너지
 * 컨셉: 파괴적 혁신 — 미래를 향해 돌진하는 파일럿
 * 입체감: RadialGradient + 네온 하이라이트 + 부드러운 그림자
 * SD 비율: 큰 머리 + 짧은 다리 (주토피아 스타일 이족보행)
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

/* 전체 캐릭터를 위로 7유닛 이동하여 다리 공간 확보 */
const DY = -7;

export function CathieWoodCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return 'M 35 62 Q 50 75 65 62';
      case 'bearish':
        return 'M 40 66 Q 50 60 60 66';
      case 'cautious':
        return 'M 42 64 L 50 61 L 58 64';
      case 'neutral':
      default:
        return 'M 39 62 Q 50 70 61 62';
    }
  })();

  const showSweat = expression === 'bearish';
  const showSparkle = expression === 'bullish';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 입체감 */}
        <RadialGradient id="cathieFace" cx="45%" cy="38%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE0CC" />
          <Stop offset="55%" stopColor="#FFCCBC" />
          <Stop offset="100%" stopColor="#E0A68A" />
        </RadialGradient>
        {/* 가운 그라데이션 */}
        <LinearGradient id="cathieGown" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#7B1FA2" />
          <Stop offset="100%" stopColor="#4A148C" />
        </LinearGradient>
        {/* 머리카락 */}
        <RadialGradient id="cathieHair" cx="45%" cy="30%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#A1887F" />
          <Stop offset="100%" stopColor="#6D4C41" />
        </RadialGradient>
        {/* 바이저 네온 그라데이션 */}
        <LinearGradient id="cathieVisor" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={accentColor} stopOpacity="0.3" />
          <Stop offset="50%" stopColor="#E040FB" stopOpacity="0.2" />
          <Stop offset="100%" stopColor={accentColor} stopOpacity="0.3" />
        </LinearGradient>
        {/* 다리 색상 (가운보다 살짝 어두운 보라) */}
        <LinearGradient id="cathieLeg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#4A148C" />
          <Stop offset="100%" stopColor="#38006B" />
        </LinearGradient>
      </Defs>

      {/* ── 로켓 불꽃 (bullish) ── */}
      {showSparkle && (
        <G opacity={0.25}>
          <Path d="M 50 99 L 46 90 L 54 90 Z" fill="#FF6F00" />
          <Path d="M 42 99 L 40 93 L 46 93 Z" fill="#FFA000" />
          <Path d="M 58 99 L 54 93 L 60 93 Z" fill="#FFA000" />
        </G>
      )}

      {/* ── 그림자 (바닥, 발 아래) ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.12} />

      {/* ===== 몸체 + 머리 그룹 (DY만큼 위로 이동) ===== */}
      <G transform={`translate(0, ${DY})`}>
        {/* ── 몸체 (미래적 가운) ── */}
        <Ellipse cx={50} cy={80} rx={26} ry={17} fill="url(#cathieGown)" />
        {/* 가운 중앙 라인 */}
        <Path d="M 50 69 L 50 88" fill="none" stroke="#CE93D8" strokeWidth={1.5} opacity={0.3} />
        {/* 가운 하이라이트 */}
        <Ellipse cx={40} cy={76} rx={8} ry={6} fill="#FFFFFF" opacity={0.05} />
        {/* 별 핀 */}
        <G transform="translate(32, 72) scale(0.6)">
          <Path d="M 5 0 L 6.5 3.5 L 10 4 L 7.5 6.5 L 8 10 L 5 8.5 L 2 10 L 2.5 6.5 L 0 4 L 3.5 3.5 Z" fill="#FFD54F" opacity={0.7} />
        </G>

        {/* ── 얼굴 ── */}
        <Circle cx={50} cy={43} r={31} fill="url(#cathieFace)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={68} rx={22} ry={6} fill="#C0846A" opacity={0.25} />
        {/* 이마 하이라이트 */}
        <Ellipse cx={44} cy={27} rx={15} ry={9} fill="#FFFFFF" opacity={0.1} />

        {/* ── 머리카락 (웨이브 긴 머리) ── */}
        <Path
          d="M 18 44 Q 14 18 30 10 Q 42 4 50 7 Q 58 4 70 10 Q 86 18 82 44"
          fill="url(#cathieHair)"
        />
        {/* 옆 머리 (볼 옆으로 내려오는 웨이브) */}
        <Path
          d="M 18 44 Q 16 52 18 60 Q 20 66 24 68"
          fill="#795548"
          stroke="none"
          opacity={0.7}
        />
        <Path
          d="M 82 44 Q 84 52 82 60 Q 80 66 76 68"
          fill="#795548"
          stroke="none"
          opacity={0.7}
        />
        {/* 머리 하이라이트 */}
        <Path
          d="M 30 16 Q 42 8 56 10 Q 68 13 74 20"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2}
          opacity={0.12}
        />
        {/* 앞머리 (살짝 가르마) */}
        <Path d="M 32 26 Q 40 17 50 19 Q 60 17 68 26" fill="#8D6E63" stroke="none" />

        {/* ── 미래형 바이저 ── */}
        <Path
          d="M 26 34 Q 28 27 50 25 Q 72 27 74 34"
          fill="url(#cathieVisor)"
          stroke={accentColor}
          strokeWidth={1.2}
          opacity={0.7}
        />
        {/* 바이저 하이라이트 */}
        <Path
          d="M 35 30 Q 45 27 55 30"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={0.8}
          opacity={0.2}
        />

        {/* ── 눈 (에너지 넘치는 큰 눈) ── */}
        {blinkPhase >= 1 ? (
          <G>
            <Path d="M 30 43 Q 37 45 44 43" fill="none" stroke="#6D4C41" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 56 43 Q 63 45 70 43" fill="none" stroke="#6D4C41" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            {/* 왼쪽 눈 */}
            <Ellipse cx={37} cy={43} rx={7} ry={6.5} fill="#FFFFFF" />
            <Circle cx={38} cy={42} r={4.2} fill="#4A148C" />
            <Circle cx={39.5} cy={40.5} r={1.6} fill="#FFFFFF" />
            <Circle cx={37} cy={41} r={0.8} fill="#FFFFFF" opacity={0.5} />
            {/* 오른쪽 눈 */}
            <Ellipse cx={63} cy={43} rx={7} ry={6.5} fill="#FFFFFF" />
            <Circle cx={64} cy={42} r={4.2} fill="#4A148C" />
            <Circle cx={65.5} cy={40.5} r={1.6} fill="#FFFFFF" />
            <Circle cx={63} cy={41} r={0.8} fill="#FFFFFF" opacity={0.5} />
          </G>
        )}

        {/* bullish 별 반짝임 */}
        {showSparkle && (
          <G>
            <Path d="M 33 36 L 34.5 33 L 36 36 L 33 35 L 36 34.5 Z" fill="#FFD54F" opacity={0.7} />
            <Path d="M 59 36 L 60.5 33 L 62 36 L 59 35 L 62 34.5 Z" fill="#FFD54F" opacity={0.7} />
            {/* 추가 반짝임 */}
            <Circle cx={28} cy={30} r={1.5} fill="#E040FB" opacity={0.3} />
            <Circle cx={72} cy={28} r={1} fill="#E040FB" opacity={0.25} />
          </G>
        )}

        {/* ── 눈썹 ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 28 36 Q 34 32 44 36" fill="none" stroke="#6D4C41" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M 56 36 Q 66 32 72 36" fill="none" stroke="#6D4C41" strokeWidth={1.8} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 28 35 Q 34 30 44 34" fill="none" stroke="#6D4C41" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M 56 34 Q 66 30 72 35" fill="none" stroke="#6D4C41" strokeWidth={1.8} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 ── */}
        <Ellipse cx={50} cy={52} rx={2.8} ry={2.2} fill="#E0A68A" />
        <Ellipse cx={49} cy={51.2} rx={1.3} ry={0.8} fill="#FFD0B0" opacity={0.4} />

        {/* ── 볼터치 (보라+핑크 톤) ── */}
        <Circle cx={26} cy={53} r={7} fill="#CE93D8" opacity={0.2} />
        <Circle cx={74} cy={53} r={7} fill="#CE93D8" opacity={0.2} />
        <Circle cx={26} cy={52} r={4} fill="#F48FB1" opacity={0.1} />
        <Circle cx={74} cy={52} r={4} fill="#F48FB1" opacity={0.1} />

        {/* ── 입 ── */}
        <Path d={mouthPath} fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
        {expression === 'bullish' && (
          <Path d="M 42 65 Q 50 69 58 65" fill="#FFFFFF" opacity={0.35} />
        )}

        {/* ── 땀방울 (bearish) ── */}
        {showSweat && (
          <G>
            <Path d="M 80 28 Q 82 22 84 28 Q 84 34 82 34 Q 80 34 80 28 Z" fill="#64B5F6" opacity={0.55} />
            <Ellipse cx={81.5} cy={26.5} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* ── 분석 이펙트 (cautious) — 미니 차트 ── */}
        {expression === 'cautious' && (
          <G opacity={0.35}>
            <Rect x={78} y={14} width={14} height={12} rx={3} fill="#1E1E2E" />
            <Path d="M 80 24 L 83 20 L 86 22 L 89 17" fill="none" stroke={accentColor} strokeWidth={1.2} strokeLinecap="round" />
            {/* 차트 하이라이트 */}
            <Rect x={79} y={15} width={6} height={2} rx={1} fill="#FFFFFF" opacity={0.1} />
          </G>
        )}
      </G>

      {/* ===== 다리 + 발 (절대 좌표, 몸체 아래) ===== */}
      {/* 왼쪽 다리 */}
      <Rect x={38} y={83} width={7} height={10} rx={3} fill="url(#cathieLeg)" />
      {/* 왼쪽 다리 하이라이트 */}
      <Rect x={39.5} y={84} width={2.5} height={7} rx={1.2} fill="#FFFFFF" opacity={0.06} />
      {/* 오른쪽 다리 */}
      <Rect x={55} y={83} width={7} height={10} rx={3} fill="url(#cathieLeg)" />
      {/* 오른쪽 다리 하이라이트 */}
      <Rect x={56.5} y={84} width={2.5} height={7} rx={1.2} fill="#FFFFFF" opacity={0.06} />

      {/* 왼쪽 발 (귀여운 둥근 발) */}
      <Ellipse cx={41} cy={93.5} rx={5.5} ry={3} fill="#38006B" />
      <Ellipse cx={40} cy={93} rx={2.5} ry={1.2} fill="#FFFFFF" opacity={0.08} />
      {/* 오른쪽 발 */}
      <Ellipse cx={59} cy={93.5} rx={5.5} ry={3} fill="#38006B" />
      <Ellipse cx={58} cy={93} rx={2.5} ry={1.2} fill="#FFFFFF" opacity={0.08} />
    </Svg>
  );
}
