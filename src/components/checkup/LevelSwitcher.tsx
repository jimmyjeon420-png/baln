/**
 * LevelSwitcher — 분석 탭 레벨 전환 UI
 *
 * 현재 레벨을 표시하고, 인접 레벨로 전환할 수 있는 버튼 제공.
 * beginner → "더 자세히 [중급으로]"
 * intermediate → 양방향 (초급/고급)
 * advanced → "더 간단하게 [중급으로]"
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InvestorLevel } from '../../hooks/useCheckupLevel';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import type { ThemeColors } from '../../styles/colors';

interface LevelSwitcherProps {
  currentLevel: InvestorLevel;
  onLevelChange: (level: InvestorLevel) => void;
}

/**
 * 레벨별 색상을 테마에 맞게 반환.
 * 라이트 모드에서 텍스트로 쓰이는 색은 WCAG AA 대비를 확보한 어두운 톤 사용.
 */
function getLevelConfig(level: InvestorLevel, colors: ThemeColors) {
  const configs: Record<InvestorLevel, { labelKey: string; emoji: string; color: string }> = {
    beginner: { labelKey: 'checkup.level.beginner', emoji: '🌱', color: colors.primaryDark ?? colors.primary },
    intermediate: { labelKey: 'checkup.level.intermediate', emoji: '📊', color: colors.info },
    advanced: { labelKey: 'checkup.level.advanced', emoji: '🔬', color: colors.premium.purple },
  };
  return configs[level];
}

/**
 * 스위치 버튼 색상 (배경색으로 쓰이므로 원래 채도 유지, 텍스트는 흰색)
 */
function getSwitchColor(level: InvestorLevel, colors: ThemeColors): string {
  const switchColors: Record<InvestorLevel, string> = {
    beginner: colors.primaryDark ?? colors.primary,
    intermediate: colors.info,
    advanced: colors.premium.purple,
  };
  return switchColors[level];
}

export default function LevelSwitcher({ currentLevel, onLevelChange }: LevelSwitcherProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const config = getLevelConfig(currentLevel, colors);

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {/* 현재 레벨 표시 */}
      <View style={styles.currentLevel}>
        <Text style={styles.levelEmoji}>{config.emoji}</Text>
        <Text style={[styles.levelLabel, { color: config.color }]}>{t(config.labelKey)} {t('checkup.level.mode')}</Text>
      </View>

      {/* 전환 버튼 */}
      <View style={styles.buttons}>
        {currentLevel === 'beginner' && (
          <SwitchButton
            label={t('checkup.level.moreDetail')}
            sublabel={t('checkup.level.intermediate')}
            icon="arrow-up"
            targetLevel="intermediate"
            colors={colors}
            onPress={() => onLevelChange('intermediate')}
          />
        )}

        {currentLevel === 'intermediate' && (
          <>
            <SwitchButton
              label={t('checkup.level.simpler')}
              sublabel={t('checkup.level.beginner')}
              icon="arrow-down"
              targetLevel="beginner"
              colors={colors}
              onPress={() => onLevelChange('beginner')}
            />
            <SwitchButton
              label={t('checkup.level.moreAdvanced')}
              sublabel={t('checkup.level.advanced')}
              icon="arrow-up"
              targetLevel="advanced"
              colors={colors}
              onPress={() => onLevelChange('advanced')}
            />
          </>
        )}

        {currentLevel === 'advanced' && (
          <SwitchButton
            label={t('checkup.level.simpler')}
            sublabel={t('checkup.level.intermediate')}
            icon="arrow-down"
            targetLevel="intermediate"
            colors={colors}
            onPress={() => onLevelChange('intermediate')}
          />
        )}
      </View>
    </View>
  );
}

function SwitchButton({
  label,
  sublabel,
  icon,
  targetLevel,
  colors,
  onPress,
}: {
  label: string;
  sublabel: string;
  icon: string;
  targetLevel: InvestorLevel;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const color = getSwitchColor(targetLevel, colors);

  return (
    <TouchableOpacity
      style={[switchStyles.switchButton, {
        borderColor: `${color}40`,
        backgroundColor: colors.inverseSurface,
      }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as unknown as React.ComponentProps<typeof Ionicons>['name']} size={14} color={color} />
      <Text style={[switchStyles.switchLabel, { color }]}>{label}</Text>
      <View style={[switchStyles.sublabelBadge, { backgroundColor: `${color}20` }]}>
        <Text style={[switchStyles.sublabelText, { color }]}>{sublabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    padding: 16,
    backgroundColor: colors.inverseSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  levelEmoji: {
    fontSize: 19,
  },
  levelLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
});

const switchStyles = StyleSheet.create({
  switchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  sublabelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sublabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
