/**
 * ClothingOverlay — 날씨 기반 의상 오버레이 레이어
 *
 * 역할: 기존 캐릭터 SVG 위에 날씨에 맞는 의상을 덧씌우는 "옷 가게"
 * 비유: "캐릭터 위에 날씨 맞춤 코트를 올려두는 투명한 판"
 *
 * 설계 원칙:
 * - 기존 10개 캐릭터 SVG를 건드리지 않고 추가 레이어만 위에 렌더링
 * - 동일한 viewBox (0 0 100 100) 사용 → 픽셀 완벽 정렬
 * - 동물의숲 스타일: 둥글고 귀엽고 단순한 도형
 * - summer/normal = 추가 렌더링 없음 (캐릭터 기본 의상으로 충분)
 */

import React from 'react';
import Svg, { G, Path, Rect, Ellipse, Circle } from 'react-native-svg';
import type { ClothingLevel } from '../../../types/village';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClothingOverlayProps {
  /** 캐릭터와 동일한 픽셀 크기 (44 / 64 / 88) */
  size: number;
  /** 날씨 서비스가 반환하는 의상 단계 */
  clothingLevel: ClothingLevel;
  /** 구루 ID (향후 캐릭터별 의상 커스터마이징에 사용) */
  guruId: string;
  /** 구루 액센트 컬러 → 스카프/모자 메인 색상으로 활용 */
  accentColor: string;
}

// ---------------------------------------------------------------------------
// Sub-components (각 의상 단계별 SVG)
// 좌표 기준 (0 0 100 100 viewBox):
//   머리 꼭대기: y≈10  |  모자: y≈15~28  |  목 영역: y≈62~72
//   몸통: y≈72~85  |  발: y≈88~97
// ---------------------------------------------------------------------------

/** 가벼운 의상: 목 아래 작은 스카프 한 겹 */
function LightClothing({ accentColor }: { accentColor: string }) {
  // 스카프가 목 둘레를 살짝 감싼 모양 (얇고 가벼운 느낌)
  return (
    <G>
      {/* 스카프 메인 밴드 */}
      <Ellipse
        cx={50}
        cy={67}
        rx={14}
        ry={4}
        fill={accentColor}
        opacity={0.75}
      />
      {/* 스카프 앞 매듭 포인트 */}
      <Ellipse
        cx={50}
        cy={68}
        rx={5}
        ry={3}
        fill={accentColor}
        opacity={0.9}
      />
      {/* 스카프 하이라이트 (입체감) */}
      <Ellipse
        cx={48}
        cy={66}
        rx={6}
        ry={1.5}
        fill="#FFFFFF"
        opacity={0.18}
      />
    </G>
  );
}

/** 따뜻한 의상: 두툼한 스카프 + 작은 귀마개 */
function WarmClothing({ accentColor }: { accentColor: string }) {
  // 스카프 색상 계산: accentColor 기반 + 살짝 어두운 보조색
  return (
    <G>
      {/* 스카프 하단 겹 (두툼함 표현) */}
      <Ellipse
        cx={50}
        cy={70}
        rx={16}
        ry={5}
        fill={accentColor}
        opacity={0.65}
      />
      {/* 스카프 상단 겹 */}
      <Ellipse
        cx={50}
        cy={66}
        rx={15}
        ry={4.5}
        fill={accentColor}
        opacity={0.85}
      />
      {/* 스카프 매듭 (앞 중앙) */}
      <Ellipse
        cx={50}
        cy={68}
        rx={6}
        ry={4.5}
        fill={accentColor}
        opacity={0.95}
      />
      {/* 매듭 주름 라인 */}
      <Path
        d="M 47 66 Q 50 69 53 66"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={0.8}
        opacity={0.25}
      />
      {/* 스카프 하이라이트 */}
      <Ellipse
        cx={47}
        cy={65}
        rx={7}
        ry={2}
        fill="#FFFFFF"
        opacity={0.15}
      />
      {/* 귀마개 왼쪽 (작고 동그란) */}
      <Circle
        cx={22}
        cy={43}
        r={5}
        fill={accentColor}
        opacity={0.7}
      />
      <Circle
        cx={22}
        cy={42}
        r={2.5}
        fill="#FFFFFF"
        opacity={0.15}
      />
      {/* 귀마개 오른쪽 */}
      <Circle
        cx={78}
        cy={43}
        r={5}
        fill={accentColor}
        opacity={0.7}
      />
      <Circle
        cx={78}
        cy={42}
        r={2.5}
        fill="#FFFFFF"
        opacity={0.15}
      />
      {/* 귀마개 연결 밴드 (머리 위로) */}
      <Path
        d="M 22 38 Q 50 28 78 38"
        fill="none"
        stroke={accentColor}
        strokeWidth={2.5}
        opacity={0.6}
        strokeLinecap="round"
      />
    </G>
  );
}

/** 겨울 의상: 두꺼운 스카프 + 비니 모자 + 코트 칼라 */
function WinterClothing({ accentColor }: { accentColor: string }) {
  return (
    <G>
      {/* ── 비니 모자 ── */}
      {/* 모자 메인 본체 (반원형 — 머리 위를 덮음) */}
      <Path
        d="M 24 32 Q 24 10 50 8 Q 76 10 76 32"
        fill={accentColor}
        opacity={0.88}
      />
      {/* 모자 메인 하이라이트 */}
      <Path
        d="M 32 20 Q 42 10 62 14"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        opacity={0.2}
      />
      {/* 모자 챙 (롤업된 부분) */}
      <Rect
        x={24}
        y={28}
        width={52}
        height={7}
        rx={3.5}
        fill={accentColor}
        opacity={0.95}
      />
      {/* 챙 하이라이트 줄 */}
      <Rect
        x={27}
        y={29.5}
        width={46}
        height={2}
        rx={1}
        fill="#FFFFFF"
        opacity={0.15}
      />
      {/* 모자 꼭대기 폼폼 (동그란 방울) */}
      <Circle
        cx={50}
        cy={9}
        r={5.5}
        fill="#FFFFFF"
        opacity={0.9}
      />
      <Circle
        cx={48.5}
        cy={7.5}
        r={2.5}
        fill="#FFFFFF"
        opacity={0.5}
      />

      {/* ── 두꺼운 스카프 ── */}
      {/* 스카프 하단 겹 */}
      <Ellipse
        cx={50}
        cy={72}
        rx={17}
        ry={6}
        fill={accentColor}
        opacity={0.6}
      />
      {/* 스카프 상단 겹 */}
      <Ellipse
        cx={50}
        cy={67}
        rx={16}
        ry={5.5}
        fill={accentColor}
        opacity={0.82}
      />
      {/* 스카프 매듭 */}
      <Ellipse
        cx={50}
        cy={69.5}
        rx={7}
        ry={5}
        fill={accentColor}
        opacity={0.95}
      />
      {/* 스카프 체크 패턴 (가로줄로 단순 표현) */}
      <Path
        d="M 36 67 L 64 67"
        stroke="#FFFFFF"
        strokeWidth={0.8}
        opacity={0.2}
      />
      <Path
        d="M 37 70 L 63 70"
        stroke="#FFFFFF"
        strokeWidth={0.8}
        opacity={0.15}
      />
      {/* 스카프 하이라이트 */}
      <Ellipse
        cx={46}
        cy={65.5}
        rx={8}
        ry={2.5}
        fill="#FFFFFF"
        opacity={0.12}
      />

      {/* ── 코트 칼라 (몸통 상단 좌우로 살짝 삐져나온 두꺼운 칼라) ── */}
      <Path
        d="M 30 72 Q 36 68 42 71"
        fill="none"
        stroke={accentColor}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.7}
      />
      <Path
        d="M 70 72 Q 64 68 58 71"
        fill="none"
        stroke={accentColor}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.7}
      />
    </G>
  );
}

/** 북극 의상: 모자 + 두꺼운 스카프 + 귀마개 + 입김 효과 */
function ArcticClothing({ accentColor }: { accentColor: string }) {
  return (
    <G>
      {/* ── 두꺼운 파카 모자 (fur trim 포함) ── */}
      {/* 모자 본체 */}
      <Path
        d="M 22 34 Q 20 8 50 5 Q 80 8 78 34"
        fill={accentColor}
        opacity={0.9}
      />
      {/* 모자 털 트림 (하단 테두리) */}
      <Path
        d="M 22 32 Q 50 38 78 32"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.75}
      />
      {/* 모자 하이라이트 */}
      <Path
        d="M 30 18 Q 44 8 64 12"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2}
        opacity={0.18}
      />
      {/* 모자 꼭대기 폼폼 (더 큰 방울) */}
      <Circle
        cx={50}
        cy={6}
        r={7}
        fill="#FFFFFF"
        opacity={0.92}
      />
      <Circle
        cx={48}
        cy={4}
        r={3}
        fill="#FFFFFF"
        opacity={0.55}
      />

      {/* ── 귀마개 (큰 사이즈) ── */}
      <Circle
        cx={21}
        cy={42}
        r={7}
        fill={accentColor}
        opacity={0.85}
      />
      {/* 귀마개 안쪽 (흰색 털) */}
      <Circle
        cx={21}
        cy={42}
        r={4.5}
        fill="#FFFFFF"
        opacity={0.5}
      />
      <Circle
        cx={79}
        cy={42}
        r={7}
        fill={accentColor}
        opacity={0.85}
      />
      <Circle
        cx={79}
        cy={42}
        r={4.5}
        fill="#FFFFFF"
        opacity={0.5}
      />
      {/* 귀마개 연결 밴드 */}
      <Path
        d="M 21 35 Q 50 25 79 35"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={3.5}
        opacity={0.65}
        strokeLinecap="round"
      />

      {/* ── 매우 두꺼운 스카프 ── */}
      {/* 스카프 가장 아래 겹 */}
      <Ellipse
        cx={50}
        cy={75}
        rx={18}
        ry={6}
        fill={accentColor}
        opacity={0.55}
      />
      {/* 스카프 중간 겹 */}
      <Ellipse
        cx={50}
        cy={70}
        rx={17}
        ry={5.5}
        fill={accentColor}
        opacity={0.75}
      />
      {/* 스카프 상단 겹 */}
      <Ellipse
        cx={50}
        cy={65}
        rx={16}
        ry={5}
        fill={accentColor}
        opacity={0.9}
      />
      {/* 스카프 매듭 (크고 두꺼움) */}
      <Ellipse
        cx={50}
        cy={70}
        rx={8.5}
        ry={6}
        fill={accentColor}
        opacity={0.98}
      />
      {/* 매듭 텍스처 */}
      <Path
        d="M 45 68 Q 50 71 55 68"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1}
        opacity={0.2}
      />
      <Path
        d="M 44 72 Q 50 75 56 72"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1}
        opacity={0.15}
      />
      {/* 스카프 하이라이트 */}
      <Ellipse
        cx={45}
        cy={63.5}
        rx={9}
        ry={3}
        fill="#FFFFFF"
        opacity={0.1}
      />

      {/* ── 입김 효과 (오른쪽 위로 흘러나오는 흰 구름) ── */}
      <Circle
        cx={68}
        cy={60}
        r={3.5}
        fill="#FFFFFF"
        opacity={0.3}
      />
      <Circle
        cx={73}
        cy={55}
        r={4.5}
        fill="#FFFFFF"
        opacity={0.2}
      />
      <Circle
        cx={79}
        cy={50}
        r={5.5}
        fill="#FFFFFF"
        opacity={0.13}
      />
    </G>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * ClothingOverlay
 *
 * 사용법:
 *   <View style={{ position: 'relative', width: size, height: size }}>
 *     <SomeGuruCharacter size={size} ... />
 *     <ClothingOverlay size={size} clothingLevel={clothingLevel} guruId={guruId} accentColor={accentColor} />
 *   </View>
 *
 * summer / normal → null (렌더링 없음, 기본 캐릭터 의상으로 충분)
 */
export const ClothingOverlay = React.memo(function ClothingOverlay({
  size,
  clothingLevel,
  guruId: _guruId,  // 현재는 사용 안 함 — 향후 캐릭터별 커스터마이징 확장 예정
  accentColor,
}: ClothingOverlayProps) {
  // summer / normal은 추가 오버레이 없음
  if (clothingLevel === 'summer' || clothingLevel === 'normal') {
    return null;
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {clothingLevel === 'light' && (
        <LightClothing accentColor={accentColor} />
      )}
      {clothingLevel === 'warm' && (
        <WarmClothing accentColor={accentColor} />
      )}
      {clothingLevel === 'winter' && (
        <WinterClothing accentColor={accentColor} />
      )}
      {clothingLevel === 'arctic' && (
        <ArcticClothing accentColor={accentColor} />
      )}
    </Svg>
  );
});
