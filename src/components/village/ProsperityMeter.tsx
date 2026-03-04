/**
 * ProsperityMeter — 마을 번영도 게이지 컴포넌트
 *
 * 역할: "마을 성장 지표판" — 마을 헤더에 표시되는 번영도 게이지
 * - 레벨 번호를 방패/뱃지 아이콘 안에 표시
 * - 레벨명 표시 (첫 번째 불꽃 ~ 전설의 마을)
 * - 오늘 기여 포인트 카운터 (+45 today)
 * - 가로 진행 바 (레벨 색상으로 채워짐)
 *
 * 레벨 색상 체계:
 * - 1~3: 초록 (씨앗 ~ 새싹)
 * - 4~6: 파랑 (성장 ~ 번영)
 * - 7~8: 보라 (전성기)
 * - 9~10: 금색 (전설)
 *
 * 비유: "마을 경험치 바" — RPG 마을 성장 게이지와 동일
 *
 * 사용처:
 * - 마을 탭 헤더: 최상단에 항상 표시
 * - 전체 탭: 마을 요약 카드에 compact로
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useLocale } from '../../context/LocaleContext';
import type { ThemeColors } from '../../styles/colors';

// ============================================================================
// 타입
// ============================================================================

interface ProsperityMeterProps {
  /** 현재 마을 레벨 (1~10) */
  level: number;
  /** 다음 레벨까지의 진행도 (0~1) */
  progress: number;
  /** 오늘 획득한 번영도 포인트 */
  todayPoints: number;
  /** 테마 색상 */
  colors: ThemeColors;
}

// ============================================================================
// 레벨 메타데이터
// ============================================================================

/** 레벨 → i18n 키 맵핑 */
const LEVEL_I18N_KEY: Record<number, string> = {
  1: 'village.prosperity.level_1',
  2: 'village.prosperity.level_2',
  3: 'village.prosperity.level_3',
  4: 'village.prosperity.level_4',
  5: 'village.prosperity.level_5',
  6: 'village.prosperity.level_6',
  7: 'village.prosperity.level_7',
  8: 'village.prosperity.level_8',
  9: 'village.prosperity.level_9',
  10: 'village.prosperity.level_10',
};

/** 레벨 → 진행 바 색상 */
function getLevelColor(level: number): string {
  if (level <= 3) return '#5DBB63';   // 초록 (새싹)
  if (level <= 6) return '#42A5F5';   // 파랑 (성장)
  if (level <= 8) return '#9B7DFF';   // 보라 (전성기)
  return '#F0C060';                   // 금색 (전설)
}

/** 레벨 → 방패 배경 색상 (진한 버전) */
function getLevelShieldColor(level: number): string {
  if (level <= 3) return '#2E7D32';
  if (level <= 6) return '#0D47A1';
  if (level <= 8) return '#4A148C';
  return '#B8860B';
}

/** 레벨 이모지 접두사 */
function getLevelEmoji(level: number): string {
  if (level <= 3) return '🌱';
  if (level <= 6) return '🌊';
  if (level <= 8) return '💜';
  return '⭐';
}

// ============================================================================
// 서브 컴포넌트: 레벨 방패 배지
// ============================================================================

function LevelShield({
  level,
  colors: _colors,
}: {
  level: number;
  colors: ThemeColors;
}) {
  const shieldColor = getLevelShieldColor(level);
  const barColor = getLevelColor(level);

  return (
    <View
      style={[
        styles.shield,
        {
          backgroundColor: shieldColor + '22',  // 20% 투명도
          borderColor: barColor,
        },
      ]}
    >
      {/* 레벨 숫자 */}
      <Text style={[styles.shieldNumber, { color: barColor }]}>
        {level}
      </Text>
      {/* LV 서브텍스트 */}
      <Text style={[styles.shieldLv, { color: barColor + 'AA' }]}>
        LV
      </Text>
    </View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

const ProsperityMeter = React.memo(({
  level,
  progress,
  todayPoints,
  colors,
}: ProsperityMeterProps) => {
  const { t } = useLocale();

  // 진행 바 애니메이션 값 (0~1 → width)
  const barAnim = useRef(new Animated.Value(0)).current;

  // progress 변화 시 부드럽게 채워지는 애니메이션
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: Math.min(Math.max(progress, 0), 1),
      duration: 800,
      useNativeDriver: false,  // width 애니메이션은 useNativeDriver: false 필요
    }).start();
  }, [progress, barAnim]);

  const clampedLevel = Math.min(Math.max(level, 1), 10);
  const levelName = t(LEVEL_I18N_KEY[clampedLevel] ?? 'village.prosperity.default_name');
  const levelEmoji = getLevelEmoji(clampedLevel);
  const barColor = getLevelColor(clampedLevel);

  // 만렙 여부
  const isMaxLevel = clampedLevel >= 10;

  if (__DEV__) {
    // console.log('[ProsperityMeter] level=%d progress=%.2f todayPoints=%d', level, progress, todayPoints);
  }

  // 애니메이션 적용 width (0% ~ 100%)
  const animatedWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* 상단 행: 방패 + 마을 이름 + 오늘 기여 */}
      <View style={styles.headerRow}>
        {/* 레벨 방패 */}
        <LevelShield level={clampedLevel} colors={colors} />

        {/* 가운데: 이모지 + 마을 이름 */}
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.levelEmoji}>{levelEmoji}</Text>
            <Text
              style={[styles.levelName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {levelName}
            </Text>
          </View>

          {/* 레벨 부가 설명 */}
          <Text style={[styles.levelSub, { color: colors.textTertiary }]}>
            {isMaxLevel
              ? t('village.prosperity.level_sub_max', { level: clampedLevel })
              : t('village.prosperity.level_sub', { level: clampedLevel })
            }
          </Text>
        </View>

        {/* 오늘 기여 포인트 */}
        {todayPoints > 0 && (
          <View
            style={[
              styles.todayBadge,
              { backgroundColor: barColor + '22', borderColor: barColor + '66' },
            ]}
          >
            <Text style={[styles.todayText, { color: barColor }]}>
              {`+${todayPoints}`}
            </Text>
            <Text style={[styles.todayLabel, { color: barColor + 'AA' }]}>
              {t('village.prosperity.today_label')}
            </Text>
          </View>
        )}
      </View>

      {/* 진행 바 */}
      <View style={styles.progressSection}>
        {/* 배경 바 */}
        <View
          style={[styles.progressBg, { backgroundColor: colors.surfaceElevated }]}
        >
          {/* 채워진 바 (애니메이션) */}
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: isMaxLevel ? '100%' : animatedWidth,
                backgroundColor: barColor,
              },
            ]}
          />

          {/* 반짝임 오버레이 (레벨 7+) */}
          {clampedLevel >= 7 && (
            <View
              style={[
                styles.progressShimmer,
                { backgroundColor: '#FFFFFF' + '20' },
              ]}
            />
          )}
        </View>

        {/* 우측: 퍼센트 또는 만렙 */}
        <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
          {isMaxLevel
            ? t('village.prosperity.max_label')
            : `${Math.round(progress * 100)}%`
          }
        </Text>
      </View>

      {/* 만렙 달성 축하 줄 */}
      {isMaxLevel && (
        <Text style={[styles.maxLevelBanner, { color: colors.premium.gold }]}>
          {t('village.prosperity.max_banner')}
        </Text>
      )}
    </View>
  );
});

ProsperityMeter.displayName = 'ProsperityMeter';

export default ProsperityMeter;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },

  // --- 상단 행 ---
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // 방패 배지
  shield: {
    width: 44,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  shieldNumber: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  shieldLv: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },

  // 마을 이름 블록
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  levelEmoji: {
    fontSize: 15,
  },
  levelName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  levelSub: {
    fontSize: 12,
  },

  // 오늘 기여 배지
  todayBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 46,
  },
  todayText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  todayLabel: {
    fontSize: 9,
    fontWeight: '600',
  },

  // --- 진행 바 ---
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBg: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  // 레벨 7+ 반짝임 효과 (정적 오버레이)
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 34,
    textAlign: 'right',
  },

  // --- 만렙 배너 ---
  maxLevelBanner: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
});
