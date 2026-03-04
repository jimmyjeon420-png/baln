/**
 * VillageScenery — 동물의숲 마을 배경 소품 (나무, 덤불, 바위, 울타리)
 *
 * 역할: "마을 중경" — 하늘 배경 위에 자연 소품들을 SVG로 렌더링
 * - 낙엽수 3~4그루, 침엽수 2그루
 * - 덤불 4~5개, 바위 2~3개, 울타리 2섹션
 * - 시간대별 색조 변화 (새벽=따뜻함, 저녁=앰버, 밤=어두움)
 * - 모든 위치 고정 (결정론적) — 리렌더링 시 깜빡임 없음
 */

import React from 'react';
import Svg, {
  Rect,
  Circle,
  Ellipse,
  Path,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
} from 'react-native-svg';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface VillageSceneryProps {
  width: number;
  height: number;
  timeOfDay: TimeOfDay;
  season?: Season;
  /** 번영도 레벨 (1-10, P0-4 환경 변화용) */
  prosperityLevel?: number;
  /** 먼지 오버레이 투명도 (useVillageDecay, 0=없음, 0.4=최대) */
  dustOverlayOpacity?: number;
  /** 색 빠짐 효과 (useVillageDecay, 0=없음, 0.5=최대) */
  desaturationAmount?: number;
}

// ─────────────────────────────────────────────
// Color Palettes
// ─────────────────────────────────────────────

interface SceneryPalette {
  /** deciduous canopy main */
  leafMain: string;
  /** deciduous canopy shadow */
  leafShadow: string;
  /** deciduous canopy highlight */
  leafHighlight: string;
  /** pine/evergreen main */
  pineMain: string;
  /** pine/evergreen dark layer */
  pineDark: string;
  /** trunk */
  trunk: string;
  /** trunk shadow */
  trunkShadow: string;
  /** bush main */
  bushMain: string;
  /** bush shadow */
  bushShadow: string;
  /** rock main */
  rockMain: string;
  /** rock highlight */
  rockHighlight: string;
  /** fence */
  fence: string;
  /** shadow under objects */
  groundShadow: string;
  /** berry dots */
  berry: string;
  /** overlay tint (rgba) */
  tint: string;
}

const PALETTES: Record<TimeOfDay, SceneryPalette> = {
  dawn: {
    leafMain: '#5D9E5A',
    leafShadow: '#3D7A3A',
    leafHighlight: '#82C47E',
    pineMain: '#2A6B2E',
    pineDark: '#1B4A1E',
    trunk: '#8B6240',
    trunkShadow: '#6B4820',
    bushMain: '#4E8C4A',
    bushShadow: '#2E6C2A',
    rockMain: '#9E9E8C',
    rockHighlight: '#C8C8B8',
    fence: '#D4A96A',
    groundShadow: 'rgba(40,20,0,0.18)',
    berry: '#E57373',
    tint: 'rgba(255,200,120,0.10)',
  },
  morning: {
    leafMain: '#66BB6A',
    leafShadow: '#43A047',
    leafHighlight: '#A5D6A7',
    pineMain: '#2E7D32',
    pineDark: '#1B5E20',
    trunk: '#795548',
    trunkShadow: '#4E342E',
    bushMain: '#558B2F',
    bushShadow: '#33691E',
    rockMain: '#9E9E9E',
    rockHighlight: '#E0E0E0',
    fence: '#EFEBE9',
    groundShadow: 'rgba(0,0,0,0.15)',
    berry: '#E53935',
    tint: 'rgba(255,255,255,0.0)',
  },
  afternoon: {
    leafMain: '#4CAF50',
    leafShadow: '#388E3C',
    leafHighlight: '#81C784',
    pineMain: '#2E7D32',
    pineDark: '#1B5E20',
    trunk: '#6D4C41',
    trunkShadow: '#4E342E',
    bushMain: '#7CB342',
    bushShadow: '#558B2F',
    rockMain: '#BDBDBD',
    rockHighlight: '#F5F5F5',
    fence: '#FFFFFF',
    groundShadow: 'rgba(0,0,0,0.18)',
    berry: '#D32F2F',
    tint: 'rgba(255,255,255,0.0)',
  },
  evening: {
    leafMain: '#E8A045',
    leafShadow: '#C07020',
    leafHighlight: '#F5C880',
    pineMain: '#2A5530',
    pineDark: '#163518',
    trunk: '#5D3820',
    trunkShadow: '#3A2010',
    bushMain: '#7A6030',
    bushShadow: '#5A4018',
    rockMain: '#8C7A6A',
    rockHighlight: '#B8A898',
    fence: '#D4916A',
    groundShadow: 'rgba(80,20,0,0.25)',
    berry: '#BF360C',
    tint: 'rgba(255,120,30,0.12)',
  },
  night: {
    leafMain: '#1B3A1E',
    leafShadow: '#0D220F',
    leafHighlight: '#2A5230',
    pineMain: '#142A16',
    pineDark: '#0A180C',
    trunk: '#2C1F14',
    trunkShadow: '#1A1008',
    bushMain: '#1E3018',
    bushShadow: '#10180A',
    rockMain: '#424242',
    rockHighlight: '#616161',
    fence: '#4A4A4A',
    groundShadow: 'rgba(0,0,0,0.35)',
    berry: '#7B1FA2',
    tint: 'rgba(10,20,60,0.25)',
  },
};

// ─────────────────────────────────────────────
// Season leaf color overrides (applied on top of time palette)
// ─────────────────────────────────────────────

function applySeasonLeaf(
  palette: SceneryPalette,
  season: Season | undefined,
  timeOfDay: TimeOfDay,
): SceneryPalette {
  if (timeOfDay === 'night' || timeOfDay === 'evening') return palette;
  if (!season || season === 'summer') return palette;

  if (season === 'spring') {
    return {
      ...palette,
      leafMain: '#A8D5A2',
      leafShadow: '#76B86E',
      leafHighlight: '#D4EDCE',
    };
  }
  if (season === 'autumn') {
    return {
      ...palette,
      leafMain: '#D4682A',
      leafShadow: '#A84415',
      leafHighlight: '#F0A060',
    };
  }
  if (season === 'winter') {
    return {
      ...palette,
      leafMain: '#A0B8C0',
      leafShadow: '#607880',
      leafHighlight: '#D8ECF4',
    };
  }
  return palette;
}

// ─────────────────────────────────────────────
// Fixed layout data
// ─────────────────────────────────────────────

/** Deciduous tree definitions — positions as fraction of width/height */
const DECIDUOUS_TREES = [
  // far left large
  { id: 'dt1', xFrac: 0.05, yFrac: 0.15, trunkW: 10, trunkH: 28, canopyR: 36, size: 'large' as const },
  // left-center medium
  { id: 'dt2', xFrac: 0.18, yFrac: 0.22, trunkW: 7, trunkH: 20, canopyR: 27, size: 'medium' as const },
  // right-center medium
  { id: 'dt3', xFrac: 0.78, yFrac: 0.20, trunkW: 7, trunkH: 20, canopyR: 27, size: 'medium' as const },
  // far right large
  { id: 'dt4', xFrac: 0.90, yFrac: 0.14, trunkW: 10, trunkH: 28, canopyR: 35, size: 'large' as const },
] as const;

/** Pine tree definitions */
const PINE_TREES = [
  { id: 'pt1', xFrac: 0.02, yFrac: 0.18, baseW: 38, height: 62 },
  { id: 'pt2', xFrac: 0.95, yFrac: 0.22, baseW: 32, height: 52 },
] as const;

/** Bush definitions */
const BUSHES = [
  { id: 'b1', xFrac: 0.28, yFrac: 0.52, clusters: 3, scale: 1.0, hasBerry: true },
  { id: 'b2', xFrac: 0.42, yFrac: 0.50, clusters: 2, scale: 0.75, hasBerry: false },
  { id: 'b3', xFrac: 0.58, yFrac: 0.54, clusters: 3, scale: 0.9, hasBerry: true },
  { id: 'b4', xFrac: 0.70, yFrac: 0.51, clusters: 2, scale: 0.7, hasBerry: false },
  { id: 'b5', xFrac: 0.12, yFrac: 0.53, clusters: 2, scale: 0.85, hasBerry: true },
] as const;

/** Rock definitions */
const ROCKS = [
  { id: 'r1', xFrac: 0.35, yFrac: 0.60, rx: 18, ry: 11 },
  { id: 'r2', xFrac: 0.63, yFrac: 0.62, rx: 13, ry: 8 },
  { id: 'r3', xFrac: 0.50, yFrac: 0.57, rx: 10, ry: 6 },
] as const;

/** Fence sections */
const FENCES = [
  { id: 'f1', xFrac: 0.22, yFrac: 0.56, posts: 3, postSpacing: 18 },
  { id: 'f2', xFrac: 0.74, yFrac: 0.57, posts: 3, postSpacing: 16 },
] as const;

/** 야간 반딧불 좌표 */
const FIREFLIES = [
  { xFrac: 0.2, yFrac: 0.56, r: 1.4 },
  { xFrac: 0.3, yFrac: 0.62, r: 1.1 },
  { xFrac: 0.42, yFrac: 0.58, r: 1.3 },
  { xFrac: 0.56, yFrac: 0.64, r: 1.2 },
  { xFrac: 0.68, yFrac: 0.57, r: 1.4 },
  { xFrac: 0.8, yFrac: 0.61, r: 1.1 },
] as const;

/** 주간 공기 입자 좌표 */
const AMBIENT_DUST = [
  { xFrac: 0.12, yFrac: 0.34, r: 1.0 },
  { xFrac: 0.26, yFrac: 0.28, r: 0.9 },
  { xFrac: 0.38, yFrac: 0.4, r: 1.1 },
  { xFrac: 0.54, yFrac: 0.32, r: 0.9 },
  { xFrac: 0.7, yFrac: 0.38, r: 1.0 },
  { xFrac: 0.86, yFrac: 0.3, r: 0.8 },
] as const;

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

interface DeciduousTreeProps {
  cx: number;
  cy: number;
  trunkW: number;
  trunkH: number;
  canopyR: number;
  palette: SceneryPalette;
}

function DeciduousTree({ cx, cy, trunkW, trunkH, canopyR, palette }: DeciduousTreeProps) {
  const trunkTop = cy;
  const trunkBottom = cy + trunkH;
  const canopyCY = trunkTop - canopyR * 0.55;

  return (
    <G>
      {/* Ground shadow */}
      <Ellipse
        cx={cx}
        cy={trunkBottom + 3}
        rx={canopyR * 0.55}
        ry={canopyR * 0.14}
        fill={palette.groundShadow}
      />
      {/* Trunk */}
      <Rect
        x={cx - trunkW / 2}
        y={trunkTop}
        width={trunkW}
        height={trunkH}
        rx={trunkW * 0.3}
        fill={palette.trunk}
      />
      {/* Trunk shadow (right side) */}
      <Rect
        x={cx + trunkW * 0.1}
        y={trunkTop + 2}
        width={trunkW * 0.35}
        height={trunkH - 4}
        rx={trunkW * 0.2}
        fill={palette.trunkShadow}
        opacity={0.5}
      />
      {/* Canopy: back/shadow layer */}
      <Circle
        cx={cx + canopyR * 0.3}
        cy={canopyCY + canopyR * 0.2}
        r={canopyR * 0.78}
        fill={palette.leafShadow}
        opacity={0.6}
      />
      {/* Canopy: main circle */}
      <Circle
        cx={cx}
        cy={canopyCY}
        r={canopyR}
        fill={palette.leafMain}
      />
      {/* Canopy: left fluffy bump */}
      <Circle
        cx={cx - canopyR * 0.55}
        cy={canopyCY + canopyR * 0.2}
        r={canopyR * 0.65}
        fill={palette.leafMain}
      />
      {/* Canopy: right fluffy bump */}
      <Circle
        cx={cx + canopyR * 0.5}
        cy={canopyCY + canopyR * 0.15}
        r={canopyR * 0.6}
        fill={palette.leafMain}
      />
      {/* Highlight on top-left */}
      <Circle
        cx={cx - canopyR * 0.25}
        cy={canopyCY - canopyR * 0.3}
        r={canopyR * 0.35}
        fill={palette.leafHighlight}
        opacity={0.55}
      />
    </G>
  );
}

interface PineTreeProps {
  tipX: number;
  baseY: number;
  baseW: number;
  height: number;
  palette: SceneryPalette;
}

function PineTree({ tipX, baseY, baseW, height, palette }: PineTreeProps) {
  // 3 stacked triangles, each wider and lower
  const layer1H = height * 0.42;
  const layer2H = height * 0.52;
  const layer3H = height * 0.62;

  const layer1W = baseW * 0.5;
  const layer2W = baseW * 0.75;
  const layer3W = baseW;

  const tipY = baseY - height;

  // Each layer's tip is slightly above the base of the previous
  const l1TipY = tipY;
  const l1BaseY = tipY + layer1H;
  const l2TipY = tipY + layer1H * 0.4;
  const l2BaseY = l2TipY + layer2H;
  const l3TipY = l2TipY + layer2H * 0.35;
  const l3BaseY = l3TipY + layer3H;

  const trunk = {
    x: tipX - baseW * 0.08,
    y: l3BaseY - 4,
    w: baseW * 0.16,
    h: height * 0.18,
  };

  return (
    <G>
      {/* Ground shadow */}
      <Ellipse
        cx={tipX}
        cy={l3BaseY + 4}
        rx={baseW * 0.45}
        ry={baseW * 0.1}
        fill={palette.groundShadow}
      />
      {/* Trunk */}
      <Rect
        x={trunk.x}
        y={trunk.y}
        width={trunk.w}
        height={trunk.h}
        rx={2}
        fill={palette.trunk}
      />
      {/* Layer 3 (bottom, widest) */}
      <Path
        d={`M${tipX},${l3TipY} L${tipX + layer3W / 2},${l3BaseY} L${tipX - layer3W / 2},${l3BaseY} Z`}
        fill={palette.pineDark}
      />
      {/* Layer 3 highlight */}
      <Path
        d={`M${tipX},${l3TipY} L${tipX - layer3W * 0.08},${l3TipY + layer3H * 0.5} L${tipX - layer3W * 0.35},${l3BaseY} Z`}
        fill={palette.pineMain}
        opacity={0.7}
      />
      {/* Layer 2 */}
      <Path
        d={`M${tipX},${l2TipY} L${tipX + layer2W / 2},${l2BaseY} L${tipX - layer2W / 2},${l2BaseY} Z`}
        fill={palette.pineDark}
      />
      <Path
        d={`M${tipX},${l2TipY} L${tipX - layer2W * 0.08},${l2TipY + layer2H * 0.45} L${tipX - layer2W * 0.38},${l2BaseY} Z`}
        fill={palette.pineMain}
        opacity={0.7}
      />
      {/* Layer 1 (top, narrowest) */}
      <Path
        d={`M${tipX},${l1TipY} L${tipX + layer1W / 2},${l1BaseY} L${tipX - layer1W / 2},${l1BaseY} Z`}
        fill={palette.pineMain}
      />
      {/* Top highlight */}
      <Path
        d={`M${tipX},${l1TipY} L${tipX - layer1W * 0.15},${l1TipY + layer1H * 0.5} L${tipX - layer1W * 0.4},${l1BaseY} Z`}
        fill={palette.leafHighlight}
        opacity={0.3}
      />
    </G>
  );
}

interface BushProps {
  cx: number;
  cy: number;
  clusters: number;
  scale: number;
  hasBerry: boolean;
  palette: SceneryPalette;
}

function Bush({ cx, cy, clusters, scale, hasBerry, palette }: BushProps) {
  const baseR = 14 * scale;

  // Fixed cluster offsets relative to center
  const clusterOffsets = [
    { dx: 0, dy: 0, r: baseR },
    { dx: -baseR * 0.7, dy: baseR * 0.15, r: baseR * 0.8 },
    { dx: baseR * 0.65, dy: baseR * 0.1, r: baseR * 0.75 },
  ].slice(0, clusters);

  const berryPositions = [
    { dx: -baseR * 0.3, dy: -baseR * 0.5 },
    { dx: baseR * 0.4, dy: -baseR * 0.4 },
    { dx: 0, dy: -baseR * 0.6 },
  ];

  return (
    <G>
      {/* Ground shadow */}
      <Ellipse
        cx={cx}
        cy={cy + baseR * 0.6}
        rx={baseR * 1.4}
        ry={baseR * 0.25}
        fill={palette.groundShadow}
      />
      {/* Shadow clusters (behind) */}
      {clusterOffsets.map((c, i) => (
        <Circle
          key={`bs-${i}`}
          cx={cx + c.dx + 2}
          cy={cy + c.dy + 2}
          r={c.r}
          fill={palette.bushShadow}
          opacity={0.5}
        />
      ))}
      {/* Main clusters */}
      {clusterOffsets.map((c, i) => (
        <Circle
          key={`bm-${i}`}
          cx={cx + c.dx}
          cy={cy + c.dy}
          r={c.r}
          fill={palette.bushMain}
        />
      ))}
      {/* Highlight */}
      <Circle
        cx={cx - baseR * 0.2}
        cy={cy - baseR * 0.3}
        r={baseR * 0.35}
        fill={palette.leafHighlight}
        opacity={0.4}
      />
      {/* Berries */}
      {hasBerry &&
        berryPositions.slice(0, 3).map((b, i) => (
          <Circle
            key={`br-${i}`}
            cx={cx + b.dx}
            cy={cy + b.dy}
            r={2.2 * scale}
            fill={palette.berry}
            opacity={0.9}
          />
        ))}
    </G>
  );
}

interface RockProps {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  palette: SceneryPalette;
}

function Rock({ cx, cy, rx, ry, palette }: RockProps) {
  return (
    <G>
      {/* Ground shadow */}
      <Ellipse
        cx={cx + 2}
        cy={cy + ry * 0.9}
        rx={rx * 0.9}
        ry={ry * 0.35}
        fill={palette.groundShadow}
      />
      {/* Rock body */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={palette.rockMain}
      />
      {/* Rock highlight top-left */}
      <Ellipse
        cx={cx - rx * 0.28}
        cy={cy - ry * 0.28}
        rx={rx * 0.4}
        ry={ry * 0.35}
        fill={palette.rockHighlight}
        opacity={0.65}
      />
      {/* Rock shadow bottom-right */}
      <Ellipse
        cx={cx + rx * 0.3}
        cy={cy + ry * 0.28}
        rx={rx * 0.38}
        ry={ry * 0.3}
        fill={palette.trunkShadow}
        opacity={0.2}
      />
    </G>
  );
}

interface FenceProps {
  x: number;
  y: number;
  posts: number;
  postSpacing: number;
  palette: SceneryPalette;
}

function Fence({ x, y, posts, postSpacing, palette }: FenceProps) {
  const postW = 5;
  const postH = 20;
  const railH = 3;

  const totalWidth = (posts - 1) * postSpacing + postW;

  return (
    <G>
      {/* Ground shadow */}
      <Ellipse
        cx={x + totalWidth / 2}
        cy={y + postH + 4}
        rx={totalWidth * 0.55}
        ry={4}
        fill={palette.groundShadow}
      />
      {/* Top rail */}
      <Rect
        x={x}
        y={y + postH * 0.18}
        width={totalWidth}
        height={railH}
        rx={1}
        fill={palette.fence}
        opacity={0.9}
      />
      {/* Bottom rail */}
      <Rect
        x={x}
        y={y + postH * 0.62}
        width={totalWidth}
        height={railH}
        rx={1}
        fill={palette.fence}
        opacity={0.9}
      />
      {/* Posts */}
      {Array.from({ length: posts }).map((_, i) => (
        <G key={`post-${i}`}>
          <Rect
            x={x + i * postSpacing}
            y={y}
            width={postW}
            height={postH}
            rx={1.5}
            fill={palette.fence}
          />
          {/* Pointed cap */}
          <Path
            d={`M${x + i * postSpacing},${y} L${x + i * postSpacing + postW / 2},${y - 5} L${x + i * postSpacing + postW},${y} Z`}
            fill={palette.fence}
          />
          {/* Post shadow */}
          <Rect
            x={x + i * postSpacing + postW * 0.6}
            y={y + 2}
            width={postW * 0.3}
            height={postH - 4}
            rx={1}
            fill={palette.trunkShadow}
            opacity={0.2}
          />
        </G>
      ))}
    </G>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export function VillageScenery({
  width,
  height,
  timeOfDay,
  season,
  prosperityLevel: _prosperityLevel = 1,
  dustOverlayOpacity = 0,
  desaturationAmount = 0,
}: VillageSceneryProps) {
  const rawPalette = PALETTES[timeOfDay];
  const palette = applySeasonLeaf(rawPalette, season, timeOfDay);

  // Helper: resolve fractional position to absolute pixels
  const px = (xFrac: number) => xFrac * width;
  const py = (yFrac: number) => yFrac * height;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <Defs>
        {/* Tint overlay gradient (for dawn/evening/night) */}
        <LinearGradient id="tintGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.tint} stopOpacity="1" />
          <Stop offset="1" stopColor={palette.tint} stopOpacity="0.4" />
        </LinearGradient>
        {/* Ground depth gradient for shadows */}
        <RadialGradient id="groundShadowRad" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="rgba(0,0,0,0.3)" stopOpacity="1" />
          <Stop offset="1" stopColor="rgba(0,0,0,0)" stopOpacity="1" />
        </RadialGradient>
        {/* 대기 원근감 (상단 밝고 하단 짙게) */}
        <LinearGradient id="atmosphericDepth" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="rgba(255,255,255,0.10)" />
          <Stop offset="0.45" stopColor="rgba(255,255,255,0.03)" />
          <Stop offset="1" stopColor="rgba(0,0,0,0.015)" />
        </LinearGradient>
        {/* 중앙 광원 (낮/아침) */}
        <RadialGradient id="focusLight" cx="52%" cy="28%" rx="46%" ry="38%">
          <Stop offset="0" stopColor="rgba(255,255,255,0.18)" />
          <Stop offset="1" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>

      {/* ── Layer 1: Pine trees (back, far edges) ── */}
      {PINE_TREES.map((pt) => (
        <PineTree
          key={pt.id}
          tipX={px(pt.xFrac)}
          baseY={py(pt.yFrac) + pt.height}
          baseW={pt.baseW}
          height={pt.height}
          palette={palette}
        />
      ))}

      {/* ── Layer 2: Deciduous trees ── */}
      {DECIDUOUS_TREES.map((dt) => {
        const cx = px(dt.xFrac);
        const cy = py(dt.yFrac);
        return (
          <DeciduousTree
            key={dt.id}
            cx={cx}
            cy={cy}
            trunkW={dt.trunkW}
            trunkH={dt.trunkH}
            canopyR={dt.canopyR}
            palette={palette}
          />
        );
      })}

      {/* ── Layer 3: Fences ── */}
      {FENCES.map((f) => (
        <Fence
          key={f.id}
          x={px(f.xFrac)}
          y={py(f.yFrac)}
          posts={f.posts}
          postSpacing={f.postSpacing}
          palette={palette}
        />
      ))}

      {/* ── Layer 4: Bushes ── */}
      {BUSHES.map((b) => (
        <Bush
          key={b.id}
          cx={px(b.xFrac)}
          cy={py(b.yFrac)}
          clusters={b.clusters}
          scale={b.scale}
          hasBerry={b.hasBerry}
          palette={palette}
        />
      ))}

      {/* ── Layer 5: Rocks ── */}
      {ROCKS.map((r) => (
        <Rock
          key={r.id}
          cx={px(r.xFrac)}
          cy={py(r.yFrac)}
          rx={r.rx}
          ry={r.ry}
          palette={palette}
        />
      ))}

      {/* ── Layer 5.5: 생동감 입자 (낮: 대기 먼지 / 밤: 반딧불) ── */}
      {(timeOfDay === 'morning' || timeOfDay === 'afternoon' || timeOfDay === 'dawn') && (
        <G>
          {AMBIENT_DUST.map((p, idx) => (
            <Circle
              key={`ambient-dust-${idx}`}
              cx={px(p.xFrac)}
              cy={py(p.yFrac)}
              r={p.r}
              fill="#FFFFFF"
              opacity={0.18}
            />
          ))}
        </G>
      )}
      {(timeOfDay === 'evening' || timeOfDay === 'night') && (
        <G>
          {FIREFLIES.map((f, idx) => (
            <G key={`firefly-${idx}`}>
              <Circle
                cx={px(f.xFrac)}
                cy={py(f.yFrac)}
                r={f.r * 3.5}
                fill="#D9FF8E"
                opacity={0.12}
              />
              <Circle
                cx={px(f.xFrac)}
                cy={py(f.yFrac)}
                r={f.r}
                fill="#F4FFB0"
                opacity={0.9}
              />
            </G>
          ))}
        </G>
      )}

      {/* ── 저녁/밤: 캠프파이어 + 텐트 + 고양이 ── */}
      {(timeOfDay === 'evening' || timeOfDay === 'night') && (
        <G>
          {/* 캠프파이어 — 마을 중앙 하단 */}
          <G transform={`translate(${px(0.45)}, ${py(0.72)})`}>
            {/* 불빛 glow */}
            <Circle cx={0} cy={-4} r={18} fill="#FF8C00" opacity={0.15} />
            <Circle cx={0} cy={-4} r={10} fill="#FF6600" opacity={0.25} />
            {/* 장작 */}
            <Line x1={-8} y1={4} x2={8} y2={0} stroke="#5C3A1E" strokeWidth={3} strokeLinecap="round" />
            <Line x1={-6} y1={0} x2={9} y2={4} stroke="#4A2E16" strokeWidth={3} strokeLinecap="round" />
            {/* 불꽃 */}
            <Path d="M0,-2 Q-4,-10 -1,-16 Q0,-12 2,-17 Q5,-10 0,-2Z" fill="#FF4500" opacity={0.9} />
            <Path d="M0,-4 Q-2,-9 0,-13 Q2,-9 0,-4Z" fill="#FFD700" opacity={0.85} />
            {/* 불똥 */}
            <Circle cx={-3} cy={-18} r={1} fill="#FFA500" opacity={0.7} />
            <Circle cx={4} cy={-20} r={0.8} fill="#FFD700" opacity={0.6} />
          </G>

          {/* 텐트 1 — 좌측 */}
          <G transform={`translate(${px(0.12)}, ${py(0.68)})`}>
            <Path d="M0,-20 L-16,4 L16,4 Z" fill="#4A6741" stroke="#3A5731" strokeWidth={1} />
            <Path d="M0,-20 L-5,4 L5,4 Z" fill="#3A5731" opacity={0.6} />
            <Line x1={0} y1={-20} x2={0} y2={-24} stroke="#8B7355" strokeWidth={1.5} />
          </G>

          {/* 텐트 2 — 좌측 안쪽 */}
          <G transform={`translate(${px(0.22)}, ${py(0.74)})`}>
            <Path d="M0,-16 L-13,3 L13,3 Z" fill="#6B4E3D" stroke="#5A3E2E" strokeWidth={1} />
            <Path d="M0,-16 L-4,3 L4,3 Z" fill="#5A3E2E" opacity={0.6} />
            <Line x1={0} y1={-16} x2={0} y2={-20} stroke="#8B7355" strokeWidth={1.5} />
          </G>

          {/* 텐트 3 — 우측 */}
          <G transform={`translate(${px(0.78)}, ${py(0.70)})`}>
            <Path d="M0,-18 L-14,3 L14,3 Z" fill="#5B6B8A" stroke="#4A5A78" strokeWidth={1} />
            <Path d="M0,-18 L-4,3 L4,3 Z" fill="#4A5A78" opacity={0.6} />
            <Line x1={0} y1={-18} x2={0} y2={-22} stroke="#8B7355" strokeWidth={1.5} />
          </G>

          {/* 텐트 4 — 우측 안쪽 */}
          <G transform={`translate(${px(0.88)}, ${py(0.76)})`}>
            <Path d="M0,-15 L-12,3 L12,3 Z" fill="#8B6B5A" stroke="#7A5A4A" strokeWidth={1} />
            <Path d="M0,-15 L-3,3 L3,3 Z" fill="#7A5A4A" opacity={0.6} />
            <Line x1={0} y1={-15} x2={0} y2={-18} stroke="#8B7355" strokeWidth={1.5} />
          </G>

          {/* 텐트 5 — 캠프파이어 근처 */}
          <G transform={`translate(${px(0.58)}, ${py(0.78)})`}>
            <Path d="M0,-14 L-11,3 L11,3 Z" fill="#4A6741" stroke="#3A5731" strokeWidth={1} />
            <Path d="M0,-14 L-3,3 L3,3 Z" fill="#3A5731" opacity={0.6} />
          </G>

        </G>
      )}

      {/* ── 고양이 2마리 (항상 표시) ── */}
      {/* 고양이 1 — 주황 고양이, 마을 중앙 하단 */}
      <G transform={`translate(${px(0.52)}, ${py(0.71)})`}>
        <Ellipse cx={0} cy={0} rx={5} ry={3.5} fill="#F4A460" />
        <Circle cx={5} cy={-2} r={3} fill="#F4A460" />
        <Path d="M3.5,-4.5 L4,-6.5 L5.5,-4 Z" fill="#D2691E" />
        <Path d="M6,-4.5 L6.5,-6.5 L7.5,-4 Z" fill="#D2691E" />
        <Path d="M-5,0 Q-8,-3 -6,-5" stroke="#D2691E" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      </G>

      {/* 고양이 2 — 회색 고양이, 좌측 하단 */}
      <G transform={`translate(${px(0.16)}, ${py(0.73)})`}>
        <Ellipse cx={0} cy={0} rx={4.5} ry={3} fill="#808080" />
        <Circle cx={-5} cy={-1.5} r={2.8} fill="#808080" />
        <Path d="M-6.5,-3.5 L-7,-5.5 L-5.5,-3 Z" fill="#606060" />
        <Path d="M-4,-3.5 L-3.5,-5.5 L-2.5,-3 Z" fill="#606060" />
        <Path d="M4.5,0 Q7,-4 6,-7" stroke="#606060" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      </G>

      {/* ── Tint overlay (dawn / evening / night atmosphere) ── */}
      {(timeOfDay === 'dawn' || timeOfDay === 'evening' || timeOfDay === 'night') && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={`url(#tintGrad)`}
        />
      )}

      {/* ── 실사풍 깊이감 레이어 ── */}
      <Rect x={0} y={0} width={width} height={height} fill="url(#atmosphericDepth)" />
      {(timeOfDay === 'morning' || timeOfDay === 'afternoon') && (
        <Rect x={0} y={0} width={width} height={height} fill="url(#focusLight)" />
      )}

      {/* ── P0-5: 먼지 오버레이 (이탈 쇠퇴 시) ── */}
      {dustOverlayOpacity > 0 && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="#8B7355"
          opacity={dustOverlayOpacity}
        />
      )}

      {/* ── P0-5: 색 빠짐 효과 (장기 이탈 시 회색 필터) ── */}
      {desaturationAmount > 0 && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="#808080"
          opacity={desaturationAmount}
        />
      )}
    </Svg>
  );
}

export default VillageScenery;
