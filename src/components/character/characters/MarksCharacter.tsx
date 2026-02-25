/**
 * 하워드 막스 캐릭터 — 지혜로운 거북이 (2.5D 동물의숲 스타일)
 *
 * 디자인 키워드: 올리브-초록 머리, 돔형 등껍질(헥사곤 패턴), 노트패드 소품
 * 컨셉: "2차적 사고" — 가장 신중하고 사려깊은 캐릭터
 * 성격: 느리지만 확실한, 수비적 투자, 메모광
 * 입체감: RadialGradient + 하이라이트 + 등껍질 입체 패턴
 * 주토피아 스타일: 두 발로 걷는 의인화 거북이 + SD/치비 비율
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

/* ── 전체를 위로 올리는 오프셋 (다리 공간 확보) ── */
const SHIFT_UP = -7;

export function MarksCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return 'M 38 62 Q 50 70 62 62';       // cautious optimism smile
      case 'bearish':
        return 'M 42 65 Q 50 60 58 65';       // worried frown
      case 'cautious':
        return 'M 43 63 L 57 63';             // flat contemplative line
      case 'neutral':
      default:
        return 'M 40 62 Q 50 67 60 62';       // calm subtle smile
    }
  })();

  const showSweat = expression === 'bearish';
  const showThinking = expression === 'cautious';
  // bearish: turtle retreats — shell rises, head dips
  const shellRise = expression === 'bearish' ? -3 : 0;
  const headDip = expression === 'bearish' ? 2 : 0;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 — 따뜻한 올리브-녹색 피부 */}
        <RadialGradient id="marksFace" cx="45%" cy="38%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#C5D6A0" />
          <Stop offset="55%" stopColor="#A8C472" />
          <Stop offset="100%" stopColor="#8AAD5A" />
        </RadialGradient>
        {/* 등껍질 — 진한 올리브-갈색 돔 */}
        <RadialGradient id="marksShell" cx="50%" cy="35%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#6D7B3A" />
          <Stop offset="50%" stopColor="#556B2F" />
          <Stop offset="100%" stopColor="#3E4F1F" />
        </RadialGradient>
        {/* 등껍질 패턴 선 */}
        <LinearGradient id="marksShellLine" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#7C8B44" />
          <Stop offset="100%" stopColor="#4A5A28" />
        </LinearGradient>
        {/* 배 — 연한 크림색 */}
        <RadialGradient id="marksBelly" cx="50%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#F5ECD0" />
          <Stop offset="100%" stopColor="#E8DDB8" />
        </RadialGradient>
        {/* 다리 — 올리브-녹색 그라데이션 */}
        <LinearGradient id="marksLeg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#A8C472" />
          <Stop offset="100%" stopColor="#8AAD5A" />
        </LinearGradient>
        {/* 발 — 약간 더 진한 올리브 */}
        <RadialGradient id="marksFoot" cx="50%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#A8C472" />
          <Stop offset="100%" stopColor="#7A9D48" />
        </RadialGradient>
      </Defs>

      {/* ── 바닥 그림자 (발 아래) ── */}
      <Ellipse cx={50} cy={97} rx={24} ry={3} fill="#000000" opacity={0.10} />

      {/* ══════════════════════════════════════
          몸체 전체를 위로 올리는 그룹
          ══════════════════════════════════════ */}
      <G transform={`translate(0, ${SHIFT_UP})`}>

        {/* -- 등껍질 (돔 형태, 몸체 뒤) -- */}
        <G transform={`translate(0, ${shellRise})`}>
          <Ellipse cx={50} cy={72} rx={28} ry={22} fill="url(#marksShell)" />
          {/* 껍질 하이라이트 */}
          <Ellipse cx={44} cy={62} rx={14} ry={10} fill="#FFFFFF" opacity={0.08} />
          {/* 헥사곤 패턴 힌트 — 간결한 선으로 */}
          <Path d="M 36 64 L 50 58 L 64 64" fill="none" stroke="#7C8B44" strokeWidth={1.2} opacity={0.4} />
          <Path d="M 32 74 L 50 66 L 68 74" fill="none" stroke="#7C8B44" strokeWidth={1.2} opacity={0.35} />
          <Path d="M 50 58 L 50 66" fill="none" stroke="#7C8B44" strokeWidth={1} opacity={0.3} />
          <Path d="M 36 64 L 32 74" fill="none" stroke="#7C8B44" strokeWidth={1} opacity={0.25} />
          <Path d="M 64 64 L 68 74" fill="none" stroke="#7C8B44" strokeWidth={1} opacity={0.25} />
          {/* 껍질 테두리 (입체감) */}
          <Path
            d="M 22 72 Q 22 50 50 48 Q 78 50 78 72"
            fill="none" stroke="#3E4F1F" strokeWidth={1.5} opacity={0.3}
          />
        </G>

        {/* -- 배 (앞면) -- */}
        <Ellipse cx={50} cy={78 + headDip} rx={18} ry={14} fill="url(#marksBelly)" />

        {/* -- 머리 (둥근 올리브-녹색) -- */}
        <G transform={`translate(0, ${headDip})`}>
          <Circle cx={50} cy={38} r={26} fill="url(#marksFace)" />
          {/* 이마 하이라이트 */}
          <Ellipse cx={44} cy={24} rx={12} ry={7} fill="#FFFFFF" opacity={0.12} />
          {/* 턱 아래 그림자 */}
          <Ellipse cx={50} cy={60} rx={18} ry={5} fill="#6E8B3D" opacity={0.2} />

          {/* -- 주름 (이마, 사려깊은 표정) -- */}
          <Path d="M 36 22 Q 42 20 48 22" fill="none" stroke="#7A9D48" strokeWidth={1} opacity={0.4} />
          <Path d="M 38 25 Q 44 23 50 25" fill="none" stroke="#7A9D48" strokeWidth={0.8} opacity={0.3} />
          <Path d="M 52 22 Q 56 20 62 22" fill="none" stroke="#7A9D48" strokeWidth={1} opacity={0.4} />

          {/* -- 눈 -- */}
          {blinkPhase >= 0.5 ? (
            <G>
              <Path d="M 33 40 Q 39 42 45 40" fill="none" stroke="#4E6B2B" strokeWidth={2.5} strokeLinecap="round" />
              <Path d="M 55 40 Q 61 42 67 40" fill="none" stroke="#4E6B2B" strokeWidth={2.5} strokeLinecap="round" />
            </G>
          ) : (
            <G>
              {/* 왼쪽 눈 — 크고 둥근 지혜로운 눈 */}
              <Ellipse cx={39} cy={40} rx={6} ry={5.5} fill="#FFFFFF" />
              <Circle cx={40} cy={39.5} r={3.5} fill="#37474F" />
              <Circle cx={41.2} cy={38.2} r={1.4} fill="#FFFFFF" />
              <Circle cx={39} cy={38.5} r={0.7} fill="#FFFFFF" opacity={0.5} />
              {/* 오른쪽 눈 */}
              <Ellipse cx={61} cy={40} rx={6} ry={5.5} fill="#FFFFFF" />
              <Circle cx={62} cy={39.5} r={3.5} fill="#37474F" />
              <Circle cx={63.2} cy={38.2} r={1.4} fill="#FFFFFF" />
              <Circle cx={61} cy={38.5} r={0.7} fill="#FFFFFF" opacity={0.5} />
            </G>
          )}

          {/* bullish: 눈 크게 — 조심스러운 낙관 */}
          {expression === 'bullish' && (
            <G>
              <Path d="M 36 34 L 37 32 L 38 34 L 36 33 L 38 33 Z" fill="#FFD54F" opacity={0.5} />
              <Path d="M 62 34 L 63 32 L 64 34 L 62 33 L 64 33 Z" fill="#FFD54F" opacity={0.5} />
            </G>
          )}

          {/* cautious: 눈 반쯤 감음 (깊은 사색) */}
          {showThinking && (
            <G>
              <Rect x={32} y={36} width={14} height={4} rx={2} fill="#A8C472" opacity={0.55} />
              <Rect x={54} y={36} width={14} height={4} rx={2} fill="#A8C472" opacity={0.55} />
            </G>
          )}

          {/* -- 눈썹 -- */}
          {expression === 'bearish' ? (
            <G>
              <Path d="M 31 33 Q 37 29 46 33" fill="none" stroke="#5D7A32" strokeWidth={2} strokeLinecap="round" />
              <Path d="M 54 33 Q 63 29 69 33" fill="none" stroke="#5D7A32" strokeWidth={2} strokeLinecap="round" />
            </G>
          ) : expression === 'cautious' ? (
            <G>
              <Path d="M 32 32 Q 38 29 46 32" fill="none" stroke="#5D7A32" strokeWidth={2.2} strokeLinecap="round" />
              <Path d="M 54 32 Q 62 29 68 32" fill="none" stroke="#5D7A32" strokeWidth={2.2} strokeLinecap="round" />
            </G>
          ) : (
            <G>
              <Path d="M 32 33 Q 38 30 46 32" fill="none" stroke="#5D7A32" strokeWidth={2} strokeLinecap="round" />
              <Path d="M 54 32 Q 62 30 68 33" fill="none" stroke="#5D7A32" strokeWidth={2} strokeLinecap="round" />
            </G>
          )}

          {/* -- 코 (부리 같은 작은 삼각) -- */}
          <Path d="M 48 49 Q 50 53 52 49" fill="#8AAD5A" />
          <Path d="M 48.5 49 Q 50 51.5 51.5 49" fill="#C5D6A0" opacity={0.4} />

          {/* -- 볼터치 -- */}
          <Circle cx={28} cy={48} r={6} fill="#FFAB91" opacity={0.18} />
          <Circle cx={72} cy={48} r={6} fill="#FFAB91" opacity={0.18} />

          {/* -- 입 (표정별) -- */}
          <Path d={mouthPath} fill="none" stroke="#5D7A32" strokeWidth={2} strokeLinecap="round" />
          {expression === 'bullish' && (
            <Path d="M 44 64 Q 50 67 56 64" fill="#FFFFFF" opacity={0.3} />
          )}
        </G>

        {/* -- 노트패드 소품 (오른쪽 아래) -- */}
        <G>
          <Rect x={72} y={70} width={12} height={16} rx={1.5} fill="#FFF9C4" opacity={0.85} />
          <Rect x={72} y={70} width={12} height={16} rx={1.5} fill="none" stroke={accentColor} strokeWidth={1} opacity={0.6} />
          {/* 노트 줄 */}
          <Path d="M 74 75 L 82 75" fill="none" stroke={accentColor} strokeWidth={0.5} opacity={0.4} />
          <Path d="M 74 78 L 82 78" fill="none" stroke={accentColor} strokeWidth={0.5} opacity={0.4} />
          <Path d="M 74 81 L 80 81" fill="none" stroke={accentColor} strokeWidth={0.5} opacity={0.4} />
          {/* 펜 */}
          <Path d="M 85 68 L 78 84" fill="none" stroke={accentColor} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
          <Circle cx={85} cy={68} r={1.2} fill={accentColor} opacity={0.6} />
        </G>

        {/* -- 땀방울 (bearish) -- */}
        {showSweat && (
          <G>
            <Path d="M 78 22 Q 80 16 82 22 Q 82 28 80 28 Q 78 28 78 22 Z" fill="#64B5F6" opacity={0.55} />
            <Ellipse cx={79.5} cy={21} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* -- 사색 이펙트 (cautious) — "2차적 사고" 거품 -- */}
        {showThinking && (
          <G>
            <Circle cx={80} cy={20} r={3} fill="#E0E0E0" opacity={0.4} />
            <Circle cx={86} cy={13} r={4} fill="#E0E0E0" opacity={0.3} />
            <Circle cx={91} cy={5} r={5.5} fill="#E0E0E0" opacity={0.25} />
            <Circle cx={90} cy={3} r={2} fill="#FFFFFF" opacity={0.15} />
            {/* 메모 아이콘 힌트 (말풍선 안) */}
            <Path d="M 89 4 L 91 4 M 89 6 L 93 6" fill="none" stroke={accentColor} strokeWidth={0.7} opacity={0.3} />
          </G>
        )}

      </G>
      {/* ══ 몸체 그룹 끝 ══ */}

      {/* ══════════════════════════════════════
          다리 & 발 (몸체 그룹 밖, 절대 좌표)
          ── 몸체 아래에서 바닥까지 ──
          ══════════════════════════════════════ */}

      {/* -- 왼쪽 다리 -- */}
      <G>
        {/* 다리 그림자 (안쪽) */}
        <Rect x={37} y={82} width={8} height={9} rx={3.5} fill="#6E8B3D" opacity={0.25} />
        {/* 다리 본체 */}
        <Rect x={36} y={81} width={8} height={9} rx={3.5} fill="url(#marksLeg)" />
        {/* 다리 하이라이트 */}
        <Rect x={37} y={82} width={3} height={6} rx={1.5} fill="#FFFFFF" opacity={0.08} />
      </G>

      {/* -- 오른쪽 다리 -- */}
      <G>
        {/* 다리 그림자 (안쪽) */}
        <Rect x={56} y={82} width={8} height={9} rx={3.5} fill="#6E8B3D" opacity={0.25} />
        {/* 다리 본체 */}
        <Rect x={55} y={81} width={8} height={9} rx={3.5} fill="url(#marksLeg)" />
        {/* 다리 하이라이트 */}
        <Rect x={56} y={82} width={3} height={6} rx={1.5} fill="#FFFFFF" opacity={0.08} />
      </G>

      {/* -- 왼쪽 발 (물갈퀴 달린 둥근 발) -- */}
      <G>
        {/* 발 본체 — 넓적한 타원 */}
        <Ellipse cx={40} cy={92} rx={7} ry={3.5} fill="url(#marksFoot)" />
        {/* 발 하이라이트 */}
        <Ellipse cx={39} cy={91} rx={4} ry={1.8} fill="#FFFFFF" opacity={0.10} />
        {/* 물갈퀴 발가락 범프 (3개) */}
        <Circle cx={35} cy={93.5} r={1.8} fill="#8AAD5A" />
        <Circle cx={40} cy={94.5} r={2} fill="#8AAD5A" />
        <Circle cx={45} cy={93.5} r={1.8} fill="#8AAD5A" />
        {/* 발가락 사이 물갈퀴 힌트 */}
        <Path d="M 36.5 93 Q 37.5 95 39 94" fill="none" stroke="#7A9D48" strokeWidth={0.6} opacity={0.35} />
        <Path d="M 41 94.2 Q 42.5 95.5 43.5 93.5" fill="none" stroke="#7A9D48" strokeWidth={0.6} opacity={0.35} />
      </G>

      {/* -- 오른쪽 발 (물갈퀴 달린 둥근 발) -- */}
      <G>
        {/* 발 본체 — 넓적한 타원 */}
        <Ellipse cx={59} cy={92} rx={7} ry={3.5} fill="url(#marksFoot)" />
        {/* 발 하이라이트 */}
        <Ellipse cx={58} cy={91} rx={4} ry={1.8} fill="#FFFFFF" opacity={0.10} />
        {/* 물갈퀴 발가락 범프 (3개) */}
        <Circle cx={54} cy={93.5} r={1.8} fill="#8AAD5A" />
        <Circle cx={59} cy={94.5} r={2} fill="#8AAD5A" />
        <Circle cx={64} cy={93.5} r={1.8} fill="#8AAD5A" />
        {/* 발가락 사이 물갈퀴 힌트 */}
        <Path d="M 55.5 93 Q 56.5 95 58 94" fill="none" stroke="#7A9D48" strokeWidth={0.6} opacity={0.35} />
        <Path d="M 60 94.2 Q 61.5 95.5 62.5 93.5" fill="none" stroke="#7A9D48" strokeWidth={0.6} opacity={0.35} />
      </G>

    </Svg>
  );
}
