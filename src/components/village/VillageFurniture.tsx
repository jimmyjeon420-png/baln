/**
 * VillageFurniture — 동물의숲 스타일 마을 가구 & 소품
 *
 * 역할: "마을 인테리어 팀" — 벤치, 마켓 스탠드, 가로등, 분수, 우편함, 이정표 등
 * SVG로 그린 고정 배치 가구들. 시간대·번영 레벨에 따라 가시/비가시 전환.
 */

import React from 'react';
import Svg, {
  Rect,
  Circle,
  Ellipse,
  Path,
  G,
  Line,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { View, StyleSheet } from 'react-native';

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface VillageFurnitureProps {
  width: number;
  height: number;
  timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
  prosperityLevel?: number; // 1–10, 기본값 5
}

// ─── 색상 상수 ───────────────────────────────────────────────────────────────

const WOOD_DARK   = '#6B4F12';
const WOOD_MID    = '#8B6914';
const WOOD_LIGHT  = '#C49A3C';
const STONE_DARK  = '#9E9E9E';
const STONE_MID   = '#BDBDBD';
const STONE_LIGHT = '#E0E0E0';
const WATER_DEEP  = '#1565C0';
const WATER_MID   = '#42A5F5';
const WATER_LIGHT = '#90CAF9';
const POST_COLOR  = '#37474F';
const RED_BRIGHT  = '#E53935';
const RED_PALE    = '#EF9A9A';
const WHITE       = '#FFFFFF';
const GLOW_YELLOW = '#FFE082';
const MAILBOX_RED = '#C62828';
const SIGN_BROWN  = '#795548';

// ─── 서브 컴포넌트: 벤치 ─────────────────────────────────────────────────────

interface BenchProps {
  cx: number; // 좌측 상단 x
  cy: number; // 좌측 상단 y
  isNight?: boolean;
  hasPot?: boolean; // prosperity >= 7 시 화분 추가
}

function Bench({ cx, cy, isNight = false, hasPot = false }: BenchProps) {
  const _colorMult = isNight ? 0.75 : 1;
  const wood = isNight ? WOOD_DARK : WOOD_MID;
  const woodLight = isNight ? WOOD_MID : WOOD_LIGHT;

  // 그림자
  const shadowOpacity = isNight ? 0.2 : 0.15;

  return (
    <G>
      {/* 그림자 */}
      <Ellipse
        cx={cx + 24}
        cy={cy + 28}
        rx={22}
        ry={5}
        fill="#000"
        opacity={shadowOpacity}
      />
      {/* 왼쪽 다리 */}
      <Rect x={cx + 4}  y={cy + 14} width={5} height={14} rx={1} fill={wood} />
      {/* 오른쪽 다리 */}
      <Rect x={cx + 39} y={cy + 14} width={5} height={14} rx={1} fill={wood} />
      {/* 등받이 지지대 왼쪽 */}
      <Rect x={cx + 4}  y={cy + 4}  width={5} height={14} rx={1} fill={wood} />
      {/* 등받이 지지대 오른쪽 */}
      <Rect x={cx + 39} y={cy + 4}  width={5} height={14} rx={1} fill={wood} />
      {/* 등받이 가로 판 */}
      <Rect x={cx + 2}  y={cy + 4}  width={44} height={6} rx={2} fill={woodLight} />
      {/* 좌석 판 */}
      <Rect x={cx + 2}  y={cy + 13} width={44} height={7} rx={2} fill={woodLight} />
      {/* 좌석 판 하이라이트 */}
      <Rect x={cx + 4}  y={cy + 14} width={40} height={2} rx={1} fill={WHITE} opacity={0.25} />

      {/* 선택적 화분 (번영 7+) */}
      {hasPot && (
        <G>
          {/* 화분 몸체 */}
          <Rect x={cx + 17} y={cy + 2} width={14} height={11} rx={2} fill="#BF360C" />
          {/* 흙 */}
          <Rect x={cx + 18} y={cy + 3} width={12} height={4} rx={1} fill="#5D4037" />
          {/* 꽃 줄기 */}
          <Line x1={cx + 24} y1={cy + 3} x2={cx + 24} y2={cy - 4} stroke="#388E3C" strokeWidth={2} />
          {/* 꽃 */}
          <Circle cx={cx + 24} cy={cy - 5} r={4} fill="#FF8F00" />
          <Circle cx={cx + 24} cy={cy - 5} r={2} fill="#FFEE58" />
        </G>
      )}
    </G>
  );
}

// ─── 서브 컴포넌트: 가로등 ───────────────────────────────────────────────────

interface LampPostProps {
  cx: number;
  cy: number;
  isNight?: boolean;
}

function LampPost({ cx, cy, isNight = false }: LampPostProps) {
  return (
    <G>
      {/* 그림자 */}
      <Ellipse
        cx={cx}
        cy={cy + 58}
        rx={6}
        ry={3}
        fill="#000"
        opacity={isNight ? 0.15 : 0.12}
      />
      {/* 기둥 */}
      <Rect x={cx - 3} y={cy} width={6} height={56} rx={2} fill={POST_COLOR} />
      {/* 상단 굽힘 장식 */}
      <Rect x={cx - 3} y={cy - 2} width={6} height={5} rx={2} fill="#546E7A" />
      {/* 가로 암 */}
      <Rect x={cx - 2} y={cy + 2} width={14} height={4} rx={1.5} fill={POST_COLOR} />
      {/* 랜턴 몸체 */}
      <Rect x={cx + 8} y={cy - 4} width={12} height={14} rx={3} fill="#455A64" />
      {/* 랜턴 유리 */}
      <Rect x={cx + 10} y={cy - 2} width={8} height={10} rx={2} fill={isNight ? '#FFF176' : '#E3F2FD'} opacity={0.9} />
      {/* 밤 글로우 */}
      {isNight && (
        <Circle
          cx={cx + 14}
          cy={cy + 3}
          r={18}
          fill={GLOW_YELLOW}
          opacity={0.28}
        />
      )}
      {/* 베이스 장식 */}
      <Rect x={cx - 5} y={cy + 53} width={10} height={5} rx={2} fill="#546E7A" />
    </G>
  );
}

// ─── 서브 컴포넌트: 분수/우물 ────────────────────────────────────────────────

interface FountainProps {
  cx: number;
  cy: number;
  isNight?: boolean;
}

function Fountain({ cx, cy, isNight = false }: FountainProps) {
  const stoneColor = isNight ? STONE_DARK : STONE_MID;
  const stoneLight = isNight ? STONE_MID : STONE_LIGHT;
  const waterTop   = isNight ? WATER_DEEP : WATER_MID;
  const waterLight = isNight ? WATER_MID  : WATER_LIGHT;

  return (
    <G>
      {/* 바닥 그림자 */}
      <Ellipse cx={cx} cy={cy + 30} rx={30} ry={7} fill="#000" opacity={isNight ? 0.2 : 0.12} />

      {/* 하단 베이스 링 */}
      <Ellipse cx={cx} cy={cy + 26} rx={28} ry={10} fill={stoneColor} />
      <Ellipse cx={cx} cy={cy + 24} rx={28} ry={9} fill={stoneLight} />
      {/* 수반 물 */}
      <Ellipse cx={cx} cy={cy + 22} rx={24} ry={7} fill={waterTop} opacity={0.9} />
      <Ellipse cx={cx} cy={cy + 21} rx={20} ry={5} fill={waterLight} opacity={0.7} />

      {/* 가운데 기둥 */}
      <Rect x={cx - 4} y={cy + 2} width={8} height={22} rx={3} fill={stoneColor} />
      {/* 기둥 하이라이트 */}
      <Rect x={cx - 2} y={cy + 4} width={3} height={18} rx={1} fill={stoneLight} opacity={0.6} />

      {/* 상단 소형 수반 */}
      <Ellipse cx={cx} cy={cy + 6} rx={14} ry={5} fill={stoneColor} />
      <Ellipse cx={cx} cy={cy + 4} rx={14} ry={4} fill={stoneLight} />
      <Ellipse cx={cx} cy={cy + 3} rx={10} ry={3} fill={waterTop} opacity={0.85} />
      <Ellipse cx={cx} cy={cy + 2} rx={7}  ry={2} fill={waterLight} opacity={0.7} />

      {/* 물줄기 (위에서 아래로) */}
      <Path
        d={`M ${cx} ${cy - 8} Q ${cx + 5} ${cy + 2} ${cx + 8} ${cy + 14}`}
        stroke={waterLight}
        strokeWidth={1.5}
        fill="none"
        opacity={0.8}
      />
      <Path
        d={`M ${cx} ${cy - 8} Q ${cx - 4} ${cy + 2} ${cx - 7} ${cy + 14}`}
        stroke={waterLight}
        strokeWidth={1.5}
        fill="none"
        opacity={0.8}
      />

      {/* 물 파문 */}
      <Circle cx={cx - 10} cy={cy + 20} r={3} stroke={waterLight} strokeWidth={1} fill="none" opacity={0.6} />
      <Circle cx={cx + 12} cy={cy + 18} r={2} stroke={waterLight} strokeWidth={1} fill="none" opacity={0.5} />

      {/* 밤 반짝임 */}
      {isNight && (
        <>
          <Circle cx={cx - 8}  cy={cy + 18} r={1.5} fill={WHITE} opacity={0.9} />
          <Circle cx={cx + 10} cy={cy + 20} r={1.2} fill={WHITE} opacity={0.8} />
          <Circle cx={cx}      cy={cy + 16} r={1}   fill={WHITE} opacity={0.7} />
        </>
      )}
      {/* 낮 반짝임 */}
      {!isNight && (
        <>
          <Circle cx={cx - 6}  cy={cy + 17} r={1.2} fill={WHITE} opacity={0.8} />
          <Circle cx={cx + 8}  cy={cy + 19} r={1}   fill={WHITE} opacity={0.7} />
        </>
      )}
    </G>
  );
}

// ─── 서브 컴포넌트: 마켓 스탠드 ──────────────────────────────────────────────

interface MarketStallProps {
  cx: number;
  cy: number;
  isNight?: boolean;
}

function MarketStall({ cx, cy, isNight = false }: MarketStallProps) {
  const woodColor = isNight ? WOOD_DARK : WOOD_MID;
  const counterColor = isNight ? '#A67C00' : '#C49A3C';
  const awningOpacity = isNight ? 0.75 : 1;

  // 빨강/흰 줄무늬 어닝 (trapezoid 모양)
  const awningStripes = [0, 1, 2, 3, 4].map((i) => ({
    x: cx - 30 + i * 12,
    fill: i % 2 === 0 ? RED_BRIGHT : WHITE,
  }));

  return (
    <G>
      {/* 그림자 */}
      <Ellipse cx={cx} cy={cy + 48} rx={32} ry={6} fill="#000" opacity={isNight ? 0.18 : 0.12} />

      {/* 뒤쪽 지지 기둥 (왼) */}
      <Rect x={cx - 30} y={cy} width={5} height={46} rx={1} fill={woodColor} />
      {/* 뒤쪽 지지 기둥 (오른) */}
      <Rect x={cx + 25} y={cy} width={5} height={46} rx={1} fill={woodColor} />

      {/* 선반/카운터 상판 */}
      <Rect x={cx - 32} y={cy + 26} width={64} height={7} rx={2} fill={counterColor} />
      <Rect x={cx - 32} y={cy + 27} width={64} height={2} rx={1} fill={WHITE} opacity={0.2} />

      {/* 카운터 앞면 */}
      <Rect x={cx - 32} y={cy + 33} width={64} height={12} rx={2} fill={woodColor} />

      {/* 상품들 (작은 컬러 원들) */}
      <Circle cx={cx - 18} cy={cy + 23} r={4} fill="#FF8F00" opacity={awningOpacity} />
      <Circle cx={cx - 6}  cy={cy + 22} r={4.5} fill="#E53935" opacity={awningOpacity} />
      <Circle cx={cx + 6}  cy={cy + 23} r={4} fill="#7CB342" opacity={awningOpacity} />
      <Circle cx={cx + 18} cy={cy + 22} r={4} fill="#FFB300" opacity={awningOpacity} />
      {/* 상품 광택 */}
      <Circle cx={cx - 19} cy={cy + 21} r={1.5} fill={WHITE} opacity={0.4} />
      <Circle cx={cx - 7}  cy={cy + 20} r={1.5} fill={WHITE} opacity={0.4} />
      <Circle cx={cx + 5}  cy={cy + 21} r={1.5} fill={WHITE} opacity={0.4} />
      <Circle cx={cx + 17} cy={cy + 20} r={1.5} fill={WHITE} opacity={0.4} />

      {/* 어닝 베이스 */}
      <Path
        d={`M ${cx - 34} ${cy + 12} L ${cx + 34} ${cy + 12} L ${cx + 30} ${cy + 22} L ${cx - 30} ${cy + 22} Z`}
        fill={RED_BRIGHT}
        opacity={awningOpacity}
      />
      {/* 어닝 줄무늬 */}
      {awningStripes.map((s, i) => (
        <Path
          key={i}
          d={`M ${s.x} ${cy + 12} L ${s.x + 12} ${cy + 12} L ${s.x + 10} ${cy + 22} L ${s.x - 2} ${cy + 22} Z`}
          fill={s.fill}
          opacity={awningOpacity}
        />
      ))}
      {/* 어닝 하단 프린지 */}
      {[-28, -16, -4, 8, 20].map((dx, i) => (
        <Path
          key={`fringe-${i}`}
          d={`M ${cx + dx} ${cy + 22} Q ${cx + dx + 3} ${cy + 26} ${cx + dx + 6} ${cy + 22}`}
          stroke={RED_PALE}
          strokeWidth={1.5}
          fill="none"
          opacity={awningOpacity}
        />
      ))}

      {/* 지붕 기둥 (어닝 지지) */}
      <Rect x={cx - 32} y={cy + 8} width={4} height={16} rx={1} fill={woodColor} />
      <Rect x={cx + 28} y={cy + 8} width={4} height={16} rx={1} fill={woodColor} />
    </G>
  );
}

// ─── 서브 컴포넌트: 우편함 ───────────────────────────────────────────────────

interface MailboxProps {
  cx: number;
  cy: number;
  isNight?: boolean;
}

function Mailbox({ cx, cy, isNight = false }: MailboxProps) {
  const boxColor  = isNight ? '#8B1A1A' : MAILBOX_RED;
  const postColor = isNight ? WOOD_DARK  : WOOD_MID;

  return (
    <G>
      {/* 그림자 */}
      <Ellipse cx={cx} cy={cy + 34} rx={8} ry={3} fill="#000" opacity={0.12} />
      {/* 기둥 */}
      <Rect x={cx - 2} y={cy + 10} width={4} height={24} rx={1} fill={postColor} />
      {/* 베이스 */}
      <Rect x={cx - 6} y={cy + 31} width={12} height={4} rx={2} fill={postColor} />
      {/* 우편함 몸체 */}
      <Rect x={cx - 12} y={cy} width={24} height={14} rx={3} fill={boxColor} />
      {/* 우편함 상단 둥근 부분 */}
      <Ellipse cx={cx} cy={cy} rx={12} ry={4} fill={boxColor} />
      {/* 우편함 하이라이트 */}
      <Rect x={cx - 10} y={cy + 1} width={20} height={3} rx={1} fill={WHITE} opacity={0.2} />
      {/* 문 슬릿 */}
      <Rect x={cx - 7} y={cy + 7} width={14} height={2} rx={1} fill="#8B1A1A" opacity={0.8} />
      {/* 깃발 (신호 없음 — 내려진 상태) */}
      <Rect x={cx + 10} y={cy + 2} width={2} height={8} rx={0.5} fill="#FFA726" />
      <Path
        d={`M ${cx + 12} ${cy + 2} L ${cx + 18} ${cy + 5} L ${cx + 12} ${cy + 8} Z`}
        fill="#FFA726"
      />
    </G>
  );
}

// ─── 서브 컴포넌트: 이정표 ───────────────────────────────────────────────────

interface SignpostProps {
  cx: number;
  cy: number;
  isNight?: boolean;
}

function Signpost({ cx, cy, isNight = false }: SignpostProps) {
  const poleColor = isNight ? WOOD_DARK  : WOOD_MID;
  const signColor = isNight ? SIGN_BROWN : '#A1887F';
  const lineColor = isNight ? '#BF9F7A'  : '#D7C4A0';

  return (
    <G>
      {/* 그림자 */}
      <Ellipse cx={cx} cy={cy + 44} rx={6} ry={3} fill="#000" opacity={0.12} />
      {/* 기둥 */}
      <Rect x={cx - 3} y={cy} width={6} height={44} rx={2} fill={poleColor} />

      {/* 화살표 표지 1 (왼쪽 가리킴) */}
      <G>
        <Rect x={cx - 26} y={cy + 4} width={22} height={10} rx={2} fill={signColor} />
        <Path d={`M ${cx - 26} ${cy + 9} L ${cx - 32} ${cy + 9}`} stroke={poleColor} strokeWidth={1.5} />
        <Path d={`M ${cx - 32} ${cy + 9} L ${cx - 28} ${cy + 6} M ${cx - 32} ${cy + 9} L ${cx - 28} ${cy + 12}`} stroke={poleColor} strokeWidth={1.5} />
        {/* 텍스트 라인 대체 */}
        <Rect x={cx - 23} y={cy + 7} width={10} height={2} rx={1} fill={lineColor} opacity={0.7} />
        <Rect x={cx - 23} y={cy + 10} width={7}  height={2} rx={1} fill={lineColor} opacity={0.7} />
      </G>

      {/* 화살표 표지 2 (오른쪽 가리킴) */}
      <G>
        <Rect x={cx + 4} y={cy + 18} width={22} height={10} rx={2} fill={signColor} />
        <Path d={`M ${cx + 26} ${cy + 23} L ${cx + 32} ${cy + 23}`} stroke={poleColor} strokeWidth={1.5} />
        <Path d={`M ${cx + 32} ${cy + 23} L ${cx + 28} ${cy + 20} M ${cx + 32} ${cy + 23} L ${cx + 28} ${cy + 26}`} stroke={poleColor} strokeWidth={1.5} />
        <Rect x={cx + 6}  y={cy + 21} width={12} height={2} rx={1} fill={lineColor} opacity={0.7} />
        <Rect x={cx + 6}  y={cy + 24} width={8}  height={2} rx={1} fill={lineColor} opacity={0.7} />
      </G>

      {/* 화살표 표지 3 (위 가리킴) */}
      <G>
        <Rect x={cx - 12} y={cy + 31} width={22} height={10} rx={2} fill={signColor} />
        <Path d={`M ${cx + 3} ${cy + 31} L ${cx + 3} ${cy + 25}`} stroke={poleColor} strokeWidth={1.5} />
        <Path d={`M ${cx + 3} ${cy + 25} L ${cx} ${cy + 28} M ${cx + 3} ${cy + 25} L ${cx + 6} ${cy + 28}`} stroke={poleColor} strokeWidth={1.5} />
        <Rect x={cx - 9}  y={cy + 34} width={14} height={2} rx={1} fill={lineColor} opacity={0.7} />
        <Rect x={cx - 9}  y={cy + 37} width={9}  height={2} rx={1} fill={lineColor} opacity={0.7} />
      </G>

      {/* 베이스 */}
      <Rect x={cx - 6} y={cy + 41} width={12} height={4} rx={2} fill={poleColor} />
    </G>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function VillageFurniture({
  width,
  height,
  timeOfDay,
  prosperityLevel = 5,
}: VillageFurnitureProps) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'evening';
  const level   = Math.max(1, Math.min(10, prosperityLevel));

  // 번영 레벨별 표시 여부
  const showFountain    = level >= 4; // 4+
  const showSignpost    = level >= 4; // 4+
  const showMarketStall = level >= 7; // 7+
  const showBenchPots   = level >= 7; // 7+

  // 고정 위치 계산 (width/height 기반 — Math.random 사용 안 함)
  const w = width;
  const h = height;

  // 배치 좌표 (비율 기반 고정값)
  const bench1X = Math.round(w * 0.06);
  const bench1Y = Math.round(h * 0.52);

  const bench2X = Math.round(w * 0.72);
  const bench2Y = Math.round(h * 0.48);

  const lamp1X = Math.round(w * 0.22);
  const lamp1Y = Math.round(h * 0.35);

  const lamp2X = Math.round(w * 0.78);
  const lamp2Y = Math.round(h * 0.32);

  const fountainX = Math.round(w * 0.48);
  const fountainY = Math.round(h * 0.38);

  const mailboxX = Math.round(w * 0.14);
  const mailboxY = Math.round(h * 0.40);

  const signpostX = Math.round(w * 0.56);
  const signpostY = Math.round(h * 0.46);

  const stallX = Math.round(w * 0.82);
  const stallY = Math.round(h * 0.42);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          {/* 가로등 글로우용 RadialGradient */}
          <RadialGradient id="lampGlow1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor={GLOW_YELLOW} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={GLOW_YELLOW} stopOpacity="0"   />
          </RadialGradient>
          <RadialGradient id="lampGlow2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor={GLOW_YELLOW} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={GLOW_YELLOW} stopOpacity="0"   />
          </RadialGradient>
          <RadialGradient id="waterGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor={WATER_LIGHT} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={WATER_LIGHT} stopOpacity="0"   />
          </RadialGradient>
        </Defs>

        {/* ── Level 1+ : 벤치 2개, 가로등 2개, 우편함 ── */}

        {/* 벤치 1 — 왼쪽 중앙 */}
        <Bench cx={bench1X} cy={bench1Y} isNight={isNight} hasPot={showBenchPots} />

        {/* 벤치 2 — 오른쪽 */}
        <Bench cx={bench2X} cy={bench2Y} isNight={isNight} hasPot={showBenchPots} />

        {/* 가로등 1 */}
        <LampPost cx={lamp1X} cy={lamp1Y} isNight={isNight} />

        {/* 가로등 2 */}
        <LampPost cx={lamp2X} cy={lamp2Y} isNight={isNight} />

        {/* 우편함 */}
        <Mailbox cx={mailboxX} cy={mailboxY} isNight={isNight} />

        {/* ── Level 4+ : 분수, 이정표 ── */}

        {showFountain && (
          <Fountain cx={fountainX} cy={fountainY} isNight={isNight} />
        )}

        {showSignpost && (
          <Signpost cx={signpostX} cy={signpostY} isNight={isNight} />
        )}

        {/* ── Level 7+ : 마켓 스탠드 ── */}

        {showMarketStall && (
          <MarketStall cx={stallX} cy={stallY} isNight={isNight} />
        )}
      </Svg>
    </View>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
