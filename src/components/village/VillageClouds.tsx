import React, { useRef, useEffect, useMemo } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

interface VillageCloudsProps {
  timeOfDay: TimeOfDay;
  weather?: string;
}

interface CloudConfig {
  id: number;
  size: 'small' | 'medium' | 'large';
  startX: number;
  yPosition: number;
  duration: number;
  opacity: number;
  delay: number;
}

interface CloudShapeProps {
  color: string;
  opacity: number;
  size: 'small' | 'medium' | 'large';
  translateX: Animated.Value;
  yPosition: number;
}

const CLOUD_SIZES = {
  small: { width: 60, height: 25 },
  medium: { width: 80, height: 30 },
  large: { width: 100, height: 35 },
};

// Deterministic cloud configurations - no Math.random() on render
const CLOUD_CONFIGS: CloudConfig[] = [
  { id: 0, size: 'large',  startX: SCREEN_WIDTH * 0.05, yPosition: SCREEN_HEIGHT * 0.04, duration: 40000, opacity: 0.85, delay: 0 },
  { id: 1, size: 'medium', startX: SCREEN_WIDTH * 0.35, yPosition: SCREEN_HEIGHT * 0.09, duration: 32000, opacity: 0.75, delay: 5000 },
  { id: 2, size: 'small',  startX: SCREEN_WIDTH * 0.60, yPosition: SCREEN_HEIGHT * 0.03, duration: 45000, opacity: 0.70, delay: 10000 },
  { id: 3, size: 'large',  startX: SCREEN_WIDTH * 0.80, yPosition: SCREEN_HEIGHT * 0.12, duration: 36000, opacity: 0.80, delay: 15000 },
  { id: 4, size: 'medium', startX: SCREEN_WIDTH * 0.20, yPosition: SCREEN_HEIGHT * 0.17, duration: 28000, opacity: 0.65, delay: 8000 },
];

function getCloudColor(timeOfDay: TimeOfDay, weather?: string): string {
  // Weather overrides time-of-day color
  if (weather) {
    const w = weather.toLowerCase();
    if (w === 'rain' || w === 'storm' || w === 'thunderstorm') {
      return '#4A5568';
    }
    if (w === 'snow') {
      return '#FFFFFF';
    }
    if (w === 'cloudy' || w === 'clouds') {
      // Slightly darker than normal
      if (timeOfDay === 'evening') return '#E89070';
      if (timeOfDay === 'night') return '#2A3A4C';
      return '#D8D8D8';
    }
  }

  switch (timeOfDay) {
    case 'dawn':      return '#FFD4B8';
    case 'morning':   return '#FFFFFF';
    case 'afternoon': return '#F5F5F5';
    case 'evening':   return '#FFB38A';
    case 'night':     return '#3A4A5C';
    default:          return '#FFFFFF';
  }
}

function getBaseOpacity(timeOfDay: TimeOfDay, weather?: string): number {
  if (weather) {
    const w = weather.toLowerCase();
    if (w === 'rain' || w === 'storm' || w === 'thunderstorm') return 0.85;
    if (w === 'cloudy' || w === 'clouds') return 0.80;
    if (w === 'clear' || w === 'sunny') return 0.60;
    if (w === 'snow') return 0.75;
    if (w === 'fog') return 0; // Fog covers clouds
  }

  switch (timeOfDay) {
    case 'dawn':      return 0.70;
    case 'morning':   return 0.80;
    case 'afternoon': return 0.70;
    case 'evening':   return 0.60;
    case 'night':     return 0.30;
    default:          return 0.70;
  }
}

function getVisibleCount(weather?: string): number {
  if (!weather) return 4;
  const w = weather.toLowerCase();
  if (w === 'fog') return 0;
  if (w === 'clear' || w === 'sunny') return 2;
  if (w === 'cloudy' || w === 'clouds') return 5;
  if (w === 'rain' || w === 'storm' || w === 'thunderstorm') return 5;
  return 4;
}

// CloudShape renders a single puffy cloud from overlapping rounded rectangles
function CloudShape({ color, opacity, size, translateX, yPosition }: CloudShapeProps) {
  const { width, height } = CLOUD_SIZES[size];

  // Scale puff sizes proportionally to cloud size
  const scale = width / 80;
  const puff1W = Math.round(35 * scale);
  const puff1H = Math.round(25 * scale);
  const puff2W = Math.round(40 * scale);
  const puff2H = Math.round(30 * scale);
  const puff3W = Math.round(35 * scale);
  const puff3H = Math.round(25 * scale);

  return (
    <Animated.View
      style={[
        styles.cloudContainer,
        {
          top: yPosition,
          transform: [{ translateX }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      {/* Cloud shape: 3 overlapping puffs */}
      <View style={{ position: 'relative', width, height }}>
        {/* Left puff */}
        <View
          style={{
            position: 'absolute',
            width: puff1W,
            height: puff1H,
            borderRadius: puff1H / 2,
            backgroundColor: color,
            left: 0,
            top: height - puff1H,
          }}
        />
        {/* Center puff (tallest) */}
        <View
          style={{
            position: 'absolute',
            width: puff2W,
            height: puff2H,
            borderRadius: puff2H / 2,
            backgroundColor: color,
            left: Math.round((width - puff2W) * 0.35),
            top: 0,
          }}
        />
        {/* Right puff */}
        <View
          style={{
            position: 'absolute',
            width: puff3W,
            height: puff3H,
            borderRadius: puff3H / 2,
            backgroundColor: color,
            right: 0,
            top: height - puff3H,
          }}
        />
        {/* Bottom fill to make cloud look solid */}
        <View
          style={{
            position: 'absolute',
            width: width,
            height: Math.round(height * 0.55),
            borderRadius: 4,
            backgroundColor: color,
            left: 0,
            bottom: 0,
          }}
        />
      </View>
    </Animated.View>
  );
}

export function VillageClouds({ timeOfDay, weather }: VillageCloudsProps) {
  const isFog = weather && weather.toLowerCase() === 'fog';

  const cloudColor = useMemo(
    () => getCloudColor(timeOfDay, weather),
    [timeOfDay, weather]
  );

  const baseOpacity = useMemo(
    () => getBaseOpacity(timeOfDay, weather),
    [timeOfDay, weather]
  );

  const visibleCount = useMemo(
    () => getVisibleCount(weather),
    [weather]
  );

  // Create one Animated.Value per cloud (always 5, matching CLOUD_CONFIGS)
  const translateXRefs = useRef<Animated.Value[]>(
    CLOUD_CONFIGS.map((cfg) => new Animated.Value(cfg.startX))
  );

  useEffect(() => {
    if (isFog) return;

    const animations = CLOUD_CONFIGS.map((cfg, idx) => {
      const animVal = translateXRefs.current[idx];
      const cloudWidth = CLOUD_SIZES[cfg.size].width;

      // Travel from startX to -(cloudWidth) — off the left edge — then wrap
      const travelDistance = cfg.startX + cloudWidth;

      animVal.setValue(cfg.startX);

      return Animated.loop(
        Animated.sequence([
          // Optional startup delay only on first cycle (use a tiny delay 0 to start all)
          Animated.delay(cfg.delay),
          Animated.timing(animVal, {
            toValue: -cloudWidth,
            duration: cfg.duration,
            useNativeDriver: true,
          }),
          // Instantly jump to right edge
          Animated.timing(animVal, {
            toValue: SCREEN_WIDTH + cloudWidth,
            duration: 0,
            useNativeDriver: true,
          }),
          // Slide back in from the right to travelDistance left of SCREEN_WIDTH
          Animated.timing(animVal, {
            toValue: cfg.startX,
            duration: Math.round(cfg.duration * (travelDistance / (SCREEN_WIDTH + cloudWidth * 2))),
            useNativeDriver: true,
          }),
        ])
      );
    });

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [isFog, weather]);

  if (isFog) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {CLOUD_CONFIGS.slice(0, visibleCount).map((cfg, idx) => (
        <CloudShape
          key={cfg.id}
          color={cloudColor}
          opacity={baseOpacity * cfg.opacity}
          size={cfg.size}
          translateX={translateXRefs.current[idx]}
          yPosition={cfg.yPosition}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Cover upper 30% of screen
    height: SCREEN_HEIGHT * 0.30,
    overflow: 'hidden',
    zIndex: 5,
  },
  cloudContainer: {
    position: 'absolute',
    left: 0,
  },
});

export default VillageClouds;
