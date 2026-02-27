/**
 * 일론 머스크 캐릭터 — 예측불가 혁신의 아이콘
 *
 * 디자인 키워드: 다크 브라운 헤어, 뾰족한 이마선, 블랙 터틀넥, 캐주얼 테크 CEO
 * 입체감: RadialGradient + LinearGradient + 하이라이트 + 그림자
 * 표정 변화: bullish(씩 웃음+로켓) / bearish(걱정+땀방울) / cautious(생각 중+번개) / neutral(살짝 비죽)
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

export function MuskCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        // 한쪽이 올라간 씩 웃음 (smirk)
        return 'M 38 60 Q 46 68 54 64 Q 58 62 62 58';
      case 'bearish':
        return 'M 40 64 Q 50 58 60 64';
      case 'cautious':
        // 살짝 삐죽한 입
        return 'M 40 62 Q 48 60 52 62 Q 56 64 60 62';
      case 'neutral':
      default:
        return 'M 40 60 Q 50 65 60 60';
    }
  })();

  const showSweat = expression === 'bearish';
  const showBolt = expression === 'cautious';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 피부 — 밝은 코카시안 */}
        <RadialGradient id="muskSkin" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFE8D0" />
          <Stop offset="55%" stopColor="#F5CBA7" />
          <Stop offset="100%" stopColor="#DEB088" />
        </RadialGradient>
        {/* 머리카락 — 다크 브라운 */}
        <LinearGradient id="muskHair" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#4A3728" />
          <Stop offset="50%" stopColor="#3E2E1E" />
          <Stop offset="100%" stopColor="#2C1F14" />
        </LinearGradient>
        {/* 터틀넥 / 티셔츠 — 블랙~다크 그레이 */}
        <LinearGradient id="muskShirt" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#2C2C2C" />
          <Stop offset="100%" stopColor="#1A1A1A" />
        </LinearGradient>
        {/* 청바지 — 다크 인디고 */}
        <LinearGradient id="muskJeans" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#2C3E6B" />
          <Stop offset="100%" stopColor="#1E2A4A" />
        </LinearGradient>
        {/* 스니커즈 */}
        <RadialGradient id="muskSneaker" cx="50%" cy="40%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#E0E0E0" />
          <Stop offset="100%" stopColor="#B0B0B0" />
        </RadialGradient>
      </Defs>

      {/* ── 바닥 그림자 ── */}
      <Ellipse cx={50} cy={97} rx={20} ry={3} fill="#000000" opacity={0.13} />

      {/* ── 다리 & 스니커즈 ── */}
      <G>
        {/* 왼쪽 청바지 */}
        <Rect x={37} y={82} width={9} height={10} rx={4} fill="url(#muskJeans)" />
        {/* 왼쪽 청바지 스티칭 */}
        <Path d="M 40 82 L 40 92" fill="none" stroke="#3D5080" strokeWidth={0.4} opacity={0.3} />
        {/* 왼쪽 스니커즈 */}
        <Ellipse cx={41} cy={93.5} rx={7} ry={3.5} fill="url(#muskSneaker)" />
        <Path d="M 35 93 Q 41 91 47 93" fill="none" stroke="#FFFFFF" strokeWidth={0.8} opacity={0.5} />
        {/* 스니커즈 솔 */}
        <Ellipse cx={41} cy={95} rx={6.5} ry={1.5} fill="#505050" opacity={0.4} />

        {/* 오른쪽 청바지 */}
        <Rect x={54} y={82} width={9} height={10} rx={4} fill="url(#muskJeans)" />
        <Path d="M 60 82 L 60 92" fill="none" stroke="#3D5080" strokeWidth={0.4} opacity={0.3} />
        {/* 오른쪽 스니커즈 */}
        <Ellipse cx={59} cy={93.5} rx={7} ry={3.5} fill="url(#muskSneaker)" />
        <Path d="M 53 93 Q 59 91 65 93" fill="none" stroke="#FFFFFF" strokeWidth={0.8} opacity={0.5} />
        <Ellipse cx={59} cy={95} rx={6.5} ry={1.5} fill="#505050" opacity={0.4} />
      </G>

      {/* ── 머리+몸체 그룹 (SD 비율) ── */}
      <G transform="translate(0, -6)">

        {/* ── 몸체 (블랙 터틀넥, 슬림) ── */}
        <Ellipse cx={50} cy={82} rx={23} ry={15} fill="url(#muskShirt)" />
        {/* 터틀넥 목 부분 */}
        <Rect x={44} y={66} width={12} height={6} rx={5} fill="#2C2C2C" />
        {/* 터틀넥 주름 디테일 */}
        <Path d="M 46 68 Q 50 70 54 68" fill="none" stroke="#444444" strokeWidth={0.6} opacity={0.4} />
        <Path d="M 45 70 Q 50 72 55 70" fill="none" stroke="#444444" strokeWidth={0.6} opacity={0.3} />
        {/* 로켓 핀 — accentColor 사용 */}
        <G transform="translate(34, 74)">
          {/* 핀 바탕 */}
          <Circle cx={0} cy={0} r={3} fill={accentColor} opacity={0.85} />
          {/* 미니 로켓 아이콘 */}
          <Path d="M -1 -1.5 L 0 -3 L 1 -1.5 L 0.5 -1.5 L 0.5 1 L -0.5 1 L -0.5 -1.5 Z" fill="#FFFFFF" opacity={0.9} />
          <Path d="M -0.8 1 L 0 2 L 0.8 1" fill="#FF6B35" opacity={0.8} />
        </G>

        {/* ── 머리카락 (다크 브라운, 살짝 헝클어진 스타일 + widow's peak) ── */}
        {/* 메인 헤어 매스 */}
        <Path
          d="M 22 42 Q 20 24 28 14 Q 36 6 50 4 Q 64 6 72 14 Q 80 24 78 42
             Q 76 32 70 22 Q 62 12 50 11 Q 38 12 30 22 Q 24 32 22 42 Z"
          fill="url(#muskHair)"
        />
        {/* Widow's peak (이마 V자) */}
        <Path
          d="M 34 22 Q 40 14 50 10 Q 46 18 50 24 Q 54 18 50 10 Q 60 14 66 22
             Q 60 16 50 13 Q 40 16 34 22 Z"
          fill="#3E2E1E"
        />
        {/* 헤어 텍스처 (살짝 헝클어진 느낌) */}
        <Path d="M 26 30 Q 32 18 42 12" fill="none" stroke="#5A4538" strokeWidth={1} opacity={0.3} />
        <Path d="M 74 30 Q 68 18 58 12" fill="none" stroke="#5A4538" strokeWidth={1} opacity={0.3} />
        {/* 정수리 삐침 머리 (messy tuft) */}
        <Path d="M 46 8 Q 48 3 50 7" fill="none" stroke="#4A3728" strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M 52 7 Q 54 2 56 6" fill="none" stroke="#4A3728" strokeWidth={1.2} strokeLinecap="round" />
        {/* 옆머리 */}
        <Path d="M 22 42 Q 20 36 22 30" fill="none" stroke="#3E2E1E" strokeWidth={2} opacity={0.4} />
        <Path d="M 78 42 Q 80 36 78 30" fill="none" stroke="#3E2E1E" strokeWidth={2} opacity={0.4} />

        {/* ── 귀 ── */}
        <Ellipse cx={21} cy={42} rx={4} ry={6} fill="#F5CBA7" />
        <Ellipse cx={21} cy={42} rx={2.5} ry={4} fill="#E8B898" opacity={0.5} />
        <Ellipse cx={79} cy={42} rx={4} ry={6} fill="#F5CBA7" />
        <Ellipse cx={79} cy={42} rx={2.5} ry={4} fill="#E8B898" opacity={0.5} />

        {/* ── 얼굴 (각진 특징) ── */}
        <Circle cx={50} cy={44} r={27} fill="url(#muskSkin)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={66} rx={18} ry={4} fill="#C49050" opacity={0.18} />
        {/* 이마 하이라이트 */}
        <Ellipse cx={46} cy={28} rx={11} ry={6} fill="#FFFFFF" opacity={0.07} />
        {/* 각진 턱 라인 힌트 */}
        <Path d="M 28 52 Q 36 64 50 66 Q 64 64 72 52" fill="none" stroke="#D4A574" strokeWidth={0.8} opacity={0.15} />

        {/* ── 눈 ── */}
        {blinkPhase >= 0.5 ? (
          <G>
            <Path d="M 32 42 Q 38 44 44 42" fill="none" stroke="#4A3728" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 56 42 Q 62 44 68 42" fill="none" stroke="#4A3728" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : expression === 'cautious' ? (
          <G>
            {/* 한쪽 눈 살짝 찡그림 */}
            <Ellipse cx={38} cy={42} rx={5.5} ry={4} fill="#FFFFFF" />
            <Circle cx={39} cy={42} r={3} fill="#3A6B8C" />
            <Circle cx={40} cy={41} r={1.2} fill="#FFFFFF" />
            <Ellipse cx={62} cy={42} rx={5} ry={3.5} fill="#FFFFFF" />
            <Circle cx={63} cy={42} r={2.8} fill="#3A6B8C" />
            <Circle cx={64} cy={41} r={1} fill="#FFFFFF" />
          </G>
        ) : (
          <G>
            {/* 크고 밝은 장난꾸러기 눈 — 블루그레이 홍채 */}
            <Circle cx={38} cy={42} r={expression === 'bullish' ? 6 : 5.5} fill="#FFFFFF" />
            <Circle cx={39} cy={42} r={3.5} fill="#3A6B8C" />
            <Circle cx={39} cy={42} r={2} fill="#1A3A50" />
            <Circle cx={40.5} cy={40.5} r={1.5} fill="#FFFFFF" />
            <Circle cx={38} cy={41} r={0.7} fill="#FFFFFF" opacity={0.5} />
            <Circle cx={62} cy={42} r={expression === 'bullish' ? 6 : 5.5} fill="#FFFFFF" />
            <Circle cx={63} cy={42} r={3.5} fill="#3A6B8C" />
            <Circle cx={63} cy={42} r={2} fill="#1A3A50" />
            <Circle cx={64.5} cy={40.5} r={1.5} fill="#FFFFFF" />
            <Circle cx={62} cy={41} r={0.7} fill="#FFFFFF" opacity={0.5} />
          </G>
        )}

        {/* bullish 눈 반짝임 */}
        {expression === 'bullish' && (
          <G>
            <Path d="M 35 36 L 36 34 L 37 36 L 35 35 L 37 35 Z" fill="#FDD835" opacity={0.7} />
            <Path d="M 59 36 L 60 34 L 61 36 L 59 35 L 61 35 Z" fill="#FDD835" opacity={0.7} />
          </G>
        )}

        {/* ── 눈썹 (짙은 눈썹, 약간 비대칭) ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 30 36 Q 36 32 45 35" fill="none" stroke="#4A3728" strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M 55 34 Q 64 31 70 35" fill="none" stroke="#4A3728" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ) : expression === 'bullish' ? (
          <G>
            {/* 한쪽 치켜올린 눈썹 (장난기) */}
            <Path d="M 31 35 Q 36 32 45 34" fill="none" stroke="#4A3728" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 55 32 Q 64 29 69 33" fill="none" stroke="#4A3728" strokeWidth={2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 31 35 Q 36 32 45 34" fill="none" stroke="#4A3728" strokeWidth={2} strokeLinecap="round" />
            <Path d="M 55 34 Q 64 32 69 35" fill="none" stroke="#4A3728" strokeWidth={2} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (사람 코) ── */}
        <Path d="M 50 46 L 48 54 Q 50 55.5 52 54 L 50 46" fill="none" stroke="#DEB088" strokeWidth={1.3} opacity={0.5} />
        <Circle cx={47} cy={54} r={1.8} fill="#E8BB8A" opacity={0.25} />
        <Circle cx={53} cy={54} r={1.8} fill="#E8BB8A" opacity={0.25} />

        {/* ── 볼터치 ── */}
        <Circle cx={27} cy={50} r={5.5} fill="#FF8A80" opacity={0.1} />
        <Circle cx={73} cy={50} r={5.5} fill="#FF8A80" opacity={0.1} />

        {/* ── 입 (표정별) ── */}
        <Path d={mouthPath} fill="none" stroke="#B87A5A" strokeWidth={2} strokeLinecap="round" />
        {expression === 'bullish' && (
          <Path d="M 42 62 Q 50 66 58 62" fill="#FFFFFF" opacity={0.3} />
        )}

        {/* ── bullish: 미니 로켓 이펙트 ── */}
        {expression === 'bullish' && (
          <G>
            {/* 미니 로켓 */}
            <Path d="M 82 16 L 84 8 L 86 16 L 85 16 L 85 20 L 83 20 L 83 16 Z" fill="#E0E0E0" opacity={0.7} />
            <Path d="M 83 20 L 84 24 L 85 20" fill="#FF6B35" opacity={0.6} />
            <Circle cx={84} cy={12} r={1} fill={accentColor} opacity={0.5} />
            {/* 연기 파티클 */}
            <Circle cx={84} cy={26} r={1.5} fill="#BDBDBD" opacity={0.3} />
            <Circle cx={82} cy={28} r={1} fill="#BDBDBD" opacity={0.2} />
          </G>
        )}

        {/* ── 땀방울 (bearish) ── */}
        {showSweat && (
          <G>
            <Path d="M 82 28 Q 84 22 86 28 Q 86 34 84 34 Q 82 34 82 28 Z" fill="#64B5F6" opacity={0.55} />
            <Ellipse cx={83.5} cy={27} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* ── 번개 볼트 (cautious — X/Twitter 레퍼런스) ── */}
        {showBolt && (
          <G>
            <Path d="M 82 14 L 85 14 L 83 19 L 87 19 L 81 27 L 83 21 L 80 21 Z" fill={accentColor} opacity={0.5} />
            <Circle cx={86} cy={10} r={2} fill={accentColor} opacity={0.2} />
          </G>
        )}
      </G>
    </Svg>
  );
}
