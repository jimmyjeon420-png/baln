/**
 * LevelSwitcher — 분석 탭 레벨 전환 UI
 *
 * 현재 레벨을 표시하고, 인접 레벨로 전환할 수 있는 버튼 제공.
 * beginner → "더 자세히 [중급으로]"
 * intermediate → 양방향 (초급/고급)
 * advanced → "더 간단하게 [중급으로]"
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InvestorLevel } from '../../hooks/useCheckupLevel';

interface LevelSwitcherProps {
  currentLevel: InvestorLevel;
  onLevelChange: (level: InvestorLevel) => void;
}

const LEVEL_CONFIG: Record<InvestorLevel, { label: string; emoji: string; color: string }> = {
  beginner: { label: '초급', emoji: '🌱', color: '#4CAF50' },
  intermediate: { label: '중급', emoji: '📊', color: '#29B6F6' },
  advanced: { label: '고급', emoji: '🔬', color: '#7C4DFF' },
};

export default function LevelSwitcher({ currentLevel, onLevelChange }: LevelSwitcherProps) {
  const config = LEVEL_CONFIG[currentLevel];

  return (
    <View style={s.container}>
      {/* 현재 레벨 표시 */}
      <View style={s.currentLevel}>
        <Text style={s.levelEmoji}>{config.emoji}</Text>
        <Text style={[s.levelLabel, { color: config.color }]}>{config.label} 모드</Text>
      </View>

      {/* 전환 버튼 */}
      <View style={s.buttons}>
        {currentLevel === 'beginner' && (
          <SwitchButton
            label="더 자세히"
            sublabel="중급"
            icon="arrow-up"
            color="#29B6F6"
            onPress={() => onLevelChange('intermediate')}
          />
        )}

        {currentLevel === 'intermediate' && (
          <>
            <SwitchButton
              label="더 간단하게"
              sublabel="초급"
              icon="arrow-down"
              color="#4CAF50"
              onPress={() => onLevelChange('beginner')}
            />
            <SwitchButton
              label="더 전문적으로"
              sublabel="고급"
              icon="arrow-up"
              color="#7C4DFF"
              onPress={() => onLevelChange('advanced')}
            />
          </>
        )}

        {currentLevel === 'advanced' && (
          <SwitchButton
            label="더 간단하게"
            sublabel="중급"
            icon="arrow-down"
            color="#29B6F6"
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
  color,
  onPress,
}: {
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.switchButton, { borderColor: color + '40' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={[s.switchLabel, { color }]}>{label}</Text>
      <View style={[s.sublabelBadge, { backgroundColor: color + '20' }]}>
        <Text style={[s.sublabelText, { color }]}>{sublabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  currentLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  levelEmoji: {
    fontSize: 18,
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
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
    backgroundColor: '#1A1A1A',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sublabelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sublabelText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
