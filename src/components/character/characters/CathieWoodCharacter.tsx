/**
 * 캐시 우드 캐릭터 — 혁신의 선구자
 *
 * 디자인 키워드: 보라/마젠타 블레이저, 자신감, 혁신 투자자
 * 컨셉: 파괴적 혁신 — 미래를 믿고 확신을 가지고 투자하는 선구자
 * 입체감: RadialGradient + 하이라이트 + 부드러운 그림자
 * SD 비율: 큰 머리 + 짧은 다리 (치비/SD 스타일)
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
        return 'M 35 62 Q 50 75 65 62';        // confident wide smile
      case 'bearish':
        return 'M 40 66 Q 50 60 60 66';         // worried frown
      case 'cautious':
        return 'M 42 64 L 50 61 L 58 64';       // thinking flat line
      case 'neutral':
      default:
        return 'M 39 62 Q 50 70 61 62';         // warm natural smile
    }
  })();

  const showSweat = expression === 'bearish';
  const showSparkle = expression === 'bullish';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 입체감 — 따뜻한 인간 피부톤 */}
        <RadialGradient id="cathieFace" cx="45%" cy="38%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE0C0" />
          <Stop offset="55%" stopColor="#F5CBA7" />
          <Stop offset="100%" stopColor="#D4A574" />
        </RadialGradient>
        {/* 블레이저 그라데이션 (퍼플/마젠타) */}
        <LinearGradient id="cathieBlazer" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#7B1FA2" />
          <Stop offset="100%" stopColor="#4A148C" />
        </LinearGradient>
        {/* 머리카락 — 어번/라이트브라운, 웨이브 */}
        <RadialGradient id="cathieHair" cx="45%" cy="30%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#A1887F" />
          <Stop offset="100%" stopColor="#6D4C41" />
        </RadialGradient>
        {/* 블라우스 화이트 */}
        <LinearGradient id="cathieBlouse" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FAFAFA" />
          <Stop offset="100%" stopColor="#E0E0E0" />
        </LinearGradient>
        {/* 다리 색상 (다크 차콜 팬츠) */}
        <LinearGradient id="cathiePants" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#37474F" />
          <Stop offset="100%" stopColor="#263238" />
        </LinearGradient>
      </Defs>

      {/* ── 그림자 (바닥, 발 아래) ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.12} />

      {/* ===== 다리 + 발 (절대 좌표, 몸체 아래) ===== */}
      {/* 왼쪽 다리 */}
      <Rect x={38} y={83} width={7} height={10} rx={3} fill="url(#cathiePants)" />
      <Rect x={39.5} y={84} width={2.5} height={7} rx={1.2} fill="#FFFFFF" opacity={0.06} />
      {/* 오른쪽 다리 */}
      <Rect x={55} y={83} width={7} height={10} rx={3} fill="url(#cathiePants)" />
      <Rect x={56.5} y={84} width={2.5} height={7} rx={1.2} fill="#FFFFFF" opacity={0.06} />

      {/* 왼쪽 힐 (프로페셔널 힐) */}
      <Ellipse cx={41} cy={93.5} rx={5.5} ry={3} fill="#4A148C" />
      <Ellipse cx={40} cy={93} rx={2.5} ry={1.2} fill="#FFFFFF" opacity={0.08} />
      {/* 오른쪽 힐 */}
      <Ellipse cx={59} cy={93.5} rx={5.5} ry={3} fill="#4A148C" />
      <Ellipse cx={58} cy={93} rx={2.5} ry={1.2} fill="#FFFFFF" opacity={0.08} />

      {/* ===== 몸체 + 머리 그룹 (DY만큼 위로 이동) ===== */}
      <G transform={`translate(0, ${DY})`}>

        {/* ── 몸체 (퍼플 블레이저) ── */}
        <Ellipse cx={50} cy={80} rx={24} ry={16} fill="url(#cathieBlazer)" />
        {/* 블레이저 라펠 (V-neck 라인) */}
        <Path d="M 42 69 L 50 80 L 58 69" fill="none" stroke="#CE93D8" strokeWidth={1.2} opacity={0.4} />
        {/* 화이트 블라우스 (V 안쪽) */}
        <Path d="M 44 70 L 50 77 L 56 70" fill="url(#cathieBlouse)" opacity={0.7} />
        {/* 블레이저 하이라이트 */}
        <Ellipse cx={40} cy={76} rx={7} ry={5} fill="#FFFFFF" opacity={0.05} />
        {/* 브로치/핀 장식 (accentColor) */}
        <Circle cx={37} cy={73} r={2.5} fill={accentColor} opacity={0.7} />
        <Circle cx={37} cy={73} r={1} fill="#FFFFFF" opacity={0.3} />
        {/* 브로치 반짝임 */}
        <Path d="M 37 70 L 37 71.5" fill="none" stroke="#FFFFFF" strokeWidth={0.5} opacity={0.3} />
        <Path d="M 34.5 73 L 35.5 73" fill="none" stroke="#FFFFFF" strokeWidth={0.5} opacity={0.3} />

        {/* ── 얼굴 ── */}
        <Circle cx={50} cy={43} r={31} fill="url(#cathieFace)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={68} rx={20} ry={5} fill="#D4A574" opacity={0.25} />
        {/* 이마 하이라이트 */}
        <Ellipse cx={44} cy={27} rx={15} ry={9} fill="#FFFFFF" opacity={0.1} />

        {/* ── 머리카락 (어번/라이트브라운, 어깨 길이, 살짝 웨이브) ── */}
        {/* 윗머리 볼륨 */}
        <Path
          d="M 18 44 Q 14 18 30 10 Q 42 4 50 7 Q 58 4 70 10 Q 86 18 82 44"
          fill="url(#cathieHair)"
        />
        {/* 옆머리 (볼 옆으로 내려오는 웨이브) */}
        <Path
          d="M 18 44 Q 15 52 16 60 Q 17 68 22 72 Q 20 70 18 64 Q 16 56 18 44 Z"
          fill="#795548"
        />
        <Path
          d="M 82 44 Q 85 52 84 60 Q 83 68 78 72 Q 80 70 82 64 Q 84 56 82 44 Z"
          fill="#795548"
        />
        {/* 웨이브 디테일 (좌) */}
        <Path
          d="M 17 50 Q 15 56 17 62"
          fill="none" stroke="#6D4C41" strokeWidth={1} opacity={0.3}
        />
        {/* 웨이브 디테일 (우) */}
        <Path
          d="M 83 50 Q 85 56 83 62"
          fill="none" stroke="#6D4C41" strokeWidth={1} opacity={0.3}
        />
        {/* 머리 하이라이트 */}
        <Path
          d="M 30 16 Q 42 8 56 10 Q 68 13 74 20"
          fill="none" stroke="#FFFFFF" strokeWidth={2} opacity={0.12}
        />
        {/* 앞머리 (살짝 가르마, 자연스러운 스타일) */}
        <Path d="M 32 26 Q 40 17 50 19 Q 60 17 68 26" fill="#8D6E63" />
        {/* 가르마 라인 */}
        <Path d="M 46 12 Q 48 18 50 22" fill="none" stroke="#6D4C41" strokeWidth={0.8} opacity={0.3} />

        {/* ── 눈 (밝고 자신감 있는 큰 눈 + 속눈썹) ── */}
        {blinkPhase >= 1 ? (
          <G>
            <Path d="M 30 43 Q 37 46 44 43" fill="none" stroke="#6D4C41" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 56 43 Q 63 46 70 43" fill="none" stroke="#6D4C41" strokeWidth={2.5} strokeLinecap="round" />
            {/* 감은 눈에도 속눈썹 힌트 */}
            <Path d="M 29 42 L 30 43" fill="none" stroke="#5D4037" strokeWidth={1.2} strokeLinecap="round" />
            <Path d="M 44 43 L 45 42" fill="none" stroke="#5D4037" strokeWidth={1.2} strokeLinecap="round" />
            <Path d="M 55 42 L 56 43" fill="none" stroke="#5D4037" strokeWidth={1.2} strokeLinecap="round" />
            <Path d="M 70 43 L 71 42" fill="none" stroke="#5D4037" strokeWidth={1.2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            {/* 왼쪽 눈 */}
            <Ellipse cx={37} cy={43} rx={7} ry={6.5} fill="#FFFFFF" />
            <Circle cx={38} cy={42} r={4.2} fill="#4E342E" />
            <Circle cx={37.5} cy={42.5} r={2.5} fill="#3E2723" />
            {/* 하이라이트 */}
            <Circle cx={39.5} cy={40.5} r={1.6} fill="#FFFFFF" />
            <Circle cx={37} cy={41} r={0.8} fill="#FFFFFF" opacity={0.5} />
            {/* 왼쪽 속눈썹 (여성적 디테일) */}
            <Path d="M 29 38 Q 33 35 37 36" fill="none" stroke="#5D4037" strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M 37 36 Q 41 35 44 37" fill="none" stroke="#5D4037" strokeWidth={1.3} strokeLinecap="round" />
            {/* 오른쪽 눈 */}
            <Ellipse cx={63} cy={43} rx={7} ry={6.5} fill="#FFFFFF" />
            <Circle cx={64} cy={42} r={4.2} fill="#4E342E" />
            <Circle cx={63.5} cy={42.5} r={2.5} fill="#3E2723" />
            {/* 하이라이트 */}
            <Circle cx={65.5} cy={40.5} r={1.6} fill="#FFFFFF" />
            <Circle cx={63} cy={41} r={0.8} fill="#FFFFFF" opacity={0.5} />
            {/* 오른쪽 속눈썹 */}
            <Path d="M 56 37 Q 59 35 63 36" fill="none" stroke="#5D4037" strokeWidth={1.3} strokeLinecap="round" />
            <Path d="M 63 36 Q 67 35 71 38" fill="none" stroke="#5D4037" strokeWidth={1.5} strokeLinecap="round" />
          </G>
        )}

        {/* ── 눈썹 ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 28 36 Q 34 32 44 36" fill="none" stroke="#8D6E63" strokeWidth={1.6} strokeLinecap="round" />
            <Path d="M 56 36 Q 66 32 72 36" fill="none" stroke="#8D6E63" strokeWidth={1.6} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 28 35 Q 34 30 44 34" fill="none" stroke="#8D6E63" strokeWidth={1.6} strokeLinecap="round" />
            <Path d="M 56 34 Q 66 30 72 35" fill="none" stroke="#8D6E63" strokeWidth={1.6} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (부드러운 여성적 코) ── */}
        <Ellipse cx={50} cy={52} rx={2.5} ry={2} fill="#D4A574" />
        <Ellipse cx={49} cy={51.2} rx={1.2} ry={0.7} fill="#FFE0C0" opacity={0.4} />

        {/* ── 볼터치 (핑크/보라 톤) ── */}
        <Circle cx={26} cy={53} r={7} fill="#CE93D8" opacity={0.18} />
        <Circle cx={74} cy={53} r={7} fill="#CE93D8" opacity={0.18} />
        <Circle cx={26} cy={52} r={4} fill="#F48FB1" opacity={0.1} />
        <Circle cx={74} cy={52} r={4} fill="#F48FB1" opacity={0.1} />

        {/* ── 입 ── */}
        <Path d={mouthPath} fill="none" stroke="#A1887F" strokeWidth={2} strokeLinecap="round" />
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

        {/* ── 반짝임 (bullish) — 별 모양 ── */}
        {showSparkle && (
          <G>
            <Path d="M 33 36 L 34.5 33 L 36 36 L 33 35 L 36 34.5 Z" fill="#FFD54F" opacity={0.7} />
            <Path d="M 59 36 L 60.5 33 L 62 36 L 59 35 L 62 34.5 Z" fill="#FFD54F" opacity={0.7} />
            <Circle cx={28} cy={30} r={1.5} fill="#E040FB" opacity={0.3} />
            <Circle cx={72} cy={28} r={1} fill="#E040FB" opacity={0.25} />
          </G>
        )}

        {/* ── 분석 이펙트 (cautious) — 미니 차트 ── */}
        {expression === 'cautious' && (
          <G opacity={0.35}>
            <Rect x={78} y={14} width={14} height={12} rx={3} fill="#1E1E2E" />
            <Path d="M 80 24 L 83 20 L 86 22 L 89 17" fill="none" stroke={accentColor} strokeWidth={1.2} strokeLinecap="round" />
            <Rect x={79} y={15} width={6} height={2} rx={1} fill="#FFFFFF" opacity={0.1} />
          </G>
        )}
      </G>
    </Svg>
  );
}
