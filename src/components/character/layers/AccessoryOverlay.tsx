/**
 * AccessoryOverlay — 캐릭터 액세서리 오버레이 레이어
 *
 * 역할: 구루 캐릭터 위에 특별 소품을 올려주는 "액세서리 가게"
 * 비유: "게임 캐릭터가 아이템을 장착하면 위에 띄워주는 표시판"
 *
 * 지원 액세서리:
 * - 머리 위: crown, party_hat, santa_hat, headband, sleep_cap, chef_hat
 * - 몸통 뱃지: star_badge, heart_badge
 * - 손/옆: book, fishing_rod, paintbrush, telescope, surfboard, camera
 *
 * 설계:
 * - 동일한 viewBox (0 0 100 100) 사용 → 캐릭터와 픽셀 정렬
 * - 동물의숲 스타일: 단순하고 둥글고 귀여운 도형
 * - 최대 2개 동시 렌더링
 */

import React from 'react';
import Svg, { G, Path, Circle, Rect, Ellipse, Text as SvgText } from 'react-native-svg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccessoryType =
  | 'crown'        // 왕관 — soulmate 우정 티어 전용
  | 'party_hat'    // 파티 고깔 — 이벤트/축하
  | 'santa_hat'    // 산타 모자 — 크리스마스 이벤트
  | 'headband'     // 머리띠 — 운동 활동
  | 'sleep_cap'    // 잠옷 나이트캡 — 낮잠 활동
  | 'chef_hat'     // 요리사 모자 — 요리 활동
  | 'star_badge'   // 별 뱃지 — 업적
  | 'heart_badge'  // 하트 뱃지 — 우정
  | 'book'         // 책 — 독서 활동
  | 'fishing_rod'  // 낚싯대 — 낚시 활동
  | 'paintbrush'   // 붓 — 그림 그리기 활동
  | 'telescope'    // 망원경 — 별 보기 활동
  | 'surfboard'    // 서핑보드 — 서핑 활동
  | 'camera';      // 카메라 — 사진 찍기 활동

interface AccessoryOverlayProps {
  /** 캐릭터와 동일한 픽셀 크기 */
  size: number;
  /** 활성화된 액세서리 목록 (최대 2개 렌더링) */
  accessories: AccessoryType[];
  /** 구루 액센트 컬러 */
  accentColor: string;
}

// ---------------------------------------------------------------------------
// 개별 액세서리 렌더러
// 좌표 기준: 머리 y≈12~30 | 몸통 y≈68~80 | 손(왼) x≈12~22 | 손(오른) x≈78~88
// ---------------------------------------------------------------------------

/** 왕관 👑 — 머리 위 황금 왕관 */
function Crown() {
  return (
    <G>
      {/* 왕관 베이스 밴드 */}
      <Rect x={33} y={22} width={34} height={6} rx={3} fill="#FFD700" />
      {/* 왕관 뾰족 3개 */}
      <Path d="M 36 22 L 39 12 L 42 22 Z" fill="#FFD700" />
      <Path d="M 46 22 L 50 9 L 54 22 Z" fill="#FFD700" />
      <Path d="M 58 22 L 61 12 L 64 22 Z" fill="#FFD700" />
      {/* 왕관 보석 (가운데) */}
      <Circle cx={50} cy={19} r={3} fill="#E91E63" />
      <Circle cx={50} cy={18} r={1.5} fill="#FFFFFF" opacity={0.4} />
      {/* 왕관 보석 (좌우) */}
      <Circle cx={39} cy={21} r={2} fill="#2196F3" />
      <Circle cx={61} cy={21} r={2} fill="#4CAF50" />
      {/* 왕관 하이라이트 */}
      <Path
        d="M 36 23 L 64 23"
        stroke="#FFFFFF"
        strokeWidth={1.2}
        opacity={0.3}
      />
    </G>
  );
}

/** 파티 고깔 🎉 — 밝은 색상 고깔 + 끈 */
function PartyHat({ accentColor }: { accentColor: string }) {
  return (
    <G>
      {/* 고깔 본체 (삼각형) */}
      <Path
        d="M 38 30 L 50 6 L 62 30 Z"
        fill={accentColor}
        opacity={0.9}
      />
      {/* 줄무늬 (흰색 대각선) */}
      <Path d="M 43 27 L 50 9" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.4} />
      <Path d="M 48 29 L 55 12" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.3} />
      {/* 고깔 꼭대기 방울 */}
      <Circle cx={50} cy={6} r={3.5} fill="#FFFFFF" opacity={0.9} />
      {/* 고깔 챙 (아래 밴드) */}
      <Path
        d="M 38 30 Q 50 34 62 30"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        opacity={0.8}
      />
      {/* 턱 끈 (좌우로 내려감) */}
      <Path
        d="M 40 30 Q 35 40 32 48"
        fill="none"
        stroke="#FFD700"
        strokeWidth={1}
        opacity={0.6}
      />
      <Path
        d="M 60 30 Q 65 40 68 48"
        fill="none"
        stroke="#FFD700"
        strokeWidth={1}
        opacity={0.6}
      />
    </G>
  );
}

/** 산타 모자 🎅 — 빨간 산타 모자 */
function SantaHat() {
  return (
    <G>
      {/* 산타 모자 본체 */}
      <Path
        d="M 30 30 Q 38 28 50 8 Q 58 14 62 28 Q 48 34 30 30 Z"
        fill="#D32F2F"
      />
      {/* 모자 하이라이트 */}
      <Path
        d="M 40 24 Q 46 14 52 12"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.8}
        opacity={0.2}
      />
      {/* 흰 털 트림 (아래 밴드) */}
      <Path
        d="M 30 30 Q 46 36 64 30"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={7}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* 모자 꼭대기 폼폼 */}
      <Circle cx={50} cy={8} r={5} fill="#FFFFFF" opacity={0.95} />
      <Circle cx={49} cy={6.5} r={2.5} fill="#FFFFFF" opacity={0.5} />
    </G>
  );
}

/** 머리띠 💪 — 운동용 스포츠 머리띠 */
function Headband({ accentColor }: { accentColor: string }) {
  return (
    <G>
      {/* 머리띠 메인 밴드 */}
      <Path
        d="M 26 28 Q 50 22 74 28"
        fill="none"
        stroke={accentColor}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* 머리띠 하이라이트 */}
      <Path
        d="M 28 26 Q 50 20 72 26"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        opacity={0.2}
      />
      {/* 땀 방울 (운동 중 표시) */}
      <Path
        d="M 78 35 Q 80 30 82 35 Q 82 39 80 39 Q 78 39 78 35 Z"
        fill="#64B5F6"
        opacity={0.7}
      />
    </G>
  );
}

/** 나이트캡 💤 — 잠옷 모자 (뾰족한 줄무늬) */
function SleepCap() {
  return (
    <G>
      {/* 모자 본체 (옆으로 살짝 기울어짐) */}
      <Path
        d="M 28 32 Q 30 20 50 10 Q 60 16 58 32 Q 43 36 28 32 Z"
        fill="#7E57C2"
        opacity={0.88}
      />
      {/* 가로 줄무늬 */}
      <Path d="M 30 30 Q 44 33 57 30" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.3} />
      <Path d="M 32 26 Q 44 28 56 26" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.25} />
      {/* 모자 챙 */}
      <Path
        d="M 28 32 Q 43 38 60 32"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.75}
      />
      {/* 꼭대기 방울 (옆으로 살짝 넘어짐) */}
      <Circle cx={52} cy={10} r={4} fill="#FFFFFF" opacity={0.9} />
      {/* Zzz 텍스트 */}
      <SvgText
        x={72}
        y={26}
        fontSize={8}
        fill="#B39DDB"
        opacity={0.7}
        fontWeight="bold"
      >
        z
      </SvgText>
      <SvgText
        x={78}
        y={20}
        fontSize={10}
        fill="#B39DDB"
        opacity={0.5}
        fontWeight="bold"
      >
        z
      </SvgText>
    </G>
  );
}

/** 요리사 모자 👨‍🍳 — 흰 쉐프 토크 블랑슈 */
function ChefHat() {
  return (
    <G>
      {/* 모자 부풀어 오른 윗부분 (풍선 모양) */}
      <Ellipse
        cx={50}
        cy={18}
        rx={18}
        ry={14}
        fill="#FFFFFF"
        opacity={0.95}
      />
      {/* 모자 하이라이트 (입체감) */}
      <Ellipse
        cx={45}
        cy={13}
        rx={10}
        ry={7}
        fill="#FFFFFF"
        opacity={0.4}
      />
      {/* 모자 밴드 (아래 띠) */}
      <Rect
        x={32}
        y={28}
        width={36}
        height={6}
        rx={3}
        fill="#E0E0E0"
        opacity={0.9}
      />
      {/* 밴드 줄 */}
      <Path
        d="M 34 31 L 66 31"
        stroke="#BDBDBD"
        strokeWidth={0.8}
        opacity={0.5}
      />
    </G>
  );
}

/** 별 뱃지 ⭐ — 몸통에 달린 별 모양 배지 */
function StarBadge({ accentColor }: { accentColor: string }) {
  return (
    <G>
      {/* 배지 원형 배경 */}
      <Circle cx={68} cy={74} r={8} fill={accentColor} opacity={0.9} />
      <Circle cx={68} cy={74} r={6.5} fill="#FFFFFF" opacity={0.2} />
      {/* 별 모양 */}
      <Path
        d="M 68 68 L 69.5 72 L 74 72 L 70.5 74.5 L 72 79 L 68 76.5 L 64 79 L 65.5 74.5 L 62 72 L 66.5 72 Z"
        fill="#FFD700"
        opacity={0.95}
      />
      {/* 별 하이라이트 */}
      <Circle cx={67} cy={71} r={1.5} fill="#FFFFFF" opacity={0.4} />
    </G>
  );
}

/** 하트 뱃지 💖 — 몸통에 달린 하트 배지 */
function HeartBadge() {
  return (
    <G>
      {/* 배지 원형 배경 */}
      <Circle cx={68} cy={74} r={8} fill="#E91E63" opacity={0.85} />
      {/* 하트 모양 */}
      <Path
        d="M 68 79 Q 60 74 60 70 Q 60 66 64 66 Q 66 66 68 68 Q 70 66 72 66 Q 76 66 76 70 Q 76 74 68 79 Z"
        fill="#FFFFFF"
        opacity={0.9}
      />
      {/* 하트 하이라이트 */}
      <Circle cx={65.5} cy={68.5} r={1.5} fill="#FFFFFF" opacity={0.5} />
    </G>
  );
}

/** 책 📖 — 왼손에 들고 있는 책 */
function Book({ accentColor }: { accentColor: string }) {
  return (
    <G>
      {/* 책 본체 */}
      <Rect
        x={8}
        y={58}
        width={18}
        height={24}
        rx={2}
        fill={accentColor}
        opacity={0.88}
      />
      {/* 책 등 (spine) */}
      <Rect
        x={8}
        y={58}
        width={4}
        height={24}
        rx={2}
        fill="#00000030"
      />
      {/* 책 페이지 선 */}
      <Path d="M 14 63 L 24 63" stroke="#FFFFFF" strokeWidth={0.8} opacity={0.4} />
      <Path d="M 14 67 L 24 67" stroke="#FFFFFF" strokeWidth={0.8} opacity={0.4} />
      <Path d="M 14 71 L 24 71" stroke="#FFFFFF" strokeWidth={0.8} opacity={0.4} />
      <Path d="M 14 75 L 24 75" stroke="#FFFFFF" strokeWidth={0.8} opacity={0.4} />
      {/* 책 하이라이트 */}
      <Rect x={13} y={60} width={10} height={3} rx={1} fill="#FFFFFF" opacity={0.15} />
    </G>
  );
}

/** 낚싯대 🎣 — 오른손 뒤쪽으로 뻗은 낚싯대 */
function FishingRod() {
  return (
    <G>
      {/* 낚싯대 본체 (가는 막대) */}
      <Path
        d="M 74 82 Q 80 60 88 20"
        fill="none"
        stroke="#8D6E63"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* 낚싯줄 */}
      <Path
        d="M 88 20 Q 92 35 90 50 Q 89 58 86 64"
        fill="none"
        stroke="#B0BEC5"
        strokeWidth={0.8}
        opacity={0.7}
      />
      {/* 찌 (낚시 부표) */}
      <Ellipse
        cx={86.5}
        cy={65}
        rx={3}
        ry={4}
        fill="#F44336"
        opacity={0.85}
      />
      <Ellipse
        cx={86.5}
        cy={63}
        rx={3}
        ry={2}
        fill="#FFFFFF"
        opacity={0.85}
      />
      {/* 릴 (손잡이 쪽 동그란 부분) */}
      <Circle cx={76} cy={78} r={4} fill="#78909C" opacity={0.8} />
      <Circle cx={76} cy={78} r={2} fill="#90A4AE" opacity={0.6} />
    </G>
  );
}

/** 붓 🖌️ — 오른손에 든 페인트 붓 */
function Paintbrush({ accentColor }: { accentColor: string }) {
  return (
    <G>
      {/* 붓 손잡이 */}
      <Path
        d="M 72 82 L 84 56"
        fill="none"
        stroke="#8D6E63"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* 붓 금속 페룰 (연결부) */}
      <Path
        d="M 81 61 L 85 53"
        fill="none"
        stroke="#9E9E9E"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.8}
      />
      {/* 붓 끝 (털 부분) */}
      <Path
        d="M 83 54 Q 87 46 88 42 Q 86 44 85 48 Q 89 42 90 38 Q 88 40 87 45"
        fill="none"
        stroke={accentColor}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* 물감 방울 */}
      <Circle cx={88} cy={48} r={3} fill={accentColor} opacity={0.6} />
      <Circle cx={84} cy={54} r={2} fill={accentColor} opacity={0.4} />
    </G>
  );
}

/** 망원경 🔭 — 왼손에 들고 있는 망원경 */
function Telescope() {
  return (
    <G>
      {/* 망원경 본체 (기울어진 실린더) */}
      <Path
        d="M 12 72 L 28 56"
        fill="none"
        stroke="#546E7A"
        strokeWidth={7}
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* 망원경 렌즈 끝 (큰 원) */}
      <Circle cx={13} cy={71} r={5.5} fill="#78909C" opacity={0.9} />
      <Circle cx={13} cy={71} r={3.5} fill="#B2EBF2" opacity={0.6} />
      <Circle cx={12} cy={70} r={1.5} fill="#FFFFFF" opacity={0.4} />
      {/* 망원경 몸체 세그먼트 (확대경 단계) */}
      <Path
        d="M 17 68 L 25 60"
        fill="none"
        stroke="#607D8B"
        strokeWidth={5}
        strokeLinecap="round"
        opacity={0.8}
      />
      {/* 망원경 반사 */}
      <Path
        d="M 14 68 L 24 58"
        stroke="#FFFFFF"
        strokeWidth={1}
        opacity={0.2}
      />
    </G>
  );
}

/** 서핑보드 🏄 — 캐릭터 옆에 세워진 서핑보드 */
function Surfboard({ accentColor }: { accentColor: string }) {
  return (
    <G>
      {/* 서핑보드 본체 (세로로 긴 타원) */}
      <Ellipse
        cx={15}
        cy={58}
        rx={7}
        ry={28}
        fill={accentColor}
        opacity={0.85}
      />
      {/* 서핑보드 세로 줄무늬 */}
      <Path
        d="M 15 32 L 15 86"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        opacity={0.25}
      />
      {/* 서핑보드 가로 디자인 */}
      <Path
        d="M 9 50 Q 15 48 21 50"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.2}
        opacity={0.3}
      />
      <Path
        d="M 9 62 Q 15 60 21 62"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.2}
        opacity={0.3}
      />
      {/* 서핑보드 하이라이트 */}
      <Ellipse
        cx={13}
        cy={45}
        rx={3}
        ry={8}
        fill="#FFFFFF"
        opacity={0.15}
      />
    </G>
  );
}

/** 카메라 📸 — 오른손에 든 카메라 */
function Camera() {
  return (
    <G>
      {/* 카메라 본체 */}
      <Rect
        x={62}
        y={60}
        width={26}
        height={20}
        rx={4}
        fill="#37474F"
        opacity={0.9}
      />
      {/* 카메라 상단 돌출부 (펜타프리즘) */}
      <Rect
        x={68}
        y={55}
        width={12}
        height={6}
        rx={2}
        fill="#455A64"
        opacity={0.9}
      />
      {/* 렌즈 링 */}
      <Circle cx={75} cy={70} r={7} fill="#263238" opacity={0.95} />
      <Circle cx={75} cy={70} r={5} fill="#37474F" opacity={0.9} />
      <Circle cx={75} cy={70} r={3.5} fill="#1A237E" opacity={0.7} />
      {/* 렌즈 반사 */}
      <Circle cx={73.5} cy={68.5} r={1.5} fill="#FFFFFF" opacity={0.35} />
      {/* 셔터 버튼 */}
      <Circle cx={84} cy={57} r={2} fill="#FF5722" opacity={0.85} />
      {/* 카메라 하이라이트 */}
      <Rect x={64} y={62} width={14} height={3} rx={1.5} fill="#FFFFFF" opacity={0.1} />
    </G>
  );
}

// ---------------------------------------------------------------------------
// AccessoryItem — 단일 액세서리 라우터
// ---------------------------------------------------------------------------

function AccessoryItem({
  type,
  accentColor,
}: {
  type: AccessoryType;
  accentColor: string;
}) {
  switch (type) {
    case 'crown':       return <Crown />;
    case 'party_hat':   return <PartyHat accentColor={accentColor} />;
    case 'santa_hat':   return <SantaHat />;
    case 'headband':    return <Headband accentColor={accentColor} />;
    case 'sleep_cap':   return <SleepCap />;
    case 'chef_hat':    return <ChefHat />;
    case 'star_badge':  return <StarBadge accentColor={accentColor} />;
    case 'heart_badge': return <HeartBadge />;
    case 'book':        return <Book accentColor={accentColor} />;
    case 'fishing_rod': return <FishingRod />;
    case 'paintbrush':  return <Paintbrush accentColor={accentColor} />;
    case 'telescope':   return <Telescope />;
    case 'surfboard':   return <Surfboard accentColor={accentColor} />;
    case 'camera':      return <Camera />;
    default:            return null;
  }
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * AccessoryOverlay
 *
 * 사용법:
 *   <View style={{ position: 'relative', width: size, height: size }}>
 *     <SomeGuruCharacter size={size} ... />
 *     <AccessoryOverlay size={size} accessories={['crown', 'book']} accentColor={accentColor} />
 *   </View>
 *
 * 최대 2개 액세서리 동시 렌더링 (3개 이상은 첫 2개만)
 */
export const AccessoryOverlay = React.memo(({
  size,
  accessories,
  accentColor,
}: AccessoryOverlayProps) => {
  if (!accessories || accessories.length === 0) return null;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {accessories.slice(0, 2).map((acc) => (
        <AccessoryItem key={acc} type={acc} accentColor={accentColor} />
      ))}
    </Svg>
  );
});
