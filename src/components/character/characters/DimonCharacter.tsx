/**
 * 제이미 다이먼 캐릭터 — 위엄 있는 사자 (2.5D 동물의숲 × 주토피아 스타일)
 *
 * 디자인 키워드: 황금 갈기, 따뜻한 황갈색 얼굴, 왕관형 갈기 실루엣, 블루 수트
 * 입체감: RadialGradient + LinearGradient + 하이라이트 + 그림자
 * 표정 변화: bullish(자신감 넘치는 미소) / bearish(엄격한 불만) / cautious(좁힌 회의적 눈) / neutral(위엄 있는 차분)
 */

import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Rect,
  Defs, RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import type { CharacterRenderProps } from '../../../types/character';

export function DimonCharacter({ size, expression, accentColor, blinkPhase = 0 }: CharacterRenderProps) {
  const mouthPath = (() => {
    switch (expression) {
      case 'bullish':
        return 'M 37 62 Q 50 73 63 62';
      case 'bearish':
        return 'M 40 66 Q 50 60 60 66';
      case 'cautious':
        return 'M 42 64 L 58 64';
      case 'neutral':
      default:
        return 'M 39 62 Q 50 68 61 62';
    }
  })();

  const showSweat = expression === 'bearish';
  const showThinking = expression === 'cautious';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* 얼굴 입체감 그라데이션 — 따뜻한 황갈색 */}
        <RadialGradient id="dimonFace" cx="45%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#F5D6A8" />
          <Stop offset="55%" stopColor="#E8C38A" />
          <Stop offset="100%" stopColor="#D4A86A" />
        </RadialGradient>
        {/* 갈기 그라데이션 — 풍성한 황금색 */}
        <RadialGradient id="dimonMane" cx="50%" cy="35%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#FFD54F" />
          <Stop offset="50%" stopColor="#F9A825" />
          <Stop offset="100%" stopColor="#E68A00" />
        </RadialGradient>
        {/* 수트 그라데이션 — 로열 블루 */}
        <LinearGradient id="dimonSuit" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1565C0" />
          <Stop offset="100%" stopColor="#0D47A1" />
        </LinearGradient>
        {/* 코 하이라이트 */}
        <RadialGradient id="dimonNose" cx="40%" cy="35%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#6D4C2A" />
          <Stop offset="100%" stopColor="#4E342E" />
        </RadialGradient>
        {/* 다리 그라데이션 — 따뜻한 황갈색 (털색) */}
        <LinearGradient id="dimonLeg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#E8C38A" />
          <Stop offset="100%" stopColor="#D4A86A" />
        </LinearGradient>
      </Defs>

      {/* ── 바닥 그림자 (발 아래) ── */}
      <Ellipse cx={50} cy={97} rx={22} ry={3} fill="#000000" opacity={0.13} />

      {/* ── 다리 & 발 (주토피아 스타일 짧고 귀여운 다리) ── */}
      <G>
        {/* 왼쪽 다리 */}
        <Rect x={36} y={82} width={9} height={10} rx={4} fill="url(#dimonLeg)" />
        {/* 왼쪽 다리 안쪽 그림자 */}
        <Rect x={36} y={84} width={4} height={6} rx={2} fill="#C49050" opacity={0.15} />
        {/* 왼쪽 발 (둥글고 넓적한 발바닥) */}
        <Ellipse cx={40} cy={93} rx={7} ry={4} fill="#D4A86A" />
        {/* 왼쪽 발 하이라이트 */}
        <Ellipse cx={39} cy={92} rx={4} ry={2} fill="#E8C38A" opacity={0.5} />
        {/* 왼쪽 발가락 라인 */}
        <Path d="M 36 93 Q 37 91 38 93" fill="none" stroke="#C49050" strokeWidth={0.6} opacity={0.4} />
        <Path d="M 39 92 Q 40 90 41 92" fill="none" stroke="#C49050" strokeWidth={0.6} opacity={0.4} />

        {/* 오른쪽 다리 */}
        <Rect x={55} y={82} width={9} height={10} rx={4} fill="url(#dimonLeg)" />
        {/* 오른쪽 다리 안쪽 그림자 */}
        <Rect x={60} y={84} width={4} height={6} rx={2} fill="#C49050" opacity={0.15} />
        {/* 오른쪽 발 (둥글고 넓적한 발바닥) */}
        <Ellipse cx={60} cy={93} rx={7} ry={4} fill="#D4A86A" />
        {/* 오른쪽 발 하이라이트 */}
        <Ellipse cx={61} cy={92} rx={4} ry={2} fill="#E8C38A" opacity={0.5} />
        {/* 오른쪽 발가락 라인 */}
        <Path d="M 59 92 Q 60 90 61 92" fill="none" stroke="#C49050" strokeWidth={0.6} opacity={0.4} />
        <Path d="M 62 93 Q 63 91 64 93" fill="none" stroke="#C49050" strokeWidth={0.6} opacity={0.4} />
      </G>

      {/* ── 머리+몸체 그룹 (위로 6유닛 이동 — SD 비율 유지) ── */}
      <G transform="translate(0, -6)">
        {/* ── 몸체 (블루 수트) ── */}
        <Ellipse cx={50} cy={82} rx={26} ry={16} fill="url(#dimonSuit)" />
        {/* 라펠 */}
        <Path d="M 38 72 L 50 84 L 46 72 Z" fill="#1976D2" />
        <Path d="M 62 72 L 50 84 L 54 72 Z" fill="#1976D2" />
        {/* 넥타이 */}
        <Path d="M 48 72 L 50 86 L 52 72 Z" fill={accentColor} />
        <Rect x={47} y={69} width={6} height={4} rx={1.5} fill={accentColor} />
        {/* 셔츠 V */}
        <Path d="M 47 72 L 50 78 L 53 72" fill="#FFFFFF" opacity={0.15} />

        {/* ── 갈기 (황금 왕관형 — 여러 겹의 원호) ── */}
        {/* 바깥 갈기 — 왕관 실루엣 */}
        <Path
          d="M 12 52 Q 8 30 20 15 Q 30 4 50 2 Q 70 4 80 15 Q 92 30 88 52
             Q 90 58 86 62 Q 82 50 78 44
             Q 84 28 72 14 Q 60 6 50 6 Q 40 6 28 14
             Q 16 28 22 44 Q 18 50 14 62 Q 10 58 12 52 Z"
          fill="url(#dimonMane)"
        />
        {/* 갈기 중간 레이어 — 볼륨감 */}
        <Path
          d="M 18 50 Q 14 32 26 18 Q 38 7 50 6 Q 62 7 74 18 Q 86 32 82 50"
          fill="none" stroke="#FFB300" strokeWidth={4} opacity={0.5}
        />
        {/* 갈기 뾰족한 봉우리 (왕관 효과) */}
        <Path d="M 24 22 L 28 10 L 32 20" fill="#FFD54F" opacity={0.7} />
        <Path d="M 38 12 L 42 2 L 46 11" fill="#FFD54F" opacity={0.7} />
        <Path d="M 54 11 L 58 2 L 62 12" fill="#FFD54F" opacity={0.7} />
        <Path d="M 68 20 L 72 10 L 76 22" fill="#FFD54F" opacity={0.7} />
        {/* 갈기 하이라이트 (광택) */}
        <Path
          d="M 30 18 Q 42 8 55 10 Q 66 12 74 20"
          fill="none" stroke="#FFF176" strokeWidth={1.5} opacity={0.4}
        />

        {/* ── 귀 (갈기 사이로 삐져나온 동그란 귀) ── */}
        <Circle cx={22} cy={32} r={7} fill="#E8C38A" />
        <Circle cx={22} cy={32} r={4} fill="#D4A86A" opacity={0.6} />
        <Circle cx={78} cy={32} r={7} fill="#E8C38A" />
        <Circle cx={78} cy={32} r={4} fill="#D4A86A" opacity={0.6} />

        {/* ── 얼굴 (큰 둥근 원 — 따뜻한 황갈색) ── */}
        <Circle cx={50} cy={44} r={28} fill="url(#dimonFace)" />
        {/* 턱 아래 그림자 */}
        <Ellipse cx={50} cy={67} rx={20} ry={5} fill="#C49050" opacity={0.25} />
        {/* 이마 하이라이트 */}
        <Ellipse cx={46} cy={28} rx={12} ry={7} fill="#FFFFFF" opacity={0.1} />

        {/* ── 눈 ── */}
        {blinkPhase >= 0.5 ? (
          <G>
            <Path d="M 32 44 Q 38 46 44 44" fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 56 44 Q 62 46 68 44" fill="none" stroke="#5D4037" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : expression === 'cautious' ? (
          <G>
            {/* 좁힌 회의적 눈 */}
            <Ellipse cx={38} cy={44} rx={5} ry={3} fill="#FFFFFF" />
            <Circle cx={39} cy={44} r={2.5} fill="#3E2723" />
            <Circle cx={40} cy={43} r={1} fill="#FFFFFF" />
            <Ellipse cx={62} cy={44} rx={5} ry={3} fill="#FFFFFF" />
            <Circle cx={63} cy={44} r={2.5} fill="#3E2723" />
            <Circle cx={64} cy={43} r={1} fill="#FFFFFF" />
          </G>
        ) : (
          <G>
            {/* 왼쪽 눈 */}
            <Circle cx={38} cy={44} r={expression === 'bullish' ? 6 : 5.5} fill="#FFFFFF" />
            <Circle cx={39} cy={43} r={4} fill="#3E2723" />
            <Circle cx={40.5} cy={41.5} r={1.5} fill="#FFFFFF" />
            <Circle cx={38} cy={42} r={0.8} fill="#FFFFFF" opacity={0.6} />
            {/* 오른쪽 눈 */}
            <Circle cx={62} cy={44} r={expression === 'bullish' ? 6 : 5.5} fill="#FFFFFF" />
            <Circle cx={63} cy={43} r={4} fill="#3E2723" />
            <Circle cx={64.5} cy={41.5} r={1.5} fill="#FFFFFF" />
            <Circle cx={62} cy={42} r={0.8} fill="#FFFFFF" opacity={0.6} />
          </G>
        )}

        {/* bullish일 때 눈 반짝임 */}
        {expression === 'bullish' && (
          <G>
            <Path d="M 35 38 L 36 36 L 37 38 L 35 37 L 37 37 Z" fill="#FFD54F" opacity={0.7} />
            <Path d="M 59 38 L 60 36 L 61 38 L 59 37 L 61 37 Z" fill="#FFD54F" opacity={0.7} />
          </G>
        )}

        {/* ── 눈썹 (굵고 위엄있는) ── */}
        {expression === 'bearish' ? (
          <G>
            <Path d="M 29 36 Q 36 32 45 36" fill="none" stroke="#8D6E63" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 55 36 Q 64 32 71 36" fill="none" stroke="#8D6E63" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        ) : expression === 'bullish' ? (
          <G>
            <Path d="M 30 36 Q 36 31 45 34" fill="none" stroke="#8D6E63" strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M 55 34 Q 64 31 70 36" fill="none" stroke="#8D6E63" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M 30 36 Q 36 33 45 35" fill="none" stroke="#8D6E63" strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M 55 35 Q 64 33 70 36" fill="none" stroke="#8D6E63" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        )}

        {/* ── 코 (사자 코 — 큰 역삼각형) ── */}
        <Path d="M 46 52 L 50 56 L 54 52 Z" fill="url(#dimonNose)" />
        <Ellipse cx={49} cy={52} rx={1.5} ry={1} fill="#8D6E63" opacity={0.3} />
        {/* 코 아래 인중선 */}
        <Path d="M 50 56 L 50 59" stroke="#C49050" strokeWidth={1.2} opacity={0.4} />

        {/* ── 볼터치 (은은한 분홍) ── */}
        <Circle cx={27} cy={52} r={6} fill="#FF8A80" opacity={0.15} />
        <Circle cx={73} cy={52} r={6} fill="#FF8A80" opacity={0.15} />

        {/* ── 수염 (사자 특유의 짧은 점 수염) ── */}
        <G opacity={0.3}>
          <Circle cx={34} cy={56} r={0.8} fill="#8D6E63" />
          <Circle cx={30} cy={55} r={0.8} fill="#8D6E63" />
          <Circle cx={32} cy={58} r={0.8} fill="#8D6E63" />
          <Circle cx={66} cy={56} r={0.8} fill="#8D6E63" />
          <Circle cx={70} cy={55} r={0.8} fill="#8D6E63" />
          <Circle cx={68} cy={58} r={0.8} fill="#8D6E63" />
        </G>

        {/* ── 입 (표정별) ── */}
        <Path d={mouthPath} fill="none" stroke="#8D6E63" strokeWidth={2} strokeLinecap="round" />
        {expression === 'bullish' && (
          <Path d="M 42 65 Q 50 69 58 65" fill="#FFFFFF" opacity={0.35} />
        )}

        {/* ── 땀방울 (bearish) ── */}
        {showSweat && (
          <G>
            <Path d="M 82 28 Q 84 22 86 28 Q 86 34 84 34 Q 82 34 82 28 Z" fill="#64B5F6" opacity={0.6} />
            <Ellipse cx={83.5} cy={27} rx={1} ry={0.8} fill="#FFFFFF" opacity={0.4} />
          </G>
        )}

        {/* ── 생각 거품 (cautious) ── */}
        {showThinking && (
          <G>
            <Circle cx={83} cy={22} r={3} fill="#E0E0E0" opacity={0.4} />
            <Circle cx={88} cy={15} r={4} fill="#E0E0E0" opacity={0.3} />
            <Circle cx={92} cy={7} r={5.5} fill="#E0E0E0" opacity={0.25} />
            <Circle cx={91} cy={5} r={2} fill="#FFFFFF" opacity={0.15} />
          </G>
        )}
      </G>
    </Svg>
  );
}
