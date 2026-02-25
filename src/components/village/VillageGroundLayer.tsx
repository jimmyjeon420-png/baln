/**
 * VillageGroundLayer — 동물의숲 스타일 마을 지면 레이어
 *
 * 역할: "마을 바닥" — 잔디, 흙길, 꽃밭, 디딤돌, 연못을 SVG로 렌더링
 * - 화면 하단 ~45%를 차지하는 순수 SVG 컴포넌트 (애니메이션 없음)
 * - 시간대별 색상 변화 (새벽/아침/오후/저녁/밤)
 * - 번영도에 따라 꽃 개수/색상 증가
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Circle,
  Ellipse,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
  Pattern,
} from 'react-native-svg';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

interface VillageGroundLayerProps {
  width: number;
  height: number;
  timeOfDay: TimeOfDay;
  prosperityLevel?: number;
}

// ─────────────────────────────────────────────
// 시간대별 색상 팔레트
// ─────────────────────────────────────────────

const GRASS_COLORS: Record<TimeOfDay, { base: string; mid: string; dark: string; patch: string }> = {
  dawn:      { base: '#8DB659', mid: '#7DA34A', dark: '#5E8232', patch: '#6B9140' },
  morning:   { base: '#6BBF59', mid: '#5CAE4A', dark: '#3D8C30', patch: '#52A040' },
  afternoon: { base: '#5DAE4B', mid: '#4E9E3C', dark: '#337A28', patch: '#479235' },
  evening:   { base: '#9E9840', mid: '#8A8430', dark: '#5E591A', patch: '#7A7628' },
  night:     { base: '#2D4A23', mid: '#1E3518', dark: '#0E1F0A', patch: '#243C1C' },
};

const PATH_COLORS: Record<TimeOfDay, { fill: string; edge: string; shadow: string }> = {
  dawn:      { fill: '#C8A96E', edge: '#A8844A', shadow: '#8A6A30' },
  morning:   { fill: '#D4B87A', edge: '#B09556', shadow: '#8A7040' },
  afternoon: { fill: '#DCC080', edge: '#B8985C', shadow: '#907848' },
  evening:   { fill: '#C0A060', edge: '#9A7C3C', shadow: '#7A5C20' },
  night:     { fill: '#8A7050', edge: '#6A5035', shadow: '#4A3020' },
};

const WATER_COLORS: Record<TimeOfDay, { fill: string; reflect: string; lily: string }> = {
  dawn:      { fill: '#7BBCE8', reflect: '#B0D8F5', lily: '#3A8C30' },
  morning:   { fill: '#5AADE0', reflect: '#9AD0F0', lily: '#2E8026' },
  afternoon: { fill: '#3AA0D8', reflect: '#80C8EE', lily: '#288020' },
  evening:   { fill: '#6898B8', reflect: '#A8C8E0', lily: '#3A7830' },
  night:     { fill: '#1A3858', reflect: '#305878', lily: '#1E4A18' },
};

// ─────────────────────────────────────────────
// 고정 좌표 데이터 (Math.random 사용 금지 — 리렌더링 시 위치 변동 방지)
// ─────────────────────────────────────────────

/** 꽃 클러스터 기본 6개 (번영도 낮을 때) */
const BASE_FLOWER_CLUSTERS = [
  { cx: 0.08, cy: 0.25, color: '#F472B6', count: 3 },
  { cx: 0.18, cy: 0.60, color: '#FBBF24', count: 2 },
  { cx: 0.72, cy: 0.30, color: '#F9A8D4', count: 3 },
  { cx: 0.85, cy: 0.55, color: '#93C5FD', count: 2 },
  { cx: 0.35, cy: 0.82, color: '#FCD34D', count: 3 },
  { cx: 0.62, cy: 0.75, color: '#FFFFFF', count: 2 },
];

/** 번영도 5+ 시 추가 꽃 클러스터 */
const EXTRA_FLOWER_CLUSTERS = [
  { cx: 0.12, cy: 0.45, color: '#F87171', count: 3 },
  { cx: 0.90, cy: 0.20, color: '#86EFAC', count: 2 },
];

/** 번영도 8+ 시 고급 꽃 클러스터 */
const LUXURY_FLOWER_CLUSTERS = [
  { cx: 0.05, cy: 0.72, color: '#C084FC', count: 4 },
  { cx: 0.78, cy: 0.88, color: '#F9A8D4', count: 4 },
];

/** 꽃 오프셋 (클러스터 내 개별 꽃 위치) */
const PETAL_OFFSETS = [
  [0, 0],
  [6, -5],
  [-6, -4],
  [0, -9],
];

/** 디딤돌 위치 (경로를 따라 Y자 분기) */
const STEPPING_STONES = [
  { cx: 0.50, cy: 0.88, rx: 7, ry: 5 },
  { cx: 0.47, cy: 0.72, rx: 6, ry: 4 },
  { cx: 0.44, cy: 0.58, rx: 6, ry: 4 },
  { cx: 0.36, cy: 0.46, rx: 5, ry: 4 },
  { cx: 0.58, cy: 0.44, rx: 6, ry: 4 },
];

/** 잔디 꽃대 (엣지 장식) */
const GRASS_TUFTS = [
  { x: 0.02, y: 0.30, h: 14, spread: 6 },
  { x: 0.06, y: 0.42, h: 12, spread: 5 },
  { x: 0.92, y: 0.28, h: 14, spread: 6 },
  { x: 0.96, y: 0.50, h: 11, spread: 5 },
  { x: 0.14, y: 0.78, h: 10, spread: 5 },
  { x: 0.78, y: 0.82, h: 12, spread: 5 },
  { x: 0.01, y: 0.65, h: 13, spread: 6 },
  { x: 0.98, y: 0.70, h: 11, spread: 4 },
];

/** 잔디 패치 (바닥 텍스처) */
const GRASS_PATCHES = [
  { cx: 0.15, cy: 0.35, rx: 18, ry: 8 },
  { cx: 0.40, cy: 0.22, rx: 22, ry: 9 },
  { cx: 0.68, cy: 0.40, rx: 20, ry: 8 },
  { cx: 0.82, cy: 0.65, rx: 15, ry: 7 },
  { cx: 0.28, cy: 0.70, rx: 18, ry: 7 },
  { cx: 0.55, cy: 0.90, rx: 14, ry: 6 },
];

// ─────────────────────────────────────────────
// 하위 컴포넌트: 꽃 클러스터
// ─────────────────────────────────────────────

interface FlowerClusterProps {
  cx: number;
  cy: number;
  color: string;
  count: number;
  w: number;
  h: number;
  isLuxury?: boolean;
}

const FlowerCluster: React.FC<FlowerClusterProps> = ({ cx, cy, color, count, w, h, isLuxury }) => {
  const px = cx * w;
  const py = cy * h;
  const petalR = isLuxury ? 4 : 3;
  const centerR = isLuxury ? 2 : 1.5;
  const offsets = PETAL_OFFSETS.slice(0, count);

  return (
    <G>
      {offsets.map(([dx, dy], i) => (
        <G key={i} x={px + dx} y={py + dy}>
          {/* 꽃잎 */}
          <Circle cx={0} cy={-petalR} r={petalR} fill={color} opacity={0.9} />
          <Circle cx={petalR} cy={0} r={petalR} fill={color} opacity={0.9} />
          <Circle cx={-petalR} cy={0} r={petalR} fill={color} opacity={0.9} />
          <Circle cx={0} cy={petalR} r={petalR} fill={color} opacity={0.9} />
          {/* 꽃 중심 */}
          <Circle cx={0} cy={0} r={centerR} fill={isLuxury ? '#FDE68A' : '#FEF9C3'} />
        </G>
      ))}
    </G>
  );
};

// ─────────────────────────────────────────────
// 하위 컴포넌트: 디딤돌
// ─────────────────────────────────────────────

interface SteppingStoneProps {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  w: number;
  h: number;
}

const SteppingStone: React.FC<SteppingStoneProps> = ({ cx, cy, rx, ry, w, h }) => {
  const px = cx * w;
  const py = cy * h;
  return (
    <G>
      {/* 그림자 */}
      <Ellipse cx={px + 2} cy={py + 3} rx={rx} ry={ry * 0.6} fill="#00000022" />
      {/* 돌 본체 */}
      <Ellipse cx={px} cy={py} rx={rx} ry={ry} fill="#B0B0B0" />
      {/* 하이라이트 */}
      <Ellipse cx={px - 1} cy={py - 1} rx={rx * 0.55} ry={ry * 0.45} fill="#D8D8D8" opacity={0.6} />
    </G>
  );
};

// ─────────────────────────────────────────────
// 하위 컴포넌트: 잔디 꽃대
// ─────────────────────────────────────────────

interface GrassTuftProps {
  x: number;
  y: number;
  h: number;
  spread: number;
  w: number;
  totalH: number;
  color: string;
}

const GrassTuft: React.FC<GrassTuftProps> = ({ x, y, h, spread, w, totalH, color }) => {
  const px = x * w;
  const py = y * totalH;
  return (
    <G>
      <Path
        d={`M ${px} ${py} L ${px - spread / 2} ${py - h} L ${px} ${py - h * 0.6} Z`}
        fill={color}
        opacity={0.85}
      />
      <Path
        d={`M ${px} ${py} L ${px + spread / 2} ${py - h} L ${px} ${py - h * 0.6} Z`}
        fill={color}
        opacity={0.85}
      />
      <Path
        d={`M ${px} ${py} L ${px} ${py - h * 1.1} L ${px} ${py - h * 0.7} Z`}
        fill={color}
        opacity={0.9}
      />
    </G>
  );
};

// ─────────────────────────────────────────────
// 하위 컴포넌트: 연못 (우하단)
// ─────────────────────────────────────────────

interface PondProps {
  w: number;
  h: number;
  colors: { fill: string; reflect: string; lily: string };
}

const Pond: React.FC<PondProps> = ({ w, h, colors }) => {
  const px = w * 0.80;
  const py = h * 0.72;
  const rx = w * 0.10;
  const ry = h * 0.10;

  return (
    <G>
      {/* 연못 그림자 */}
      <Ellipse cx={px + 3} cy={py + 4} rx={rx + 2} ry={ry + 1} fill="#00000020" />
      {/* 연못 수면 */}
      <Ellipse cx={px} cy={py} rx={rx} ry={ry} fill={colors.fill} />
      {/* 수면 반사광 */}
      <Ellipse cx={px - rx * 0.2} cy={py - ry * 0.2} rx={rx * 0.5} ry={ry * 0.35} fill={colors.reflect} opacity={0.45} />
      <Ellipse cx={px + rx * 0.25} cy={py + ry * 0.15} rx={rx * 0.25} ry={ry * 0.15} fill={colors.reflect} opacity={0.3} />
      {/* 연잎 1 */}
      <G>
        <Circle cx={px - rx * 0.3} cy={py + ry * 0.15} r={rx * 0.22} fill={colors.lily} opacity={0.9} />
        <Circle cx={px - rx * 0.3} cy={py + ry * 0.15} r={rx * 0.08} fill="#FBBF24" />
      </G>
      {/* 연잎 2 */}
      <G>
        <Circle cx={px + rx * 0.35} cy={py - ry * 0.1} r={rx * 0.18} fill={colors.lily} opacity={0.85} />
        <Circle cx={px + rx * 0.35} cy={py - ry * 0.1} r={rx * 0.07} fill="#FDE68A" />
      </G>
      {/* 잔물결 */}
      <Ellipse cx={px} cy={py + ry * 0.3} rx={rx * 0.6} ry={ry * 0.15} fill="none" stroke={colors.reflect} strokeWidth={1} opacity={0.3} />
    </G>
  );
};

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────

export const VillageGroundLayer: React.FC<VillageGroundLayerProps> = ({
  width,
  height,
  timeOfDay,
  prosperityLevel = 0,
}) => {
  const grass = GRASS_COLORS[timeOfDay];
  const path = PATH_COLORS[timeOfDay];
  const water = WATER_COLORS[timeOfDay];

  // 번영도에 따른 꽃 목록 조합
  const flowerClusters = [
    ...BASE_FLOWER_CLUSTERS,
    ...(prosperityLevel >= 5 ? EXTRA_FLOWER_CLUSTERS : []),
    ...(prosperityLevel >= 8 ? LUXURY_FLOWER_CLUSTERS : []),
  ];
  const isLuxury = prosperityLevel >= 8;

  // Y자 경로 좌표 계산
  const pathCenterX = width * 0.50;
  const pathBottomY = height;
  const pathForkY = height * 0.42;      // Y자 분기점
  const pathLeftEndX = width * 0.20;
  const pathRightEndX = width * 0.78;
  const pathTopY = height * 0.02;       // 경로 상단 (화면 밖으로 이어짐)

  // 경로 너비
  const pw = width * 0.085;

  // 경로 SVG Path 데이터 (Y자 형태)
  // 하단 줄기
  const trunkPath = `
    M ${pathCenterX - pw} ${pathBottomY}
    Q ${pathCenterX - pw * 0.8} ${pathForkY + height * 0.1} ${pathCenterX - pw * 0.5} ${pathForkY}
    L ${pathCenterX + pw * 0.5} ${pathForkY}
    Q ${pathCenterX + pw * 0.8} ${pathForkY + height * 0.1} ${pathCenterX + pw} ${pathBottomY}
    Z
  `;
  // 왼쪽 가지
  const leftBranchPath = `
    M ${pathCenterX - pw * 0.5} ${pathForkY}
    Q ${pathCenterX - pw * 0.8} ${pathForkY - height * 0.08} ${pathLeftEndX - pw * 0.6} ${pathTopY}
    L ${pathLeftEndX + pw * 0.6} ${pathTopY}
    Q ${pathCenterX + pw * 0.4} ${pathForkY - height * 0.07} ${pathCenterX + pw * 0.5} ${pathForkY}
    Z
  `;
  // 오른쪽 가지
  const rightBranchPath = `
    M ${pathCenterX - pw * 0.5} ${pathForkY}
    Q ${pathCenterX + pw * 0.2} ${pathForkY - height * 0.08} ${pathRightEndX - pw * 0.6} ${pathTopY}
    L ${pathRightEndX + pw * 0.6} ${pathTopY}
    Q ${pathCenterX + pw * 1.5} ${pathForkY - height * 0.07} ${pathCenterX + pw * 0.5} ${pathForkY}
    Z
  `;

  // 경로 엣지 (약간 더 어두운 테두리 효과용)
  const trunkEdgePath = `
    M ${pathCenterX - pw * 1.08} ${pathBottomY}
    Q ${pathCenterX - pw * 0.88} ${pathForkY + height * 0.1} ${pathCenterX - pw * 0.56} ${pathForkY + 2}
    L ${pathCenterX + pw * 0.56} ${pathForkY + 2}
    Q ${pathCenterX + pw * 0.88} ${pathForkY + height * 0.1} ${pathCenterX + pw * 1.08} ${pathBottomY}
    Z
  `;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          {/* 잔디 베이스 그라디언트 (위→아래) */}
          <LinearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={grass.mid} stopOpacity="1" />
            <Stop offset="1" stopColor={grass.base} stopOpacity="1" />
          </LinearGradient>
          {/* 경로 그라디언트 */}
          <LinearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={path.fill} stopOpacity="0.9" />
            <Stop offset="1" stopColor={path.fill} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* ── 레이어 1: 잔디 베이스 ── */}
        <Rect x={0} y={0} width={width} height={height} fill="url(#grassGrad)" />

        {/* ── 레이어 2: 잔디 패치 (텍스처) ── */}
        {GRASS_PATCHES.map((patch, i) => (
          <Ellipse
            key={`gp-${i}`}
            cx={patch.cx * width}
            cy={patch.cy * height}
            rx={patch.rx}
            ry={patch.ry}
            fill={grass.patch}
            opacity={0.35}
          />
        ))}

        {/* ── 레이어 3: 어두운 패치 (깊이감) ── */}
        <Ellipse cx={width * 0.22} cy={height * 0.55} rx={30} ry={12} fill={grass.dark} opacity={0.18} />
        <Ellipse cx={width * 0.75} cy={height * 0.30} rx={25} ry={10} fill={grass.dark} opacity={0.15} />
        <Ellipse cx={width * 0.48} cy={height * 0.60} rx={20} ry={8} fill={grass.dark} opacity={0.12} />

        {/* ── 레이어 4: 흙길 (Y자 경로) ── */}
        {/* 경로 엣지 그림자 */}
        <Path d={trunkEdgePath} fill={path.shadow} opacity={0.35} />
        {/* 경로 본체 */}
        <Path d={trunkPath} fill="url(#pathGrad)" />
        <Path d={leftBranchPath} fill="url(#pathGrad)" />
        <Path d={rightBranchPath} fill="url(#pathGrad)" />
        {/* 경로 엣지 라인 (좌) */}
        <Path
          d={`M ${pathCenterX - pw} ${pathBottomY} Q ${pathCenterX - pw * 0.8} ${pathForkY + height * 0.1} ${pathCenterX - pw * 0.5} ${pathForkY}`}
          fill="none"
          stroke={path.edge}
          strokeWidth={1.5}
          opacity={0.5}
        />
        {/* 경로 엣지 라인 (우) */}
        <Path
          d={`M ${pathCenterX + pw} ${pathBottomY} Q ${pathCenterX + pw * 0.8} ${pathForkY + height * 0.1} ${pathCenterX + pw * 0.5} ${pathForkY}`}
          fill="none"
          stroke={path.edge}
          strokeWidth={1.5}
          opacity={0.5}
        />

        {/* ── 레이어 5: 디딤돌 ── */}
        {STEPPING_STONES.map((stone, i) => (
          <SteppingStone key={`ss-${i}`} {...stone} w={width} h={height} />
        ))}

        {/* ── 레이어 6: 연못 ── */}
        <Pond w={width} h={height} colors={water} />

        {/* ── 레이어 7: 꽃 클러스터 ── */}
        {flowerClusters.map((cluster, i) => (
          <FlowerCluster
            key={`fc-${i}`}
            cx={cluster.cx}
            cy={cluster.cy}
            color={cluster.color}
            count={cluster.count}
            w={width}
            h={height}
            isLuxury={isLuxury}
          />
        ))}

        {/* ── 레이어 8: 잔디 꽃대 ── */}
        {GRASS_TUFTS.map((tuft, i) => (
          <GrassTuft
            key={`gt-${i}`}
            x={tuft.x}
            y={tuft.y}
            h={tuft.h}
            spread={tuft.spread}
            w={width}
            totalH={height}
            color={grass.dark}
          />
        ))}

        {/* ── 레이어 9: 상단 가장자리 그림자 (배경과 자연스럽게 연결) ── */}
        <LinearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#00000030" stopOpacity="1" />
          <Stop offset="1" stopColor="#00000000" stopOpacity="1" />
        </LinearGradient>
        <Rect x={0} y={0} width={width} height={height * 0.06} fill="url(#topFade)" />
      </Svg>
    </View>
  );
};

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
});

export default VillageGroundLayer;
